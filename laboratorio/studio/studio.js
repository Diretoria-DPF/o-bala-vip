/**
 * ============================================================================
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js
 * Versão: 4.1 FINAL ENGINEERING — ARQUIVO ÚNICO COMENTADO
 * ============================================================================
 *
 * ARQUITETURA EM CAMADAS:
 *   L1 Apresentação   → index.html + studio.css
 *   L2 Orquestração   → este arquivo (eventos, seleção, render, boot)
 *   L3 Serviços       → Engine, ChemInfo, Atom, SDF, Edit, Bio, Analysis, Render
 *   L4 Dados Estáticos→ TABELA_PERIODICA, REACOES_BIOISOSTERISMO, PAINS
 *   L5 Integrações    → IndexedDB, BroadcastChannel, Web Worker, localStorage
 *
 * PIPELINE QUÍMICO 3D (8 níveis de fallback):
 *   [Custom SDF] → [Monoatômico] → [IndexedDB] → [OpenChemLib]
 *   → [RDKit ETKDG] → [PubChem SMILES] → [CACTUS NIH] → [PubChem Nome EN]
 *
 * MOTORES QUIMIOINFORMÁTICOS:
 *   - OpenChemLib  → geração 3D local (JS puro)
 *   - RDKit WASM   → descritores, SMARTS, fingerprints, scaffold
 *   - SmilesDrawer → renderização 2D vetorial
 *   - 3Dmol.js     → renderização 3D WebGL
 *
 * ============================================================================
 */

const STUDIO_VERSION = '4.1';
const STUDIO_BUILD = '2025-FINAL';

console.log(
  '%c[Studio] 🧬 LAIFT v' + STUDIO_VERSION + ' (build ' + STUDIO_BUILD + ')',
  'color:#00e5ff;font-weight:bold;font-size:14px;text-shadow:0 0 8px #00e5ff'
);
console.log(
  '%c[Studio] Arquitetura L2–L5 | Dupla engine (OCL + RDKit) | Pipeline 3D de 8 níveis',
  'color:#94a3b8;font-size:11px'
);

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.0 — ESTADO GLOBAL (STATE MODULE) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Toda a mutabilidade do sistema vive aqui. Centralizar o estado evita
  // closures espalhadas e facilita debug (STATE.X sempre visível no console).
  // ═══════════════════════════════════════════════════════════════════════════
  const STATE = {
    // Barramento inter-abas
    labBroadcast: null,

    // Visualização
    studioViewer: null,
    modeloCarregadoAtivo: false,
    modoExibicaoAtual: '3D',
    modeloAtual: 'ballstick',
    autoRotacaoAtiva: false,
    modoMedicaoAtivo: false,
    atomosSelecionadosParaMedicao: [],

    // Catálogo
    compostosIndexados: [],
    compostosFiltrados: [],
    compostoSelecionado: null,
    currentRenderedIndex: 0,

    // SDF ativo
    sdfCacheLocal: null,

    // Motores químicos
    RDKitModuleInstance: null,
    rdkitPromise: null,
    rdkitFalhou: false,
    OCLDisponivel: false,

    // Análise
    ultimoDossieCADD: null,
    atomoAtivoInspecionado: null,
    elementoPTableSelecionado: null,
    atomHighlightShape: null,

    // Comparação
    cmpViewerA: null,
    cmpViewerB: null,

    // Web Worker
    indexerWorker: null,

    // Históricos
    historicoNavegacao: { itens: [], indice: -1, max: 30 },
    edicaoHistory: { undo: [], redo: [], max: 30 },

    // Favoritos
    favoritos: new Set(),

    // Timers
    debounceBuscaTimer: null,
    resizeTimer: null
  };

  const ITEMS_PER_CHUNK = 40;

  const STORAGE_KEYS = {
    prefs: 'laift_studio_prefs_v4',
    favoritos: 'laift_studio_favoritos_v4',
    notas: 'laift_studio_notas_v4'
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      STATE.labBroadcast = new BroadcastChannel('laift_molecular_bus');
    }
  } catch (e) {
    console.warn('[Studio] BroadcastChannel indisponível.');
  }
  // ››› FIM: STATE — estado global centralizado (toda mutabilidade do sistema).
  // ››› FEEDBACK: se precisar adicionar novo campo mutável, declare aqui.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L4.1 — TABELA PERIÓDICA (118 elementos) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Formato compacto: [Z, sym, nome, massa, eletroneg, raio, valências, cat, grupo, período, pharma]
  // ═══════════════════════════════════════════════════════════════════════════
  const TP_RAW = [
    [1,'H','Hidrogênio',1.008,2.20,37,[1],'nao-metal',1,1,'Essencial em pontes de H; bioisosterismo H↔F para bloquear oxidação por CYP450.'],
    [2,'He','Hélio',4.003,null,32,[0],'gas-nobre',18,1,'Gás nobre inerte; atmosferas controladas em síntese.'],
    [3,'Li','Lítio',6.94,0.98,152,[1],'alcalino',1,2,'Íon terapêutico em transtorno bipolar; inibe inositol monofosfatase (IMPase).'],
    [4,'Be','Berílio',9.012,1.57,112,[2],'alcalino-terroso',2,2,'Altamente tóxico; mimetiza magnésio causando inibição enzimática irreversível.'],
    [5,'B','Boro',10.81,2.04,85,[3,4],'metaloide',13,2,'Ácido borônico (-B(OH)₂) inibidor reversível de proteassoma (Bortezomibe).'],
    [6,'C','Carbono',12.011,2.55,77,[4],'nao-metal',14,2,'Espinha dorsal da química orgânica; sp³/sp²/sp; quiralidade tetraédrica.'],
    [7,'N','Nitrogênio',14.007,3.04,75,[3,4],'nao-metal',15,2,'Centros básicos protonáveis (aminas); núcleo de heterociclos.'],
    [8,'O','Oxigênio',15.999,3.44,73,[2],'nao-metal',16,2,'Aceptor de pontes de H; hidroxilas, carbonilas, éteres, ésteres.'],
    [9,'F','Flúor',18.998,3.98,71,[1],'halogenio',17,2,'Bioisóstero de H; aumenta lipofilicidade e bloqueia CYP450.'],
    [10,'Ne','Neônio',20.18,null,69,[0],'gas-nobre',18,2,'Gás nobre quimicamente inerte.'],
    [11,'Na','Sódio',22.99,0.93,186,[1],'alcalino',1,3,'Contraíon de sais hidrossolúveis (Dipirona Sódica, Diclofenaco Sódico).'],
    [12,'Mg','Magnésio',24.305,1.31,160,[2],'alcalino-terroso',2,3,'Cofator de quinases; estabiliza ATP e DNA polimerases.'],
    [13,'Al','Alumínio',26.982,1.61,143,[3],'metal-pos-transicao',13,3,'Antiácido gástrico; adjuvante imunológico em vacinas.'],
    [14,'Si','Silício',28.085,1.90,111,[4],'metaloide',14,3,'Bioisóstero tetravalente de C (sila-substituição); eleva LogP.'],
    [15,'P','Fósforo',30.974,2.19,106,[3,5],'nao-metal',15,3,'Profármacos fosfatados; antivirais nucleotídeos (Sofosbuvir).'],
    [16,'S','Enxofre',32.06,2.58,102,[2,4,6],'nao-metal',16,3,'Bioisóstero divalente de oxigênio; sulfonamidas antibacterianas.'],
    [17,'Cl','Cloro',35.45,3.16,99,[1,3,5,7],'halogenio',17,3,'Preenche bolsões hidrofóbicos; forma cloridratos solúveis.'],
    [18,'Ar','Argônio',39.948,null,97,[0],'gas-nobre',18,3,'Inerte; atmosfera protetora em reações sensíveis.'],
    [19,'K','Potássio',39.098,0.82,227,[1],'alcalino',1,4,'Principal cátion intracelular; forma sais de rápida dissolução oral.'],
    [20,'Ca','Cálcio',40.078,1.00,197,[2],'alcalino-terroso',2,4,'Segundo mensageiro; alvo de bloqueadores de canal (Amlodipino).'],
    [21,'Sc','Escândio',44.956,1.36,162,[3],'metal-transicao',3,4,'Terras raras; catalisadores industriais.'],
    [22,'Ti','Titânio',47.867,1.54,147,[2,3,4],'metal-transicao',4,4,'Implantes biocompatíveis; catálise.'],
    [23,'V','Vanádio',50.942,1.63,134,[2,3,4,5],'metal-transicao',5,4,'Catálise industrial; mimetiza fosfato em sistemas biológicos.'],
    [24,'Cr','Cromo',51.996,1.66,128,[2,3,6],'metal-transicao',6,4,'Cr(III) cofator de insulina; Cr(VI) carcinogênico.'],
    [25,'Mn','Manganês',54.938,1.55,127,[2,4,7],'metal-transicao',7,4,'Cofator da SOD; contraste em MRI.'],
    [26,'Fe','Ferro',55.845,1.83,126,[2,3],'metal-transicao',8,4,'Centro redox da hemoglobina e CYP450 hepáticas.'],
    [27,'Co','Cobalto',58.933,1.88,125,[2,3],'metal-transicao',9,4,'Centro da vitamina B12; ativa HIF em hipóxia.'],
    [28,'Ni','Níquel',58.693,1.91,124,[2,3],'metal-transicao',10,4,'Catálise (Raney, hidrogenação); alergênico.'],
    [29,'Cu','Cobre',63.546,1.90,128,[1,2],'metal-transicao',11,4,'Cofator da citocromo c oxidase e SOD.'],
    [30,'Zn','Zinco',65.38,1.65,134,[2],'metal-transicao',12,4,'Anidrase carbônica; dedos de zinco (fatores de transcrição).'],
    [31,'Ga','Gálio',69.723,1.81,135,[3],'metal-pos-transicao',13,4,'Contraste; Ga-68 em PET oncológico.'],
    [32,'Ge','Germânio',72.63,2.01,122,[4],'metaloide',14,4,'Semicondutores; análogo de Si.'],
    [33,'As','Arsênio',74.922,2.18,119,[3,5],'metaloide',15,4,'Compostos organoarsenicais (Salvarsan); antileucêmico (Trisulfeto de Arsênio).'],
    [34,'Se','Selênio',78.96,2.55,116,[2,4,6],'nao-metal',16,4,'Selenocisteína; antioxidante (glutationa peroxidase).'],
    [35,'Br','Bromo',79.904,2.96,114,[1,3,5,7],'halogenio',17,4,'Ligações de halogênio direcionadas com carbonilas proteicas.'],
    [36,'Kr','Criptônio',83.798,3.00,110,[0,2],'gas-nobre',18,4,'KrF2 existe; inerte em biologia.'],
    [37,'Rb','Rubídio',85.468,0.82,248,[1],'alcalino',1,5,'Rb-82 PET em cardiologia.'],
    [38,'Sr','Estrôncio',87.62,0.95,215,[2],'alcalino-terroso',2,5,'Sr-89 para paliação de dor óssea metastática.'],
    [39,'Y','Ítrio',88.906,1.22,180,[3],'metal-transicao',3,5,'Y-90 radioembolização hepática.'],
    [40,'Zr','Zircônio',91.224,1.33,160,[4],'metal-transicao',4,5,'MOFs; Zr-89 imunoPET.'],
    [41,'Nb','Nióbio',92.906,1.6,146,[3,5],'metal-transicao',5,5,'Supercondutores; ligas biocompatíveis.'],
    [42,'Mo','Molibdênio',95.95,2.16,139,[4,6],'metal-transicao',6,5,'Cofator de xantina oxidase e nitrogenase.'],
    [43,'Tc','Tecnécio',98,null,136,[4,7],'metal-transicao',7,5,'Tc-99m: principal radiofármaco diagnóstico.'],
    [44,'Ru','Rutênio',101.07,2.2,134,[3,4],'metal-transicao',8,5,'Complexos antitumorais (NAMI-A).'],
    [45,'Rh','Ródio',102.906,2.28,134,[3],'metal-transicao',9,5,'Catálise; complexos metálicos terapêuticos.'],
    [46,'Pd','Paládio',106.42,2.20,137,[2,4],'metal-transicao',10,5,'Catálise cruzada (Suzuki, Heck).'],
    [47,'Ag','Prata',107.868,1.93,144,[1],'metal-transicao',11,5,'Antibacteriano (AgNO3); arginina-prata.'],
    [48,'Cd','Cádmio',112.414,1.69,151,[2],'metal-transicao',12,5,'Tóxico; quantum dots em imageamento.'],
    [49,'In','Índio',114.818,1.78,167,[3],'metal-pos-transicao',13,5,'In-111 radiofármaco; ligas de solda.'],
    [50,'Sn','Estanho',118.71,1.96,158,[2,4],'metal-pos-transicao',14,5,'Organoestânicos; Sn-117m terapia óssea.'],
    [51,'Sb','Antimônio',121.76,2.05,141,[3,5],'metaloide',15,5,'Antileishmania (Glucantime); pentavalente ativo.'],
    [52,'Te','Telúrio',127.60,2.1,137,[2,4,6],'metaloide',16,5,'Semicondutor; tóxico em humanos.'],
    [53,'I','Iodo',126.904,2.66,133,[1,3,5,7],'halogenio',17,5,'Hormônios tireoidianos (T3/T4); contrastes iodados.'],
    [54,'Xe','Xenônio',131.293,2.6,130,[0,2,4,6],'gas-nobre',18,5,'Xe-133 ventilação pulmonar; anestésico; XeF4.'],
    [55,'Cs','Césio',132.905,0.79,265,[1],'alcalino',1,6,'Cs-137 radioisótopo; relógios atômicos.'],
    [56,'Ba','Bário',137.327,0.89,217,[2],'alcalino-terroso',2,6,'Contraste gastrointestinal (BaSO4).'],
    [57,'La','Lantânio',138.905,1.10,187,[3],'lantanideo',3,6,'Contrastes MRI; catalisadores FCC.'],
    [58,'Ce','Cério',140.116,1.12,182,[3,4],'lantanideo',3,6,'Óxido polidor; Ce-144 radioisótopo.'],
    [59,'Pr','Praseodímio',140.908,1.13,182,[3],'lantanideo',3,6,'Ímãs de alta coercividade; corantes.'],
    [60,'Nd','Neodímio',144.242,1.14,181,[3],'lantanideo',3,6,'Ímãs NdFeB (motores elétricos, HDs).'],
    [61,'Pm','Promécio',145,null,183,[3],'lantanideo',3,6,'Radioativo; baterias nucleares.'],
    [62,'Sm','Samário',150.36,1.17,180,[2,3],'lantanideo',3,6,'Sm-153 para dor óssea metastática.'],
    [63,'Eu','Európio',151.964,null,180,[2,3],'lantanideo',3,6,'Fluorescência (ensaios TR-FRET); Eu-152 rastreador.'],
    [64,'Gd','Gadolínio',157.25,1.20,180,[3],'lantanideo',3,6,'Contraste MRI (DTPA-Gd, DOTA-Gd).'],
    [65,'Tb','Térbio',158.925,null,177,[3,4],'lantanideo',3,6,'Fósforos verdes em displays.'],
    [66,'Dy','Disprósio',162.500,1.22,178,[3],'lantanideo',3,6,'Ímãs de alta temperatura.'],
    [67,'Ho','Hólmio',164.930,1.23,176,[3],'lantanideo',3,6,'Ho-166 terapia hepática (microesferas).'],
    [68,'Er','Érbio',167.259,1.24,176,[3],'lantanideo',3,6,'Lasers médicos (dermatologia, oftalmologia).'],
    [69,'Tm','Túlio',168.934,1.25,176,[2,3],'lantanideo',3,6,'Fontes portáteis de raio-X.'],
    [70,'Yb','Itérbio',173.045,null,176,[2,3],'lantanideo',3,6,'Lasers; relógios atômicos.'],
    [71,'Lu','Lutécio',174.967,1.27,174,[3],'lantanideo',3,6,'Lu-177 terapia tumoral (PSMA, DOTATATE).'],
    [72,'Hf','Háfnio',178.49,1.3,159,[4],'metal-transicao',4,6,'HfO2 dielétrico; ligas biocompatíveis.'],
    [73,'Ta','Tântalo',180.948,1.5,146,[5],'metal-transicao',5,6,'Capacitores; implantes cirúrgicos.'],
    [74,'W','Tungstênio',183.84,2.36,139,[4,6],'metal-transicao',6,6,'Filamentos incandescentes; catalisadores.'],
    [75,'Re','Rênio',186.207,1.9,137,[4,7],'metal-transicao',7,6,'Re-186/188 terapia óssea.'],
    [76,'Os','Ósmio',190.23,2.2,135,[4,8],'metal-transicao',8,6,'OsO4 fixador histológico (microscopia eletrônica).'],
    [77,'Ir','Irídio',192.217,2.20,136,[3,4],'metal-transicao',9,6,'Complexos antitumorais (Ir(III)); catálise.'],
    [78,'Pt','Platina',195.084,2.28,139,[2,4],'metal-transicao',10,6,'Cisplatina, carboplatina, oxaliplatina — cross-link no DNA.'],
    [79,'Au','Ouro',196.967,2.54,144,[1,3],'metal-transicao',11,6,'Auranofina (artrite); Au-198 terapia.'],
    [80,'Hg','Mercúrio',200.592,2.00,149,[1,2],'metal-transicao',12,6,'Timolol (preservante); extremamente tóxico.'],
    [81,'Tl','Tálio',204.38,1.62,148,[1,3],'metal-pos-transicao',13,6,'Tl-201 cintilografia cardíaca.'],
    [82,'Pb','Chumbo',207.2,2.33,146,[2,4],'metal-pos-transicao',14,6,'Pb-212 terapia alfa; neurotóxico.'],
    [83,'Bi','Bismuto',208.980,2.02,148,[3,5],'metal-pos-transicao',15,6,'Subsalicilato (Pepto-Bismol); Bi-213 terapia alfa.'],
    [84,'Po','Polônio',209,2.0,140,[2,4],'metaloide',16,6,'Altamente radioativo e tóxico.'],
    [85,'At','Astato',210,2.2,150,[1],'halogenio',17,6,'At-211 terapia alfa em câncer.'],
    [86,'Rn','Radônio',222,null,150,[0,2],'gas-nobre',18,6,'Radioativo; causa câncer pulmonar.'],
    [87,'Fr','Frâncio',223,0.7,260,[1],'alcalino',1,7,'Radioativo; Fr-223 terapia.'],
    [88,'Ra','Rádio',226,0.9,221,[2],'alcalino-terroso',2,7,'Ra-223 terapia óssea (Xofigo).'],
    [89,'Ac','Actínio',227,1.1,195,[3],'actinideo',3,7,'Ac-225 terapia alfa (mieloma, próstata).'],
    [90,'Th','Tório',232.038,1.3,180,[4],'actinideo',3,7,'Th-227 terapia alfa (PSMA).'],
    [91,'Pa','Protactínio',231.036,1.5,180,[4,5],'actinideo',3,7,'Radioativo natural.'],
    [92,'U','Urânio',238.029,1.38,175,[4,6],'actinideo',3,7,'U-235 fissão nuclear; U-238 radioisótopo.'],
    [93,'Np','Netúnio',237,1.36,175,[5,6],'actinideo',3,7,'Radioativo artificial.'],
    [94,'Pu','Plutônio',244,1.28,175,[3,4,5,6],'actinideo',3,7,'Pu-238 baterias espaciais; Pu-239 armas nucleares.'],
    [95,'Am','Amerício',243,1.13,175,[3],'actinideo',3,7,'Detectores de fumaça (Am-241).'],
    [96,'Cm','Cúrio',247,1.28,176,[3],'actinideo',3,7,'Radioativo; fontes de raio-X.'],
    [97,'Bk','Berquélio',247,1.3,170,[3,4],'actinideo',3,7,'Radioativo artificial.'],
    [98,'Cf','Califórnio',251,1.3,169,[3,4],'actinideo',3,7,'Cf-252 fonte de nêutrons; reator de partida.'],
    [99,'Es','Einstênio',252,1.3,168,[3],'actinideo',3,7,'Radioativo artificial.'],
    [100,'Fm','Férmio',257,1.3,167,[3],'actinideo',3,7,'Radioativo artificial.'],
    [101,'Md','Mendelévio',258,1.3,166,[2,3],'actinideo',3,7,'Radioativo artificial.'],
    [102,'No','Nobélio',259,1.3,165,[2,3],'actinideo',3,7,'Radioativo artificial.'],
    [103,'Lr','Laurêncio',262,null,164,[3],'actinideo',3,7,'Radioativo artificial.'],
    [104,'Rf','Rutherfórdio',267,null,null,[4],'metal-transicao',4,7,'Sintético (transurânico).'],
    [105,'Db','Dúbnio',268,null,null,[5],'metal-transicao',5,7,'Sintético.'],
    [106,'Sg','Seabórgio',269,null,null,[6],'metal-transicao',6,7,'Sintético.'],
    [107,'Bh','Bóhrio',270,null,null,[7],'metal-transicao',7,7,'Sintético.'],
    [108,'Hs','Hássio',269,null,null,[8],'metal-transicao',8,7,'Sintético.'],
    [109,'Mt','Meitnério',278,null,null,[3],'metal-transicao',9,7,'Sintético.'],
    [110,'Ds','Darmstádtio',281,null,null,[4],'metal-transicao',10,7,'Sintético.'],
    [111,'Rg','Roentgênio',282,null,null,[3],'metal-transicao',11,7,'Sintético.'],
    [112,'Cn','Copernício',285,null,null,[2],'metal-transicao',12,7,'Sintético.'],
    [113,'Nh','Nihônio',286,null,null,[1,3],'metal-pos-transicao',13,7,'Sintético.'],
    [114,'Fl','Fleróvio',289,null,null,[2,4],'metal-pos-transicao',14,7,'Sintético.'],
    [115,'Mc','Moscóvio',290,null,null,[1,3],'metal-pos-transicao',15,7,'Sintético.'],
    [116,'Lv','Livermório',293,null,null,[2,4],'metal-pos-transicao',16,7,'Sintético.'],
    [117,'Ts','Tenesso',294,null,null,[1],'halogenio',17,7,'Sintético (poucos átomos produzidos).'],
    [118,'Og','Oganessônio',294,null,null,[0,2],'gas-nobre',18,7,'Sintético (poucos átomos produzidos).']
  ];

  const TABELA_PERIODICA = TP_RAW.map(function (a) {
    return {
      z: a[0], sym: a[1], nome: a[2], massa: a[3],
      eletron: a[4], raio: a[5], valencias: a[6],
      cat: a[7], grupo: a[8], periodo: a[9], pharma: a[10]
    };
  });
  // ››› FIM: TABELA_PERIODICA — 118 elementos IUPAC com metadados físico-químicos e papel medicinal.
  // ››› FEEDBACK: para adicionar coluna (ex.: densidade), estenda TP_RAW e ajuste o map.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L4.1b — MAPA DE POSIÇÕES NA GRADE 18×9 ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Converte cada elemento em {linha, coluna} para o grid CSS.
  // Lantanídeos (Z 57-71) → linha 8; Actinídeos (Z 89-103) → linha 9.
  // ═══════════════════════════════════════════════════════════════════════════
  const POSICOES_PTABLE = (function () {
    const pos = {};
    TABELA_PERIODICA.forEach(function (e) {
      if (e.z >= 57 && e.z <= 71) {
        pos[e.sym] = { r: 8, c: 3 + (e.z - 57) };
      } else if (e.z >= 89 && e.z <= 103) {
        pos[e.sym] = { r: 9, c: 3 + (e.z - 89) };
      } else {
        pos[e.sym] = { r: e.periodo, c: e.grupo };
      }
    });
    return pos;
  })();
  // ››› FIM: POSICOES_PTABLE — coordenadas na grade para renderização da tabela.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L4.2 — REAÇÕES BIOISOSTÉRICAS ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // 7 classes de substituições bioisostéricas clássicas em química medicinal.
  // Cada uma tem: id, nome, tag, esquema visual, descrição, alvoSmarts,
  // detectar(smiles) → bool, transformar(smiles) → novoSmiles.
  // ═══════════════════════════════════════════════════════════════════════════
  const REACOES_BIOISOSTERISMO = [
    {
      id: 'carboxila_tetrazol',
      nome: 'Bioisóstero de Tetrazol',
      tag: 'Não-Clássico',
      esquema: 'R-COOH ➔ R-(1H-Tetrazol-5-il)',
      descricao: 'Mantém carga negativa deslocalizada e acidez (pKa ~4.5); 10× mais lipofílico.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: function (s) { return /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s); },
      transformar: function (s) { return s.replace(/C\(=O\)\[?OH?\]?/i, 'c1nnn[nH]1'); }
    },
    {
      id: 'esterificacao_metilica',
      nome: 'Éster Metílico (Pró-fármaco)',
      tag: 'Pró-fármaco',
      esquema: 'R-COOH ➔ R-COOCH₃',
      descricao: 'Mascara a carga aniônica; regenerado no plasma por esterases.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: function (s) { return /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s); },
      transformar: function (s) { return s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)OC'); }
    },
    {
      id: 'amidacao_primaria',
      nome: 'Amidação de Carboxila',
      tag: 'Clássico',
      esquema: 'R-COOH ➔ R-CONH₂',
      descricao: 'Neutraliza a acidez e estabiliza interações por ligações de hidrogênio.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: function (s) { return /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s); },
      transformar: function (s) { return s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)N'); }
    },
    {
      id: 'o_metilacao',
      nome: 'O-Metilação (Éter Metílico)',
      tag: 'Bloqueio de Fase II',
      esquema: 'Ar-OH ➔ Ar-OCH₃',
      descricao: 'Protege hidroxilas/fenóis contra glicuronidação e sulfatação hepáticas.',
      alvoSmarts: '[OH]',
      detectar: function (s) { return /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s) || /O[H]/i.test(s); },
      transformar: function (s) {
        return s.replace(/c\(O\)/i, 'c(OC)').replace(/\[OH\]/i, 'OC').replace(/O[H]/i, 'OC');
      }
    },
    {
      id: 'o_acetilacao',
      nome: 'O-Acetilação (Esterificação)',
      tag: 'Atenuação de Toxicidade',
      esquema: 'Ar-OH ➔ Ar-OCOCH₃',
      descricao: 'Conversão clássica Salicílico → Aspirina; protege mucosa gástrica.',
      alvoSmarts: 'c[OH]',
      detectar: function (s) { return /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s); },
      transformar: function (s) {
        return s.replace(/c\(O\)/i, 'c(OC(=O)C)').replace(/\[OH\]/i, 'OC(=O)C');
      }
    },
    {
      id: 'n_acetilacao',
      nome: 'N-Acetilação de Amina',
      tag: 'Otimização Analgésica',
      esquema: 'Ar-NH₂ ➔ Ar-NHCOCH₃',
      descricao: 'Conversão 4-aminofenol → Paracetamol; atenua toxicidade de aminas livres.',
      alvoSmarts: '[NH2]',
      detectar: function (s) { return /N/i.test(s) && !/N\(=O\)/i.test(s); },
      transformar: function (s) {
        return s.replace(/NC/i, 'N(C(=O)C)C').replace(/\[NH2\]/i, 'NC(=O)C');
      }
    },
    {
      id: 'fluorizacao_aromatica',
      nome: 'Fluorização Aromática (Bloqueio CYP)',
      tag: 'H ➔ F',
      esquema: 'Ar-H ➔ Ar-F',
      descricao: 'Flúor mimetiza H espacialmente; efeito indutivo bloqueia oxidação por CYP450.',
      alvoSmarts: 'c1ccccc1',
      detectar: function (s) { return /c1ccccc1/i.test(s) || /c[0-9]ccc/i.test(s); },
      transformar: function (s) { return s.replace(/c1ccccc1/i, 'c1ccc(F)cc1'); }
    }
  ];
  // ››› FIM: REACOES_BIOISOSTERISMO — 7 transformações clássicas de química medicinal.
  // ››› FEEDBACK: cada transformação usa regex simples; para casos complexos, migrar para RDKit SMARTS.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L4.3 — PAINS (Pan-Assay Interference Compounds) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Baseado em Baell & Holloway, J. Med. Chem. 2010.
  // Detectores de grupos promíscuos que geram falsos positivos em HTS.
  // ═══════════════════════════════════════════════════════════════════════════
  const PAINS_SUBSTRUCTURES = [
    { nome: 'Quinona',            smarts: 'O=C1C=CC(=O)C=C1',                       risco: 'Aceptor de Michael redox-cíclico; gera EROs.' },
    { nome: 'Catecol',            smarts: 'c1cc(O)c(O)cc1',                         risco: 'Oxida a orto-quinona; quela metais.' },
    { nome: 'Hidroquinona',       smarts: 'OC1=CC=C(O)C=C1',                        risco: 'Interferência redox direta em ensaios colorimétricos.' },
    { nome: 'Rodanina',           smarts: 'S1C(=O)NC(=O)C1',                        risco: 'Eletrófilo promíscuo que alquila cisteínas.' },
    { nome: 'Aceptor de Michael', smarts: '[CX3]=[CX3][CX3]=O',                     risco: 'Reatividade tiol-dependente inespecífica.' },
    { nome: 'Azo-composto',       smarts: 'N=NC',                                    risco: 'Redução metabólica a aminas carcinogênicas.' },
    { nome: 'Nitroaromático',     smarts: '[$([NX3](=O)=O),$([NX3+](=O)[O-])][c]',  risco: 'Biorredução a radical nitro aniônico tóxico.' },
    { nome: 'Epóxido',            smarts: 'C1OC1',                                   risco: 'Alquilante eletrofílico de DNA e proteínas.' },
    { nome: 'Aziridina',          smarts: 'C1CN1',                                   risco: 'Análogo ao epóxido; alquilante DNA clássico.' },
    { nome: 'Aldeído Reativo',    smarts: '[CX3H1](=O)[#6]',                         risco: 'Forma bases de Schiff com lisinas.' },
    { nome: 'Haleto de Acila',    smarts: '[CX3](=O)[Cl,Br,I]',                      risco: 'Acilante altamente reativo; hidrolisa rapidamente.' },
    { nome: 'Anidrido',           smarts: '[CX3](=O)[OX2][CX3](=O)',                 risco: 'Acilante bifuncional de qualquer nucleófilo.' },
    { nome: 'Isocianato',         smarts: '[NX2]=[CX2]=[OX1]',                       risco: 'Carbamoilante de aminas primárias.' },
    { nome: 'Tiois Reativos',     smarts: '[SX2H]',                                   risco: 'Oxidação a dissulfeto inespecífica.' },
    { nome: 'Fenol Alquilante',   smarts: '[OX2H]c',                                  risco: 'Substrato promíscuo de tirosinas-quinases.' },
    { nome: 'Enona',              smarts: 'C=CC=O',                                   risco: 'Aceptor de Michael α,β-insaturado.' },
    { nome: 'Furanos Reativos',   smarts: 'c1ccoc1',                                  risco: 'Oxidação a epóxido furânico reativo.' },
    { nome: 'Hidrazina Livre',    smarts: '[NX3][NX3]',                               risco: 'Hidrazonas inespecíficas com carbonilas proteicas.' },
    { nome: 'Peróxido',           smarts: '[OX2][OX2]',                               risco: 'Fonte de radicais livres; degrada reagentes.' }
  ];
  // ››› FIM: PAINS_SUBSTRUCTURES — 19 padrões promíscuos para alerta de HTS.
  // ››› FEEDBACK: adicionar novas PAINS exige novo par {nome, smarts, risco}; o detector é automático.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.1 — TOASTS (Sistema de Notificações) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Cria uma notificação flutuante no canto inferior direito.
  // Tipos: 'info' | 'success' | 'error' | 'warning'.
  // ═══════════════════════════════════════════════════════════════════════════
  function mostrarNotificacao(mensagem, tipo, duracaoMs) {
    tipo = tipo || 'info';
    duracaoMs = duracaoMs || 3000;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + tipo;
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, duracaoMs);
  }
  window.mostrarNotificacao = mostrarNotificacao;
  // ››› FIM: mostrarNotificacao(msg, tipo, ms) — feedback visual não bloqueante.
  // ››› FEEDBACK: cores definidas no CSS (.toast-info / .toast-success / etc.).
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.2 — PERSISTÊNCIA (localStorage) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Salva preferências de UI (modo, estilo, rotação, categoria ativa) e
  // favoritos. Não persiste estado de edição (esse vive em memória).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Persiste preferências de UI no localStorage.
   * Chamada em qualquer alteração de modo, estilo ou categoria.
   */
  function salvarPreferencias() {
    try {
      const categoriaAtiva = document.querySelector('.category-pill.active');
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify({
        modoExibicaoAtual: STATE.modoExibicaoAtual,
        modeloAtual: STATE.modeloAtual,
        autoRotacaoAtiva: STATE.autoRotacaoAtiva,
        categoriaAtiva: categoriaAtiva ? categoriaAtiva.dataset.cat : 'todas'
      }));
    } catch (e) {}
  }
  // ››› FIM: salvarPreferencias() — snapshot de UI no localStorage.
  // ››› FEEDBACK: silencia erros de modo privado (Safari) onde localStorage lança.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Restaura preferências de UI no boot.
   * Aplicada APÓS a indexação estar completa para evitar conflitos.
   */
  function carregarPreferencias() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.prefs);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.modoExibicaoAtual) setStudioModoVisual(p.modoExibicaoAtual);
      if (p.modeloAtual) setModelo3D(p.modeloAtual);
      if (p.autoRotacaoAtiva) toggleAutoRotacao3D();
      if (p.categoriaAtiva && p.categoriaAtiva !== 'todas') {
        filtrarCategoriaStudio(p.categoriaAtiva);
      }
    } catch (e) {}
  }
  // ››› FIM: carregarPreferencias() — restaura UI salva anteriormente.
  // ››› FEEDBACK: ordem importa — primeiro modo/estilo, depois categoria.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega conjunto de favoritos do localStorage.
   * Favoritos são IDs de compostos (não referências diretas) para sobreviver
   * a reindexações.
   */
  function carregarFavoritos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.favoritos);
      if (raw) {
        const arr = JSON.parse(raw);
        STATE.favoritos = new Set(Array.isArray(arr) ? arr : []);
      }
    } catch (e) {
      STATE.favoritos = new Set();
    }
  }
  // ››› FIM: carregarFavoritos() — popula Set de IDs favoritos.
  // ››› FEEDBACK: sempre valida Array antes de construir Set (defesa contra corrupção).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Persiste conjunto de favoritos como array JSON.
   */
  function salvarFavoritos() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.favoritos,
        JSON.stringify(Array.from(STATE.favoritos))
      );
    } catch (e) {}
  }
  // ››› FIM: salvarFavoritos() — persiste Set como array (JSON não suporta Set nativo).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Atualiza o botão "Favoritar" no header para refletir o estado do composto
   * atualmente selecionado.
   */
  function atualizarBotaoFavorito() {
    const btn = document.getElementById('btnFavoriteCurrent');
    if (!btn || !STATE.compostoSelecionado) return;
    btn.style.display = 'inline-flex';
    const isFav = STATE.favoritos.has(STATE.compostoSelecionado.id);
    btn.classList.toggle('is-active', isFav);
    btn.textContent = isFav ? '★' : '☆';
    btn.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  }
  // ››› FIM: atualizarBotaoFavorito() — sincroniza botão ★/☆ com estado real.
  // ››› FEEDBACK: chamado sempre que troca de composto selecionado.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão "Favoritar" no header.
   * Alterna estado e re-renderiza a lista para refletir o marcador ★.
   */
  window.alternarFavoritoAtual = function () {
    if (!STATE.compostoSelecionado) return;
    if (STATE.favoritos.has(STATE.compostoSelecionado.id)) {
      STATE.favoritos.delete(STATE.compostoSelecionado.id);
      mostrarNotificacao('Removido dos favoritos.', 'info');
    } else {
      STATE.favoritos.add(STATE.compostoSelecionado.id);
      mostrarNotificacao('Adicionado aos favoritos.', 'success');
    }
    salvarFavoritos();
    atualizarBotaoFavorito();
    renderizarListaCompostos(true);
  };
  // ››› FIM: alternarFavoritoAtual() — toggle com persistência + re-render.
  // ››› FEEDBACK: exposto em window para inline onclick do HTML.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.3 — UNDO / REDO DE EDIÇÕES ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Guarda snapshots completos (composto + SDF) em pilha dupla.
  // Cada operação que modifica estrutura empilha um snapshot ANTES da mutação.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Habilita/desabilita botões Undo/Redo conforme as pilhas.
   */
  function atualizarBotoesUndoRedo() {
    const bU = document.getElementById('btnUndo');
    const bR = document.getElementById('btnRedo');
    if (bU) bU.disabled = STATE.edicaoHistory.undo.length === 0;
    if (bR) bR.disabled = STATE.edicaoHistory.redo.length === 0;
  }
  // ››› FIM: atualizarBotoesUndoRedo() — sincroniza UI com estado das pilhas.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Empilha snapshot do estado atual ANTES de uma edição.
   * @param {Object} composto - Cópia do composto atual (será clonado)
   * @param {string} sdf      - String SDF correspondente
   * @param {string} motivo   - Descrição legível (ex.: "Sub C→N")
   */
  function pushEdicaoSnapshot(composto, sdf, motivo) {
    STATE.edicaoHistory.undo.push({
      composto: JSON.parse(JSON.stringify(composto)),
      sdf: sdf,
      motivo: motivo,
      timestamp: Date.now()
    });
    if (STATE.edicaoHistory.undo.length > STATE.edicaoHistory.max) {
      STATE.edicaoHistory.undo.shift();
    }
    STATE.edicaoHistory.redo = [];
    atualizarBotoesUndoRedo();
  }
  // ››› FIM: pushEdicaoSnapshot() — empilha estado antes de mutação.
  // ››› FEEDBACK: clona composto via JSON para evitar referência compartilhada.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão Undo / Ctrl+Z.
   * Retorna ao snapshot anterior. Não remove do redo (permite refazer).
   */
  window.desfazerEdicao = function () {
    if (STATE.edicaoHistory.undo.length < 2) {
      mostrarNotificacao('Nada para desfazer.', 'info');
      return;
    }
    const atual = STATE.edicaoHistory.undo.pop();
    STATE.edicaoHistory.redo.push(atual);
    const anterior = STATE.edicaoHistory.undo[STATE.edicaoHistory.undo.length - 1];
    STATE.compostoSelecionado = anterior.composto;
    STATE.sdfCacheLocal = anterior.sdf;
    if (STATE.sdfCacheLocal) construirCena3D(STATE.sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação desfeita: ' + (atual.motivo || ''), 'info');
  };
  // ››› FIM: desfazerEdicao() — retrocede na pilha undo, re-renderiza 3D.
  // ››› FEEDBACK: requer mínimo de 2 snapshots (o atual + o anterior).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão Redo / Ctrl+Y / Ctrl+Shift+Z.
   * Reaplica a próxima ação da pilha redo.
   */
  window.refazerEdicao = function () {
    if (STATE.edicaoHistory.redo.length === 0) {
      mostrarNotificacao('Nada para refazer.', 'info');
      return;
    }
    const prox = STATE.edicaoHistory.redo.pop();
    STATE.edicaoHistory.undo.push(prox);
    STATE.compostoSelecionado = prox.composto;
    STATE.sdfCacheLocal = prox.sdf;
    if (STATE.sdfCacheLocal) construirCena3D(STATE.sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação refeita: ' + (prox.motivo || ''), 'info');
  };
  // ››› FIM: refazerEdicao() — avança na pilha redo, re-renderiza 3D.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.4 — HISTÓRICO DE NAVEGAÇÃO ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Rastreia compostos visitados em sequência (◀ ▶). Independente do undo/redo.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Empilha entrada no histórico de navegação. Ignora duplicatas consecutivas.
   */
  function pushNavegacao(comp) {
    if (!comp) return;
    const itens = STATE.historicoNavegacao.itens;
    const ultimo = itens[itens.length - 1];
    if (ultimo && ultimo.id === comp.id) return;
    itens.push({ id: comp.id, nome: comp.nome, ref: comp });
    if (itens.length > STATE.historicoNavegacao.max) itens.shift();
    STATE.historicoNavegacao.indice = itens.length - 1;
  }
  // ››› FIM: pushNavegacao() — empilha visita no histórico de navegação.
  // ››› FEEDBACK: guarda referência direta ao composto (não cópia) para performance.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão ◀ / Alt+←. Retrocede uma posição no histórico.
   */
  window.irParaAnterior = function () {
    if (STATE.historicoNavegacao.indice <= 0) {
      mostrarNotificacao('Início do histórico.', 'info');
      return;
    }
    STATE.historicoNavegacao.indice--;
    const alvo = STATE.historicoNavegacao.itens[STATE.historicoNavegacao.indice].ref;
    selecionarCompostoStudio(alvo, null, false);
  };
  // ››› FIM: irParaAnterior() — volta no histórico sem empilhar nova navegação.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão ▶ / Alt+→. Avança uma posição no histórico.
   */
  window.irParaProximo = function () {
    if (STATE.historicoNavegacao.indice >= STATE.historicoNavegacao.itens.length - 1) {
      mostrarNotificacao('Fim do histórico.', 'info');
      return;
    }
    STATE.historicoNavegacao.indice++;
    const alvo = STATE.historicoNavegacao.itens[STATE.historicoNavegacao.indice].ref;
    selecionarCompostoStudio(alvo, null, false);
  };
  // ››› FIM: irParaProximo() — avança no histórico sem empilhar.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.5 — MODO APRESENTAÇÃO ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Oculta header, sidebar, toolbar e HUDs, deixando só o canvas 3D/2D em
  // tela cheia. Ideal para aulas e demonstrações.
  // ═══════════════════════════════════════════════════════════════════════════
  window.alternarModoApresentacao = function () {
    const ativo = document.body.classList.toggle('presentation-mode');
    const hint = document.getElementById('presentationExitHint');
    if (hint) hint.style.display = ativo ? 'block' : 'none';
    if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
      setTimeout(function () {
        STATE.studioViewer.resize();
        STATE.studioViewer.render();
      }, 250);
    }
    if (ativo && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else if (!ativo && document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  };
  // ››› FIM: alternarModoApresentacao() — toggle classe CSS + fullscreen nativo.
  // ››› FEEDBACK: re-renderiza 3D após transição CSS (250ms) para evitar resize prematuro.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L5.1 — WEB WORKER (Indexação Assíncrona) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Processa 2500+ compostos em thread separada, evitando travar a UI.
  // Fallback síncrono se o Worker não estiver disponível.
  // ═══════════════════════════════════════════════════════════════════════════
  function inicializarWorker() {
    if (STATE.indexerWorker) return STATE.indexerWorker;
    try {
      STATE.indexerWorker = new Worker('workers/indexer.worker.js');
      STATE.indexerWorker.onmessage = function (e) {
        const data = e.data;
        const tipo = data.tipo;
        if (tipo === 'PROGRESSO') {
          exibirStatusRDKit(true, (data.etapa || '') + ' ' + (data.percentual || 0) + '%');
        } else if (tipo === 'INDEXADO') {
          exibirStatusRDKit(false);
          STATE.compostosIndexados = data.compostos;
          STATE.compostosFiltrados = STATE.compostosIndexados.slice();
          const badge = document.getElementById('studioTotalBadge');
          if (badge) badge.textContent = STATE.compostosIndexados.length + ' Espécies';
          renderizarListaCompostos(true);
          carregarPreferencias();
          if (STATE.compostosIndexados.length > 0) {
            const primeiroEl = document.querySelector('.compound-item');
            selecionarCompostoStudio(STATE.compostosIndexados[0], primeiroEl);
          }
        } else if (tipo === 'ERRO') {
          exibirStatusRDKit(false);
          console.warn('[Worker] Erro:', data.mensagem);
          indexarAcervoCompletoFallback();
        }
      };
      STATE.indexerWorker.onerror = function () {
        indexarAcervoCompletoFallback();
      };
      return STATE.indexerWorker;
    } catch (e) {
      return null;
    }
  }
  // ››› FIM: inicializarWorker() — instancia Worker e configura handlers.
  // ››› FEEDBACK: se Worker falhar (file:// ou browser antigo), retorna null e cai no fallback.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L5.2 — INGESTÃO DE DADOS ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Coleta as três bases de dados do laboratório (window → parent → opener).
  // ═══════════════════════════════════════════════════════════════════════════
  function obterFontesDeDados() {
    const labDb =
      window.LAB_DATABASE ||
      (window.parent && window.parent.LAB_DATABASE) ||
      (window.opener && window.opener.LAB_DATABASE) || null;
    const synthDb =
      window.BANCO_SINTESES_LAIFT ||
      (window.parent && window.parent.BANCO_SINTESES_LAIFT) ||
      (window.opener && window.opener.BANCO_SINTESES_LAIFT) || null;
    const expandidoDb =
      window.BANCO_COMPOSTOS_EXPANDIDO ||
      (window.parent && window.parent.BANCO_COMPOSTOS_EXPANDIDO) ||
      (window.opener && window.opener.BANCO_COMPOSTOS_EXPANDIDO) || null;
    return { labDb: labDb, synthDb: synthDb, expandidoDb: expandidoDb };
  }
  // ››› FIM: obterFontesDeDados() — coleta bases de dados de 3 escopos possíveis.
  // ››› FEEDBACK: prioriza window; pai/opener cobrem modais e popups.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Acervo de reserva — garante que o estúdio nunca abra vazio,
   * mesmo sem bancos de dados externos carregados.
   */
  const ACERVO_RESERVA = [
    { id: 'AAS', chaveOriginal: 'AAS_s', nome: 'Ácido Acetilsalicílico (Aspirina)', formula: 'C9H8O4', molarMass: 180.16, smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', categoria: 'farmacos', pubchemQuery: 'Aspirin' },
    { id: 'Paracetamol', chaveOriginal: 'Paracetamol_s', nome: 'Paracetamol (Acetaminofeno)', formula: 'C8H9NO2', molarMass: 151.16, smiles: 'CC(=O)NC1=CC=C(O)C=C1', categoria: 'farmacos', pubchemQuery: 'Acetaminophen' },
    { id: 'Dipirona', chaveOriginal: 'Dipirona_s', nome: 'Dipirona Sódica (Metamizol)', formula: 'C13H16N3NaO4S', molarMass: 333.34, smiles: 'CN(CS(=O)(=O)[O-])C1=C(C)N(N1C)C2=CC=CC=C2.[Na+]', categoria: 'farmacos', pubchemQuery: 'Metamizole' },
    { id: 'Ibuprofeno', chaveOriginal: 'Ibuprofeno_s', nome: 'Ibuprofeno', formula: 'C13H18O2', molarMass: 206.28, smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', categoria: 'farmacos', pubchemQuery: 'Ibuprofen' },
    { id: 'Cafeina', chaveOriginal: 'Cafeina_s', nome: 'Cafeína', formula: 'C8H10N4O2', molarMass: 194.19, smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', categoria: 'farmacos', pubchemQuery: 'Caffeine' },
    { id: 'AcidoSalicilico', chaveOriginal: 'AcidoSalicilico_s', nome: 'Ácido Salicílico', formula: 'C7H6O3', molarMass: 138.12, smiles: 'O=C(O)C1=CC=CC=C1O', categoria: 'reagentes', pubchemQuery: 'Salicylic acid' },
    { id: 'AnidridoAcetico', chaveOriginal: 'AnidridoAcetico_l', nome: 'Anidrido Acético', formula: 'C4H6O3', molarMass: 102.09, smiles: 'CC(=O)OC(=O)C', categoria: 'reagentes', pubchemQuery: 'Acetic anhydride' },
    { id: 'pAminofenol', chaveOriginal: 'pAminofenol_s', nome: '4-Aminofenol', formula: 'C6H7NO', molarMass: 109.13, smiles: 'NC1=CC=C(O)C=C1', categoria: 'reagentes', pubchemQuery: '4-Aminophenol' },
    { id: 'Etanol', chaveOriginal: 'Etanol_l', nome: 'Etanol Absoluto', formula: 'C2H6O', molarMass: 46.07, smiles: 'CCO', categoria: 'solventes', pubchemQuery: 'Ethanol' },
    { id: 'Metanol', chaveOriginal: 'Metanol_l', nome: 'Metanol', formula: 'CH4O', molarMass: 32.04, smiles: 'CO', categoria: 'solventes', pubchemQuery: 'Methanol' },
    { id: 'Acetona', chaveOriginal: 'Acetona_l', nome: 'Acetona', formula: 'C3H6O', molarMass: 58.08, smiles: 'CC(=O)C', categoria: 'solventes', pubchemQuery: 'Acetone' },
    { id: 'Hexano', chaveOriginal: 'Hexano_l', nome: 'Hexano', formula: 'C6H14', molarMass: 86.18, smiles: 'CCCCCC', categoria: 'solventes', pubchemQuery: 'Hexane' },
    { id: 'Cloroformio', chaveOriginal: 'Cloroformio_l', nome: 'Clorofórmio', formula: 'CHCl3', molarMass: 119.38, smiles: 'ClC(Cl)Cl', categoria: 'solventes', pubchemQuery: 'Chloroform' },
    { id: 'Benzeno', chaveOriginal: 'Benzeno_l', nome: 'Benzeno', formula: 'C6H6', molarMass: 78.11, smiles: 'c1ccccc1', categoria: 'solventes', pubchemQuery: 'Benzene' },
    { id: 'AcetatoEtila', chaveOriginal: 'AcetatoEtila_l', nome: 'Acetato de Etila', formula: 'C4H8O2', molarMass: 88.11, smiles: 'CCOC(=O)C', categoria: 'solventes', pubchemQuery: 'Ethyl acetate' },
    { id: 'Na', chaveOriginal: 'Na_s', nome: 'Sódio Metálico', formula: 'Na', molarMass: 22.99, smiles: '[Na]', categoria: 'reagentes', pubchemQuery: 'Sodium' }
  ];
  // ››› FIM: ACERVO_RESERVA — 16 compostos essenciais para nunca-vazio.
  // ››› FEEDBACK: inclui 'Acetato de Etila' com pubchemQuery correto em inglês.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fallback síncrono para indexação (usado quando Worker não carrega).
   * Realiza o mesmo trabalho do Worker mas na main thread.
   */
  function indexarAcervoCompletoFallback() {
    const mapaUnico = new Map();
    const fontes = obterFontesDeDados();

    // Fase 1: LAB_DATABASE (species)
    if (fontes.labDb && fontes.labDb.species) {
      Object.keys(fontes.labDb.species).forEach(function (chave) {
        const dados = fontes.labDb.species[chave];
        const id = chave.replace(/_s|_l|_aq|_g/g, '');
        mapaUnico.set(id.toLowerCase(), {
          id: id,
          chaveOriginal: chave,
          nome: dados.label || id,
          formula: dados.formula || '--',
          molarMass: dados.molarMass || '--',
          smiles: dados.smiles || '--',
          categoria: classificarCategoria(chave, dados.label),
          pubchemQuery: dados.pubchemQuery || dados.label || id
        });
      });
    }

    // Fase 2: BANCO_SINTESES_LAIFT
    if (fontes.synthDb && Array.isArray(fontes.synthDb)) {
      fontes.synthDb.forEach(function (synth) {
        if (!synth || !synth.nomeComposto) return;
        const id = synth.produtoId || synth.id || synth.nomeComposto;
        const norm = id.toLowerCase();
        if (!mapaUnico.has(norm)) {
          mapaUnico.set(norm, {
            id: id,
            chaveOriginal: synth.produtoId || synth.id,
            nome: synth.nomeComposto,
            formula: synth.formula || '--',
            molarMass: synth.molarMass || '--',
            smiles: synth.smiles || '--',
            categoria: 'farmacos',
            pubchemQuery: synth.pubchemQuery || synth.nomeComposto
          });
        }
      });
    }

    // Fase 3: BANCO_COMPOSTOS_EXPANDIDO
    if (fontes.expandidoDb && Array.isArray(fontes.expandidoDb)) {
      fontes.expandidoDb.forEach(function (c) {
        if (!c || !c.nome) return;
        const norm = (c.id || c.nome).toLowerCase();
        if (!mapaUnico.has(norm)) {
          mapaUnico.set(norm, {
            id: c.id || c.nome,
            chaveOriginal: c.chave || c.id || c.nome,
            nome: c.nome,
            formula: c.formula || '--',
            molarMass: c.molarMass || '--',
            smiles: c.smiles || '--',
            categoria: c.categoria || 'reagentes',
            pubchemQuery: c.pubchemQuery || c.nome
          });
        }
      });
    }

    // Fase 4: Acervo de reserva
    ACERVO_RESERVA.forEach(function (comp) {
      const norm = comp.id.toLowerCase();
      if (!mapaUnico.has(norm)) mapaUnico.set(norm, comp);
    });

    // Fase 5: Ordenação
    STATE.compostosIndexados = Array.from(mapaUnico.values()).sort(function (a, b) {
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });
    STATE.compostosFiltrados = STATE.compostosIndexados.slice();

    const badge = document.getElementById('studioTotalBadge');
    if (badge) badge.textContent = STATE.compostosIndexados.length + ' Espécies';
    renderizarListaCompostos(true);
    carregarPreferencias();
    if (STATE.compostosIndexados.length > 0) {
      const primeiroEl = document.querySelector('.compound-item');
      selecionarCompostoStudio(STATE.compostosIndexados[0], primeiroEl);
    }
  }
  // ››› FIM: indexarAcervoCompletoFallback() — versão síncrona da indexação.
  // ››› FEEDBACK: replica exatamente a lógica do Worker para consistência total.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Classifica um composto em uma categoria semântica.
   * Ordem: custom > toxicos > solventes > reagentes > farmacos.
   */
  function classificarCategoria(chave, label) {
    const txt = ((chave || '') + ' ' + (label || '')).toLowerCase();
    if (/custom|derivado|editado|análogo|scaffold_/.test(txt)) return 'custom';
    if (/sarin|vx|estricnina|toxina|mostarda|cianeto|arsênio|fentanil/.test(txt)) return 'toxicos';
    if (/agua|etanol|metanol|acetona|hexano|cloroformio|dmso|thf|tolueno|benzeno/.test(txt)) return 'solventes';
    if (/acido|hidroxido|cloreto|sulfato|nitrato|anidrido|sodio|potassio|carbonato|fosfato/.test(txt)) return 'reagentes';
    return 'farmacos';
  }
  // ››› FIM: classificarCategoria() — regex heurística de categorização.
  // ››› FEEDBACK: mesma lógica replicada em workers/indexer.worker.js.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.6 — LISTA VIRTUALIZADA ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Renderiza em chunks de 40 itens. Scroll infinito. Debounce na busca.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renderiza a lista de compostos. Se reset=true, limpa e reinicia do zero.
   */
  function renderizarListaCompostos(reset) {
    if (reset === undefined) reset = true;
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;

    if (reset) {
      listContainer.innerHTML = '';
      STATE.currentRenderedIndex = 0;
      listContainer.scrollTop = 0;
    }

    const fatia = STATE.compostosFiltrados.slice(
      STATE.currentRenderedIndex,
      STATE.currentRenderedIndex + ITEMS_PER_CHUNK
    );

    if (fatia.length === 0 && reset) {
      listContainer.innerHTML =
        '<div style="padding:24px; color:#64748b; text-align:center; font-size:0.75rem;">Nenhum composto localizado.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    fatia.forEach(function (comp) {
      const isFav = STATE.favoritos.has(comp.id);
      const isUnstable = comp.unstable === true;
      const isCustom = comp.categoria === 'custom';
      const isSelected = STATE.compostoSelecionado && STATE.compostoSelecionado.id === comp.id;

      const itemEl = document.createElement('div');
      itemEl.className = 'compound-item' +
        (isSelected ? ' selected' : '') +
        (isUnstable ? ' unstable' : '');

      itemEl.onclick = function () {
        selecionarCompostoStudio(comp, itemEl);
      };

      const massaDisplay = comp.molarMass !== '--' && comp.molarMass
        ? parseFloat(comp.molarMass).toFixed(1)
        : '--';

      itemEl.innerHTML =
        (isFav ? '<span class="comp-favorite-star">★</span>' : '') +
        (isUnstable ? '<span class="comp-unstable-flag" title="Estrutura instável">⚠️</span>' : '') +
        '<div class="comp-info-main">' +
          '<span class="comp-name" title="' + comp.nome + '">' +
            (isCustom ? '🧬 ' : '') + comp.nome +
          '</span>' +
          '<span class="comp-formula">' + comp.formula + '</span>' +
        '</div>' +
        '<span class="comp-badge-mass">' + massaDisplay + '</span>';

      fragment.appendChild(itemEl);
    });

    listContainer.appendChild(fragment);
    STATE.currentRenderedIndex += fatia.length;

    const countEl = document.getElementById('studioFilteredCount');
    if (countEl) countEl.textContent = STATE.compostosFiltrados.length + ' compostos visíveis';
  }
  // ››› FIM: renderizarListaCompostos(reset) — render em chunks de 40.
  // ››› FEEDBACK: usa DocumentFragment para evitar reflow por item.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler de scroll da lista. Carrega próximo chunk a 70px do final.
   */
  window.handleStudioScroll = function () {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;
    const limite = listContainer.scrollHeight - listContainer.clientHeight - 70;
    if (listContainer.scrollTop >= limite) {
      if (STATE.currentRenderedIndex < STATE.compostosFiltrados.length) {
        renderizarListaCompostos(false);
      }
    }
  };
  // ››› FIM: handleStudioScroll() — scroll infinito com margem de 70px.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do input de busca. Debounce 120ms. Filtra por nome/fórmula/SMILES + categoria.
   */
  window.filtrarCompostosStudio = function (termo) {
    clearTimeout(STATE.debounceBuscaTimer);
    STATE.debounceBuscaTimer = setTimeout(function () {
      const q = (termo || '').trim().toLowerCase();
      const catAtivaEl = document.querySelector('.category-pill.active');
      const cat = catAtivaEl ? catAtivaEl.dataset.cat : 'todas';

      STATE.compostosFiltrados = STATE.compostosIndexados.filter(function (c) {
        const mQ =
          c.nome.toLowerCase().indexOf(q) >= 0 ||
          (c.formula || '').toLowerCase().indexOf(q) >= 0 ||
          (c.smiles || '').toLowerCase().indexOf(q) >= 0;
        const mC =
          cat === 'todas' ||
          (cat === 'favoritos' && STATE.favoritos.has(c.id)) ||
          c.categoria === cat;
        return mQ && mC;
      });

      renderizarListaCompostos(true);
    }, 120);
  };
  // ››› FIM: filtrarCompostosStudio(termo) — busca com debounce.
  // ››› FEEDBACK: combina filtro textual + categoria ativa simultaneamente.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler dos filtros de categoria (pills).
   * @param {string} cat - 'todas' | 'favoritos' | 'farmacos' | 'custom' | ...
   */
  window.filtrarCategoriaStudio = function (cat) {
    document.querySelectorAll('.category-pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    const input = document.getElementById('studioSearchInput');
    const q = (input ? input.value : '').trim().toLowerCase();
    STATE.compostosFiltrados = STATE.compostosIndexados.filter(function (c) {
      const mC =
        cat === 'todas' ||
        (cat === 'favoritos' && STATE.favoritos.has(c.id)) ||
        c.categoria === cat;
      const mQ =
        !q ||
        c.nome.toLowerCase().indexOf(q) >= 0 ||
        (c.formula || '').toLowerCase().indexOf(q) >= 0 ||
        (c.smiles || '').toLowerCase().indexOf(q) >= 0;
      return mC && mQ;
    });
    renderizarListaCompostos(true);
    salvarPreferencias();
  };
  // ››› FIM: filtrarCategoriaStudio(cat) — filtro por categoria.
  // ››› FEEDBACK: preserva termo de busca ativo ao trocar categoria.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.1 — ENGINE (RDKit WASM + OpenChemLib) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Gerencia carregamento dos dois motores químicos.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega RDKit WASM sob demanda. Estratégia híbrida: tenta local (vendor/rdkit/)
   * e cai automaticamente para CDN unpkg se o local falhar.
   */
  function carregarRDKitSobDemanda() {
    if (STATE.RDKitModuleInstance) return Promise.resolve(STATE.RDKitModuleInstance);
    if (STATE.rdkitFalhou) return Promise.resolve(null);
    if (STATE.rdkitPromise) return STATE.rdkitPromise;

    STATE.rdkitPromise = new Promise(function (resolve) {
      exibirStatusRDKit(true, 'Carregando RDKit WASM...');
      console.log('[RDKit] Iniciando carregamento...');

      const timeout = function (ms) {
        return new Promise(function (_, rej) {
          setTimeout(function () { rej(new Error('Timeout ' + ms + 'ms')); }, ms);
        });
      };

      async function tentarInit() {
        if (typeof window.initRDKitModule !== 'function') {
          throw new Error('initRDKitModule ausente');
        }
        const config = {
          locateFile: function (file) {
            return 'vendor/rdkit/' + file;
          }
        };
        const mod = await Promise.race([
          window.initRDKitModule(config),
          timeout(25000)
        ]);
        if (!mod || typeof mod.get_mol !== 'function') {
          throw new Error('Módulo RDKit inválido');
        }
        return mod;
      }

      tentarInit()
        .then(function (mod) {
          STATE.RDKitModuleInstance = mod;
          console.log('[RDKit] ✅ Carregado localmente');
          exibirStatusRDKit(false);
          mostrarNotificacao('✅ RDKit ativo', 'success', 2000);
          resolve(mod);
        })
        .catch(function (err) {
          console.warn('[RDKit] ❌ Local falhou:', err.message);
          window.initRDKitModule({
            locateFile: function (file) {
              console.log('[RDKit] CDN fallback:', file);
              return 'https://unpkg.com/@rdkit/rdkit/dist/' + file;
            }
          })
            .then(function (mod) {
              STATE.RDKitModuleInstance = mod;
              console.log('[RDKit] ✅ Carregado via CDN');
              exibirStatusRDKit(false);
              resolve(mod);
            })
            .catch(function (err2) {
              console.warn('[RDKit] ❌ CDN falhou:', err2.message);
              STATE.rdkitFalhou = true;
              exibirStatusRDKit(false);
              mostrarNotificacao('⚠️ RDKit offline — funcionalidades limitadas', 'warning', 5000);
              resolve(null);
            });
        });
    });

    return STATE.rdkitPromise;
  }
  // ››› FIM: carregarRDKitSobDemanda() — loader RDKit com fallback local→CDN.
  // ››› FEEDBACK: guarda promessa para evitar cargas concorrentes.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detecta disponibilidade do OpenChemLib (carregado via <script>).
   */
  function carregarOCL() {
    if (STATE.OCLDisponivel) return true;
    if (typeof window.OCL !== 'undefined' && window.OCL.Molecule) {
      STATE.OCLDisponivel = true;
      console.log('[OCL] ✅ OpenChemLib disponível');
      return true;
    }
    console.warn('[OCL] ❌ OpenChemLib não carregado');
    return false;
  }
  // ››› FIM: carregarOCL() — verifica disponibilidade do OpenChemLib.
  // ››› FEEDBACK: OCL é sempre carregado via <script> no HTML; aqui só valida.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exibe/oculta o indicador de status RDKit no canvas.
   */
  function exibirStatusRDKit(visivel, texto) {
    texto = texto || '';
    const ind = document.getElementById('rdkitIndicator');
    const txt = document.getElementById('rdkitIndicatorText');
    if (txt) txt.textContent = texto;
    if (ind) ind.style.display = visivel ? 'flex' : 'none';
  }
  // ››› FIM: exibirStatusRDKit() — mostra spinner no canto superior direito.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera coordenadas 3D usando OpenChemLib (puro JS, sempre disponível).
   * Retorna SDF (molfile + terminador) ou null se falhar.
   */
  function gerar3DComOCL(smiles) {
    if (!carregarOCL()) return null;
    try {
      const mol = OCL.Molecule.fromSmiles(smiles);
      if (!mol) return null;

      const gen = new OCL.ConformerGenerator(0);
      const conformer = gen.getOneConformerAsMolecule(mol);
      if (!conformer) return null;

      let molfile = conformer.toMolfile();
      if (!molfile || molfile.length < 50) return null;
      if (molfile.indexOf('M  END') < 0) return null;

      return molfile + '\n$$$$\n';
    } catch (e) {
      console.warn('[OCL] Falha:', e.message);
      return null;
    }
  }
  // ››› FIM: gerar3DComOCL(smiles) — geração 3D local via OpenChemLib.
  // ››› FEEDBACK: puro JavaScript, não depende de WASM — é o motor mais confiável.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.2 — CHEMINFO (Quimiometria) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Extração de componente principal, descritores, avaliação de drug-likeness.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrai componente principal de um SMILES multi-componente.
   * Remove contra-íons comuns (Na+, K+, Cl-, etc.).
   */
  function extrairSmilesPrincipal(smiles) {
    if (!smiles || smiles === '--') return null;
    if (smiles.indexOf('RADICAL_') === 0) return null;
    if (smiles.indexOf('.') < 0) return smiles;
    const partes = smiles.split('.').filter(function (p) {
      return p && p.length > 1 && !/^\[(Na|K|Li|Ca|Mg|Cl|Br|NH4)[+-]?\]$/.test(p);
    });
    if (partes.length === 0) return null;
    return partes.sort(function (a, b) { return b.length - a.length; })[0];
  }
  // ››› FIM: extrairSmilesPrincipal(smiles) — separa sal em componente principal.
  // ››› FEEDBACK: pega o fragmento mais longo; remove metais/haletos isolados.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula propriedades moleculares via RDKit com fallback heurístico.
   */
  async function calcularPropriedadesMoleculares(smiles, molarMass) {
    const rdkit = await carregarRDKitSobDemanda();
    const smilesLimpo = extrairSmilesPrincipal(smiles);

    if (!rdkit || !smilesLimpo) return calcularPropriedadesFallback(smiles, molarMass);

    try {
      const mol = rdkit.get_mol(smilesLimpo);
      if (!mol) return calcularPropriedadesFallback(smiles, molarMass);

      let desc = {};
      try { desc = JSON.parse(mol.get_descriptors()); } catch (e) {}

      const mw = (typeof molarMass === 'number' && molarMass > 0)
        ? molarMass
        : (desc.exactmw || desc.amw || 0);
      const logp = desc.CrippenClogP !== undefined ? desc.CrippenClogP : (desc.clogp || 0);
      const mr = desc.CrippenMR !== undefined ? desc.CrippenMR : 0;
      const tpsa = desc.tpsa !== undefined ? desc.tpsa : 0;
      const hbd = desc.lipinskiHBD !== undefined ? desc.lipinskiHBD : (desc.NumHBD || 0);
      const hba = desc.lipinskiHBA !== undefined ? desc.lipinskiHBA : (desc.NumHBA || 0);
      const rotb = desc.NumRotatableBonds !== undefined ? desc.NumRotatableBonds : 0;
      const heavyAtoms = desc.NumHeavyAtoms !== undefined ? desc.NumHeavyAtoms : 0;
      const csp3 = desc.FractionCSP3 !== undefined ? desc.FractionCSP3 : 0;

      let totalAtoms = heavyAtoms;
      try {
        const mh = rdkit.get_mol(smilesLimpo);
        if (mh) { mh.add_hs(); totalAtoms = mh.get_num_atoms(); mh.delete(); }
      } catch (e) {}

      const alertasPAINS = [];
      for (let i = 0; i < PAINS_SUBSTRUCTURES.length; i++) {
        const p = PAINS_SUBSTRUCTURES[i];
        try {
          const q = rdkit.get_qmol(p.smarts);
          if (!q) continue;
          const matchStr = mol.get_substruct_match(q);
          q.delete();
          if (matchStr && matchStr !== '{}' && matchStr !== '' && matchStr.indexOf('atoms') >= 0) {
            alertasPAINS.push(p);
          }
        } catch (e) {}
      }
      mol.delete();

      const fl = [], fv = [], fg = [];
      if (mw > 500) fl.push('MW>500');
      if (logp > 5) fl.push('LogP>5');
      if (hbd > 5) fl.push('HBD>5');
      if (hba > 10) fl.push('HBA>10');
      if (rotb > 10) fv.push('RotB>10');
      if (tpsa > 140) fv.push('TPSA>140');
      if (mw < 160 || mw > 480) fg.push('MW');
      if (logp < -0.4 || logp > 5.6) fg.push('LogP');
      if (mr < 40 || mr > 130) fg.push('MR');
      if (totalAtoms < 20 || totalAtoms > 70) fg.push('Atoms');

      return {
        mw: mw, logp: logp, mr: mr, tpsa: tpsa,
        hbd: hbd, hba: hba, rotb: rotb,
        heavyAtoms: heavyAtoms, totalAtoms: totalAtoms, csp3: csp3,
        falhasLipinski: fl, falhasVeber: fv, falhasGhose: fg,
        alertasPAINS: alertasPAINS
      };
    } catch (e) {
      return calcularPropriedadesFallback(smiles, molarMass);
    }
  }
  // ››› FIM: calcularPropriedadesMoleculares() — descritores via RDKit.
  // ››› FEEDBACK: cai em fallback heurístico se RDKit indisponível ou SMILES inválido.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fallback heurístico quando RDKit indisponível. Conta átomos por regex.
   */
  function calcularPropriedadesFallback(smiles, molarMass) {
    const sL = extrairSmilesPrincipal(smiles);
    if (!sL) return null;
    const s = sL;
    const cCount = (s.match(/C(?![a-z])/g) || []).length;
    const nCount = (s.match(/N(?![a-z])/g) || []).length;
    const oCount = (s.match(/O(?![a-z])/g) || []).length;
    const sCount = (s.match(/S(?![a-z])/g) || []).length;
    const halCount = (s.match(/(F|Cl|Br|I)/g) || []).length;
    const rotB = (s.match(/-/g) || []).length;

    const mw = (typeof molarMass === 'number' && molarMass > 0)
      ? molarMass
      : cCount * 12 + nCount * 14 + oCount * 16 + sCount * 32 + halCount * 35;
    const logp = (cCount - nCount - oCount) * 0.5 + halCount * 0.8;
    const tpsa = (nCount + oCount * 2) * 12;

    return {
      mw: mw,
      logp: Math.round(logp * 100) / 100,
      mr: cCount * 5,
      tpsa: tpsa,
      hbd: nCount + oCount,
      hba: nCount + oCount,
      rotb: rotB,
      heavyAtoms: cCount + nCount + oCount + sCount + halCount,
      totalAtoms: cCount + nCount + oCount + sCount + halCount,
      csp3: 0.4,
      falhasLipinski: mw > 500 ? ['MW>500'] : [],
      falhasVeber: tpsa > 140 ? ['TPSA>140'] : [],
      falhasGhose: [],
      alertasPAINS: [],
      _fallback: true
    };
  }
  // ››› FIM: calcularPropriedadesFallback() — estimativas grosseiras sem RDKit.
  // ››› FEEDBACK: marcado com _fallback para indicar "valores estimados" nos badges.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Avalia quimiometria completa (Lipinski, Veber, Ghose, PAINS) e atualiza
   * os badges do HUD inferior.
   */
  async function avaliarQuimiometriaCompleta(smiles, molarMass, nome) {
    const bL = document.getElementById('badgeLipinski');
    const bV = document.getElementById('badgeVeber');
    const bG = document.getElementById('badgeGhose');
    const bP = document.getElementById('badgePAINS');
    if (!bL || !bV || !bG || !bP) return;

    if (!smiles || smiles === '--') {
      [bL, bV, bG, bP].forEach(function (b) { b.className = 'cadd-badge badge-pending'; });
      bL.textContent = 'L: N/A';
      bV.textContent = 'V: N/A';
      bG.textContent = 'G: N/A';
      bP.textContent = 'P: N/A';
      STATE.ultimoDossieCADD = null;
      return;
    }

    const p = await calcularPropriedadesMoleculares(smiles, molarMass);
    if (!p) {
      [bL, bV, bG, bP].forEach(function (b) { b.className = 'cadd-badge badge-pending'; });
      return;
    }

    const est = p._fallback ? '·e' : '';

    bL.className = 'cadd-badge ' + (p.falhasLipinski.length === 0 ? 'badge-approved' : p.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected');
    bL.textContent = (p.falhasLipinski.length === 0 ? 'L: OK' : 'L: ' + p.falhasLipinski.length) + est;

    bV.className = 'cadd-badge ' + (p.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected');
    bV.textContent = (p.falhasVeber.length === 0 ? 'V: OK' : 'V: ' + p.falhasVeber.length) + est;

    bG.className = 'cadd-badge ' + (p.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected');
    bG.textContent = (p.falhasGhose.length === 0 ? 'G: OK' : 'G: ' + p.falhasGhose.length) + est;

    bP.className = 'cadd-badge ' + (p.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected');
    bP.textContent = (p.alertasPAINS.length === 0 ? 'P: OK' : 'P: ' + p.alertasPAINS.length) + est;

    STATE.ultimoDossieCADD = Object.assign({}, p, { nome: nome, smiles: smiles });
  }
  // ››› FIM: avaliarQuimiometriaCompleta() — atualiza badges + guarda dossiê.
  // ››› FEEDBACK: sufixo '·e' indica valores estimados (fallback heurístico).
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.3 — ATOM (Inspeção Atômica) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Ao clicar em um átomo no 3D, mostra HUD com dados do elemento.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seleciona e inspeciona átomo clicado no 3D.
   */
  function selecionarEInspecionarAtomo(atom) {
    if (!STATE.studioViewer || !atom) return;
    STATE.atomoAtivoInspecionado = atom;

    try {
      if (STATE.atomHighlightShape) STATE.studioViewer.removeShape(STATE.atomHighlightShape);
      STATE.atomHighlightShape = STATE.studioViewer.addSphere({
        center: { x: atom.x, y: atom.y, z: atom.z },
        radius: 0.42, color: '#00e5ff', opacity: 0.55
      });
      STATE.studioViewer.render();
    } catch (e) {}

    const sym = (atom.elem || 'C').toUpperCase();
    const ed = TABELA_PERIODICA.find(function (e) { return e.sym.toUpperCase() === sym; })
      || { z: '?', sym: sym, nome: 'Elemento', massa: '--', eletron: '--', raio: '--', valencias: [1] };

    const viz = [];
    const nLig = atom.bonds ? atom.bonds.length : 0;
    if (atom.bonds && Array.isArray(atom.bonds)) {
      const all = STATE.studioViewer.selectedAtoms({}) || [];
      atom.bonds.forEach(function (bIdx) {
        const v = all.find(function (a) { return a.serial === bIdx || a.index === bIdx; });
        if (v) viz.push(v.elem + '#' + ((v.serial || v.index || 0) + 1));
      });
    }

    const hud = document.getElementById('atomInspectorHud');
    if (hud) {
      document.getElementById('hudAtomBadge').textContent = ed.sym;
      document.getElementById('hudAtomTitle').textContent =
        ed.nome + ' (' + ed.sym + ') — #' + ((atom.serial || atom.index || 0) + 1);
      document.getElementById('hudAtomSub').textContent =
        '(' + atom.x.toFixed(2) + ', ' + atom.y.toFixed(2) + ', ' + atom.z.toFixed(2) + ') • ' + nLig + ' lig.';
      document.getElementById('hudAtomEletron').textContent = ed.eletron ? String(ed.eletron) : 'Inerte';
      document.getElementById('hudAtomRaio').textContent = ed.raio ? ed.raio + ' pm' : '--';
      document.getElementById('hudAtomNeighbors').textContent = viz.length > 0 ? viz.join(', ') : 'Isolado';
      hud.style.display = 'flex';
    }

    const l = document.getElementById('studioLastMeasurement');
    if (l) l.textContent = ed.nome + ' (' + ed.sym + ') • ' + nLig + ' ligações';
  }
  // ››› FIM: selecionarEInspecionarAtomo(atom) — HUD atômico com propriedades.
  // ››› FEEDBACK: adiciona esfera destacada ciano sobre o átomo clicado.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o HUD do inspetor atômico e remove o destaque visual.
   */
  window.fecharInspectorAtomo = function () {
    const hud = document.getElementById('atomInspectorHud');
    if (hud) hud.style.display = 'none';
    if (STATE.studioViewer && STATE.atomHighlightShape) {
      try {
        STATE.studioViewer.removeShape(STATE.atomHighlightShape);
        STATE.atomHighlightShape = null;
        STATE.studioViewer.render();
      } catch (e) {}
    }
  };
  // ››› FIM: fecharInspectorAtomo() — limpa HUD + esfera de destaque.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre a tabela periódica contextualizada ao átomo inspecionado.
   */
  window.substituirAtomoClicadoViaTabela = function () {
    if (!STATE.atomoAtivoInspecionado) return;
    window.abrirTabelaPeriodica(STATE.atomoAtivoInspecionado);
  };
  // ››› FIM: substituirAtomoClicadoViaTabela() — atalho para abrir tabela no átomo atual.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.4 — SDF (Parse, Reconstrução, Geometria) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Utilitários de manipulação de arquivos SDF (formato V2000).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse de SDF simples (V2000) — extrai átomos, ligações e linhas originais.
   */
  function parseSDF_Simples(sdfText) {
    if (!sdfText || typeof sdfText !== 'string') return null;
    const linhas = sdfText.split('\n');
    if (linhas.length < 5) return null;

    const countsLine = linhas[3];
    const numAtoms = parseInt(countsLine.substring(0, 3).trim());
    const numBonds = parseInt(countsLine.substring(3, 6).trim());
    if (isNaN(numAtoms) || isNaN(numBonds)) return null;

    const atoms = [];
    for (let i = 0; i < numAtoms; i++) {
      const l = linhas[4 + i];
      if (!l || l.length < 34) return null;
      atoms.push({
        x: parseFloat(l.substring(0, 10)),
        y: parseFloat(l.substring(10, 20)),
        z: parseFloat(l.substring(20, 30)),
        elem: l.substring(31, 34).trim()
      });
    }

    const bonds = [];
    for (let i = 0; i < numBonds; i++) {
      const l = linhas[4 + numAtoms + i];
      if (!l || l.length < 9) return null;
      bonds.push({
        a1: parseInt(l.substring(0, 3).trim()),
        a2: parseInt(l.substring(3, 6).trim()),
        tipo: parseInt(l.substring(6, 9).trim()) || 1
      });
    }

    return { atoms: atoms, bonds: bonds, numAtoms: numAtoms, numBonds: numBonds, linhas: linhas };
  }
  // ››› FIM: parseSDF_Simples() — extrai estrutura de bloco SDF V2000.
  // ››› FEEDBACK: assume formato padrão V2000 com coordenadas em colunas 0-30.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reconstrói string SDF a partir de átomos/ligações modificados.
   */
  function reconstruirSDF(parsed, atoms, bonds, marcarInstavel) {
    const L = [];
    L.push(parsed.linhas[0] || 'LAIFT-MODIFIED');
    L.push(parsed.linhas[1] || '  LAIFT 3D EDITOR');
    L.push(parsed.linhas[2] || '');
    L.push(
      String(atoms.length).padStart(3, ' ') +
      String(bonds.length).padStart(3, ' ') +
      '  0  0  0  0  0  0  0  0999 V2000'
    );

    atoms.forEach(function (a) {
      const x = a.x.toFixed(4).padStart(10, ' ');
      const y = a.y.toFixed(4).padStart(10, ' ');
      const z = a.z.toFixed(4).padStart(10, ' ');
      const el = (a.elem || 'C').padEnd(3, ' ').substring(0, 3);
      L.push(x + y + z + ' ' + el + ' 0  0  0  0  0  0  0  0  0  0  0  0');
    });

    bonds.forEach(function (b) {
      L.push(
        String(b.a1).padStart(3, ' ') +
        String(b.a2).padStart(3, ' ') +
        String(b.tipo || 1).padStart(3, ' ') +
        '  0  0  0  0'
      );
    });

    L.push('M  END');
    if (marcarInstavel) {
      L.push('>  <INSTABILITY>');
      L.push('Valência estendida');
      L.push('');
    }
    L.push('$$$$');
    return L.join('\n');
  }
  // ››› FIM: reconstruirSDF() — serializa estrutura modificada para SDF V2000.
  // ››› FEEDBACK: se marcarInstavel=true, adiciona tag <INSTABILITY> no bloco de dados.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula posição 3D para novo átomo ligado a um pai existente.
   * Usa direção oposta à média dos vizinhos (1.5 Å).
   */
  function calcularPosicaoNovoAtomo(parent, vizinhos) {
    const BL = 1.5;
    if (!vizinhos || vizinhos.length === 0) {
      return { x: parent.x + BL, y: parent.y, z: parent.z };
    }
    let sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < vizinhos.length; i++) {
      const v = vizinhos[i];
      sx += (v.x - parent.x);
      sy += (v.y - parent.y);
      sz += (v.z - parent.z);
    }
    const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);
    if (mag < 0.01) return { x: parent.x + BL, y: parent.y, z: parent.z };
    return {
      x: parent.x + (-sx / mag) * BL,
      y: parent.y + (-sy / mag) * BL,
      z: parent.z + (-sz / mag) * BL
    };
  }
  // ››› FIM: calcularPosicaoNovoAtomo() — geometria simples para adição.
  // ››› FEEDBACK: heurística oposta aos vizinhos; para maior rigor, usar force field.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.5 — PTABLE UI (Tabela Periódica) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Renderização da grade 18×9, filtros por família, dossiê lateral e ações
  // de substituição/adição atômica.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre o modal da tabela periódica, opcionalmente contextualizado a um átomo.
   */
  window.abrirTabelaPeriodica = function (atomoContexto) {
    if (atomoContexto) STATE.atomoAtivoInspecionado = atomoContexto;
    const modal = document.getElementById('periodicTableModal');
    const matrix = document.getElementById('ptableMatrix');
    const sub = document.getElementById('ptableSubHeader');
    if (!modal || !matrix) return;

    if (sub) {
      if (STATE.atomoAtivoInspecionado) {
        const nLig = STATE.atomoAtivoInspecionado.bonds ? STATE.atomoAtivoInspecionado.bonds.length : 0;
        sub.innerHTML = 'Âncora: <strong>' + STATE.atomoAtivoInspecionado.elem + '#' +
          ((STATE.atomoAtivoInspecionado.serial || STATE.atomoAtivoInspecionado.index || 0) + 1) +
          '</strong> (' + nLig + ' lig.)';
      } else {
        sub.textContent = 'Clique em um elemento para análise.';
      }
    }

    renderizarMatrizTabelaPeriodica('todas');

    if (STATE.atomoAtivoInspecionado) {
      const eM = TABELA_PERIODICA.find(function (e) {
        return e.sym.toUpperCase() === (STATE.atomoAtivoInspecionado.elem || '').toUpperCase();
      });
      if (eM) selecionarElementoNaTabela(eM);
    } else {
      const c = TABELA_PERIODICA.find(function (e) { return e.sym === 'C'; });
      if (c) selecionarElementoNaTabela(c);
    }

    modal.style.display = 'flex';
  };
  // ››› FIM: abrirTabelaPeriodica() — exibe modal com contexto opcional.
  // ››› FEEDBACK: se átomo passado, pré-seleciona o elemento correspondente.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o modal da tabela periódica.
   */
  window.fecharTabelaPeriodica = function () {
    const m = document.getElementById('periodicTableModal');
    if (m) m.style.display = 'none';
  };
  // ››› FIM: fecharTabelaPeriodica() — apenas oculta o modal.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Filtro por família química (nao-metal, halogenio, etc.).
   */
  window.filtrarElementosPTable = function (cat) {
    document.querySelectorAll('.ptable-pill').forEach(function (b) {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderizarMatrizTabelaPeriodica(cat);
  };
  // ››› FIM: filtrarElementosPTable(cat) — destaca pill + re-renderiza matriz.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renderiza a matriz 18×9 da tabela periódica com todos os 118 elementos.
   * Elementos incompatíveis com o átomo ativo são esmaecidos.
   */
  function renderizarMatrizTabelaPeriodica(filtroCat) {
    const matrix = document.getElementById('ptableMatrix');
    if (!matrix) return;
    matrix.innerHTML = '';

    const nLigAlvo = STATE.atomoAtivoInspecionado && STATE.atomoAtivoInspecionado.bonds
      ? STATE.atomoAtivoInspecionado.bonds.length
      : null;

    // Placeholders para lantanídeos/actinídeos
    const mkP = function (txt, r, c) {
      const el = document.createElement('div');
      el.className = 'ptable-tile ptable-placeholder';
      el.style.gridRow = r;
      el.style.gridColumn = c;
      el.textContent = txt;
      matrix.appendChild(el);
    };
    mkP('57-71', 6, 3);
    mkP('89-103', 7, 3);

    TABELA_PERIODICA.forEach(function (elem) {
      const pos = POSICOES_PTABLE[elem.sym];
      if (!pos) return;

      const tile = document.createElement('div');
      tile.className = 'ptable-tile cat-' + elem.cat;
      tile.style.gridRow = pos.r;
      tile.style.gridColumn = pos.c;

      if (nLigAlvo !== null) {
        const valMax = Math.max.apply(null, elem.valencias);
        tile.classList.add((nLigAlvo <= valMax && valMax > 0) ? 'compatible' : 'incompatible');
      }
      if (filtroCat !== 'todas' && elem.cat !== filtroCat) tile.style.opacity = '0.15';
      if (STATE.elementoPTableSelecionado && STATE.elementoPTableSelecionado.sym === elem.sym) {
        tile.classList.add('selected');
      }

      tile.onclick = function () { selecionarElementoNaTabela(elem, tile); };
      tile.title = elem.nome + ' (Z=' + elem.z + ')';

      const mt = elem.massa < 100 ? elem.massa.toFixed(1) : Math.round(elem.massa);
      tile.innerHTML =
        '<span class="ptable-z">' + elem.z + '</span>' +
        '<span class="ptable-sym">' + elem.sym + '</span>' +
        '<span class="ptable-mass">' + mt + '</span>';

      matrix.appendChild(tile);
    });
  }
  // ››› FIM: renderizarMatrizTabelaPeriodica() — desenha 118 tiles na grade.
  // ››› FEEDBACK: adiciona classes compatible/incompatible conforme valência disponível.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seleciona um elemento e atualiza a sidebar com dossiê + ações.
   */
  function selecionarElementoNaTabela(elem, tileEl) {
    STATE.elementoPTableSelecionado = elem;
    document.querySelectorAll('.ptable-tile').forEach(function (t) { t.classList.remove('selected'); });
    if (tileEl) tileEl.classList.add('selected');

    const sidebar = document.getElementById('ptableDetailContent');
    if (!sidebar) return;

    const nLigAlvo = STATE.atomoAtivoInspecionado && STATE.atomoAtivoInspecionado.bonds
      ? STATE.atomoAtivoInspecionado.bonds.length
      : null;

    let htmlVal = '', podeSubst = false;

    if (STATE.atomoAtivoInspecionado && nLigAlvo !== null) {
      const valMax = Math.max.apply(null, elem.valencias);
      if (elem.sym === STATE.atomoAtivoInspecionado.elem) {
        htmlVal = '<div class="ptable-valence-check valence-valid">ℹ️ Já é <strong>' + elem.nome + '</strong>.</div>';
      } else if (valMax === 0) {
        htmlVal = '<div class="ptable-valence-check valence-invalid">⚠️ Gás nobre — sem ligações covalentes estáveis.</div>';
      } else if (nLigAlvo > valMax) {
        htmlVal = '<div class="ptable-valence-check valence-invalid">⚠️ <strong>Valência excedida:</strong> ' +
          nLigAlvo + ' > ' + valMax + '.</div>';
      } else {
        podeSubst = true;
        htmlVal = '<div class="ptable-valence-check valence-valid">✅ <strong>Compatível:</strong> comporta ' +
          nLigAlvo + ' ligações.</div>';
      }
    } else {
      htmlVal = '<div class="ptable-valence-check" style="background:rgba(255,255,255,0.04); color:#94a3b8;">Clique em um átomo no 3D para ativar.</div>';
    }

    let htmlDiagAdd = '';
    if (STATE.atomoAtivoInspecionado) htmlDiagAdd = renderizarDiagnosticoAdicao(elem);

    sidebar.innerHTML =
      '<div class="ptable-hero-card">' +
        '<div class="ptable-hero-badge">' +
          '<span class="hero-z">' + elem.z + '</span>' +
          '<span class="hero-sym">' + elem.sym + '</span>' +
        '</div>' +
        '<div class="ptable-hero-info">' +
          '<span class="ptable-hero-name">' + elem.nome + '</span>' +
          '<span class="ptable-hero-family">' + elem.cat.replace(/-/g, ' ') + ' • G' + elem.grupo + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="ptable-params-list">' +
        '<div class="ptable-param-row"><span>Z:</span><strong>' + elem.z + '</strong></div>' +
        '<div class="ptable-param-row"><span>Massa:</span><strong>' + elem.massa + ' g/mol</strong></div>' +
        '<div class="ptable-param-row"><span>Eletroneg.:</span><strong>' + (elem.eletron || 'Inerte') + '</strong></div>' +
        '<div class="ptable-param-row"><span>Raio:</span><strong>' + (elem.raio ? elem.raio + ' pm' : '--') + '</strong></div>' +
        '<div class="ptable-param-row"><span>Valências:</span><strong>' + elem.valencias.join(', ') + '</strong></div>' +
      '</div>' +
      '<div class="ptable-pharma-box"><strong style="color:var(--neon-cyan); display:block; margin-bottom:3px;">Química Medicinal:</strong>' + elem.pharma + '</div>' +
      htmlVal +
      (STATE.atomoAtivoInspecionado
        ? '<div class="ptable-action-buttons">' +
            '<button class="btn-execute-atom-swap" ' + (!podeSubst ? 'disabled' : '') +
              ' onclick="window.executarSubstituicaoElementar(\'' + elem.sym + '\')">⚡ Substituir</button>' +
            '<button class="btn-execute-atom-add" onclick="window.executarAdicaoAtomo(\'' + elem.sym + '\')">➕ Adicionar</button>' +
          '</div>' + htmlDiagAdd
        : '');
  }
  // ››› FIM: selecionarElementoNaTabela() — atualiza sidebar com dossiê do elemento.
  // ››› FEEDBACK: mostra validação de valência + botões de ação se átomo ativo.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renderiza diagnóstico de adição (valência livre, H removível, radical).
   */
  function renderizarDiagnosticoAdicao(elemAlvo) {
    if (!STATE.atomoAtivoInspecionado || !STATE.sdfCacheLocal) return '';
    const parsed = parseSDF_Simples(STATE.sdfCacheLocal);
    if (!parsed) return '';

    const parentIdx = STATE.atomoAtivoInspecionado.index !== undefined
      ? STATE.atomoAtivoInspecionado.index
      : (STATE.atomoAtivoInspecionado.serial - 1);

    const parent = parsed.atoms[parentIdx];
    if (!parent) return '';

    const bonds = parsed.bonds.filter(function (b) {
      return b.a1 === parentIdx + 1 || b.a2 === parentIdx + 1;
    });
    const eP = TABELA_PERIODICA.find(function (e) { return e.sym === parent.elem; });
    const valP = eP ? Math.max.apply(null, eP.valencias) : 4;
    const disp = valP - bonds.length;
    const temH = bonds.some(function (b) {
      const idx = b.a1 === parentIdx + 1 ? b.a2 - 1 : b.a1 - 1;
      return parsed.atoms[idx] && parsed.atoms[idx].elem === 'H';
    });

    let h = '<div class="ptable-add-diagnostic">' +
      '<div class="diag-row"><span>Conexões livres:</span><strong>' + Math.max(0, disp) + ' de ' + valP + '</strong></div>';

    if (disp > 0) {
      h += '<div class="diag-status diag-ok">✅ Adição direta possível.</div>';
    } else if (temH) {
      h += '<div class="diag-status diag-warning">⚠️ Saturado — H será removido automaticamente.</div>';
    } else {
      h += '<div class="diag-status diag-error">⚠️ Saturado sem H — gerará radical livre.</div>';
    }
    h += '</div>';
    return h;
  }
  // ››› FIM: renderizarDiagnosticoAdicao() — informa viabilidade da adição.
  // ››› FEEDBACK: três estados — ok / remover H / gerar radical.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.6 — EDIT (Substituição e Adição) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Modifica a estrutura molecular trocando ou adicionando átomos.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Substitui átomo ativo por outro elemento.
   * Valida via RDKit que a nova estrutura não é inválida.
   */
  window.executarSubstituicaoElementar = async function (novoSimbolo) {
  console.log('[EDIT-SUB] ▶ Início substituição:', novoSimbolo);

  // ─── Guarda 1: estado mínimo ────────────────────────────────────────
  if (!STATE.atomoAtivoInspecionado) {
    console.warn('[EDIT-SUB] ❌ Nenhum átomo foi clicado antes');
    mostrarNotificacao('Clique em um átomo no 3D antes de substituir.', 'warning', 4000);
    return;
  }
  if (!STATE.compostoSelecionado) {
    console.warn('[EDIT-SUB] ❌ Nenhum composto selecionado');
    mostrarNotificacao('Selecione um composto no painel lateral.', 'warning', 4000);
    return;
  }
  if (!STATE.sdfCacheLocal) {
    console.warn('[EDIT-SUB] ❌ SDF não carregado');
    mostrarNotificacao('Estrutura 3D ainda não foi carregada. Aguarde.', 'warning', 4000);
    return;
  }

  const elemAntigo = STATE.atomoAtivoInspecionado.elem;
  const atomIdx = STATE.atomoAtivoInspecionado.index !== undefined
    ? STATE.atomoAtivoInspecionado.index
    : (STATE.atomoAtivoInspecionado.serial - 1);

  console.log('[EDIT-SUB] Átomo:', elemAntigo, '#', atomIdx + 1, '(idx:', atomIdx + ')');

  // ─── Localiza linha do átomo no SDF ─────────────────────────────────
  const linhas = STATE.sdfCacheLocal.split('\n');
  let linhaIdx = -1, contador = 0;
  for (let i = 4; i < linhas.length; i++) {
    const l = linhas[i];
    if (l.indexOf('M  END') >= 0 || l.indexOf('$$$$') >= 0) break;
    if (l.length >= 31) {
      if (contador === atomIdx) { linhaIdx = i; break; }
      contador++;
    }
  }

  if (linhaIdx === -1) {
    console.error('[EDIT-SUB] ❌ Linha do átomo não encontrada no SDF');
    mostrarNotificacao('Não foi possível localizar o átomo no arquivo 3D.', 'error', 4000);
    return;
  }

  // ─── Substitui o símbolo do elemento na linha ───────────────────────
  const orig = linhas[linhaIdx];
  linhas[linhaIdx] = orig.substring(0, 31) + novoSimbolo.padEnd(3, ' ') + orig.substring(34);
  const novoSdf = linhas.join('\n');

  console.log('[EDIT-SUB] Linha original:  "' + orig.substring(31, 34) + '"');
  console.log('[EDIT-SUB] Linha modificada: "' + novoSimbolo + '"');

  // ─── Validação com RDKit (com fallback) ─────────────────────────────
  let novoSmiles = null;
  let rdkit = null;

  try {
    rdkit = await carregarRDKitSobDemanda();
  } catch (e) {
    console.warn('[EDIT-SUB] RDKit load falhou:', e.message);
  }

  if (rdkit) {
    try {
      const mol = rdkit.get_mol(novoSdf);
      if (mol) {
        novoSmiles = mol.get_smiles();
        mol.delete();
        console.log('[EDIT-SUB] ✅ RDKit validou. SMILES:', novoSmiles);
      } else {
        console.warn('[EDIT-SUB] ⚠️ RDKit rejeitou a estrutura (mol=null)');
        mostrarNotificacao(
          'Substituição ' + elemAntigo + '→' + novoSimbolo + ' cria valência inválida.',
          'error', 5000
        );
        return;
      }
    } catch (e) {
      console.warn('[EDIT-SUB] RDKit exceção:', e.message);
    }
  }

  if (!novoSmiles) {
    // RDKit offline ou não conseguiu gerar SMILES — aceita modificação mesmo assim
    console.warn('[EDIT-SUB] ⚠️ Sem validação RDKit — aceitando modificação não-validada');
    novoSmiles = 'EDIT_SUB_' + elemAntigo + '_' + novoSimbolo + '_' + Date.now();
    mostrarNotificacao('⚠️ Modificação aplicada sem validação (RDKit offline)', 'warning', 4000);
  }

  // ─── Snapshot para undo ─────────────────────────────────────────────
  pushEdicaoSnapshot(STATE.compostoSelecionado, STATE.sdfCacheLocal, 'Sub ' + elemAntigo + '→' + novoSimbolo);

  // ─── Cria novo composto ─────────────────────────────────────────────
  const idD = 'sub_' + Date.now();
  const nomeD = STATE.compostoSelecionado.nome + ' (' + elemAntigo + '→' + novoSimbolo + ')';
  const novoComp = {
    id: idD,
    chaveOriginal: idD,
    nome: nomeD,
    formula: 'Mod. Atômica',
    molarMass: '--',
    smiles: novoSmiles,
    categoria: 'custom',
    pubchemQuery: nomeD,
    sdfModificado: novoSdf
  };

  console.log('[EDIT-SUB] Criado composto:', nomeD);

  // ─── Insere no catálogo e seleciona ─────────────────────────────────
  STATE.compostosIndexados.unshift(novoComp);
  STATE.compostosFiltrados.unshift(novoComp);
  renderizarListaCompostos(true);
  selecionarCompostoStudio(novoComp);

  // ─── Fecha modais ───────────────────────────────────────────────────
  window.fecharTabelaPeriodica();
  window.fecharInspectorAtomo();

  console.log('[EDIT-SUB] ✅ Concluído');
  mostrarNotificacao('✅ ' + nomeD, 'success', 3500);
};
// ››› FIM: executarSubstituicaoElementar() — substituição com logging + fallback.
// ››› FEEDBACK v4.3: nunca falha em silêncio; aceita modificação sem RDKit;
//     toast em cada caminho de erro; console.log rastreável.
  /**
   * Adiciona novo átomo ao composto selecionado, ligado ao átomo ativo.
   * Regras: se valência livre → adiciona direto; se tem H → remove; se não → avisa.
   */
  window.executarAdicaoAtomo = async function (novoSimbolo) {
  console.log('[EDIT-ADD] ▶ Início adição:', novoSimbolo);

  // ─── Guarda 1: estado mínimo ────────────────────────────────────────
  if (!STATE.atomoAtivoInspecionado) {
    console.warn('[EDIT-ADD] ❌ Nenhum átomo foi clicado antes');
    mostrarNotificacao('Clique em um átomo no 3D antes de adicionar.', 'warning', 4000);
    return;
  }
  if (!STATE.compostoSelecionado) {
    console.warn('[EDIT-ADD] ❌ Nenhum composto selecionado');
    mostrarNotificacao('Selecione um composto no painel lateral.', 'warning', 4000);
    return;
  }
  if (!STATE.sdfCacheLocal) {
    console.warn('[EDIT-ADD] ❌ SDF não carregado');
    mostrarNotificacao('Estrutura 3D ainda não foi carregada. Aguarde.', 'warning', 4000);
    return;
  }

  const parsed = parseSDF_Simples(STATE.sdfCacheLocal);
  if (!parsed) {
    console.error('[EDIT-ADD] ❌ SDF inválido');
    mostrarNotificacao('Não foi possível interpretar o arquivo 3D.', 'error', 4000);
    return;
  }

  const parentIdx = STATE.atomoAtivoInspecionado.index !== undefined
    ? STATE.atomoAtivoInspecionado.index
    : (STATE.atomoAtivoInspecionado.serial - 1);

  if (parentIdx < 0 || parentIdx >= parsed.atoms.length) {
    console.error('[EDIT-ADD] ❌ Índice atômico inválido:', parentIdx);
    mostrarNotificacao('Índice do átomo âncora inválido.', 'error', 4000);
    return;
  }

  const parent = parsed.atoms[parentIdx];
  const eP = TABELA_PERIODICA.find(function (e) { return e.sym === parent.elem; });
  const valP = eP ? Math.max.apply(null, eP.valencias) : 4;
  const eN = TABELA_PERIODICA.find(function (e) { return e.sym === novoSimbolo; });

  if (!eN) {
    console.error('[EDIT-ADD] ❌ Elemento inválido:', novoSimbolo);
    mostrarNotificacao('Elemento desconhecido.', 'error');
    return;
  }

  console.log('[EDIT-ADD] Pai:', parent.elem, '#', parentIdx + 1,
              '| Valência máx:', valP,
              '| Novo:', novoSimbolo);

  const bondsP = parsed.bonds.filter(function (b) {
    return b.a1 === parentIdx + 1 || b.a2 === parentIdx + 1;
  });
  const nLig = bondsP.length;

  let acao = 'direto';
  let hIdxRem = -1;
  let instavel = false;

  if (nLig >= valP) {
    for (let i = 0; i < bondsP.length; i++) {
      const b = bondsP[i];
      const vIdx = (b.a1 === parentIdx + 1) ? (b.a2 - 1) : (b.a1 - 1);
      if (parsed.atoms[vIdx] && parsed.atoms[vIdx].elem === 'H') { hIdxRem = vIdx; break; }
    }

    if (hIdxRem >= 0) {
      acao = 'remover_h';
      console.log('[EDIT-ADD] Pai saturado, H#' + hIdxRem + ' será removido');
    } else {
      const msg =
        '⚠️ ADIÇÃO GERA ESTRUTURA INSTÁVEL\n\n' +
        'Átomo âncora: ' + parent.elem + '#' + (parentIdx + 1) + '\n' +
        'Ligações atuais: ' + nLig + ' (valência máx.: ' + valP + ')\n' +
        'Hidrogênios disponíveis: 0\n\n' +
        'Adicionar ' + novoSimbolo + ' criará uma valência estendida (radical livre).\n\n' +
        'Deseja continuar?';
      if (!confirm(msg)) {
        console.log('[EDIT-ADD] Usuário cancelou');
        mostrarNotificacao('Adição cancelada.', 'info');
        return;
      }
      acao = 'forcar_instavel';
      instavel = true;
      console.log('[EDIT-ADD] Modo forçado instável');
    }
  }

  // ─── Aplica modificação ─────────────────────────────────────────────
  let atoms = parsed.atoms.map(function (a) { return Object.assign({}, a); });
  let bonds = parsed.bonds.map(function (b) { return Object.assign({}, b); });

  if (acao === 'remover_h' && hIdxRem >= 0) {
    atoms.splice(hIdxRem, 1);
    bonds = bonds
      .filter(function (b) { return (b.a1 - 1) !== hIdxRem && (b.a2 - 1) !== hIdxRem; })
      .map(function (b) {
        return Object.assign({}, b, {
          a1: (b.a1 - 1) > hIdxRem ? b.a1 - 1 : b.a1,
          a2: (b.a2 - 1) > hIdxRem ? b.a2 - 1 : b.a2
        });
      });
  }

  const pIdxFinal = (acao === 'remover_h' && hIdxRem >= 0 && parentIdx > hIdxRem)
    ? parentIdx - 1 : parentIdx;
  const parentFinal = atoms[pIdxFinal];

  if (!parentFinal) {
    console.error('[EDIT-ADD] ❌ Átomo pai desapareceu após remoção de H');
    mostrarNotificacao('Erro interno: âncora perdida.', 'error');
    return;
  }

  const bPF = bonds.filter(function (b) {
    return b.a1 === pIdxFinal + 1 || b.a2 === pIdxFinal + 1;
  });
  const viz = bPF.map(function (b) {
    const vIdx = (b.a1 === pIdxFinal + 1) ? (b.a2 - 1) : (b.a1 - 1);
    return atoms[vIdx];
  }).filter(Boolean);

  const posNova = calcularPosicaoNovoAtomo(parentFinal, viz);

  atoms.push({ x: posNova.x, y: posNova.y, z: posNova.z, elem: novoSimbolo });
  bonds.push({ a1: pIdxFinal + 1, a2: atoms.length, tipo: 1 });

  const novoSdf = reconstruirSDF(parsed, atoms, bonds, instavel);

  console.log('[EDIT-ADD] SDF reconstruído. Átomos:', atoms.length, '| Ligações:', bonds.length);

  // ─── Validação RDKit (com fallback) ─────────────────────────────────
  let novoSmiles = null;
  let rdkit = null;

  try {
    rdkit = await carregarRDKitSobDemanda();
  } catch (e) {
    console.warn('[EDIT-ADD] RDKit load falhou:', e.message);
  }

  if (rdkit) {
    try {
      const m = rdkit.get_mol(novoSdf);
      if (m) {
        novoSmiles = m.get_smiles();
        m.delete();
        console.log('[EDIT-ADD] ✅ RDKit validou. SMILES:', novoSmiles);
      } else {
        console.warn('[EDIT-ADD] ⚠️ RDKit rejeitou estrutura');
        if (!instavel) {
          mostrarNotificacao('Estrutura inválida após adição.', 'error', 4000);
          return;
        }
      }
    } catch (e) {
      console.warn('[EDIT-ADD] RDKit exceção:', e.message);
    }
  }

  if (!novoSmiles && !instavel) {
    console.warn('[EDIT-ADD] ⚠️ Sem SMILES válido — usando placeholder');
    novoSmiles = 'EDIT_ADD_' + novoSimbolo + '_' + Date.now();
  }
  if (!novoSmiles && instavel) {
    novoSmiles = 'RADICAL_' + novoSimbolo + '_' + Date.now();
  }

  // ─── Snapshot ───────────────────────────────────────────────────────
  pushEdicaoSnapshot(STATE.compostoSelecionado, STATE.sdfCacheLocal, 'Add ' + novoSimbolo);

  // ─── Cria novo composto ─────────────────────────────────────────────
  const idD = 'add_' + Date.now();
  const suf = instavel ? ' ⚠️ INSTÁVEL' : '';
  const nomeD = STATE.compostoSelecionado.nome + ' + ' + novoSimbolo + suf;

  const novoComp = {
    id: idD,
    chaveOriginal: idD,
    nome: nomeD,
    formula: 'Adição Atômica',
    molarMass: '--',
    smiles: novoSmiles,
    categoria: 'custom',
    pubchemQuery: nomeD,
    unstable: instavel,
    sdfModificado: novoSdf
  };

  console.log('[EDIT-ADD] Criado composto:', nomeD);

  STATE.compostosIndexados.unshift(novoComp);
  STATE.compostosFiltrados.unshift(novoComp);
  renderizarListaCompostos(true);
  selecionarCompostoStudio(novoComp);

  window.fecharTabelaPeriodica();
  window.fecharInspectorAtomo();

  if (instavel) {
    console.log('[EDIT-ADD] ✅ Concluído (instável)');
    mostrarNotificacao('⚠️ Instável: ' + nomeD, 'warning', 5000);
  } else {
    console.log('[EDIT-ADD] ✅ Concluído');
    mostrarNotificacao('✅ Adicionado: ' + nomeD, 'success');
  }
};
// ››› FIM: executarAdicaoAtomo() — adição com logging + fallback.
// ››› FEEDBACK v4.3: todas as guardas avisam o usuário; aceita sem RDKit.

  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.7 — BIO-UI (Bioisosterismo) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Painel de transformações bioisostéricas + preview do delta de propriedades.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre painel de bioisosterismo para o composto ativo.
   */
  window.abrirPainelBioisosterismo = function () {
    const modal = document.getElementById('bioisostereModal');
    const body = document.getElementById('bioisostereModalBody');
    if (!modal || !body) return;

    if (!STATE.compostoSelecionado || !STATE.compostoSelecionado.smiles || STATE.compostoSelecionado.smiles === '--') {
      body.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Selecione uma molécula.</div>';
      modal.style.display = 'flex';
      return;
    }

    const smiles = STATE.compostoSelecionado.smiles;
    const nome = STATE.compostoSelecionado.nome;
    const disp = REACOES_BIOISOSTERISMO.filter(function (rx) { return rx.detectar(smiles); });

    const chips = disp.length > 0
      ? Array.from(new Set(disp.map(function (r) { return r.alvoSmarts; })))
          .map(function (t) { return '<span class="bio-group-chip">' + t + '</span>'; })
          .join('')
      : '<span style="color:#f87171; font-size:0.75rem;">Sem grupos elegíveis.</span>';

    const cards = disp.length > 0
      ? disp.map(function (rx) {
          return '<div class="bio-transform-card">' +
            '<div class="bio-card-top">' +
              '<span class="bio-card-name">' + rx.nome + '</span>' +
              '<span class="bio-card-scheme">' + rx.esquema + '</span>' +
              '<span class="cadd-badge badge-warning" style="align-self:flex-start; margin-top:2px;">' + rx.tag + '</span>' +
              '<p class="bio-card-desc">' + rx.descricao + '</p>' +
            '</div>' +
            '<button class="btn-apply-transform" onclick="window.executarTransformacaoBioisosterica(\'' + rx.id + '\')">🧪 Sintetizar</button>' +
          '</div>';
        }).join('')
      : '';

    body.innerHTML =
      '<div class="bio-detected-groups-panel">' +
        '<span class="bio-detected-title">Molécula: <strong style="color:var(--neon-cyan);">' + nome + '</strong></span>' +
        '<div style="font-family:var(--font-mono); font-size:0.7rem; color:#cbd5e1; word-break:break-all;">' + smiles + '</div>' +
        '<div class="bio-groups-chips" style="margin-top:6px;">' + chips + '</div>' +
      '</div>' +
      '<div id="bioComparisonArea"></div>' +
      '<h4 style="color:#f8fafc; font-size:0.82rem; margin-top:8px;">Transformações:</h4>' +
      '<div class="bio-transforms-grid">' + cards + '</div>';

    modal.style.display = 'flex';
  };
  // ››› FIM: abrirPainelBioisosterismo() — detecta grupos elegíveis e lista opções.
  // ››› FEEDBACK: só mostra transformações cujo .detectar() retornou true.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o painel de bioisosterismo.
   */
  window.fecharPainelBioisosterismo = function () {
    const m = document.getElementById('bioisostereModal');
    if (m) m.style.display = 'none';
  };
  // ››› FIM: fecharPainelBioisosterismo() — apenas oculta o modal.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aplica transformação bioisostérica e mostra delta de propriedades.
   */
  window.executarTransformacaoBioisosterica = async function (idReacao) {
    if (!STATE.compostoSelecionado) return;
    const rx = REACOES_BIOISOSTERISMO.find(function (r) { return r.id === idReacao; });
    if (!rx) return;

    const sO = STATE.compostoSelecionado.smiles;
    const nS = rx.transformar(sO);
    if (nS === sO) { mostrarNotificacao('Não foi possível derivatizar.', 'error'); return; }

    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const m = rdkit.get_mol(nS);
        if (!m) { mostrarNotificacao('Valência instável.', 'error'); return; }
        m.delete();
      } catch (e) { mostrarNotificacao('Erro de validação.', 'error'); return; }
    }

    const pA = await calcularPropriedadesMoleculares(sO, parseFloat(STATE.compostoSelecionado.molarMass));
    const pD = await calcularPropriedadesMoleculares(nS, 0);
    const area = document.getElementById('bioComparisonArea');

    if (area && pA && pD) {
      const dMW = pD.mw - pA.mw;
      const dLogP = pD.logp - pA.logp;
      const dTPSA = pD.tpsa - pA.tpsa;

      area.innerHTML =
        '<div class="bio-comparison-container">' +
          '<div class="bio-comparison-header">' +
            '<span class="bio-comparison-title">✨ ' + rx.nome + '</span>' +
            '<button class="studio-btn btn-action-transfer" onclick="window.adicionarDerivadoAoCatalogo(\'' +
              rx.nome.replace(/'/g, "\\'") + '\', \'' + nS + '\', ' + pD.mw.toFixed(2) + ')">📥 Injetar</button>' +
          '</div>' +
          '<table class="delta-table">' +
            '<thead><tr><th>Propriedade</th><th>Original</th><th>Derivado</th><th>Δ</th><th>Impacto</th></tr></thead>' +
            '<tbody>' +
              '<tr><td><strong>Massa</strong></td><td>' + pA.mw.toFixed(1) + '</td><td>' + pD.mw.toFixed(1) +
                '</td><td>' + (dMW >= 0 ? '+' : '') + dMW.toFixed(1) + '</td>' +
                '<td>' + (pD.mw <= 500 ? '✅ Ro5' : '⚠️') + '</td></tr>' +
              '<tr><td><strong>LogP</strong></td><td>' + pA.logp.toFixed(2) + '</td><td>' + pD.logp.toFixed(2) +
                '</td><td class="' + (dLogP > 0 ? 'delta-pos' : 'delta-neg') + '">' +
                (dLogP >= 0 ? '+' : '') + dLogP.toFixed(2) + '</td>' +
                '<td>' + (dLogP > 0 ? 'Mais lipofílico' : 'Mais hidrofílico') + '</td></tr>' +
              '<tr><td><strong>TPSA</strong></td><td>' + pA.tpsa.toFixed(1) + '</td><td>' + pD.tpsa.toFixed(1) +
                '</td><td class="' + (dTPSA < 0 ? 'delta-good' : 'delta-neg') + '">' +
                (dTPSA >= 0 ? '+' : '') + dTPSA.toFixed(1) + '</td>' +
                '<td>' + (pD.tpsa <= 140 ? '✅ Oral' : '⚠️') + '</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>';
    }
  };
  // ››› FIM: executarTransformacaoBioisosterica() — aplica reação + delta comparativo.
  // ››› FEEDBACK: guarda novo SMILES no botão "Injetar" para adicionar ao catálogo.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adiciona análogo bioisostérico ao catálogo.
   */
  window.adicionarDerivadoAoCatalogo = function (nomeT, nS, nMW) {
    if (!STATE.compostoSelecionado) return;
    const idU = 'deriv_' + Date.now();
    const nomeD = STATE.compostoSelecionado.nome + ' [' + nomeT + ']';
    const nc = {
      id: idU, chaveOriginal: idU, nome: nomeD,
      formula: 'Análogo', molarMass: nMW,
      smiles: nS, categoria: 'custom', pubchemQuery: nomeD
    };
    STATE.compostosIndexados.unshift(nc);
    STATE.compostosFiltrados.unshift(nc);
    renderizarListaCompostos(true);
    selecionarCompostoStudio(nc);
    window.fecharPainelBioisosterismo();
    mostrarNotificacao('Análogo adicionado.', 'success');
  };
  // ››› FIM: adicionarDerivadoAoCatalogo() — injeta análogo no catálogo principal.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.8 — ANALYSIS-UI (Similaridade, Scaffold, Comparação, CADD, CSV) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Ferramentas analíticas sobre o composto ativo.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca por similaridade estrutural (Tanimoto Morgan FP) contra o catálogo.
   */
  window.abrirSimilaridade = async function () {
    const modal = document.getElementById('similarityModal');
    const body = document.getElementById('similarityModalBody');
    const sub = document.getElementById('similaritySubHeader');
    if (!modal || !body) return;

    if (!STATE.compostoSelecionado || !STATE.compostoSelecionado.smiles) {
      mostrarNotificacao('Selecione uma molécula.', 'error');
      return;
    }

    modal.style.display = 'flex';
    body.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">Calculando fingerprints...</div>';
    if (sub) sub.textContent = 'Alvo: ' + STATE.compostoSelecionado.nome;

    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) {
      body.innerHTML = '<div style="padding:20px; color:#f87171;">RDKit indisponível.</div>';
      return;
    }

    const alvoSmiles = extrairSmilesPrincipal(STATE.compostoSelecionado.smiles);
    if (!alvoSmiles) {
      body.innerHTML = '<div style="padding:20px; color:#f87171;">SMILES inválido.</div>';
      return;
    }

    const alvoMol = rdkit.get_mol(alvoSmiles);
    if (!alvoMol) {
      body.innerHTML = '<div style="padding:20px; color:#f87171;">SMILES inválido.</div>';
      return;
    }

    let alvoFp = null;
    try { alvoFp = alvoMol.get_morgan_fp(); } catch (e) {}
    alvoMol.delete();

    if (!alvoFp) {
      body.innerHTML = '<div style="padding:20px; color:#f87171;">Fingerprint não calculável.</div>';
      return;
    }

    const res = [];
    for (let i = 0; i < STATE.compostosIndexados.length; i++) {
      const comp = STATE.compostosIndexados[i];
      const sL = extrairSmilesPrincipal(comp.smiles);
      if (!sL) continue;
      if (comp.id === STATE.compostoSelecionado.id) continue;
      try {
        const m = rdkit.get_mol(sL);
        if (!m) continue;
        const fp = m.get_morgan_fp();
        m.delete();
        if (!fp) continue;
        const t = tanimotoBits(alvoFp, fp);
        if (t > 0.15) res.push({ comp: comp, t: t });
      } catch (e) {}
    }
    res.sort(function (a, b) { return b.t - a.t; });
    const top = res.slice(0, 20);

    if (top.length === 0) {
      body.innerHTML = '<div style="padding:20px; color:#94a3b8;">Sem compostos similares (Tanimoto > 0.15).</div>';
      return;
    }

    body.innerHTML =
      '<div class="similarity-target-box">' +
        '<div class="similarity-target-name">🎯 ' + STATE.compostoSelecionado.nome + '</div>' +
        '<div class="similarity-target-smiles">' + STATE.compostoSelecionado.smiles + '</div>' +
      '</div>' +
      '<div class="similarity-results-list">' +
        top.map(function (r) {
          const sc = r.t > 0.7 ? 'score-high' : r.t > 0.4 ? 'score-mid' : 'score-low';
          return '<div class="similarity-result-item" onclick=\'window.selecionarCompostoStudio(' +
            JSON.stringify(r.comp) + '); window.fecharSimilaridade();\'>' +
            '<div class="similarity-score-badge ' + sc + '">' + (r.t * 100).toFixed(0) + '%</div>' +
            '<div><div class="similarity-result-name">' + r.comp.nome + '</div>' +
            '<div class="similarity-result-formula">' + r.comp.formula + '</div></div>' +
            '<div style="text-align:right; font-family:var(--font-mono); font-size:0.65rem; color:#94a3b8;">' +
              (r.comp.molarMass !== '--' ? parseFloat(r.comp.molarMass).toFixed(1) + ' Da' : '') + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
  };
  // ››› FIM: abrirSimilaridade() — top 20 análogos por Tanimoto.
  // ››› FEEDBACK: clicar em um resultado seleciona o composto automaticamente.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o modal de similaridade.
   */
  window.fecharSimilaridade = function () {
    const m = document.getElementById('similarityModal');
    if (m) m.style.display = 'none';
  };
  // ››› FIM: fecharSimilaridade() — apenas oculta o modal.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcula coeficiente de Tanimoto entre dois fingerprints Morgan.
   */
  function tanimotoBits(a, b) {
    if (!a || !b) return 0;
    let inter = 0, uni = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const x = a[i] | 0, y = b[i] | 0;
      inter += popcount(x & y);
      uni += popcount(x | y);
    }
    return uni === 0 ? 0 : inter / uni;
  }
  // ››› FIM: tanimotoBits() — similaridade [0,1] entre fingerprints.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Conta bits 1 em um inteiro (Brian Kernighan).
   */
  function popcount(x) {
    let c = 0;
    while (x) { x &= x - 1; c++; }
    return c;
  }
  // ››› FIM: popcount() — conta bits 1 (helper do Tanimoto).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extrai scaffold de Murcko do composto ativo.
   * Estratégia: tenta get_murcko_scaffold() e, se indisponível, aplica
   * remoção manual de grupos terminais via regex.
   */
  window.extrairScaffoldAtual = async function () {
    if (!STATE.compostoSelecionado || !STATE.compostoSelecionado.smiles || STATE.compostoSelecionado.smiles === '--') {
      mostrarNotificacao('Selecione uma molécula.', 'error');
      return;
    }

    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) { mostrarNotificacao('RDKit indisponível.', 'error'); return; }

    try {
      const smilesPrincipal = extrairSmilesPrincipal(STATE.compostoSelecionado.smiles);
      if (!smilesPrincipal) { mostrarNotificacao('SMILES inválido.', 'error'); return; }

      const mol = rdkit.get_mol(smilesPrincipal);
      if (!mol) { mostrarNotificacao('SMILES inválido.', 'error'); return; }

      let sc = null;
      if (typeof mol.get_murcko_scaffold === 'function') {
        try { sc = mol.get_murcko_scaffold(); } catch (e) {}
      }

      if (!sc || sc === '' || sc === smilesPrincipal) {
        try {
          const simplificado = smilesPrincipal
            .replace(/\(\[?OH?\]?\)/g, '')
            .replace(/\(\[?NH[0-9]?\]?\)/g, '')
            .replace(/\(=O\)/g, '')
            .replace(/\(\[?F,Cl,Br,I\]?\)/g, '');
          const m2 = rdkit.get_mol(simplificado);
          if (m2) { sc = m2.get_smiles(); m2.delete(); }
        } catch (e) {}
      }

      mol.delete();

      if (!sc || sc === '' || sc === smilesPrincipal) {
        mostrarNotificacao('Scaffold não extraível (molécula sem anel principal).', 'warning', 4000);
        return;
      }

      const idS = 'scaffold_' + Date.now();
      const nomeS = 'Scaffold de ' + STATE.compostoSelecionado.nome;
      const nc = {
        id: idS, chaveOriginal: idS, nome: nomeS,
        formula: 'Scaffold Murcko', molarMass: '--',
        smiles: sc, categoria: 'custom', pubchemQuery: nomeS
      };

      STATE.compostosIndexados.unshift(nc);
      STATE.compostosFiltrados.unshift(nc);
      renderizarListaCompostos(true);
      selecionarCompostoStudio(nc);
      mostrarNotificacao('✅ Scaffold: ' + sc, 'success');
    } catch (e) {
      console.error('[Scaffold]', e);
      mostrarNotificacao('Erro: ' + e.message, 'error');
    }
  };
  // ››› FIM: extrairScaffoldAtual() — extrai esqueleto de Murcko.
  // ››› FEEDBACK: 2 métodos em cascata (get_murcko_scaffold → regex manual).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre o modal de comparação lado a lado.
   */
  window.abrirComparacao = function () {
    const modal = document.getElementById('comparisonModal');
    const selA = document.getElementById('cmpSelectA');
    const selB = document.getElementById('cmpSelectB');
    if (!modal || !selA || !selB) return;

    const opcoes = STATE.compostosIndexados
      .filter(function (c) { return c.smiles && c.smiles !== '--'; })
      .slice(0, 500)
      .map(function (c) { return '<option value="' + c.id + '">' + c.nome + ' — ' + c.formula + '</option>'; })
      .join('');

    selA.innerHTML = opcoes;
    selB.innerHTML = opcoes;

    if (STATE.compostoSelecionado) selA.value = STATE.compostoSelecionado.id;
    if (STATE.compostosIndexados.length > 1) {
      const outro = STATE.compostosIndexados.find(function (c) {
        return c.id !== (STATE.compostoSelecionado ? STATE.compostoSelecionado.id : '') && c.smiles && c.smiles !== '--';
      });
      if (outro) selB.value = outro.id;
    }

    modal.style.display = 'flex';
    document.getElementById('comparisonMetrics').innerHTML =
      '<div style="text-align:center; padding: 20px; color: #64748b; font-size: 0.78rem;">Clique em Comparar.</div>';
  };
  // ››› FIM: abrirComparacao() — preenche selects com até 500 compostos.
  // ››› FEEDBACK: pré-seleciona composto ativo em A e sugere outro em B.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o modal de comparação e limpa os viewers.
   */
  window.fecharComparacao = function () {
    const m = document.getElementById('comparisonModal');
    if (m) m.style.display = 'none';
    if (STATE.cmpViewerA) { try { STATE.cmpViewerA.clear(); } catch (e) {} STATE.cmpViewerA = null; }
    if (STATE.cmpViewerB) { try { STATE.cmpViewerB.clear(); } catch (e) {} STATE.cmpViewerB = null; }
  };
  // ››› FIM: fecharComparacao() — oculta modal + destrói viewers 3D.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Executa a comparação entre dois compostos selecionados.
   */
  window.executarComparacao = async function () {
    const idA = document.getElementById('cmpSelectA') ? document.getElementById('cmpSelectA').value : '';
    const idB = document.getElementById('cmpSelectB') ? document.getElementById('cmpSelectB').value : '';
    if (!idA || !idB || idA === idB) {
      mostrarNotificacao('Selecione compostos diferentes.', 'warning');
      return;
    }

    const cA = STATE.compostosIndexados.find(function (c) { return c.id === idA; });
    const cB = STATE.compostosIndexados.find(function (c) { return c.id === idB; });
    if (!cA || !cB) return;

    document.getElementById('cmpLabelA').textContent = cA.nome;
    document.getElementById('cmpLabelB').textContent = cB.nome;

    const sdfA = cA.sdfModificado || await resolverCoordenadas3D(cA.smiles, cA.pubchemQuery || cA.nome);
    const sdfB = cB.sdfModificado || await resolverCoordenadas3D(cB.smiles, cB.pubchemQuery || cB.nome);

    document.getElementById('cmpViewerA').innerHTML = '';
    document.getElementById('cmpViewerB').innerHTML = '';

    if (sdfA && window.$3Dmol) {
      STATE.cmpViewerA = $3Dmol.createViewer('cmpViewerA', { backgroundColor: '#020617' });
      STATE.cmpViewerA.addModel(sdfA, 'sdf');
      STATE.cmpViewerA.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      STATE.cmpViewerA.zoomTo();
      STATE.cmpViewerA.render();
    }
    if (sdfB && window.$3Dmol) {
      STATE.cmpViewerB = $3Dmol.createViewer('cmpViewerB', { backgroundColor: '#020617' });
      STATE.cmpViewerB.addModel(sdfB, 'sdf');
      STATE.cmpViewerB.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      STATE.cmpViewerB.zoomTo();
      STATE.cmpViewerB.render();
    }

    const pA = await calcularPropriedadesMoleculares(cA.smiles, parseFloat(cA.molarMass));
    const pB = await calcularPropriedadesMoleculares(cB.smiles, parseFloat(cB.molarMass));

    if (pA && pB) {
      const r = function (l, a, b, mm) {
        const d = b - a;
        const ok = mm ? d < 0 : d > 0;
        return '<tr><td>' + l + '</td><td>' + a.toFixed(2) + '</td><td>' + b.toFixed(2) +
          '</td><td class="' + (ok ? 'cmp-delta-pos' : 'cmp-delta-neg') + '">' +
          (d >= 0 ? '+' : '') + d.toFixed(2) + '</td></tr>';
      };

      document.getElementById('comparisonMetrics').innerHTML =
        '<table class="comparison-table">' +
          '<thead><tr><th>Propriedade</th><th>' + cA.nome + '</th><th>' + cB.nome + '</th><th>Δ</th></tr></thead>' +
          '<tbody>' +
            r('Massa', pA.mw, pB.mw, true) +
            r('LogP', pA.logp, pB.logp, false) +
            r('TPSA', pA.tpsa, pB.tpsa, true) +
            r('HBD', pA.hbd, pB.hbd, true) +
            r('HBA', pA.hba, pB.hba, true) +
            r('RotB', pA.rotb, pB.rotb, true) +
          '</tbody>' +
        '</table>';
    }
  };
  // ››› FIM: executarComparacao() — renderiza 2 viewers + tabela de deltas.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exporta catálogo filtrado como CSV (UTF-8 com BOM).
   */
  window.exportarCSVFiltrados = function () {
    if (STATE.compostosFiltrados.length === 0) {
      mostrarNotificacao('Sem compostos.', 'error');
      return;
    }
    const L = ['Nome,Formula,Massa,SMILES,Categoria,Instavel'];
    STATE.compostosFiltrados.forEach(function (c) {
      L.push([
        '"' + (c.nome || '').replace(/"/g, '""') + '"',
        c.formula || '',
        c.molarMass || '',
        '"' + (c.smiles || '').replace(/"/g, '""') + '"',
        c.categoria || '',
        c.unstable ? 'SIM' : 'NAO'
      ].join(','));
    });
    const blob = new Blob(['\ufeff' + L.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laift_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao(STATE.compostosFiltrados.length + ' exportados.', 'success');
  };
  // ››› FIM: exportarCSVFiltrados() — download de CSV do catálogo visível.
  // ››› FEEDBACK: BOM \ufeff garante acentuação correta no Excel.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre o modal do dossiê CADD (Lipinski, Veber, Ghose, PAINS).
   */
  window.abrirModalCADD = function () {
    const modal = document.getElementById('caddModal');
    const body = document.getElementById('caddModalBody');
    const title = document.getElementById('caddModalTitle');
    const sub = document.getElementById('caddModalSubtitle');
    if (!modal || !body) return;

    if (!STATE.ultimoDossieCADD) {
      body.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px;">Selecione um composto.</div>';
      modal.style.display = 'flex';
      return;
    }

    const d = STATE.ultimoDossieCADD;
    if (title) title.textContent = '📊 ' + d.nome;
    if (sub) sub.textContent = 'SMILES: ' + d.smiles + (d._fallback ? ' (estimado)' : '');

    body.innerHTML =
      '<div class="cadd-cards-grid">' +
        '<div class="cadd-card">' +
          '<div class="cadd-card-title-row">' +
            '<span class="cadd-card-title">💊 Lipinski</span>' +
            '<span class="cadd-badge ' + (d.falhasLipinski.length === 0 ? 'badge-approved' : d.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected') + '">' +
              (d.falhasLipinski.length === 0 ? 'Conforme' : d.falhasLipinski.length + ' Viol.') + '</span>' +
          '</div>' +
          '<div class="cadd-param-list">' +
            '<div class="cadd-param-item ' + (d.mw > 500 ? 'violated' : '') + '"><span>MW:</span><strong>' + d.mw.toFixed(2) + '</strong></div>' +
            '<div class="cadd-param-item ' + (d.logp > 5 ? 'violated' : '') + '"><span>LogP:</span><strong>' + d.logp.toFixed(2) + '</strong></div>' +
            '<div class="cadd-param-item ' + (d.hbd > 5 ? 'violated' : '') + '"><span>HBD:</span><strong>' + d.hbd + '</strong></div>' +
            '<div class="cadd-param-item ' + (d.hba > 10 ? 'violated' : '') + '"><span>HBA:</span><strong>' + d.hba + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="cadd-card">' +
          '<div class="cadd-card-title-row">' +
            '<span class="cadd-card-title">🔬 Veber</span>' +
            '<span class="cadd-badge ' + (d.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected') + '">' +
              (d.falhasVeber.length === 0 ? 'OK' : 'Baixa') + '</span>' +
          '</div>' +
          '<div class="cadd-param-list">' +
            '<div class="cadd-param-item ' + (d.rotb > 10 ? 'violated' : '') + '"><span>RotB:</span><strong>' + d.rotb + '</strong></div>' +
            '<div class="cadd-param-item ' + (d.tpsa > 140 ? 'violated' : '') + '"><span>TPSA:</span><strong>' + d.tpsa.toFixed(1) + '</strong></div>' +
            '<div class="cadd-param-item"><span>Fsp³:</span><strong>' + d.csp3.toFixed(2) + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="cadd-card">' +
          '<div class="cadd-card-title-row">' +
            '<span class="cadd-card-title">📐 Ghose</span>' +
            '<span class="cadd-badge ' + (d.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected') + '">' +
              (d.falhasGhose.length === 0 ? 'OK' : d.falhasGhose.length + ' Viol.') + '</span>' +
          '</div>' +
          '<div class="cadd-param-list">' +
            '<div class="cadd-param-item"><span>MR:</span><strong>' + d.mr.toFixed(1) + '</strong></div>' +
            '<div class="cadd-param-item"><span>Átomos:</span><strong>' + d.totalAtoms + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="cadd-card">' +
          '<div class="cadd-card-title-row">' +
            '<span class="cadd-card-title">⚠️ PAINS</span>' +
            '<span class="cadd-badge ' + (d.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected') + '">' +
              (d.alertasPAINS.length === 0 ? 'Isento' : d.alertasPAINS.length + ' Alerta') + '</span>' +
          '</div>' +
          (d.alertasPAINS.length === 0
            ? '<div class="pains-clean-box">✅ Sem grupos promíscuos.</div>'
            : '<div class="pains-alert-box"><strong>Reativos:</strong><br>' +
                d.alertasPAINS.map(function (a) { return '• ' + a.nome; }).join('<br>') + '</div>') +
        '</div>' +
      '</div>';

    modal.style.display = 'flex';
  };
  // ››› FIM: abrirModalCADD() — dossiê completo das 4 regras de drug-likeness.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fecha o modal CADD.
   */
  window.fecharModalCADD = function () {
    const m = document.getElementById('caddModal');
    if (m) m.style.display = 'none';
  };
  // ››› FIM: fecharModalCADD() — apenas oculta o modal.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L3.9 — RENDER (3D + 2D + Controles + Exportação) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Pipeline de renderização molecular e exportação.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Valida se uma string contém SDF real (não página HTML de erro).
   */
  function validarConteudoSDF(sdf) {
    if (!sdf || typeof sdf !== 'string') return false;
    if (sdf.indexOf('<!DOCTYPE') >= 0 || sdf.indexOf('<html') >= 0) return false;
    if (sdf.length < 30) return false;
    return sdf.indexOf('$$$$') >= 0 || sdf.indexOf('M  END') >= 0;
  }
  // ››› FIM: validarConteudoSDF() — guarda contra HTML de 404 interpretado como SDF.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Gera SDF mínimo para átomo monoatômico (ex.: [Na], [K]).
   */
  function gerarSDFMonoatomico(simbolo) {
    const s = simbolo.replace(/\[|\]|\+|\-/g, '').trim();
    return '\n  LAIFT-MONOATOMIC\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\n' +
      '    0.0000    0.0000    0.0000 ' + s.padEnd(3, ' ') + ' 0  0  0  0  0  0  0  0  0  0  0  0\n' +
      'M  END\n$$$$\n';
  }
  // ››› FIM: gerarSDFMonoatomico() — cria SDF de 1 átomo na origem.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pipeline de resolução 3D com 8 níveis de fallback (v4.1).
   * Ordem corrigida: SDF custom → monoatômico → IndexedDB → OCL → RDKit →
   * PubChem SMILES → CACTUS → PubChem Nome (só se nome em inglês).
   */
  async function resolverCoordenadas3D(smiles, termoBusca) {
    // Nível 1: SDF customizado (editado pelo usuário)
    if (STATE.compostoSelecionado && STATE.compostoSelecionado.sdfModificado &&
        validarConteudoSDF(STATE.compostoSelecionado.sdfModificado)) {
      return STATE.compostoSelecionado.sdfModificado;
    }

    if (!smiles && !termoBusca) return null;

    // Nível 2: Monoatômico
    if (smiles && smiles.charAt(0) === '[' && smiles.charAt(smiles.length - 1) === ']' && smiles.length <= 6) {
      return gerarSDFMonoatomico(smiles);
    }

    // Radical livre sem estrutura: retorna null
    if (smiles && smiles.indexOf('RADICAL_') === 0) return null;

    // Nível 3: Cache IndexedDB
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      try {
        const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
        if (cache && validarConteudoSDF(cache.sdf)) return cache.sdf;
      } catch (e) {}
    }

    const sL = extrairSmilesPrincipal(smiles);

    // Nível 4: OpenChemLib (geração local JS pura)
    if (sL) {
      try {
        exibirStatusRDKit(true, 'Gerando 3D local (OCL)...');
        const sdf = gerar3DComOCL(sL);
        exibirStatusRDKit(false);
        if (sdf && validarConteudoSDF(sdf)) {
          salvarEmCache(sL, termoBusca, sdf);
          return sdf;
        }
      } catch (e) {
        console.warn('[OCL] Falha:', e.message);
      }
    }

    // Nível 5: RDKit ETKDG (pode não estar disponível na versão minimal)
    if (sL && sL.charAt(0) !== '[') {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, 'RDKit ETKDG...');
          const mol = rdkit.get_mol(sL);
          if (mol) {
            try { mol.add_hs(); } catch (e) {}
            if (typeof mol.embed_mol === 'function' && mol.embed_mol() >= 0) {
              const sdf = mol.to_sdf();
              mol.delete();
              exibirStatusRDKit(false);
              if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
            } else {
              mol.delete();
            }
          }
        } catch (e) {
          console.warn('[RDKit] ETKDG falhou:', e.message);
        }
      }
      exibirStatusRDKit(false);
    }

    // Nível 6: PubChem SMILES
    if (sL && sL.charAt(0) !== '[') {
      try {
        exibirStatusRDKit(true, 'PubChem 3D (SMILES)...');
        const res = await fetch(
          'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/' +
          encodeURIComponent(sL) + '/SDF?record_type=3d'
        );
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
        } else {
          exibirStatusRDKit(false);
        }
      } catch (e) {}
    }

    // Nível 7: CACTUS NIH (por SMILES — mais confiável que PubChem por nome)
    if (sL && sL !== '--') {
      try {
        exibirStatusRDKit(true, 'CACTUS NIH...');
        const res = await fetch(
          'https://cactus.nci.nih.gov/chemical/structure/' +
          encodeURIComponent(sL) + '/file?format=sdf'
        );
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
        } else {
          exibirStatusRDKit(false);
        }
      } catch (e) {}
    }

    // Nível 8: PubChem por NOME (só se o nome estiver em inglês)
    // Evita 404 em nomes PT-BR como "Acetato de Etila", "Ácido Salicílico"
    const nomeEhIngles = termoBusca &&
      termoBusca !== '--' &&
      termoBusca.indexOf('Scaffold') !== 0 &&
      termoBusca.length > 2 &&
      !/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(termoBusca) &&
      !/\b(acido|ácido|cloreto|sodio|sódio|etila|metila|anidrido|hidroxido|hidróxido)\b/i.test(termoBusca);

    if (nomeEhIngles) {
      try {
        exibirStatusRDKit(true, 'PubChem 3D (nome EN)...');
        const res = await fetch(
          'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' +
          encodeURIComponent(termoBusca.trim()) + '/SDF?record_type=3d'
        );
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(smiles || termoBusca, termoBusca, sdf); return sdf; }
        } else {
          exibirStatusRDKit(false);
        }
      } catch (e) {}
    }

    exibirStatusRDKit(false);
    return null;
  }
  // ››› FIM: resolverCoordenadas3D() — pipeline com 8 níveis de fallback.
  // ››› FEEDBACK v4.1: CACTUS movido para antes do PubChem nome; PubChem nome
  //     agora só roda se o nome não tem acentos nem sufixos PT-BR.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Persiste SDF no cache IndexedDB (via LabStorageEngine).
   */
  function salvarEmCache(smiles, nome, sdf) {
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarCompostoLocal === 'function') {
      try { LabStorageEngine.salvarCompostoLocal(smiles || nome, { sdf: sdf, nome: nome }); } catch (e) {}
    }
  }
  // ››› FIM: salvarEmCache() — write-through no IndexedDB.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega estrutura completa (2D + 3D + CADD) do composto.
   */
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;

    window.fecharInspectorAtomo();
    const wm = document.getElementById('studioWatermark');
    if (wm) wm.style.display = 'none';

    document.getElementById('studioMolNome').textContent = comp.nome;
    document.getElementById('studioMolFormula').textContent = comp.formula;
    document.getElementById('studioMolMassa').textContent = comp.molarMass !== '--'
      ? parseFloat(comp.molarMass).toFixed(2) + ' g/mol'
      : '--';
    const btnBench = document.getElementById('btnCarregarNaBancada');
    if (btnBench) btnBench.style.display = 'inline-flex';

    atualizarBotaoFavorito();
    desenharEstrutura2DStudio(comp.smiles, comp.nome);
    avaliarQuimiometriaCompleta(comp.smiles, parseFloat(comp.molarMass), comp.nome);

    const sdf = await resolverCoordenadas3D(comp.smiles, comp.pubchemQuery || comp.nome);
    STATE.sdfCacheLocal = sdf;

    if (sdf && validarConteudoSDF(sdf)) {
      construirCena3D(sdf);
      pushEdicaoSnapshot(comp, sdf, 'Carregamento');
      if (comp.unstable) exibirBannerInstabilidade();
      else removerBannerInstabilidade();
    } else {
      STATE.modeloCarregadoAtivo = false;
      const container = document.getElementById('studioViewer3D');
      if (container) {
        container.innerHTML =
          '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#facc15; font-size:0.78rem; text-align:center; max-width:80%; line-height:1.6;">' +
            '⚠️ <strong>Coordenadas 3D indisponíveis</strong><br>' +
            '<span style="color:#94a3b8; font-size:0.68rem;">A projeção 2D continua funcional.</span>' +
          '</div>';
      }
      removerBannerInstabilidade();
    }
  }
  // ››› FIM: carregarEstruturaNoStudio() — orquestra 2D + 3D + CADD.
  // ››› FEEDBACK: prioriza SDF customizado se composto tem sdfModificado.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exibe banner de aviso para estruturas instáveis (radicais).
   */
  function exibirBannerInstabilidade() {
    removerBannerInstabilidade();
    const stage = document.getElementById('studioCanvasWrapper');
    if (!stage) return;
    const banner = document.createElement('div');
    banner.className = 'unstable-banner';
    banner.id = 'unstableBanner';
    banner.innerHTML =
      '<div>⚠️ <strong>Estrutura instável</strong> — valência estendida (radical).</div>' +
      '<div class="unstable-actions">' +
        '<button onclick="window.desfazerEdicao()">↶ Desfazer</button>' +
        '<button onclick="document.getElementById(\'unstableBanner\').remove()">OK</button>' +
      '</div>';
    stage.appendChild(banner);
  }
  // ››› FIM: exibirBannerInstabilidade() — banner com botão desfazer.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Remove o banner de instabilidade.
   */
  function removerBannerInstabilidade() {
    const b = document.getElementById('unstableBanner');
    if (b) b.remove();
  }
  // ››› FIM: removerBannerInstabilidade() — remove elemento do DOM.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Constrói cena 3D no viewer 3Dmol.js.
   * Reutiliza o viewer existente se possível; recria se container zerou.
   */
  function construirCena3D(sdfText) {
  const container = document.getElementById('studioViewer3D');
  if (!container || !window.$3Dmol || !validarConteudoSDF(sdfText)) return;

  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    setTimeout(function () { construirCena3D(sdfText); }, 250);
    return;
  }

  // ─── Caminho 1: reutilizar viewer existente (evita leak WebGL) ──────
  if (STATE.studioViewer && container.querySelector('canvas')) {
    try {
      STATE.studioViewer.removeAllModels();
      STATE.studioViewer.removeAllSurfaces();
      STATE.studioViewer.addModel(sdfText, 'sdf');

      STATE.modeloCarregadoAtivo = true;
      aplicarEstiloVisual(STATE.modeloAtual);

      STATE.studioViewer.setClickable({}, true, function (atom) {
        if (STATE.modoMedicaoAtivo) processarCliqueMedicao(atom);
        else selecionarEInspecionarAtomo(atom);
      });

      STATE.studioViewer.zoomTo();
      STATE.studioViewer.render();

      if (STATE.autoRotacaoAtiva) {
        try { STATE.studioViewer.animate({ loop: 'backAndForth', step: 0.35 }); } catch (e) {}
      }
      return;
    } catch (reuseErr) {
      console.warn('[3D] Reuso falhou, recriando:', reuseErr.message);
      // Cai no caminho 2
    }
  }

  // ─── Caminho 2: criar viewer novo (só na primeira vez ou se reuso falhou) ────
  try {
    // Destrói viewer antigo ANTES de criar novo
    if (STATE.studioViewer) {
      try { STATE.studioViewer.stopAnimate(); } catch (e) {}
      try { STATE.studioViewer.clear(); } catch (e) {}
      STATE.studioViewer = null;
    }

    container.innerHTML = '';

    STATE.studioViewer = $3Dmol.createViewer(container, {
      backgroundColor: '#020617',
      antialias: true
    });

    const model = STATE.studioViewer.addModel(sdfText, 'sdf');
    if (!model || typeof model.selectedAtoms !== 'function') {
      STATE.modeloCarregadoAtivo = false;
      return;
    }

    const ats = model.selectedAtoms({}) || [];
    if (ats.length === 0) {
      STATE.modeloCarregadoAtivo = false;
      return;
    }

    STATE.modeloCarregadoAtivo = true;
    aplicarEstiloVisual(STATE.modeloAtual);

    STATE.studioViewer.setClickable({}, true, function (atom) {
      if (STATE.modoMedicaoAtivo) processarCliqueMedicao(atom);
      else selecionarEInspecionarAtomo(atom);
    });

    STATE.studioViewer.zoomTo();
    STATE.studioViewer.render();

    setTimeout(function () {
      if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
        try {
          const r2 = container.getBoundingClientRect();
          if (r2.width > 0 && r2.height > 0) {
            STATE.studioViewer.resize();
            STATE.studioViewer.render();
          }
        } catch (e) {}
      }
    }, 180);

    if (STATE.autoRotacaoAtiva) {
      try { STATE.studioViewer.animate({ loop: 'backAndForth', step: 0.35 }); } catch (e) {}
    }
  } catch (errCena) {
    STATE.modeloCarregadoAtivo = false;
    console.warn('[3D] Erro:', errCena);
  }
}
  // ››› FIM: construirCena3D() — recria viewer WebGL com SDF.
  // ››› FEEDBACK: retry a 250ms se container tem 0×0 (troca de aba, resize).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aplica estilo visual 3D (ballstick, cpk, wireframe, surface).
   */
  function aplicarEstiloVisual(tipo) {
    if (!STATE.studioViewer || !STATE.modeloCarregadoAtivo) return;
    try {
      STATE.studioViewer.removeAllSurfaces();
      switch (tipo) {
        case 'ballstick':
          STATE.studioViewer.setStyle({}, {
            stick: { radius: 0.15, colorscheme: 'Jmol' },
            sphere: { scale: 0.28, colorscheme: 'Jmol' }
          });
          break;
        case 'cpk':
          STATE.studioViewer.setStyle({}, { sphere: { scale: 1.0, colorscheme: 'Jmol' } });
          break;
        case 'wireframe':
          STATE.studioViewer.setStyle({}, { line: { linewidth: 2.2, colorscheme: 'Jmol' } });
          break;
        case 'surface':
          STATE.studioViewer.setStyle({}, {
            stick: { radius: 0.12, colorscheme: 'Jmol' },
            sphere: { scale: 0.22, colorscheme: 'Jmol' }
          });
          STATE.studioViewer.addSurface($3Dmol.SurfaceType.VDW, {
            opacity: 0.65, color: '#38bdf8'
          });
          break;
      }
      STATE.studioViewer.render();
    } catch (e) {}
  }
  // ››› FIM: aplicarEstiloVisual() — 4 estilos de representação 3D.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Desenha estrutura 2D no canvas via SmilesDrawer.
   */
  function desenharEstrutura2DStudio(smiles, nome) {
  const canvas = document.getElementById('studioCanvas2D');
  if (!canvas) return;

  // ─── Sizing defensivo: nunca aceita 0×0 ────────────────────────────
  const wrapper = canvas.parentElement;
  if (wrapper) {
    const w = Math.max(wrapper.clientWidth - 40, 400);
    const h = Math.max(wrapper.clientHeight - 40, 300);
    if (canvas.width !== Math.min(1200, w) || canvas.height !== Math.min(900, h)) {
      canvas.width = Math.min(1200, w);
      canvas.height = Math.min(900, h);
    }
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (typeof SmilesDrawer === 'undefined') {
    desenharFallback2D(canvas, smiles, nome, 'SmilesDrawer não carregado');
    return;
  }

  const sL = extrairSmilesPrincipal(smiles);
  if (!sL) {
    desenharFallback2D(canvas, smiles, nome, 'Molécula inorgânica ou radical');
    return;
  }

  try {
    const drawer = new SmilesDrawer.Drawer({
      width: canvas.width,
      height: canvas.height,
      bondThickness: 1.8,
      bondLength: 22,
      isomeric: true,
      padding: 30
    });

    SmilesDrawer.parse(
      sL,
      function (tree) {
        try {
          drawer.draw(tree, canvas, 'dark', false);
        } catch (drawErr) {
          console.warn('[SmilesDrawer] Erro ao desenhar:', drawErr);
          desenharFallback2D(canvas, sL, nome, 'Erro de desenho');
        }
      },
      function (parseErr) {
        console.warn('[SmilesDrawer] Parse erro:', parseErr);
        desenharFallback2D(canvas, sL, nome, 'SMILES não suportado');
      }
    );
  } catch (e) {
    console.warn('[SmilesDrawer] Exceção:', e);
    desenharFallback2D(canvas, sL, nome, 'Erro inesperado');
  }
}
  // ››› FIM: desenharEstrutura2DStudio() — renderização 2D vetorial.
  // ››› FEEDBACK: fallback desenha nome + SMILES quando SmilesDrawer falha.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fallback 2D: desenha nome do composto e SMILES em texto.
   */
  function desenharFallback2D(canvas, smiles, nome, motivo) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px "Urbanist", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nome || 'Composto', canvas.width / 2, canvas.height / 2 - 30);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px "Fira Code", monospace';
    const sm = smiles || '--';
    const maxC = 60;
    const linhas = [];
    for (let i = 0; i < sm.length && linhas.length < 4; i += maxC) {
      linhas.push(sm.substring(i, i + maxC));
    }
    linhas.forEach(function (l, i) {
      ctx.fillText(l, canvas.width / 2, canvas.height / 2 + i * 20);
    });

    if (motivo) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'italic 11px "Urbanist"';
      ctx.fillText('(' + motivo + ')', canvas.width / 2, canvas.height / 2 + linhas.length * 20 + 30);
    }
  }
  // ››› FIM: desenharFallback2D() — texto quando estrutura não renderiza.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.7 — CONTROLES (Handlers de UI) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Handlers dos botões da toolbar e interação com o canvas.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler de troca de modelo 3D (ballstick/cpk/wireframe/surface).
   */
  window.setModelo3D = function (m) {
    STATE.modeloAtual = m;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(function (b) { b.classList.remove('active'); });
    const map = { ballstick: 'btnModoBallStick', cpk: 'btnModoCPK', wireframe: 'btnModoWire', surface: 'btnModoSurface' };
    const t = document.getElementById(map[m]);
    if (t) t.classList.add('active');
    if (STATE.modeloCarregadoAtivo && STATE.modoExibicaoAtual === '3D') aplicarEstiloVisual(m);
    salvarPreferencias();
  };
  // ››› FIM: setModelo3D() — alterna estilo + persiste preferência.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler de troca de modo 2D/3D.
   */
  window.setStudioModoVisual = function (m) {
    STATE.modoExibicaoAtual = m;
    const v3 = document.getElementById('studioViewer3D');
    const v2 = document.getElementById('studioViewer2D');
    const b3 = document.getElementById('btnStudioView3D');
    const b2 = document.getElementById('btnStudioView2D');
    const grp = document.getElementById('group3DStyles');

    if (b3) b3.classList.toggle('active', m === '3D');
    if (b2) b2.classList.toggle('active', m === '2D');
    if (grp) grp.style.display = m === '3D' ? 'flex' : 'none';

    if (m === '3D') {
      if (v2) v2.style.display = 'none';
      if (v3) {
        v3.style.display = 'block';
        if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
          STATE.studioViewer.resize();
          STATE.studioViewer.render();
        }
      }
    } else {
      if (v3) v3.style.display = 'none';
      if (v2) v2.style.display = 'flex';
      if (STATE.compostoSelecionado) {
        desenharEstrutura2DStudio(STATE.compostoSelecionado.smiles, STATE.compostoSelecionado.nome);
      }
    }
    salvarPreferencias();
  };
  // ››› FIM: setStudioModoVisual() — alterna 2D/3D + re-renderiza se necessário.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler do modo medição (distâncias e ângulos).
   */
  window.toggleModoMedicao = function () {
    STATE.modoMedicaoAtivo = !STATE.modoMedicaoAtivo;
    STATE.atomosSelecionadosParaMedicao = [];
    window.fecharInspectorAtomo();
    const btn = document.getElementById('btnToolMeasure');
    const hud = document.getElementById('measureHud');
    if (btn) btn.classList.toggle('active', STATE.modoMedicaoAtivo);
    if (hud) hud.style.display = STATE.modoMedicaoAtivo ? 'flex' : 'none';
    if (!STATE.modoMedicaoAtivo) limparMedicoes3D();
  };
  // ››› FIM: toggleModoMedicao() — ativa/desativa modo medição geométrica.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Processa clique em átomo no modo medição (2 = distância, 3 = ângulo).
   */
  function processarCliqueMedicao(atom) {
    if (!STATE.studioViewer || !atom || !STATE.modeloCarregadoAtivo) return;
    STATE.atomosSelecionadosParaMedicao.push(atom);
    STATE.studioViewer.addSphere({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 0.35, color: '#e11d48'
    });

    const label = document.getElementById('studioLastMeasurement');

    if (STATE.atomosSelecionadosParaMedicao.length === 2) {
      const a1 = STATE.atomosSelecionadosParaMedicao[0];
      const a2 = STATE.atomosSelecionadosParaMedicao[1];
      const d = Math.hypot(a2.x - a1.x, a2.y - a1.y, a2.z - a1.z);

      STATE.studioViewer.addLine({
        start: { x: a1.x, y: a1.y, z: a1.z },
        end: { x: a2.x, y: a2.y, z: a2.z },
        color: '#fb7185', dashed: true
      });
      STATE.studioViewer.addLabel(d.toFixed(3) + ' Å', {
        position: { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 },
        backgroundColor: '#020617', fontColor: '#38bdf8', fontSize: 12
      });
      if (label) label.textContent = 'Distância (' + a1.elem + '-' + a2.elem + '): ' + d.toFixed(3) + ' Å';
      STATE.studioViewer.render();
    } else if (STATE.atomosSelecionadosParaMedicao.length === 3) {
      const a1 = STATE.atomosSelecionadosParaMedicao[0];
      const a2 = STATE.atomosSelecionadosParaMedicao[1];
      const a3 = STATE.atomosSelecionadosParaMedicao[2];

      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const mu = Math.hypot(u.x, u.y, u.z);
      const mv = Math.hypot(v.x, v.y, v.z);
      const ang = (Math.acos(Math.max(-1, Math.min(1, dot / (mu * mv)))) * 180) / Math.PI;

      STATE.studioViewer.addLabel('Ângulo: ' + ang.toFixed(1) + '°', {
        position: { x: a2.x, y: a2.y + 0.35, z: a2.z },
        backgroundColor: '#020617', fontColor: '#facc15', fontSize: 12
      });
      if (label) label.textContent = 'Ângulo (' + a1.elem + '-' + a2.elem + '-' + a3.elem + '): ' + ang.toFixed(1) + '°';
      STATE.studioViewer.render();
      STATE.atomosSelecionadosParaMedicao = [];
    }
  }
  // ››› FIM: processarCliqueMedicao() — mede distâncias (2) e ângulos (3).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Limpa todas as medições geométricas.
   */
  window.limparMedicoes3D = function () {
    STATE.atomosSelecionadosParaMedicao = [];
    const l = document.getElementById('studioLastMeasurement');
    if (l) l.textContent = 'Medições redefinidas.';
    if (STATE.sdfCacheLocal && STATE.studioViewer && STATE.modeloCarregadoAtivo) {
      construirCena3D(STATE.sdfCacheLocal);
    }
  };
  // ››› FIM: limparMedicoes3D() — remove esferas/linhas e reseta cena.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handler de rotação automática 3D.
   */
  window.toggleAutoRotacao3D = function () {
    STATE.autoRotacaoAtiva = !STATE.autoRotacaoAtiva;
    const b = document.getElementById('btnAutoRotate');
    if (b) b.classList.toggle('active', STATE.autoRotacaoAtiva);
    if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
      try {
        if (STATE.autoRotacaoAtiva) STATE.studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
        else STATE.studioViewer.stopAnimate();
      } catch (e) {}
    }
    salvarPreferencias();
  };
  // ››› FIM: toggleAutoRotacao3D() — ativa/desativa rotação automática.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reseta câmera 3D (zoom + centralização).
   */
  window.resetarCamera3D = function () {
    if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
      STATE.studioViewer.zoomTo();
      STATE.studioViewer.render();
      STATE.studioViewer.resize();
    }
  };
  // ››› FIM: resetarCamera3D() — zoom + resize.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exporta imagem PNG do viewport atual (3D ou 2D).
   */
  window.exportarImagemPNG = function () {
    const nb = (STATE.compostoSelecionado ? STATE.compostoSelecionado.nome : 'molecula').replace(/\s+/g, '_');
    if (STATE.modoExibicaoAtual === '3D' && STATE.studioViewer && STATE.modeloCarregadoAtivo) {
      const a = document.createElement('a');
      a.download = nb + '_3D.png';
      a.href = STATE.studioViewer.pngURI();
      a.click();
    } else {
      const c = document.getElementById('studioCanvas2D');
      if (c) {
        const a = document.createElement('a');
        a.download = nb + '_2D.png';
        a.href = c.toDataURL('image/png');
        a.click();
      }
    }
  };
  // ››› FIM: exportarImagemPNG() — PNG 3D (viewer.pngURI) ou 2D (canvas.toDataURL).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exporta arquivo SDF 3D do composto ativo.
   */
  window.exportarArquivoSDF = function () {
    if (!STATE.sdfCacheLocal) {
      mostrarNotificacao('Sem SDF.', 'error');
      return;
    }
    const nb = (STATE.compostoSelecionado ? STATE.compostoSelecionado.nome : 'composto').replace(/\s+/g, '_');
    const blob = new Blob([STATE.sdfCacheLocal], { type: 'chemical/x-mdl-sdfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nb + '.sdf';
    a.click();
    URL.revokeObjectURL(url);
  };
  // ››› FIM: exportarArquivoSDF() — download de SDF via Blob.
  // ═══════════════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.8 — SELEÇÃO E TRANSFERÊNCIA ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Handlers de seleção de composto e transferência para a bancada.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Seleciona um composto e carrega sua estrutura completa.
   */
  window.selecionarCompostoStudio = function (comp, el, addToHist) {
    if (addToHist === undefined) addToHist = true;
    if (!comp) return;

    STATE.compostoSelecionado = comp;
    document.querySelectorAll('.compound-item').forEach(function (i) { i.classList.remove('selected'); });
    if (el) el.classList.add('selected');

    if (addToHist) pushNavegacao(comp);
    carregarEstruturaNoStudio(comp);
  };
  // ››› FIM: selecionarCompostoStudio() — atualiza seleção + carrega estrutura.
  // ››› FEEDBACK: addToHist=false evita empilhar navegação duplicada ao voltar/avançar.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Transfere o composto ativo para a bancada principal do laboratório.
   * Suporta 3 modos de comunicação: BroadcastChannel, postMessage, localStorage.
   */
  window.carregarCompostoDoStudioNaBancada = function () {
    if (!STATE.compostoSelecionado) return;

    const payload = {
      chave: STATE.compostoSelecionado.chaveOriginal,
      nome: STATE.compostoSelecionado.nome,
      smiles: STATE.compostoSelecionado.smiles,
      formula: STATE.compostoSelecionado.formula,
      molarMass: STATE.compostoSelecionado.molarMass,
      timestamp: Date.now()
    };

    if (STATE.labBroadcast) {
      STATE.labBroadcast.postMessage({ tipo: 'CARREGAR_COMPOSTO_BANCADA', composto: payload });
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ acao: 'carregarCompostoNaBancada', composto: payload }, '*');
    }

    localStorage.setItem('laift_composto_transferido', JSON.stringify(payload));

    if (window.opener) {
      window.close();
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ acao: 'fecharModalStudio' }, '*');
    } else {
      window.location.href = '../index.html';
    }
  };
  // ››› FIM: carregarCompostoDoStudioNaBancada() — envia composto para bancada.
  // ››› FEEDBACK: 3 canais redundantes — BroadcastChannel + postMessage + localStorage.
  // ═══════════════════════════════════════════════════════════════════════════

 /**
 * Helper de diagnóstico — chame window._diag() no console para ver o estado.
 */
window._diag = function () {
  console.group('🔍 DIAGNÓSTICO LAIFT');
  console.log('Composto selecionado:', STATE.compostoSelecionado
    ? STATE.compostoSelecionado.nome + ' (id=' + STATE.compostoSelecionado.id + ')'
    : '❌ NENHUM');
  console.log('SDF carregado:', STATE.sdfCacheLocal
    ? '✅ ' + STATE.sdfCacheLocal.length + ' bytes'
    : '❌ NULO');
  console.log('Átomo inspecionado:', STATE.atomoAtivoInspecionado
    ? STATE.atomoAtivoInspecionado.elem + ' (idx=' + STATE.atomoAtivoInspecionado.index + ')'
    : '❌ NENHUM');
  console.log('RDKit carregado:', STATE.RDKitModuleInstance ? '✅' : '❌');
  console.log('OCL carregado:', STATE.OCLDisponivel ? '✅' : '❌');
  console.log('Viewer 3D:', STATE.studioViewer ? '✅' : '❌');
  console.log('Modelo 3D ativo:', STATE.modeloCarregadoAtivo ? '✅' : '❌');
  console.log('Total de compostos:', STATE.compostosIndexados.length);
  console.log('Filtrados:', STATE.compostosFiltrados.length);
  console.log('Modo exibição:', STATE.modoExibicaoAtual);
  console.groupEnd();
};
// ››› FIM: _diag() — snapshot do estado completo no console.
 
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ L2.9 — BOOT (Inicialização) ▓▓▓
  // ───────────────────────────────────────────────────────────────────────────
  // Sequência de inicialização: OCL → bases → favoritos → Worker → RDKit.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicialização principal do estúdio.
   */
  async function inicializarStudio() {
    console.log('[Studio] 🚀 Iniciando v' + STUDIO_VERSION);

    carregarOCL();

    let tent = 0;
    while (tent < 10) {
      const fontes = obterFontesDeDados();
      if (fontes.labDb || fontes.synthDb) break;
      await new Promise(function (r) { setTimeout(r, 100); });
      tent++;
    }

    carregarFavoritos();

    const w = inicializarWorker();
    if (w) {
      const fontes = obterFontesDeDados();
      w.postMessage({
        tipo: 'INDEXAR',
        payload: {
          labDb: fontes.labDb,
          synthDb: fontes.synthDb,
          expandidoDb: fontes.expandidoDb,
          reserva: ACERVO_RESERVA
        }
      });
    } else {
      indexarAcervoCompletoFallback();
    }

    carregarRDKitSobDemanda();
    atualizarBotoesUndoRedo();
  }
  // ››› FIM: inicializarStudio() — sequência de boot com polling de bases.
  // ››› FEEDBACK: tenta Worker primeiro; se indisponível, cai em fallback síncrono.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listener de resize — recria viewports 3D/2D/comparação com debounce.
   */
  window.addEventListener('resize', function () {
    clearTimeout(STATE.resizeTimer);
    STATE.resizeTimer = setTimeout(function () {
      if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
        STATE.studioViewer.resize();
        STATE.studioViewer.render();
      }
      if (STATE.cmpViewerA) { try { STATE.cmpViewerA.resize(); STATE.cmpViewerA.render(); } catch (e) {} }
      if (STATE.cmpViewerB) { try { STATE.cmpViewerB.resize(); STATE.cmpViewerB.render(); } catch (e) {} }
      if (STATE.modoExibicaoAtual === '2D' && STATE.compostoSelecionado) {
        desenharEstrutura2DStudio(STATE.compostoSelecionado.smiles, STATE.compostoSelecionado.nome);
      }
    }, 200);
  });
  // ››› FIM: resize listener — sincroniza viewers 3D/2D a cada 200ms.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listener de mensagens inter-janela.
   */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.acao === 'studioAberto') {
      setTimeout(function () {
        if (STATE.studioViewer && STATE.modeloCarregadoAtivo) {
          STATE.studioViewer.resize();
          STATE.studioViewer.render();
        }
      }, 120);
    }
  });
  // ››› FIM: message listener — re-renderiza 3D ao abrir estúdio em modal.
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPARO DO BOOT
  // ═══════════════════════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarStudio);
  } else {
    inicializarStudio();
  }
  // ››› FIM: boot — espera DOMContentLoaded se ainda carregando.
  // ═══════════════════════════════════════════════════════════════════════════

})();
// FIM DO ARQUIVO studio.js — v4.1 COMPLETO
// ═══════════════════════════════════════════════════════════════════════════════
// RESUMO DE MUDANÇAS v4.0 → v4.1:
//   1. Pipeline 3D: CACTUS movido para antes de PubChem nome (mais confiável)
//   2. PubChem nome agora filtra por acentos/sufixos PT-BR (evita 404)
//   3. ACERVO_RESERVA ganhou 'Acetato de Etila' com pubchemQuery em inglês
//   4. Comentários delimitadores ▓▓▓ no início de cada módulo
//   5. Comentários ››› FIM: após cada função com feedback/resumo
//
// PRÓXIMOS PASSOS RECOMENDADOS:
//   - Testar com Ctrl+Shift+R (hard refresh) para limpar cache
//   - Verificar console para "[OCL] ✅ OpenChemLib disponível"
//   - Se OCL não carregar, verificar URL do CDN no index.html
//   - Baixar RDKit localmente para produção (vendor/rdkit/)
// ═══════════════════════════════════════════════════════════════════════════════

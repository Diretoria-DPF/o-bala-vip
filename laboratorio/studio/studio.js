/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js — v3.2 FINAL
 * Correções: RDKit locateFile, scaffold fallback, 2D robusto, adição 100%
 */

const STUDIO_VERSION = '3.2';
console.log(`%c[Studio] 🧬 LAIFT v${STUDIO_VERSION} inicializando...`, 'color:#00e5ff;font-weight:bold;font-size:14px');

(function() {
  'use strict';

  // =========================================================================
  // 0. ESTADO GLOBAL
  // =========================================================================
  let labBroadcast = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') labBroadcast = new BroadcastChannel('laift_molecular_bus');
  } catch (e) {}

  let studioViewer = null;
  let modeloCarregadoAtivo = false;
  let compostosIndexados = [];
  let compostosFiltrados = [];
  let compostoSelecionado = null;

  let modoExibicaoAtual = '3D';
  let modeloAtual = 'ballstick';
  let autoRotacaoAtiva = false;
  let modoMedicaoAtivo = false;
  let atomosSelecionadosParaMedicao = [];
  let sdfCacheLocal = null;

  let RDKitModuleInstance = null;
  let rdkitPromise = null;
  let rdkitFalhou = false;
  let ultimoDossieCADD = null;

  let atomoAtivoInspecionado = null;
  let elementoPTableSelecionado = null;
  let atomHighlightShape = null;

  const historicoNavegacao = { itens: [], indice: -1, max: 30 };
  const edicaoHistory = { undo: [], redo: [], max: 30 };
  let favoritos = new Set();
  let cmpViewerA = null, cmpViewerB = null;
  let indexerWorker = null;

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;
  let resizeTimer = null;

  const STORAGE_KEYS = {
    prefs: 'laift_studio_prefs_v3',
    favoritos: 'laift_studio_favoritos_v3',
    notas: 'laift_studio_notas_v3'
  };

  // =========================================================================
  // 1. TABELA PERIÓDICA — 118 elementos (compacta)
  // =========================================================================
  const TP_RAW = [
    [1,'H','Hidrogênio',1.008,2.20,37,[1],'nao-metal',1,1,'Pontes de H; H↔F bioisosterismo.'],
    [2,'He','Hélio',4.003,null,32,[0],'gas-nobre',18,1,'Inerte.'],
    [3,'Li','Lítio',6.94,0.98,152,[1],'alcalino',1,2,'Bipolar; inibe IMPase.'],
    [4,'Be','Berílio',9.012,1.57,112,[2],'alcalino-terroso',2,2,'Tóxico.'],
    [5,'B','Boro',10.81,2.04,85,[3,4],'metaloide',13,2,'Bortezomibe.'],
    [6,'C','Carbono',12.011,2.55,77,[4],'nao-metal',14,2,'Base da química orgânica.'],
    [7,'N','Nitrogênio',14.007,3.04,75,[3,4],'nao-metal',15,2,'Aminas; heterociclos.'],
    [8,'O','Oxigênio',15.999,3.44,73,[2],'nao-metal',16,2,'OH, C=O, éteres.'],
    [9,'F','Flúor',18.998,3.98,71,[1],'halogenio',17,2,'Bioisóstero de H.'],
    [10,'Ne','Neônio',20.18,null,69,[0],'gas-nobre',18,2,'Inerte.'],
    [11,'Na','Sódio',22.99,0.93,186,[1],'alcalino',1,3,'Contraíon de sais.'],
    [12,'Mg','Magnésio',24.305,1.31,160,[2],'alcalino-terroso',2,3,'Cofator de quinases.'],
    [13,'Al','Alumínio',26.982,1.61,143,[3],'metal-pos-transicao',13,3,'Antiácido.'],
    [14,'Si','Silício',28.085,1.90,111,[4],'metaloide',14,3,'Sila-substituição.'],
    [15,'P','Fósforo',30.974,2.19,106,[3,5],'nao-metal',15,3,'Profármacos fosfato.'],
    [16,'S','Enxofre',32.06,2.58,102,[2,4,6],'nao-metal',16,3,'Tioéteres; sulfonamidas.'],
    [17,'Cl','Cloro',35.45,3.16,99,[1,3,5,7],'halogenio',17,3,'Bolsões hidrofóbicos.'],
    [18,'Ar','Argônio',39.948,null,97,[0],'gas-nobre',18,3,'Inerte.'],
    [19,'K','Potássio',39.098,0.82,227,[1],'alcalino',1,4,'Cátion intracelular.'],
    [20,'Ca','Cálcio',40.078,1.00,197,[2],'alcalino-terroso',2,4,'Bloqueadores de canal.'],
    [21,'Sc','Escândio',44.956,1.36,162,[3],'metal-transicao',3,4,'Terras raras.'],
    [22,'Ti','Titânio',47.867,1.54,147,[2,3,4],'metal-transicao',4,4,'Implantes.'],
    [23,'V','Vanádio',50.942,1.63,134,[2,3,4,5],'metal-transicao',5,4,'Catálise.'],
    [24,'Cr','Cromo',51.996,1.66,128,[2,3,6],'metal-transicao',6,4,'Cofator de insulina.'],
    [25,'Mn','Manganês',54.938,1.55,127,[2,4,7],'metal-transicao',7,4,'SOD.'],
    [26,'Fe','Ferro',55.845,1.83,126,[2,3],'metal-transicao',8,4,'Hemoglobina.'],
    [27,'Co','Cobalto',58.933,1.88,125,[2,3],'metal-transicao',9,4,'Vitamina B12.'],
    [28,'Ni','Níquel',58.693,1.91,124,[2,3],'metal-transicao',10,4,'Catálise.'],
    [29,'Cu','Cobre',63.546,1.90,128,[1,2],'metal-transicao',11,4,'SOD, citocromo.'],
    [30,'Zn','Zinco',65.38,1.65,134,[2],'metal-transicao',12,4,'Anidrase carbônica.'],
    [31,'Ga','Gálio',69.723,1.81,135,[3],'metal-pos-transicao',13,4,'PET.'],
    [32,'Ge','Germânio',72.63,2.01,122,[4],'metaloide',14,4,'Semicondutor.'],
    [33,'As','Arsênio',74.922,2.18,119,[3,5],'metaloide',15,4,'APL.'],
    [34,'Se','Selênio',78.96,2.55,116,[2,4,6],'nao-metal',16,4,'Antioxidante.'],
    [35,'Br','Bromo',79.904,2.96,114,[1,3,5,7],'halogenio',17,4,'Halogen bond.'],
    [36,'Kr','Criptônio',83.798,3.00,110,[0,2],'gas-nobre',18,4,'Inerte.'],
    [37,'Rb','Rubídio',85.468,0.82,248,[1],'alcalino',1,5,'PET cardíaco.'],
    [38,'Sr','Estrôncio',87.62,0.95,215,[2],'alcalino-terroso',2,5,'Paliativo ósseo.'],
    [39,'Y','Ítrio',88.906,1.22,180,[3],'metal-transicao',3,5,'Radioembolização.'],
    [40,'Zr','Zircônio',91.224,1.33,160,[4],'metal-transicao',4,5,'MOFs.'],
    [41,'Nb','Nióbio',92.906,1.6,146,[3,5],'metal-transicao',5,5,'Supercondutores.'],
    [42,'Mo','Molibdênio',95.95,2.16,139,[4,6],'metal-transicao',6,5,'Xantina oxidase.'],
    [43,'Tc','Tecnécio',98,null,136,[4,7],'metal-transicao',7,5,'Tc-99m.'],
    [44,'Ru','Rutênio',101.07,2.2,134,[3,4],'metal-transicao',8,5,'Antitumoral.'],
    [45,'Rh','Ródio',102.906,2.28,134,[3],'metal-transicao',9,5,'Catálise.'],
    [46,'Pd','Paládio',106.42,2.20,137,[2,4],'metal-transicao',10,5,'Suzuki.'],
    [47,'Ag','Prata',107.868,1.93,144,[1],'metal-transicao',11,5,'Antibacteriano.'],
    [48,'Cd','Cádmio',112.414,1.69,151,[2],'metal-transicao',12,5,'Tóxico.'],
    [49,'In','Índio',114.818,1.78,167,[3],'metal-pos-transicao',13,5,'Radiofármaco.'],
    [50,'Sn','Estanho',118.71,1.96,158,[2,4],'metal-pos-transicao',14,5,'Organoestânicos.'],
    [51,'Sb','Antimônio',121.76,2.05,141,[3,5],'metaloide',15,5,'Antileishmania.'],
    [52,'Te','Telúrio',127.60,2.1,137,[2,4,6],'metaloide',16,5,'Semicondutor.'],
    [53,'I','Iodo',126.904,2.66,133,[1,3,5,7],'halogenio',17,5,'T3/T4.'],
    [54,'Xe','Xenônio',131.293,2.6,130,[0,2,4,6],'gas-nobre',18,5,'Anestésico.'],
    [55,'Cs','Césio',132.905,0.79,265,[1],'alcalino',1,6,'Relógio atômico.'],
    [56,'Ba','Bário',137.327,0.89,217,[2],'alcalino-terroso',2,6,'BaSO4.'],
    [57,'La','Lantânio',138.905,1.10,187,[3],'lantanideo',3,6,'Contraste MRI.'],
    [58,'Ce','Cério',140.116,1.12,182,[3,4],'lantanideo',3,6,'Radioisótopo.'],
    [59,'Pr','Praseodímio',140.908,1.13,182,[3],'lantanideo',3,6,'Ímãs.'],
    [60,'Nd','Neodímio',144.242,1.14,181,[3],'lantanideo',3,6,'Ímãs NdFeB.'],
    [61,'Pm','Promécio',145,null,183,[3],'lantanideo',3,6,'Baterias.'],
    [62,'Sm','Samário',150.36,1.17,180,[2,3],'lantanideo',3,6,'Dor óssea.'],
    [63,'Eu','Európio',151.964,null,180,[2,3],'lantanideo',3,6,'TR-FRET.'],
    [64,'Gd','Gadolínio',157.25,1.20,180,[3],'lantanideo',3,6,'MRI.'],
    [65,'Tb','Térbio',158.925,null,177,[3,4],'lantanideo',3,6,'Fósforos.'],
    [66,'Dy','Disprósio',162.500,1.22,178,[3],'lantanideo',3,6,'Ímãs.'],
    [67,'Ho','Hólmio',164.930,1.23,176,[3],'lantanideo',3,6,'Ho-166.'],
    [68,'Er','Érbio',167.259,1.24,176,[3],'lantanideo',3,6,'Lasers.'],
    [69,'Tm','Túlio',168.934,1.25,176,[2,3],'lantanideo',3,6,'Raio-X.'],
    [70,'Yb','Itérbio',173.045,null,176,[2,3],'lantanideo',3,6,'Lasers.'],
    [71,'Lu','Lutécio',174.967,1.27,174,[3],'lantanideo',3,6,'Lu-177.'],
    [72,'Hf','Háfnio',178.49,1.3,159,[4],'metal-transicao',4,6,'Dielétrico.'],
    [73,'Ta','Tântalo',180.948,1.5,146,[5],'metal-transicao',5,6,'Implantes.'],
    [74,'W','Tungstênio',183.84,2.36,139,[4,6],'metal-transicao',6,6,'Filamentos.'],
    [75,'Re','Rênio',186.207,1.9,137,[4,7],'metal-transicao',7,6,'Terapia óssea.'],
    [76,'Os','Ósmio',190.23,2.2,135,[4,8],'metal-transicao',8,6,'OsO4.'],
    [77,'Ir','Irídio',192.217,2.20,136,[3,4],'metal-transicao',9,6,'Antitumoral.'],
    [78,'Pt','Platina',195.084,2.28,139,[2,4],'metal-transicao',10,6,'Cisplatina.'],
    [79,'Au','Ouro',196.967,2.54,144,[1,3],'metal-transicao',11,6,'Auranofina.'],
    [80,'Hg','Mercúrio',200.592,2.00,149,[1,2],'metal-transicao',12,6,'Tóxico.'],
    [81,'Tl','Tálio',204.38,1.62,148,[1,3],'metal-pos-transicao',13,6,'Cintilografia.'],
    [82,'Pb','Chumbo',207.2,2.33,146,[2,4],'metal-pos-transicao',14,6,'Tóxico.'],
    [83,'Bi','Bismuto',208.980,2.02,148,[3,5],'metal-pos-transicao',15,6,'Pepto-Bismol.'],
    [84,'Po','Polônio',209,2.0,140,[2,4],'metaloide',16,6,'Radioativo.'],
    [85,'At','Astato',210,2.2,150,[1],'halogenio',17,6,'At-211.'],
    [86,'Rn','Radônio',222,null,150,[0,2],'gas-nobre',18,6,'Radioativo.'],
    [87,'Fr','Frâncio',223,0.7,260,[1],'alcalino',1,7,'Fr-223.'],
    [88,'Ra','Rádio',226,0.9,221,[2],'alcalino-terroso',2,7,'Xofigo.'],
    [89,'Ac','Actínio',227,1.1,195,[3],'actinideo',3,7,'Ac-225.'],
    [90,'Th','Tório',232.038,1.3,180,[4],'actinideo',3,7,'PSMA.'],
    [91,'Pa','Protactínio',231.036,1.5,180,[4,5],'actinideo',3,7,'Radioativo.'],
    [92,'U','Urânio',238.029,1.38,175,[4,6],'actinideo',3,7,'Fissão.'],
    [93,'Np','Netúnio',237,1.36,175,[5,6],'actinideo',3,7,'Radioativo.'],
    [94,'Pu','Plutônio',244,1.28,175,[3,4,5,6],'actinideo',3,7,'Armas.'],
    [95,'Am','Amerício',243,1.13,175,[3],'actinideo',3,7,'Fumaça.'],
    [96,'Cm','Cúrio',247,1.28,176,[3],'actinideo',3,7,'Raio-X.'],
    [97,'Bk','Berquélio',247,1.3,170,[3,4],'actinideo',3,7,'Sintético.'],
    [98,'Cf','Califórnio',251,1.3,169,[3,4],'actinideo',3,7,'Nêutrons.'],
    [99,'Es','Einstênio',252,1.3,168,[3],'actinideo',3,7,'Sintético.'],
    [100,'Fm','Férmio',257,1.3,167,[3],'actinideo',3,7,'Sintético.'],
    [101,'Md','Mendelévio',258,1.3,166,[2,3],'actinideo',3,7,'Sintético.'],
    [102,'No','Nobélio',259,1.3,165,[2,3],'actinideo',3,7,'Sintético.'],
    [103,'Lr','Laurêncio',262,null,164,[3],'actinideo',3,7,'Sintético.'],
    [104,'Rf','Rutherfórdio',267,null,null,[4],'metal-transicao',4,7,'Sintético.'],
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
    [117,'Ts','Tenesso',294,null,null,[1],'halogenio',17,7,'Sintético.'],
    [118,'Og','Oganessônio',294,null,null,[0,2],'gas-nobre',18,7,'Sintético.']
  ];

  const TABELA_PERIODICA = TP_RAW.map(a => ({
    z: a[0], sym: a[1], nome: a[2], massa: a[3], eletron: a[4], raio: a[5],
    valencias: a[6], cat: a[7], grupo: a[8], periodo: a[9], pharma: a[10]
  }));

  const POSICOES_PTABLE = (() => {
    const pos = {};
    TABELA_PERIODICA.forEach(e => {
      if (e.z >= 57 && e.z <= 71) pos[e.sym] = { r: 8, c: 3 + (e.z - 57) };
      else if (e.z >= 89 && e.z <= 103) pos[e.sym] = { r: 9, c: 3 + (e.z - 89) };
      else pos[e.sym] = { r: e.periodo, c: e.grupo };
    });
    return pos;
  })();

  // =========================================================================
  // 2. BIOISOSTERISMO
  // =========================================================================
  const REACOES_BIOISOSTERISMO = [
    { id: 'carboxila_tetrazol', nome: 'Bioisóstero de Tetrazol', tag: 'Não-Clássico', esquema: 'R-COOH ➔ R-Tetrazol', descricao: '10× mais lipofílico.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'c1nnn[nH]1') },
    { id: 'esterificacao_metilica', nome: 'Éster Metílico', tag: 'Pró-fármaco', esquema: 'R-COOH ➔ R-COOCH₃', descricao: 'Regenerado por esterases.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)OC') },
    { id: 'amidacao_primaria', nome: 'Amidação', tag: 'Clássico', esquema: 'R-COOH ➔ R-CONH₂', descricao: 'Neutraliza acidez.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)N') },
    { id: 'o_metilacao', nome: 'O-Metilação', tag: 'Fase II', esquema: 'Ar-OH ➔ Ar-OCH₃', descricao: 'Bloqueia glicuronidação.', alvoSmarts: '[OH]', detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s) || /O[H]/i.test(s), transformar: (s) => s.replace(/c\(O\)/i, 'c(OC)').replace(/\[OH\]/i, 'OC').replace(/O[H]/i, 'OC') },
    { id: 'o_acetilacao', nome: 'O-Acetilação', tag: 'Atenuação', esquema: 'Ar-OH ➔ Ar-OCOCH₃', descricao: 'Salicílico ➔ Aspirina.', alvoSmarts: 'c[OH]', detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s), transformar: (s) => s.replace(/c\(O\)/i, 'c(OC(=O)C)').replace(/\[OH\]/i, 'OC(=O)C') },
    { id: 'n_acetilacao', nome: 'N-Acetilação', tag: 'Analgésica', esquema: 'Ar-NH₂ ➔ Ar-NHCOCH₃', descricao: '4-Aminofenol ➔ Paracetamol.', alvoSmarts: '[NH2]', detectar: (s) => /N/i.test(s) && !/N\(=O\)/i.test(s), transformar: (s) => s.replace(/NC/i, 'N(C(=O)C)C').replace(/\[NH2\]/i, 'NC(=O)C') },
    { id: 'fluorizacao_aromatica', nome: 'Fluorização', tag: 'H ➔ F', esquema: 'Ar-H ➔ Ar-F', descricao: 'Bloqueia CYP450.', alvoSmarts: 'c1ccccc1', detectar: (s) => /c1ccccc1/i.test(s), transformar: (s) => s.replace(/c1ccccc1/i, 'c1ccc(F)cc1').replace(/c1/i, 'c1(F)') }
  ];

  const PAINS_SUBSTRUCTURES = [
    { nome: 'Quinona', smarts: 'O=C1C=CC(=O)C=C1', risco: 'Aceptor de Michael redox.' },
    { nome: 'Catecol', smarts: 'c1cc(O)c(O)cc1', risco: 'Oxida a orto-quinona.' },
    { nome: 'Hidroquinona', smarts: 'OC1=CC=C(O)C=C1', risco: 'Interferência redox.' },
    { nome: 'Rodanina', smarts: 'S1C(=O)NC(=O)C1', risco: 'Eletrófilo promíscuo.' },
    { nome: 'Michael', smarts: '[CX3]=[CX3][CX3]=O', risco: 'Reatividade tiol.' },
    { nome: 'Azo', smarts: 'N=NC', risco: 'Aminas carcinogênicas.' },
    { nome: 'Nitroaromático', smarts: '[$([NX3](=O)=O),$([NX3+](=O)[O-])][c]', risco: 'Radical tóxico.' },
    { nome: 'Epóxido', smarts: 'C1OC1', risco: 'Alquilante DNA.' },
    { nome: 'Aziridina', smarts: 'C1CN1', risco: 'Alquilante DNA.' },
    { nome: 'Aldeído Reativo', smarts: '[CX3H1](=O)[#6]', risco: 'Bases de Schiff.' },
    { nome: 'Haleto de Acila', smarts: '[CX3](=O)[Cl,Br,I]', risco: 'Acilante.' },
    { nome: 'Anidrido', smarts: '[CX3](=O)[OX2][CX3](=O)', risco: 'Acilante bifuncional.' },
    { nome: 'Isocianato', smarts: '[NX2]=[CX2]=[OX1]', risco: 'Carbamoilante.' },
    { nome: 'Tiois', smarts: '[SX2H]', risco: 'Oxidação.' },
    { nome: 'Enona', smarts: 'C=CC=O', risco: 'Michael α,β-insatur.' },
    { nome: 'Furanos', smarts: 'c1ccoc1', risco: 'Epóxido furânico.' },
    { nome: 'Hidrazina', smarts: '[NX3][NX3]', risco: 'Hidrazonas.' },
    { nome: 'Peróxido', smarts: '[OX2][OX2]', risco: 'Radicais livres.' }
  ];

  // =========================================================================
  // 3. TOASTS
  // =========================================================================
  function mostrarNotificacao(mensagem, tipo = 'info', duracaoMs = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duracaoMs);
  }
  window.mostrarNotificacao = mostrarNotificacao;

  // =========================================================================
  // 4. PERSISTÊNCIA
  // =========================================================================
  function salvarPreferencias() {
    try {
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify({
        modoExibicaoAtual, modeloAtual, autoRotacaoAtiva,
        categoriaAtiva: document.querySelector('.category-pill.active')?.dataset.cat || 'todas'
      }));
    } catch (e) {}
  }
  function carregarPreferencias() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.prefs);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.modoExibicaoAtual) setStudioModoVisual(p.modoExibicaoAtual);
      if (p.modeloAtual) setModelo3D(p.modeloAtual);
      if (p.categoriaAtiva && p.categoriaAtiva !== 'todas') filtrarCategoriaStudio(p.categoriaAtiva);
    } catch (e) {}
  }
  function carregarFavoritos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.favoritos);
      if (raw) favoritos = new Set(JSON.parse(raw));
    } catch (e) { favoritos = new Set(); }
  }
  function salvarFavoritos() {
    try { localStorage.setItem(STORAGE_KEYS.favoritos, JSON.stringify(Array.from(favoritos))); } catch (e) {}
  }
  function atualizarBotaoFavorito() {
    const btn = document.getElementById('btnFavoriteCurrent');
    if (!btn || !compostoSelecionado) return;
    btn.style.display = 'inline-flex';
    const isFav = favoritos.has(compostoSelecionado.id);
    btn.classList.toggle('is-active', isFav);
    btn.textContent = isFav ? '★' : '☆';
    btn.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  }
  window.alternarFavoritoAtual = function() {
    if (!compostoSelecionado) return;
    if (favoritos.has(compostoSelecionado.id)) {
      favoritos.delete(compostoSelecionado.id);
      mostrarNotificacao('Removido dos favoritos.', 'info');
    } else {
      favoritos.add(compostoSelecionado.id);
      mostrarNotificacao('Adicionado aos favoritos.', 'success');
    }
    salvarFavoritos();
    atualizarBotaoFavorito();
    renderizarListaCompostos(true);
  };

  // =========================================================================
  // 5. UNDO / REDO
  // =========================================================================
  function atualizarBotoesUndoRedo() {
    const bU = document.getElementById('btnUndo');
    const bR = document.getElementById('btnRedo');
    if (bU) bU.disabled = edicaoHistory.undo.length === 0;
    if (bR) bR.disabled = edicaoHistory.redo.length === 0;
  }
  function pushEdicaoSnapshot(composto, sdf, motivo) {
    edicaoHistory.undo.push({ composto: JSON.parse(JSON.stringify(composto)), sdf, motivo, timestamp: Date.now() });
    if (edicaoHistory.undo.length > edicaoHistory.max) edicaoHistory.undo.shift();
    edicaoHistory.redo = [];
    atualizarBotoesUndoRedo();
  }
  window.desfazerEdicao = function() {
    if (edicaoHistory.undo.length < 2) { mostrarNotificacao('Nada para desfazer.', 'info'); return; }
    const atual = edicaoHistory.undo.pop();
    edicaoHistory.redo.push(atual);
    const anterior = edicaoHistory.undo[edicaoHistory.undo.length - 1];
    compostoSelecionado = anterior.composto;
    sdfCacheLocal = anterior.sdf;
    if (sdfCacheLocal) construirCena3D(sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação desfeita.', 'info');
  };
  window.refazerEdicao = function() {
    if (edicaoHistory.redo.length === 0) { mostrarNotificacao('Nada para refazer.', 'info'); return; }
    const prox = edicaoHistory.redo.pop();
    edicaoHistory.undo.push(prox);
    compostoSelecionado = prox.composto;
    sdfCacheLocal = prox.sdf;
    if (sdfCacheLocal) construirCena3D(sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação refeita.', 'info');
  };

  // =========================================================================
  // 6. HISTÓRICO
  // =========================================================================
  function pushNavegacao(comp) {
    if (!comp) return;
    const ultimo = historicoNavegacao.itens[historicoNavegacao.itens.length - 1];
    if (ultimo && ultimo.id === comp.id) return;
    historicoNavegacao.itens.push({ id: comp.id, nome: comp.nome, ref: comp });
    if (historicoNavegacao.itens.length > historicoNavegacao.max) historicoNavegacao.itens.shift();
    historicoNavegacao.indice = historicoNavegacao.itens.length - 1;
  }
  window.irParaAnterior = function() {
    if (historicoNavegacao.indice <= 0) { mostrarNotificacao('Início do histórico.', 'info'); return; }
    historicoNavegacao.indice--;
    selecionarCompostoStudio(historicoNavegacao.itens[historicoNavegacao.indice].ref, null, false);
  };
  window.irParaProximo = function() {
    if (historicoNavegacao.indice >= historicoNavegacao.itens.length - 1) { mostrarNotificacao('Fim do histórico.', 'info'); return; }
    historicoNavegacao.indice++;
    selecionarCompostoStudio(historicoNavegacao.itens[historicoNavegacao.indice].ref, null, false);
  };

  // =========================================================================
  // 7. MODO APRESENTAÇÃO
  // =========================================================================
  window.alternarModoApresentacao = function() {
    const ativo = document.body.classList.toggle('presentation-mode');
    const hint = document.getElementById('presentationExitHint');
    if (hint) hint.style.display = ativo ? 'block' : 'none';
    if (studioViewer && modeloCarregadoAtivo) setTimeout(() => { studioViewer.resize(); studioViewer.render(); }, 250);
    if (document.documentElement.requestFullscreen && ativo) document.documentElement.requestFullscreen().catch(() => {});
    else if (document.exitFullscreen && !ativo && document.fullscreenElement) document.exitFullscreen();
  };

  // =========================================================================
  // 8. WEB WORKER
  // =========================================================================
  function inicializarWorker() {
    if (indexerWorker) return indexerWorker;
    try {
      indexerWorker = new Worker('workers/indexer.worker.js');
      indexerWorker.onmessage = (e) => {
        const { tipo } = e.data;
        if (tipo === 'PROGRESSO') exibirStatusRDKit(true, e.data.etapa + ' ' + (e.data.percentual || 0) + '%');
        else if (tipo === 'INDEXADO') {
          exibirStatusRDKit(false);
          compostosIndexados = e.data.compostos;
          compostosFiltrados = [...compostosIndexados];
          const totalBadge = document.getElementById('studioTotalBadge');
          if (totalBadge) totalBadge.textContent = `${compostosIndexados.length} Espécies`;
          renderizarListaCompostos(true);
          carregarPreferencias();
          if (compostosIndexados.length > 0) {
            const primeiro = document.querySelector('.compound-item');
            selecionarCompostoStudio(compostosIndexados[0], primeiro);
          }
        } else if (tipo === 'ERRO') {
          exibirStatusRDKit(false);
          indexarAcervoCompletoFallback();
        }
      };
      indexerWorker.onerror = () => { indexarAcervoCompletoFallback(); };
      return indexerWorker;
    } catch (e) { return null; }
  }

  // =========================================================================
  // 9. INGESTÃO FALLBACK
  // =========================================================================
  function obterFontesDeDados() {
    const labDb = window.LAB_DATABASE || (window.parent && window.parent.LAB_DATABASE) || (window.opener && window.opener.LAB_DATABASE) || null;
    const synthDb = window.BANCO_SINTESES_LAIFT || (window.parent && window.parent.BANCO_SINTESES_LAIFT) || (window.opener && window.opener.BANCO_SINTESES_LAIFT) || null;
    const expandidoDb = window.BANCO_COMPOSTOS_EXPANDIDO || (window.parent && window.parent.BANCO_COMPOSTOS_EXPANDIDO) || (window.opener && window.opener.BANCO_COMPOSTOS_EXPANDIDO) || null;
    return { labDb, synthDb, expandidoDb };
  }
  const ACERVO_RESERVA = [
    { id: "AAS", chaveOriginal: "AAS_s", nome: "Ácido Acetilsalicílico (Aspirina)", formula: "C9H8O4", molarMass: 180.16, smiles: "CC(=O)OC1=CC=CC=C1C(=O)O", categoria: "farmacos", pubchemQuery: "Aspirin" },
    { id: "Paracetamol", chaveOriginal: "Paracetamol_s", nome: "Paracetamol", formula: "C8H9NO2", molarMass: 151.16, smiles: "CC(=O)NC1=CC=C(O)C=C1", categoria: "farmacos", pubchemQuery: "Acetaminophen" },
    { id: "Dipirona", chaveOriginal: "Dipirona_s", nome: "Dipirona Sódica", formula: "C13H16N3NaO4S", molarMass: 333.34, smiles: "CN(CS(=O)(=O)[O-])C1=C(C)N(N1C)C2=CC=CC=C2.[Na+]", categoria: "farmacos", pubchemQuery: "Metamizole" },
    { id: "Ibuprofeno", chaveOriginal: "C13H18O2_s", nome: "Ibuprofeno", formula: "C13H18O2", molarMass: 206.28, smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O", categoria: "farmacos", pubchemQuery: "Ibuprofen" },
    { id: "Cafeina", chaveOriginal: "Cafeina_s", nome: "Cafeína", formula: "C8H10N4O2", molarMass: 194.19, smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", categoria: "farmacos", pubchemQuery: "Caffeine" },
    { id: "AcidoSalicilico", chaveOriginal: "AcidoSalicilico_s", nome: "Ácido Salicílico", formula: "C7H6O3", molarMass: 138.12, smiles: "O=C(O)C1=CC=CC=C1O", categoria: "reagentes", pubchemQuery: "Salicylic acid" },
    { id: "AnidridoAcetico", chaveOriginal: "AnidridoAcetico_l", nome: "Anidrido Acético", formula: "C4H6O3", molarMass: 102.09, smiles: "CC(=O)OC(=O)C", categoria: "reagentes", pubchemQuery: "Acetic anhydride" },
    { id: "pAminofenol", chaveOriginal: "pAminofenol_s", nome: "4-Aminofenol", formula: "C6H7NO", molarMass: 109.13, smiles: "NC1=CC=C(O)C=C1", categoria: "reagentes", pubchemQuery: "4-Aminophenol" },
    { id: "Etanol", chaveOriginal: "Etanol_l", nome: "Etanol", formula: "C2H6O", molarMass: 46.07, smiles: "CCO", categoria: "solventes", pubchemQuery: "Ethanol" },
    { id: "Metanol", chaveOriginal: "Metanol_l", nome: "Metanol", formula: "CH4O", molarMass: 32.04, smiles: "CO", categoria: "solventes", pubchemQuery: "Methanol" },
    { id: "Acetona", chaveOriginal: "Acetona_l", nome: "Acetona", formula: "C3H6O", molarMass: 58.08, smiles: "CC(=O)C", categoria: "solventes", pubchemQuery: "Acetone" },
    { id: "Hexano", chaveOriginal: "Hexano_l", nome: "Hexano", formula: "C6H14", molarMass: 86.18, smiles: "CCCCCC", categoria: "solventes", pubchemQuery: "Hexane" },
    { id: "Cloroformio", chaveOriginal: "Cloroformio_l", nome: "Clorofórmio", formula: "CHCl3", molarMass: 119.38, smiles: "ClC(Cl)Cl", categoria: "solventes", pubchemQuery: "Chloroform" },
    { id: "Na", chaveOriginal: "Na_s", nome: "Sódio", formula: "Na", molarMass: 22.99, smiles: "[Na]", categoria: "reagentes", pubchemQuery: "Sodium" }
  ];

  function indexarAcervoCompletoFallback() {
    const mapaUnico = new Map();
    const { labDb, synthDb, expandidoDb } = obterFontesDeDados();
    if (labDb && labDb.species) {
      Object.entries(labDb.species).forEach(([chave, dados]) => {
        const id = chave.replace(/_s|_l|_aq|_g/g, '');
        mapaUnico.set(id.toLowerCase(), {
          id, chaveOriginal: chave, nome: dados.label || id,
          formula: dados.formula || '--', molarMass: dados.molarMass || '--',
          smiles: dados.smiles || '--', categoria: classificarCategoria(chave, dados.label),
          pubchemQuery: dados.pubchemQuery || dados.label || id
        });
      });
    }
    if (synthDb && Array.isArray(synthDb)) {
      synthDb.forEach(synth => {
        if (!synth || !synth.nomeComposto) return;
        const id = synth.produtoId || synth.id || synth.nomeComposto;
        const norm = id.toLowerCase();
        if (!mapaUnico.has(norm)) {
          mapaUnico.set(norm, {
            id, chaveOriginal: synth.produtoId || synth.id, nome: synth.nomeComposto,
            formula: synth.formula || '--', molarMass: synth.molarMass || '--',
            smiles: synth.smiles || '--', categoria: 'farmacos',
            pubchemQuery: synth.nomeComposto
          });
        }
      });
    }
    if (expandidoDb && Array.isArray(expandidoDb)) {
      expandidoDb.forEach(c => {
        if (!c || !c.nome) return;
        const norm = (c.id || c.nome).toLowerCase();
        if (!mapaUnico.has(norm)) {
          mapaUnico.set(norm, {
            id: c.id || c.nome, chaveOriginal: c.chave || c.id || c.nome,
            nome: c.nome, formula: c.formula || '--', molarMass: c.molarMass || '--',
            smiles: c.smiles || '--', categoria: c.categoria || 'reagentes',
            pubchemQuery: c.pubchemQuery || c.nome
          });
        }
      });
    }
    ACERVO_RESERVA.forEach(comp => {
      const norm = comp.id.toLowerCase();
      if (!mapaUnico.has(norm)) mapaUnico.set(norm, comp);
    });
    compostosIndexados = Array.from(mapaUnico.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    compostosFiltrados = [...compostosIndexados];
    const totalBadge = document.getElementById('studioTotalBadge');
    if (totalBadge) totalBadge.textContent = `${compostosIndexados.length} Espécies`;
    renderizarListaCompostos(true);
    carregarPreferencias();
    if (compostosIndexados.length > 0) {
      const primeiro = document.querySelector('.compound-item');
      selecionarCompostoStudio(compostosIndexados[0], primeiro);
    }
  }
  function classificarCategoria(chave, label) {
    const txt = ((chave || '') + ' ' + (label || '')).toLowerCase();
    if (/custom|derivado/.test(txt)) return 'custom';
    if (/sarin|vx|estricnina|toxina/.test(txt)) return 'toxicos';
    if (/agua|etanol|metanol|acetona|hexano|cloroformio/.test(txt)) return 'solventes';
    if (/acido|hidroxido|cloreto|sulfato|anidrido|sodio/.test(txt)) return 'reagentes';
    return 'farmacos';
  }

  // =========================================================================
  // 10. LISTA
  // =========================================================================
  function renderizarListaCompostos(reset = true) {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;
    if (reset) { listContainer.innerHTML = ''; currentRenderedIndex = 0; listContainer.scrollTop = 0; }
    const fatia = compostosFiltrados.slice(currentRenderedIndex, currentRenderedIndex + ITEMS_PER_CHUNK);
    if (fatia.length === 0 && reset) {
      listContainer.innerHTML = `<div style="padding:24px; color:#64748b; text-align:center; font-size:0.75rem;">Nenhum composto.</div>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    fatia.forEach(comp => {
      const isFav = favoritos.has(comp.id);
      const isUnstable = comp.unstable === true;
      const itemEl = document.createElement('div');
      itemEl.className = 'compound-item' + (compostoSelecionado?.id === comp.id ? ' selected' : '') + (isUnstable ? ' unstable' : '');
      itemEl.onclick = () => selecionarCompostoStudio(comp, itemEl);
      const massaDisplay = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(1)}` : '--';
      const isCustom = comp.categoria === 'custom';
      itemEl.innerHTML = `
        ${isFav ? '<span class="comp-favorite-star">★</span>' : ''}
        ${isUnstable ? '<span class="comp-unstable-flag">⚠️</span>' : ''}
        <div class="comp-info-main">
          <span class="comp-name" title="${comp.nome}">${isCustom ? '🧬 ' : ''}${comp.nome}</span>
          <span class="comp-formula">${comp.formula}</span>
        </div>
        <span class="comp-badge-mass">${massaDisplay}</span>
      `;
      fragment.appendChild(itemEl);
    });
    listContainer.appendChild(fragment);
    currentRenderedIndex += fatia.length;
    const countEl = document.getElementById('studioFilteredCount');
    if (countEl) countEl.textContent = `${compostosFiltrados.length} compostos visíveis`;
  }
  window.handleStudioScroll = function() {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;
    if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 70) {
      if (currentRenderedIndex < compostosFiltrados.length) renderizarListaCompostos(false);
    }
  };
  window.filtrarCompostosStudio = function(termo) {
    clearTimeout(debounceBuscaTimer);
    debounceBuscaTimer = setTimeout(() => {
      const q = (termo || '').trim().toLowerCase();
      const cat = document.querySelector('.category-pill.active')?.dataset.cat || 'todas';
      compostosFiltrados = compostosIndexados.filter(c => {
        const mQ = c.nome.toLowerCase().includes(q) || c.formula.toLowerCase().includes(q) || c.smiles.toLowerCase().includes(q);
        const mC = cat === 'todas' || (cat === 'favoritos' && favoritos.has(c.id)) || c.categoria === cat;
        return mQ && mC;
      });
      renderizarListaCompostos(true);
    }, 120);
  };
  window.filtrarCategoriaStudio = function(cat) {
    document.querySelectorAll('.category-pill').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    const input = document.getElementById('studioSearchInput');
    const q = (input ? input.value : '').trim().toLowerCase();
    compostosFiltrados = compostosIndexados.filter(c => {
      const mC = cat === 'todas' || (cat === 'favoritos' && favoritos.has(c.id)) || c.categoria === cat;
      const mQ = !q || c.nome.toLowerCase().includes(q) || c.formula.toLowerCase().includes(q) || c.smiles.toLowerCase().includes(q);
      return mC && mQ;
    });
    renderizarListaCompostos(true);
    salvarPreferencias();
  };

  // =========================================================================
  // 11. RDKIT — CORRIGIDO com locateFile
  // =========================================================================
  function carregarRDKitSobDemanda() {
    if (RDKitModuleInstance) return Promise.resolve(RDKitModuleInstance);
    if (rdkitFalhou) return Promise.resolve(null);
    if (rdkitPromise) return rdkitPromise;

    rdkitPromise = new Promise(async (resolve) => {
      exibirStatusRDKit(true, "Carregando RDKit WASM...");
      console.log('[RDKit] Iniciando carregamento...');

      const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout " + ms + "ms")), ms));

      async function tentarInit() {
        if (typeof window.initRDKitModule !== 'function') {
          throw new Error('initRDKitModule ausente');
        }
        // ⚠️ CRÍTICO: locateFile para apontar o .wasm correto
        const config = {
          locateFile: (file) => {
            console.log('[RDKit] Solicitando arquivo:', file);
            return `https://unpkg.com/@rdkit/rdkit/dist/${file}`;
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

      try {
        RDKitModuleInstance = await tentarInit();
        console.log('[RDKit] ✅ Carregado. Teste:', RDKitModuleInstance.get_mol('CCO') ? 'OK' : 'FALHOU');
        exibirStatusRDKit(false);
        mostrarNotificacao('✅ RDKit ativo', 'success', 2000);
        resolve(RDKitModuleInstance);
      } catch (err) {
        console.warn('[RDKit] ❌ Falha:', err.message);
        // Retry uma vez
        try {
          await new Promise(r => setTimeout(r, 1500));
          RDKitModuleInstance = await tentarInit();
          console.log('[RDKit] ✅ Retry OK');
          exibirStatusRDKit(false);
          resolve(RDKitModuleInstance);
          return;
        } catch (err2) {
          console.warn('[RDKit] ❌ Retry falhou:', err2.message);
        }
        rdkitFalhou = true;
        exibirStatusRDKit(false);
        mostrarNotificacao('⚠️ RDKit offline — usando heurísticas', 'warning', 5000);
        resolve(null);
      }
    });

    return rdkitPromise;
  }
  function exibirStatusRDKit(visivel, texto = "") {
    const ind = document.getElementById('rdkitIndicator');
    const txt = document.getElementById('rdkitIndicatorText');
    if (txt) txt.textContent = texto;
    if (ind) ind.style.display = visivel ? 'flex' : 'none';
  }

  // =========================================================================
  // 12. QUIMIOMETRIA — com fallback heurístico
  // =========================================================================
  function extrairSmilesPrincipal(smiles) {
    if (!smiles) return null;
    if (!smiles.includes('.')) return smiles;
    const partes = smiles.split('.').filter(p => p && p.length > 1 && !/^\[(Na|K|Li|Ca|Mg|Cl|Br|NH4)[+-]?\]$/.test(p));
    if (partes.length === 0) return null;
    return partes.sort((a, b) => b.length - a.length)[0];
  }

  async function calcularPropriedadesMoleculares(smiles, molarMass) {
    const rdkit = await carregarRDKitSobDemanda();
    const smilesLimpo = extrairSmilesPrincipal(smiles);
    if (!rdkit || !smilesLimpo || smilesLimpo.startsWith('RADICAL_')) {
      return calcularPropriedadesFallback(smiles, molarMass);
    }
    try {
      const mol = rdkit.get_mol(smilesLimpo);
      if (!mol) return calcularPropriedadesFallback(smiles, molarMass);
      let desc = {};
      try { desc = JSON.parse(mol.get_descriptors()); } catch (e) {}

      const mw = (typeof molarMass === 'number' && molarMass > 0) ? molarMass : (desc.exactmw || desc.amw || 0);
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
      for (const p of PAINS_SUBSTRUCTURES) {
        try {
          const q = rdkit.get_qmol(p.smarts);
          if (!q) continue;
          const matchStr = mol.get_substruct_match(q);
          q.delete();
          if (matchStr && matchStr !== "{}" && matchStr !== "" && matchStr.includes("atoms")) alertasPAINS.push(p);
        } catch (e) {}
      }
      mol.delete();

      const fl = [], fv = [], fg = [];
      if (mw > 500) fl.push("MW>500");
      if (logp > 5) fl.push("LogP>5");
      if (hbd > 5) fl.push("HBD>5");
      if (hba > 10) fl.push("HBA>10");
      if (rotb > 10) fv.push("RotB>10");
      if (tpsa > 140) fv.push("TPSA>140");
      if (mw < 160 || mw > 480) fg.push("MW");
      if (logp < -0.4 || logp > 5.6) fg.push("LogP");
      if (mr < 40 || mr > 130) fg.push("MR");
      if (totalAtoms < 20 || totalAtoms > 70) fg.push("Atoms");

      return { mw, logp, mr, tpsa, hbd, hba, rotb, heavyAtoms, totalAtoms, csp3, falhasLipinski: fl, falhasVeber: fv, falhasGhose: fg, alertasPAINS };
    } catch (e) {
      return calcularPropriedadesFallback(smiles, molarMass);
    }
  }

  function calcularPropriedadesFallback(smiles, molarMass) {
    if (!smiles || smiles === '--') return null;
    const s = smiles;
    const cCount = (s.match(/C(?![a-z])/g) || []).length;
    const nCount = (s.match(/N(?![a-z])/g) || []).length;
    const oCount = (s.match(/O(?![a-z])/g) || []).length;
    const sCount = (s.match(/S(?![a-z])/g) || []).length;
    const halCount = (s.match(/(F|Cl|Br|I)/g) || []).length;
    const aromCount = (s.match(/[cnops]/g) || []).length;
    const rotB = (s.match(/-/g) || []).length;
    const mw = (typeof molarMass === 'number' && molarMass > 0) ? molarMass :
               cCount * 12 + nCount * 14 + oCount * 16 + sCount * 32 + halCount * 35;
    // Estimativas grosseiras
    const logp = (cCount - nCount - oCount) * 0.5 + halCount * 0.8;
    const tpsa = (nCount + oCount * 2) * 12;
    return {
      mw, logp: Math.round(logp * 100) / 100, mr: cCount * 5,
      tpsa, hbd: nCount + oCount, hba: nCount + oCount, rotb: rotB,
      heavyAtoms: cCount + nCount + oCount + sCount + halCount,
      totalAtoms: cCount + nCount + oCount + sCount + halCount,
      csp3: aromCount > 0 ? 0.2 : 0.5,
      falhasLipinski: mw > 500 ? ["MW>500"] : [],
      falhasVeber: tpsa > 140 ? ["TPSA>140"] : [],
      falhasGhose: [],
      alertasPAINS: [],
      _fallback: true
    };
  }

  async function avaliarQuimiometriaCompleta(smiles, molarMass, nome) {
    const bL = document.getElementById('badgeLipinski'), bV = document.getElementById('badgeVeber'),
          bG = document.getElementById('badgeGhose'), bP = document.getElementById('badgePAINS');
    if (!bL || !bV || !bG || !bP) return;
    if (!smiles || smiles === '--') {
      [bL, bV, bG, bP].forEach(b => { b.className = 'cadd-badge badge-pending'; });
      bL.textContent = 'Lipinski: N/A'; bV.textContent = 'Veber: N/A'; bG.textContent = 'Ghose: N/A'; bP.textContent = 'PAINS: N/A';
      ultimoDossieCADD = null;
      return;
    }
    const p = await calcularPropriedadesMoleculares(smiles, molarMass);
    if (!p) { [bL, bV, bG, bP].forEach(b => { b.className = 'cadd-badge badge-pending'; }); return; }

    const est = p._fallback ? ' (est.)' : '';
    bL.className = 'cadd-badge ' + (p.falhasLipinski.length === 0 ? 'badge-approved' : p.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected');
    bL.textContent = (p.falhasLipinski.length === 0 ? 'Lipinski: OK' : `Lipinski: ${p.falhasLipinski.length}`) + est;
    bV.className = 'cadd-badge ' + (p.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected');
    bV.textContent = (p.falhasVeber.length === 0 ? 'Veber: OK' : `Veber: ${p.falhasVeber.length}`) + est;
    bG.className = 'cadd-badge ' + (p.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected');
    bG.textContent = (p.falhasGhose.length === 0 ? 'Ghose: OK' : `Ghose: ${p.falhasGhose.length}`) + est;
    bP.className = 'cadd-badge ' + (p.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected');
    bP.textContent = (p.alertasPAINS.length === 0 ? 'PAINS: OK' : `PAINS: ${p.alertasPAINS.length}`) + est;
    ultimoDossieCADD = { ...p, nome, smiles };
  }

  // =========================================================================
  // 13. INSPEÇÃO ATÔMICA
  // =========================================================================
  function selecionarEInspecionarAtomo(atom) {
    if (!studioViewer || !atom) return;
    atomoAtivoInspecionado = atom;
    try {
      if (atomHighlightShape) studioViewer.removeShape(atomHighlightShape);
      atomHighlightShape = studioViewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.42, color: '#00e5ff', opacity: 0.55 });
      studioViewer.render();
    } catch (e) {}
    const sym = (atom.elem || 'C').toUpperCase();
    const ed = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === sym) || { z: '?', sym, nome: 'Elemento', massa: '--', eletron: '--', raio: '--', valencias: [1] };
    const viz = [];
    const nLig = atom.bonds ? atom.bonds.length : 0;
    if (atom.bonds && Array.isArray(atom.bonds)) {
      const all = studioViewer.selectedAtoms({}) || [];
      atom.bonds.forEach(bIdx => {
        const v = all.find(a => (a.serial === bIdx || a.index === bIdx));
        if (v) viz.push(`${v.elem}#${(v.serial || v.index || 0) + 1}`);
      });
    }
    const hud = document.getElementById('atomInspectorHud');
    if (hud) {
      document.getElementById('hudAtomBadge').textContent = ed.sym;
      document.getElementById('hudAtomTitle').textContent = `${ed.nome} (${ed.sym}) — #${(atom.serial || atom.index || 0) + 1}`;
      document.getElementById('hudAtomSub').textContent = `(${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)}) • ${nLig} lig.`;
      document.getElementById('hudAtomEletron').textContent = ed.eletron ? `${ed.eletron}` : 'Inerte';
      document.getElementById('hudAtomRaio').textContent = ed.raio ? `${ed.raio} pm` : '--';
      document.getElementById('hudAtomNeighbors').textContent = viz.length > 0 ? viz.join(', ') : 'Isolado';
      hud.style.display = 'flex';
    }
    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) hudLabel.textContent = `${ed.nome} (${ed.sym}) • ${nLig} ligações`;
  }
  window.fecharInspectorAtomo = function() {
    const hud = document.getElementById('atomInspectorHud');
    if (hud) hud.style.display = 'none';
    if (studioViewer && atomHighlightShape) {
      try { studioViewer.removeShape(atomHighlightShape); atomHighlightShape = null; studioViewer.render(); } catch (e) {}
    }
  };
  window.substituirAtomoClicadoViaTabela = function() {
    if (!atomoAtivoInspecionado) return;
    window.abrirTabelaPeriodica(atomoAtivoInspecionado);
  };

  // =========================================================================
  // 14. SDF HELPERS
  // =========================================================================
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
    return { atoms, bonds, numAtoms, numBonds, linhas };
  }

  function reconstruirSDF(parsed, atoms, bonds, marcarInstavel) {
    const L = [];
    L.push(parsed.linhas[0] || 'LAIFT-MODIFIED');
    L.push(parsed.linhas[1] || '  LAIFT 3D EDITOR');
    L.push(parsed.linhas[2] || '');
    L.push(`${String(atoms.length).padStart(3, ' ')}${String(bonds.length).padStart(3, ' ')}  0  0  0  0  0  0  0  0999 V2000`);
    atoms.forEach(a => {
      const x = a.x.toFixed(4).padStart(10, ' ');
      const y = a.y.toFixed(4).padStart(10, ' ');
      const z = a.z.toFixed(4).padStart(10, ' ');
      const el = (a.elem || 'C').padEnd(3, ' ').substring(0, 3);
      L.push(`${x}${y}${z} ${el} 0  0  0  0  0  0  0  0  0  0  0  0`);
    });
    bonds.forEach(b => {
      L.push(`${String(b.a1).padStart(3, ' ')}${String(b.a2).padStart(3, ' ')}${String(b.tipo || 1).padStart(3, ' ')}  0  0  0  0`);
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

  function calcularPosicaoNovoAtomo(parent, vizinhos) {
    const BL = 1.5;
    if (!vizinhos || vizinhos.length === 0) return { x: parent.x + BL, y: parent.y, z: parent.z };
    let sx = 0, sy = 0, sz = 0;
    for (const v of vizinhos) { sx += (v.x - parent.x); sy += (v.y - parent.y); sz += (v.z - parent.z); }
    const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);
    if (mag < 0.01) return { x: parent.x + BL, y: parent.y, z: parent.z };
    return { x: parent.x + (-sx / mag) * BL, y: parent.y + (-sy / mag) * BL, z: parent.z + (-sz / mag) * BL };
  }

  // =========================================================================
  // 15. TABELA PERIÓDICA
  // =========================================================================
  window.abrirTabelaPeriodica = function(atomoContexto) {
    if (atomoContexto) atomoAtivoInspecionado = atomoContexto;
    const modal = document.getElementById('periodicTableModal');
    const matrix = document.getElementById('ptableMatrix');
    const sub = document.getElementById('ptableSubHeader');
    if (!modal || !matrix) return;
    if (sub) {
      if (atomoAtivoInspecionado) {
        const nLig = atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : 0;
        sub.innerHTML = `Âncora: <strong>${atomoAtivoInspecionado.elem}#${(atomoAtivoInspecionado.serial || atomoAtivoInspecionado.index || 0) + 1}</strong> (${nLig} lig.)`;
      } else {
        sub.textContent = 'Clique em um elemento para análise.';
      }
    }
    renderizarMatrizTabelaPeriodica('todas');
    if (atomoAtivoInspecionado) {
      const eM = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === (atomoAtivoInspecionado.elem || '').toUpperCase());
      if (eM) selecionarElementoNaTabela(eM);
    } else {
      const c = TABELA_PERIODICA.find(e => e.sym === 'C');
      if (c) selecionarElementoNaTabela(c);
    }
    modal.style.display = 'flex';
  };
  window.fecharTabelaPeriodica = function() {
    const m = document.getElementById('periodicTableModal'); if (m) m.style.display = 'none';
  };
  window.filtrarElementosPTable = function(cat) {
    document.querySelectorAll('.ptable-pill').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    renderizarMatrizTabelaPeriodica(cat);
  };

  function renderizarMatrizTabelaPeriodica(filtroCat) {
    const matrix = document.getElementById('ptableMatrix');
    if (!matrix) return;
    matrix.innerHTML = '';
    const nLigAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;

    const mkP = (txt, r, c) => {
      const el = document.createElement('div');
      el.className = 'ptable-tile ptable-placeholder';
      el.style.gridRow = r; el.style.gridColumn = c; el.textContent = txt;
      matrix.appendChild(el);
    };
    mkP('57-71', 6, 3);
    mkP('89-103', 7, 3);

    TABELA_PERIODICA.forEach(elem => {
      const pos = POSICOES_PTABLE[elem.sym];
      if (!pos) return;
      const tile = document.createElement('div');
      tile.className = `ptable-tile cat-${elem.cat}`;
      tile.style.gridRow = pos.r; tile.style.gridColumn = pos.c;
      if (nLigAlvo !== null) {
        const valMax = Math.max(...elem.valencias);
        tile.classList.add((nLigAlvo <= valMax && valMax > 0) ? 'compatible' : 'incompatible');
      }
      if (filtroCat !== 'todas' && elem.cat !== filtroCat) tile.style.opacity = '0.15';
      if (elementoPTableSelecionado?.sym === elem.sym) tile.classList.add('selected');
      tile.onclick = () => selecionarElementoNaTabela(elem, tile);
      tile.title = `${elem.nome} (Z=${elem.z})`;
      const mt = elem.massa < 100 ? elem.massa.toFixed(1) : Math.round(elem.massa);
      tile.innerHTML = `<span class="ptable-z">${elem.z}</span><span class="ptable-sym">${elem.sym}</span><span class="ptable-mass">${mt}</span>`;
      matrix.appendChild(tile);
    });
  }

  function selecionarElementoNaTabela(elem, tileEl) {
    elementoPTableSelecionado = elem;
    document.querySelectorAll('.ptable-tile').forEach(t => t.classList.remove('selected'));
    if (tileEl) tileEl.classList.add('selected');
    const sidebar = document.getElementById('ptableDetailContent');
    if (!sidebar) return;

    const nLigAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;
    let htmlVal = '', podeSubst = false;
    if (atomoAtivoInspecionado && nLigAlvo !== null) {
      const valMax = Math.max(...elem.valencias);
      if (elem.sym === atomoAtivoInspecionado.elem) {
        htmlVal = `<div class="ptable-valence-check valence-valid">ℹ️ Já é <strong>${elem.nome}</strong>.</div>`;
      } else if (valMax === 0) {
        htmlVal = `<div class="ptable-valence-check valence-invalid">⚠️ Gás nobre — sem ligações.</div>`;
      } else if (nLigAlvo > valMax) {
        htmlVal = `<div class="ptable-valence-check valence-invalid">⚠️ <strong>Valência excedida:</strong> ${nLigAlvo} > ${valMax}.</div>`;
      } else {
        podeSubst = true;
        htmlVal = `<div class="ptable-valence-check valence-valid">✅ <strong>Compatível:</strong> comporta ${nLigAlvo} ligações.</div>`;
      }
    } else {
      htmlVal = `<div class="ptable-valence-check" style="background:rgba(255,255,255,0.04); color:#94a3b8;">Clique em um átomo no 3D.</div>`;
    }

    let htmlDiagAdd = '';
    if (atomoAtivoInspecionado) htmlDiagAdd = renderizarDiagnosticoAdicao(elem);

    sidebar.innerHTML = `
      <div class="ptable-hero-card">
        <div class="ptable-hero-badge"><span class="hero-z">${elem.z}</span><span class="hero-sym">${elem.sym}</span></div>
        <div class="ptable-hero-info">
          <span class="ptable-hero-name">${elem.nome}</span>
          <span class="ptable-hero-family">${elem.cat.replace(/-/g, ' ')} • G${elem.grupo}</span>
        </div>
      </div>
      <div class="ptable-params-list">
        <div class="ptable-param-row"><span>Z:</span><strong>${elem.z}</strong></div>
        <div class="ptable-param-row"><span>Massa:</span><strong>${elem.massa} g/mol</strong></div>
        <div class="ptable-param-row"><span>Eletroneg.:</span><strong>${elem.eletron || 'Inerte'}</strong></div>
        <div class="ptable-param-row"><span>Raio:</span><strong>${elem.raio ? elem.raio + ' pm' : '--'}</strong></div>
        <div class="ptable-param-row"><span>Valências:</span><strong>${elem.valencias.join(', ')}</strong></div>
      </div>
      <div class="ptable-pharma-box"><strong style="color:var(--neon-cyan); display:block; margin-bottom:3px;">Química Medicinal:</strong>${elem.pharma}</div>
      ${htmlVal}
      ${atomoAtivoInspecionado ? `
        <div class="ptable-action-buttons">
          <button class="btn-execute-atom-swap" ${!podeSubst ? 'disabled' : ''} onclick="window.executarSubstituicaoElementar('${elem.sym}')">⚡ Substituir</button>
          <button class="btn-execute-atom-add" onclick="window.executarAdicaoAtomo('${elem.sym}')">➕ Adicionar</button>
        </div>
        ${htmlDiagAdd}
      ` : ''}
    `;
  }

  function renderizarDiagnosticoAdicao(elemAlvo) {
    if (!atomoAtivoInspecionado || !sdfCacheLocal) return '';
    const parsed = parseSDF_Simples(sdfCacheLocal);
    if (!parsed) return '';
    const parentIdx = atomoAtivoInspecionado.index !== undefined ? atomoAtivoInspecionado.index : (atomoAtivoInspecionado.serial - 1);
    const parent = parsed.atoms[parentIdx];
    if (!parent) return '';
    const bonds = parsed.bonds.filter(b => b.a1 === parentIdx + 1 || b.a2 === parentIdx + 1);
    const eP = TABELA_PERIODICA.find(e => e.sym === parent.elem);
    const valP = eP ? Math.max(...eP.valencias) : 4;
    const disp = valP - bonds.length;
    const temH = bonds.some(b => {
      const idx = b.a1 === parentIdx + 1 ? b.a2 - 1 : b.a1 - 1;
      return parsed.atoms[idx] && parsed.atoms[idx].elem === 'H';
    });

    let h = `<div class="ptable-add-diagnostic"><div class="diag-row"><span>Conexões livres:</span><strong>${Math.max(0, disp)} de ${valP}</strong></div>`;
    if (disp > 0) {
      h += `<div class="diag-status diag-ok">✅ Adição direta possível.</div>`;
    } else if (temH) {
      h += `<div class="diag-status diag-warning">⚠️ Saturado — H será removido automaticamente.</div>`;
    } else {
      h += `<div class="diag-status diag-error">⚠️ Saturado sem H — gerará radical.</div>`;
    }
    h += `</div>`;
    return h;
  }

  // =========================================================================
  // 16. SUBSTITUIÇÃO
  // =========================================================================
  window.executarSubstituicaoElementar = async function(novoSimbolo) {
    if (!atomoAtivoInspecionado || !compostoSelecionado || !sdfCacheLocal) return;
    const elemAntigo = atomoAtivoInspecionado.elem;
    const atomIdx = atomoAtivoInspecionado.index !== undefined ? atomoAtivoInspecionado.index : (atomoAtivoInspecionado.serial - 1);

    const linhas = sdfCacheLocal.split('\n');
    let linhaIdx = -1, contador = 0;
    for (let i = 4; i < linhas.length; i++) {
      const l = linhas[i];
      if (l.includes('M  END') || l.includes('$$$$')) break;
      if (l.length >= 31) {
        if (contador === atomIdx) { linhaIdx = i; break; }
        contador++;
      }
    }
    if (linhaIdx === -1) { mostrarNotificacao('Posição não mapeada.', 'error'); return; }
    const orig = linhas[linhaIdx];
    linhas[linhaIdx] = orig.substring(0, 31) + novoSimbolo.padEnd(3) + orig.substring(34);
    const novoSdf = linhas.join('\n');

    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const mol = rdkit.get_mol(novoSdf);
        if (!mol) { mostrarNotificacao(`Substituição ${elemAntigo}→${novoSimbolo} instável.`, 'error'); return; }
        const novoSmiles = mol.get_smiles();
        mol.delete();
        pushEdicaoSnapshot(compostoSelecionado, sdfCacheLocal, `Sub ${elemAntigo}→${novoSimbolo}`);
        const idD = 'sub_' + Date.now();
        const nomeD = `${compostoSelecionado.nome} (${elemAntigo}→${novoSimbolo})`;
        const novoComp = { id: idD, chaveOriginal: idD, nome: nomeD, formula: 'Mod. Atômica', molarMass: '--', smiles: novoSmiles, categoria: 'custom', pubchemQuery: nomeD };
        compostosIndexados.unshift(novoComp);
        compostosFiltrados.unshift(novoComp);
        renderizarListaCompostos(true);
        selecionarCompostoStudio(novoComp);
        window.fecharTabelaPeriodica();
        window.fecharInspectorAtomo();
        mostrarNotificacao(`✅ ${nomeD}`, 'success');
      } catch (err) {
        mostrarNotificacao('Erro de valência.', 'error');
      }
    }
  };

  // =========================================================================
  // 17. ADIÇÃO — versão auditada (zero referências a novoSym)
  // =========================================================================
  window.executarAdicaoAtomo = async function(novoSimbolo) {
    if (!atomoAtivoInspecionado || !compostoSelecionado || !sdfCacheLocal) {
      mostrarNotificacao('Selecione um átomo âncora.', 'error');
      return;
    }

    const parsed = parseSDF_Simples(sdfCacheLocal);
    if (!parsed) { mostrarNotificacao('SDF inválido.', 'error'); return; }

    const parentIdx = atomoAtivoInspecionado.index !== undefined
      ? atomoAtivoInspecionado.index
      : (atomoAtivoInspecionado.serial - 1);

    if (parentIdx < 0 || parentIdx >= parsed.atoms.length) {
      mostrarNotificacao('Índice inválido.', 'error');
      return;
    }

    const parent = parsed.atoms[parentIdx];
    const eP = TABELA_PERIODICA.find(e => e.sym === parent.elem);
    const valP = eP ? Math.max(...eP.valencias) : 4;
    const eN = TABELA_PERIODICA.find(e => e.sym === novoSimbolo);
    if (!eN) { mostrarNotificacao('Elemento inválido.', 'error'); return; }

    const bondsP = parsed.bonds.filter(b => b.a1 === parentIdx + 1 || b.a2 === parentIdx + 1);
    const nLig = bondsP.length;

    let acao = 'direto';
    let hIdxRem = -1;
    let instavel = false;

    if (nLig >= valP) {
      for (const b of bondsP) {
        const vIdx = (b.a1 === parentIdx + 1) ? (b.a2 - 1) : (b.a1 - 1);
        if (parsed.atoms[vIdx] && parsed.atoms[vIdx].elem === 'H') { hIdxRem = vIdx; break; }
      }
      if (hIdxRem >= 0) {
        acao = 'remover_h';
      } else {
        const msg =
`⚠️ ADIÇÃO GERA ESTRUTURA INSTÁVEL

Átomo âncora: ${parent.elem}#${parentIdx + 1}
Ligações atuais: ${nLig} (valência máx.: ${valP})
Hidrogênios disponíveis: 0

Adicionar ${novoSimbolo} criará uma valência estendida (radical livre).

RECOMENDAÇÕES:
• Substituir ${parent.elem} por elemento de valência maior (N, P, S), OU
• Remover previamente uma ligação existente, OU
• Prosseguir — estrutura marcada como instável

Deseja continuar?`;
        if (!confirm(msg)) { mostrarNotificacao('Adição cancelada.', 'info'); return; }
        acao = 'forcar_instavel';
        instavel = true;
      }
    }

    let atoms = parsed.atoms.map(a => ({ ...a }));
    let bonds = parsed.bonds.map(b => ({ ...b }));

    if (acao === 'remover_h' && hIdxRem >= 0) {
      atoms.splice(hIdxRem, 1);
      bonds = bonds
        .filter(b => (b.a1 - 1) !== hIdxRem && (b.a2 - 1) !== hIdxRem)
        .map(b => ({
          ...b,
          a1: (b.a1 - 1) > hIdxRem ? b.a1 - 1 : b.a1,
          a2: (b.a2 - 1) > hIdxRem ? b.a2 - 1 : b.a2
        }));
    }

    const pIdxFinal = (acao === 'remover_h' && hIdxRem >= 0 && parentIdx > hIdxRem) ? parentIdx - 1 : parentIdx;
    const parentFinal = atoms[pIdxFinal];
    const bPF = bonds.filter(b => b.a1 === pIdxFinal + 1 || b.a2 === pIdxFinal + 1);
    const viz = bPF.map(b => {
      const vIdx = (b.a1 === pIdxFinal + 1) ? (b.a2 - 1) : (b.a1 - 1);
      return atoms[vIdx];
    }).filter(Boolean);

    const posNova = calcularPosicaoNovoAtomo(parentFinal, viz);

    atoms.push({ x: posNova.x, y: posNova.y, z: posNova.z, elem: novoSimbolo });
    bonds.push({ a1: pIdxFinal + 1, a2: atoms.length, tipo: 1 });

    const novoSdf = reconstruirSDF(parsed, atoms, bonds, instavel);

    const rdkit = await carregarRDKitSobDemanda();
    let novoSmiles = null, rdkitErro = null;
    if (rdkit) {
      try {
        const m = rdkit.get_mol(novoSdf);
        if (m) { novoSmiles = m.get_smiles(); m.delete(); }
        else rdkitErro = 'RDKit não parseou.';
      } catch (e) { rdkitErro = e.message; }
    }

    if (!novoSmiles && !instavel) {
      mostrarNotificacao('Estrutura inválida: ' + (rdkitErro || 'erro'), 'error');
      return;
    }
    if (!novoSmiles && instavel) {
      novoSmiles = 'RADICAL_' + novoSimbolo + '_' + Date.now();
    }

    pushEdicaoSnapshot(compostoSelecionado, sdfCacheLocal, `Add ${novoSimbolo}`);

    const idD = 'add_' + Date.now();
    const suf = instavel ? ' ⚠️ INSTÁVEL' : '';
    const nomeD = `${compostoSelecionado.nome} + ${novoSimbolo}${suf}`;
    const novoComp = {
      id: idD, chaveOriginal: idD, nome: nomeD,
      formula: 'Adição Atômica', molarMass: '--',
      smiles: novoSmiles, categoria: 'custom', pubchemQuery: nomeD,
      unstable: instavel,
      sdfModificado: novoSdf
    };

    compostosIndexados.unshift(novoComp);
    compostosFiltrados.unshift(novoComp);
    renderizarListaCompostos(true);
    selecionarCompostoStudio(novoComp);
    window.fecharTabelaPeriodica();
    window.fecharInspectorAtomo();

    if (instavel) mostrarNotificacao(`⚠️ Instável: ${nomeD}`, 'warning', 5000);
    else mostrarNotificacao(`✅ Adicionado: ${nomeD}`, 'success');
  };

  // =========================================================================
  // 18. BIOISOSTERISMO
  // =========================================================================
  window.abrirPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    const body = document.getElementById('bioisostereModalBody');
    if (!modal || !body) return;
    if (!compostoSelecionado || !compostoSelecionado.smiles || compostoSelecionado.smiles === '--') {
      body.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Selecione uma molécula.</div>`;
      modal.style.display = 'flex';
      return;
    }
    const smiles = compostoSelecionado.smiles;
    const nome = compostoSelecionado.nome;
    const disp = REACOES_BIOISOSTERISMO.filter(rx => rx.detectar(smiles));
    const chips = disp.length > 0
      ? Array.from(new Set(disp.map(r => r.alvoSmarts))).map(t => `<span class="bio-group-chip">${t}</span>`).join('')
      : '<span style="color:#f87171; font-size:0.75rem;">Sem grupos elegíveis.</span>';
    const cards = disp.length > 0
      ? disp.map(rx => `
        <div class="bio-transform-card">
          <div class="bio-card-top">
            <span class="bio-card-name">${rx.nome}</span>
            <span class="bio-card-scheme">${rx.esquema}</span>
            <span class="cadd-badge badge-warning" style="align-self:flex-start; margin-top:2px;">${rx.tag}</span>
            <p class="bio-card-desc">${rx.descricao}</p>
          </div>
          <button class="btn-apply-transform" onclick="window.executarTransformacaoBioisosterica('${rx.id}')">🧪 Sintetizar</button>
        </div>`).join('') : '';
    body.innerHTML = `
      <div class="bio-detected-groups-panel">
        <span class="bio-detected-title">Molécula: <strong style="color:var(--neon-cyan);">${nome}</strong></span>
        <div style="font-family:var(--font-mono); font-size:0.7rem; color:#cbd5e1; word-break:break-all;">${smiles}</div>
        <div class="bio-groups-chips" style="margin-top:6px;">${chips}</div>
      </div>
      <div id="bioComparisonArea"></div>
      <h4 style="color:#f8fafc; font-size:0.82rem; margin-top:8px;">Transformações:</h4>
      <div class="bio-transforms-grid">${cards}</div>
    `;
    modal.style.display = 'flex';
  };
  window.fecharPainelBioisosterismo = function() {
    const m = document.getElementById('bioisostereModal'); if (m) m.style.display = 'none';
  };
  window.executarTransformacaoBioisosterica = async function(idReacao) {
    if (!compostoSelecionado) return;
    const rx = REACOES_BIOISOSTERISMO.find(r => r.id === idReacao);
    if (!rx) return;
    const sO = compostoSelecionado.smiles;
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
    const pA = await calcularPropriedadesMoleculares(sO, parseFloat(compostoSelecionado.molarMass));
    const pD = await calcularPropriedadesMoleculares(nS, 0);
    const area = document.getElementById('bioComparisonArea');
    if (area && pA && pD) {
      const dMW = pD.mw - pA.mw, dLogP = pD.logp - pA.logp, dTPSA = pD.tpsa - pA.tpsa;
      area.innerHTML = `
        <div class="bio-comparison-container">
          <div class="bio-comparison-header">
            <span class="bio-comparison-title">✨ ${rx.nome}</span>
            <button class="studio-btn btn-action-transfer" onclick="window.adicionarDerivadoAoCatalogo('${rx.nome.replace(/'/g, "\\'")}', '${nS}', ${pD.mw.toFixed(2)})">📥 Injetar</button>
          </div>
          <table class="delta-table">
            <thead><tr><th>Propriedade</th><th>Original</th><th>Derivado</th><th>Δ</th><th>Impacto</th></tr></thead>
            <tbody>
              <tr><td><strong>Massa</strong></td><td>${pA.mw.toFixed(1)}</td><td>${pD.mw.toFixed(1)}</td><td>${dMW >= 0 ? '+' : ''}${dMW.toFixed(1)}</td><td>${pD.mw <= 500 ? '✅ Ro5' : '⚠️'}</td></tr>
              <tr><td><strong>LogP</strong></td><td>${pA.logp.toFixed(2)}</td><td>${pD.logp.toFixed(2)}</td><td class="${dLogP > 0 ? 'delta-pos' : 'delta-neg'}">${dLogP >= 0 ? '+' : ''}${dLogP.toFixed(2)}</td><td>${dLogP > 0 ? 'Mais lipofílico' : 'Mais hidrofílico'}</td></tr>
              <tr><td><strong>TPSA</strong></td><td>${pA.tpsa.toFixed(1)}</td><td>${pD.tpsa.toFixed(1)}</td><td class="${dTPSA < 0 ? 'delta-good' : 'delta-neg'}">${dTPSA >= 0 ? '+' : ''}${dTPSA.toFixed(1)}</td><td>${pD.tpsa <= 140 ? '✅ Oral' : '⚠️'}</td></tr>
            </tbody>
          </table>
        </div>
      `;
    }
  };
  window.adicionarDerivadoAoCatalogo = function(nomeT, nS, nMW) {
    if (!compostoSelecionado) return;
    const idU = 'deriv_' + Date.now();
    const nomeD = `${compostoSelecionado.nome} [${nomeT}]`;
    const nc = { id: idU, chaveOriginal: idU, nome: nomeD, formula: 'Análogo', molarMass: nMW, smiles: nS, categoria: 'custom', pubchemQuery: nomeD };
    compostosIndexados.unshift(nc);
    compostosFiltrados.unshift(nc);
    renderizarListaCompostos(true);
    selecionarCompostoStudio(nc);
    window.fecharPainelBioisosterismo();
    mostrarNotificacao('Análogo adicionado.', 'success');
  };

  // =========================================================================
  // 19. SIMILARIDADE
  // =========================================================================
  window.abrirSimilaridade = async function() {
    const modal = document.getElementById('similarityModal');
    const body = document.getElementById('similarityModalBody');
    const sub = document.getElementById('similaritySubHeader');
    if (!modal || !body) return;
    if (!compostoSelecionado || !compostoSelecionado.smiles) { mostrarNotificacao('Selecione uma molécula.', 'error'); return; }
    modal.style.display = 'flex';
    body.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">Calculando fingerprints...</div>';
    if (sub) sub.textContent = `Alvo: ${compostoSelecionado.nome}`;
    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) { body.innerHTML = '<div style="padding:20px; color:#f87171;">RDKit indisponível.</div>'; return; }
    const alvoMol = rdkit.get_mol(extrairSmilesPrincipal(compostoSelecionado.smiles) || compostoSelecionado.smiles);
    if (!alvoMol) { body.innerHTML = '<div style="padding:20px; color:#f87171;">SMILES inválido.</div>'; return; }
    let alvoFp = null;
    try { alvoFp = alvoMol.get_morgan_fp(); } catch (e) {}
    alvoMol.delete();
    if (!alvoFp) { body.innerHTML = '<div style="padding:20px; color:#f87171;">FP não calculável.</div>'; return; }
    const res = [];
    for (const comp of compostosIndexados) {
      const sL = extrairSmilesPrincipal(comp.smiles);
      if (!sL) continue;
      if (comp.id === compostoSelecionado.id) continue;
      try {
        const m = rdkit.get_mol(sL);
        if (!m) continue;
        const fp = m.get_morgan_fp();
        m.delete();
        if (!fp) continue;
        const t = tanimotoBits(alvoFp, fp);
        if (t > 0.15) res.push({ comp, t });
      } catch (e) {}
    }
    res.sort((a, b) => b.t - a.t);
    const top = res.slice(0, 20);
    if (top.length === 0) { body.innerHTML = '<div style="padding:20px; color:#94a3b8;">Sem similares.</div>'; return; }
    body.innerHTML = `
      <div class="similarity-target-box">
        <div class="similarity-target-name">🎯 ${compostoSelecionado.nome}</div>
        <div class="similarity-target-smiles">${compostoSelecionado.smiles}</div>
      </div>
      <div class="similarity-results-list">
        ${top.map(r => {
          const sc = r.t > 0.7 ? 'score-high' : r.t > 0.4 ? 'score-mid' : 'score-low';
          return `<div class="similarity-result-item" onclick='window.selecionarCompostoStudio(${JSON.stringify(r.comp)}); window.fecharSimilaridade();'>
            <div class="similarity-score-badge ${sc}">${(r.t * 100).toFixed(0)}%</div>
            <div><div class="similarity-result-name">${r.comp.nome}</div><div class="similarity-result-formula">${r.comp.formula}</div></div>
            <div style="text-align:right; font-family:var(--font-mono); font-size:0.65rem; color:#94a3b8;">${r.comp.molarMass !== '--' ? parseFloat(r.comp.molarMass).toFixed(1) + ' Da' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  };
  window.fecharSimilaridade = function() { const m = document.getElementById('similarityModal'); if (m) m.style.display = 'none'; };
  function tanimotoBits(a, b) {
    if (!a || !b) return 0;
    let inter = 0, uni = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) { const x = a[i]|0, y = b[i]|0; inter += popcount(x & y); uni += popcount(x | y); }
    return uni === 0 ? 0 : inter / uni;
  }
  function popcount(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }

  // =========================================================================
  // 20. SCAFFOLD — CORRIGIDO com fallback SMARTS
  // =========================================================================
  window.extrairScaffoldAtual = async function () {
    if (!compostoSelecionado || !compostoSelecionado.smiles || compostoSelecionado.smiles === '--') {
      mostrarNotificacao('Selecione uma molécula.', 'error');
      return;
    }
    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) { mostrarNotificacao('RDKit indisponível.', 'error'); return; }

    try {
      const smilesPrincipal = extrairSmilesPrincipal(compostoSelecionado.smiles);
      if (!smilesPrincipal) { mostrarNotificacao('SMILES inválido.', 'error'); return; }

      const mol = rdkit.get_mol(smilesPrincipal);
      if (!mol) { mostrarNotificacao('SMILES inválido.', 'error'); return; }

      let sc = null;

      // Método 1: tentar get_murcko_scaffold se existir
      if (typeof mol.get_murcko_scaffold === 'function') {
        try { sc = mol.get_murcko_scaffold(); } catch (e) {}
      }

      // Método 2: fallback — remover cadeias laterais manualmente
      if (!sc || sc === '' || sc === smilesPrincipal) {
        try {
          // Remove grupos terminais comuns (hidroxilas, aminas, halogenetos, grupos metila nas pontas)
          let simplificado = smilesPrincipal
            .replace(/\(\[?OH?\]?\)/g, '')
            .replace(/\(\[?NH[0-9]?\]?\)/g, '')
            .replace(/\(=O\)/g, '')
            .replace(/\(\[?F,Cl,Br,I\]?\)/g, '');
          // Reconstroi com RDKit para validar
          const m2 = rdkit.get_mol(simplificado);
          if (m2) { sc = m2.get_smiles(); m2.delete(); }
        } catch (e) {}
      }

      mol.delete();

      if (!sc || sc === '' || sc === smilesPrincipal) {
        mostrarNotificacao('Não foi possível extrair scaffold (molécula sem anel ou RDKit limitado).', 'warning', 4000);
        return;
      }

      const idS = 'scaffold_' + Date.now();
      const nomeS = `Scaffold de ${compostoSelecionado.nome}`;
      const nc = { id: idS, chaveOriginal: idS, nome: nomeS, formula: 'Scaffold Murcko', molarMass: '--', smiles: sc, categoria: 'custom', pubchemQuery: nomeS };
      compostosIndexados.unshift(nc);
      compostosFiltrados.unshift(nc);
      renderizarListaCompostos(true);
      selecionarCompostoStudio(nc);
      mostrarNotificacao('✅ Scaffold: ' + sc, 'success');
    } catch (e) {
      console.error('[Scaffold]', e);
      mostrarNotificacao('Erro: ' + e.message, 'error');
    }
  };

  // =========================================================================
  // 21. COMPARAÇÃO
  // =========================================================================
  window.abrirComparacao = function() {
    const modal = document.getElementById('comparisonModal');
    const selA = document.getElementById('cmpSelectA'), selB = document.getElementById('cmpSelectB');
    if (!modal || !selA || !selB) return;
    const opcoes = compostosIndexados.filter(c => c.smiles && c.smiles !== '--').slice(0, 500)
      .map(c => `<option value="${c.id}">${c.nome} — ${c.formula}</option>`).join('');
    selA.innerHTML = opcoes;
    selB.innerHTML = opcoes;
    if (compostoSelecionado) selA.value = compostoSelecionado.id;
    if (compostosIndexados.length > 1) {
      const outro = compostosIndexados.find(c => c.id !== compostoSelecionado?.id && c.smiles && c.smiles !== '--');
      if (outro) selB.value = outro.id;
    }
    modal.style.display = 'flex';
    document.getElementById('comparisonMetrics').innerHTML = '<div style="text-align:center; padding: 20px; color: #64748b; font-size: 0.78rem;">Clique em Comparar.</div>';
  };
  window.fecharComparacao = function() {
    const m = document.getElementById('comparisonModal'); if (m) m.style.display = 'none';
    if (cmpViewerA) { try { cmpViewerA.clear(); } catch (e) {} cmpViewerA = null; }
    if (cmpViewerB) { try { cmpViewerB.clear(); } catch (e) {} cmpViewerB = null; }
  };
  window.executarComparacao = async function() {
    const idA = document.getElementById('cmpSelectA')?.value;
    const idB = document.getElementById('cmpSelectB')?.value;
    if (!idA || !idB || idA === idB) { mostrarNotificacao('Selecione compostos diferentes.', 'warning'); return; }
    const cA = compostosIndexados.find(c => c.id === idA);
    const cB = compostosIndexados.find(c => c.id === idB);
    if (!cA || !cB) return;
    document.getElementById('cmpLabelA').textContent = cA.nome;
    document.getElementById('cmpLabelB').textContent = cB.nome;
    const sdfA = cA.sdfModificado || await resolverCoordenadas3D(cA.smiles, cA.pubchemQuery || cA.nome);
    const sdfB = cB.sdfModificado || await resolverCoordenadas3D(cB.smiles, cB.pubchemQuery || cB.nome);
    document.getElementById('cmpViewerA').innerHTML = '';
    document.getElementById('cmpViewerB').innerHTML = '';
    if (sdfA && window.$3Dmol) {
      cmpViewerA = $3Dmol.createViewer('cmpViewerA', { backgroundColor: '#020617' });
      cmpViewerA.addModel(sdfA, 'sdf');
      cmpViewerA.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      cmpViewerA.zoomTo(); cmpViewerA.render();
    }
    if (sdfB && window.$3Dmol) {
      cmpViewerB = $3Dmol.createViewer('cmpViewerB', { backgroundColor: '#020617' });
      cmpViewerB.addModel(sdfB, 'sdf');
      cmpViewerB.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      cmpViewerB.zoomTo(); cmpViewerB.render();
    }
    const pA = await calcularPropriedadesMoleculares(cA.smiles, parseFloat(cA.molarMass));
    const pB = await calcularPropriedadesMoleculares(cB.smiles, parseFloat(cB.molarMass));
    if (pA && pB) {
      const r = (l, a, b, mm = false) => {
        const d = b - a, ok = mm ? d < 0 : d > 0;
        return `<tr><td>${l}</td><td>${a.toFixed(2)}</td><td>${b.toFixed(2)}</td><td class="${ok ? 'cmp-delta-pos' : 'cmp-delta-neg'}">${d >= 0 ? '+' : ''}${d.toFixed(2)}</td></tr>`;
      };
      document.getElementById('comparisonMetrics').innerHTML = `
        <table class="comparison-table">
          <thead><tr><th>Propriedade</th><th>${cA.nome}</th><th>${cB.nome}</th><th>Δ</th></tr></thead>
          <tbody>
            ${r('Massa', pA.mw, pB.mw, true)}
            ${r('LogP', pA.logp, pB.logp, false)}
            ${r('TPSA', pA.tpsa, pB.tpsa, true)}
            ${r('HBD', pA.hbd, pB.hbd, true)}
            ${r('HBA', pA.hba, pB.hba, true)}
            ${r('RotB', pA.rotb, pB.rotb, true)}
          </tbody>
        </table>
      `;
    }
  };

  // =========================================================================
  // 22. CSV
  // =========================================================================
  window.exportarCSVFiltrados = function() {
    if (compostosFiltrados.length === 0) { mostrarNotificacao('Sem compostos.', 'error'); return; }
    const L = ['Nome,Formula,Massa,SMILES,Categoria,Instavel'];
    compostosFiltrados.forEach(c => {
      L.push([`"${(c.nome || '').replace(/"/g, '""')}"`, c.formula || '', c.molarMass || '', `"${(c.smiles || '').replace(/"/g, '""')}"`, c.categoria || '', c.unstable ? 'SIM' : 'NAO'].join(','));
    });
    const blob = new Blob(['\ufeff' + L.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `laift_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    mostrarNotificacao(`${compostosFiltrados.length} exportados.`, 'success');
  };

  // =========================================================================
  // 23. MODAL CADD
  // =========================================================================
  window.abrirModalCADD = function() {
    const modal = document.getElementById('caddModal');
    const body = document.getElementById('caddModalBody');
    const title = document.getElementById('caddModalTitle');
    const sub = document.getElementById('caddModalSubtitle');
    if (!modal || !body) return;
    if (!ultimoDossieCADD) {
      body.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px;">Selecione um composto.</div>`;
      modal.style.display = 'flex';
      return;
    }
    const d = ultimoDossieCADD;
    if (title) title.textContent = `📊 ${d.nome}`;
    if (sub) sub.textContent = `SMILES: ${d.smiles}${d._fallback ? ' (estimado)' : ''}`;
    body.innerHTML = `
      <div class="cadd-cards-grid">
        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">💊 Lipinski</span>
            <span class="cadd-badge ${d.falhasLipinski.length === 0 ? 'badge-approved' : d.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected'}">${d.falhasLipinski.length === 0 ? 'Conforme' : d.falhasLipinski.length + ' Viol.'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.mw > 500 ? 'violated' : ''}"><span>MW:</span><strong>${d.mw.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.logp > 5 ? 'violated' : ''}"><span>LogP:</span><strong>${d.logp.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.hbd > 5 ? 'violated' : ''}"><span>HBD:</span><strong>${d.hbd}</strong></div>
            <div class="cadd-param-item ${d.hba > 10 ? 'violated' : ''}"><span>HBA:</span><strong>${d.hba}</strong></div>
          </div>
        </div>
        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">🔬 Veber</span>
            <span class="cadd-badge ${d.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.falhasVeber.length === 0 ? 'OK' : 'Baixa'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.rotb > 10 ? 'violated' : ''}"><span>RotB:</span><strong>${d.rotb}</strong></div>
            <div class="cadd-param-item ${d.tpsa > 140 ? 'violated' : ''}"><span>TPSA:</span><strong>${d.tpsa.toFixed(1)}</strong></div>
            <div class="cadd-param-item"><span>Fsp³:</span><strong>${d.csp3.toFixed(2)}</strong></div>
          </div>
        </div>
        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">📐 Ghose</span>
            <span class="cadd-badge ${d.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.falhasGhose.length === 0 ? 'OK' : d.falhasGhose.length + ' Viol.'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item"><span>MR:</span><strong>${d.mr.toFixed(1)}</strong></div>
            <div class="cadd-param-item"><span>Átomos:</span><strong>${d.totalAtoms}</strong></div>
          </div>
        </div>
        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">⚠️ PAINS</span>
            <span class="cadd-badge ${d.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.alertasPAINS.length === 0 ? 'Isento' : d.alertasPAINS.length + ' Alerta'}</span>
          </div>
          ${d.alertasPAINS.length === 0
            ? `<div class="pains-clean-box">✅ Sem grupos promíscuos.</div>`
            : `<div class="pains-alert-box"><strong>Reativos:</strong><br>${d.alertasPAINS.map(a => `• ${a.nome}`).join('<br>')}</div>`}
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };
  window.fecharModalCADD = function() { const m = document.getElementById('caddModal'); if (m) m.style.display = 'none'; };

  // =========================================================================
  // 24. RESOLUÇÃO 3D
  // =========================================================================
  function validarConteudoSDF(sdf) {
    if (!sdf || typeof sdf !== 'string') return false;
    if (sdf.includes('<!DOCTYPE') || sdf.includes('<html')) return false;
    return sdf.includes('$$$$') || sdf.includes('M  END');
  }
  function gerarSDFMonoatomico(simbolo) {
    const s = simbolo.replace(/\[|\]|\+|\-/g, '').trim();
    return `\n  LAIFT-ENGINE-3D\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\n    0.0000    0.0000    0.0000 ${s.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0\nM  END\n$$$$\n`;
  }
  async function resolverCoordenadas3D(smiles, termoBusca) {
    if (compostoSelecionado && compostoSelecionado.sdfModificado && validarConteudoSDF(compostoSelecionado.sdfModificado)) {
      return compostoSelecionado.sdfModificado;
    }
    if (!smiles && !termoBusca) return null;
    if (smiles && smiles.startsWith('[') && smiles.endsWith(']') && smiles.length <= 5) return gerarSDFMonoatomico(smiles);
    if (smiles && smiles.startsWith('RADICAL_')) return null;

    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      try {
        const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
        if (cache && validarConteudoSDF(cache.sdf)) return cache.sdf;
      } catch (e) {}
    }

    // Extrai componente principal (remove sais)
    const sL = extrairSmilesPrincipal(smiles);

    // 1. RDKit ETKDG local
    if (sL && !sL.startsWith('[')) {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, "Gerando 3D local...");
          const mol = rdkit.get_mol(sL);
          if (mol) {
            try { mol.add_hs(); } catch (e) {}
            if (mol.embed_mol() >= 0) {
              const sdf = mol.to_sdf();
              mol.delete();
              exibirStatusRDKit(false);
              if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
            } else mol.delete();
          }
        } catch (e) { console.warn('[3D] ETKDG falhou:', e.message); }
      }
      exibirStatusRDKit(false);
    }

    // 2. PubChem por SMILES (só o principal, sem sais)
    if (sL && !sL.startsWith('[')) {
      try {
        exibirStatusRDKit(true, "PubChem 3D...");
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(sL)}/SDF?record_type=3d`);
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
        }
      } catch (e) {}
    }

    // 3. PubChem por nome
    if (termoBusca) {
      try {
        exibirStatusRDKit(true, "PubChem por nome...");
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termoBusca.trim())}/SDF?record_type=3d`);
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(smiles || termoBusca, termoBusca, sdf); return sdf; }
        }
      } catch (e) {}
    }

    // 4. CACTUS
    if (sL) {
      try {
        exibirStatusRDKit(true, "CACTUS...");
        const res = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(sL)}/file?format=sdf`);
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(sL, termoBusca, sdf); return sdf; }
        }
      } catch (e) {}
    }

    exibirStatusRDKit(false);
    return null;
  }
  function salvarEmCache(smiles, nome, sdf) {
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarCompostoLocal === 'function') {
      LabStorageEngine.salvarCompostoLocal(smiles || nome, { sdf, nome });
    }
  }

  // =========================================================================
  // 25. CARREGAR ESTRUTURA
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;
    window.fecharInspectorAtomo();
    const wm = document.getElementById('studioWatermark');
    if (wm) wm.style.display = 'none';

    document.getElementById('studioMolNome').textContent = comp.nome;
    document.getElementById('studioMolFormula').textContent = comp.formula;
    document.getElementById('studioMolMassa').textContent = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(2)} g/mol` : '-- g/mol';
    const btnBench = document.getElementById('btnCarregarNaBancada');
    if (btnBench) btnBench.style.display = 'inline-flex';

    atualizarBotaoFavorito();
    desenharEstrutura2DStudio(comp.smiles, comp.nome);
    avaliarQuimiometriaCompleta(comp.smiles, parseFloat(comp.molarMass), comp.nome);

    const sdf = await resolverCoordenadas3D(comp.smiles, comp.pubchemQuery || comp.nome);
    sdfCacheLocal = sdf;

    if (sdf && validarConteudoSDF(sdf)) {
      construirCena3D(sdf);
      pushEdicaoSnapshot(comp, sdf, 'Carregamento');
      if (comp.unstable) exibirBannerInstabilidade();
      else removerBannerInstabilidade();
    } else {
      modeloCarregadoAtivo = false;
      const container = document.getElementById('studioViewer3D');
      if (container) {
        container.innerHTML = `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#facc15; font-size:0.8rem; text-align:center; max-width:80%; line-height:1.5;">
          ⚠️ <strong>Coordenadas 3D indisponíveis</strong><br>
          <span style="color:#94a3b8; font-size:0.7rem;">A projeção 2D continua funcional.<br>Motivo: SMILES inválido, sal sem estrutura de rede ou RDKit offline.</span>
        </div>`;
      }
      removerBannerInstabilidade();
    }
  }

  function exibirBannerInstabilidade() {
    removerBannerInstabilidade();
    const stage = document.getElementById('studioCanvasWrapper');
    if (!stage) return;
    const banner = document.createElement('div');
    banner.className = 'unstable-banner';
    banner.id = 'unstableBanner';
    banner.innerHTML = `
      <div>⚠️ <strong>Estrutura instável</strong> — valência estendida (radical).</div>
      <div class="unstable-actions">
        <button onclick="window.desfazerEdicao()">↶ Desfazer</button>
        <button onclick="document.getElementById('unstableBanner').remove()">OK</button>
      </div>
    `;
    stage.appendChild(banner);
  }
  function removerBannerInstabilidade() {
    const b = document.getElementById('unstableBanner');
    if (b) b.remove();
  }

  function construirCena3D(sdfText) {
    const container = document.getElementById('studioViewer3D');
    if (!container || !window.$3Dmol || !validarConteudoSDF(sdfText)) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(() => construirCena3D(sdfText), 250);
      return;
    }

    try {
      if (studioViewer) { try { studioViewer.stopAnimate(); } catch (e) {} try { studioViewer.clear(); } catch (e) {} }
      container.innerHTML = '';
      studioViewer = $3Dmol.createViewer(container, { backgroundColor: '#020617', antialias: true });
      const model = studioViewer.addModel(sdfText, 'sdf');
      if (!model || typeof model.selectedAtoms !== 'function') { modeloCarregadoAtivo = false; return; }
      const ats = model.selectedAtoms({}) || [];
      if (ats.length === 0) { modeloCarregadoAtivo = false; return; }
      modeloCarregadoAtivo = true;
      aplicarEstiloVisual(modeloAtual);
      studioViewer.setClickable({}, true, function (atom) {
        if (modoMedicaoAtivo) processarCliqueMedicao(atom);
        else selecionarEInspecionarAtomo(atom);
      });
      studioViewer.zoomTo();
      studioViewer.render();
      setTimeout(() => {
        if (studioViewer && modeloCarregadoAtivo) {
          try {
            const r2 = container.getBoundingClientRect();
            if (r2.width > 0 && r2.height > 0) { studioViewer.resize(); studioViewer.render(); }
          } catch (e) {}
        }
      }, 180);
      if (autoRotacaoAtiva) { try { studioViewer.animate({ loop: 'backAndForth', step: 0.35 }); } catch (e) {} }
    } catch (errCena) {
      modeloCarregadoAtivo = false;
    }
  }

  function aplicarEstiloVisual(tipo) {
    if (!studioViewer || !modeloCarregadoAtivo) return;
    try {
      studioViewer.removeAllSurfaces();
      switch (tipo) {
        case 'ballstick': studioViewer.setStyle({}, { stick: { radius: 0.15, colorscheme: 'Jmol' }, sphere: { scale: 0.28, colorscheme: 'Jmol' } }); break;
        case 'cpk': studioViewer.setStyle({}, { sphere: { scale: 1.0, colorscheme: 'Jmol' } }); break;
        case 'wireframe': studioViewer.setStyle({}, { line: { linewidth: 2.2, colorscheme: 'Jmol' } }); break;
        case 'surface':
          studioViewer.setStyle({}, { stick: { radius: 0.12, colorscheme: 'Jmol' }, sphere: { scale: 0.22, colorscheme: 'Jmol' } });
          studioViewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.65, color: '#38bdf8' });
          break;
      }
      studioViewer.render();
    } catch (e) {}
  }

  // =========================================================================
  // 26. 2D — Melhorado: trata sais e falhas
  // =========================================================================
  function desenharEstrutura2DStudio(smiles, nome) {
    const canvas = document.getElementById('studioCanvas2D');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (typeof SmilesDrawer === 'undefined') { desenharFallback2D(canvas, smiles, nome, 'SmilesDrawer não carregado'); return; }

    // Extrair componente principal se for sal
    const sL = extrairSmilesPrincipal(smiles);

    if (!sL || sL.startsWith('RADICAL_')) {
      desenharFallback2D(canvas, smiles, nome, 'Molécula inorgânica ou radical');
      return;
    }

    try {
      const drawer = new SmilesDrawer.Drawer({
        width: canvas.width,
        height: canvas.height,
        bondThickness: 2,
        bondLength: 22,
        isomeric: true,
        padding: 30
      });

      let desenhou = false;
      SmilesDrawer.parse(
        sL,
        function (tree) {
          try {
            drawer.draw(tree, canvas, 'dark', false);
            desenhou = true;
          } catch (e) {
            desenharFallback2D(canvas, sL, nome, 'Erro de desenho');
          }
        },
        function (err) {
          console.warn('[SmilesDrawer] Parse erro:', err);
          desenharFallback2D(canvas, sL, nome, 'SMILES inválido para desenho');
        }
      );
    } catch (e) {
      console.warn('[SmilesDrawer] Exceção:', e);
      desenharFallback2D(canvas, sL, nome, 'Exceção: ' + e.message);
    }
  }

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
    // Quebra o SMILES em múltiplas linhas se for longo
    const sm = smiles || '--';
    const maxChars = 60;
    const linhas = [];
    for (let i = 0; i < sm.length && linhas.length < 4; i += maxChars) {
      linhas.push(sm.substring(i, i + maxChars));
    }
    linhas.forEach((l, i) => {
      ctx.fillText(l, canvas.width / 2, canvas.height / 2 + i * 20);
    });
    if (motivo) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'italic 11px "Urbanist"';
      ctx.fillText('(' + motivo + ')', canvas.width / 2, canvas.height / 2 + linhas.length * 20 + 30);
    }
  }

  // =========================================================================
  // 27. CONTROLES
  // =========================================================================
  window.setModelo3D = function(m) {
    modeloAtual = m;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(b => b.classList.remove('active'));
    const map = { ballstick: 'btnModoBallStick', cpk: 'btnModoCPK', wireframe: 'btnModoWire', surface: 'btnModoSurface' };
    const t = document.getElementById(map[m]); if (t) t.classList.add('active');
    if (modeloCarregadoAtivo && modoExibicaoAtual === '3D') aplicarEstiloVisual(m);
    salvarPreferencias();
  };
  window.setStudioModoVisual = function(m) {
    modoExibicaoAtual = m;
    const v3 = document.getElementById('studioViewer3D'), v2 = document.getElementById('studioViewer2D');
    const b3 = document.getElementById('btnStudioView3D'), b2 = document.getElementById('btnStudioView2D');
    const grp = document.getElementById('group3DStyles');
    if (b3) b3.classList.toggle('active', m === '3D');
    if (b2) b2.classList.toggle('active', m === '2D');
    if (grp) grp.style.display = m === '3D' ? 'flex' : 'none';
    if (m === '3D') {
      if (v2) v2.style.display = 'none';
      if (v3) { v3.style.display = 'block'; if (studioViewer && modeloCarregadoAtivo) { studioViewer.resize(); studioViewer.render(); } }
    } else {
      if (v3) v3.style.display = 'none';
      if (v2) v2.style.display = 'flex';
    }
    salvarPreferencias();
  };
  window.toggleModoMedicao = function() {
    modoMedicaoAtivo = !modoMedicaoAtivo;
    atomosSelecionadosParaMedicao = [];
    window.fecharInspectorAtomo();
    const btn = document.getElementById('btnToolMeasure');
    const hud = document.getElementById('measureHud');
    if (btn) btn.classList.toggle('active', modoMedicaoAtivo);
    if (hud) hud.style.display = modoMedicaoAtivo ? 'flex' : 'none';
    if (!modoMedicaoAtivo) limparMedicoes3D();
  };
  function processarCliqueMedicao(atom) {
    if (!studioViewer || !atom || !modeloCarregadoAtivo) return;
    atomosSelecionadosParaMedicao.push(atom);
    studioViewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.35, color: '#e11d48' });
    const label = document.getElementById('studioLastMeasurement');
    if (atomosSelecionadosParaMedicao.length === 2) {
      const a1 = atomosSelecionadosParaMedicao[0], a2 = atomosSelecionadosParaMedicao[1];
      const d = Math.hypot(a2.x - a1.x, a2.y - a1.y, a2.z - a1.z);
      studioViewer.addLine({ start: { x: a1.x, y: a1.y, z: a1.z }, end: { x: a2.x, y: a2.y, z: a2.z }, color: '#fb7185', dashed: true });
      studioViewer.addLabel(`${d.toFixed(3)} Å`, { position: { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 }, backgroundColor: '#020617', fontColor: '#38bdf8', fontSize: 12 });
      if (label) label.textContent = `Distância (${a1.elem}-${a2.elem}): ${d.toFixed(3)} Å`;
      studioViewer.render();
    } else if (atomosSelecionadosParaMedicao.length === 3) {
      const a1 = atomosSelecionadosParaMedicao[0], a2 = atomosSelecionadosParaMedicao[1], a3 = atomosSelecionadosParaMedicao[2];
      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const mu = Math.hypot(u.x, u.y, u.z), mv = Math.hypot(v.x, v.y, v.z);
      const ang = (Math.acos(Math.max(-1, Math.min(1, dot / (mu * mv)))) * 180) / Math.PI;
      studioViewer.addLabel(`Ângulo: ${ang.toFixed(1)}°`, { position: { x: a2.x, y: a2.y + 0.35, z: a2.z }, backgroundColor: '#020617', fontColor: '#facc15', fontSize: 12 });
      if (label) label.textContent = `Ângulo (${a1.elem}-${a2.elem}-${a3.elem}): ${ang.toFixed(1)}°`;
      studioViewer.render();
      atomosSelecionadosParaMedicao = [];
    }
  }
  window.limparMedicoes3D = function() {
    atomosSelecionadosParaMedicao = [];
    const l = document.getElementById('studioLastMeasurement');
    if (l) l.textContent = 'Medições redefinidas.';
    if (sdfCacheLocal && studioViewer && modeloCarregadoAtivo) construirCena3D(sdfCacheLocal);
  };
  window.toggleAutoRotacao3D = function() {
    autoRotacaoAtiva = !autoRotacaoAtiva;
    const b = document.getElementById('btnAutoRotate');
    if (b) b.classList.toggle('active', autoRotacaoAtiva);
    if (studioViewer && modeloCarregadoAtivo) {
      try { if (autoRotacaoAtiva) studioViewer.animate({ loop: 'backAndForth', step: 0.35 }); else studioViewer.stopAnimate(); } catch (e) {}
    }
    salvarPreferencias();
  };
  window.resetarCamera3D = function() { if (studioViewer && modeloCarregadoAtivo) { studioViewer.zoomTo(); studioViewer.render(); studioViewer.resize(); } };
  window.exportarImagemPNG = function() {
    const nb = (compostoSelecionado?.nome || 'molecula').replace(/\s+/g, '_');
    if (modoExibicaoAtual === '3D' && studioViewer && modeloCarregadoAtivo) {
      const a = document.createElement('a'); a.download = `${nb}_3D.png`; a.href = studioViewer.pngURI(); a.click();
    } else {
      const c = document.getElementById('studioCanvas2D');
      if (c) { const a = document.createElement('a'); a.download = `${nb}_2D.png`; a.href = c.toDataURL('image/png'); a.click(); }
    }
  };
  window.exportarArquivoSDF = function() {
    if (!sdfCacheLocal) { mostrarNotificacao('Sem SDF.', 'error'); return; }
    const nb = (compostoSelecionado?.nome || 'composto').replace(/\s+/g, '_');
    const blob = new Blob([sdfCacheLocal], { type: 'chemical/x-mdl-sdfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${nb}.sdf`; a.click();
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // 28. SELEÇÃO
  // =========================================================================
  window.selecionarCompostoStudio = function(comp, el, addToHist = true) {
    if (!comp) return;
    compostoSelecionado = comp;
    document.querySelectorAll('.compound-item').forEach(i => i.classList.remove('selected'));
    if (el) el.classList.add('selected');
    if (addToHist) pushNavegacao(comp);
    carregarEstruturaNoStudio(comp);
  };
  window.carregarCompostoDoStudioNaBancada = function() {
    if (!compostoSelecionado) return;
    const payload = {
      chave: compostoSelecionado.chaveOriginal, nome: compostoSelecionado.nome,
      smiles: compostoSelecionado.smiles, formula: compostoSelecionado.formula,
      molarMass: compostoSelecionado.molarMass, timestamp: Date.now()
    };
    if (labBroadcast) labBroadcast.postMessage({ tipo: 'CARREGAR_COMPOSTO_BANCADA', composto: payload });
    if (window.parent && window.parent !== window) window.parent.postMessage({ acao: 'carregarCompostoNaBancada', composto: payload }, '*');
    localStorage.setItem('laift_composto_transferido', JSON.stringify(payload));
    if (window.opener) window.close();
    else if (window.parent && window.parent !== window) window.parent.postMessage({ acao: 'fecharModalStudio' }, '*');
    else window.location.href = '../index.html';
  };

  // =========================================================================
  // 29. INICIALIZAÇÃO
  // =========================================================================
  async function inicializarStudio() {
    console.log('[Studio] 🚀 Inicializando v' + STUDIO_VERSION);
    let tent = 0;
    while (tent < 10) {
      const { labDb, synthDb } = obterFontesDeDados();
      if (labDb || synthDb) break;
      await new Promise(r => setTimeout(r, 100));
      tent++;
    }
    carregarFavoritos();
    const w = inicializarWorker();
    if (w) {
      const { labDb, synthDb, expandidoDb } = obterFontesDeDados();
      w.postMessage({ tipo: 'INDEXAR', payload: { labDb, synthDb, expandidoDb, reserva: ACERVO_RESERVA } });
    } else {
      indexarAcervoCompletoFallback();
    }
    carregarRDKitSobDemanda();
    atualizarBotoesUndoRedo();
  }
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (studioViewer && modeloCarregadoAtivo) { studioViewer.resize(); studioViewer.render(); }
      if (cmpViewerA) { try { cmpViewerA.resize(); cmpViewerA.render(); } catch (e) {} }
      if (cmpViewerB) { try { cmpViewerB.resize(); cmpViewerB.render(); } catch (e) {} }
    }, 200);
  });
  window.addEventListener('message', (e) => {
    if (e.data && e.data.acao === 'studioAberto') setTimeout(() => { if (studioViewer && modeloCarregadoAtivo) { studioViewer.resize(); studioViewer.render(); } }, 120);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializarStudio);
  else inicializarStudio();

})();

/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js
 * Quimiometria, Inspeção Atômica, Tabela Periódica Interativa e Bioisosterismo
 */

(function() {
  'use strict';

  let labBroadcast = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      labBroadcast = new BroadcastChannel('laift_molecular_bus');
    }
  } catch (e) {
    console.warn('[Studio] BroadcastChannel em contingência.');
  }

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
  let ultimoDossieCADD = null;

  // Estado de Inspeção e Substituição Atômica
  let atomoAtivoInspecionado = null;
  let elementoPTableSelecionado = null;
  let atomHighlightShape = null;

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;

  // =========================================================================
  // 1. DATASET COMPLETO DA TABELA PERIÓDICA INTERATIVA (IUPAC)
  // =========================================================================
  const TABELA_PERIODICA = [
    { z: 1, sym: 'H', nome: 'Hidrogênio', massa: 1.008, eletron: 2.20, raio: 37, valPadrao: 1, valencias: [1], cat: 'nao-metal', grupo: 1, periodo: 1, pharma: 'Essencial em pontes de hidrogênio; passível de bioisosterismo com Flúor (-H ➔ -F) para bloquear o metabolismo oxidativo de CYP450.' },
    { z: 2, sym: 'He', nome: 'Hélio', massa: 4.003, eletron: null, raio: 32, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 1, pharma: 'Gás nobre inerte quimicamente sob condições biológicas normais.' },
    { z: 3, sym: 'Li', nome: 'Lítio', massa: 6.94, eletron: 0.98, raio: 152, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 2, pharma: 'Íon terapêutico monofásico no transtorno bipolar; inibe fosfatases de inositol (IMPase) e GSK-3beta.' },
    { z: 4, sym: 'Be', nome: 'Berílio', massa: 9.012, eletron: 1.57, raio: 112, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 2, pharma: 'Altamente tóxico; mimetiza magnésio mas causa inibição enzimática irreversível e beriliose.' },
    { z: 5, sym: 'B', nome: 'Boro', massa: 10.81, eletron: 2.04, raio: 85, valPadrao: 3, valencias: [3, 4], cat: 'metaloide', grupo: 13, periodo: 2, pharma: 'Ácido borônico (-B(OH)₂) atua como inibidor de proteassoma reversível de transição covalente (ex: Bortezomibe).' },
    { z: 6, sym: 'C', nome: 'Carbono', massa: 12.011, eletron: 2.55, raio: 77, valPadrao: 4, valencias: [4], cat: 'nao-metal', grupo: 14, periodo: 2, pharma: 'Espinha dorsal da química farmacêutica; permite hibridizações sp³, sp² e sp com quiralidade tridimensional tetraédrica.' },
    { z: 7, sym: 'N', nome: 'Nitrogênio', massa: 14.007, eletron: 3.04, raio: 75, valPadrao: 3, valencias: [3, 4], cat: 'nao-metal', grupo: 15, periodo: 2, pharma: 'Componente crucial de centros básicos protonáveis (aminas) e anéis heterocíclicos (piridinas, piperazinas).' },
    { z: 8, sym: 'O', nome: 'Oxigênio', massa: 15.999, eletron: 3.44, raio: 73, valPadrao: 2, valencias: [2], cat: 'nao-metal', grupo: 16, periodo: 2, pharma: 'Aceptor forte de ligações de hidrogênio (carbonilas, éteres, ésteres) e doador em hidroxilas (-OH).' },
    { z: 9, sym: 'F', nome: 'Flúor', massa: 18.998, eletron: 3.98, raio: 71, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 2, pharma: 'Bioisóstero clássico de hidrogênio; aumenta a lipofilicidade, reduz a basicidade de aminas vizinhas e bloqueia CYP450.' },
    { z: 10, sym: 'Ne', nome: 'Neônio', massa: 20.18, eletron: null, raio: 69, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 2, pharma: 'Gás nobre quimicamente inerte.' },
    { z: 11, sym: 'Na', nome: 'Sódio', massa: 22.99, eletron: 0.93, raio: 186, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 3, pharma: 'Contraiôn primordial para formulação de sais hidrossolúveis de fármacos ácidos (ex: Dipirona Sódica, Diclofenaco Sódico).' },
    { z: 12, sym: 'Mg', nome: 'Magnésio', massa: 24.305, eletron: 1.31, raio: 160, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 3, pharma: 'Cofator de quinases e estabilizador de ATP e DNA polimerases.' },
    { z: 13, sym: 'Al', nome: 'Alumínio', massa: 26.982, eletron: 1.61, raio: 143, valPadrao: 3, valencias: [3], cat: 'metal-pos-transicao', grupo: 13, periodo: 3, pharma: 'Antiácido gástrico e adjuvante imunológico em vacinas via precipitação coloidal.' },
    { z: 14, sym: 'Si', nome: 'Silício', massa: 28.085, eletron: 1.90, raio: 111, valPadrao: 4, valencias: [4], cat: 'metaloide', grupo: 14, periodo: 3, pharma: 'Bioisóstero tetravalente de Carbono (sila-substituição: C ➔ Si); aumenta o raio covalente e eleva significativamente o LogP.' },
    { z: 15, sym: 'P', nome: 'Fósforo', massa: 30.974, eletron: 2.19, raio: 106, valPadrao: 3, valencias: [3, 5], cat: 'nao-metal', grupo: 15, periodo: 3, pharma: 'Presente em profármacos fosfatados polares para injeção parenteral e em antivirais nucleotídeos (ex: Sofosbuvir).' },
    { z: 16, sym: 'S', nome: 'Enxofre', massa: 32.06, eletron: 2.58, raio: 102, valPadrao: 2, valencias: [2, 4, 6], cat: 'nao-metal', grupo: 16, periodo: 3, pharma: 'Bioisóstero divalente de oxigênio em tioéteres; atua em sulfonamidas antibacterianas (-SO₂NH₂) e pontes dissulfeto.' },
    { z: 17, sym: 'Cl', nome: 'Cloro', massa: 35.45, eletron: 3.16, raio: 99, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 3, pharma: 'Preenche bolsões hidrofóbicos estreitos em alvos enzimáticos e atua como formador de cloridratos solúveis.' },
    { z: 18, sym: 'Ar', nome: 'Argônio', massa: 39.948, eletron: null, raio: 97, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 3, pharma: 'Gás nobre inerte; protetor de reações sensíveis ao oxigênio e umidade.' },
    { z: 19, sym: 'K', nome: 'Potássio', massa: 39.098, eletron: 0.82, raio: 227, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 4, pharma: 'Principal cátion intracelular; forma sais de rápida dissolução oral (ex: Diclofenaco Potássico).' },
    { z: 20, sym: 'Ca', nome: 'Cálcio', massa: 40.078, eletron: 1.00, raio: 197, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 4, pharma: 'Segundo mensageiro celular e alvo de bloqueadores de canais de cálcio di-hidropiridínicos (ex: Amlodipino).' },
    { z: 26, sym: 'Fe', nome: 'Ferro', massa: 55.845, eletron: 1.83, raio: 126, valPadrao: 2, valencias: [2, 3], cat: 'metal-transicao', grupo: 8, periodo: 4, pharma: 'Centro redox da hemoglobina e de enzimas da família CYP450 hepáticas.' },
    { z: 29, sym: 'Cu', nome: 'Cobre', massa: 63.546, eletron: 1.90, raio: 128, valPadrao: 2, valencias: [1, 2], cat: 'metal-transicao', grupo: 11, periodo: 4, pharma: 'Cofator da citocromo c oxidase e superóxido dismutase.' },
    { z: 30, sym: 'Zn', nome: 'Zinco', massa: 65.38, eletron: 1.65, raio: 134, valPadrao: 2, valencias: [2], cat: 'metal-transicao', grupo: 12, periodo: 4, pharma: 'Cátion catalítico da Anidrase Carbônica; quelado por ácidos hidroxâmicos e sulfonamidas inibidoras.' },
    { z: 33, sym: 'As', nome: 'Arsênio', massa: 74.922, eletron: 2.18, raio: 119, valPadrao: 3, valencias: [3, 5], cat: 'metaloide', grupo: 15, periodo: 4, pharma: 'Compostos organoarsenicais históricos (Salvarsan de Paul Ehrlich); agente antileucêmico (Trisulfeto de Arsênio).' },
    { z: 34, sym: 'Se', nome: 'Selênio', massa: 78.96, eletron: 2.55, raio: 116, valPadrao: 2, valencias: [2, 4], cat: 'nao-metal', grupo: 16, periodo: 4, pharma: 'Bioisóstero de enxofre em selenoaminoácidos (selenocisteína) com elevado poder antioxidante.' },
    { z: 35, sym: 'Br', nome: 'Bromo', massa: 79.904, eletron: 2.96, raio: 114, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 4, pharma: 'Halogênio volumoso e polarizável; estabelece ligações de halogênio direcionadas com carbonilas de proteínas.' },
    { z: 53, sym: 'I', nome: 'Iodo', massa: 126.9, eletron: 2.66, raio: 133, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 5, pharma: 'Constituinte dos hormônios tireoidianos (T3/T4) e contrastes radiológicos iodados (ex: Io-hexol).' },
    { z: 78, sym: 'Pt', nome: 'Platina', massa: 195.08, eletron: 2.28, raio: 139, valPadrao: 2, valencias: [2, 4], cat: 'metal-transicao', grupo: 10, periodo: 6, pharma: 'Complexos antitumorais de coordenação que realizam cross-linking covalente no DNA (ex: Cisplatina, Oxaliplatina).' }
  ];

  // Posições de exibição na matriz 18x7
  const POSICOES_PTABLE = {
    'H': { r: 1, c: 1 }, 'He': { r: 1, c: 18 },
    'Li': { r: 2, c: 1 }, 'Be': { r: 2, c: 2 }, 'B': { r: 2, c: 13 }, 'C': { r: 2, c: 14 }, 'N': { r: 2, c: 15 }, 'O': { r: 2, c: 16 }, 'F': { r: 2, c: 17 }, 'Ne': { r: 2, c: 18 },
    'Na': { r: 3, c: 1 }, 'Mg': { r: 3, c: 2 }, 'Al': { r: 3, c: 13 }, 'Si': { r: 3, c: 14 }, 'P': { r: 3, c: 15 }, 'S': { r: 3, c: 16 }, 'Cl': { r: 3, c: 17 }, 'Ar': { r: 3, c: 18 },
    'K': { r: 4, c: 1 }, 'Ca': { r: 4, c: 2 }, 'Fe': { r: 4, c: 8 }, 'Cu': { r: 4, c: 11 }, 'Zn': { r: 4, c: 12 }, 'As': { r: 4, c: 15 }, 'Se': { r: 4, c: 16 }, 'Br': { r: 4, c: 17 },
    'I': { r: 5, c: 17 }, 'Pt': { r: 6, c: 10 }
  };

  // =========================================================================
  // 2. REAÇÕES BIOISOSTÉRICAS CLÁSSICAS
  // =========================================================================
  const REACOES_BIOISOSTERISMO = [
    {
      id: 'carboxila_tetrazol',
      nome: 'Bioisóstero de Tetrazol',
      tag: 'Bioisóstero Não-Clássico',
      esquema: 'R-COOH ➔ R-(1H-Tetrazol-5-il)',
      descricao: 'Mantém deslocalização de carga negativa e acidez (pKa ~4.5), porém é 10x mais lipofílico, ampliando a permeabilidade celular e resistência à depuração metabólica.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s),
      transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'c1nnn[nH]1')
    },
    {
      id: 'esterificacao_metilica',
      nome: 'Éster Metílico (Pró-fármaco)',
      tag: 'Estratégia Pró-fármaco',
      esquema: 'R-COOH ➔ R-COOCH₃',
      descricao: 'Mascara a carga aniônica fisiológica da carboxila, elevando o LogP para transpor barreiras biológicas. Regenera o ácido livre no plasma por ação de esterases.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s),
      transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)OC')
    },
    {
      id: 'amidacao_primaria',
      nome: 'Amidação de Carboxila',
      tag: 'Bioisóstero Clássico',
      esquema: 'R-COOH ➔ R-CONH₂',
      descricao: 'Neutraliza a acidez e estabiliza interações por ligações de hidrogênio com resíduos polares do sítio ativo.',
      alvoSmarts: 'C(=O)[OH]',
      detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s),
      transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)N')
    },
    {
      id: 'o_metilacao',
      nome: 'O-Metilação (Éter Metílico)',
      tag: 'Bloqueio de Fase II',
      esquema: 'Ar-OH ➔ Ar-OCH₃',
      descricao: 'Protege hidroxilas e fenóis contra glicuronidação e sulfatação hepáticas rápidas, além de diminuir o número de doadores de hidrogênio (HBD).',
      alvoSmarts: '[OH]',
      detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s) || /O[H]/i.test(s),
      transformar: (s) => s.replace(/c\(O\)/i, 'c(OC)').replace(/\[OH\]/i, 'OC').replace(/O[H]/i, 'OC')
    },
    {
      id: 'o_acetilacao',
      nome: 'O-Acetilação (Esterificação)',
      tag: 'Atenuação de Toxicidade',
      esquema: 'Ar-OH ➔ Ar-OCOCH₃',
      descricao: 'Conversão clássica do Ácido Salicílico em Aspirina: protege contra irritação direta da mucosa gástrica e modula a acetilação da enzima COX.',
      alvoSmarts: 'c[OH]',
      detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s),
      transformar: (s) => s.replace(/c\(O\)/i, 'c(OC(=O)C)').replace(/\[OH\]/i, 'OC(=O)C')
    },
    {
      id: 'n_acetilacao',
      nome: 'N-Acetilação de Amina',
      tag: 'Otimização Analgésica',
      esquema: 'Ar-NH₂ ➔ Ar-NHCOCH₃',
      descricao: 'Conversão bioisostérica de 4-aminofenol em Paracetamol: atenua toxicidade de aminas livres e potencializa propriedades analgésicas.',
      alvoSmarts: '[NH2]',
      detectar: (s) => /N/i.test(s) && !/N\(=O\)/i.test(s),
      transformar: (s) => s.replace(/NC/i, 'N(C(=O)C)C').replace(/\[NH2\]/i, 'NC(=O)C').replace(/N(?=[^(=O)])/i, 'NC(=O)C')
    },
    {
      id: 'fluorizacao_aromatica',
      nome: 'Fluorização Aromática (Bloqueio CYP)',
      tag: 'Bioisóstero H ➔ F',
      esquema: 'Ar-H ➔ Ar-F',
      descricao: 'O flúor mimetiza o hidrogênio espacialmente, porém o forte efeito indutivo retirador de elétrons desativa o anel aromático contra a oxidação por CYP450.',
      alvoSmarts: 'c1ccccc1',
      detectar: (s) => /c1ccccc1/i.test(s) || /c[0-9]ccc/i.test(s),
      transformar: (s) => s.replace(/c1ccccc1/i, 'c1ccc(F)cc1').replace(/c1/i, 'c1(F)')
    }
  ];

  // =========================================================================
  // 3. INGESTÃO DOS BANCOS DE DADOS
  // =========================================================================
  function obterFontesDeDados() {
    const labDb = window.LAB_DATABASE || 
                 (window.parent && window.parent.LAB_DATABASE) || 
                 (window.opener && window.opener.LAB_DATABASE) || null;

    const synthDb = window.BANCO_SINTESES_LAIFT || 
                   (window.parent && window.parent.BANCO_SINTESES_LAIFT) || 
                   (window.opener && window.opener.BANCO_SINTESES_LAIFT) || null;

    const expandidoDb = window.BANCO_COMPOSTOS_EXPANDIDO || 
                       (window.parent && window.parent.BANCO_COMPOSTOS_EXPANDIDO) || 
                       (window.opener && window.opener.BANCO_COMPOSTOS_EXPANDIDO) || null;

    return { labDb, synthDb, expandidoDb };
  }

  function indexarAcervoCompleto() {
    const mapaUnico = new Map();
    const { labDb, synthDb, expandidoDb } = obterFontesDeDados();

    if (labDb && labDb.species) {
      Object.entries(labDb.species).forEach(([chave, dados]) => {
        const id = chave.replace(/_s|_l|_aq|_g/g, '');
        mapaUnico.set(id.toLowerCase(), {
          id: id,
          chaveOriginal: chave,
          nome: dados.label || id,
          formula: dados.formula || '--',
          molarMass: dados.molarMass || '--',
          smiles: dados.smiles || '--',
          categoria: classificarCategoria(dados.formula, chave, dados.label),
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
            id: id,
            chaveOriginal: synth.produtoId || synth.id,
            nome: synth.nomeComposto,
            formula: synth.formula || '--',
            molarMass: synth.molarMass || '--',
            smiles: synth.smiles || '--',
            categoria: 'farmacos',
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
            id: c.id || c.nome,
            chaveOriginal: c.chave || c.id || c.nome,
            nome: c.nome,
            formula: c.formula || '--',
            molarMass: c.molarMass || '--',
            smiles: c.smiles || '--',
            categoria: 'reagentes',
            pubchemQuery: c.pubchemQuery || c.nome
          });
        }
      });
    }

    // Base de Salvaguarda
    const acervoReserva = [
      { id: "AAS", chaveOriginal: "AAS_s", nome: "Ácido Acetilsalicílico (Aspirina)", formula: "C9H8O4", molarMass: 180.16, smiles: "CC(=O)OC1=CC=CC=C1C(=O)O", categoria: "farmacos", pubchemQuery: "Aspirin" },
      { id: "Paracetamol", chaveOriginal: "Paracetamol_s", nome: "Paracetamol (Acetaminofeno)", formula: "C8H9NO2", molarMass: 151.16, smiles: "CC(=O)NC1=CC=C(O)C=C1", categoria: "farmacos", pubchemQuery: "Acetaminophen" },
      { id: "Dipirona", chaveOriginal: "Dipirona_s", nome: "Dipirona Sódica (Metamizol)", formula: "C13H16N3NaO4S", molarMass: 333.34, smiles: "CN(CS(=O)(=O)[O-])C1=C(C)N(N1C)C2=CC=CC=C2.[Na+]", categoria: "farmacos", pubchemQuery: "Metamizole sodium" },
      { id: "Ibuprofeno", chaveOriginal: "C13H18O2_s", nome: "Ibuprofeno", formula: "C13H18O2", molarMass: 206.28, smiles: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O", categoria: "farmacos", pubchemQuery: "Ibuprofen" },
      { id: "Cafeina", chaveOriginal: "Cafeina_s", nome: "Cafeína", formula: "C8H10N4O2", molarMass: 194.19, smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", categoria: "farmacos", pubchemQuery: "Caffeine" },
      { id: "AcidoSalicilico", chaveOriginal: "AcidoSalicilico_s", nome: "Ácido Salicílico", formula: "C7H6O3", molarMass: 138.12, smiles: "O=C(O)C1=CC=CC=C1O", categoria: "reagentes", pubchemQuery: "Salicylic acid" },
      { id: "AnidridoAcetico", chaveOriginal: "AnidridoAcetico_l", nome: "Anidrido Acético", formula: "C4H6O3", molarMass: 102.09, smiles: "CC(=O)OC(=O)C", categoria: "reagentes", pubchemQuery: "Acetic anhydride" },
      { id: "pAminofenol", chaveOriginal: "pAminofenol_s", nome: "4-Aminofenol", formula: "C6H7NO", molarMass: 109.13, smiles: "NC1=CC=C(O)C=C1", categoria: "reagentes", pubchemQuery: "4-Aminophenol" },
      { id: "Etanol", chaveOriginal: "Etanol_l", nome: "Etanol Absoluto", formula: "C2H6O", molarMass: 46.07, smiles: "CCO", categoria: "solventes", pubchemQuery: "Ethanol" },
      { id: "Metanol", chaveOriginal: "Metanol_l", nome: "Metanol", formula: "CH4O", molarMass: 32.04, smiles: "CO", categoria: "solventes", pubchemQuery: "Methanol" },
      { id: "Acetona", chaveOriginal: "Acetona_l", nome: "Acetona Pura", formula: "C3H6O", molarMass: 58.08, smiles: "CC(=O)C", categoria: "solventes", pubchemQuery: "Acetone" },
      { id: "Hexano", chaveOriginal: "Hexano_l", nome: "Hexano", formula: "C6H14", molarMass: 86.18, smiles: "CCCCCC", categoria: "solventes", pubchemQuery: "Hexane" },
      { id: "Cloroformio", chaveOriginal: "Cloroformio_l", nome: "Clorofórmio", formula: "CHCl3", molarMass: 119.38, smiles: "ClC(Cl)Cl", categoria: "solventes", pubchemQuery: "Chloroform" },
      { id: "Na", chaveOriginal: "Na_s", nome: "Sódio Metálico", formula: "Na", molarMass: 22.99, smiles: "[Na]", categoria: "reagentes", pubchemQuery: "Sodium" }
    ];

    acervoReserva.forEach(comp => {
      const norm = comp.id.toLowerCase();
      if (!mapaUnico.has(norm)) {
        mapaUnico.set(norm, comp);
      }
    });

    compostosIndexados = Array.from(mapaUnico.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    compostosFiltrados = [...compostosIndexados];

    const totalBadge = document.getElementById('studioTotalBadge');
    if (totalBadge) {
      totalBadge.textContent = `${compostosIndexados.length} Espécies Prontas`;
    }

    atualizarContadorFiltrados();
  }

  function classificarCategoria(formula, chave, label) {
    const txt = (chave + ' ' + (label || '')).toLowerCase();
    if (txt.includes('custom') || txt.includes('derivado')) return 'custom';
    if (txt.includes('sarin') || txt.includes('vx') || txt.includes('estricnina') || txt.includes('toxina')) return 'toxicos';
    if (txt.includes('agua') || txt.includes('etanol') || txt.includes('metanol') || txt.includes('acetona') || txt.includes('hexano') || txt.includes('cloroformio')) return 'solventes';
    if (txt.includes('acido') || txt.includes('hidroxido') || txt.includes('cloreto') || txt.includes('sulfato') || txt.includes('anidrido') || txt.includes('sodio')) return 'reagentes';
    return 'farmacos';
  }

  function atualizarContadorFiltrados() {
    const el = document.getElementById('studioFilteredCount');
    if (el) el.textContent = `${compostosFiltrados.length} compostos visíveis`;
  }

  // =========================================================================
  // 4. VIRTUALIZAÇÃO DA LISTA LATERAL
  // =========================================================================
  function renderizarListaCompostos(reset = true) {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;

    if (reset) {
      listContainer.innerHTML = '';
      currentRenderedIndex = 0;
      listContainer.scrollTop = 0;
    }

    const fatia = compostosFiltrados.slice(currentRenderedIndex, currentRenderedIndex + ITEMS_PER_CHUNK);
    if (fatia.length === 0 && reset) {
      listContainer.innerHTML = `<div style="padding: 24px; color: #64748b; text-align: center; font-size: 0.75rem;">Nenhum composto localizado.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    fatia.forEach(comp => {
      const itemEl = document.createElement('div');
      itemEl.className = 'compound-item' + (compostoSelecionado?.id === comp.id ? ' selected' : '');
      itemEl.onclick = () => selecionarCompostoStudio(comp, itemEl);

      const massaDisplay = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(1)}` : '--';
      const isCustom = comp.categoria === 'custom';

      itemEl.innerHTML = `
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
    atualizarContadorFiltrados();
  }

  window.handleStudioScroll = function() {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;
    if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 70) {
      if (currentRenderedIndex < compostosFiltrados.length) {
        renderizarListaCompostos(false);
      }
    }
  };

  window.filtrarCompostosStudio = function(termo) {
    clearTimeout(debounceBuscaTimer);
    debounceBuscaTimer = setTimeout(() => {
      const q = (termo || '').trim().toLowerCase();
      const categoriaAtiva = document.querySelector('.category-pill.active')?.dataset.cat || 'todas';

      compostosFiltrados = compostosIndexados.filter(c => {
        const matchesQuery = c.nome.toLowerCase().includes(q) ||
                             c.formula.toLowerCase().includes(q) ||
                             c.smiles.toLowerCase().includes(q);
        const matchesCategory = categoriaAtiva === 'todas' || c.categoria === categoriaAtiva;
        return matchesQuery && matchesCategory;
      });

      renderizarListaCompostos(true);
    }, 120);
  };

  window.filtrarCategoriaStudio = function(cat) {
    document.querySelectorAll('.category-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    const input = document.getElementById('studioSearchInput');
    const q = (input ? input.value : '').trim().toLowerCase();

    compostosFiltrados = compostosIndexados.filter(c => {
      const matchesCategory = cat === 'todas' || c.categoria === cat;
      const matchesQuery = !q || c.nome.toLowerCase().includes(q) ||
                                 c.formula.toLowerCase().includes(q) ||
                                 c.smiles.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    renderizarListaCompostos(true);
  };

  // =========================================================================
  // 5. MOTOR RDKIT WASM (AVALIAÇÃO CADD: LIPINSKI, VEBER, GHOSE, PAINS)
  // =========================================================================
  function carregarRDKitSobDemanda() {
    if (RDKitModuleInstance) return Promise.resolve(RDKitModuleInstance);
    if (rdkitPromise) return rdkitPromise;

    rdkitPromise = new Promise(async (resolve) => {
      exibirStatusRDKit(true, "Iniciando RDKit WebAssembly...");
      try {
        if (typeof window.initRDKitModule === 'function') {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout RDKit")), 4000));
          RDKitModuleInstance = await Promise.race([window.initRDKitModule(), timeoutPromise]);
          exibirStatusRDKit(false);
          resolve(RDKitModuleInstance);
        } else {
          exibirStatusRDKit(false);
          resolve(null);
        }
      } catch (e) {
        exibirStatusRDKit(false);
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

  async function calcularPropriedadesMoleculares(smiles, molarMass) {
    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit || !smiles || smiles === '--' || smiles.includes('.')) return null;

    try {
      const mol = rdkit.get_mol(smiles);
      if (!mol) return null;

      const desc = JSON.parse(mol.get_descriptors());
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
        const molComH = rdkit.get_mol(smiles);
        if (molComH) {
          molComH.add_hs();
          totalAtoms = molComH.get_num_atoms();
          molComH.delete();
        }
      } catch (e) {}

      // Varredura PAINS
      const alertasPAINS = [];
      for (const p of PAINS_SUBSTRUCTURES) {
        try {
          const qmol = rdkit.get_qmol(p.smarts);
          if (qmol) {
            const match = mol.get_substruct_match(qmol);
            qmol.delete();
            if (match && match !== "{}" && match !== "" && match.includes("atoms")) {
              alertasPAINS.push(p);
            }
          }
        } catch (errSub) {}
      }

      mol.delete();

      const falhasLipinski = [];
      if (mw > 500) falhasLipinski.push("Massa Molar > 500 Da");
      if (logp > 5.0) falhasLipinski.push("LogP > 5.0");
      if (hbd > 5) falhasLipinski.push("Doadores H > 5");
      if (hba > 10) falhasLipinski.push("Aceptores H > 10");

      const falhasVeber = [];
      if (rotb > 10) falhasVeber.push("Ligações Rotacionáveis > 10");
      if (tpsa > 140) falhasVeber.push("TPSA > 140 Å²");

      const falhasGhose = [];
      if (mw < 160 || mw > 480) falhasGhose.push("Massa Molar fora de 160-480 Da");
      if (logp < -0.4 || logp > 5.6) falhasGhose.push("LogP fora de -0.4 a 5.6");
      if (mr < 40 || mr > 130) falhasGhose.push("Refração Molar fora de 40-130");
      if (totalAtoms < 20 || totalAtoms > 70) falhasGhose.push("Total de Átomos fora de 20-70");

      return {
        mw, logp, mr, tpsa, hbd, hba, rotb, heavyAtoms, totalAtoms, csp3,
        falhasLipinski, falhasVeber, falhasGhose, alertasPAINS
      };
    } catch (e) {
      return null;
    }
  }

  async function avaliarQuimiometriaCompleta(smiles, molarMass, nomeComposto) {
    const bLipinski = document.getElementById('badgeLipinski');
    const bVeber = document.getElementById('badgeVeber');
    const bGhose = document.getElementById('badgeGhose');
    const bPAINS = document.getElementById('badgePAINS');

    if (!bLipinski || !bVeber || !bGhose || !bPAINS) return;

    if (!smiles || smiles === '--' || smiles.includes('.')) {
      bLipinski.className = 'cadd-badge badge-pending';
      bLipinski.textContent = 'Lipinski: N/A';
      bVeber.className = 'cadd-badge badge-pending';
      bVeber.textContent = 'Veber: N/A';
      bGhose.className = 'cadd-badge badge-pending';
      bGhose.textContent = 'Ghose: N/A';
      bPAINS.className = 'cadd-badge badge-pending';
      bPAINS.textContent = 'PAINS: N/A';
      ultimoDossieCADD = null;
      return;
    }

    const props = await calcularPropriedadesMoleculares(smiles, molarMass);
    if (!props) {
      bLipinski.textContent = 'Lipinski: Estimado';
      bVeber.textContent = 'Veber: Estimado';
      bGhose.textContent = 'Ghose: Estimado';
      bPAINS.textContent = 'PAINS: Estimado';
      return;
    }

    if (props.falhasLipinski.length === 0) {
      bLipinski.className = 'cadd-badge badge-approved';
      bLipinski.textContent = 'Lipinski: Aprovado (0 viol.)';
    } else if (props.falhasLipinski.length === 1) {
      bLipinski.className = 'cadd-badge badge-warning';
      bLipinski.textContent = 'Lipinski: 1 Violação';
    } else {
      bLipinski.className = 'cadd-badge badge-rejected';
      bLipinski.textContent = `Lipinski: ${props.falhasLipinski.length} Violações`;
    }

    if (props.falhasVeber.length === 0) {
      bVeber.className = 'cadd-badge badge-approved';
      bVeber.textContent = 'Veber: Aprovado';
    } else {
      bVeber.className = 'cadd-badge badge-rejected';
      bVeber.textContent = `Veber: ${props.falhasVeber.length} Violações`;
    }

    if (props.falhasGhose.length === 0) {
      bGhose.className = 'cadd-badge badge-approved';
      bGhose.textContent = 'Ghose: Aprovado';
    } else if (props.falhasGhose.length === 1) {
      bGhose.className = 'cadd-badge badge-warning';
      bGhose.textContent = 'Ghose: 1 Violação';
    } else {
      bGhose.className = 'cadd-badge badge-rejected';
      bGhose.textContent = `Ghose: ${props.falhasGhose.length} Violações`;
    }

    if (props.alertasPAINS.length === 0) {
      bPAINS.className = 'cadd-badge badge-approved';
      bPAINS.textContent = 'PAINS: Limpo (0 Alertas)';
    } else {
      bPAINS.className = 'cadd-badge badge-rejected';
      bPAINS.textContent = `PAINS: ${props.alertasPAINS.length} Alerta(s)!`;
    }

    ultimoDossieCADD = { ...props, nome: nomeComposto, smiles: smiles };
  }

  // =========================================================================
  // 6. INSPEÇÃO ATÔMICA & SELEÇÃO DIRETA NO MODELO 3D
  // =========================================================================
  function selecionarEInspecionarAtomo(atom) {
    if (!studioViewer || !atom) return;
    atomoAtivoInspecionado = atom;

    // Destacar átomo com uma esfera sutil sem quebrar o modelo
    try {
      if (atomHighlightShape) {
        studioViewer.removeShape(atomHighlightShape);
        atomHighlightShape = null;
      }
      atomHighlightShape = studioViewer.addSphere({
        center: { x: atom.x, y: atom.y, z: atom.z },
        radius: 0.42,
        color: '#00e5ff',
        opacity: 0.55
      });
      studioViewer.render();
    } catch (e) {}

    // Resgata os dados físico-químicos do elemento
    const elemSym = (atom.elem || 'C').toUpperCase();
    const elemData = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === elemSym) || {
      z: '?', sym: elemSym, nome: 'Elemento', massa: '--', eletron: '--', raio: '--', valPadrao: 1, valencias: [1]
    };

    // Identifica ligações e vizinhos
    const vizinhosArray = [];
    const numLigacoes = atom.bonds ? atom.bonds.length : 0;
    if (atom.bonds && Array.isArray(atom.bonds)) {
      const todosAtomos = studioViewer.selectedAtoms({}) || [];
      atom.bonds.forEach(bIdx => {
        const vAt = todosAtomos.find(a => (a.serial === bIdx || a.index === bIdx));
        if (vAt) vizinhosArray.push(`${vAt.elem}#${(vAt.serial || vAt.index || 0) + 1}`);
      });
    }

    // Preenche e exibe o HUD Flutuante
    const hud = document.getElementById('atomInspectorHud');
    const hBadge = document.getElementById('hudAtomBadge');
    const hTitle = document.getElementById('hudAtomTitle');
    const hSub = document.getElementById('hudAtomSub');
    const hEletron = document.getElementById('hudAtomEletron');
    const hRaio = document.getElementById('hudAtomRaio');
    const hNeighbors = document.getElementById('hudAtomNeighbors');

    if (hud) {
      if (hBadge) hBadge.textContent = elemData.sym;
      if (hTitle) hTitle.textContent = `${elemData.nome} (${elemData.sym}) — Átomo #${(atom.serial || atom.index || 0) + 1}`;
      if (hSub) hSub.textContent = `Coord: (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)}) • ${numLigacoes} Ligação(ões)`;
      if (hEletron) hEletron.textContent = elemData.eletron ? `${elemData.eletron} (Pauling)` : 'Inerte / Sem dado';
      if (hRaio) hRaio.textContent = elemData.raio ? `${elemData.raio} pm` : '--';
      if (hNeighbors) hNeighbors.textContent = vizinhosArray.length > 0 ? vizinhosArray.join(', ') : 'Átomo isolado';
      hud.style.display = 'flex';
    }

    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) {
      hudLabel.textContent = `Átomo Selecionado: ${elemData.nome} (${elemData.sym}) com ${numLigacoes} ligações.`;
    }
  }

  window.fecharInspectorAtomo = function() {
    const hud = document.getElementById('atomInspectorHud');
    if (hud) hud.style.display = 'none';
    if (studioViewer && atomHighlightShape) {
      try {
        studioViewer.removeShape(atomHighlightShape);
        atomHighlightShape = null;
        studioViewer.render();
      } catch (e) {}
    }
  };

  window.substituirAtomoClicadoViaTabela = function() {
    if (!atomoAtivoInspecionado) return;
    window.abrirTabelaPeriodica(atomoAtivoInspecionado);
  };

  // =========================================================================
  // 7. TABELA PERIÓDICA INTERATIVA: RENDERIZAÇÃO & SUBSTITUIÇÃO QUÍMICA
  // =========================================================================
  window.abrirTabelaPeriodica = function(atomoContexto) {
    if (atomoContexto) {
      atomoAtivoInspecionado = atomoContexto;
    }
    const modal = document.getElementById('periodicTableModal');
    const matrix = document.getElementById('ptableMatrix');
    const sub = document.getElementById('ptableSubHeader');
    if (!modal || !matrix) return;

    if (sub) {
      if (atomoAtivoInspecionado) {
        const nLig = atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : 0;
        sub.innerHTML = `Substituindo Átomo <strong>${atomoAtivoInspecionado.elem}#${(atomoAtivoInspecionado.serial || atomoAtivoInspecionado.index || 0) + 1}</strong> (${nLig} ligação(ões) ativas). Elementos compatíveis destacados em verde.`;
      } else {
        sub.textContent = 'Consulte parâmetros físico-químicos e regras de valência para planejamento farmacêutico.';
      }
    }

    renderizarMatrizTabelaPeriodica('todas');

    // Se houver elemento atual no átomo, seleciona ele automaticamente
    if (atomoAtivoInspecionado) {
      const eMatch = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === (atomoAtivoInspecionado.elem || '').toUpperCase());
      if (eMatch) selecionarElementoNaTabela(eMatch);
    } else if (TABELA_PERIODICA.length > 0) {
      selecionarElementoNaTabela(TABELA_PERIODICA[5]); // Carbono por padrão
    }

    modal.style.display = 'flex';
  };

  window.fecharTabelaPeriodica = function() {
    const modal = document.getElementById('periodicTableModal');
    if (modal) modal.style.display = 'none';
  };

  window.filtrarElementosPTable = function(cat) {
    document.querySelectorAll('.ptable-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    renderizarMatrizTabelaPeriodica(cat);
  };

  function renderizarMatrizTabelaPeriodica(filtroCat) {
    const matrix = document.getElementById('ptableMatrix');
    if (!matrix) return;
    matrix.innerHTML = '';

    const nLigacoesAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;

    TABELA_PERIODICA.forEach(elem => {
      const pos = POSICOES_PTABLE[elem.sym];
      if (!pos) return;

      const tile = document.createElement('div');
      tile.className = `ptable-tile cat-${elem.cat}`;
      tile.style.gridRow = pos.r;
      tile.style.gridColumn = pos.c;

      // Validação de compatibilidade se houver átomo no contexto
      let isCompativel = true;
      if (nLigacoesAlvo !== null) {
        const valMax = Math.max(...elem.valencias);
        isCompativel = (nLigacoesAlvo <= valMax && valMax > 0);
        if (isCompativel) tile.classList.add('compatible');
        else tile.classList.add('incompatible');
      }

      if (filtroCat !== 'todas' && elem.cat !== filtroCat) {
        tile.style.opacity = '0.15';
      }

      if (elementoPTableSelecionado?.sym === elem.sym) {
        tile.classList.add('selected');
      }

      tile.onclick = () => selecionarElementoNaTabela(elem, tile);

      tile.innerHTML = `
        <span class="ptable-z">${elem.z}</span>
        <span class="ptable-sym">${elem.sym}</span>
        <span class="ptable-mass">${elem.massa < 100 ? elem.massa.toFixed(1) : Math.round(elem.massa)}</span>
      `;

      matrix.appendChild(tile);
    });
  }

  function selecionarElementoNaTabela(elem, tileEl) {
    elementoPTableSelecionado = elem;
    document.querySelectorAll('.ptable-tile').forEach(t => t.classList.remove('selected'));
    if (tileEl) tileEl.classList.add('selected');

    const sidebar = document.getElementById('ptableDetailContent');
    if (!sidebar) return;

    // Checagem de valência pedagógica
    const nLigacoesAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;
    let htmlValenceCheck = '';
    let podeSubstituir = false;

    if (atomoAtivoInspecionado && nLigacoesAlvo !== null) {
      const valMax = Math.max(...elem.valencias);
      if (elem.sym === atomoAtivoInspecionado.elem) {
        htmlValenceCheck = `<div class="ptable-valence-check valence-valid">ℹ️ O átomo já é do elemento <strong>${elem.nome}</strong>.</div>`;
      } else if (valMax === 0) {
        htmlValenceCheck = `<div class="ptable-valence-check valence-invalid">⚠️ Gases nobres possuem camada de valência completa e não realizam ligações covalentes estáveis nesta posição.</div>`;
      } else if (nLigacoesAlvo > valMax) {
        htmlValenceCheck = `<div class="ptable-valence-check valence-invalid">
          ⚠️ <strong>Incompatibilidade de Valência (Regra do Octeto):</strong><br>
          O átomo alvo possui <strong>${nLigacoesAlvo} ligação(ões) ativas</strong>, mas o elemento <strong>${elem.nome} (${elem.sym})</strong> suporta no máximo <strong>${valMax} ligação(ões)</strong> sem violar a estabilidade química.
        </div>`;
      } else {
        podeSubstituir = true;
        htmlValenceCheck = `<div class="ptable-valence-check valence-valid">
          ✅ <strong>Substituição Quimicamente Estável:</strong><br>
          O elemento ${elem.nome} suporta valência ${elem.valencias.join('/')}, comportando perfeitamente as ${nLigacoesAlvo} ligação(ões) existentes no sítio.
        </div>`;
      }
    } else {
      htmlValenceCheck = `<div class="ptable-valence-check" style="background:rgba(255,255,255,0.04); color:#94a3b8;">
        Dica: Clique diretamente em um átomo no visualizador 3D para ativar o botão de substituição in loco.
      </div>`;
    }

    sidebar.innerHTML = `
      <div class="ptable-hero-card">
        <div class="ptable-hero-badge">
          <span class="hero-z">${elem.z}</span>
          <span class="hero-sym">${elem.sym}</span>
        </div>
        <div class="ptable-hero-info">
          <span class="ptable-hero-name">${elem.nome}</span>
          <span class="ptable-hero-family">${elem.cat.replace('-', ' ')} • Grupo ${elem.grupo}</span>
        </div>
      </div>

      <div class="ptable-params-list">
        <div class="ptable-param-row">
          <span>Número Atômico (Z):</span>
          <strong>${elem.z}</strong>
        </div>
        <div class="ptable-param-row">
          <span>Massa Atômica:</span>
          <strong>${elem.massa} g/mol</strong>
        </div>
        <div class="ptable-param-row">
          <span>Eletronegatividade (Pauling):</span>
          <strong>${elem.eletron ? elem.eletron : 'Inerte / N/A'}</strong>
        </div>
        <div class="ptable-param-row">
          <span>Raio Covalente:</span>
          <strong>${elem.raio} pm</strong>
        </div>
        <div class="ptable-param-row">
          <span>Valências Padrão:</span>
          <strong>${elem.valencias.join(', ')}</strong>
        </div>
      </div>

      <div class="ptable-pharma-box">
        <strong style="color:var(--neon-cyan); display:block; margin-bottom:3px;">Papel na Química Medicinal:</strong>
        ${elem.pharma}
      </div>

      ${htmlValenceCheck}

      ${atomoAtivoInspecionado ? `
        <button class="btn-execute-atom-swap" id="btnApplySwap" ${!podeSubstituir ? 'disabled' : ''} onclick="window.executarSubstituicaoElementar('${elem.sym}')">
          ⚡ Substituir Átomo #${(atomoAtivoInspecionado.serial || atomoAtivoInspecionado.index || 0) + 1} (${atomoAtivoInspecionado.elem} ➔ ${elem.sym})
        </button>
      ` : ''}
    `;
  }

  /**
   * Substituição Química Direta no Grafo Molecular com Validação RDKit
   */
  window.executarSubstituicaoElementar = async function(novoSimbolo) {
    if (!atomoAtivoInspecionado || !compostoSelecionado || !sdfCacheLocal) return;

    const elemAntigo = atomoAtivoInspecionado.elem;
    const atomIdx = atomoAtivoInspecionado.index !== undefined ? atomoAtivoInspecionado.index : (atomoAtivoInspecionado.serial - 1);

    // Substituição cirúrgica no Molblock / SDF
    const linhas = sdfCacheLocal.split('\n');
    let linhaAtomoIdx = -1;
    let contadorAtomos = 0;

    for (let i = 4; i < linhas.length; i++) {
      const l = linhas[i];
      if (l.includes('M  END') || l.includes('$$$$')) break;
      if (l.length >= 31) {
        if (contadorAtomos === atomIdx) {
          linhaAtomoIdx = i;
          break;
        }
        contadorAtomos++;
      }
    }

    if (linhaAtomoIdx === -1) {
      alert("Não foi possível mapear a posição atômica no arquivo tridimensional.");
      return;
    }

    // Substitui o símbolo atômico preservando as colunas exatas da especificação V2000
    const linhaOriginal = linhas[linhaAtomoIdx];
    const prefixoCoords = linhaOriginal.substring(0, 31);
    const sufixoPropriedades = linhaOriginal.substring(34);
    const novaLinhaAtomo = prefixoCoords + novoSimbolo.padEnd(3) + sufixoPropriedades;
    linhas[linhaAtomoIdx] = novaLinhaAtomo;

    const novoSdfModificado = linhas.join('\n');

    // Validação estrita de valência via RDKit WebAssembly
    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const molValidado = rdkit.get_mol(novoSdfModificado);
        if (!molValidado) {
          alert(`Violação Química: A substituição de ${elemAntigo} por ${novoSimbolo} nesta posição gera uma estrutura instável.`);
          return;
        }

        const novoSmiles = molValidado.get_smiles();
        molValidado.delete();

        // Cria o derivado sintetizado in loco
        const idDerivado = 'sub_' + Date.now();
        const nomeDerivado = `${compostoSelecionado.nome} (${elemAntigo}${atomIdx + 1}➔${novoSimbolo})`;

        const novoComposto = {
          id: idDerivado,
          chaveOriginal: idDerivado,
          nome: nomeDerivado,
          formula: 'Modificação Atômica',
          molarMass: '--',
          smiles: novoSmiles,
          categoria: 'custom',
          pubchemQuery: nomeDerivado
        };

        compostosIndexados.unshift(novoComposto);
        compostosFiltrados.unshift(novoComposto);

        renderizarListaCompostos(true);
        selecionarCompostoStudio(novoComposto);

        window.fecharTabelaPeriodica();
        window.fecharInspectorAtomo();

      } catch (err) {
        alert(`Erro de Valência RDKit: ${err.message || 'Valência inconsistente para o elemento selecionado.'}`);
      }
    }
  };

  // =========================================================================
  // 8. BIOISOSTERISMO DE GRUPOS FUNCIONAIS
  // =========================================================================
  window.abrirPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    const body = document.getElementById('bioisostereModalBody');
    if (!modal || !body) return;

    if (!compostoSelecionado || !compostoSelecionado.smiles || compostoSelecionado.smiles === '--') {
      body.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Selecione uma molécula orgânica estruturada no catálogo lateral.</div>`;
      modal.style.display = 'flex';
      return;
    }

    const smiles = compostoSelecionado.smiles;
    const nome = compostoSelecionado.nome;
    const reacoesDisponiveis = REACOES_BIOISOSTERISMO.filter(rx => rx.detectar(smiles));

    let htmlGrupos = '';
    if (reacoesDisponiveis.length > 0) {
      const tagsDetectadas = new Set(reacoesDisponiveis.map(r => r.alvoSmarts));
      htmlGrupos = Array.from(tagsDetectadas).map(t => `<span class="bio-group-chip">Alvo detectado: ${t}</span>`).join('');
    } else {
      htmlGrupos = '<span style="color:#f87171; font-size:0.75rem;">Nenhum grupo farmacofórico clássico elegível para substituição direta neste composto.</span>';
    }

    let htmlCards = '';
    if (reacoesDisponiveis.length > 0) {
      htmlCards = reacoesDisponiveis.map(rx => `
        <div class="bio-transform-card">
          <div class="bio-card-top">
            <span class="bio-card-name">${rx.nome}</span>
            <span class="bio-card-scheme">${rx.esquema}</span>
            <span class="cadd-badge badge-warning" style="align-self:flex-start; margin-top:2px;">${rx.tag}</span>
            <p class="bio-card-desc">${rx.descricao}</p>
          </div>
          <button class="btn-apply-transform" onclick="window.executarTransformacaoBioisosterica('${rx.id}')">
            🧪 Sintetizar Análogo in Silico
          </button>
        </div>
      `).join('');
    }

    body.innerHTML = `
      <div class="bio-detected-groups-panel">
        <span class="bio-detected-title">Molécula em Foco: <strong style="color:var(--neon-cyan);">${nome}</strong></span>
        <div style="font-family:var(--font-mono); font-size:0.7rem; color:#cbd5e1; word-break:break-all;">SMILES: ${smiles}</div>
        <div class="bio-groups-chips" style="margin-top:6px;">${htmlGrupos}</div>
      </div>
      <div id="bioComparisonArea"></div>
      <h4 style="color:#f8fafc; font-size:0.82rem; margin-top:8px; margin-bottom:2px;">Transformações Bioisostéricas Disponíveis:</h4>
      <div class="bio-transforms-grid">${htmlCards}</div>
    `;

    modal.style.display = 'flex';
  };

  window.fecharPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    if (modal) modal.style.display = 'none';
  };

  window.executarTransformacaoBioisosterica = async function(idReacao) {
    if (!compostoSelecionado) return;
    const reacao = REACOES_BIOISOSTERISMO.find(r => r.id === idReacao);
    if (!reacao) return;

    const smilesOriginal = compostoSelecionado.smiles;
    const nomeOriginal = compostoSelecionado.nome;
    const novoSmiles = reacao.transformar(smilesOriginal);

    if (novoSmiles === smilesOriginal) {
      alert("Não foi possível derivatizar a molécula através deste padrão.");
      return;
    }

    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const molTeste = rdkit.get_mol(novoSmiles);
        if (!molTeste) {
          alert("O análogo gerado possui valência quimicamente instável.");
          return;
        }
        molTeste.delete();
      } catch (e) {
        alert("Erro na validação estereoquímica do derivado.");
        return;
      }
    }

    const propsAntes = await calcularPropriedadesMoleculares(smilesOriginal, parseFloat(compostoSelecionado.molarMass));
    const propsDepois = await calcularPropriedadesMoleculares(novoSmiles, 0);

    const compArea = document.getElementById('bioComparisonArea');
    if (compArea && propsAntes && propsDepois) {
      const deltaMW = propsDepois.mw - propsAntes.mw;
      const deltaLogP = propsDepois.logp - propsAntes.logp;
      const deltaTPSA = propsDepois.tpsa - propsAntes.tpsa;

      compArea.innerHTML = `
        <div class="bio-comparison-container">
          <div class="bio-comparison-header">
            <span class="bio-comparison-title">✨ Análogo: ${reacao.nome}</span>
            <button class="studio-btn btn-action-transfer" onclick="window.adicionarDerivadoAoCatalogo('${reacao.nome}', '${novoSmiles}', ${propsDepois.mw.toFixed(2)})">
              📥 Injetar no Catálogo & Visualizar 3D
            </button>
          </div>
          <table class="delta-table">
            <thead>
              <tr>
                <th>Propriedade</th>
                <th>Original</th>
                <th>Derivado</th>
                <th>Variação (Δ)</th>
                <th>Impacto Biofarmacêutico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Massa Molar</strong></td>
                <td>${propsAntes.mw.toFixed(1)} Da</td>
                <td>${propsDepois.mw.toFixed(1)} Da</td>
                <td>${deltaMW >= 0 ? '+' : ''}${deltaMW.toFixed(1)} Da</td>
                <td>${propsDepois.mw <= 500 ? '✅ Dentro da Ro5' : '⚠️ Violação Lipinski (>500)'}</td>
              </tr>
              <tr>
                <td><strong>LogP Crippen</strong></td>
                <td>${propsAntes.logp.toFixed(2)}</td>
                <td>${propsDepois.logp.toFixed(2)}</td>
                <td class="${deltaLogP > 0 ? 'delta-pos' : 'delta-neg'}">${deltaLogP >= 0 ? '+' : ''}${deltaLogP.toFixed(2)}</td>
                <td>${deltaLogP > 0 ? 'Maior permeabilidade' : 'Maior hidrossolubilidade'}</td>
              </tr>
              <tr>
                <td><strong>Área Polar (TPSA)</strong></td>
                <td>${propsAntes.tpsa.toFixed(1)} Å²</td>
                <td>${propsDepois.tpsa.toFixed(1)} Å²</td>
                <td class="${deltaTPSA < 0 ? 'delta-good' : 'delta-neg'}">${deltaTPSA >= 0 ? '+' : ''}${deltaTPSA.toFixed(1)} Å²</td>
                <td>${propsDepois.tpsa <= 140 ? '✅ Adequada p/ via oral' : '⚠️ Baixa permeabilidade (>140)'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  };

  window.adicionarDerivadoAoCatalogo = function(nomeTransformacao, novoSmiles, novoMW) {
    const idUnico = 'deriv_' + Date.now();
    const nomeDerivado = `${compostoSelecionado.nome} [${nomeTransformacao}]`;

    const novoComposto = {
      id: idUnico,
      chaveOriginal: idUnico,
      nome: nomeDerivado,
      formula: 'Análogo CADD',
      molarMass: novoMW,
      smiles: novoSmiles,
      categoria: 'custom',
      pubchemQuery: nomeDerivado
    };

    compostosIndexados.unshift(novoComposto);
    compostosFiltrados.unshift(novoComposto);

    renderizarListaCompostos(true);
    selecionarCompostoStudio(novoComposto);
    window.fecharPainelBioisosterismo();
  };

  // =========================================================================
  // 9. MODAL CADD
  // =========================================================================
  window.abrirModalCADD = function() {
    const modal = document.getElementById('caddModal');
    const body = document.getElementById('caddModalBody');
    const title = document.getElementById('caddModalTitle');
    const sub = document.getElementById('caddModalSubtitle');

    if (!modal || !body) return;
    if (!ultimoDossieCADD) {
      body.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 30px;">Selecione um composto orgânico para avaliar drogabilidade in silico.</div>`;
      modal.style.display = 'flex';
      return;
    }

    const d = ultimoDossieCADD;
    if (title) title.textContent = `📊 Dossiê CADD: ${d.nome}`;
    if (sub) sub.textContent = `SMILES: ${d.smiles}`;

    body.innerHTML = `
      <div class="cadd-cards-grid">
        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">💊 Regra de Lipinski (Ro5 - 1997)</span>
            <span class="cadd-badge ${d.falhasLipinski.length === 0 ? 'badge-approved' : d.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected'}">
              ${d.falhasLipinski.length === 0 ? 'Conforme (0 viol.)' : d.falhasLipinski.length + ' Violação(ões)'}
            </span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.mw > 500 ? 'violated' : ''}"><span>Massa Molar (≤ 500 Da):</span><strong>${d.mw.toFixed(2)} Da</strong></div>
            <div class="cadd-param-item ${d.logp > 5.0 ? 'violated' : ''}"><span>LogP Crippen (≤ 5.0):</span><strong>${d.logp.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.hbd > 5 ? 'violated' : ''}"><span>Doadores de H - HBD (≤ 5):</span><strong>${d.hbd}</strong></div>
            <div class="cadd-param-item ${d.hba > 10 ? 'violated' : ''}"><span>Aceptores de H - HBA (≤ 10):</span><strong>${d.hba}</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">🔬 Regra de Veber (2002)</span>
            <span class="cadd-badge ${d.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected'}">
              ${d.falhasVeber.length === 0 ? 'Alta Biodisponibilidade' : 'Baixa Biodisponibilidade'}
            </span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.rotb > 10 ? 'violated' : ''}"><span>Ligações Rotacionáveis (≤ 10):</span><strong>${d.rotb}</strong></div>
            <div class="cadd-param-item ${d.tpsa > 140 ? 'violated' : ''}"><span>Área Polar TPSA (≤ 140 Å²):</span><strong>${d.tpsa.toFixed(1)} Å²</strong></div>
            <div class="cadd-param-item"><span>Fração Carbonos sp³ (Fsp³):</span><strong>${d.csp3.toFixed(2)}</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">📐 Filtro de Ghose (1999)</span>
            <span class="cadd-badge ${d.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected'}">
              ${d.falhasGhose.length === 0 ? 'Aprovado' : d.falhasGhose.length + ' Violação(ões)'}
            </span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.mw < 160 || d.mw > 480 ? 'violated' : ''}"><span>Massa Molar (160 - 480 Da):</span><strong>${d.mw.toFixed(2)} Da</strong></div>
            <div class="cadd-param-item ${d.logp < -0.4 || d.logp > 5.6 ? 'violated' : ''}"><span>LogP (-0.4 a 5.6):</span><strong>${d.logp.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.mr < 40 || d.mr > 130 ? 'violated' : ''}"><span>Refração Molar - MR (40 - 130):</span><strong>${d.mr.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.totalAtoms < 20 || d.totalAtoms > 70 ? 'violated' : ''}"><span>Total de Átomos (20 - 70):</span><strong>${d.totalAtoms} átomos</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">⚠️ Filtro PAINS (Baell et al.)</span>
            <span class="cadd-badge ${d.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected'}">
              ${d.alertasPAINS.length === 0 ? 'Isento de Interferência' : d.alertasPAINS.length + ' Alerta(s)'}
            </span>
          </div>
          ${d.alertasPAINS.length === 0 ? `
            <div class="pains-clean-box">
              ✅ <strong>Nenhum grupo promíscuo detectado:</strong> A estrutura está livre de subestruturas clássicas de interferência em ensaios biológicos.
            </div>
          ` : `
            <div class="pains-alert-box">
              <strong>Subestruturas Reativas Identificadas:</strong><br>
              ${d.alertasPAINS.map(a => `• <strong>${a.nome}</strong>: ${a.risco}`).join('<br>')}
            </div>
          `}
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  };

  window.fecharModalCADD = function() {
    const modal = document.getElementById('caddModal');
    if (modal) modal.style.display = 'none';
  };

  // =========================================================================
  // 10. RESOLUÇÃO DE COORDENADAS 3D
  // =========================================================================
  function validarConteudoSDF(sdfText) {
    if (!sdfText || typeof sdfText !== 'string') return false;
    if (sdfText.includes('<!DOCTYPE') || sdfText.includes('<html')) return false;
    return sdfText.includes('$$$$') || sdfText.includes('M  END');
  }

  function gerarSDFMonoatomico(simbolo) {
    const s = simbolo.replace(/\[|\]|\+|\-/g, '').trim();
    return `
  LAIFT-ENGINE-3D

  1  0  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 ${s.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0
M  END
$$$$
`;
  }

  async function resolverCoordenadas3D(smiles, termoBusca) {
    if (!smiles && !termoBusca) return null;

    if (smiles && smiles.startsWith('[') && smiles.endsWith(']') && smiles.length <= 5) {
      return gerarSDFMonoatomico(smiles);
    }

    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
      if (cache && validarConteudoSDF(cache.sdf)) return cache.sdf;
    }

    // 1. RDKit WASM ETKDG (Conformação local - essencial para análogos gerados in silico)
    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, "Calculando geometria 3D (ETKDG)...");
          const mol = rdkit.get_mol(smiles);
          if (mol) {
            mol.add_hs();
            if (mol.embed_mol() >= 0) {
              const sdfGerado = mol.to_sdf();
              mol.delete();
              exibirStatusRDKit(false);
              if (validarConteudoSDF(sdfGerado)) {
                salvarEmCache(smiles, termoBusca, sdfGerado);
                return sdfGerado;
              }
            } else {
              mol.delete();
            }
          }
        } catch (e) {}
      }
    }

    // 2. PubChem 3D por SMILES
    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      try {
        exibirStatusRDKit(true, "Consultando PubChem 3D...");
        const urlSmiles = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;
        const res = await fetch(urlSmiles);
        if (res.ok) {
          const sdfText = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdfText)) {
            salvarEmCache(smiles, termoBusca, sdfText);
            return sdfText;
          }
        }
      } catch (e) {}
    }

    // 3. CACTUS NIH
    if (smiles && smiles !== '--') {
      try {
        exibirStatusRDKit(true, "Gerando coordenadas (CACTUS NIH)...");
        const resC = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/file?format=sdf`);
        if (resC.ok) {
          const txtC = await resC.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(txtC)) {
            salvarEmCache(smiles, termoBusca, txtC);
            return txtC;
          }
        }
      } catch (e) {}
    }

    exibirStatusRDKit(false);
    return null;
  }

  function salvarEmCache(smiles, nome, sdf) {
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarCompostoLocal === 'function') {
      LabStorageEngine.salvarCompostoLocal(smiles || nome, { sdf: sdf, nome: nome });
    }
  }

  // =========================================================================
  // 11. VIEWPORT 3D & ATOM PICKING
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;

    window.fecharInspectorAtomo();

    const watermark = document.getElementById('studioWatermark');
    if (watermark) watermark.style.display = 'none';

    const elNome = document.getElementById('studioMolNome');
    const elFormula = document.getElementById('studioMolFormula');
    const elMassa = document.getElementById('studioMolMassa');
    const btnBench = document.getElementById('btnCarregarNaBancada');

    if (elNome) elNome.textContent = comp.nome;
    if (elFormula) elFormula.textContent = comp.formula;
    if (elMassa) elMassa.textContent = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(2)} g/mol` : '-- g/mol';
    if (btnBench) btnBench.style.display = 'inline-flex';

    desenharEstrutura2DStudio(comp.smiles, comp.nome);
    avaliarQuimiometriaCompleta(comp.smiles, parseFloat(comp.molarMass), comp.nome);

    const sdf = await resolverCoordenadas3D(comp.smiles, comp.pubchemQuery || comp.nome);
    sdfCacheLocal = sdf;

    if (sdf && validarConteudoSDF(sdf)) {
      construirCena3D(sdf);
    } else {
      modeloCarregadoAtivo = false;
      const container3D = document.getElementById('studioViewer3D');
      if (container3D) {
        container3D.innerHTML = `
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center; max-width: 80%;">
            ⚠️ Coordenadas 3D não disponíveis para esta espécie.<br>
            A projeção 2D vetorial continua disponível no botão "2D Vetorial".
          </div>
        `;
      }
    }
  }

  function construirCena3D(sdfText) {
    const container = document.getElementById('studioViewer3D');
    if (!container || !window.$3Dmol || !validarConteudoSDF(sdfText)) return;

    try {
      if (studioViewer) {
        try { studioViewer.stopAnimate(); } catch (e) {}
      }
      container.innerHTML = '';

      studioViewer = $3Dmol.createViewer(container, { backgroundColor: '#020617' });
      const model = studioViewer.addModel(sdfText, 'sdf');

      if (!model || typeof model.selectedAtoms !== 'function' || model.selectedAtoms({}).length === 0) {
        modeloCarregadoAtivo = false;
        container.innerHTML = `
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center;">
            ⚠️ Arquivo estrutural sem átomos 3D válidos.
          </div>
        `;
        return;
      }

      modeloCarregadoAtivo = true;
      aplicarEstiloVisual(modeloAtual);

      // Ouvinte de clique atômico duplo: medição geométrica ou inspeção atômica
      studioViewer.setClickable({}, true, function(atom) {
        if (modoMedicaoAtivo) {
          processarCliqueMedicao(atom);
        } else {
          selecionarEInspecionarAtomo(atom);
        }
      });

      studioViewer.zoomTo();
      studioViewer.render();

      setTimeout(() => {
        if (studioViewer && modeloCarregadoAtivo) {
          try {
            studioViewer.resize();
            studioViewer.render();
          } catch(e) {}
        }
      }, 120);

      if (autoRotacaoAtiva) {
        studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
      }
    } catch (errCena) {
      modeloCarregadoAtivo = false;
      console.warn('[Studio 3Dmol] Erro na construção da cena:', errCena);
    }
  }

  function aplicarEstiloVisual(tipo) {
    if (!studioViewer || !modeloCarregadoAtivo) return;

    try {
      studioViewer.removeAllSurfaces();

      switch (tipo) {
        case 'ballstick':
          studioViewer.setStyle({}, {
            stick: { radius: 0.15, colorscheme: 'Jmol' },
            sphere: { scale: 0.28, colorscheme: 'Jmol' }
          });
          break;
        case 'cpk':
          studioViewer.setStyle({}, {
            sphere: { scale: 1.0, colorscheme: 'Jmol' }
          });
          break;
        case 'wireframe':
          studioViewer.setStyle({}, {
            line: { linewidth: 2.2, colorscheme: 'Jmol' }
          });
          break;
        case 'surface':
          studioViewer.setStyle({}, {
            stick: { radius: 0.12, colorscheme: 'Jmol' },
            sphere: { scale: 0.22, colorscheme: 'Jmol' }
          });
          studioViewer.addSurface($3Dmol.SurfaceType.VDW, {
            opacity: 0.65,
            color: '#38bdf8'
          });
          break;
      }
      studioViewer.render();
    } catch (errEstilo) {
      console.warn('[Studio 3Dmol] Estilo ignorado para modelo nulo.');
    }
  }

  function desenharEstrutura2DStudio(smiles, nome) {
    const canvas = document.getElementById('studioCanvas2D');
    if (!canvas) return;

    if (typeof SmilesDrawer !== 'undefined' && smiles && smiles !== '--' && !smiles.includes('.')) {
      try {
        const drawer = new SmilesDrawer.Drawer({
          width: 650,
          height: 480,
          bondThickness: 1.6,
          bondLength: 20,
          isomeric: true
        });
        SmilesDrawer.parse(smiles, function(tree) {
          drawer.draw(tree, 'studioCanvas2D', 'dark', false);
        });
      } catch (e) {
        desenharFallback2D(canvas, smiles, nome);
      }
    } else {
      desenharFallback2D(canvas, smiles, nome);
    }
  }

  function desenharFallback2D(canvas, smiles, nome) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px "Urbanist", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nome || 'Composto Químico', canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Fira Code", monospace';
    ctx.fillText(smiles || 'Estrutura Indisponível', canvas.width / 2, canvas.height / 2 + 18);
  }

  // =========================================================================
  // 12. CONTROLES E MEDIÇÃO GEOMÉTRICA (Å / °)
  // =========================================================================
  window.setModelo3D = function(modo) {
    modeloAtual = modo;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(btn => btn.classList.remove('active'));
    const botoes = { ballstick: 'btnModoBallStick', cpk: 'btnModoCPK', wireframe: 'btnModoWire', surface: 'btnModoSurface' };
    const target = document.getElementById(botoes[modo]);
    if (target) target.classList.add('active');

    if (modeloCarregadoAtivo && modoExibicaoAtual === '3D') {
      aplicarEstiloVisual(modo);
    }
  };

  window.setStudioModoVisual = function(modo) {
    modoExibicaoAtual = modo;
    const v3D = document.getElementById('studioViewer3D');
    const v2D = document.getElementById('studioViewer2D');
    const b3D = document.getElementById('btnStudioView3D');
    const b2D = document.getElementById('btnStudioView2D');
    const grp3D = document.getElementById('group3DStyles');

    if (b3D) b3D.classList.toggle('active', modo === '3D');
    if (b2D) b2D.classList.toggle('active', modo === '2D');
    if (grp3D) grp3D.style.display = modo === '3D' ? 'flex' : 'none';

    if (modo === '3D') {
      if (v2D) v2D.style.display = 'none';
      if (v3D) {
        v3D.style.display = 'block';
        if (studioViewer && modeloCarregadoAtivo) {
          studioViewer.resize();
          studioViewer.render();
        }
      }
    } else {
      if (v3D) v3D.style.display = 'none';
      if (v2D) v2D.style.display = 'flex';
    }
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

    const hudLabel = document.getElementById('studioLastMeasurement');

    if (atomosSelecionadosParaMedicao.length === 2) {
      const a1 = atomosSelecionadosParaMedicao[0];
      const a2 = atomosSelecionadosParaMedicao[1];
      const dist = Math.hypot(a2.x - a1.x, a2.y - a1.y, a2.z - a1.z);

      studioViewer.addLine({
        start: { x: a1.x, y: a1.y, z: a1.z },
        end: { x: a2.x, y: a2.y, z: a2.z },
        color: '#fb7185',
        dashed: true
      });

      studioViewer.addLabel(`${dist.toFixed(3)} Å`, {
        position: { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 },
        backgroundColor: '#020617',
        fontColor: '#38bdf8',
        fontSize: 12
      });

      if (hudLabel) hudLabel.textContent = `Distância (${a1.elem}-${a2.elem}): ${dist.toFixed(3)} Å`;
      studioViewer.render();

    } else if (atomosSelecionadosParaMedicao.length === 3) {
      const a1 = atomosSelecionadosParaMedicao[0];
      const a2 = atomosSelecionadosParaMedicao[1];
      const a3 = atomosSelecionadosParaMedicao[2];

      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };

      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const magU = Math.hypot(u.x, u.y, u.z);
      const magV = Math.hypot(v.x, v.y, v.z);
      const ang = (Math.acos(Math.max(-1, Math.min(1, dot / (magU * magV)))) * 180) / Math.PI;

      studioViewer.addLabel(`Ângulo: ${ang.toFixed(1)}°`, {
        position: { x: a2.x, y: a2.y + 0.35, z: a2.z },
        backgroundColor: '#020617',
        fontColor: '#facc15',
        fontSize: 12
      });

      if (hudLabel) hudLabel.textContent = `Ângulo (${a1.elem}-${a2.elem}-${a3.elem}): ${ang.toFixed(1)}°`;
      studioViewer.render();
      atomosSelecionadosParaMedicao = [];
    }
  }

  window.limparMedicoes3D = function() {
    atomosSelecionadosParaMedicao = [];
    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) hudLabel.textContent = 'Medições redefinidas.';
    if (sdfCacheLocal && studioViewer && modeloCarregadoAtivo) {
      construirCena3D(sdfCacheLocal);
    }
  };

  window.toggleAutoRotacao3D = function() {
    autoRotacaoAtiva = !autoRotacaoAtiva;
    const btn = document.getElementById('btnAutoRotate');
    if (btn) btn.classList.toggle('active', autoRotacaoAtiva);
    if (studioViewer && modeloCarregadoAtivo) {
      try {
        if (autoRotacaoAtiva) studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
        else studioViewer.stopAnimate();
      } catch(e) {}
    }
  };

  window.resetarCamera3D = function() {
    if (studioViewer && modeloCarregadoAtivo) {
      studioViewer.zoomTo();
      studioViewer.render();
      studioViewer.resize();
    }
  };

  window.exportarImagemPNG = function() {
    const nomeBase = (compostoSelecionado?.nome || 'molecula').replace(/\s+/g, '_');
    if (modoExibicaoAtual === '3D' && studioViewer && modeloCarregadoAtivo) {
      const link = document.createElement('a');
      link.download = `${nomeBase}_3D_LAIFT.png`;
      link.href = studioViewer.pngURI();
      link.click();
    } else {
      const canvas = document.getElementById('studioCanvas2D');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `${nomeBase}_2D_LAIFT.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  window.exportarArquivoSDF = function() {
    if (!sdfCacheLocal) {
      alert("Aguarde a conformação 3D ser calculada antes de exportar o arquivo SDF.");
      return;
    }
    const nomeBase = (compostoSelecionado?.nome || 'composto').replace(/\s+/g, '_');
    const blob = new Blob([sdfCacheLocal], { type: 'chemical/x-mdl-sdfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeBase}_3D.sdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  window.selecionarCompostoStudio = function(comp, el) {
    compostoSelecionado = comp;
    document.querySelectorAll('.compound-item').forEach(i => i.classList.remove('selected'));
    if (el) el.classList.add('selected');
    carregarEstruturaNoStudio(comp);
  };

  window.carregarCompostoDoStudioNaBancada = function() {
    if (!compostoSelecionado) return;

    const payload = {
      chave: compostoSelecionado.chaveOriginal,
      nome: compostoSelecionado.nome,
      smiles: compostoSelecionado.smiles,
      formula: compostoSelecionado.formula,
      molarMass: compostoSelecionado.molarMass,
      timestamp: Date.now()
    };

    if (labBroadcast) {
      labBroadcast.postMessage({
        tipo: 'CARREGAR_COMPOSTO_BANCADA',
        composto: payload
      });
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        acao: 'carregarCompostoNaBancada',
        composto: payload
      }, '*');
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

  // =========================================================================
  // 13. INICIALIZAÇÃO ASSÍNCRONA
  // =========================================================================
  async function inicializarStudioComPolling() {
    let tentativas = 0;
    while (tentativas < 10) {
      const { labDb, synthDb } = obterFontesDeDados();
      if (labDb || synthDb) break;
      await new Promise(r => setTimeout(r, 100));
      tentativas++;
    }

    indexarAcervoCompleto();
    renderizarListaCompostos(true);

    if (compostosIndexados.length > 0) {
      const primeiro = document.querySelector('.compound-item');
      selecionarCompostoStudio(compostosIndexados[0], primeiro);
    }
  }

  window.addEventListener('resize', () => {
    if (studioViewer && modeloCarregadoAtivo) {
      studioViewer.resize();
      studioViewer.render();
    }
  });

  window.addEventListener('message', (e) => {
    if (e.data && e.data.acao === 'studioAberto') {
      setTimeout(() => {
        if (studioViewer && modeloCarregadoAtivo) {
          studioViewer.resize();
          studioViewer.render();
        }
      }, 120);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarStudioComPolling);
  } else {
    inicializarStudioComPolling();
  }

})();

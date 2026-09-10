/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js — v2.0 (Fases A + B + C implementadas)
 * 
 * FASE A: Correções (PAINS, toasts)
 * FASE B: UX (undo/redo, histórico, favoritos, modo apresentação, preferências, worker)
 * FASE C: Análise (Tanimoto, scaffold Murcko, comparação, CSV, notas, ChEMBL)
 */

(function() {
  'use strict';

  // =========================================================================
  // 0. BARRAMENTO DE COMUNICAÇÃO E ESTADO GLOBAL
  // =========================================================================
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

  // Inspeção e substituição atômica
  let atomoAtivoInspecionado = null;
  let elementoPTableSelecionado = null;
  let atomHighlightShape = null;

  // FASE B — Histórico de navegação
  const historicoNavegacao = { itens: [], indice: -1, max: 30 };

  // FASE B — Undo/Redo de edições
  const edicaoHistory = { undo: [], redo: [], max: 30 };

  // FASE B — Favoritos
  let favoritos = new Set();

  // FASE C — Comparação
  let cmpViewerA = null, cmpViewerB = null;

  // Web Worker de indexação
  let indexerWorker = null;

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;
  let resizeTimer = null;

  const STORAGE_KEYS = {
    prefs: 'laift_studio_prefs_v2',
    favoritos: 'laift_studio_favoritos_v2',
    notas: 'laift_studio_notas_v2'
  };

  // =========================================================================
  // 1. TABELA PERIÓDICA INTERATIVA (IUPAC)
  // =========================================================================
  const TABELA_PERIODICA = [
    { z: 1, sym: 'H', nome: 'Hidrogênio', massa: 1.008, eletron: 2.20, raio: 37, valPadrao: 1, valencias: [1], cat: 'nao-metal', grupo: 1, periodo: 1, pharma: 'Essencial em pontes de hidrogênio; passível de bioisosterismo com Flúor (-H ➔ -F) para bloquear metabolismo oxidativo de CYP450.' },
    { z: 2, sym: 'He', nome: 'Hélio', massa: 4.003, eletron: null, raio: 32, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 1, pharma: 'Gás nobre inerte quimicamente sob condições biológicas normais.' },
    { z: 3, sym: 'Li', nome: 'Lítio', massa: 6.94, eletron: 0.98, raio: 152, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 2, pharma: 'Íon terapêutico monofásico no transtorno bipolar; inibe fosfatases de inositol.' },
    { z: 4, sym: 'Be', nome: 'Berílio', massa: 9.012, eletron: 1.57, raio: 112, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 2, pharma: 'Altamente tóxico; mimetiza magnésio causando inibição enzimática irreversível.' },
    { z: 5, sym: 'B', nome: 'Boro', massa: 10.81, eletron: 2.04, raio: 85, valPadrao: 3, valencias: [3, 4], cat: 'metaloide', grupo: 13, periodo: 2, pharma: 'Ácido borônico (-B(OH)₂) atua como inibidor reversível de proteassoma (ex: Bortezomibe).' },
    { z: 6, sym: 'C', nome: 'Carbono', massa: 12.011, eletron: 2.55, raio: 77, valPadrao: 4, valencias: [4], cat: 'nao-metal', grupo: 14, periodo: 2, pharma: 'Espinha dorsal da química farmacêutica; permite hibridizações sp³, sp² e sp com quiralidade tetraédrica.' },
    { z: 7, sym: 'N', nome: 'Nitrogênio', massa: 14.007, eletron: 3.04, raio: 75, valPadrao: 3, valencias: [3, 4], cat: 'nao-metal', grupo: 15, periodo: 2, pharma: 'Componente crucial de centros básicos protonáveis (aminas) e anéis heterocíclicos (piridinas, piperazinas).' },
    { z: 8, sym: 'O', nome: 'Oxigênio', massa: 15.999, eletron: 3.44, raio: 73, valPadrao: 2, valencias: [2], cat: 'nao-metal', grupo: 16, periodo: 2, pharma: 'Aceptor forte de ligações de hidrogênio (carbonilas, éteres) e doador em hidroxilas.' },
    { z: 9, sym: 'F', nome: 'Flúor', massa: 18.998, eletron: 3.98, raio: 71, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 2, pharma: 'Bioisóstero clássico de hidrogênio; aumenta lipofilicidade e bloqueia CYP450.' },
    { z: 10, sym: 'Ne', nome: 'Neônio', massa: 20.18, eletron: null, raio: 69, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 2, pharma: 'Gás nobre quimicamente inerte.' },
    { z: 11, sym: 'Na', nome: 'Sódio', massa: 22.99, eletron: 0.93, raio: 186, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 3, pharma: 'Contraíon primordial para sais hidrossolúveis (ex: Dipirona Sódica, Diclofenaco Sódico).' },
    { z: 12, sym: 'Mg', nome: 'Magnésio', massa: 24.305, eletron: 1.31, raio: 160, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 3, pharma: 'Cofator de quinases e estabilizador de ATP e DNA polimerases.' },
    { z: 13, sym: 'Al', nome: 'Alumínio', massa: 26.982, eletron: 1.61, raio: 143, valPadrao: 3, valencias: [3], cat: 'metal-pos-transicao', grupo: 13, periodo: 3, pharma: 'Antiácido gástrico e adjuvante imunológico em vacinas.' },
    { z: 14, sym: 'Si', nome: 'Silício', massa: 28.085, eletron: 1.90, raio: 111, valPadrao: 4, valencias: [4], cat: 'metaloide', grupo: 14, periodo: 3, pharma: 'Bioisóstero tetravalente de Carbono (sila-substituição C ➔ Si).' },
    { z: 15, sym: 'P', nome: 'Fósforo', massa: 30.974, eletron: 2.19, raio: 106, valPadrao: 3, valencias: [3, 5], cat: 'nao-metal', grupo: 15, periodo: 3, pharma: 'Presente em profármacos fosfatados polares e antivirais nucleotídeos (ex: Sofosbuvir).' },
    { z: 16, sym: 'S', nome: 'Enxofre', massa: 32.06, eletron: 2.58, raio: 102, valPadrao: 2, valencias: [2, 4, 6], cat: 'nao-metal', grupo: 16, periodo: 3, pharma: 'Bioisóstero divalente de oxigênio em tioéteres; sulfonamidas antibacterianas.' },
    { z: 17, sym: 'Cl', nome: 'Cloro', massa: 35.45, eletron: 3.16, raio: 99, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 3, pharma: 'Preenche bolsões hidrofóbicos estreitos; formador de cloridratos solúveis.' },
    { z: 18, sym: 'Ar', nome: 'Argônio', massa: 39.948, eletron: null, raio: 97, valPadrao: 0, valencias: [0], cat: 'gas-nobre', grupo: 18, periodo: 3, pharma: 'Gás nobre inerte; protetor de reações sensíveis.' },
    { z: 19, sym: 'K', nome: 'Potássio', massa: 39.098, eletron: 0.82, raio: 227, valPadrao: 1, valencias: [1], cat: 'alcalino', grupo: 1, periodo: 4, pharma: 'Principal cátion intracelular; sais de rápida dissolução oral.' },
    { z: 20, sym: 'Ca', nome: 'Cálcio', massa: 40.078, eletron: 1.00, raio: 197, valPadrao: 2, valencias: [2], cat: 'alcalino-terroso', grupo: 2, periodo: 4, pharma: 'Segundo mensageiro celular; alvo de bloqueadores de canais di-hidropiridínicos (ex: Amlodipino).' },
    { z: 26, sym: 'Fe', nome: 'Ferro', massa: 55.845, eletron: 1.83, raio: 126, valPadrao: 2, valencias: [2, 3], cat: 'metal-transicao', grupo: 8, periodo: 4, pharma: 'Centro redox da hemoglobina e de CYP450 hepáticas.' },
    { z: 29, sym: 'Cu', nome: 'Cobre', massa: 63.546, eletron: 1.90, raio: 128, valPadrao: 2, valencias: [1, 2], cat: 'metal-transicao', grupo: 11, periodo: 4, pharma: 'Cofator da citocromo c oxidase e superóxido dismutase.' },
    { z: 30, sym: 'Zn', nome: 'Zinco', massa: 65.38, eletron: 1.65, raio: 134, valPadrao: 2, valencias: [2], cat: 'metal-transicao', grupo: 12, periodo: 4, pharma: 'Cátion catalítico da Anidrase Carbônica; quelado por inibidores sulfonamídicos.' },
    { z: 33, sym: 'As', nome: 'Arsênio', massa: 74.922, eletron: 2.18, raio: 119, valPadrao: 3, valencias: [3, 5], cat: 'metaloide', grupo: 15, periodo: 4, pharma: 'Compostos organoarsenicais históricos (Salvarsan); antileucêmico (Trisulfeto de Arsênio).' },
    { z: 34, sym: 'Se', nome: 'Selênio', massa: 78.96, eletron: 2.55, raio: 116, valPadrao: 2, valencias: [2, 4], cat: 'nao-metal', grupo: 16, periodo: 4, pharma: 'Bioisóstero de enxofre em selenoaminoácidos; elevado poder antioxidante.' },
    { z: 35, sym: 'Br', nome: 'Bromo', massa: 79.904, eletron: 2.96, raio: 114, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 4, pharma: 'Halogênio volumoso e polarizável; ligações de halogênio direcionadas.' },
    { z: 53, sym: 'I', nome: 'Iodo', massa: 126.9, eletron: 2.66, raio: 133, valPadrao: 1, valencias: [1], cat: 'halogenio', grupo: 17, periodo: 5, pharma: 'Constituinte dos hormônios tireoidianos (T3/T4); contrastes radiológicos iodados.' },
    { z: 78, sym: 'Pt', nome: 'Platina', massa: 195.08, eletron: 2.28, raio: 139, valPadrao: 2, valencias: [2, 4], cat: 'metal-transicao', grupo: 10, periodo: 6, pharma: 'Complexos antitumorais que realizam cross-linking covalente no DNA (Cisplatina).' }
  ];

  const POSICOES_PTABLE = {
    'H': { r: 1, c: 1 }, 'He': { r: 1, c: 18 },
    'Li': { r: 2, c: 1 }, 'Be': { r: 2, c: 2 }, 'B': { r: 2, c: 13 }, 'C': { r: 2, c: 14 }, 'N': { r: 2, c: 15 }, 'O': { r: 2, c: 16 }, 'F': { r: 2, c: 17 }, 'Ne': { r: 2, c: 18 },
    'Na': { r: 3, c: 1 }, 'Mg': { r: 3, c: 2 }, 'Al': { r: 3, c: 13 }, 'Si': { r: 3, c: 14 }, 'P': { r: 3, c: 15 }, 'S': { r: 3, c: 16 }, 'Cl': { r: 3, c: 17 }, 'Ar': { r: 3, c: 18 },
    'K': { r: 4, c: 1 }, 'Ca': { r: 4, c: 2 }, 'Fe': { r: 4, c: 8 }, 'Cu': { r: 4, c: 11 }, 'Zn': { r: 4, c: 12 }, 'As': { r: 4, c: 15 }, 'Se': { r: 4, c: 16 }, 'Br': { r: 4, c: 17 },
    'I': { r: 5, c: 17 }, 'Pt': { r: 6, c: 10 }
  };

  // =========================================================================
  // 2. BIOISOSTERISMO (7 reações clássicas)
  // =========================================================================
  const REACOES_BIOISOSTERISMO = [
    { id: 'carboxila_tetrazol', nome: 'Bioisóstero de Tetrazol', tag: 'Não-Clássico', esquema: 'R-COOH ➔ R-(1H-Tetrazol-5-il)', descricao: 'Mantém carga negativa deslocalizada; 10× mais lipofílico, amplia permeabilidade.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'c1nnn[nH]1') },
    { id: 'esterificacao_metilica', nome: 'Éster Metílico (Pró-fármaco)', tag: 'Pró-fármaco', esquema: 'R-COOH ➔ R-COOCH₃', descricao: 'Mascara carga aniônica; regenerado no plasma por esterases.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)OC') },
    { id: 'amidacao_primaria', nome: 'Amidação de Carboxila', tag: 'Clássico', esquema: 'R-COOH ➔ R-CONH₂', descricao: 'Neutraliza acidez e estabiliza interações por pontes de H.', alvoSmarts: 'C(=O)[OH]', detectar: (s) => /C\(=O\)O/i.test(s) || /C\(=O\)\[OH\]/i.test(s), transformar: (s) => s.replace(/C\(=O\)\[?OH?\]?/i, 'C(=O)N') },
    { id: 'o_metilacao', nome: 'O-Metilação (Éter Metílico)', tag: 'Bloqueio Fase II', esquema: 'Ar-OH ➔ Ar-OCH₃', descricao: 'Protege fenóis contra glicuronidação; reduz HBD.', alvoSmarts: '[OH]', detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s) || /O[H]/i.test(s), transformar: (s) => s.replace(/c\(O\)/i, 'c(OC)').replace(/\[OH\]/i, 'OC').replace(/O[H]/i, 'OC') },
    { id: 'o_acetilacao', nome: 'O-Acetilação (Esterificação)', tag: 'Atenuação de Toxicidade', esquema: 'Ar-OH ➔ Ar-OCOCH₃', descricao: 'Conversão Salicílico ➔ Aspirina; protege mucosa gástrica.', alvoSmarts: 'c[OH]', detectar: (s) => /c\(?O\)?/i.test(s) || /\[OH\]/i.test(s), transformar: (s) => s.replace(/c\(O\)/i, 'c(OC(=O)C)').replace(/\[OH\]/i, 'OC(=O)C') },
    { id: 'n_acetilacao', nome: 'N-Acetilação de Amina', tag: 'Otimização Analgésica', esquema: 'Ar-NH₂ ➔ Ar-NHCOCH₃', descricao: 'p-Aminofenol ➔ Paracetamol; atenua toxicidade de aminas livres.', alvoSmarts: '[NH2]', detectar: (s) => /N/i.test(s) && !/N\(=O\)/i.test(s), transformar: (s) => s.replace(/NC/i, 'N(C(=O)C)C').replace(/\[NH2\]/i, 'NC(=O)C') },
    { id: 'fluorizacao_aromatica', nome: 'Fluorização Aromática (Bloqueio CYP)', tag: 'H ➔ F', esquema: 'Ar-H ➔ Ar-F', descricao: 'Flúor mimetiza H espacialmente; efeito indutivo bloqueia oxidação por CYP450.', alvoSmarts: 'c1ccccc1', detectar: (s) => /c1ccccc1/i.test(s) || /c[0-9]ccc/i.test(s), transformar: (s) => s.replace(/c1ccccc1/i, 'c1ccc(F)cc1').replace(/c1/i, 'c1(F)') }
  ];

  // =========================================================================
  // 3. SUBESTRUTURAS PAINS (Baell & Holloway, 2010)
  // Correção FASE A: anteriormente PAINS_SUBSTRUCTURES não estava definido.
  // =========================================================================
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

  // =========================================================================
  // 4. SISTEMA DE TOASTS (Notificações) — FASE A
  // =========================================================================
  function mostrarNotificacao(mensagem, tipo = 'info', duracaoMs = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, duracaoMs);
  }
  window.mostrarNotificacao = mostrarNotificacao;

  // =========================================================================
  // 5. PERSISTÊNCIA DE PREFERÊNCIAS — FASE B
  // =========================================================================
  function salvarPreferencias() {
    try {
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify({
        modoExibicaoAtual,
        modeloAtual,
        autoRotacaoAtiva,
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
      if (p.autoRotacaoAtiva) toggleAutoRotacao3D();
      if (p.categoriaAtiva && p.categoriaAtiva !== 'todas') {
        filtrarCategoriaStudio(p.categoriaAtiva);
      }
    } catch (e) {}
  }

  // =========================================================================
  // 6. FAVORITOS — FASE B
  // =========================================================================
  function carregarFavoritos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.favoritos);
      if (raw) favoritos = new Set(JSON.parse(raw));
    } catch (e) { favoritos = new Set(); }
  }

  function salvarFavoritos() {
    try {
      localStorage.setItem(STORAGE_KEYS.favoritos, JSON.stringify(Array.from(favoritos)));
    } catch (e) {}
  }

  function atualizarBotaoFavorito() {
    const btn = document.getElementById('btnFavoriteCurrent');
    if (!btn || !compostoSelecionado) return;
    btn.style.display = 'inline-flex';
    const isFav = favoritos.has(compostoSelecionado.id);
    btn.classList.toggle('is-active', isFav);
    btn.innerHTML = isFav ? '★ Favoritado' : '☆ Favoritar';
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
  // 7. UNDO / REDO — FASE B
  // =========================================================================
  function atualizarBotoesUndoRedo() {
    const bU = document.getElementById('btnUndo');
    const bR = document.getElementById('btnRedo');
    if (bU) bU.disabled = edicaoHistory.undo.length === 0;
    if (bR) bR.disabled = edicaoHistory.redo.length === 0;
  }

  function pushEdicaoSnapshot(composto, sdf, motivo) {
    edicaoHistory.undo.push({
      composto: JSON.parse(JSON.stringify(composto)),
      sdf: sdf,
      motivo: motivo,
      timestamp: Date.now()
    });
    if (edicaoHistory.undo.length > edicaoHistory.max) edicaoHistory.undo.shift();
    edicaoHistory.redo = [];
    atualizarBotoesUndoRedo();
  }

  window.desfazerEdicao = function() {
    if (edicaoHistory.undo.length < 2) {
      mostrarNotificacao('Nada para desfazer.', 'info');
      return;
    }
    const atual = edicaoHistory.undo.pop();
    edicaoHistory.redo.push(atual);
    const anterior = edicaoHistory.undo[edicaoHistory.undo.length - 1];
    compostoSelecionado = anterior.composto;
    sdfCacheLocal = anterior.sdf;
    if (sdfCacheLocal) construirCena3D(sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação desfeita: ' + (atual.motivo || ''), 'info');
  };

  window.refazerEdicao = function() {
    if (edicaoHistory.redo.length === 0) {
      mostrarNotificacao('Nada para refazer.', 'info');
      return;
    }
    const proximo = edicaoHistory.redo.pop();
    edicaoHistory.undo.push(proximo);
    compostoSelecionado = proximo.composto;
    sdfCacheLocal = proximo.sdf;
    if (sdfCacheLocal) construirCena3D(sdfCacheLocal);
    atualizarBotoesUndoRedo();
    mostrarNotificacao('Ação refeita: ' + (proximo.motivo || ''), 'info');
  };

  // =========================================================================
  // 8. HISTÓRICO DE NAVEGAÇÃO — FASE B
  // =========================================================================
  function pushNavegacao(composto) {
    if (!composto) return;
    const ultimo = historicoNavegacao.itens[historicoNavegacao.itens.length - 1];
    if (ultimo && ultimo.id === composto.id) return;
    historicoNavegacao.itens.push({ id: composto.id, nome: composto.nome, ref: composto });
    if (historicoNavegacao.itens.length > historicoNavegacao.max) historicoNavegacao.itens.shift();
    historicoNavegacao.indice = historicoNavegacao.itens.length - 1;
  }

  window.irParaAnterior = function() {
    if (historicoNavegacao.indice <= 0) {
      mostrarNotificacao('Início do histórico.', 'info');
      return;
    }
    historicoNavegacao.indice--;
    const alvo = historicoNavegacao.itens[historicoNavegacao.indice].ref;
    selecionarCompostoStudio(alvo, null, false);
  };

  window.irParaProximo = function() {
    if (historicoNavegacao.indice >= historicoNavegacao.itens.length - 1) {
      mostrarNotificacao('Fim do histórico.', 'info');
      return;
    }
    historicoNavegacao.indice++;
    const alvo = historicoNavegacao.itens[historicoNavegacao.indice].ref;
    selecionarCompostoStudio(alvo, null, false);
  };

  // =========================================================================
  // 9. MODO APRESENTAÇÃO — FASE B
  // =========================================================================
  window.alternarModoApresentacao = function() {
    const ativo = document.body.classList.toggle('presentation-mode');
    const hint = document.getElementById('presentationExitHint');
    if (hint) hint.style.display = ativo ? 'block' : 'none';
    if (studioViewer && modeloCarregadoAtivo) {
      setTimeout(() => { studioViewer.resize(); studioViewer.render(); }, 250);
    }
    if (document.documentElement.requestFullscreen && ativo) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen && !ativo && document.fullscreenElement) {
      document.exitFullscreen();
    }
    mostrarNotificacao(ativo ? '🎬 Modo Apresentação ativado' : 'Modo Apresentação desativado', 'info');
  };

  // =========================================================================
  // 10. NOTAS POR COMPOSTO — FASE C
  // =========================================================================
  function carregarNotas() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.notas) || '{}'); }
    catch (e) { return {}; }
  }
  function salvarNota(compostoId, texto) {
    const n = carregarNotas();
    n[compostoId] = texto;
    try { localStorage.setItem(STORAGE_KEYS.notas, JSON.stringify(n)); } catch (e) {}
  }

  // =========================================================================
  // 11. WEB WORKER DE INDEXAÇÃO
  // =========================================================================
  function inicializarWorker() {
    if (indexerWorker) return indexerWorker;
    try {
      indexerWorker = new Worker('workers/indexer.worker.js');
      indexerWorker.onmessage = (e) => {
        const { tipo } = e.data;
        if (tipo === 'PROGRESSO') {
          exibirStatusRDKit(true, e.data.etapa + ' ' + (e.data.percentual || 0) + '%');
        } else if (tipo === 'INDEXADO') {
          exibirStatusRDKit(false);
          compostosIndexados = e.data.compostos;
          compostosFiltrados = [...compostosIndexados];
          const totalBadge = document.getElementById('studioTotalBadge');
          if (totalBadge) totalBadge.textContent = `${compostosIndexados.length} Espécies Prontas`;
          renderizarListaCompostos(true);
          atualizarContadorFiltrados();
          carregarPreferencias();
          if (compostosIndexados.length > 0) {
            const primeiro = document.querySelector('.compound-item');
            selecionarCompostoStudio(compostosIndexados[0], primeiro);
          }
        } else if (tipo === 'ERRO') {
          exibirStatusRDKit(false);
          console.warn('[Worker] ' + e.data.mensagem);
          indexarAcervoCompletoFallback();
        }
      };
      indexerWorker.onerror = (err) => {
        console.warn('[Worker] Falha, usando fallback síncrono.');
        indexarAcervoCompletoFallback();
      };
      return indexerWorker;
    } catch (e) {
      return null;
    }
  }

  // =========================================================================
  // 12. INGESTÃO FALLBACK (síncrona, sem worker)
  // =========================================================================
  function obterFontesDeDados() {
    const labDb = window.LAB_DATABASE || (window.parent && window.parent.LAB_DATABASE) || (window.opener && window.opener.LAB_DATABASE) || null;
    const synthDb = window.BANCO_SINTESES_LAIFT || (window.parent && window.parent.BANCO_SINTESES_LAIFT) || (window.opener && window.opener.BANCO_SINTESES_LAIFT) || null;
    const expandidoDb = window.BANCO_COMPOSTOS_EXPANDIDO || (window.parent && window.parent.BANCO_COMPOSTOS_EXPANDIDO) || (window.opener && window.opener.BANCO_COMPOSTOS_EXPANDIDO) || null;
    return { labDb, synthDb, expandidoDb };
  }

  const ACERVO_RESERVA = [
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

  function indexarAcervoCompletoFallback() {
    const mapaUnico = new Map();
    const { labDb, synthDb, expandidoDb } = obterFontesDeDados();

    if (labDb && labDb.species) {
      Object.entries(labDb.species).forEach(([chave, dados]) => {
        const id = chave.replace(/_s|_l|_aq|_g/g, '');
        mapaUnico.set(id.toLowerCase(), {
          id, chaveOriginal: chave,
          nome: dados.label || id,
          formula: dados.formula || '--',
          molarMass: dados.molarMass || '--',
          smiles: dados.smiles || '--',
          categoria: classificarCategoria(chave, dados.label),
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
            id, chaveOriginal: synth.produtoId || synth.id,
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
    if (totalBadge) totalBadge.textContent = `${compostosIndexados.length} Espécies Prontas`;
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

  function atualizarContadorFiltrados() {
    const el = document.getElementById('studioFilteredCount');
    if (el) el.textContent = `${compostosFiltrados.length} compostos visíveis`;
  }

  // =========================================================================
  // 13. LISTA VIRTUALIZADA + FAVORITOS
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
      const isFav = favoritos.has(comp.id);
      const itemEl = document.createElement('div');
      itemEl.className = 'compound-item' + (compostoSelecionado?.id === comp.id ? ' selected' : '');
      itemEl.onclick = () => selecionarCompostoStudio(comp, itemEl);
      const massaDisplay = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(1)}` : '--';
      const isCustom = comp.categoria === 'custom';
      itemEl.innerHTML = `
        ${isFav ? '<span class="comp-favorite-star">★</span>' : ''}
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
      if (currentRenderedIndex < compostosFiltrados.length) renderizarListaCompostos(false);
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
        const matchesCategory =
          categoriaAtiva === 'todas' ||
          (categoriaAtiva === 'favoritos' && favoritos.has(c.id)) ||
          c.categoria === categoriaAtiva;
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
      const matchesCategory =
        cat === 'todas' ||
        (cat === 'favoritos' && favoritos.has(c.id)) ||
        c.categoria === cat;
      const matchesQuery = !q || c.nome.toLowerCase().includes(q) ||
                                 c.formula.toLowerCase().includes(q) ||
                                 c.smiles.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    renderizarListaCompostos(true);
    salvarPreferencias();
  };

  // =========================================================================
  // 14. RDKIT
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

  // =========================================================================
  // 15. QUIMIOMETRIA CADD
  // =========================================================================
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
        const molH = rdkit.get_mol(smiles);
        if (molH) { molH.add_hs(); totalAtoms = molH.get_num_atoms(); molH.delete(); }
      } catch (e) {}

      const alertasPAINS = [];
      for (const p of PAINS_SUBSTRUCTURES) {
        try {
          const qmol = rdkit.get_qmol(p.smarts);
          if (qmol) {
            const match = mol.get_substruct_match(qmol);
            qmol.delete();
            if (match && match !== "{}" && match !== "" && match.includes("atoms")) alertasPAINS.push(p);
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

      return { mw, logp, mr, tpsa, hbd, hba, rotb, heavyAtoms, totalAtoms, csp3, falhasLipinski, falhasVeber, falhasGhose, alertasPAINS };
    } catch (e) { return null; }
  }

  async function avaliarQuimiometriaCompleta(smiles, molarMass, nomeComposto) {
    const bL = document.getElementById('badgeLipinski');
    const bV = document.getElementById('badgeVeber');
    const bG = document.getElementById('badgeGhose');
    const bP = document.getElementById('badgePAINS');
    if (!bL || !bV || !bG || !bP) return;

    if (!smiles || smiles === '--' || smiles.includes('.')) {
      bL.className = 'cadd-badge badge-pending'; bL.textContent = 'Lipinski: N/A';
      bV.className = 'cadd-badge badge-pending'; bV.textContent = 'Veber: N/A';
      bG.className = 'cadd-badge badge-pending'; bG.textContent = 'Ghose: N/A';
      bP.className = 'cadd-badge badge-pending'; bP.textContent = 'PAINS: N/A';
      ultimoDossieCADD = null;
      return;
    }

    const props = await calcularPropriedadesMoleculares(smiles, molarMass);
    if (!props) {
      bL.textContent = 'Lipinski: Estimado'; bV.textContent = 'Veber: Estimado';
      bG.textContent = 'Ghose: Estimado'; bP.textContent = 'PAINS: Estimado';
      return;
    }

    bL.className = 'cadd-badge ' + (props.falhasLipinski.length === 0 ? 'badge-approved' : props.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected');
    bL.textContent = props.falhasLipinski.length === 0 ? 'Lipinski: Aprovado' : `Lipinski: ${props.falhasLipinski.length} Viol.`;

    bV.className = 'cadd-badge ' + (props.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected');
    bV.textContent = props.falhasVeber.length === 0 ? 'Veber: Aprovado' : `Veber: ${props.falhasVeber.length} Viol.`;

    bG.className = 'cadd-badge ' + (props.falhasGhose.length === 0 ? 'badge-approved' : props.falhasGhose.length === 1 ? 'badge-warning' : 'badge-rejected');
    bG.textContent = props.falhasGhose.length === 0 ? 'Ghose: Aprovado' : `Ghose: ${props.falhasGhose.length} Viol.`;

    bP.className = 'cadd-badge ' + (props.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected');
    bP.textContent = props.alertasPAINS.length === 0 ? 'PAINS: Limpo' : `PAINS: ${props.alertasPAINS.length} Alerta(s)`;

    ultimoDossieCADD = { ...props, nome: nomeComposto, smiles };
  }

  // =========================================================================
  // 16. INSPEÇÃO ATÔMICA
  // =========================================================================
  function selecionarEInspecionarAtomo(atom) {
    if (!studioViewer || !atom) return;
    atomoAtivoInspecionado = atom;
    try {
      if (atomHighlightShape) studioViewer.removeShape(atomHighlightShape);
      atomHighlightShape = studioViewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.42, color: '#00e5ff', opacity: 0.55 });
      studioViewer.render();
    } catch (e) {}

    const elemSym = (atom.elem || 'C').toUpperCase();
    const elemData = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === elemSym) || {
      z: '?', sym: elemSym, nome: 'Elemento', massa: '--', eletron: '--', raio: '--', valPadrao: 1, valencias: [1]
    };

    const vizinhos = [];
    const numLig = atom.bonds ? atom.bonds.length : 0;
    if (atom.bonds && Array.isArray(atom.bonds)) {
      const all = studioViewer.selectedAtoms({}) || [];
      atom.bonds.forEach(bIdx => {
        const vAt = all.find(a => (a.serial === bIdx || a.index === bIdx));
        if (vAt) vizinhos.push(`${vAt.elem}#${(vAt.serial || vAt.index || 0) + 1}`);
      });
    }

    const hud = document.getElementById('atomInspectorHud');
    if (hud) {
      document.getElementById('hudAtomBadge').textContent = elemData.sym;
      document.getElementById('hudAtomTitle').textContent = `${elemData.nome} (${elemData.sym}) — Átomo #${(atom.serial || atom.index || 0) + 1}`;
      document.getElementById('hudAtomSub').textContent = `Coord: (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)}) • ${numLig} Ligação(ões)`;
      document.getElementById('hudAtomEletron').textContent = elemData.eletron ? `${elemData.eletron} (Pauling)` : 'Inerte';
      document.getElementById('hudAtomRaio').textContent = elemData.raio ? `${elemData.raio} pm` : '--';
      document.getElementById('hudAtomNeighbors').textContent = vizinhos.length > 0 ? vizinhos.join(', ') : 'Átomo isolado';
      hud.style.display = 'flex';
    }

    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) hudLabel.textContent = `Átomo: ${elemData.nome} (${elemData.sym}) com ${numLig} ligações.`;
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
  // 17. TABELA PERIÓDICA
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
        sub.innerHTML = `Substituindo <strong>${atomoAtivoInspecionado.elem}#${(atomoAtivoInspecionado.serial || atomoAtivoInspecionado.index || 0) + 1}</strong> (${nLig} lig.). Elementos compatíveis em verde.`;
      } else {
        sub.textContent = 'Consulte parâmetros físico-químicos e regras de valência para planejamento farmacêutico.';
      }
    }
    renderizarMatrizTabelaPeriodica('todas');
    if (atomoAtivoInspecionado) {
      const eMatch = TABELA_PERIODICA.find(e => e.sym.toUpperCase() === (atomoAtivoInspecionado.elem || '').toUpperCase());
      if (eMatch) selecionarElementoNaTabela(eMatch);
    } else if (TABELA_PERIODICA.length > 0) {
      selecionarElementoNaTabela(TABELA_PERIODICA[5]);
    }
    modal.style.display = 'flex';
  };

  window.fecharTabelaPeriodica = function() {
    const modal = document.getElementById('periodicTableModal');
    if (modal) modal.style.display = 'none';
  };

  window.filtrarElementosPTable = function(cat) {
    document.querySelectorAll('.ptable-pill').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === cat));
    renderizarMatrizTabelaPeriodica(cat);
  };

  function renderizarMatrizTabelaPeriodica(filtroCat) {
    const matrix = document.getElementById('ptableMatrix');
    if (!matrix) return;
    matrix.innerHTML = '';
    const nLigAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;

    TABELA_PERIODICA.forEach(elem => {
      const pos = POSICOES_PTABLE[elem.sym];
      if (!pos) return;
      const tile = document.createElement('div');
      tile.className = `ptable-tile cat-${elem.cat}`;
      tile.style.gridRow = pos.r;
      tile.style.gridColumn = pos.c;
      let isCompat = true;
      if (nLigAlvo !== null) {
        const valMax = Math.max(...elem.valencias);
        isCompat = (nLigAlvo <= valMax && valMax > 0);
        tile.classList.add(isCompat ? 'compatible' : 'incompatible');
      }
      if (filtroCat !== 'todas' && elem.cat !== filtroCat) tile.style.opacity = '0.15';
      if (elementoPTableSelecionado?.sym === elem.sym) tile.classList.add('selected');
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

    const nLigAlvo = atomoAtivoInspecionado && atomoAtivoInspecionado.bonds ? atomoAtivoInspecionado.bonds.length : null;
    let htmlVal = '';
    let podeSubst = false;

    if (atomoAtivoInspecionado && nLigAlvo !== null) {
      const valMax = Math.max(...elem.valencias);
      if (elem.sym === atomoAtivoInspecionado.elem) {
        htmlVal = `<div class="ptable-valence-check valence-valid">ℹ️ O átomo já é do elemento <strong>${elem.nome}</strong>.</div>`;
      } else if (valMax === 0) {
        htmlVal = `<div class="ptable-valence-check valence-invalid">⚠️ Gases nobres não realizam ligações covalentes estáveis.</div>`;
      } else if (nLigAlvo > valMax) {
        htmlVal = `<div class="ptable-valence-check valence-invalid">⚠️ <strong>Incompatibilidade de Valência:</strong> ${nLigAlvo} lig. ativas excedem o máximo do elemento (${valMax}).</div>`;
      } else {
        podeSubst = true;
        htmlVal = `<div class="ptable-valence-check valence-valid">✅ <strong>Substituição Estável:</strong> ${elem.nome} comporta perfeitamente as ${nLigAlvo} ligações.</div>`;
      }
    } else {
      htmlVal = `<div class="ptable-valence-check" style="background:rgba(255,255,255,0.04); color:#94a3b8;">Dica: clique em um átomo no 3D para ativar a substituição in loco.</div>`;
    }

    sidebar.innerHTML = `
      <div class="ptable-hero-card">
        <div class="ptable-hero-badge"><span class="hero-z">${elem.z}</span><span class="hero-sym">${elem.sym}</span></div>
        <div class="ptable-hero-info">
          <span class="ptable-hero-name">${elem.nome}</span>
          <span class="ptable-hero-family">${elem.cat.replace('-', ' ')} • Grupo ${elem.grupo}</span>
        </div>
      </div>
      <div class="ptable-params-list">
        <div class="ptable-param-row"><span>Z:</span><strong>${elem.z}</strong></div>
        <div class="ptable-param-row"><span>Massa:</span><strong>${elem.massa} g/mol</strong></div>
        <div class="ptable-param-row"><span>Eletronegatividade:</span><strong>${elem.eletron ? elem.eletron : 'Inerte'}</strong></div>
        <div class="ptable-param-row"><span>Raio Covalente:</span><strong>${elem.raio} pm</strong></div>
        <div class="ptable-param-row"><span>Valências:</span><strong>${elem.valencias.join(', ')}</strong></div>
      </div>
      <div class="ptable-pharma-box">
        <strong style="color:var(--neon-cyan); display:block; margin-bottom:3px;">Papel na Química Medicinal:</strong>
        ${elem.pharma}
      </div>
      ${htmlVal}
      ${atomoAtivoInspecionado ? `<button class="btn-execute-atom-swap" ${!podeSubst ? 'disabled' : ''} onclick="window.executarSubstituicaoElementar('${elem.sym}')">⚡ Substituir (${atomoAtivoInspecionado.elem} ➔ ${elem.sym})</button>` : ''}
    `;
  }

  window.executarSubstituicaoElementar = async function(novoSimbolo) {
    if (!atomoAtivoInspecionado || !compostoSelecionado || !sdfCacheLocal) return;
    const elemAntigo = atomoAtivoInspecionado.elem;
    const atomIdx = atomoAtivoInspecionado.index !== undefined ? atomoAtivoInspecionado.index : (atomoAtivoInspecionado.serial - 1);

    const linhas = sdfCacheLocal.split('\n');
    let linhaAtomoIdx = -1, contador = 0;
    for (let i = 4; i < linhas.length; i++) {
      const l = linhas[i];
      if (l.includes('M  END') || l.includes('$$$$')) break;
      if (l.length >= 31) {
        if (contador === atomIdx) { linhaAtomoIdx = i; break; }
        contador++;
      }
    }

    if (linhaAtomoIdx === -1) { mostrarNotificacao('Posição atômica não mapeada.', 'error'); return; }

    const original = linhas[linhaAtomoIdx];
    linhas[linhaAtomoIdx] = original.substring(0, 31) + novoSimbolo.padEnd(3) + original.substring(34);
    const novoSdf = linhas.join('\n');

    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const molVal = rdkit.get_mol(novoSdf);
        if (!molVal) {
          mostrarNotificacao(`Substituição ${elemAntigo}→${novoSimbolo} gera estrutura instável.`, 'error');
          return;
        }
        const novoSmiles = molVal.get_smiles();
        molVal.delete();

        pushEdicaoSnapshot(compostoSelecionado, sdfCacheLocal, `Substituição ${elemAntigo}→${novoSimbolo}`);

        const idD = 'sub_' + Date.now();
        const nomeD = `${compostoSelecionado.nome} (${elemAntigo}${atomIdx + 1}➔${novoSimbolo})`;
        const novoComp = { id: idD, chaveOriginal: idD, nome: nomeD, formula: 'Modificação Atômica', molarMass: '--', smiles: novoSmiles, categoria: 'custom', pubchemQuery: nomeD };

        compostosIndexados.unshift(novoComp);
        compostosFiltrados.unshift(novoComp);
        renderizarListaCompostos(true);
        selecionarCompostoStudio(novoComp);
        window.fecharTabelaPeriodica();
        window.fecharInspectorAtomo();
        mostrarNotificacao(`✅ Substituição criada: ${nomeD}`, 'success');
      } catch (err) {
        mostrarNotificacao(`Erro de valência RDKit.`, 'error');
      }
    }
  };

  // =========================================================================
  // 18. BIOISOSTERISMO
  // =========================================================================
  window.abrirPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    const body = document.getElementById('bioisostereModalBody');
    if (!modal || !body) return;

    if (!compostoSelecionado || !compostoSelecionado.smiles || compostoSelecionado.smiles === '--') {
      body.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">Selecione uma molécula orgânica estruturada.</div>`;
      modal.style.display = 'flex';
      return;
    }

    const smiles = compostoSelecionado.smiles;
    const nome = compostoSelecionado.nome;
    const disp = REACOES_BIOISOSTERISMO.filter(rx => rx.detectar(smiles));

    let htmlGrupos = disp.length > 0
      ? Array.from(new Set(disp.map(r => r.alvoSmarts))).map(t => `<span class="bio-group-chip">Alvo: ${t}</span>`).join('')
      : '<span style="color:#f87171; font-size:0.75rem;">Nenhum grupo farmacofórico clássico elegível.</span>';

    let htmlCards = disp.length > 0
      ? disp.map(rx => `
        <div class="bio-transform-card">
          <div class="bio-card-top">
            <span class="bio-card-name">${rx.nome}</span>
            <span class="bio-card-scheme">${rx.esquema}</span>
            <span class="cadd-badge badge-warning" style="align-self:flex-start; margin-top:2px;">${rx.tag}</span>
            <p class="bio-card-desc">${rx.descricao}</p>
          </div>
          <button class="btn-apply-transform" onclick="window.executarTransformacaoBioisosterica('${rx.id}')">🧪 Sintetizar Análogo in Silico</button>
        </div>`).join('')
      : '';

    body.innerHTML = `
      <div class="bio-detected-groups-panel">
        <span class="bio-detected-title">Molécula: <strong style="color:var(--neon-cyan);">${nome}</strong></span>
        <div style="font-family:var(--font-mono); font-size:0.7rem; color:#cbd5e1; word-break:break-all;">${smiles}</div>
        <div class="bio-groups-chips" style="margin-top:6px;">${htmlGrupos}</div>
      </div>
      <div id="bioComparisonArea"></div>
      <h4 style="color:#f8fafc; font-size:0.82rem; margin-top:8px;">Transformações Disponíveis:</h4>
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
    const rx = REACOES_BIOISOSTERISMO.find(r => r.id === idReacao);
    if (!rx) return;
    const smilesOrig = compostoSelecionado.smiles;
    const novoSmiles = rx.transformar(smilesOrig);
    if (novoSmiles === smilesOrig) { mostrarNotificacao('Não foi possível derivatizar.', 'error'); return; }

    const rdkit = await carregarRDKitSobDemanda();
    if (rdkit) {
      try {
        const m = rdkit.get_mol(novoSmiles);
        if (!m) { mostrarNotificacao('Análogo com valência instável.', 'error'); return; }
        m.delete();
      } catch (e) { mostrarNotificacao('Erro de validação.', 'error'); return; }
    }

    const pA = await calcularPropriedadesMoleculares(smilesOrig, parseFloat(compostoSelecionado.molarMass));
    const pD = await calcularPropriedadesMoleculares(novoSmiles, 0);
    const compArea = document.getElementById('bioComparisonArea');

    if (compArea && pA && pD) {
      const dMW = pD.mw - pA.mw;
      const dLogP = pD.logp - pA.logp;
      const dTPSA = pD.tpsa - pA.tpsa;
      compArea.innerHTML = `
        <div class="bio-comparison-container">
          <div class="bio-comparison-header">
            <span class="bio-comparison-title">✨ Análogo: ${rx.nome}</span>
            <button class="studio-btn btn-action-transfer" onclick="window.adicionarDerivadoAoCatalogo('${rx.nome.replace(/'/g, "\\'")}', '${novoSmiles}', ${pD.mw.toFixed(2)})">📥 Injetar no Catálogo</button>
          </div>
          <table class="delta-table">
            <thead><tr><th>Propriedade</th><th>Original</th><th>Derivado</th><th>Δ</th><th>Impacto</th></tr></thead>
            <tbody>
              <tr><td><strong>Massa Molar</strong></td><td>${pA.mw.toFixed(1)} Da</td><td>${pD.mw.toFixed(1)} Da</td><td>${dMW >= 0 ? '+' : ''}${dMW.toFixed(1)}</td><td>${pD.mw <= 500 ? '✅ Ro5' : '⚠️ Violação'}</td></tr>
              <tr><td><strong>LogP</strong></td><td>${pA.logp.toFixed(2)}</td><td>${pD.logp.toFixed(2)}</td><td class="${dLogP > 0 ? 'delta-pos' : 'delta-neg'}">${dLogP >= 0 ? '+' : ''}${dLogP.toFixed(2)}</td><td>${dLogP > 0 ? 'Maior lipofilicidade' : 'Mais hidrofílico'}</td></tr>
              <tr><td><strong>TPSA</strong></td><td>${pA.tpsa.toFixed(1)} Å²</td><td>${pD.tpsa.toFixed(1)} Å²</td><td class="${dTPSA < 0 ? 'delta-good' : 'delta-neg'}">${dTPSA >= 0 ? '+' : ''}${dTPSA.toFixed(1)}</td><td>${pD.tpsa <= 140 ? '✅ Oral OK' : '⚠️ Baixa permeabilidade'}</td></tr>
            </tbody>
          </table>
        </div>
      `;
    }
  };

  window.adicionarDerivadoAoCatalogo = function(nomeTransf, novoSmiles, novoMW) {
    if (!compostoSelecionado) return;
    const idU = 'deriv_' + Date.now();
    const nomeD = `${compostoSelecionado.nome} [${nomeTransf}]`;
    const novoComp = { id: idU, chaveOriginal: idU, nome: nomeD, formula: 'Análogo CADD', molarMass: novoMW, smiles: novoSmiles, categoria: 'custom', pubchemQuery: nomeD };
    compostosIndexados.unshift(novoComp);
    compostosFiltrados.unshift(novoComp);
    renderizarListaCompostos(true);
    selecionarCompostoStudio(novoComp);
    window.fecharPainelBioisosterismo();
    mostrarNotificacao('Análogo adicionado ao catálogo.', 'success');
  };

  // =========================================================================
  // 19. BUSCA POR SIMILARIDADE TANIMOTO — FASE C
  // =========================================================================
  window.abrirSimilaridade = async function() {
    const modal = document.getElementById('similarityModal');
    const body = document.getElementById('similarityModalBody');
    const sub = document.getElementById('similaritySubHeader');
    if (!modal || !body) return;
    if (!compostoSelecionado || !compostoSelecionado.smiles) {
      mostrarNotificacao('Selecione uma molécula primeiro.', 'error');
      return;
    }
    modal.style.display = 'flex';
    body.innerHTML = '<div style="text-align:center; padding: 30px; color: #64748b;">Calculando fingerprints Morgan...</div>';
    if (sub) sub.textContent = `Alvo: ${compostoSelecionado.nome}`;

    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) {
      body.innerHTML = '<div style="text-align:center; padding: 30px; color: #f87171;">RDKit indisponível.</div>';
      return;
    }

    const alvoSmiles = compostoSelecionado.smiles;
    const alvoMol = rdkit.get_mol(alvoSmiles);
    if (!alvoMol) { body.innerHTML = '<div style="padding:20px; color:#f87171;">SMILES alvo inválido.</div>'; return; }

    let alvoFp = null;
    try { alvoFp = alvoMol.get_morgan_fp(); } catch (e) {}
    alvoMol.delete();

    if (!alvoFp) {
      body.innerHTML = '<div style="padding:20px; color:#f87171;">Fingerprint do alvo não calculável.</div>';
      return;
    }

    const resultados = [];
    for (const comp of compostosIndexados) {
      if (!comp.smiles || comp.smiles === '--' || comp.smiles.includes('.')) continue;
      if (comp.id === compostoSelecionado.id) continue;
      try {
        const m = rdkit.get_mol(comp.smiles);
        if (!m) continue;
        const fp = m.get_morgan_fp();
        m.delete();
        if (!fp) continue;
        const t = tanimotoBits(alvoFp, fp);
        if (t > 0.15) resultados.push({ comp, tanimoto: t });
      } catch (e) {}
    }
    resultados.sort((a, b) => b.tanimoto - a.tanimoto);

    const top = resultados.slice(0, 20);
    if (top.length === 0) {
      body.innerHTML = `<div class="similarity-target-box"><div class="similarity-target-name">${compostoSelecionado.nome}</div><div class="similarity-target-smiles">${alvoSmiles}</div></div><div style="padding:20px; color:#94a3b8;">Nenhum composto similar encontrado (Tanimoto > 0.15).</div>`;
      return;
    }

    body.innerHTML = `
      <div class="similarity-target-box">
        <div class="similarity-target-name">🎯 Alvo: ${compostoSelecionado.nome}</div>
        <div class="similarity-target-smiles">${alvoSmiles}</div>
      </div>
      <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">Top ${top.length} mais similares (Morgan FP, raio 2, 2048 bits):</div>
      <div class="similarity-results-list">
        ${top.map(r => {
          const scoreClass = r.tanimoto > 0.7 ? 'score-high' : r.tanimoto > 0.4 ? 'score-mid' : 'score-low';
          return `
            <div class="similarity-result-item" onclick="window.selecionarCompostoStudio(${JSON.stringify(r.comp).replace(/"/g, '&quot;')}); window.fecharSimilaridade();">
              <div class="similarity-score-badge ${scoreClass}">${(r.tanimoto * 100).toFixed(0)}%</div>
              <div>
                <div class="similarity-result-name">${r.comp.nome}</div>
                <div class="similarity-result-formula">${r.comp.formula}</div>
              </div>
              <div style="text-align:right; font-family:var(--font-mono); font-size:0.65rem; color:#94a3b8;">${r.comp.molarMass !== '--' ? parseFloat(r.comp.molarMass).toFixed(1) + ' Da' : ''}</div>
            </div>`;
        }).join('')}
      </div>
    `;
  };

  window.fecharSimilaridade = function() {
    const modal = document.getElementById('similarityModal');
    if (modal) modal.style.display = 'none';
  };

  function tanimotoBits(fpA, fpB) {
    if (!fpA || !fpB) return 0;
    let inter = 0, uni = 0;
    const len = Math.min(fpA.length, fpB.length);
    for (let i = 0; i < len; i++) {
      const a = fpA[i] | 0;
      const b = fpB[i] | 0;
      inter += popcount(a & b);
      uni += popcount(a | b);
    }
    return uni === 0 ? 0 : inter / uni;
  }

  function popcount(x) {
    let count = 0;
    while (x) { x &= x - 1; count++; }
    return count;
  }

  // =========================================================================
  // 20. SCAFFOLD MURCKO — FASE C
  // =========================================================================
  window.extrairScaffoldAtual = async function() {
    if (!compostoSelecionado || !compostoSelecionado.smiles) {
      mostrarNotificacao('Selecione uma molécula.', 'error');
      return;
    }
    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) { mostrarNotificacao('RDKit indisponível.', 'error'); return; }

    try {
      const mol = rdkit.get_mol(compostoSelecionado.smiles);
      if (!mol) { mostrarNotificacao('SMILES inválido.', 'error'); return; }

      let scaffoldSmiles = null;
      try { scaffoldSmiles = mol.get_murcko_scaffold(); } catch (e) {}
      mol.delete();

      if (!scaffoldSmiles) { mostrarNotificacao('Não foi possível extrair o scaffold.', 'error'); return; }

      const idS = 'scaffold_' + Date.now();
      const nomeS = `Scaffold de ${compostoSelecionado.nome}`;
      const novoComp = { id: idS, chaveOriginal: idS, nome: nomeS, formula: 'Scaffold Murcko', molarMass: '--', smiles: scaffoldSmiles, categoria: 'custom', pubchemQuery: nomeS };
      compostosIndexados.unshift(novoComp);
      compostosFiltrados.unshift(novoComp);
      renderizarListaCompostos(true);
      selecionarCompostoStudio(novoComp);
      mostrarNotificacao('Scaffold extraído: ' + scaffoldSmiles, 'success');
    } catch (e) {
      mostrarNotificacao('Erro ao extrair scaffold.', 'error');
    }
  };

  // =========================================================================
  // 21. COMPARAÇÃO SPLIT-SCREEN — FASE C
  // =========================================================================
  window.abrirComparacao = function() {
    const modal = document.getElementById('comparisonModal');
    const selA = document.getElementById('cmpSelectA');
    const selB = document.getElementById('cmpSelectB');
    if (!modal || !selA || !selB) return;

    const opcoes = compostosIndexados
      .filter(c => c.smiles && c.smiles !== '--' && !c.smiles.includes('.'))
      .slice(0, 500)
      .map(c => `<option value="${c.id}">${c.nome} — ${c.formula}</option>`)
      .join('');

    selA.innerHTML = opcoes;
    selB.innerHTML = opcoes;

    if (compostoSelecionado) selA.value = compostoSelecionado.id;
    if (compostosIndexados.length > 1) {
      const outro = compostosIndexados.find(c => c.id !== compostoSelecionado?.id && c.smiles && c.smiles !== '--');
      if (outro) selB.value = outro.id;
    }

    modal.style.display = 'flex';
    document.getElementById('comparisonMetrics').innerHTML = '<div style="text-align:center; padding: 20px; color: #64748b; font-size: 0.78rem;">Clique em "⚖️ Comparar" para iniciar.</div>';
  };

  window.fecharComparacao = function() {
    const modal = document.getElementById('comparisonModal');
    if (modal) modal.style.display = 'none';
    if (cmpViewerA) { try { cmpViewerA.clear(); } catch (e) {} cmpViewerA = null; }
    if (cmpViewerB) { try { cmpViewerB.clear(); } catch (e) {} cmpViewerB = null; }
  };

  window.executarComparacao = async function() {
    const idA = document.getElementById('cmpSelectA')?.value;
    const idB = document.getElementById('cmpSelectB')?.value;
    if (!idA || !idB) { mostrarNotificacao('Selecione dois compostos.', 'error'); return; }
    if (idA === idB) { mostrarNotificacao('Selecione compostos diferentes.', 'warning'); return; }

    const compA = compostosIndexados.find(c => c.id === idA);
    const compB = compostosIndexados.find(c => c.id === idB);
    if (!compA || !compB) return;

    document.getElementById('cmpLabelA').textContent = compA.nome;
    document.getElementById('cmpLabelB').textContent = compB.nome;

    const sdfA = await resolverCoordenadas3D(compA.smiles, compA.pubchemQuery || compA.nome);
    const sdfB = await resolverCoordenadas3D(compB.smiles, compB.pubchemQuery || compB.nome);

    document.getElementById('cmpViewerA').innerHTML = '';
    document.getElementById('cmpViewerB').innerHTML = '';

    if (sdfA && window.$3Dmol) {
      cmpViewerA = $3Dmol.createViewer('cmpViewerA', { backgroundColor: '#020617' });
      cmpViewerA.addModel(sdfA, 'sdf');
      cmpViewerA.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      cmpViewerA.zoomTo();
      cmpViewerA.render();
    }

    if (sdfB && window.$3Dmol) {
      cmpViewerB = $3Dmol.createViewer('cmpViewerB', { backgroundColor: '#020617' });
      cmpViewerB.addModel(sdfB, 'sdf');
      cmpViewerB.setStyle({}, { stick: { radius: 0.12 }, sphere: { scale: 0.22 } });
      cmpViewerB.zoomTo();
      cmpViewerB.render();
    }

    // Sincronizar câmeras
    sincronizarCameras(cmpViewerA, cmpViewerB);

    // Comparação de propriedades
    const pA = await calcularPropriedadesMoleculares(compA.smiles, parseFloat(compA.molarMass));
    const pB = await calcularPropriedadesMoleculares(compB.smiles, parseFloat(compB.molarMass));

    if (pA && pB) {
      const render = (label, vA, vB, deltaBomQuandoMenor = false) => {
        const d = vB - vA;
        const isGood = deltaBomQuandoMenor ? d < 0 : d > 0;
        return `<tr><td>${label}</td><td>${vA.toFixed(2)}</td><td>${vB.toFixed(2)}</td><td class="${isGood ? 'cmp-delta-pos' : 'cmp-delta-neg'}">${d >= 0 ? '+' : ''}${d.toFixed(2)}</td></tr>`;
      };

      document.getElementById('comparisonMetrics').innerHTML = `
        <table class="comparison-table">
          <thead><tr><th>Propriedade</th><th>${compA.nome}</th><th>${compB.nome}</th><th>Δ (B-A)</th></tr></thead>
          <tbody>
            ${render('Massa Molar (Da)', pA.mw, pB.mw, true)}
            ${render('LogP', pA.logp, pB.logp, false)}
            ${render('TPSA (Å²)', pA.tpsa, pB.tpsa, true)}
            ${render('HBD', pA.hbd, pB.hbd, true)}
            ${render('HBA', pA.hba, pB.hba, true)}
            ${render('Ligações Rotacionáveis', pA.rotb, pB.rotb, true)}
            ${render('Refração Molar', pA.mr, pB.mr, false)}
            ${render('Fração Csp³', pA.csp3, pB.csp3, false)}
          </tbody>
        </table>
      `;
    }
  };

  function sincronizarCameras(v1, v2) {
    if (!v1 || !v2) return;
    let syncing = false;
    const sync = (src, dst) => {
      if (!src || !dst || typeof src.setViewChangeCallback !== 'function') return;
      src.setViewChangeCallback(() => {
        if (syncing) return;
        syncing = true;
        try { dst.setView(src.getView()); dst.render(); } catch (e) {}
        syncing = false;
      });
    };
    sync(v1, v2);
    sync(v2, v1);
  }

  // =========================================================================
  // 22. EXPORTAÇÃO CSV EM LOTE — FASE C
  // =========================================================================
  window.exportarCSVFiltrados = function() {
    if (compostosFiltrados.length === 0) { mostrarNotificacao('Nenhum composto filtrado.', 'error'); return; }
    const linhas = ['Nome,Formula,Massa,SMILES,Categoria'];
    compostosFiltrados.forEach(c => {
      const nome = `"${(c.nome || '').replace(/"/g, '""')}"`;
      const smiles = `"${(c.smiles || '').replace(/"/g, '""')}"`;
      linhas.push([nome, c.formula || '', c.molarMass || '', smiles, c.categoria || ''].join(','));
    });
    const csv = linhas.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laift_catalogo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao(`${compostosFiltrados.length} compostos exportados.`, 'success');
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
            <span class="cadd-card-title">💊 Regra de Lipinski (Ro5)</span>
            <span class="cadd-badge ${d.falhasLipinski.length === 0 ? 'badge-approved' : d.falhasLipinski.length === 1 ? 'badge-warning' : 'badge-rejected'}">${d.falhasLipinski.length === 0 ? 'Conforme' : d.falhasLipinski.length + ' Violação(ões)'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.mw > 500 ? 'violated' : ''}"><span>Massa Molar (≤ 500):</span><strong>${d.mw.toFixed(2)} Da</strong></div>
            <div class="cadd-param-item ${d.logp > 5 ? 'violated' : ''}"><span>LogP (≤ 5):</span><strong>${d.logp.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.hbd > 5 ? 'violated' : ''}"><span>HBD (≤ 5):</span><strong>${d.hbd}</strong></div>
            <div class="cadd-param-item ${d.hba > 10 ? 'violated' : ''}"><span>HBA (≤ 10):</span><strong>${d.hba}</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">🔬 Regra de Veber</span>
            <span class="cadd-badge ${d.falhasVeber.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.falhasVeber.length === 0 ? 'Alta Biodisponibilidade' : 'Baixa'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.rotb > 10 ? 'violated' : ''}"><span>Ligações Rotacionáveis (≤ 10):</span><strong>${d.rotb}</strong></div>
            <div class="cadd-param-item ${d.tpsa > 140 ? 'violated' : ''}"><span>TPSA (≤ 140 Å²):</span><strong>${d.tpsa.toFixed(1)} Å²</strong></div>
            <div class="cadd-param-item"><span>Fração sp³:</span><strong>${d.csp3.toFixed(2)}</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">📐 Filtro de Ghose</span>
            <span class="cadd-badge ${d.falhasGhose.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.falhasGhose.length === 0 ? 'Aprovado' : d.falhasGhose.length + ' Viol.'}</span>
          </div>
          <div class="cadd-param-list">
            <div class="cadd-param-item ${d.mw < 160 || d.mw > 480 ? 'violated' : ''}"><span>Massa (160-480):</span><strong>${d.mw.toFixed(1)}</strong></div>
            <div class="cadd-param-item ${d.logp < -0.4 || d.logp > 5.6 ? 'violated' : ''}"><span>LogP (-0.4 a 5.6):</span><strong>${d.logp.toFixed(2)}</strong></div>
            <div class="cadd-param-item ${d.mr < 40 || d.mr > 130 ? 'violated' : ''}"><span>Refração Molar:</span><strong>${d.mr.toFixed(1)}</strong></div>
            <div class="cadd-param-item ${d.totalAtoms < 20 || d.totalAtoms > 70 ? 'violated' : ''}"><span>Átomos (20-70):</span><strong>${d.totalAtoms}</strong></div>
          </div>
        </div>

        <div class="cadd-card">
          <div class="cadd-card-title-row">
            <span class="cadd-card-title">⚠️ Filtro PAINS</span>
            <span class="cadd-badge ${d.alertasPAINS.length === 0 ? 'badge-approved' : 'badge-rejected'}">${d.alertasPAINS.length === 0 ? 'Isento' : d.alertasPAINS.length + ' Alerta(s)'}</span>
          </div>
          ${d.alertasPAINS.length === 0
            ? `<div class="pains-clean-box">✅ <strong>Sem grupos promíscuos detectados.</strong></div>`
            : `<div class="pains-alert-box"><strong>Subestruturas Reativas:</strong><br>${d.alertasPAINS.map(a => `• <strong>${a.nome}</strong>: ${a.risco}`).join('<br>')}</div>`}
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
  // 24. RESOLUÇÃO 3D
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
    if (smiles && smiles.startsWith('[') && smiles.endsWith(']') && smiles.length <= 5) return gerarSDFMonoatomico(smiles);

    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
      if (cache && validarConteudoSDF(cache.sdf)) return cache.sdf;
    }

    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, "Calculando geometria 3D (ETKDG)...");
          const mol = rdkit.get_mol(smiles);
          if (mol) {
            mol.add_hs();
            if (mol.embed_mol() >= 0) {
              const sdf = mol.to_sdf();
              mol.delete();
              exibirStatusRDKit(false);
              if (validarConteudoSDF(sdf)) { salvarEmCache(smiles, termoBusca, sdf); return sdf; }
            } else mol.delete();
          }
        } catch (e) {}
      }
    }

    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      try {
        exibirStatusRDKit(true, "Consultando PubChem 3D...");
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`);
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(smiles, termoBusca, sdf); return sdf; }
        }
      } catch (e) {}
    }

    if (smiles && smiles !== '--') {
      try {
        exibirStatusRDKit(true, "Consultando CACTUS NIH...");
        const res = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/file?format=sdf`);
        if (res.ok) {
          const sdf = await res.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdf)) { salvarEmCache(smiles, termoBusca, sdf); return sdf; }
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
  // 25. CARREGAR ESTRUTURA NO STUDIO
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;
    window.fecharInspectorAtomo();
    const watermark = document.getElementById('studioWatermark');
    if (watermark) watermark.style.display = 'none';

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
      pushEdicaoSnapshot(comp, sdf, 'Carregamento inicial');
    } else {
      modeloCarregadoAtivo = false;
      const container3D = document.getElementById('studioViewer3D');
      if (container3D) {
        container3D.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center; max-width: 80%;">⚠️ Coordenadas 3D não disponíveis.<br>A projeção 2D continua disponível.</div>`;
      }
    }
  }

  function construirCena3D(sdfText) {
    const container = document.getElementById('studioViewer3D');
    if (!container || !window.$3Dmol || !validarConteudoSDF(sdfText)) return;

    try {
      if (studioViewer) { try { studioViewer.stopAnimate(); } catch (e) {} }
      container.innerHTML = '';
      studioViewer = $3Dmol.createViewer(container, { backgroundColor: '#020617' });
      const model = studioViewer.addModel(sdfText, 'sdf');
      if (!model || typeof model.selectedAtoms !== 'function' || model.selectedAtoms({}).length === 0) {
        modeloCarregadoAtivo = false;
        return;
      }
      modeloCarregadoAtivo = true;
      aplicarEstiloVisual(modeloAtual);

      studioViewer.setClickable({}, true, function(atom) {
        if (modoMedicaoAtivo) processarCliqueMedicao(atom);
        else selecionarEInspecionarAtomo(atom);
      });

      studioViewer.zoomTo();
      studioViewer.render();
      setTimeout(() => { if (studioViewer && modeloCarregadoAtivo) { try { studioViewer.resize(); studioViewer.render(); } catch (e) {} } }, 120);
      if (autoRotacaoAtiva) studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
    } catch (errCena) {
      modeloCarregadoAtivo = false;
      console.warn('[Studio 3Dmol] Erro:', errCena);
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
    } catch (errEstilo) {}
  }

  function desenharEstrutura2DStudio(smiles, nome) {
    const canvas = document.getElementById('studioCanvas2D');
    if (!canvas) return;
    if (typeof SmilesDrawer !== 'undefined' && smiles && smiles !== '--' && !smiles.includes('.')) {
      try {
        const drawer = new SmilesDrawer.Drawer({ width: 650, height: 480, bondThickness: 1.6, bondLength: 20, isomeric: true });
        SmilesDrawer.parse(smiles, function(tree) { drawer.draw(tree, 'studioCanvas2D', 'dark', false); });
      } catch (e) { desenharFallback2D(canvas, smiles, nome); }
    } else desenharFallback2D(canvas, smiles, nome);
  }

  function desenharFallback2D(canvas, smiles, nome) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px "Urbanist", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nome || 'Composto', canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Fira Code", monospace';
    ctx.fillText(smiles || 'Estrutura Indisponível', canvas.width / 2, canvas.height / 2 + 18);
  }

  // =========================================================================
  // 26. CONTROLES
  // =========================================================================
  window.setModelo3D = function(modo) {
    modeloAtual = modo;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(btn => btn.classList.remove('active'));
    const botoes = { ballstick: 'btnModoBallStick', cpk: 'btnModoCPK', wireframe: 'btnModoWire', surface: 'btnModoSurface' };
    const target = document.getElementById(botoes[modo]);
    if (target) target.classList.add('active');
    if (modeloCarregadoAtivo && modoExibicaoAtual === '3D') aplicarEstiloVisual(modo);
    salvarPreferencias();
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
        if (studioViewer && modeloCarregadoAtivo) { studioViewer.resize(); studioViewer.render(); }
      }
    } else {
      if (v3D) v3D.style.display = 'none';
      if (v2D) v2D.style.display = 'flex';
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

    const hudLabel = document.getElementById('studioLastMeasurement');
    if (atomosSelecionadosParaMedicao.length === 2) {
      const a1 = atomosSelecionadosParaMedicao[0], a2 = atomosSelecionadosParaMedicao[1];
      const d = Math.hypot(a2.x - a1.x, a2.y - a1.y, a2.z - a1.z);
      studioViewer.addLine({ start: { x: a1.x, y: a1.y, z: a1.z }, end: { x: a2.x, y: a2.y, z: a2.z }, color: '#fb7185', dashed: true });
      studioViewer.addLabel(`${d.toFixed(3)} Å`, { position: { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 }, backgroundColor: '#020617', fontColor: '#38bdf8', fontSize: 12 });
      if (hudLabel) hudLabel.textContent = `Distância (${a1.elem}-${a2.elem}): ${d.toFixed(3)} Å`;
      studioViewer.render();
    } else if (atomosSelecionadosParaMedicao.length === 3) {
      const a1 = atomosSelecionadosParaMedicao[0], a2 = atomosSelecionadosParaMedicao[1], a3 = atomosSelecionadosParaMedicao[2];
      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const magU = Math.hypot(u.x, u.y, u.z), magV = Math.hypot(v.x, v.y, v.z);
      const ang = (Math.acos(Math.max(-1, Math.min(1, dot / (magU * magV)))) * 180) / Math.PI;
      studioViewer.addLabel(`Ângulo: ${ang.toFixed(1)}°`, { position: { x: a2.x, y: a2.y + 0.35, z: a2.z }, backgroundColor: '#020617', fontColor: '#facc15', fontSize: 12 });
      if (hudLabel) hudLabel.textContent = `Ângulo (${a1.elem}-${a2.elem}-${a3.elem}): ${ang.toFixed(1)}°`;
      studioViewer.render();
      atomosSelecionadosParaMedicao = [];
    }
  }

  window.limparMedicoes3D = function() {
    atomosSelecionadosParaMedicao = [];
    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) hudLabel.textContent = 'Medições redefinidas.';
    if (sdfCacheLocal && studioViewer && modeloCarregadoAtivo) construirCena3D(sdfCacheLocal);
  };

  window.toggleAutoRotacao3D = function() {
    autoRotacaoAtiva = !autoRotacaoAtiva;
    const btn = document.getElementById('btnAutoRotate');
    if (btn) btn.classList.toggle('active', autoRotacaoAtiva);
    if (studioViewer && modeloCarregadoAtivo) {
      try {
        if (autoRotacaoAtiva) studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
        else studioViewer.stopAnimate();
      } catch (e) {}
    }
    salvarPreferencias();
  };

  window.resetarCamera3D = function() {
    if (studioViewer && modeloCarregadoAtivo) { studioViewer.zoomTo(); studioViewer.render(); studioViewer.resize(); }
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
    if (!sdfCacheLocal) { mostrarNotificacao('Aguarde a conformação 3D ser calculada.', 'error'); return; }
    const nomeBase = (compostoSelecionado?.nome || 'composto').replace(/\s+/g, '_');
    const blob = new Blob([sdfCacheLocal], { type: 'chemical/x-mdl-sdfile;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeBase}_3D.sdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // 27. SELEÇÃO E TRANSFERÊNCIA
  // =========================================================================
  window.selecionarCompostoStudio = function(comp, el, addToHistory = true) {
    if (!comp) return;
    compostoSelecionado = comp;
    document.querySelectorAll('.compound-item').forEach(i => i.classList.remove('selected'));
    if (el) el.classList.add('selected');
    else {
      const items = document.querySelectorAll('.compound-item');
      items.forEach(i => { if (i.querySelector('.comp-name')?.textContent.includes(comp.nome)) i.classList.add('selected'); });
    }
    if (addToHistory) pushNavegacao(comp);
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
    if (labBroadcast) labBroadcast.postMessage({ tipo: 'CARREGAR_COMPOSTO_BANCADA', composto: payload });
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ acao: 'carregarCompostoNaBancada', composto: payload }, '*');
    }
    localStorage.setItem('laift_composto_transferido', JSON.stringify(payload));
    if (window.opener) window.close();
    else if (window.parent && window.parent !== window) window.parent.postMessage({ acao: 'fecharModalStudio' }, '*');
    else window.location.href = '../index.html';
  };

  // =========================================================================
  // 28. INICIALIZAÇÃO
  // =========================================================================
  async function inicializarStudioComPolling() {
    let tentativas = 0;
    while (tentativas < 10) {
      const { labDb, synthDb } = obterFontesDeDados();
      if (labDb || synthDb) break;
      await new Promise(r => setTimeout(r, 100));
      tentativas++;
    }

    carregarFavoritos();

    const worker = inicializarWorker();
    if (worker) {
      const { labDb, synthDb, expandidoDb } = obterFontesDeDados();
      worker.postMessage({ tipo: 'INDEXAR', payload: { labDb, synthDb, expandidoDb, reserva: ACERVO_RESERVA } });
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
    if (e.data && e.data.acao === 'studioAberto') {
      setTimeout(() => { if (studioViewer && modeloCarregadoAtivo) { studioViewer.resize(); studioViewer.render(); } }, 120);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarStudioComPolling);
  } else {
    inicializarStudioComPolling();
  }

})();

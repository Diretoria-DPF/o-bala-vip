/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js
 * Módulo CADD: Lipinski, Veber, Ghose, PAINS & Bioisosterismo / Derivatização
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

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;

  // =========================================================================
  // 1. SUBESTRUTURAS SMARTS DE PAINS (BAELL ET AL., 2010)
  // =========================================================================
  const PAINS_SUBSTRUCTURES = [
    { id: 'quinona', nome: 'Quinona / Di-ona Cíclica', smarts: 'O=C1[#6]=,:[#6]C(=O)[#6]=,:[#6]1', risco: 'Agente oxidante com alto potencial redox e alquilação inespecífica de tióis proteicos.' },
    { id: 'catecol', nome: 'Catecol (1,2-Benzenodiol)', smarts: 'c1c(O)c(O)ccc1', risco: 'Quelante metálico promíscuo e precursor oxidável de orto-quinona reativa.' },
    { id: 'rhodanina', nome: 'Rodanina (2-Tioxotiazolidin-4-ona)', smarts: 'O=C1CSC(=S)N1', risco: 'Molécula agregadora coloidal, causa inibição enzimática artefatual em ensaios.' },
    { id: 'michael_acceptor', nome: 'Aceptor de Michael (Enona Conjugada)', smarts: 'C=CC(=O)[#6,#8,#7]', risco: 'Eletrófilo forte capaz de formar ligações covalentes inespecíficas com cisteínas.' },
    { id: 'alquil_haleto', nome: 'Haleto Alifático Reativo', smarts: '[CX4][Cl,Br,I]', risco: 'Agente alquilante inespecífico, incompatível com seletividade farmacológica.' },
    { id: 'aldeido', nome: 'Aldeído Livre', smarts: '[CX3H1](=O)[#6,H]', risco: 'Reage covalentemente com resíduos de lisina via formação de base de Schiff.' },
    { id: 'epoxido', nome: 'Epóxido / Oxirano', smarts: 'C1OC1', risco: 'Anel tensionado altamente reativo a nucleófilos intracelulares e DNA.' },
    { id: 'aziridina', nome: 'Aziridina', smarts: 'C1NC1', risco: 'Eletrófilo potente com potencial genotóxico por alquilação direta.' },
    { id: 'tiocarbonila', nome: 'Tiocarbonila Livre (C=S)', smarts: '[#6]=S', risco: 'Interferência espectroscópica e desnaturação inespecífica de sítios proteicos.' },
    { id: 'hidrazona', nome: 'Hidrazona Fenólica Ativada', smarts: 'c1ccc(O)cc1NN=C', risco: 'Interferência de fluorescência e afinidade promíscua a metais de transição.' },
    { id: 'nitroso', nome: 'Grupo Nitroso', smarts: '[#6]-[N;X2]=O', risco: 'Espécie reativa de nitrogênio com instabilidade redox e risco de toxicidade.' },
    { id: 'haloacetamida', nome: 'Haloacetamida Alquilante', smarts: 'NC(=O)C[Cl,Br,I]', risco: 'Inibidor covalente indiscriminado de enzimas tiólicas.' }
  ];

  // =========================================================================
  // 2. CATÁLOGO DE REAÇÕES BIOISOSTÉRICAS & DERIVATIZAÇÃO QUÍMICA
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
      descricao: 'Conversão bioisostérica de 4-aminofenol em Paracetamol (Acetaminofeno): atenua toxicidade de aminas livres e potencializa propriedades analgésicas.',
      alvoSmarts: '[NH2]',
      detectar: (s) => /N/i.test(s) && !/N\(=O\)/i.test(s),
      transformar: (s) => s.replace(/NC/i, 'N(C(=O)C)C').replace(/\[NH2\]/i, 'NC(=O)C').replace(/N(?=[^(=O)])/i, 'NC(=O)C')
    },
    {
      id: 'fluorizacao_aromatica',
      nome: 'Fluorização Aromática (Bloqueio CYP)',
      tag: 'Bioisóstero H ➔ F',
      esquema: 'Ar-H ➔ Ar-F',
      descricao: 'O flúor mimetiza o hidrogênio espacialmente, porém o forte efeito retirador de elétrons desativa o anel aromático contra a hidroxilação por CYP450, aumentando a meia-vida.',
      alvoSmarts: 'c1ccccc1',
      detectar: (s) => /c1ccccc1/i.test(s) || /c[0-9]ccc/i.test(s),
      transformar: (s) => s.replace(/c1ccccc1/i, 'c1ccc(F)cc1').replace(/c1/i, 'c1(F)')
    },
    {
      id: 'trifluorometilacao',
      nome: 'Trifluorometilação Lipofílica',
      tag: 'Bioisóstero CH₃ ➔ CF₃',
      esquema: 'R-CH₃ ➔ R-CF₃',
      descricao: 'Amplia a lipofilicidade local e proporciona extrema resistência química e metabólica à oxidação alifática.',
      alvoSmarts: '[CH3]',
      detectar: (s) => /C(?![=O#])/i.test(s),
      transformar: (s) => s.replace(/C$/i, 'C(F)(F)F').replace(/\(C\)/i, '(C(F)(F)F)')
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
            categoria: c.categoria || 'reagentes',
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
      { id: "Na", chaveOriginal: "Na_s", nome: "Sódio Metálico", formula: "Na", molarMass: 22.99, smiles: "[Na]", categoria: "reagentes", pubchemQuery: "Sodium" },
      { id: "Sarin", chaveOriginal: "C4H10FO2P_l", nome: "Sarin (GB)", formula: "C4H10FO2P", molarMass: 140.09, smiles: "CC(C)OP(=O)(C)F", categoria: "toxicos", pubchemQuery: "Sarin" },
      { id: "Estricnina", chaveOriginal: "C20H22N2O2_s", nome: "Estricnina", formula: "C20H22N2O2", molarMass: 334.41, smiles: "O=C1CC2OCC=C3CN4CCC56C4CC3C2C5=CC=CC61", categoria: "toxicos", pubchemQuery: "Strychnine" }
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

      // Alertas PAINS
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

    // Lipinski
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

    // Veber
    if (props.falhasVeber.length === 0) {
      bVeber.className = 'cadd-badge badge-approved';
      bVeber.textContent = 'Veber: Aprovado';
    } else {
      bVeber.className = 'cadd-badge badge-rejected';
      bVeber.textContent = `Veber: ${props.falhasVeber.length} Violações`;
    }

    // Ghose
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

    // PAINS
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
  // 6. MOTOR DE BIOISOSTERISMO & DERIVATIZAÇÃO
  // =========================================================================
  window.abrirPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    const body = document.getElementById('bioisostereModalBody');
    if (!modal || !body) return;

    if (!compostoSelecionado || !compostoSelecionado.smiles || compostoSelecionado.smiles === '--') {
      body.innerHTML = `
        <div style="text-align:center; padding:30px; color:#94a3b8;">
          Selecione uma molécula orgânica estruturada no catálogo lateral para planejar modificações bioisostéricas.
        </div>
      `;
      modal.style.display = 'flex';
      return;
    }

    const smiles = compostoSelecionado.smiles;
    const nome = compostoSelecionado.nome;

    // Detectar grupos funcionais compatíveis com as reações
    const reacoesDisponiveis = REACOES_BIOISOSTERISMO.filter(rx => rx.detectar(smiles));

    let htmlGrupos = '';
    if (reacoesDisponiveis.length > 0) {
      const tagsDetectadas = new Set(reacoesDisponiveis.map(r => r.alvoSmarts));
      htmlGrupos = Array.from(tagsDetectadas).map(t => `<span class="bio-group-chip">Alvo detectado: ${t}</span>`).join('');
    } else {
      htmlGrupos = '<span style="color:#f87171; font-size:0.75rem;">Nenhum grupo farmacofórico padrão elegível para substituição bioisostérica direta neste composto.</span>';
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

      <h4 style="color:#f8fafc; font-size:0.82rem; margin-top:6px; margin-bottom:2px;">Transformações Moleculares & Bioisosterismo Disponíveis:</h4>
      <div class="bio-transforms-grid">
        ${htmlCards}
      </div>
    `;

    modal.style.display = 'flex';
  };

  window.fecharPainelBioisosterismo = function() {
    const modal = document.getElementById('bioisostereModal');
    if (modal) modal.style.display = 'none';
  };

  /**
   * Executa a transformação química, calcula o Delta CADD e injeta o derivado no catálogo
   */
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

    // Cálculos comparativos (Antes vs Depois)
    const propsAntes = await calcularPropriedadesMoleculares(smilesOriginal, parseFloat(compostoSelecionado.molarMass));
    const propsDepois = await calcularPropriedadesMoleculares(novoSmiles, 0);

    const compArea = document.getElementById('bioComparisonArea');
    if (compArea && propsAntes && propsDepois) {
      const deltaMW = propsDepois.mw - propsAntes.mw;
      const deltaLogP = propsDepois.logp - propsAntes.logp;
      const deltaTPSA = propsDepois.tpsa - propsAntes.tpsa;
      const deltaHBD = propsDepois.hbd - propsAntes.hbd;
      const deltaHBA = propsDepois.hba - propsAntes.hba;

      compArea.innerHTML = `
        <div class="bio-comparison-container">
          <div class="bio-comparison-header">
            <span class="bio-comparison-title">✨ Análogo Gerado: ${reacao.nome}</span>
            <button class="studio-btn btn-action-transfer" onclick="window.adicionarDerivadoAoCatalogo('${reacao.nome}', '${novoSmiles}', ${propsDepois.mw.toFixed(2)})">
              📥 Injetar no Catálogo & Visualizar 3D
            </button>
          </div>

          <table class="delta-table">
            <thead>
              <tr>
                <th>Propriedade Farmacocinética</th>
                <th>Original (${nomeOriginal})</th>
                <th>Derivado (${reacao.nome})</th>
                <th>Variação (Δ)</th>
                <th>Impacto Biofarmacêutico</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Massa Molar (MW)</strong></td>
                <td>${propsAntes.mw.toFixed(1)} Da</td>
                <td>${propsDepois.mw.toFixed(1)} Da</td>
                <td>${deltaMW >= 0 ? '+' : ''}${deltaMW.toFixed(1)} Da</td>
                <td>${propsDepois.mw <= 500 ? '✅ Dentro da Ro5' : '⚠️ Violação Lipinski (>500)'}</td>
              </tr>
              <tr>
                <td><strong>LogP de Crippen</strong></td>
                <td>${propsAntes.logp.toFixed(2)}</td>
                <td>${propsDepois.logp.toFixed(2)}</td>
                <td class="${deltaLogP > 0 ? 'delta-pos' : 'delta-neg'}">${deltaLogP >= 0 ? '+' : ''}${deltaLogP.toFixed(2)}</td>
                <td>${deltaLogP > 0 ? 'Maior lipofilicidade / permeabilidade' : 'Maior hidrossolubilidade'}</td>
              </tr>
              <tr>
                <td><strong>Área Polar (TPSA)</strong></td>
                <td>${propsAntes.tpsa.toFixed(1)} Å²</td>
                <td>${propsDepois.tpsa.toFixed(1)} Å²</td>
                <td class="${deltaTPSA < 0 ? 'delta-good' : 'delta-neg'}">${deltaTPSA >= 0 ? '+' : ''}${deltaTPSA.toFixed(1)} Å²</td>
                <td>${propsDepois.tpsa <= 140 ? '✅ Adequada p/ absorção oral' : '⚠️ Baixa permeabilidade (>140)'}</td>
              </tr>
              <tr>
                <td><strong>Doadores de H (HBD)</strong></td>
                <td>${propsAntes.hbd}</td>
                <td>${propsDepois.hbd}</td>
                <td>${deltaHBD >= 0 ? '+' : ''}${deltaHBD}</td>
                <td>${propsDepois.hbd <= 5 ? '✅ Conforme Lipinski' : '⚠️ Excesso de doadores'}</td>
              </tr>
              <tr>
                <td><strong>Aceptores de H (HBA)</strong></td>
                <td>${propsAntes.hba}</td>
                <td>${propsDepois.hba}</td>
                <td>${deltaHBA >= 0 ? '+' : ''}${deltaHBA}</td>
                <td>${propsDepois.hba <= 10 ? '✅ Conforme Lipinski' : '⚠️ Excesso de aceptores'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  };

  /**
   * Registra o novo derivado no catálogo do Studio e seleciona para projeção 3D
   */
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
  // 7. MODAL DE DOSSIÊ CADD (LIPINSKI, VEBER, GHOSE, PAINS)
  // =========================================================================
  window.abrirModalCADD = function() {
    const modal = document.getElementById('caddModal');
    const body = document.getElementById('caddModalBody');
    const title = document.getElementById('caddModalTitle');
    const sub = document.getElementById('caddModalSubtitle');

    if (!modal || !body) return;
    if (!ultimoDossieCADD) {
      body.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 30px;">Selecione um composto farmacêutico orgânico para visualizar o perfil de drogabilidade in silico.</div>`;
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
            <div class="cadd-param-item ${d.mw > 500 ? 'violated' : ''}">
              <span>Massa Molar (≤ 500 Da):</span>
              <strong>${d.mw.toFixed(2)} Da</strong>
            </div>
            <div class="cadd-param-item ${d.logp > 5.0 ? 'violated' : ''}">
              <span>LogP Crippen (≤ 5.0):</span>
              <strong>${d.logp.toFixed(2)}</strong>
            </div>
            <div class="cadd-param-item ${d.hbd > 5 ? 'violated' : ''}">
              <span>Doadores de H - HBD (≤ 5):</span>
              <strong>${d.hbd}</strong>
            </div>
            <div class="cadd-param-item ${d.hba > 10 ? 'violated' : ''}">
              <span>Aceptores de H - HBA (≤ 10):</span>
              <strong>${d.hba}</strong>
            </div>
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
            <div class="cadd-param-item ${d.rotb > 10 ? 'violated' : ''}">
              <span>Ligações Rotacionáveis (≤ 10):</span>
              <strong>${d.rotb}</strong>
            </div>
            <div class="cadd-param-item ${d.tpsa > 140 ? 'violated' : ''}">
              <span>Área Polar TPSA (≤ 140 Å²):</span>
              <strong>${d.tpsa.toFixed(1)} Å²</strong>
            </div>
            <div class="cadd-param-item">
              <span>Fração Carbonos sp³ (Fsp³):</span>
              <strong>${d.csp3.toFixed(2)}</strong>
            </div>
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
            <div class="cadd-param-item ${d.mw < 160 || d.mw > 480 ? 'violated' : ''}">
              <span>Massa Molar (160 - 480 Da):</span>
              <strong>${d.mw.toFixed(2)} Da</strong>
            </div>
            <div class="cadd-param-item ${d.logp < -0.4 || d.logp > 5.6 ? 'violated' : ''}">
              <span>LogP (-0.4 a 5.6):</span>
              <strong>${d.logp.toFixed(2)}</strong>
            </div>
            <div class="cadd-param-item ${d.mr < 40 || d.mr > 130 ? 'violated' : ''}">
              <span>Refração Molar - MR (40 - 130):</span>
              <strong>${d.mr.toFixed(2)}</strong>
            </div>
            <div class="cadd-param-item ${d.totalAtoms < 20 || d.totalAtoms > 70 ? 'violated' : ''}">
              <span>Total de Átomos (20 - 70):</span>
              <strong>${d.totalAtoms} átomos</strong>
            </div>
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
              ✅ <strong>Nenhum grupo promíscuo detectado:</strong> A estrutura está livre de subestruturas clássicas de interferência em ensaios biológicos (*Pan-Assay Interference Compounds*).
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
  // 8. RESOLUÇÃO DE COORDENADAS 3D COM TRATAMENTO PARA MONOATÔMICOS
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

    // 1. RDKit WASM ETKDG (Conformação local direta - essencial para moléculas derivadas in silico)
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

    // 3. CACTUS NIH por SMILES
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
  // 9. VIEWPORT 3D & TELEMETRIA
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;

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

      studioViewer.setClickable({}, true, function(atom) {
        if (modoMedicaoAtivo) processarCliqueMedicao(atom);
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
      console.warn('[Studio 3Dmol] Erro contido na construção da cena:', errCena);
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
  // 10. CONTROLES E MEDIÇÃO GEOMÉTRICA (Å / °)
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
  // 11. INICIALIZAÇÃO ASSÍNCRONA
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

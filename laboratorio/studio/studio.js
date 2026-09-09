/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js
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

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;

  // =========================================================================
  // 1. INGESTÃO DOS BANCOS DE DADOS
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
  // 2. VIRTUALIZAÇÃO DA LISTA LATERAL
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
      itemEl.innerHTML = `
        <div class="comp-info-main">
          <span class="comp-name" title="${comp.nome}">${comp.nome}</span>
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
  // 3. MOTOR RDKIT WASM (COM DESCRITORES FARMACOCINÉTICOS)
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

  async function avaliarPerfilLipinski(smiles, molarMass) {
    const elLogP = document.getElementById('descLogP');
    const elTPSA = document.getElementById('descTPSA');
    const elHBD_HBA = document.getElementById('descHBD_HBA');
    const elRotB = document.getElementById('descRotB');
    const elBadge = document.getElementById('lipinskiBadge');

    if (!elLogP || !elTPSA || !elHBD_HBA || !elBadge) return;

    if (!smiles || smiles === '--' || smiles.includes('.')) {
      elLogP.textContent = '--';
      elTPSA.textContent = '--';
      elHBD_HBA.textContent = '-- / --';
      elRotB.textContent = '--';
      elBadge.className = 'lipinski-status-badge badge-pending';
      elBadge.textContent = 'Inorgânico / Sal';
      return;
    }

    const rdkit = await carregarRDKitSobDemanda();
    if (!rdkit) {
      elBadge.className = 'lipinski-status-badge badge-pending';
      elBadge.textContent = 'Estimado';
      return;
    }

    try {
      const mol = rdkit.get_mol(smiles);
      if (!mol) return;

      const desc = JSON.parse(mol.get_descriptors());
      mol.delete();

      const mw = (typeof molarMass === 'number' && molarMass > 0) ? molarMass : (desc.exactmw || desc.amw || 0);
      const logp = desc.CrippenClogP !== undefined ? desc.CrippenClogP : (desc.clogp || 0);
      const tpsa = desc.tpsa !== undefined ? desc.tpsa : 0;
      const hbd = desc.lipinskiHBD !== undefined ? desc.lipinskiHBD : (desc.NumHBD || 0);
      const hba = desc.lipinskiHBA !== undefined ? desc.lipinskiHBA : (desc.NumHBA || 0);
      const rotb = desc.NumRotatableBonds !== undefined ? desc.NumRotatableBonds : 0;

      elLogP.textContent = logp.toFixed(2);
      elTPSA.textContent = `${tpsa.toFixed(1)} Å²`;
      elHBD_HBA.textContent = `${hbd} / ${hba}`;
      elRotB.textContent = rotb;

      let violacoes = 0;
      if (mw > 500) violacoes++;
      if (logp > 5.0) violacoes++;
      if (hbd > 5) violacoes++;
      if (hba > 10) violacoes++;

      if (violacoes === 0) {
        elBadge.className = 'lipinski-status-badge badge-approved';
        elBadge.textContent = 'Lipinski: Aprovado (0 viol.)';
      } else if (violacoes === 1) {
        elBadge.className = 'lipinski-status-badge badge-warning';
        elBadge.textContent = 'Lipinski: 1 Violação';
      } else {
        elBadge.className = 'lipinski-status-badge badge-rejected';
        elBadge.textContent = `Lipinski: ${violacoes} Violações`;
      }
    } catch (err) {
      elBadge.className = 'lipinski-status-badge badge-pending';
      elBadge.textContent = 'Indisponível';
    }
  }

  // =========================================================================
  // 4. RESOLUÇÃO DE COORDENADAS 3D COM TRATAMENTO PARA MONOATÔMICOS
  // =========================================================================
  function validarConteudoSDF(sdfText) {
    if (!sdfText || typeof sdfText !== 'string') return false;
    if (sdfText.includes('<!DOCTYPE') || sdfText.includes('<html')) return false;
    return sdfText.includes('$$$$') || sdfText.includes('M  END');
  }

  // Gera um arquivo SDF sintético mínimo para elementos monoatômicos que não possuem conformação na nuvem
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

    // Tratamento para átomos e íons isolados monoatômicos (ex: [Na], [Li], [K])
    if (smiles && smiles.startsWith('[') && smiles.endsWith(']') && smiles.length <= 5) {
      return gerarSDFMonoatomico(smiles);
    }

    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
      if (cache && validarConteudoSDF(cache.sdf)) return cache.sdf;
    }

    // 1. PubChem 3D por SMILES
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

    // 2. CACTUS NIH por SMILES
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

    // 3. RDKit WASM ETKDG (Conformação local)
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

    // 4. PubChem por Query
    if (termoBusca) {
      try {
        exibirStatusRDKit(true, "Consultando PubChem por nome...");
        const query = encodeURIComponent(termoBusca.trim());
        const resN = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF?record_type=3d`);
        if (resN.ok) {
          const sdfText = await resN.text();
          exibirStatusRDKit(false);
          if (validarConteudoSDF(sdfText)) {
            salvarEmCache(smiles, termoBusca, sdfText);
            return sdfText;
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
  // 5. VIEWPORT 3D BLINDADO (ZERO EXCEÇÕES)
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;

    const watermark = document.getElementById('studioWatermark');
    if (watermark) watermark.style.display = 'none';

    const elNome = document.getElementById('studioMolNome');
    const elFormula = document.getElementById('studioMolFormula');
    const elMassa = document.getElementById('studioMolMassa');
    const elSmiles = document.getElementById('studioMolSmiles');
    const btnBench = document.getElementById('btnCarregarNaBancada');

    if (elNome) elNome.textContent = comp.nome;
    if (elFormula) elFormula.textContent = comp.formula;
    if (elMassa) elMassa.textContent = comp.molarMass !== '--' ? `${parseFloat(comp.molarMass).toFixed(2)} g/mol` : '-- g/mol';
    if (elSmiles) {
      elSmiles.textContent = comp.smiles || '--';
      elSmiles.title = comp.smiles || '--';
    }
    if (btnBench) btnBench.style.display = 'inline-flex';

    desenharEstrutura2DStudio(comp.smiles, comp.nome);
    avaliarPerfilLipinski(comp.smiles, parseFloat(comp.molarMass));

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

      // Se o SDF não produziu átomos no modelo, encerra com segurança
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
    // Guarda de integridade: se não houver visualizador ou modelo com átomos, aborta
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
  // 6. CONTROLES E MEDIÇÃO GEOMÉTRICA (Å / °)
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
  // 7. INICIALIZAÇÃO ASSÍNCRONA
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

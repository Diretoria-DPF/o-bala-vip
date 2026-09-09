/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio/studio.js (Motor Corrigido e Otimizado)
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. ESTADO GLOBAL E BARRAMENTO BROADCASTCHANNEL
  // =========================================================================
  const labBroadcast = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('laift_molecular_bus')
    : null;

  let studioViewer = null;
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
  let rdkitCarregando = false;

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;

  // =========================================================================
  // 2. INGESTÃO DOS BANCOS DE DADOS
  // =========================================================================
  function indexarAcervoCompleto() {
    const mapaUnico = new Map();

    // 1. Espécies do laboratório principal (window.LAB_DATABASE)
    if (typeof window.LAB_DATABASE !== 'undefined' && window.LAB_DATABASE.species) {
      Object.entries(window.LAB_DATABASE.species).forEach(([chave, dados]) => {
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

    // 2. Sínteses farmacêuticas (window.BANCO_SINTESES_LAIFT)
    if (typeof window.BANCO_SINTESES_LAIFT !== 'undefined' && Array.isArray(window.BANCO_SINTESES_LAIFT)) {
      window.BANCO_SINTESES_LAIFT.forEach(synth => {
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

    // 3. Catálogo expandido (se injetado globalmente)
    if (typeof window.BANCO_COMPOSTOS_EXPANDIDO !== 'undefined' && Array.isArray(window.BANCO_COMPOSTOS_EXPANDIDO)) {
      window.BANCO_COMPOSTOS_EXPANDIDO.forEach(c => {
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

    compostosIndexados = Array.from(mapaUnico.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    compostosFiltrados = [...compostosIndexados];

    const totalBadge = document.getElementById('studioTotalBadge');
    if (totalBadge) {
      totalBadge.textContent = `${compostosIndexados.length} Compostos Indexados`;
    }

    atualizarContadorFiltrados();
  }

  function classificarCategoria(formula, chave, label) {
    const txt = (chave + ' ' + (label || '')).toLowerCase();
    if (txt.includes('sarin') || txt.includes('vx') || txt.includes('estricnina') || txt.includes('toxina')) return 'toxicos';
    if (txt.includes('agua') || txt.includes('etanol') || txt.includes('metanol') || txt.includes('acetona') || txt.includes('hexano')) return 'solventes';
    if (txt.includes('acido') || txt.includes('hidroxido') || txt.includes('cloreto') || txt.includes('sulfato')) return 'reagentes';
    return 'farmacos';
  }

  function atualizarContadorFiltrados() {
    const el = document.getElementById('studioFilteredCount');
    if (el) el.textContent = `${compostosFiltrados.length} compostos visíveis`;
  }

  // =========================================================================
  // 3. VIRTUALIZAÇÃO DA LISTA
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
    }, 150);
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
  // 4. MOTOR RDKIT WASM & FARMACOCINÉTICA (LIPINSKI)
  // =========================================================================
  async function carregarRDKitSobDemanda() {
    if (RDKitModuleInstance) return RDKitModuleInstance;
    if (rdkitCarregando) {
      return new Promise(resolve => {
        const check = setInterval(() => {
          if (RDKitModuleInstance) { clearInterval(check); resolve(RDKitModuleInstance); }
        }, 100);
      });
    }

    rdkitCarregando = true;
    exibirStatusRDKit(true, "Inicializando RDKit WebAssembly...");

    try {
      if (typeof window.initRDKitModule === 'function') {
        RDKitModuleInstance = await window.initRDKitModule();
        console.log("✅ [RDKit WASM] Pronto.");
      }
      exibirStatusRDKit(false);
      return RDKitModuleInstance;
    } catch (err) {
      console.warn("⚠️ [RDKit WASM] Indisponível, usando rede:", err);
      exibirStatusRDKit(false);
      rdkitCarregando = false;
      return null;
    }
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
      elBadge.textContent = 'Sem RDKit';
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
        elBadge.textContent = 'Lipinski: Aprovado';
      } else if (violacoes === 1) {
        elBadge.className = 'lipinski-status-badge badge-warning';
        elBadge.textContent = 'Lipinski: 1 Violação';
      } else {
        elBadge.className = 'lipinski-status-badge badge-rejected';
        elBadge.textContent = `Lipinski: ${violacoes} Violações`;
      }
    } catch (err) {
      elBadge.className = 'lipinski-status-badge badge-pending';
      elBadge.textContent = 'Erro de Leitura';
    }
  }

  // =========================================================================
  // 5. RESOLUÇÃO DE COORDENADAS E RENDERIZAÇÃO
  // =========================================================================
  async function resolverCoordenadas3D(smiles, termoBusca) {
    if (!smiles && !termoBusca) return null;

    // 1. IndexedDB Cache
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
      if (cache && cache.sdf) return cache.sdf;
    }

    // 2. PubChem REST 3D Direto (Rápido e Preciso)
    try {
      exibirStatusRDKit(true, "Buscando conformação 3D (PubChem)...");
      const query = encodeURIComponent((termoBusca || smiles).trim());
      const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF?record_type=3d`);
      if (res.ok) {
        const sdfText = await res.text();
        exibirStatusRDKit(false);
        if (sdfText && sdfText.includes("$$$$")) {
          if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarCompostoLocal === 'function') {
            LabStorageEngine.salvarCompostoLocal(smiles || termoBusca, { sdf: sdfText, nome: termoBusca });
          }
          return sdfText;
        }
      }
    } catch (e) {}

    // 3. Fallback: RDKit ETKDG Local
    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, "Gerando 3D local (ETKDG)...");
          const mol = rdkit.get_mol(smiles);
          if (mol) {
            mol.add_hs();
            if (mol.embed_mol() >= 0) {
              const sdfGerado = mol.to_sdf();
              mol.delete();
              exibirStatusRDKit(false);
              if (sdfGerado && sdfGerado.includes("$$$$")) {
                if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarCompostoLocal === 'function') {
                  LabStorageEngine.salvarCompostoLocal(smiles, { sdf: sdfGerado, nome: termoBusca });
                }
                return sdfGerado;
              }
            } else {
              mol.delete();
            }
          }
        } catch (e) {}
        exibirStatusRDKit(false);
      }
    }

    // 4. Fallback: CACTUS NIH
    if (smiles && smiles !== '--') {
      try {
        exibirStatusRDKit(true, "Consultando CACTUS NIH...");
        const resC = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/file?format=sdf`);
        if (resC.ok) {
          const txtC = await resC.text();
          exibirStatusRDKit(false);
          if (txtC && txtC.includes("$$$$")) return txtC;
        }
      } catch (e) {}
    }

    exibirStatusRDKit(false);
    return null;
  }

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

    // Renderiza 2D de forma síncrona imediata
    desenharEstrutura2DStudio(comp.smiles, comp.nome);
    avaliarPerfilLipinski(comp.smiles, parseFloat(comp.molarMass));

    // Carrega modelo 3D
    const sdf = await resolverCoordenadas3D(comp.smiles, comp.pubchemQuery || comp.nome);
    sdfCacheLocal = sdf;

    if (sdf) {
      construirCena3D(sdf);
    } else {
      const container3D = document.getElementById('studioViewer3D');
      if (container3D) {
        container3D.innerHTML = `
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center; max-width: 80%;">
            ⚠️ Coordenadas 3D indisponíveis nos repositórios para <strong>${comp.nome}</strong>.<br>
            A projeção plana continua disponível no botão "2D Vetorial".
          </div>
        `;
      }
    }
  }

  function construirCena3D(sdfText) {
    const container = document.getElementById('studioViewer3D');
    if (!container || !window.$3Dmol) return;

    container.innerHTML = '';
    studioViewer = $3Dmol.createViewer(container, { backgroundColor: '#020617' });
    studioViewer.addModel(sdfText, 'sdf');

    aplicarEstiloVisual(modeloAtual);

    studioViewer.setClickable({}, true, function(atom) {
      if (modoMedicaoAtivo) processarCliqueMedicao(atom);
    });

    studioViewer.zoomTo();
    studioViewer.render();
    studioViewer.resize();

    if (autoRotacaoAtiva) {
      studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
    }
  }

  function aplicarEstiloVisual(tipo) {
    if (!studioViewer) return;
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
  // 6. CONTROLES DE MODELO E MEDIÇÃO GEOMÉTRICA
  // =========================================================================
  window.setModelo3D = function(modo) {
    modeloAtual = modo;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(btn => btn.classList.remove('active'));
    const botoes = { ballstick: 'btnModoBallStick', cpk: 'btnModoCPK', wireframe: 'btnModoWire', surface: 'btnModoSurface' };
    const target = document.getElementById(botoes[modo]);
    if (target) target.classList.add('active');
    if (sdfCacheLocal && modoExibicaoAtual === '3D') aplicarEstiloVisual(modo);
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
        if (studioViewer) { studioViewer.resize(); studioViewer.render(); }
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
    if (!studioViewer || !atom) return;
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
    if (sdfCacheLocal && studioViewer) construirCena3D(sdfCacheLocal);
  };

  window.toggleAutoRotacao3D = function() {
    autoRotacaoAtiva = !autoRotacaoAtiva;
    const btn = document.getElementById('btnAutoRotate');
    if (btn) btn.classList.toggle('active', autoRotacaoAtiva);
    if (studioViewer) {
      if (autoRotacaoAtiva) studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
      else studioViewer.stopAnimate();
    }
  };

  window.resetarCamera3D = function() {
    if (studioViewer) {
      studioViewer.zoomTo();
      studioViewer.render();
      studioViewer.resize();
    }
  };

  // =========================================================================
  // 7. EXPORTAÇÃO
  // =========================================================================
  window.exportarImagemPNG = function() {
    const nomeBase = (compostoSelecionado?.nome || 'molecula').replace(/\s+/g, '_');
    if (modoExibicaoAtual === '3D' && studioViewer) {
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
      alert("Aguarde o carregamento do modelo 3D antes de exportar o arquivo SDF.");
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

  // =========================================================================
  // 8. SINCRONIZAÇÃO E TRANSFERÊNCIA
  // =========================================================================
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
  // 9. INICIALIZAÇÃO ROBUSTA (PROTEÇÃO CONTRA DOMContentLoaded RACE)
  // =========================================================================
  function initStudio() {
    indexarAcervoCompleto();
    renderizarListaCompostos(true);

    if (compostosIndexados.length > 0) {
      const primeiro = document.querySelector('.compound-item');
      selecionarCompostoStudio(compostosIndexados[0], primeiro);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudio);
  } else {
    // Se o DOM já estiver pronto, inicializa imediatamente
    initStudio();
  }

})();

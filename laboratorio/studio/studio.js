/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO & MODELAGEM MOLECULAR 3D
 * Arquivo: studio.js
 * 
 * Funcionalidades:
 * 1. Ingestão e virtualização de 2.500+ compostos químicos (Zero Lag/60 FPS).
 * 2. Pipeline quimioinformático: Cache IndexedDB -> RDKit.js WASM -> PubChem 3D -> CACTUS NIH.
 * 3. Renderização WebGL Multimodelo (Ball & Stick, CPK, Wireframe e Superfície SAS).
 * 4. Inspeção Geométrica Interativa: Cálculo euclidiano de distâncias (Å) e ângulos planares (°).
 * 5. Visualização Híbrida 2D Vetorial (SmilesDrawer) e 3D.
 * 6. Exportação para relatórios em PNG (alta resolução) e arquivo estrutural SDF.
 * 7. Sincronização bidirecional com a bancada do laboratório via LocalStorage e PostMessage.
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. ESTADO GLOBAL DO ESTÚDIO
  // =========================================================================
  let studioViewer = null;
  let compostosIndexados = [];
  let compostosFiltrados = [];
  let compostoSelecionado = null;

  let modoExibicaoAtual = '3D'; // '2D' | '3D'
  let modeloAtual = 'ballstick'; // 'ballstick' | 'cpk' | 'wireframe' | 'surface'
  let autoRotacaoAtiva = false;
  let modoMedicaoAtivo = false;
  let atomosSelecionadosParaMedicao = [];
  let sdfCacheLocal = null;

  // Motor WebAssembly RDKit.js
  let RDKitModuleInstance = null;
  let rdkitCarregando = false;

  // Paginação Virtual da Lista
  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;
  let debounceBuscaTimer = null;

  // =========================================================================
  // 2. INGESTÃO E CLASSIFICAÇÃO DOS COMPOSTOS
  // =========================================================================
  function indexarAcervoCompleto() {
    const mapaUnico = new Map();

    // 1. Base Primária da Bancada (LAB_DATABASE)
    if (typeof LAB_DATABASE !== 'undefined' && LAB_DATABASE.species) {
      Object.entries(LAB_DATABASE.species).forEach(([chave, dados]) => {
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

    // 2. Base de Sínteses e Fármacos Estruturados
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

    // 3. Catálogo Químico Expandido (caso disponível no ambiente)
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
      totalBadge.textContent = `${compostosIndexados.length} Compostos Prontos`;
    }

    atualizarContadorFiltrados();
  }

  function classificarCategoria(formula, chave, label) {
    const txt = (chave + ' ' + (label || '')).toLowerCase();
    if (txt.includes('sarin') || txt.includes('vx') || txt.includes('estricnina') || txt.includes('toxina') || txt.includes('mostarda')) return 'toxicos';
    if (txt.includes('agua') || txt.includes('etanol') || txt.includes('metanol') || txt.includes('acetona') || txt.includes('hexano') || txt.includes('dmso') || txt.includes('thf')) return 'solventes';
    if (txt.includes('acido') || txt.includes('hidroxido') || txt.includes('cloreto') || txt.includes('sulfato') || txt.includes('nitrato')) return 'reagentes';
    return 'farmacos';
  }

  function atualizarContadorFiltrados() {
    const el = document.getElementById('studioFilteredCount');
    if (el) {
      el.textContent = `${compostosFiltrados.length} compostos visíveis`;
    }
  }

  // =========================================================================
  // 3. VIRTUALIZAÇÃO DA LISTA DE COMPOSTOS (RENDERIZAÇÃO EM CHUNKS)
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
      listContainer.innerHTML = `
        <div style="padding: 24px; color: #64748b; text-align: center; font-size: 0.75rem;">
          Nenhum composto localizado com os critérios informados.
        </div>
      `;
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
    
    // Dispara a carga do próximo bloco antes de atingir o rodapé
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
  // 4. MOTOR QUIMIOINFORMÁTICO & RDKIT WEBASSEMBLY
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
        console.log("✅ [RDKit.js] Módulo WASM carregado com sucesso.");
      } else {
        throw new Error("initRDKitModule não está disponível no escopo.");
      }
      exibirStatusRDKit(false);
      return RDKitModuleInstance;
    } catch (err) {
      console.warn("⚠️ [RDKit.js] Falha ao iniciar WASM. Ativando fallbacks de rede:", err);
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

  /**
   * Pipeline Quimiométrico 4 Níveis:
   * IndexedDB -> RDKit (ETKDG local) -> PubChem 3D -> CACTUS NIH
   */
  async function resolverCoordenadas3D(smiles, termoBusca) {
    if (!smiles && !termoBusca) return null;

    // Nível 1: Cache Local no IndexedDB
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cache = await LabStorageEngine.obterCompostoLocal(smiles || termoBusca);
      if (cache && cache.sdf) return cache.sdf;
    }

    // Nível 2: Computação In-Browser via RDKit.js (ETKDG)
    if (smiles && smiles !== '--' && !smiles.includes('.')) {
      const rdkit = await carregarRDKitSobDemanda();
      if (rdkit) {
        try {
          exibirStatusRDKit(true, "Calculando geometria 3D (ETKDG)...");
          const mol = rdkit.get_mol(smiles);
          if (mol) {
            mol.add_hs();
            const embedStatus = mol.embed_mol();
            if (embedStatus >= 0) {
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
        } catch (e) {
          console.warn("[RDKit Engine] Falha na conformação 3D:", e);
        }
        exibirStatusRDKit(false);
      }
    }

    // Nível 3: PubChem PUG-REST 3D por Nome
    try {
      exibirStatusRDKit(true, "Consultando PubChem PUG-REST 3D...");
      const query = encodeURIComponent((termoBusca || smiles).trim());
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF?record_type=3d`;
      const res = await fetch(url);
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

    // Nível 4: CACTUS (NIH) por SMILES
    if (smiles && smiles !== '--') {
      try {
        exibirStatusRDKit(true, "Consultando CACTUS NIH...");
        const urlCactus = `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/file?format=sdf`;
        const resC = await fetch(urlCactus);
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

  // =========================================================================
  // 5. VIEWPORT TRIDIMENSIONAL (3DMOL.JS) & RENDERIZAÇÃO 2D
  // =========================================================================
  async function carregarEstruturaNoStudio(comp) {
    if (!comp) return;

    const watermark = document.getElementById('studioWatermark');
    if (watermark) watermark.style.display = 'none';

    // Atualiza Telemetria no Rodapé
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

    // Renderiza a projeção 2D
    desenharEstrutura2DStudio(comp.smiles, comp.nome);

    // Resolve as coordenadas 3D no pipeline quimiométrico
    const sdf = await resolverCoordenadas3D(comp.smiles, comp.pubchemQuery || comp.nome);
    sdfCacheLocal = sdf;

    if (sdf) {
      construirCena3D(sdf);
    } else {
      const container3D = document.getElementById('studioViewer3D');
      if (container3D) {
        container3D.innerHTML = `
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center; max-width: 80%;">
            ⚠️ Não foi possível obter ou calcular coordenadas 3D para <strong>${comp.nome}</strong>.<br>
            A projeção plana 2D continua disponível no modo "2D Vetorial".
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
      if (modoMedicaoAtivo) {
        processarCliqueMedicao(atom);
      }
    });

    studioViewer.zoomTo();
    studioViewer.render();

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
  // 6. CONTROLE DE MODOS, ROTAÇÃO E MEDIÇÃO GEOMÉTRICA (ÅNGSTRÖMS E ÂNGULOS)
  // =========================================================================
  window.setModelo3D = function(modo) {
    modeloAtual = modo;
    document.querySelectorAll('#group3DStyles .tool-btn').forEach(btn => btn.classList.remove('active'));

    const botoes = {
      ballstick: 'btnModoBallStick',
      cpk: 'btnModoCPK',
      wireframe: 'btnModoWire',
      surface: 'btnModoSurface'
    };

    const targetBtn = document.getElementById(botoes[modo]);
    if (targetBtn) targetBtn.classList.add('active');

    if (sdfCacheLocal && modoExibicaoAtual === '3D') {
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
        if (studioViewer) {
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

    if (!modoMedicaoAtivo) {
      limparMedicoes3D();
    }
  };

  function processarCliqueMedicao(atom) {
    if (!studioViewer || !atom) return;

    atomosSelecionadosParaMedicao.push(atom);
    studioViewer.addSphere({ center: { x: atom.x, y: atom.y, z: atom.z }, radius: 0.35, color: '#e11d48' });

    const hudLabel = document.getElementById('studioLastMeasurement');

    if (atomosSelecionadosParaMedicao.length === 2) {
      const a1 = atomosSelecionadosParaMedicao[0];
      const a2 = atomosSelecionadosParaMedicao[1];

      // Distância Euclidiana em R³: d = √((x2-x1)² + (y2-y1)² + (z2-z1)²)
      const dx = a2.x - a1.x;
      const dy = a2.y - a1.y;
      const dz = a2.z - a1.z;
      const distancia = Math.sqrt(dx * dx + dy * dy + dz * dz);

      studioViewer.addLine({
        start: { x: a1.x, y: a1.y, z: a1.z },
        end: { x: a2.x, y: a2.y, z: a2.z },
        color: '#fb7185',
        dashed: true
      });

      studioViewer.addLabel(`${distancia.toFixed(3)} Å`, {
        position: { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 },
        backgroundColor: '#020617',
        fontColor: '#38bdf8',
        fontSize: 12
      });

      if (hudLabel) {
        hudLabel.textContent = `Distância (${a1.elem}-${a2.elem}): ${distancia.toFixed(3)} Ångströms`;
      }
      studioViewer.render();

    } else if (atomosSelecionadosParaMedicao.length === 3) {
      const a1 = atomosSelecionadosParaMedicao[0];
      const a2 = atomosSelecionadosParaMedicao[1]; // Vértice
      const a3 = atomosSelecionadosParaMedicao[2];

      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };

      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const magU = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
      const magV = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

      const anguloRad = Math.acos(Math.max(-1, Math.min(1, dot / (magU * magV))));
      const anguloGraus = (anguloRad * 180) / Math.PI;

      studioViewer.addLabel(`Ângulo: ${anguloGraus.toFixed(1)}°`, {
        position: { x: a2.x, y: a2.y + 0.35, z: a2.z },
        backgroundColor: '#020617',
        fontColor: '#facc15',
        fontSize: 12
      });

      if (hudLabel) {
        hudLabel.textContent = `Ângulo (${a1.elem}-${a2.elem}-${a3.elem}): ${anguloGraus.toFixed(1)}°`;
      }

      studioViewer.render();
      atomosSelecionadosParaMedicao = [];
    }
  }

  window.limparMedicoes3D = function() {
    atomosSelecionadosParaMedicao = [];
    const hudLabel = document.getElementById('studioLastMeasurement');
    if (hudLabel) hudLabel.textContent = 'Medições redefinidas.';
    if (sdfCacheLocal && studioViewer) {
      construirCena3D(sdfCacheLocal);
    }
  };

  window.toggleAutoRotacao3D = function() {
    autoRotacaoAtiva = !autoRotacaoAtiva;
    const btn = document.getElementById('btnAutoRotate');
    if (btn) btn.classList.toggle('active', autoRotacaoAtiva);

    if (studioViewer) {
      if (autoRotacaoAtiva) {
        studioViewer.animate({ loop: 'backAndForth', step: 0.35 });
      } else {
        studioViewer.stopAnimate();
      }
    }
  };

  window.resetarCamera3D = function() {
    if (studioViewer) {
      studioViewer.zoomTo();
      studioViewer.render();
    }
  };

  // =========================================================================
  // 7. EXPORTAÇÃO CIENTÍFICA (PNG ALTA DEFINIÇÃO & ARQUIVO SDF 3D)
  // =========================================================================
  window.exportarImagemPNG = function() {
    const nomeBase = (compostoSelecionado?.nome || 'molecula').replace(/\s+/g, '_');

    if (modoExibicaoAtual === '3D' && studioViewer) {
      const dataUrl = studioViewer.pngURI();
      const link = document.createElement('a');
      link.download = `${nomeBase}_3D_LAIFT.png`;
      link.href = dataUrl;
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
      alert("Aguarde a resolução da conformação tridimensional antes de exportar.");
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
  // 8. COMUNICAÇÃO BIDIRECIONAL COM A BANCADA & GANCHO DE EDIÇÃO
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
      timestamp: Date.now()
    };

    // 1. Sincronização via localStorage (se aberto em aba externa)
    localStorage.setItem('laift_composto_transferido', JSON.stringify(payload));

    // 2. Sincronização via postMessage (se aberto em modal iframe)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ acao: 'carregarCompostoNaBancada', composto: payload }, '*');
    }

    // Retorno ao laboratório
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '../index.html';
    }
  };

  /**
   * Gancho para Futuras Edições Moleculares (In Silico Drug Design)
   */
  window.onMoleculeEdited = function(novoSmiles, novoNome = "Composto Modificado") {
    console.log(`🧬 [In Silico Design] Nova entidade química: ${novoSmiles}`);
    const novoComposto = {
      id: 'custom_' + Date.now(),
      chaveOriginal: 'custom_' + Date.now(),
      nome: novoNome,
      formula: 'Derivado In Silico',
      molarMass: '--',
      smiles: novoSmiles,
      categoria: 'farmacos',
      pubchemQuery: novoNome
    };

    compostosIndexados.unshift(novoComposto);
    compostosFiltrados.unshift(novoComposto);
    renderizarListaCompostos(true);
    selecionarCompostoStudio(novoComposto);
  };

  // =========================================================================
  // 9. INICIALIZAÇÃO SEQUENCIAL
  // =========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    indexarAcervoCompleto();
    renderizarListaCompostos(true);

    // Carrega o primeiro composto por padrão
    if (compostosIndexados.length > 0) {
      selecionarCompostoStudio(compostosIndexados[0]);
    }
  });

})();

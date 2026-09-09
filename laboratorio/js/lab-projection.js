/**
 * LAIFT — ESTÚDIO DE PROJEÇÃO MOLECULAR 3D MULTIMODELO
 * Virtualizador de 2.500+ compostos, cálculo de ângulos planares e distâncias atômicas.
 */

(function() {
  'use strict';

  let studioViewer = null;
  let compostosIndexados = [];
  let compostosFiltrados = [];
  let compostoSelecionado = null;
  let modeloAtual = 'ballstick'; // 'ballstick' | 'cpk' | 'wireframe' | 'surface'
  let autoRotacaoAtiva = false;
  let modoMedicaoAtivo = false;
  let atomosSelecionadosParaMedicao = [];
  let sdfCacheLocal = null;

  const ITEMS_PER_CHUNK = 40;
  let currentRenderedIndex = 0;

  // =========================================================================
  // 1. INGESTÃO E INDEXAÇÃO UNIFICADA DOS 2.500+ COMPOSTOS
  // =========================================================================
  function indexarAcervoCompleto() {
    const mapaUnico = new Map();

    // Ingestão 1: LAB_DATABASE.species
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

    // Ingestão 2: BANCO_SINTESES_LAIFT
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

    // Ingestão 3: Dicionários Externos ou Expansão Global (window.BANCO_COMPOSTOS_EXPANDIDO)
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
  }

  function classificarCategoria(formula, chave, label) {
    const txt = (chave + ' ' + (label || '')).toLowerCase();
    if (txt.includes('acido') || txt.includes('hidroxido') || txt.includes('cloreto') || txt.includes('sulfato')) return 'reagentes';
    if (txt.includes('agua') || txt.includes('etanol') || txt.includes('metanol') || txt.includes('acetona') || txt.includes('hexano')) return 'solventes';
    if (txt.includes('sarin') || txt.includes('vx') || txt.includes('estricnina') || txt.includes('toxina')) return 'toxicos';
    return 'farmacos';
  }

  // =========================================================================
  // 2. VIRTUALIZAÇÃO DA LISTA DE COMPOSTOS (SEM TRAVAMENTO DE DOM)
  // =========================================================================
  function renderizarListaCompostos(reset = true) {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;

    if (reset) {
      listContainer.innerHTML = '';
      currentRenderedIndex = 0;
    }

    const proximaFatia = compostosFiltrados.slice(currentRenderedIndex, currentRenderedIndex + ITEMS_PER_CHUNK);
    if (proximaFatia.length === 0 && reset) {
      listContainer.innerHTML = '<div style="padding: 16px; color: #64748b; text-align: center;">Nenhum composto localizado.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    proximaFatia.forEach(comp => {
      const itemEl = document.createElement('div');
      itemEl.className = 'compound-item' + (compostoSelecionado?.id === comp.id ? ' selected' : '');
      itemEl.onclick = () => selecionarCompostoStudio(comp, itemEl);

      itemEl.innerHTML = `
        <div class="comp-info-main">
          <span class="comp-name" title="${comp.nome}">${comp.nome}</span>
          <span class="comp-formula">${comp.formula}</span>
        </div>
        <span class="comp-badge-mass">${comp.molarMass !== '--' ? parseFloat(comp.molarMass).toFixed(1) : '--'}</span>
      `;
      fragment.appendChild(itemEl);
    });

    listContainer.appendChild(fragment);
    currentRenderedIndex += proximaFatia.length;
  }

  window.handleStudioScroll = function() {
    const listContainer = document.getElementById('studioCompoundList');
    if (!listContainer) return;
    if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 60) {
      if (currentRenderedIndex < compostosFiltrados.length) {
        renderizarListaCompostos(false);
      }
    }
  };

  let debounceBusca = null;
  window.filtrarCompostosStudio = function(termo) {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => {
      const q = (termo || '').trim().toLowerCase();
      compostosFiltrados = compostosIndexados.filter(c => {
        return c.nome.toLowerCase().includes(q) ||
               c.formula.toLowerCase().includes(q) ||
               c.smiles.toLowerCase().includes(q);
      });
      renderizarListaCompostos(true);
    }, 150);
  };

  window.filtrarCategoriaStudio = function(cat) {
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    if (cat === 'todas') {
      compostosFiltrados = [...compostosIndexados];
    } else {
      compostosFiltrados = compostosIndexados.filter(c => c.categoria === cat);
    }
    renderizarListaCompostos(true);
  };

  // =========================================================================
  // 3. MOTOR TRIDIMENSIONAL (3DMOL.JS MULTIMODELO)
  // =========================================================================
  async function carregarModelo3D(termo, smiles) {
    const container = document.getElementById('studioViewer3D');
    const watermark = document.getElementById('studioWatermark');
    if (!container || !window.$3Dmol) return;

    if (watermark) watermark.style.display = 'none';

    let sdf = null;
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterCompostoLocal === 'function') {
      const cached = await LabStorageEngine.obterCompostoLocal(termo);
      if (cached && cached.sdf) sdf = cached.sdf;
    }

    if (!sdf) {
      try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termo)}/SDF?record_type=3d`;
        const res = await fetch(url);
        if (res.ok) {
          const txt = await res.text();
          if (txt && txt.includes('$$$$')) {
            sdf = txt;
            if (typeof LabStorageEngine !== 'undefined') {
              LabStorageEngine.salvarCompostoLocal(termo, { sdf: sdf });
            }
          }
        }
      } catch (e) {
        console.warn('[Studio 3D] Falha ao baixar SDF da PubChem:', e);
      }
    }

    if (!sdf) {
      // Fallback: Solicita conformação 3D por SMILES via CACTUS NIH
      try {
        const urlCactus = `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles || termo)}/file?format=sdf`;
        const resC = await fetch(urlCactus);
        if (resC.ok) {
          const txtC = await resC.text();
          if (txtC && txtC.includes('$$$$')) sdf = txtC;
        }
      } catch (errCactus) {}
    }

    if (!sdf) {
      container.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #f87171; font-size: 0.8rem; text-align: center;">
          ⚠️ Coordenadas 3D não disponíveis nos repositórios globais para <strong>${termo}</strong>.
        </div>
      `;
      return;
    }

    sdfCacheLocal = sdf;
    construirCena3D(sdf);
  }

  function construirCena3D(sdfText) {
    const container = document.getElementById('studioViewer3D');
    if (!container) return;

    container.innerHTML = '';
    studioViewer = $3Dmol.createViewer(container, { backgroundColor: '#020617' });
    studioViewer.addModel(sdfText, 'sdf');

    aplicarEstiloVisual(modeloAtual);

    studioViewer.setClickable({}, true, function(atom, viewer, event, container) {
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

  window.setModelo3D = function(modo) {
    modeloAtual = modo;
    document.querySelectorAll('.tool-btn').forEach(btn => {
      if (['btnModoBallStick', 'btnModoCPK', 'btnModoWire', 'btnModoSurface'].includes(btn.id)) {
        btn.classList.remove('active');
      }
    });

    const mapaBotoes = {
      ballstick: 'btnModoBallStick',
      cpk: 'btnModoCPK',
      wireframe: 'btnModoWire',
      surface: 'btnModoSurface'
    };

    const activeBtn = document.getElementById(mapaBotoes[modo]);
    if (activeBtn) activeBtn.classList.add('active');

    if (sdfCacheLocal) {
      aplicarEstiloVisual(modo);
    }
  };

  // =========================================================================
  // 4. MODO DE MEDIÇÃO ATIVA (DISTÂNCIA EUCLIDIANA E ÂNGULO PLANAR)
  // =========================================================================
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

      // Distância Euclidiana em 3D: d = sqrt((x2 - x1)^2 + (y2 - y1)^2 + (z2 - z1)^2)
      const dx = a2.x - a1.x;
      const dy = a2.y - a1.y;
      const dz = a2.z - a1.z;
      const distancia = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const midX = (a1.x + a2.x) / 2;
      const midY = (a1.y + a2.y) / 2;
      const midZ = (a1.z + a2.z) / 2;

      studioViewer.addLine({
        start: { x: a1.x, y: a1.y, z: a1.z },
        end: { x: a2.x, y: a2.y, z: a2.z },
        color: '#fb7185',
        dashed: true
      });

      studioViewer.addLabel(`${distancia.toFixed(3)} Å`, {
        position: { x: midX, y: midY, z: midZ },
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
      const a2 = atomosSelecionadosParaMedicao[1]; // Vértice do ângulo
      const a3 = atomosSelecionadosParaMedicao[2];

      // Vetor u = a1 - a2; Vetor v = a3 - a2
      const u = { x: a1.x - a2.x, y: a1.y - a2.y, z: a1.z - a2.z };
      const v = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };

      const dot = u.x * v.x + u.y * v.y + u.z * v.z;
      const magU = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
      const magV = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

      const anguloRad = Math.acos(Math.max(-1, Math.min(1, dot / (magU * magV))));
      const anguloGraus = (anguloRad * 180) / Math.PI;

      studioViewer.addLabel(`Ângulo: ${anguloGraus.toFixed(1)}°`, {
        position: { x: a2.x, y: a2.y + 0.3, z: a2.z },
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

  // =========================================================================
  // 5. CONTROLES GERAIS DO ESTÚDIO
  // =========================================================================
  window.selecionarCompostoStudio = function(comp, el) {
    compostoSelecionado = comp;
    document.querySelectorAll('.compound-item').forEach(i => i.classList.remove('selected'));
    if (el) el.classList.add('selected');

    const elNome = document.getElementById('studioMolNome');
    const elFormula = document.getElementById('studioMolFormula');
    const elMassa = document.getElementById('studioMolMassa');
    const btnBench = document.getElementById('btnCarregarNaBancada');

    if (elNome) elNome.textContent = comp.nome;
    if (elFormula) elFormula.textContent = comp.formula;
    if (elMassa) elMassa.textContent = `${comp.molarMass} g/mol`;
    if (btnBench) btnBench.style.display = 'block';

    carregarModelo3D(comp.pubchemQuery || comp.nome, comp.smiles);
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

  window.carregarCompostoDoStudioNaBancada = function() {
    if (!compostoSelecionado) return;
    
    // Alinha a seleção com o catálogo do painel de bancada
    const radio = document.querySelector(`input[name="reagenteSel"][value="${compostoSelecionado.chaveOriginal}"]`);
    if (radio) {
      radio.checked = true;
      if (typeof window.atualizarInspecaoMolecular === 'function') {
        window.atualizarInspecaoMolecular(compostoSelecionado.chaveOriginal);
      }
    }

    fecharStudioProjecao();
  };

  window.abrirStudioProjecao = function() {
    const modal = document.getElementById('studioProjecaoModal');
    if (!modal) return;

    modal.style.display = 'flex';
    indexarAcervoCompleto();
    renderizarListaCompostos(true);

    if (!compostoSelecionado && compostosIndexados.length > 0) {
      selecionarCompostoStudio(compostosIndexados[0]);
    }
  };

  window.fecharStudioProjecao = function() {
    const modal = document.getElementById('studioProjecaoModal');
    if (modal) modal.style.display = 'none';
    if (studioViewer) studioViewer.stopAnimate();
  };

  document.addEventListener('DOMContentLoaded', () => {
    indexarAcervoCompleto();
  });
})();

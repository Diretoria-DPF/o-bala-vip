/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/app.js                                            */
/* ========================================================================= */

/**
 * CONTROLADOR MESTRE DE INTERFACE, ÁRVORE ANATÔMICA & VIAS FARMACOLÓGICAS
 * Ecossistema LAIFT - Módulo Master 3D / Bio-Twin
 * - Orquestração de abas SPA com suporte a gestos Swipe protegidos
 * - Geração e sincronização da Árvore Anatômica (Visibilidade e Opacidade 0-100%)
 * - Gerenciamento dinâmico do Seletor das 7 Vias de Administração Farmacológica
 * - Sincronização de zoom biológico (Macro ➔ Meso ➔ Nano com ThreeEngine / MolEngine)
 * - Integração dos controles de dissecção tecidual em 5 camadas
 */

const AppController = (() => {
  // Mapeamento de Telas Gerenciadas
  const tabs = ["view-anatomy", "view-biohacking", "view-acervo"];
  let currentTabIndex = 0;

  // Estado da Navegação Gestual (Touch / Swipe)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isTouchInside3D = false;
  const SWIPE_THRESHOLD_PX = 55;

  // Estado Local das Vias e da Árvore
  let selectedRouteId = "ORAL";
  let activeSystemId = "digestorio";

  // =========================================================================
  // 1. GESTÃO DE ABAS & TRANSIÇÕES SPA
  // =========================================================================
  /**
   * Alterna a visualização ativa entre Anatomia, Biohacking e Acervo
   * @param {String} targetId - ID da seção de destino
   * @param {Boolean} force - Forçar recálculo mesmo se já estiver ativa
   */
  function switchTab(targetId, force = false) {
    const targetIndex = tabs.indexOf(targetId);
    if (targetIndex === -1) return;
    if (!force && targetIndex === currentTabIndex) return;

    // Atualiza classes dos painéis principais
    tabs.forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) {
        if (id === targetId) {
          panel.classList.remove("hidden");
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
          panel.classList.add("hidden");
        }
      }
    });

    // Atualiza botões da barra de navegação inferior
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });

    currentTabIndex = targetIndex;

    // Resposta tátil em dispositivos móveis compatíveis
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }

    handleTabLifecycle(targetId);
  }

  function handleTabLifecycle(tabId) {
    if (tabId === "view-anatomy") {
      if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.onWindowResize === "function") {
        setTimeout(() => {
          ThreeEngine.onWindowResize();
        }, 60);
      }
    } else if (tabId === "view-biohacking") {
      if (typeof BiohackingController !== "undefined" && typeof BiohackingController.renderAllProtocols === "function") {
        BiohackingController.renderAllProtocols();
      }
    } else if (tabId === "view-acervo") {
      if (typeof ApiCache !== "undefined" && typeof ApiCache.renderizarHistoricoLocal === "function") {
        ApiCache.renderizarHistoricoLocal();
      }
    }
  }

  // =========================================================================
  // 2. DETECÇÃO DE GESTOS SWIPE COM BLINDAGEM DE ROTAÇÃO 3D
  // =========================================================================
  function handleGesture() {
    // Se o toque iniciou sobre a viewport WebGL do Three.js ou do 3Dmol,
    // o swipe é abortado para não interromper a rotação/dissecção anatômica
    if (isTouchInside3D) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
        if (deltaX > 0) {
          // Deslize para a direita: Retrocede
          if (currentTabIndex > 0) {
            switchTab(tabs[currentTabIndex - 1]);
          }
        } else {
          // Deslize para a esquerda: Avança
          if (currentTabIndex < tabs.length - 1) {
            switchTab(tabs[currentTabIndex + 1]);
          }
        }
      }
    }
  }

  // =========================================================================
  // 3. GERAÇÃO E CONTROLE DA ÁRVORE ANATÔMICA (ÓRGÃOS & OPACIDADE)
  // =========================================================================
  function renderOrganTree(systemId) {
    const container = document.getElementById("organTreeContainer");
    if (!container) return;

    if (typeof ATLAS_DATABASE === "undefined" || !Array.isArray(ATLAS_DATABASE.sistemas)) {
      container.innerHTML = '<div style="font-size:0.75rem; color:#64748b;">Base de dados anatômica indisponível.</div>';
      return;
    }

    const sys = ATLAS_DATABASE.sistemas.find((s) => s.id === (systemId || activeSystemId));
    if (!sys) return;

    activeSystemId = sys.id;

    let treeHtml = `
      <div class="tree-system-card">
        <div class="tree-system-header">
          <strong style="color:${sys.cor || '#38bdf8'}; font-size:0.84rem; display:flex; align-items:center; gap:6px;">
            <span>${sys.icone || '🧬'}</span> ${sys.nome}
          </strong>
          <button type="button" class="btn-isolate-organ" onclick="AppController.resetEntireTree()">
            Restaurar
          </button>
        </div>
        <div class="tree-organ-list">
    `;

    (sys.orgaos || []).forEach((orgao) => {
      const organKey = orgao.meshKey || orgao.id;
      treeHtml += `
        <div class="tree-organ-row" data-organ="${organKey}">
          <input 
            type="checkbox" 
            checked 
            id="chk_${orgao.id}" 
            title="Exibir/Ocultar órgão"
            onchange="AppController.onOrganVisibilityChange('${organKey}', this.checked)"
          >
          <div class="tree-organ-title" title="${orgao.nome}">
            ${orgao.nome}
          </div>
          <input 
            type="range" 
            class="tree-organ-slider" 
            min="0" 
            max="1" 
            step="0.05" 
            value="1" 
            title="Transparência (0% a 100%)"
            oninput="AppController.onOrganOpacityChange('${organKey}', this.value)"
          >
          <button 
            type="button" 
            class="btn-isolate-organ" 
            title="Isolar esta estrutura"
            onclick="AppController.onOrganIsolate('${organKey}')"
          >
            Foco
          </button>
        </div>
      `;
    });

    treeHtml += `
        </div>
      </div>
    `;

    container.innerHTML = treeHtml;
  }

  function onOrganVisibilityChange(organKey, isVisible) {
    if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.setOrganVisibility === "function") {
      ThreeEngine.setOrganVisibility(organKey, isVisible);
    }
  }

  function onOrganOpacityChange(organKey, value) {
    if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.setOrganOpacity === "function") {
      ThreeEngine.setOrganOpacity(organKey, parseFloat(value));
    }
  }

  function onOrganIsolate(organKey) {
    if (typeof ThreeEngine !== "undefined") {
      if (typeof ThreeEngine.isolateOrgan === "function") {
        ThreeEngine.isolateOrgan(organKey);
      }
      if (typeof ThreeEngine.highlightOrgan === "function") {
        ThreeEngine.highlightOrgan(organKey);
      }
    }
  }

  function resetEntireTree() {
    if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.resetOrganTree === "function") {
      ThreeEngine.resetOrganTree();
    }
    renderOrganTree(activeSystemId);
  }

  // =========================================================================
  // 4. SELETOR E SIMULADOR DAS 7 VIAS DE ADMINISTRAÇÃO
  // =========================================================================
  function renderRoutesSelector() {
    const container = document.getElementById("routesSelectorContainer");
    if (!container) return;

    if (typeof ATLAS_DATABASE === "undefined" || !ATLAS_DATABASE.viasAdministracao) return;

    const vias = ATLAS_DATABASE.viasAdministracao;
    const keys = Object.keys(vias);

    let html = `
      <div class="tree-header">
        <h3>💉 Vias de Administração Farmacológica (7 Vias)</h3>
        <button type="button" class="btn-isolate-organ" onclick="AppController.stopRoute()">
          Parar Fluxo
        </button>
      </div>
      <div class="routes-grid">
    `;

    keys.forEach((key) => {
      const rota = vias[key];
      const isActive = rota.id === selectedRouteId;

      html += `
        <div 
          class="route-chip-card ${isActive ? 'active' : ''}" 
          id="route_card_${rota.id}" 
          onclick="AppController.selectRoute('${rota.id}')"
        >
          <div class="route-chip-header">
            <span style="font-size:1.1rem;">${rota.icone}</span>
            <span class="route-badge" style="background:${rota.corFluxo}22; color:${rota.corFluxo}; border:1px solid ${rota.corFluxo};">
              ${rota.id}
            </span>
          </div>
          <div class="route-chip-title">${rota.nome}</div>
          <div style="font-size:0.65rem; color:#94a3b8;">Biodisp.: ${rota.biodisponibilidadeMedia}</div>
        </div>
      `;
    });

    html += `</div><div id="routeDetailsPanel" class="route-details-panel"></div>`;
    container.innerHTML = html;

    // Atualiza painel descritivo da via inicial
    updateRouteDetailsPanel(selectedRouteId);
  }

  function selectRoute(routeId) {
    selectedRouteId = routeId.toUpperCase();

    // Atualiza classes ativas nos cards
    document.querySelectorAll(".route-chip-card").forEach((c) => {
      c.classList.remove("active");
    });
    const activeCard = document.getElementById(`route_card_${selectedRouteId}`);
    if (activeCard) activeCard.classList.add("active");

    updateRouteDetailsPanel(selectedRouteId);

    // Dispara a simulação física das partículas 3D no ThreeEngine
    if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.simulateAdministrationRoute === "function") {
      ThreeEngine.simulateAdministrationRoute(selectedRouteId);
    }
  }

  function updateRouteDetailsPanel(routeId) {
    const panel = document.getElementById("routeDetailsPanel");
    if (!panel || typeof ATLAS_DATABASE === "undefined" || !ATLAS_DATABASE.viasAdministracao) return;

    const rota = ATLAS_DATABASE.viasAdministracao[routeId];
    if (!rota) return;

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <strong style="color:${rota.corFluxo}; font-size:0.82rem;">${rota.nome}</strong>
        <span style="font-size:0.68rem; color:#94a3b8;">tMax Estimado: <strong>${rota.tMaxMedio}</strong></span>
      </div>
      <p style="margin:0 0 6px 0; color:#cbd5e1; font-size:0.75rem;">${rota.descricaoClinica}</p>
      <div style="font-size:0.7rem; color:#94a3b8;">
        <strong style="color:#f8fafc;">Barreiras de Absorção:</strong> ${rota.barreirasBiologicas}
      </div>
      <div class="route-details-meta">
        <span>1ª Passagem Hepática: <strong>${rota.primeiraPassagemHepatica ? 'SIM (Intensa)' : 'NÃO (Bypass)'}</strong></span>
        <span>•</span>
        <span>Biodisponibilidade (F): <strong>${rota.biodisponibilidadeMedia}</strong></span>
      </div>
    `;
  }

  function stopRoute() {
    if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.stopRouteSimulation === "function") {
      ThreeEngine.stopRouteSimulation();
    }
    document.querySelectorAll(".route-chip-card").forEach((c) => c.classList.remove("active"));
  }

  // =========================================================
  // 5. INICIALIZAÇÃO DE EVENTOS & LISTENERS GLOBAIS
  // =========================================================
  function initListeners() {
    // Botões de navegação inferior
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget.dataset.target;
        if (target) switchTab(target);
      });
    });

    // Touch events com proteção para a rotação de modelos 3D
    const viewport = document.getElementById("main-viewport");
    const container3D = document.getElementById("canvas-3d-container");
    const containerMol = document.getElementById("mol-viewport-container");

    if (viewport) {
      viewport.addEventListener(
        "touchstart",
        (e) => {
          if (!e.changedTouches || e.changedTouches.length === 0) return;
          const touch = e.changedTouches[0];
          touchStartX = touch.screenX;
          touchStartY = touch.screenY;

          const target = e.target;
          isTouchInside3D = !!(
            (container3D && container3D.contains(target)) ||
            (containerMol && containerMol.contains(target)) ||
            (target.classList && target.classList.contains("tree-organ-slider"))
          );
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchend",
        (e) => {
          if (!e.changedTouches || e.changedTouches.length === 0) return;
          const touch = e.changedTouches[0];
          touchEndX = touch.screenX;
          touchEndY = touch.screenY;

          handleGesture();
          isTouchInside3D = false;
        },
        { passive: true }
      );
    }

    // Vinculação dos chips de sistemas anatômicos superiores
    document.querySelectorAll(".sys-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const sysId = e.currentTarget.dataset.sys;
        if (sysId) {
          activeSystemId = sysId;
          document.querySelectorAll(".sys-chip").forEach((c) => c.classList.toggle("active", c.dataset.sys === sysId));
          if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.selectSystem === "function") {
            ThreeEngine.selectSystem(sysId);
          }
          renderOrganTree(sysId);
        }
      });
    });
  }

  // =========================================================
  // 6. BOOTSTRAP MASTER
  // =========================================================
  function init() {
    console.log("[AppController] Inicializando Controlador Mestre de Navegação...");
    initListeners();
    renderRoutesSelector();
    renderOrganTree("digestorio");

    // Inicialização direta na tela de anatomia
    switchTab("view-anatomy", true);
  }

  return {
    init,
    switchTab,
    renderOrganTree,
    renderRoutesSelector,
    selectRoute,
    stopRoute,
    onOrganVisibilityChange,
    onOrganOpacityChange,
    onOrganIsolate,
    resetEntireTree
  };
})();

// Inicialização segura com o carregamento do DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", AppController.init);
} else {
  AppController.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/app.js                                     */
/* ========================================================================= */

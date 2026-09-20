/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/app.js                                            */
/* ========================================================================= */

/**
 * CONTROLADOR GERAL DE NAVEGAÇÃO, ABAS & GESTOS MOBILE
 * Ecossistema LAIFT - Módulo Master 3D
 * - Gerenciamento de abas SPA com transições reativas
 * - Detecção nativa de Swipe horizontal com proteção de rotação 3D
 * - Redimensionamento sincronizado do Three.js e Chart.js
 * - Orquestração de inicialização e ciclo de vida do módulo
 */

const AppController = (() => {
  // Mapeamento das Telas / Abas Gerenciadas
  const tabs = ["view-anatomy", "view-biohacking", "view-acervo"];
  let currentTabIndex = 0;

  // Variáveis para a Física do Toque (Touch Detection)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isTouchInside3D = false;
  const SWIPE_THRESHOLD_PX = 55;

  // =========================================================================
  // 1. NAVEGAÇÃO E ALTERNÂNCIA DE TELAS
  // =========================================================================
  /**
   * Alterna a tela ativa atual e atualiza a barra de navegação.
   * @param {String} targetId - ID do painel de destino
   * @param {Boolean} force - Força a execução mesmo se já estiver na aba
   */
  function switchTab(targetId, force = false) {
    const targetIndex = tabs.indexOf(targetId);
    if (targetIndex === -1) return;
    if (!force && targetIndex === currentTabIndex) return;

    // 1. Alterna classes dos painéis principais
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

    // 2. Atualiza estado ativo dos botões da barra inferior
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });

    currentTabIndex = targetIndex;

    // 3. Feedback tátil suave em dispositivos móveis compatíveis
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }

    // 4. Ações específicas por contexto de aba
    handleTabActivation(targetId);
  }

  function handleTabActivation(tabId) {
    if (tabId === "view-anatomy") {
      // Força recálculo de dimensões do Three.js para evitar câmera distorcida
      if (typeof ThreeEngine !== "undefined" && typeof ThreeEngine.onWindowResize === "function") {
        setTimeout(() => {
          ThreeEngine.onWindowResize();
        }, 60);
      }
    } else if (tabId === "view-biohacking") {
      // Garante que o grid de biohacking esteja preenchido
      if (typeof BiohackingController !== "undefined" && typeof BiohackingController.renderAllProtocols === "function") {
        BiohackingController.renderAllProtocols();
      }
    } else if (tabId === "view-acervo") {
      // Atualiza o histórico curricular de simulações
      if (typeof ApiCache !== "undefined" && typeof ApiCache.renderizarHistoricoLocal === "function") {
        ApiCache.renderizarHistoricoLocal();
      }
    }
  }

  // =========================================================================
  // 2. DETECÇÃO DE GESTOS (SWIPE MOBILE COM BLINDAGEM DE 3D)
  // =========================================================================
  function handleGesture() {
    // Se o toque começou dentro da viewport 3D ou molecular, cancela o swipe
    // para permitir que o aluno rotacione ou dê zoom no modelo livremente
    if (isTouchInside3D) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Valida se o movimento foi predominantemente horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
        if (deltaX > 0) {
          // Swipe para a direita: Retrocede aba
          if (currentTabIndex > 0) {
            switchTab(tabs[currentTabIndex - 1]);
          }
        } else {
          // Swipe para a esquerda: Avança aba
          if (currentTabIndex < tabs.length - 1) {
            switchTab(tabs[currentTabIndex + 1]);
          }
        }
      }
    }
  }

  // =========================================================================
  // 3. LISTENERS & ORQUESTRAÇÃO DE EVENTOS
  // =========================================================================
  function initListeners() {
    // Botões de navegação inferior
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget.dataset.target;
        if (target) {
          switchTab(target);
        }
      });
    });

    // Touch events no viewport principal
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

          // Verifica se o toque originou-se sobre a área de rotação 3D
          const target = e.target;
          isTouchInside3D = !!(
            (container3D && container3D.contains(target)) ||
            (containerMol && containerMol.contains(target))
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
  }

  // =========================================================================
  // 4. BOOTSTRAP GERAL
  // =========================================================================
  function init() {
    console.log("[AppController] Inicializando Controlador Master de Interface...");
    initListeners();

    // Inicialização forçada na aba de Anatomia
    switchTab("view-anatomy", true);
  }

  return {
    init,
    switchTab
  };
})();

// Inicialização segura com o DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", AppController.init);
} else {
  AppController.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/app.js                                     */
/* ========================================================================= */

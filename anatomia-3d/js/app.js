/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/app.js                                  */
/* ========================================================================= */

/**
 * CONTROLADOR DE INTERFACE E GESTOS (MOBILE-FIRST)
 * Ecossistema LAIFT - Módulo Anatomia 3D & Biohacking
 */

const AppController = (() => {
  // 1. Definição do Estado e Mapeamento de Abas
  const tabs = ['view-anatomy', 'view-biohacking', 'view-acervo'];
  let currentTabIndex = 0;

  // Variáveis para a física do toque (Swipe Detection)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  const SWIPE_THRESHOLD = 50; // Distância mínima em pixels para considerar um swipe

  // 2. Lógica de Alternância de Telas
  function switchTab(targetId) {
    const targetIndex = tabs.indexOf(targetId);
    if (targetIndex === -1 || targetIndex === currentTabIndex) return;

    // Atualiza classes dos painéis
    tabs.forEach(tabId => {
      const panel = document.getElementById(tabId);
      if (panel) {
        if (tabId === targetId) {
          panel.classList.remove('hidden');
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
          panel.classList.add('hidden');
        }
      }
    });

    // Atualiza classes dos botões da barra inferior
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.target === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    currentTabIndex = targetIndex;
    
    // Feedback tátil subtil se o dispositivo suportar (Vibração leve)
    if (navigator.vibrate) {
      navigator.vibrate(15); 
    }
  }

  // 3. Motor de Detecção de Gestos (Swipe)
  function handleGesture() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Verifica se o movimento foi predominantemente horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Verifica se a distância horizontal ultrapassou o limite (threshold)
      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
          // Swipe para a Direita (Voltar uma aba)
          if (currentTabIndex > 0) {
            switchTab(tabs[currentTabIndex - 1]);
          }
        } else {
          // Swipe para a Esquerda (Avançar uma aba)
          if (currentTabIndex < tabs.length - 1) {
            switchTab(tabs[currentTabIndex + 1]);
          }
        }
      }
    }
  }

  // 4. Inicialização de Listeners
  function initListeners() {
    // Listeners de Clique na NavBar
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        switchTab(target);
      });
    });

    // Listeners de Toque na Viewport (Para os Swipes)
    const viewport = document.getElementById('main-viewport');
    if (viewport) {
      viewport.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true }); // passive: true melhora a performance de scroll

      viewport.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();
      }, { passive: true });
    }
  }

  // 5. Inicialização Global do Módulo
  function init() {
    console.log('[LAIFT 3D] Inicializando AppController (Mobile-First)...');
    initListeners();
    
    // Garante que a primeira aba começa ativa
    switchTab(tabs[0]);
  }

  return {
    init,
    switchTab
  };
})();

// Inicia o sistema assim que o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AppController.init);
} else {
  AppController.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/app.js                                     */
/* ========================================================================= */

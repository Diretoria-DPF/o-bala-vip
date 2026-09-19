/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/biohacking.js                           */
/* ========================================================================= */

/**
 * MOTOR DE INTERFACE: BIOHACKING & OTIMIZAÇÃO CELULAR
 * Ecossistema LAIFT - Módulo Anatomia 3D & Biohacking
 * Processa e renderiza protocolos de alta performance celular, biogénese 
 * mitocondrial e vias de suplementação mineral.
 */

const BiohackingController = (() => {
  // Referências DOM
  let searchInput;
  let searchBtn;
  let resultsGrid;

  function init() {
    console.log('[LAIFT Biohacking] Inicializando Motor de Otimização Celular...');
    
    searchInput = document.getElementById('bio-search-input');
    searchBtn = document.getElementById('btn-bio-search');
    resultsGrid = document.getElementById('biohacking-results-grid');

    if (!searchInput || !searchBtn || !resultsGrid) {
      console.error('[LAIFT Biohacking] Elementos DOM não encontrados.');
      return;
    }

    // Listeners de Busca
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
  }

  async function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
      renderEmptyState('Por favor, digite um mineral, vitamina ou via metabólica.');
      return;
    }

    renderLoadingState();

    try {
      // Integração futura com o api-cache.js. Por agora, chama o banco local se existir.
      let resultados = [];
      
      if (typeof ApiCache !== 'undefined' && typeof ApiCache.buscarProtocolo === 'function') {
        resultados = await ApiCache.buscarProtocolo(query);
      } else if (typeof BioDatabase !== 'undefined' && BioDatabase.protocols) {
        // Fallback direto para o banco de dados local enquanto o ApiCache não for criado
        resultados = BioDatabase.protocols.filter(p => 
          p.nome.toLowerCase().includes(query) || 
          p.tags.some(t => t.toLowerCase().includes(query)) ||
          p.viaMetabolica.toLowerCase().includes(query)
        );
      } else {
        throw new Error('Módulos de dados ainda não injetados no sistema.');
      }

      if (resultados.length === 0) {
        renderEmptyState(`Nenhum protocolo encontrado para "${query}". O sistema tentará assimilar este termo em atualizações futuras.`);
      } else {
        renderResults(resultados);
      }

    } catch (error) {
      console.error('[LAIFT Biohacking] Erro na busca:', error);
      renderEmptyState('Erro ao aceder ao repositório de biohacking. Verifique a consola.');
    }
  }

  /**
   * Constrói e injeta o HTML dos cartões de protocolo (Thumb-friendly e ricos em dados)
   */
  function renderResults(protocols) {
    resultsGrid.innerHTML = ''; // Limpa o grid

    protocols.forEach(protocol => {
      const card = document.createElement('div');
      card.className = 'bio-protocol-card';
      
      // Constrói as tags dinamicamente
      const tagsHtml = protocol.tags.map(tag => `<span class="tag-bio">${tag}</span>`).join('');
      
      // Constrói a lista de co-fatores (se existirem)
      const cofactorsHtml = protocol.cofatores && protocol.cofatores.length > 0 
        ? `<div style="margin-top: 8px; font-size: 0.75rem; color: #64748b;">
             <strong>Co-fatores de Síntese:</strong> ${protocol.cofatores.join(', ')}
           </div>` 
        : '';

      // Verifica se o protocolo possui dados PK para simulação
      const simButtonHtml = protocol.pkData 
        ? `<button class="btn-primary" style="width: 100%; margin-top: 12px; font-size: 0.75rem; padding: 8px;" 
            onclick="BiohackingController.triggerSimulation('${protocol.id}')">
            ⚡ Simular Biodisponibilidade 3D
           </button>`
        : '';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h3>${protocol.nome}</h3>
          <span style="font-size: 1.2rem;">${protocol.icone || '🧬'}</span>
        </div>
        <div class="tags-row">
          ${tagsHtml}
        </div>
        <p><strong>Via Alvo:</strong> <span style="color: #38bdf8;">${protocol.viaMetabolica}</span></p>
        <p style="margin-top: 6px;">${protocol.mecanismoAcao}</p>
        ${cofactorsHtml}
        ${simButtonHtml}
      `;

      resultsGrid.appendChild(card);
    });
  }

  function renderEmptyState(message) {
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🔬</span>
        ${message}
      </div>
    `;
  }

  function renderLoadingState() {
    resultsGrid.innerHTML = `
      <div class="empty-state" style="border-color: #38bdf8; color: #38bdf8;">
        <span style="display: inline-block; animation: spin 1s linear infinite;">⚙️</span>
        Analisando vias metabólicas e mapeamento celular...
      </div>
    `;
  }

  /**
   * Ação ativada pelo botão do card. Faz a ponte entre a aba de Biohacking e a aba 3D.
   */
  function triggerSimulation(protocolId) {
    // 1. Busca os dados brutos no Banco de Dados
    const protocol = typeof BioDatabase !== 'undefined' 
      ? BioDatabase.protocols.find(p => p.id === protocolId) 
      : null;

    if (!protocol || !protocol.pkData) {
      alert('Dados farmacocinéticos não disponíveis para este composto.');
      return;
    }

    // 2. Muda automaticamente para a aba do Simulador 3D (UX fluida)
    if (typeof AppController !== 'undefined') {
      AppController.switchTab('view-anatomy');
    }

    // 3. Dispara o motor matemático para desenhar a curva e acender o órgão
    if (typeof PKEngine !== 'undefined') {
      // Exemplo de roteamento inteligente baseado nos dados do composto
      const rota = protocol.pkData.route || 'ORAL';
      PKEngine.simulateDrug(protocol.nome, protocol.pkData, rota);
    }
  }

  return {
    init,
    triggerSimulation
  };
})();

// Inicialização
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BiohackingController.init);
} else {
  BiohackingController.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/biohacking.js                              */
/* ========================================================================= */

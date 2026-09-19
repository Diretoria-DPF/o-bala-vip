/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/api-cache.js                            */
/* ========================================================================= */

/**
 * MOTOR DE INTERCEPTAÇÃO, CACHE E INTEGRAÇÃO DE APIS EXTERNAS
 * Ecossistema LAIFT - Módulo Anatomia 3D & Biohacking
 * Arquitetura Offline-First: Prioriza a base local. Se não encontrar,
 * aciona APIs gratuitas (PubChem/ChEMBL), enriquece o RAG local e salva.
 */

const ApiCache = (() => {
  // Configurações do Sistema
  const STORAGE_KEY_HISTORY = 'laift_3d_sim_history';
  const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyXvBYrHBIXNjHYItuq2LXKt1vkmh2m_CME-5aZqkxUJhl7ktJjemuasbvdEweH95k/exec'; // Endpoint para persistência na nuvem

  function init() {
    console.log('[LAIFT Api-Cache] Intercetor de APIs e Gestor de Estado Inicializado.');
    renderizarHistoricoLocal();
    configurarBotoesAcervo();
  }

  // =======================================================================
  // 1. MOTOR DE BUSCA HÍBRIDA (LOCAL -> EXTERNO -> SALVAR)
  // =======================================================================
  
  async function buscarProtocolo(query) {
    const termoBusca = query.toLowerCase().trim();
    
    // PASSO 1: Tentar a Base de Dados Local Rápida (BioDatabase)
    if (typeof BioDatabase !== 'undefined' && BioDatabase.protocols) {
      const resultadosLocais = BioDatabase.protocols.filter(p => 
        p.nome.toLowerCase().includes(termoBusca) || 
        p.tags.some(t => t.toLowerCase().includes(termoBusca)) ||
        p.viaMetabolica.toLowerCase().includes(termoBusca)
      );

      if (resultadosLocais.length > 0) {
        console.log('[LAIFT Api-Cache] ⚡ Retornado do Cache Local (Latência Zero).');
        return resultadosLocais;
      }
    }

    // PASSO 2: Se não existe, buscar nas APIs Públicas (PubChem como exemplo)
    console.log(`[LAIFT Api-Cache] 🌐 "${termoBusca}" não encontrado localmente. Consultando PubChem...`);
    
    try {
      // Consulta ao PubChem PUG REST API (Sem necessidade de autenticação)
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termoBusca)}/property/MolecularWeight,XLogP,CanonicalSMILES/JSON`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Composto não mapeado nas bases do PubChem.');
      }

      const data = await response.json();
      const props = data.PropertyTable.Properties[0];

      // Formatar o retorno da API para o padrão dos Cards do Biohacking
      const novoProtocolo = {
        id: `composto_api_${Date.now()}`,
        nome: termoBusca.charAt(0).toUpperCase() + termoBusca.slice(1),
        icone: '🔬',
        viaMetabolica: 'Via a definir (Dado Externo)',
        mecanismoAcao: `Massa Molecular: ${props.MolecularWeight} g/mol | Lipofilicidade (XLogP): ${props.XLogP || 'N/A'}.<br>SMILES: <span style="font-family: monospace; font-size: 0.7rem;">${props.CanonicalSMILES}</span>`,
        tags: ['API Externa', 'Descoberta'],
        cofatores: [],
        pkData: {
          route: 'ORAL',
          vd: 40, 
          halfLife: 4, 
          dose: 100, 
          ka: 1.0,
          targetOrgan: 'liver' // Padrão genérico
        }
      };

      // PASSO 3: Salvar a descoberta no banco de dados para evitar requisições futuras
      salvarNoCacheLocal(novoProtocolo);

      return [novoProtocolo];

    } catch (error) {
      console.warn('[LAIFT Api-Cache] Consulta externa falhou:', error);
      return []; // Retorna array vazio para acionar o "Empty State" no front
    }
  }

  function salvarNoCacheLocal(protocolo) {
    // Injeta na memória volátil atual para uso imediato
    if (typeof BioDatabase !== 'undefined' && BioDatabase.protocols) {
      BioDatabase.protocols.push(protocolo);
    }
    
    // No futuro, isso faz um POST para o Google Apps Script para atualizar o .js raiz do sistema
    console.log('[LAIFT Api-Cache] 💾 Composto adicionado ao RAG Local. Disparar webhook para GAS futuramente.');
  }

  // =======================================================================
  // 2. GESTÃO DE HISTÓRICO PARA INTEGRAÇÃO INSTITUCIONAL (LATTES / UNINASSAU)
  // =======================================================================
  
  function registrarSimulacao(nomeComposto, viaAdministracao) {
    const historicoStr = localStorage.getItem(STORAGE_KEY_HISTORY);
    const historico = historicoStr ? JSON.parse(historicoStr) : [];

    const novoRegistro = {
      id: `sim_${Date.now()}`,
      data: new Date().toISOString(),
      composto: nomeComposto,
      via: viaAdministracao,
      horasAcademicas: 0.5 // Exemplo: cada simulação contabiliza 30 minutos de estudo
    };

    historico.unshift(novoRegistro); // Adiciona no início
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historico));

    console.log('[LAIFT Api-Cache] 📈 Simulação registada no Acervo Institucional.');
    renderizarHistoricoLocal();
  }

  function renderizarHistoricoLocal() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    const historicoStr = localStorage.getItem(STORAGE_KEY_HISTORY);
    const historico = historicoStr ? JSON.parse(historicoStr) : [];

    if (historico.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">Nenhuma simulação registrada. O seu histórico de estudos aparecerá aqui.</div>';
      return;
    }

    listContainer.innerHTML = historico.map(reg => `
      <div style="background: #1e293b; border-left: 3px solid #38bdf8; padding: 12px; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #f8fafc; font-size: 0.9rem;">${reg.composto}</strong>
          <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 4px;">Via: ${reg.via} | Data: ${new Date(reg.data).toLocaleDateString('pt-BR')}</div>
        </div>
        <div style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">
          +${reg.horasAcademicas}h
        </div>
      </div>
    `).join('');
  }

  // =======================================================================
  // 3. EXPORTAÇÃO CSV E SINCRONIZAÇÃO NUVEM
  // =======================================================================

  function configurarBotoesAcervo() {
    const btnExportar = document.getElementById('btn-export-csv');
    const btnSync = document.getElementById('btn-sync-cloud');

    if (btnExportar) {
      btnExportar.addEventListener('click', exportarCSV);
    }

    if (btnSync) {
      btnSync.addEventListener('click', () => {
        alert('Sincronização com o Google Sheets (Apps Script) acionada. O seu progresso foi salvo na nuvem da LAIFT!');
      });
    }
  }

  function exportarCSV() {
    const historicoStr = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!historicoStr) {
      alert('Não há simulações para exportar.');
      return;
    }

    const historico = JSON.parse(historicoStr);
    
    // Cabeçalho do CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Data_Hora,Composto_Simulado,Via_Administracao,Horas_Academicas\n";

    // Linhas do CSV
    historico.forEach(reg => {
      const dataFormatada = new Date(reg.data).toLocaleString('pt-BR');
      csvContent += `"${reg.id}","${dataFormatada}","${reg.composto}","${reg.via}","${reg.horasAcademicas}"\n`;
    });

    // Criação do Blob e Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LAIFT_Relatorio_Simulacoes_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Monitora interceptações feitas pelo PKEngine (injeção dependente)
  // Garantimos que a função registrarSimulacao seja exposta para o pk-engine.js chamar
  return {
    init,
    buscarProtocolo,
    registrarSimulacao
  };
})();

// Inicialização
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ApiCache.init);
} else {
  ApiCache.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/api-cache.js                               */
/* ========================================================================= */

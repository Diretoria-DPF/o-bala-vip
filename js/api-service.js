/**
 * SERVIÇO DE COMUNICAÇÃO COM O BACKEND (GOOGLE APPS SCRIPT) E APIS EXTERNAS
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const ApiService = (() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpU-t96z8J6J44bIywHaY68aOEj7_sarB3U4gut3yXAWdJCLnHXfXNnLRIP6V9JE68/exec';
  const OPENFDA_BASE_URL = 'https://api.fda.gov/drug/label.json';

  /**
   * Executa requisições POST seguras para o Google Apps Script com controle de timeout
   */
  async function callAppsScript(payload, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify(payload) // Sem o objeto headers
    });

    const raw = await response.text();
    return JSON.parse(raw);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('A conexão com o servidor excedeu o tempo limite.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

  /**
   * Consulta a API OpenFDA com timeout estrito de 3 segundos e ativação de fallback
   */
  async function fetchOpenFdaWarning(drugName) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const url = `${OPENFDA_BASE_URL}?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.results || data.results.length === 0) return null;

      const result = data.results[0];
      const boxedWarning = result.boxed_warning ? result.boxed_warning[0] : null;
      const generalWarning = result.warnings ? result.warnings[0] : null;
      const overdosage = result.overdosage ? result.overdosage[0] : null;

      return {
        fonte: 'OpenFDA Live Data (Oficial)',
        conteudo: boxedWarning || generalWarning || overdosage || null
      };
    } catch (error) {
      console.warn('Falha ou timeout na requisição OpenFDA. Ativando fallback local.');
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    // --- AUTENTICAÇÃO E SESSÃO ---
    solicitarCodigoAcesso: (identificador, email, tipo, nome, aceitouPolitica) =>
      callAppsScript({
        acao: 'solicitarCodigoAcesso',
        identificador,
        email,
        tipo,
        nome,
        aceitouPolitica
      }),

    validarCodigoAcesso: (identificador, email, codigo) =>
      callAppsScript({
        acao: 'validarCodigoAcesso',
        identificador,
        email,
        codigo
      }),

    obterCredencial: (sessao) =>
      callAppsScript({
        acao: 'obterCredencial',
        sessao
      }),

    reenviarCredencialEmail: (sessao) =>
      callAppsScript({
        acao: 'reenviarCredencialEmail',
        sessao
      }),

    // --- TERMINAL FISCAL ---
    loginFiscal: (senha) =>
      callAppsScript({
        acao: 'loginFiscal',
        senha
      }),

    salvarEvento: (novoNome, sessao) =>
      callAppsScript({
        acao: 'salvarEvento',
        novoNome,
        sessao
      }),

    carimbarPresenca: (credencial, sessao) =>
      callAppsScript({
        acao: 'carimbarPresenca',
        credencial,
        sessao
      }),

    carimbarPresencaManual: (identificador, sessao) =>
      callAppsScript({
        acao: 'carimbarPresencaManual',
        identificador,
        sessao
      }),

    logoutFiscal: (sessao) =>
      callAppsScript({
        acao: 'logoutFiscal',
        sessao
      }),

    // --- MÉTRICAS DE QUIZ E DASHBOARD ---
    sincronizarMetricasSimulado: (identificador, modulo, modo, acertos, total, tempoGasto, detalhesTopicos) =>
      callAppsScript({
        acao: 'sincronizarMetricasSimulado',
        identificador,
        modulo,
        modo,
        acertos,
        total,
        tempoGasto,
        detalhesTopicos
      }),

    obterDashboardAluno: (identificador) =>
      callAppsScript({
        acao: 'obterDashboardAluno',
        identificador
      }),

    // --- CLÍNICA VIRTUAL (GEMINI BACKEND PROXY) ---
    conversarComPaciente: (casoId, perguntaAluno, historicoConversa, contextoPaciente) =>
      callAppsScript({
        acao: 'conversarComPaciente',
        casoId,
        perguntaAluno,
        historicoConversa,
        contextoPaciente
      }, 15000),

    avaliarCondutaPreceptor: (identificador, casoId, dadosAtendimento) =>
      callAppsScript({
        acao: 'avaliarCondutaPreceptor',
        identificador,
        casoId,
        dadosAtendimento
      }, 30000),

    // --- OPENFDA ---
    fetchOpenFdaWarning
  };
})();

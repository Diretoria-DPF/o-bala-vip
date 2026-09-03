/**
 * SERVIÇO DE COMUNICAÇÃO COM O BACKEND (GOOGLE APPS SCRIPT) E APIS EXTERNAS
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const ApiService = (() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKJ_Ck5tk_zvM7Dew6HALLUyUyVhRlk3M6Ld38Ibm72PJpgRWFXXBhlk3jbpM57g3F/exec';
  const OPENFDA_BASE_URL = 'https://api.fda.gov/drug/label.json';

  /**
   * Executa requisições POST seguras para o Google Apps Script com controle de timeout
   */
 async function callAppsScript(payload, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Impede bloqueio de CORS preflight
        },
        body: JSON.stringify(payload)
      });

      const raw = await response.text();

      try {
        return JSON.parse(raw);
      } catch (jsonErr) {
        console.error('[ApiService] Resposta não-JSON recebida:', raw);
        throw new Error('O servidor retornou uma resposta inválida.');
      }
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
   * Consulta a API OpenFDA com timeout de 3 segundos e ativação de fallback
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
    solicitarCodigoAcesso: (identificador, email, tipo, nome, consentimento) =>
      callAppsScript({
        acao: 'solicitarCodigoAcesso',
        identificador,
        email,
        tipo,
        nome,
        consentimento,
        aceitouPolitica: consentimento
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

    // --- TERMINAL FISCAL / CREDENCIAMENTO ---
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

    // --- CLÍNICA MÉDICA VIRTUAL (GROQ / OSCE) ---
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

    gerarCasoProcedural: (topicoAlvo, dificuldade) =>
      callAppsScript({
        acao: 'gerarCasoProcedural',
        topicoAlvo,
        dificuldade: dificuldade || 'Avançado'
      }, 45000),

    // --- UTILITÁRIOS E APIS EXTERNAS ---
    fetchOpenFdaWarning,
    callAppsScript
  };
})();

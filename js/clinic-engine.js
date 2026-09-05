/**
 * MOTOR DA CLÍNICA MÉDICA VIRTUAL (OSCE MULTIPACIENTE & PLANTÃO LAIFT)
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 * 
 * Inovações:
 * - Pacientes com múltiplos arquétipos (Leigo, Exigente, "Dr. Google", Evasivo).
 * - Guia Semiológico Prático baseado em Metodologia Clínica (4 Eixos de Investigação).
 * - Dinâmica aprimorada de Paciência e Estabilidade Clínica.
 */

const ClinicEngine = (() => {
  let currentCase = null;
  let vitality = 100;
  let patience = 100;
  let elapsedSeconds = 0;
  let clockInterval = null;
  let aiCooldownTimer = null;
  let isCaseActive = false;
  let conversationHistory = [];
  let requestedExams = [];
  let intentHistory = {};
  let caseOutcome = 'EM_ANDAMENTO';
  let activeSemiologyAxis = 'cronologia';

  // Cache centralizado de referências do DOM
  const dom = {};

  function initDomReferences() {
    dom.patientName = document.getElementById('clinicPatientName');
    dom.patientMeta = document.getElementById('clinicPatientMeta');
    dom.vitalityValue = document.getElementById('vitalityValue');
    dom.vitalityFill = document.getElementById('vitalityFill');
    dom.patienceValue = document.getElementById('patienceValue');
    dom.patienceFill = document.getElementById('patienceFill');
    dom.timeElapsed = document.getElementById('clinicTimeElapsed');

    // Telas do Módulo Clínico
    dom.dashboardView = document.getElementById('clinicDashboardView');
    dom.workspaceView = document.getElementById('clinicWorkspaceView');
    dom.bedsGrid = document.getElementById('patientBedsGrid');
    dom.btnGenerateAiCase = document.getElementById('btnGenerateAiCase');

    // Abas de navegação da consulta
    dom.tabButtons = document.querySelectorAll('.clinic-tab-btn');
    dom.tabPanes = document.querySelectorAll('.clinic-tab-pane');

    // Prontuário clínico
    dom.chiefComplaint = document.getElementById('clinicChiefComplaint');
    dom.patientHistory = document.getElementById('clinicPatientHistory');
    dom.vitalPA = document.getElementById('vitalPA');
    dom.vitalFC = document.getElementById('vitalFC');
    dom.vitalFR = document.getElementById('vitalFR');
    dom.vitalTemp = document.getElementById('vitalTemp');
    dom.vitalSpO2 = document.getElementById('vitalSpO2');
    dom.vitalGlasgow = document.getElementById('vitalGlasgow');

    // Chat / Anamnese & Guia Semiológico
    dom.chatHistory = document.getElementById('chatHistory');
    dom.chatInitialGreeting = document.getElementById('chatInitialGreeting');
    dom.suggestionsList = document.getElementById('suggestionsList');
    dom.questionInput = document.getElementById('patientQuestionInput');
    dom.sendQuestionBtn = document.getElementById('sendQuestionBtn');

    // Exames complementares
    dom.availableExamsList = document.getElementById('availableExamsList');
    dom.releasedExamsList = document.getElementById('releasedExamsList');

    // Fechamento e Preceptor
    dom.studentDiagnosis = document.getElementById('studentDiagnosisInput');
    dom.studentConduct = document.getElementById('studentConductInput');
    dom.submitResolutionBtn = document.getElementById('submitCaseResolutionBtn');
    dom.preceptorModal = document.getElementById('preceptorModal');
    dom.preceptorGrade = document.getElementById('preceptorGrade');
    dom.caseOutcomeTitle = document.getElementById('caseOutcomeTitle');
    dom.caseOutcomeSummary = document.getElementById('caseOutcomeSummary');
    dom.preceptorFeedbackText = document.getElementById('preceptorFeedbackText');
  }

  // =========================================================
  // 1. GESTÃO DA GRADE DE LEITOS (MAPA DO PLANTÃO)
  // =========================================================

  function renderBedsGrid() {
    initDomReferences();
    if (!dom.bedsGrid) return;

    dom.bedsGrid.innerHTML = '';

    if (typeof clinicalCases === 'undefined' || !Array.isArray(clinicalCases) || clinicalCases.length === 0) {
      dom.bedsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray, #64748b);">
          <h3>Nenhum paciente internado no momento.</h3>
          <p>Clique em <strong>⚡ Gerar Caso com IA</strong> para admitir um paciente no plantão.</p>
        </div>
      `;
      return;
    }

    const resolvidos = JSON.parse(localStorage.getItem('laift_resolved_cases') || '[]');

    clinicalCases.forEach((c, index) => {
      const isConcluido = resolvidos.includes(c.id);
      const card = document.createElement('div');
      card.className = `bed-card ${c.tipo === 'emergencia' ? 'emergency' : 'ambulatory'} ${isConcluido ? 'completed' : ''}`;

      const idade = c.paciente ? c.paciente.idade : '--';
      const nome = c.paciente ? c.paciente.nome : 'Paciente';
      const perfilComportamental = (c.contextoOculto && c.contextoOculto.temperamento) 
        ? c.contextoOculto.temperamento.split(',')[0] 
        : (c.dificuldade || 'Intermediário');

      const queixa = c.queixaPrincipal 
        ? (c.queixaPrincipal.length > 85 ? c.queixaPrincipal.substring(0, 85) + '...' : c.queixaPrincipal) 
        : 'Sem queixa descrita.';

      card.innerHTML = `
        <div class="bed-header">
          <span class="bed-tag">${c.tipo === 'emergencia' ? '🚨 Emergência' : '🩺 Ambulatório'}</span>
          <span class="bed-status" style="font-weight: bold; color: ${isConcluido ? 'var(--success, #16a34a)' : 'var(--primary, #0f766e)'};">
            ${isConcluido ? '✅ Concluído' : '🟡 Em Aberto'}
          </span>
        </div>
        <h4 style="margin: 8px 0 4px; font-size: 1.15rem; color: var(--primary, #0f766e);">Leito 0${index + 1}: ${nome}</h4>
        <p class="bed-complaint" style="font-style: italic; color: #475569; margin-bottom: 12px; min-height: 42px;">"${queixa}"</p>
        <div class="bed-meta" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray, #64748b); border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 14px;">
          <span>Idade: <strong>${idade} anos</strong></span>
          <span>Perfil: <strong>${perfilComportamental}</strong></span>
        </div>
        <button class="btn btn-primary" style="width: 100%;" type="button" onclick="ClinicEngine.openBed('${c.id}')">
          ${isConcluido ? '🔄 Reavaliar Caso' : '🩺 Assumir Atendimento'}
        </button>
      `;

      dom.bedsGrid.appendChild(card);
    });
  }

  function showBedsDashboard() {
    initDomReferences();
    if (dom.workspaceView) dom.workspaceView.classList.add('hidden');
    if (dom.dashboardView) dom.dashboardView.classList.remove('hidden');
    renderBedsGrid();
  }

  function openBed(caseId) {
    initDomReferences();
    if (dom.dashboardView) dom.dashboardView.classList.add('hidden');
    if (dom.workspaceView) dom.workspaceView.classList.remove('hidden');
    startCase(caseId);
  }

  function returnToBeds() {
    if (isCaseActive) {
      if (!confirm('Deseja pausar o atendimento atual e retornar ao mapa de leitos?')) return;
      clearInterval(clockInterval);
      isCaseActive = false;
    }
    showBedsDashboard();
  }

  // =========================================================
  // 2. GERAÇÃO DE CASOS PROCEDURAIS (GROQ CLOUD / ACERVO)
  // =========================================================

  async function solicitarCasoProcedural() {
    initDomReferences();
    const btn = dom.btnGenerateAiCase || document.getElementById('btnGenerateAiCase');
    if (btn && btn.disabled) return;

    const topico = prompt(
      'Qual agravo farmacológico ou toxicológico deseja simular?\n\nExemplos:\n• Intoxicação por Paracetamol em dose cavalar\n• Paciente exigente pedindo Ciprofloxacino para gripe\n• Intoxicação Ocupacional por Organofosforados\n• Idoso polimedicado com interação Varfarina + AINE',
      'Intoxicação por Paracetamol'
    );
    if (!topico || !topico.trim()) return;

    const session = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
    const identifier = session.identifier || 'anonimo';
    const tipoUsuario = session.type || 'Visitante';

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Sintetizando caso clínico com IA...';
    }

    if (typeof showStatus === 'function') {
      showStatus('Sintetizando novo caso e roteiro semiológico com Groq LPU...', 'loading');
    }

    try {
      let res = null;
      if (typeof ApiService !== 'undefined' && typeof ApiService.gerarCasoProcedural === 'function') {
        res = await ApiService.gerarCasoProcedural(topico.trim(), 'Avançado', identifier);
      }

      if (typeof hideStatus === 'function') hideStatus();

      if (res && res.sucesso === false) {
        alert(res.mensagem || 'Aguarde antes de solicitar outro caso com IA.');
        const tempoPadrao = (tipoUsuario === 'Visitante') ? 300 : 30;
        iniciarContagemCooldownIA(tempoPadrao);
        return;
      }

      if (res && res.sucesso && res.caso) {
        if (typeof clinicalCases !== 'undefined' && Array.isArray(clinicalCases)) {
          clinicalCases.push(res.caso);
        }
        renderBedsGrid();
        alert(`✅ Novo paciente admitido no leito: ${res.caso.paciente.nome} (${res.caso.titulo})!`);

        const cooldownSegundos = (tipoUsuario === 'Visitante') ? 300 : 30;
        iniciarContagemCooldownIA(cooldownSegundos);
        openBed(res.caso.id);
        return;
      }

      throw new Error((res && res.mensagem) || 'Falha no retorno da API');
    } catch (err) {
      if (typeof hideStatus === 'function') hideStatus();
      console.warn('[ClinicEngine] Acionando síntese local de contingência:', err);

      const casoBackup = gerarCasoLocalContingencia(topico.trim());
      if (typeof clinicalCases !== 'undefined' && Array.isArray(clinicalCases)) {
        clinicalCases.push(casoBackup);
      }
      renderBedsGrid();
      alert(`⚡ Caso gerado pelo simulador local: ${casoBackup.paciente.nome}!`);

      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Gerar Caso com IA';
      }
      openBed(casoBackup.id);
    }
  }

  function iniciarContagemCooldownIA(segundos) {
    initDomReferences();
    const btn = dom.btnGenerateAiCase || document.getElementById('btnGenerateAiCase');
    if (!btn) return;

    clearInterval(aiCooldownTimer);
    let restante = segundos;
    btn.disabled = true;

    const atualizarTexto = () => {
      const min = Math.floor(restante / 60);
      const seg = restante % 60;
      btn.textContent = `⏳ Aguarde (${min > 0 ? `${min}m ` : ''}${String(seg).padStart(2, '0')}s)`;
    };

    atualizarTexto();

    aiCooldownTimer = setInterval(() => {
      restante--;
      if (restante <= 0) {
        clearInterval(aiCooldownTimer);
        btn.disabled = false;
        btn.textContent = '⚡ Gerar Caso com IA';
      } else {
        atualizarTexto();
      }
    }, 1000);
  }

  /**
   * Fallback de contingência offline estruturado com arquétipos e guia semiológico
   */
  function gerarCasoLocalContingencia(tema) {
    const idUnico = 'caso_proc_' + Date.now();
    const isExigente = tema.toLowerCase().includes('receita') || tema.toLowerCase().includes('antibiótico') || tema.toLowerCase().includes('encaminhamento');

    return {
      id: idUnico,
      titulo: `Caso Simulado: ${tema}`,
      tipo: "emergencia",
      dificuldade: "Avançado",
      vitalidadeInicial: 88,
      pacienciaInicial: isExigente ? 65 : 85,
      taxaDecaimento: { vitalidadePorMinuto: 2, pacienciaPorMinuto: 1.5 },
      paciente: {
        nome: isExigente ? "Renata Sampaio" : "Valdir Monteiro",
        idade: isExigente ? 36 : 51,
        peso: isExigente ? "62 kg" : "78 kg",
        profissao: isExigente ? "Analista de Sistemas (Informed/Dr. Google)" : "Trabalhador Autônomo",
        alergias: "Nega alergias conhecidas",
        imagem: isExigente ? "👩‍💻" : "🧑"
      },
      queixaPrincipal: isExigente 
        ? `Doutor, eu já pesquisei meus sintomas e tenho certeza que preciso de uma receita de antibiótico e um encaminhamento logo, estou com pressa.` 
        : `Doutor(a)... passei mal depois de lidar com ${tema}... tô com o peito pesado, boca amarga e tontura.`,
      historicoAdmissao: `Admitido no plantão com queixas correlacionadas a ${tema}. Apresenta sinais de ansiedade e necessidade de esclarecimento clínico imediato.`,
      sinaisVitais: { pa: "135/85 mmHg", fc: "98 bpm", fr: "20 irpm", temp: "37.1 °C", spo2: "95%", glasgow: "15" },
      contextoOculto: {
        nome: isExigente ? "Renata" : "Valdir",
        idade: isExigente ? 36 : 51,
        pacienteProfissao: isExigente ? "Analista" : "Autônomo",
        exposicaoReal: `Quadro patológico e/ou toxicológico associado a ${tema}.`,
        sintomas: "desconforto gástrico, cefaleia, ansiedade e palpitações",
        temperamento: isExigente 
          ? "Exigente, questionadora, quer a receita imediatamente e pesquisou no Google" 
          : "Preocupado, humilde, ansioso por ajuda médica",
        nivelConsciencia: "Completamente lúcido e orientado"
      },
      guiaSemiologico: {
        cronologia: [
          "Há quantas horas esses sintomas começaram exatamente?",
          "A dor ou mal-estar está piorando ou permanece constante?",
          "O que você estava fazendo no exato momento em que começou a se sentir mal?"
        ],
        farmacoterapia: [
          "Quais medicamentos você tomou por conta própria antes de vir aqui?",
          "Você toma algum remédio contínuo para pressão, diabetes ou ansiedade?",
          "Quantos comprimidos e qual a dosagem exata que você ingeriu hoje?"
        ],
        exposicao: [
          "Houve contato com venenos, defensivos, produtos químicos ou solventes?",
          "Você ingeriu alimentos suspeitos, bebidas ou substâncias diferentes?",
          "Alguém na sua casa ou trabalho apresentou sintomas parecidos?"
        ],
        sinaisAlarme: [
          "Você está sentindo aperto no peito, falta de ar ou palpitações fortes?",
          "Notou visão embaçada, boca excessivamente seca ou excesso de salivação?",
          "Apresentou vômitos, queimação no estômago ou formigamento no corpo?"
        ]
      },
      perguntasSugeridas: [
        "Há quanto tempo começaram os primeiros sintomas?",
        "Qual remédio ou substância você tomou hoje?",
        "Você sente queimação, falta de ar ou suor frio?"
      ],
      examesDisponiveis: [
        { id: "lab_triagem", nome: "Painel Bioquímico & Função Renal/Hepática", custoTempoMin: 12, impactoVitalidade: 0, impactoPaciencia: -1, essencial: true, resultado: `Resultados bioquímicos compatíveis com estresse metabólico por ${tema}.` },
        { id: "gaso_arterial", nome: "Gasometria Arterial e Eletrólitos", custoTempoMin: 8, impactoVitalidade: 0, impactoPaciencia: -1, essencial: true, resultado: "pH 7.36, pO2 92 mmHg, lactato normal, sem distúrbio ácido-base grave." },
        { id: "ecg_12d", nome: "Eletrocardiograma de 12 Derivações", custoTempoMin: 5, impactoVitalidade: 0, impactoPaciencia: 0, essencial: true, resultado: "Ritmo sinusal, FC 98 bpm, intervalos PR e QTc dentro dos limites normais." }
      ],
      gabaritoPreceptor: {
        diagnostico: `Quadro Clínico e/ou Toxicológico Agudo associado a ${tema}`,
        conduta: "Anamnese dirigida, interrupção de automedicação errônea, suporte hidroeletrolítico, monitorização e orientação farmacêutica baseada em evidências.",
        palavrasChave: ["anamnese", "suporte", "orientação", tema.toLowerCase()]
      }
    };
  }

  // =========================================================
  // 3. ATENDIMENTO CLÍNICO DO LEITO SELECIONADO
  // =========================================================

  function startCase(caseId) {
    initDomReferences();

    const selected = (typeof clinicalCases !== 'undefined' && Array.isArray(clinicalCases))
      ? (clinicalCases.find(c => c.id === caseId) || clinicalCases[0])
      : null;

    if (!selected) {
      console.error('[ClinicEngine] Caso clínico não encontrado.');
      return;
    }

    currentCase = selected;
    vitality = selected.vitalidadeInicial || 100;
    patience = selected.pacienciaInicial || 100;
    elapsedSeconds = 0;
    conversationHistory = [];
    requestedExams = [];
    intentHistory = {};
    caseOutcome = 'EM_ANDAMENTO';
    isCaseActive = true;
    activeSemiologyAxis = 'cronologia';

    clearInterval(clockInterval);
    renderPatientProfile();
    renderVitals();
    renderSemiologyGuide();
    renderExamsCatalog();
    resetChat();
    resetResolutionForm();
    updateMetersUI();
    switchTab('prontuarioTab');

    clockInterval = setInterval(handleTimeTick, 1000);
  }

  function renderPatientProfile() {
    if (!currentCase) return;
    if (dom.patientName) dom.patientName.textContent = currentCase.paciente.nome;
    if (dom.patientMeta) {
      dom.patientMeta.textContent = `${currentCase.paciente.idade} anos | ${currentCase.paciente.profissao} | Peso: ${currentCase.paciente.peso}`;
    }
    if (dom.chiefComplaint) dom.chiefComplaint.textContent = `"${currentCase.queixaPrincipal}"`;
    if (dom.patientHistory) {
      dom.patientHistory.innerHTML = `
        <p style="margin-bottom: 8px;"><strong>Histórico de Admissão:</strong> ${currentCase.historicoAdmissao}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted, #64748b);"><strong>Alergias Conhecidas:</strong> ${currentCase.paciente.alergias}</p>
      `;
    }
  }

  function renderVitals() {
    if (!currentCase || !currentCase.sinaisVitais) return;
    const v = currentCase.sinaisVitais;
    if (dom.vitalPA) dom.vitalPA.textContent = v.pa || '--/--';
    if (dom.vitalFC) dom.vitalFC.textContent = v.fc || '--';
    if (dom.vitalFR) dom.vitalFR.textContent = v.fr || '--';
    if (dom.vitalTemp) dom.vitalTemp.textContent = v.temp || '--';
    if (dom.vitalSpO2) dom.vitalSpO2.textContent = v.spo2 || '--';
    if (dom.vitalGlasgow) dom.vitalGlasgow.textContent = v.glasgow || '--';
  }

  // =========================================================
  // 4. GUIA SEMIOLÓGICO CLÍNICO-METODOLÓGICO (4 EIXOS)
  // =========================================================

  function renderSemiologyGuide() {
    if (!dom.suggestionsList || !currentCase) return;
    dom.suggestionsList.innerHTML = '';

    const guia = currentCase.guiaSemiologico || null;
    const perguntasLegadas = currentCase.perguntasSugeridas || [];

    // Estrutura metodológica de semiologia médica e anamnese farmacêutica
    const eixos = [
      { id: 'cronologia', icone: '⏱️', titulo: 'HMA & Início', desc: 'Evolução, tempo e ritmo dos sintomas' },
      { id: 'farmacoterapia', icone: '💊', titulo: 'Remédios & Doses', desc: 'Automedicação, contínuos e adesão' },
      { id: 'exposicao', icone: '🧪', titulo: 'Exposição & Tóxicos', desc: 'Químicos, alimentos e ambiente' },
      { id: 'sinaisAlarme', icone: '⚠️', titulo: 'Sinais de Alarme', desc: 'Queimação, salivação e gravidade' }
    ];

    // Container geral do guia
    const containerGuia = document.createElement('div');
    containerGuia.className = 'semiology-wrapper';
    containerGuia.style.cssText = 'width: 100%; display: flex; flex-direction: column; gap: 8px;';

    // Barra de Navegação dos Eixos
    const navBar = document.createElement('div');
    navBar.className = 'semiology-nav';
    navBar.style.cssText = 'display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;';

    // Área onde os chips de perguntas do eixo ativo são exibidos
    const chipsArea = document.createElement('div');
    chipsArea.className = 'semiology-chips-area';
    chipsArea.style.cssText = 'display: flex; flex-direction: column; gap: 6px; max-height: 140px; overflow-y: auto; padding-right: 4px;';

    eixos.forEach((eixo) => {
      const btnEixo = document.createElement('button');
      btnEixo.type = 'button';
      const isActive = eixo.id === activeSemiologyAxis;
      btnEixo.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`;
      btnEixo.style.cssText = 'font-size: 0.75rem; padding: 4px 9px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;';
      btnEixo.innerHTML = `${eixo.icone} ${eixo.titulo}`;
      btnEixo.title = eixo.desc;

      btnEixo.onclick = () => {
        activeSemiologyAxis = eixo.id;
        navBar.querySelectorAll('button').forEach(b => {
          b.className = 'btn btn-sm btn-outline';
          b.style.background = '';
        });
        btnEixo.className = 'btn btn-sm btn-primary';

        // Carrega as perguntas do eixo correspondente
        const perguntasDoEixo = (guia && guia[eixo.id]) ? guia[eixo.id] : [];
        carregarPerguntasNoEixo(perguntasDoEixo.length > 0 ? perguntasDoEixo : perguntasLegadas, chipsArea);
      };

      navBar.appendChild(btnEixo);
    });

    containerGuia.appendChild(navBar);
    containerGuia.appendChild(chipsArea);
    dom.suggestionsList.appendChild(containerGuia);

    // Renderiza inicialmente o primeiro eixo selecionado
    const perguntasIniciais = (guia && guia[activeSemiologyAxis]) ? guia[activeSemiologyAxis] : perguntasLegadas;
    carregarPerguntasNoEixo(perguntasIniciais, chipsArea);
  }

  function carregarPerguntasNoEixo(listaPerguntas, container) {
    container.innerHTML = '';

    if (!listaPerguntas || listaPerguntas.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--gray, #64748b); font-style: italic; padding: 4px 0;">
          Explore livremente os sintomas do paciente pelo campo de texto abaixo.
        </div>
      `;
      return;
    }

    listaPerguntas.forEach(perguntaTexto => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggestion-chip';
      chip.style.cssText = `
        text-align: left; 
        line-height: 1.3; 
        font-size: 0.8rem; 
        background: #f1f5f9; 
        border: 1px solid #cbd5e1; 
        border-radius: 8px; 
        padding: 6px 10px; 
        color: #1e293b; 
        cursor: pointer; 
        transition: all 0.15s ease;
      `;
      chip.innerHTML = `🗣️ "${perguntaTexto}"`;

      chip.onmouseover = () => {
        chip.style.background = '#e2e8f0';
        chip.style.borderColor = '#94a3b8';
      };
      chip.onmouseout = () => {
        chip.style.background = '#f1f5f9';
        chip.style.borderColor = '#cbd5e1';
      };

      // Ao clicar, transfere para o input com foco imediato
      chip.onclick = () => {
        if (dom.questionInput) {
          dom.questionInput.value = perguntaTexto;
          dom.questionInput.focus();
        }
      };

      container.appendChild(chip);
    });
  }

  // =========================================================
  // 5. EXAMES LABORATORIAIS E COMPLEMENTARES
  // =========================================================

  function renderExamsCatalog() {
    if (!dom.availableExamsList || !dom.releasedExamsList || !currentCase) return;
    dom.availableExamsList.innerHTML = '';
    dom.releasedExamsList.innerHTML = '<div class="empty-state-notice">Nenhum exame solicitado até o momento.</div>';

    (currentCase.examesDisponiveis || []).forEach(exam => {
      const row = document.createElement('div');
      row.className = 'exam-item-row';
      row.id = `exam-row-${exam.id}`;
      row.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 0.9rem;">${exam.nome}</div>
          <small style="color: var(--text-muted, #64748b);">Tempo estimado: +${exam.custoTempoMin} min virtuais</small>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" onclick="ClinicEngine.requestExam('${exam.id}')">Solicitar</button>
      `;
      dom.availableExamsList.appendChild(row);
    });
  }

  function resetChat() {
    if (!dom.chatHistory || !currentCase) return;
    dom.chatHistory.innerHTML = '';
    const initialBubble = document.createElement('div');
    initialBubble.className = 'chat-bubble patient';
    initialBubble.innerHTML = `
      <strong>${currentCase.paciente.nome}:</strong>
      <p>${currentCase.queixaPrincipal}</p>
    `;
    dom.chatHistory.appendChild(initialBubble);
    conversationHistory.push(`Paciente: ${currentCase.queixaPrincipal}`);
  }

  function resetResolutionForm() {
    if (dom.studentDiagnosis) {
      dom.studentDiagnosis.value = '';
      dom.studentDiagnosis.disabled = false;
    }
    if (dom.studentConduct) {
      dom.studentConduct.value = '';
      dom.studentConduct.disabled = false;
    }
    if (dom.submitResolutionBtn) {
      dom.submitResolutionBtn.disabled = false;
      dom.submitResolutionBtn.textContent = '⚖️ Submeter ao Preceptor Avaliador';
    }
  }

  function handleTimeTick() {
    if (!isCaseActive) return;

    elapsedSeconds++;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (dom.timeElapsed) {
      dom.timeElapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (elapsedSeconds > 0 && elapsedSeconds % 60 === 0 && currentCase && currentCase.taxaDecaimento) {
      applyDecay(
        currentCase.taxaDecaimento.vitalidadePorMinuto || 1,
        currentCase.taxaDecaimento.pacienciaPorMinuto || 1
      );
    }
  }

  function applyDecay(deltaVitality, deltaPatience) {
    vitality = Math.max(0, vitality - deltaVitality);
    patience = Math.max(0, patience - deltaPatience);
    updateMetersUI();

    if (vitality <= 0) {
      triggerCriticalOutcome('OBITO');
    } else if (patience <= 0) {
      triggerCriticalOutcome('ABANDONO');
    }
  }

  function updateMetersUI() {
    if (dom.vitalityValue) dom.vitalityValue.textContent = `${Math.round(vitality)}%`;
    if (dom.vitalityFill) {
      dom.vitalityFill.style.width = `${vitality}%`;
      if (vitality > 60) dom.vitalityFill.className = 'meter-fill status-healthy';
      else if (vitality > 25) dom.vitalityFill.className = 'meter-fill status-warning';
      else dom.vitalityFill.className = 'meter-fill status-danger';
    }

    if (dom.patienceValue) dom.patienceValue.textContent = `${Math.round(patience)}%`;
    if (dom.patienceFill) {
      dom.patienceFill.style.width = `${patience}%`;
      if (patience > 50) dom.patienceFill.className = 'meter-fill status-patient';
      else if (patience > 20) dom.patienceFill.className = 'meter-fill status-warning';
      else dom.patienceFill.className = 'meter-fill status-danger';
    }
  }

  // =========================================================
  // 6. RESPOSTA CONTEXTUAL LOCAL (HEURÍSTICA EXPANDIDA)
  // =========================================================

  function gerarRespostaContextualLocal(pergunta) {
    const p = pergunta.toLowerCase().trim();
    const isExigente = currentCase && (
      (currentCase.contextoOculto && String(currentCase.contextoOculto.temperamento).toLowerCase().includes('exigente')) ||
      currentCase.paciente.profissao.toLowerCase().includes('google')
    );

    let prefixo = '';
    if (vitality < 30) {
      prefixo = "(gemendo com dor intensa, voz fraca) ...ai... doutor(a)... ";
    } else if (vitality < 60) {
      prefixo = "(respirando curto e cansado) ...espera um instante... ";
    }

    function registrarIntent(chave) {
      intentHistory[chave] = (intentHistory[chave] || 0) + 1;
      return intentHistory[chave];
    }

    // 1. Paciente querendo receita ou encaminhamento imediato ("Dr. Google" / Exigente)
    if (p.includes('receita') || p.includes('remédio') || p.includes('encaminhamento') || p.includes('antibiótico') || p.includes('passar')) {
      if (isExigente) {
        return `${prefixo}É exatamente por isso que estou aqui! Já li tudo na internet e sei que preciso de um antibiótico forte ou de um especialista. Você vai me examinar direito ou só vai ficar fazendo pergunta?`;
      }
      return `${prefixo}Eu só queria um remédio para parar essa queimação e esse mal-estar no peito, doutor(a)... o que você acha que eu tenho?`;
    }

    // 2. Reação a explicações e empatia ("calma", "explicar", "entender")
    if (p.includes('calma') || p.includes('tranquil') || p.includes('explicar') || p.includes('ajudar') || p.includes('entendo')) {
      patience = Math.min(100, patience + 8);
      vitality = Math.min(100, vitality + 1);
      updateMetersUI();
      if (isExigente) {
        return `${prefixo}Tudo bem... desculpe a pressa, é que estou realmente assustada com essas dores. O que você precisa saber primeiro?`;
      }
      return `${prefixo}Deus te abençoe pela paciência... me sinto mais seguro ouvindo isso. Pode perguntar.`;
    }

    // 3. Investigação de Início e Cronologia (Eixo 1)
    if (p.includes('quando') || p.includes('tempo') || p.includes('horas') || p.includes('começou') || p.includes('início')) {
      registrarIntent('cronologia');
      return `${prefixo}Começou faz umas 3 a 4 horas. No início era só um enjoo estranho, mas depois virou esse aperto forte e uma queimação que não passa.`;
    }

    // 4. Investigação de Farmacoterapia e Medicamentos (Eixo 2)
    if (p.includes('tomou') || p.includes('medicamento') || p.includes('comprimido') || p.includes('dose') || p.includes('quantos')) {
      registrarIntent('remedios');
      if (currentCase && currentCase.contextoOculto && currentCase.contextoOculto.exposicaoReal) {
        return `${prefixo}Olha... eu tomei alguns comprimidos para dor de cabeça hoje cedo. Como não passava, acabei tomando mais uns 4 de uma vez só sem olhar direito a caixa.`;
      }
      return `${prefixo}Tomei meus remédios usuais pela manhã, mas não sei se misturei algo errado...`;
    }

    // 5. Investigação de Exposição a Tóxicos / Venenos (Eixo 3)
    if (p.includes('veneno') || p.includes('produto') || p.includes('química') || p.includes('lavoura') || p.includes('limpeza') || p.includes('cheiro')) {
      registrarIntent('exposicao');
      return `${prefixo}Eu mexi com uns frascos sem luva mais cedo e senti um cheiro bem forte e enjoativo... não sei se respirei aquilo ou se pegou na pele.`;
    }

    // 6. Sinais de Alarme (Eixo 4: Visão, Saliva, Suor, Respiração)
    if (p.includes('visão') || p.includes('vista') || p.includes('saliva') || p.includes('suor') || p.includes('pupila') || p.includes('olho')) {
      registrarIntent('alarme');
      return `${prefixo}Minha vista tá esfumaçada sim! E sinto minha boca com muita salivação, além de um suor frio escorrendo pela testa...`;
    }

    // 7. Ausculta ou Exame Físico pelo Chat
    if (p.includes('auscultar') || p.includes('estetoscópio') || p.includes('pulmão') || p.includes('respirar')) {
      return `${prefixo}Pode encostar o aparelho... <em>[Ausculta Pulmonar: Presença de ruídos adventícios com sibilos e estertores crepitantes esparsos. Frequência respiratória aumentada.]</em>`;
    }

    // Resposta Padrão
    if (isExigente) {
      return `${prefixo}Olha, doutor(a), estou sentindo esse mal-estar todo e quero entender o plano. Vamos pedir algum exame ou você já vai me medicar?`;
    }
    return `${prefixo}Estou me sentindo muito fraco(a)... me dê alguma coisa para aliviar esse aperto, por favor...`;
  }

  // =========================================================
  // 7. SUBMISSÃO DE PERGUNTAS (CHAT INTERATIVO DE ANAMNESE)
  // =========================================================

  async function submitPatientQuestion() {
    if (!dom.questionInput || !isCaseActive || !currentCase) return;

    const text = dom.questionInput.value.trim();
    if (!text) return;

    appendChatBubble('student', 'Você (Estudante)', text);
    dom.questionInput.value = '';
    if (dom.sendQuestionBtn) dom.sendQuestionBtn.disabled = true;

    const typingBubble = appendChatBubble('patient', currentCase.paciente.nome, '<em>Organizando pensamentos e respondendo...</em>');

    let falaObtida = '';
    let apiSucesso = false;

    try {
      const recentHistory = conversationHistory.slice(-4).join('\n');
      const contextoCompleto = {
        casoId: currentCase.id,
        nome: currentCase.paciente.nome,
        idade: currentCase.paciente.idade,
        pacienteProfissao: currentCase.paciente.profissao,
        exposicaoReal: currentCase.contextoOculto ? currentCase.contextoOculto.exposicaoReal : '',
        sintomas: currentCase.contextoOculto ? currentCase.contextoOculto.sintomas : '',
        temperamento: currentCase.contextoOculto ? currentCase.contextoOculto.temperamento : '',
        nivelConsciencia: currentCase.contextoOculto ? currentCase.contextoOculto.nivelConsciencia : 'Lúcido',
        sinaisVitais: currentCase.sinaisVitais,
        vitalidadeAtual: Math.round(vitality),
        pacienciaAtual: Math.round(patience),
        examesJaLiberados: requestedExams
      };

      if (typeof ApiService !== 'undefined' && typeof ApiService.conversarComPaciente === 'function') {
        const response = await ApiService.conversarComPaciente(
          currentCase.id,
          text,
          recentHistory,
          contextoCompleto
        );

        if (response && response.sucesso && response.falaPaciente && response.falaPaciente.trim().length > 0) {
          falaObtida = response.falaPaciente.trim();
          apiSucesso = true;
        }
      }
    } catch (apiError) {
      console.warn('[ClinicEngine] API indisponível, usando contingência local:', apiError);
    }

    if (!apiSucesso || !falaObtida) {
      falaObtida = gerarRespostaContextualLocal(text);
    }

    typingBubble.remove();
    appendChatBubble('patient', currentCase.paciente.nome, falaObtida);
    conversationHistory.push(`Estudante: ${text}`);
    conversationHistory.push(`Paciente: ${falaObtida}`);

    // Dinâmica de paciência: perguntas longas ou repetitivas diminuem um pouco a paciência em emergências
    if (currentCase.tipo === 'emergencia') {
      patience = Math.max(0, patience - 1);
    }
    updateMetersUI();

    if (dom.sendQuestionBtn) dom.sendQuestionBtn.disabled = false;
    if (dom.chatHistory) dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
  }

  function appendChatBubble(role, author, text) {
    if (!dom.chatHistory) return null;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = `<strong>${author}:</strong><p>${text}</p>`;
    dom.chatHistory.appendChild(bubble);
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
    return bubble;
  }

  // =========================================================
  // 8. SOLICITAÇÃO DE EXAMES E DESFECHOS CRÍTICOS
  // =========================================================

  function requestExam(examId) {
    if (!isCaseActive || !currentCase) return;

    const exam = (currentCase.examesDisponiveis || []).find(e => e.id === examId);
    if (!exam || requestedExams.includes(examId)) return;

    requestedExams.push(examId);

    const row = document.getElementById(`exam-row-${examId}`);
    if (row) {
      const btn = row.querySelector('button');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Solicitado';
      }
    }

    elapsedSeconds += (exam.custoTempoMin || 5) * 60;
    applyDecay(Math.abs(exam.impactoVitalidade || 0), Math.abs(exam.impactoPaciencia || 0));

    const emptyNotice = dom.releasedExamsList?.querySelector('.empty-state-notice');
    if (emptyNotice) emptyNotice.remove();

    const examCard = document.createElement('div');
    examCard.className = 'released-exam-card';
    examCard.innerHTML = `
      <h5>📋 ${exam.nome}</h5>
      <p>${exam.resultado}</p>
    `;
    dom.releasedExamsList?.appendChild(examCard);

    if (exam.essencial) {
      appendChatBubble('patient', 'Enfermagem do Leito', `O laudo do exame <strong>${exam.nome}</strong> acabou de chegar da bancada e foi liberado na aba de Exames.`);
    }
  }

  function triggerCriticalOutcome(outcomeType) {
    isCaseActive = false;
    clearInterval(clockInterval);
    caseOutcome = outcomeType;

    if (dom.studentDiagnosis) dom.studentDiagnosis.disabled = true;
    if (dom.studentConduct) dom.studentConduct.disabled = true;
    if (dom.submitResolutionBtn) dom.submitResolutionBtn.disabled = true;

    if (outcomeType === 'OBITO') {
      alert('DESFECHO CRÍTICO: O paciente evoluiu para colapso clínico irreversível por falta de suporte terapêutico e antídotos em tempo hábil.');
    } else if (outcomeType === 'ABANDONO') {
      alert('DESFECHO CLÍNICO: O paciente esgotou a paciência com o atendimento prolongado ou falta de clareza e optou por evadir da unidade.');
    }

    finalizeClinicalCase();
  }

  // =========================================================
  // 9. FECHAMENTO DE CASO & AVALIAÇÃO DO PRECEPTOR
  // =========================================================

  async function finalizeClinicalCase() {
    if (!isCaseActive && caseOutcome === 'EM_ANDAMENTO') return;

    isCaseActive = false;
    clearInterval(clockInterval);

    if (dom.submitResolutionBtn) {
      dom.submitResolutionBtn.disabled = true;
      dom.submitResolutionBtn.textContent = 'Avaliando com o Preceptor...';
    }

    const diagnosis = dom.studentDiagnosis?.value.trim() || 'Não informado pelo estudante.';
    const conduct = dom.studentConduct?.value.trim() || 'Não informada pelo estudante.';

    const payload = {
      gabarito: currentCase.gabaritoPreceptor,
      diagnosticoAluno: diagnosis,
      condutaAluno: conduct,
      examesSolicitados: requestedExams,
      desfecho: (caseOutcome === 'EM_ANDAMENTO') ? 'CONCLUIDO' : caseOutcome,
      tempoSegundos: elapsedSeconds
    };

    const session = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
    const identifier = session.identifier || 'ANONIMO';

    try {
      if (typeof ApiService !== 'undefined' && typeof ApiService.avaliarCondutaPreceptor === 'function') {
        const response = await ApiService.avaliarCondutaPreceptor(identifier, currentCase.id, payload);
        if (response && response.sucesso && response.resultado) {
          registrarCasoResolvido(currentCase.id);
          showPreceptorModal(response.resultado, payload.desfecho);
          return;
        }
      }
      registrarCasoResolvido(currentCase.id);
      avaliarCondutaLocalmente(payload);
    } catch (err) {
      console.warn('[ClinicEngine] Preceptor online indisponível. Avaliando localmente:', err);
      registrarCasoResolvido(currentCase.id);
      avaliarCondutaLocalmente(payload);
    } finally {
      if (dom.submitResolutionBtn) {
        dom.submitResolutionBtn.textContent = '⚖️ Submeter ao Preceptor Avaliador';
      }
    }
  }

  function registrarCasoResolvido(caseId) {
    const resolvidos = JSON.parse(localStorage.getItem('laift_resolved_cases') || '[]');
    if (!resolvidos.includes(caseId)) {
      resolvidos.push(caseId);
      localStorage.setItem('laift_resolved_cases', JSON.stringify(resolvidos));
    }
  }

  function avaliarCondutaLocalmente(dados) {
    const gab = (currentCase && currentCase.gabaritoPreceptor) ? currentCase.gabaritoPreceptor : {};
    const diagAluno = (dados.diagnosticoAluno || '').toLowerCase();
    const condAluno = (dados.condutaAluno || '').toLowerCase();

    const palavras = gab.palavrasChave || [];
    let acertos = 0;

    palavras.forEach(p => {
      const termo = p.toLowerCase();
      if (diagAluno.includes(termo) || condAluno.includes(termo)) {
        acertos++;
      }
    });

    const proporcao = (palavras.length > 0) ? (acertos / palavras.length) : 0.5;
    let nota = Math.round(proporcao * 80) + 15;

    if (dados.desfecho === 'OBITO') nota = Math.min(25, nota);
    if (dados.desfecho === 'ABANDONO') nota = Math.min(40, nota);

    const acertouDiag = proporcao >= 0.40;

    const resultadoLocal = {
      nota: Math.min(100, Math.max(10, nota)),
      acertouDiagnostico: acertouDiag,
      parecer: `Avaliação pedagógica LAIFT. O diagnóstico formulado foi ${acertouDiag ? 'compatível com o quadro clínico real' : 'divergente do gabarito oficial'}. ${dados.desfecho === 'OBITO' ? 'Atenção imediata à administração de antídotos em quadros toxicológicos críticos.' : 'Recomenda-se aprofundar a correlação semiológica e os protocolos de farmacoterapia de suporte.'}`,
      pontosCriticos: [
        `Diagnóstico oficial esperado: ${gab.diagnostico || 'Não cadastrado'}`,
        `Conduta primordial recomendada: ${gab.conduta || 'Não cadastrada'}`
      ]
    };

    showPreceptorModal(resultadoLocal, dados.desfecho);
  }

  function showPreceptorModal(result, desfecho) {
    if (dom.preceptorGrade) dom.preceptorGrade.textContent = result.nota || '--';
    if (dom.caseOutcomeTitle) {
      dom.caseOutcomeTitle.textContent = (desfecho === 'CONCLUIDO')
        ? 'Atendimento Finalizado'
        : (desfecho === 'OBITO') ? 'Desfecho Crítico: Óbito' : 'Desfecho: Abandono da Consulta';
    }

    if (dom.caseOutcomeSummary) {
      dom.caseOutcomeSummary.textContent = result.acertouDiagnostico
        ? 'Hipótese diagnóstica assertiva e condizente com o gabarito.'
        : 'Hipótese diagnóstica com divergências técnicas importantes.';
    }

    if (dom.preceptorFeedbackText) {
      dom.preceptorFeedbackText.innerHTML = `
        <p style="margin-bottom: 12px; line-height: 1.5;">${result.parecer}</p>
        ${(result.pontosCriticos && result.pontosCriticos.length > 0) ? `
          <strong>Orientações Técnicas do Preceptor:</strong>
          <ul style="margin-left: 20px; margin-top: 8px;">
            ${result.pontosCriticos.map(p => `<li style="margin-bottom: 4px;">${p}</li>`).join('')}
          </ul>
        ` : ''}
      `;
    }

    dom.preceptorModal?.classList.add('active');
  }

  function switchTab(tabId) {
    dom.tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    dom.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
  }

  // =========================================================
  // 10. INICIALIZAÇÃO E OUVINTES DE EVENTOS
  // =========================================================

  function init() {
    initDomReferences();

    dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    dom.sendQuestionBtn?.addEventListener('click', submitPatientQuestion);
    dom.questionInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPatientQuestion();
    });
  }

  return {
    init,
    showBedsDashboard,
    renderBedsGrid,
    openBed,
    returnToBeds,
    solicitarCasoProcedural,
    startCase,
    requestExam,
    switchTab,
    submitPatientQuestion,
    finalizeClinicalCase,
    renderSemiologyGuide
  };
})();

// Declarações globais para suportar chamadas inline no HTML
window.submitPatientQuestion = ClinicEngine.submitPatientQuestion;
window.finalizeClinicalCase = ClinicEngine.finalizeClinicalCase;
window.ClinicEngine = ClinicEngine;

// Inicializa automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ClinicEngine.init);
} else {
  ClinicEngine.init();
}

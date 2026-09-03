/**
 * MOTOR DA CLÍNICA MÉDICA VIRTUAL (OSCE MULTIPACIENTE & PLANTÃO LAIFT)
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const ClinicEngine = (() => {
  let currentCase = null;
  let vitality = 100;
  let patience = 100;
  let elapsedSeconds = 0;
  let clockInterval = null;
  let isCaseActive = false;
  let conversationHistory = [];
  let requestedExams = [];
  let intentHistory = {};
  let caseOutcome = 'EM_ANDAMENTO';

  // Cache dos elementos do DOM
  const dom = {};

  function initDomReferences() {
    dom.patientName = document.getElementById('clinicPatientName');
    dom.patientMeta = document.getElementById('clinicPatientMeta');
    dom.vitalityValue = document.getElementById('vitalityValue');
    dom.vitalityFill = document.getElementById('vitalityFill');
    dom.patienceValue = document.getElementById('patienceValue');
    dom.patienceFill = document.getElementById('patienceFill');
    dom.timeElapsed = document.getElementById('clinicTimeElapsed');

    // Navegação de Telas do Módulo Clínico
    dom.dashboardView = document.getElementById('clinicDashboardView');
    dom.workspaceView = document.getElementById('clinicWorkspaceView');
    dom.bedsGrid = document.getElementById('patientBedsGrid');

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

    // Diálogo / Anamnese
    dom.chatHistory = document.getElementById('chatHistory');
    dom.chatInitialGreeting = document.getElementById('chatInitialGreeting');
    dom.suggestionsList = document.getElementById('suggestionsList');
    dom.questionInput = document.getElementById('patientQuestionInput');
    dom.sendQuestionBtn = document.getElementById('sendQuestionBtn');

    // Exames
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
  // GESTÃO DA GRADE DE LEITOS (PLANTÃO)
  // =========================================================

  function renderBedsGrid() {
    initDomReferences();
    if (!dom.bedsGrid) return;

    dom.bedsGrid.innerHTML = '';

    if (typeof clinicalCases === 'undefined' || !Array.isArray(clinicalCases) || clinicalCases.length === 0) {
      dom.bedsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray);">
          <h3>Nenhum paciente cadastrado no momento.</h3>
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
      const queixa = c.queixaPrincipal ? (c.queixaPrincipal.length > 80 ? c.queixaPrincipal.substring(0, 80) + '...' : c.queixaPrincipal) : 'Sem queixa registrada';

      card.innerHTML = `
        <div class="bed-header">
          <span class="bed-tag">${c.tipo === 'emergencia' ? '🚨 Emergência' : '🩺 Ambulatório'}</span>
          <span class="bed-status" style="font-weight: bold; color: ${isConcluido ? 'var(--success)' : 'var(--primary)'};">
            ${isConcluido ? '✅ Concluído' : '🟡 Aguardando'}
          </span>
        </div>
        <h4 style="margin: 8px 0 4px; font-size: 1.15rem; color: var(--primary);">Leito 0${index + 1}: ${nome}</h4>
        <p class="bed-complaint" style="font-style: italic; color: #475569; margin-bottom: 12px; min-height: 44px;">"${queixa}"</p>
        <div class="bed-meta" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray); border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 14px;">
          <span>Idade: <strong>${idade} anos</strong></span>
          <span>Dificuldade: <strong>${c.dificuldade || 'Média'}</strong></span>
        </div>
        <button class="btn btn-primary" style="width: 100%;" type="button" onclick="ClinicEngine.openBed('${c.id}')">
          ${isConcluido ? '🔄 Reatender Paciente' : '🩺 Assumir Atendimento'}
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
      if (!confirm('Deseja pausar o atendimento atual e retornar ao painel de leitos?')) return;
      clearInterval(clockInterval);
      isCaseActive = false;
    }
    showBedsDashboard();
  }

  async function solicitarCasoProcedural() {
    const topico = prompt(
      'Digite o tema clínico ou toxicológico que deseja treinar:\n(Ex: Intoxicação por Chumbo, Picada de Escorpião, Paracetamol, Monóxido de Carbono)',
      'Intoxicação por Praguicidas'
    );
    if (!topico || !topico.trim()) return;

    if (typeof showStatus === 'function') {
      showStatus('Sintetizando novo caso clínico com IA...', 'loading');
    }

    try {
      let res = null;
      if (typeof ApiService !== 'undefined' && typeof ApiService.gerarCasoProcedural === 'function') {
        res = await ApiService.gerarCasoProcedural(topico.trim(), 'Avançado');
      }

      if (typeof hideStatus === 'function') hideStatus();

      if (res && res.sucesso && res.caso) {
        clinicalCases.push(res.caso);
        renderBedsGrid();
        alert(`✅ Caso criado com sucesso: ${res.caso.paciente.nome} (${res.caso.titulo})!`);
        openBed(res.caso.id);
        return;
      }
      
      throw new Error((res && res.mensagem) || 'Falha no retorno da API');
    } catch (err) {
      if (typeof hideStatus === 'function') hideStatus();
      console.warn('[ClinicEngine] Acionando síntese local de contingência:', err);

      // Gerador Local Dinâmico para nunca travar a aula
      const casoBackup = gerarCasoLocalContingencia(topico.trim());
      clinicalCases.push(casoBackup);
      renderBedsGrid();
      alert(`⚡ Caso gerado pelo simulador local: ${casoBackup.paciente.nome} (${casoBackup.titulo})!`);
      openBed(casoBackup.id);
    }
  }

  function gerarCasoLocalContingencia(tema) {
    const idUnico = 'caso_proc_' + Date.now();
    return {
      id: idUnico,
      titulo: `Caso Simulado: ${tema}`,
      tipo: "emergencia",
      dificuldade: "Avançado",
      vitalidadeInicial: 85,
      pacienciaInicial: 80,
      taxaDecaimento: { vitalidadePorMinuto: 2, pacienciaPorMinuto: 1 },
      paciente: {
        nome: "Valdir Monteiro",
        idade: 48,
        peso: "76 kg",
        profissao: "Autônomo",
        alergias: "Nega alergias conhecidas",
        imagem: "🧑"
      },
      queixaPrincipal: `Doutor(a)... passei mal de repente depois que tive contato com ${tema}... tô zonzo e com falta de ar.`,
      historicoAdmissao: `Admitido na emergência com relato de exposição aguda a ${tema}. Apresenta mal-estar súbito, astenia e alterações nos sinais vitais.`,
      sinaisVitais: { pa: "100/65 mmHg", fc: "96 bpm", fr: "22 irpm", temp: "36.7 °C", spo2: "93%", glasgow: "15" },
      contextoOculto: {
        nome: "Valdir",
        idade: 48,
        pacienteProfissao: "Autônomo",
        exposicaoReal: `Exposição recente e desprotegida a ${tema}.`,
        sintomas: "tontura forte, fraqueza no corpo, sensação de peito pesado",
        comportamento: "Assustado, colaborativo, buscando socorro imediato."
      },
      perguntasSugeridas: [
        "Há quanto tempo ocorreu o contato com a substância?",
        "Quais foram os primeiros sintomas que o senhor sentiu?",
        "O senhor utilizava algum equipamento de proteção?"
      ],
      examesDisponiveis: [
        { id: "lab_triagem", nome: "Triagem Toxicológica e Bioquímica Geral", custoTempoMin: 15, impactoVitalidade: 0, impactoPaciencia: -1, essencial: true, resultado: `Alterações metabólicas sugestivas de intoxicação por ${tema}.` },
        { id: "gasometria_base", nome: "Gasometria Arterial e Eletrólitos", custoTempoMin: 8, impactoVitalidade: 0, impactoPaciencia: -1, essencial: true, resultado: "Acidose metabólica discreta com gasometria compensada." }
      ],
      gabaritoPreceptor: {
        diagnostico: `Intoxicação Exógena / Agravo Clínico compatível com ${tema}`,
        conduta: "Estabilização clínica ABCDE, afastamento da fonte de exposição, medidas de descontaminação e suporte farmacológico específico.",
        palavrasChave: ["estabilização", "suporte", "descontaminação", tema.toLowerCase()]
      }
    };
  }

  // =========================================================
  // ATENDIMENTO CLÍNICO DO LEITO ATIVO
  // =========================================================

  function startCase(caseId) {
    initDomReferences();

    const selected = (typeof clinicalCases !== 'undefined' && Array.isArray(clinicalCases))
      ? (clinicalCases.find(c => c.id === caseId) || clinicalCases[0])
      : null;

    if (!selected) {
      console.error('[ClinicEngine] Nenhum caso clínico localizado.');
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

    clearInterval(clockInterval);
    renderPatientProfile();
    renderVitals();
    renderSuggestions();
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
        <p style="margin-bottom: 8px;"><strong>Admissão:</strong> ${currentCase.historicoAdmissao}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);"><strong>Alergias Relatadas:</strong> ${currentCase.paciente.alergias}</p>
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

  function renderSuggestions() {
    if (!dom.suggestionsList || !currentCase) return;
    dom.suggestionsList.innerHTML = '';

    (currentCase.perguntasSugeridas || []).forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.type = 'button';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        if (dom.questionInput) {
          dom.questionInput.value = suggestion;
          submitPatientQuestion();
        }
      });
      dom.suggestionsList.appendChild(chip);
    });
  }

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
          <small style="color: var(--text-muted);">Tempo estimado: +${exam.custoTempoMin} min virtuais</small>
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
    }
  }

  // =========================================================
  // MOTOR HEURÍSTICO LOCAL (CONTINGÊNCIA)
  // =========================================================

  function gerarRespostaContextualLocal(pergunta) {
    const p = pergunta.toLowerCase().trim();
    const casoId = currentCase ? currentCase.id : '';
    const isEmergencia = currentCase ? currentCase.tipo === 'emergencia' : true;

    let prefixo = '';
    if (vitality < 30) {
      prefixo = isEmergencia
        ? "(falando com imenso esforço, engasgando na saliva) ...ai... d-doutor... "
        : "(voz fraca e arrastada) ...doutor(a)... tá difícil falar... ";
    } else if (vitality < 60) {
      prefixo = isEmergencia
        ? "(respirando curto e tossindo) ...espera... "
        : "(suspirando de dor) ...ai, meu Deus... ";
    }

    function registrarIntent(chave) {
      intentHistory[chave] = (intentHistory[chave] || 0) + 1;
      return intentHistory[chave];
    }

    // 1. Identificação / Nome
    if (p.includes('seu nome') || p.includes('quem é você') || p.includes('como se chama') || p.includes('quem é o senhor')) {
      const vez = registrarIntent('nome');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}Meu nome é Agenor... Agenor Silveira... trabalho como diarista na lavoura de milho...`
          : `${prefixo}É Agenor Silveira, doutor... minha cabeça tá confusa, mas é esse meu nome.`;
      }
      return `${prefixo}Me chamo ${currentCase.paciente.nome}, doutor(a)...`;
    }

    // 2. Exame Físico pelo Chat
    if (p.includes('auscultar') || p.includes('estetoscópio') || p.includes('ouvir seu peito') || p.includes('ouvir o pulmão') || p.includes('respirar fundo')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Pode colocar o aparelho... mas não consigo puxar o ar fundo sem engasgar... <em>[Ausculta pulmonar: Roncos difusos, sibilos disseminados bilaterais e fervilhar de estertores crepitantes em ambas as bases pulmonares (broncorreia severa).]</em>`;
      }
      return `${prefixo}Pode ouvir sim, doutor(a)... <em>[Ausculta pulmonar: Murmúrio vesicular presente e simétrico, sem ruídos adventícios no momento.]</em>`;
    }

    if (p.includes('olhar o olho') || p.includes('olhar sua pupila') || p.includes('pupila') || p.includes('lanterna') || p.includes('olhos')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}A luz dói, doutor... tá tudo escuro e fechado ao meu redor... <em>[Exame ocular: Miose bilateral puntiforme extrema ('em cabeça de alfinete') e hiporreativa à luz.]</em>`;
      }
      return `${prefixo}Pode olhar... sinto minhas vistas pesadas de cansaço... <em>[Exame ocular: Pupilas isocóricas e fotorreagentes, escleras anictéricas.]</em>`;
    }

    // 3. Dor e Sintomas
    if (p.includes('dor') || p.includes('dói') || p.includes('doendo') || p.includes('onde dói') || p.includes('sente dor')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}O que mais dói é esse aperto no peito, parece que sentaram no meu tórax! E a cabeça tá estourando de pontada com a vista escura.`;
      }
      return `${prefixo}Dói o corpo inteiro, doutor(a)... uma queimação pesada e insuportável nos músculos.`;
    }

    // 4. Veneno / Remédios
    if (p.includes('veneno') || p.includes('produto') || p.includes('química') || p.includes('lavoura') || p.includes('inseticida')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Eu tava borrifando veneno de matar lagarta no milho com a bomba costal. Tinha um cheiro muito forte e enjoativo, parecendo alho podre!`;
      }
      return `${prefixo}Eu não mexo com veneno de lavoura não, doutor...`;
    }

    if (p.includes('remédio') || p.includes('medicamento') || p.includes('tomou') || p.includes('toma')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Não tomei nenhum remédio hoje não, senhor(a)... só tomei café puro de manhã antes de pegar a enxada.`;
      }
      if (casoId === 'caso_clin_02') {
        return `${prefixo}Tomo Sinvastatina de 40mg toda noite por causa do colesterol faz anos... e semana passada o médico do posto me deu Claritromicina de 500mg pro peito. Tomei os dois juntos.`;
      }
      return `${prefixo}Tomei os remédios que me receitaram normalmente...`;
    }

    // 5. Acolhimento
    if (p.includes('calma') || p.includes('tranquilo') || p.includes('vai passar') || p.includes('estamos aqui') || p.includes('ajudar')) {
      patience = Math.min(100, patience + 6);
      vitality = Math.min(100, vitality + 1);
      updateMetersUI();
      return isEmergencia
        ? `${prefixo}Deus abençoe vocês... tô confiando no senhor(a)... mas me dá logo um remédio que sinto meu peito fechando...`
        : `${prefixo}Muito obrigada pela atenção e paciência, doutor(a)... me sinto mais segura ouvindo isso.`;
    }

    // Resposta Padrão
    if (isEmergencia) {
      return `${prefixo}Doutor(a)... tá tudo escurecendo na minha vista, tô afogando nessa saliva e meu peito tá apertado... me ajuda logo, por favor!`;
    }
    return `${prefixo}Doutor(a), tô assustada com esse corpo mole e essa fraqueza... me ajuda a descobrir o que tá acontecendo comigo?`;
  }

  // =========================================================
  // SUBMISSÃO DE PERGUNTAS (CHAT ANAMNESE)
  // =========================================================

  async function submitPatientQuestion() {
    if (!dom.questionInput || !isCaseActive || !currentCase) return;

    const text = dom.questionInput.value.trim();
    if (!text) return;

    appendChatBubble('student', 'Você (Estudante)', text);
    dom.questionInput.value = '';
    if (dom.sendQuestionBtn) dom.sendQuestionBtn.disabled = true;

    const typingBubble = appendChatBubble('patient', currentCase.paciente.nome, '<em>Tentando respirar e responder...</em>');

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
        comportamento: currentCase.contextoOculto ? currentCase.contextoOculto.comportamento : '',
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
      console.warn('[ClinicEngine] API indisponível, usando contingência:', apiError);
    }

    if (!apiSucesso || !falaObtida) {
      falaObtida = gerarRespostaContextualLocal(text);
    }

    typingBubble.remove();
    appendChatBubble('patient', currentCase.paciente.nome, falaObtida);
    conversationHistory.push(`Estudante: ${text}`);
    conversationHistory.push(`Paciente: ${falaObtida}`);

    if (currentCase.tipo === 'ambulatorio') {
      patience = Math.min(100, patience + 1);
    } else {
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
  // EXAMES E FECHAMENTO
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
      appendChatBubble('patient', 'Enfermagem do Leito', `O laudo do exame <strong>${exam.nome}</strong> acabou de chegar da bancada e foi anexado à aba de Exames.`);
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
      alert('DESFECHO CRÍTICO: O paciente evoluiu para colapso cardiorrespiratório irreversível por falta de conduta farmacológica em tempo hábil.');
    } else if (outcomeType === 'ABANDONO') {
      alert('DESFECHO CLÍNICO: O paciente ficou angustiado ou exausto com a condução da consulta e abandonou o atendimento.');
    }

    finalizeClinicalCase();
  }

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

    if (dados.desfecho === 'OBITO') nota = Math.min(30, nota);
    if (dados.desfecho === 'ABANDONO') nota = Math.min(45, nota);

    const acertouDiag = proporcao >= 0.40;

    const resultadoLocal = {
      nota: Math.min(100, Math.max(10, nota)),
      acertouDiagnostico: acertouDiag,
      parecer: `Avaliação pedagógica LAIFT. O diagnóstico formulado foi ${acertouDiag ? 'compatível com o quadro toxicológico real' : 'divergente do gabarito oficial'}. ${dados.desfecho === 'OBITO' ? 'Atenção redobrada à titulação imediata de antídotos em emergências respiratórias.' : 'Recomenda-se revisar as dosagens e mecanismos dos antídotos específicos.'}`,
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
        ? 'Hipótese diagnóstica assertiva e condizente.'
        : 'Hipótese diagnóstica com divergências técnicas.';
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

  // =========================================================
  // EXPOSIÇÃO PÚBLICA DO MÓDULO (TODAS AS FUNÇÕES EXPORTADAS)
  // =========================================================
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
    finalizeClinicalCase
  };
})();

// Declarações globais para suporte aos atributos inline do HTML
window.submitPatientQuestion = ClinicEngine.submitPatientQuestion;
window.finalizeClinicalCase = ClinicEngine.finalizeClinicalCase;
window.ClinicEngine = ClinicEngine;

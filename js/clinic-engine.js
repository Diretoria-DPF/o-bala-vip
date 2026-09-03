/**
 * MOTOR DA CLÍNICA MÉDICA VIRTUAL (OSCE COM GEMINI)
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
  let caseOutcome = 'EM_ANDAMENTO'; // 'EM_ANDAMENTO' | 'CONCLUIDO' | 'OBITO' | 'ABANDONO'

  // Cache de elementos do DOM
  const dom = {};

  function initDomReferences() {
    dom.patientName = document.getElementById('clinicPatientName');
    dom.patientMeta = document.getElementById('clinicPatientMeta');
    dom.vitalityValue = document.getElementById('vitalityValue');
    dom.vitalityFill = document.getElementById('vitalityFill');
    dom.patienceValue = document.getElementById('patienceValue');
    dom.patienceFill = document.getElementById('patienceFill');
    dom.timeElapsed = document.getElementById('clinicTimeElapsed');
    
    // Abas
    dom.tabButtons = document.querySelectorAll('.clinic-tab-btn');
    dom.tabPanes = document.querySelectorAll('.clinic-tab-pane');
    
    // Prontuário
    dom.chiefComplaint = document.getElementById('clinicChiefComplaint');
    dom.patientHistory = document.getElementById('clinicPatientHistory');
    dom.vitalPA = document.getElementById('vitalPA');
    dom.vitalFC = document.getElementById('vitalFC');
    dom.vitalFR = document.getElementById('vitalFR');
    dom.vitalTemp = document.getElementById('vitalTemp');
    dom.vitalSpO2 = document.getElementById('vitalSpO2');
    dom.vitalGlasgow = document.getElementById('vitalGlasgow');
    
    // Diálogo / Chat
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

  function startCase(caseId) {
    const selected = clinicalCases.find(c => c.id === caseId) || clinicalCases[0];
    currentCase = selected;
    
    vitality = selected.vitalidadeInicial;
    patience = selected.pacienciaInicial;
    elapsedSeconds = 0;
    conversationHistory = [];
    requestedExams = [];
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
    dom.patientName.textContent = currentCase.paciente.nome;
    dom.patientMeta.textContent = `${currentCase.paciente.idade} anos | ${currentCase.paciente.profissao} | Peso: ${currentCase.paciente.peso}`;
    dom.chiefComplaint.textContent = `"${currentCase.queixaPrincipal}"`;
    dom.patientHistory.innerHTML = `
      <p style="margin-bottom: 8px;"><strong>Admissão:</strong> ${currentCase.historicoAdmissao}</p>
      <p style="font-size: 0.85rem; color: var(--text-muted);"><strong>Alergias Relatadas:</strong> ${currentCase.paciente.alergias}</p>
    `;
  }

  function renderVitals() {
    const v = currentCase.sinaisVitais;
    dom.vitalPA.textContent = v.pa;
    dom.vitalFC.textContent = v.fc;
    dom.vitalFR.textContent = v.fr;
    dom.vitalTemp.textContent = v.temp;
    dom.vitalSpO2.textContent = v.spo2;
    dom.vitalGlasgow.textContent = v.glasgow;
  }

  function renderSuggestions() {
    dom.suggestionsList.innerHTML = '';
    currentCase.perguntasSugeridas.forEach(suggestion => {
      const chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.type = 'button';
      chip.textContent = suggestion;
      chip.addEventListener('click', () => {
        dom.questionInput.value = suggestion;
        submitPatientQuestion();
      });
      dom.suggestionsList.appendChild(chip);
    });
  }

  function renderExamsCatalog() {
    dom.availableExamsList.innerHTML = '';
    dom.releasedExamsList.innerHTML = '<div class="empty-state-notice">Nenhum exame solicitado até o momento.</div>';

    currentCase.examesDisponiveis.forEach(exam => {
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
    dom.studentDiagnosis.value = '';
    dom.studentConduct.value = '';
    dom.studentDiagnosis.disabled = false;
    dom.studentConduct.disabled = false;
    dom.submitResolutionBtn.disabled = false;
  }

  function handleTimeTick() {
    if (!isCaseActive) return;

    elapsedSeconds++;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    dom.timeElapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Decaimento biológico e comportamental a cada 60 segundos decorridos
    if (elapsedSeconds > 0 && elapsedSeconds % 60 === 0) {
      applyDecay(
        currentCase.taxaDecaimento.vitalidadePorMinuto,
        currentCase.taxaDecaimento.pacienciaPorMinuto
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
    dom.vitalityValue.textContent = `${Math.round(vitality)}%`;
    dom.vitalityFill.style.width = `${vitality}%`;
    
    if (vitality > 60) {
      dom.vitalityFill.className = 'meter-fill status-healthy';
    } else if (vitality > 25) {
      dom.vitalityFill.className = 'meter-fill status-warning';
    } else {
      dom.vitalityFill.className = 'meter-fill status-danger';
    }

    dom.patienceValue.textContent = `${Math.round(patience)}%`;
    dom.patienceFill.style.width = `${patience}%`;
  }

  async function submitPatientQuestion() {
    const text = dom.questionInput.value.trim();
    if (!text || !isCaseActive) return;

    // Renderiza pergunta do aluno na tela
    appendChatBubble('student', 'Você (Estudante)', text);
    dom.questionInput.value = '';
    dom.sendQuestionBtn.disabled = true;

    // Adiciona placeholder visual de digitação
    const typingBubble = appendChatBubble('patient', currentCase.paciente.nome, 'Pensando e tentando responder...');

    try {
      const recentHistory = conversationHistory.slice(-4).join('\n');
      const response = await ApiService.conversarComPaciente(
        currentCase.id,
        text,
        recentHistory,
        currentCase.contextoOculto
      );

      typingBubble.remove();

      if (response.sucesso && response.falaPaciente) {
        appendChatBubble('patient', currentCase.paciente.nome, response.falaPaciente);
        conversationHistory.push(`Estudante: ${text}`);
        conversationHistory.push(`Paciente: ${response.falaPaciente}`);
        
        // Pequeno ganho de confiança se estiver no ambulatório
        if (currentCase.tipo === 'ambulatorio') {
          patience = Math.min(100, patience + 1);
        }
      } else {
        appendChatBubble('patient', currentCase.paciente.nome, 'Doutor(a)... não entendi direito, minha cabeça dói muito...');
      }
    } catch (error) {
      typingBubble.remove();
      appendChatBubble('patient', currentCase.paciente.nome, 'O paciente geme de dor e não consegue falar no momento.');
    } finally {
      dom.sendQuestionBtn.disabled = false;
      dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
    }
  }

  function appendChatBubble(role, author, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = `<strong>${author}:</strong><p>${text}</p>`;
    dom.chatHistory.appendChild(bubble);
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
    return bubble;
  }

  function requestExam(examId) {
    if (!isCaseActive) return;

    const exam = currentCase.examesDisponiveis.find(e => e.id === examId);
    if (!exam || requestedExams.includes(examId)) return;

    requestedExams.push(examId);

    // Desativa o botão do catálogo
    const row = document.getElementById(`exam-row-${examId}`);
    if (row) {
      const btn = row.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Solicitado';
    }

    // Aplica penalidades de tempo e medidores
    elapsedSeconds += exam.custoTempoMin * 60;
    applyDecay(Math.abs(exam.impactoVitalidade), Math.abs(exam.impactoPaciencia));

    // Remove placeholder se for o primeiro exame
    const emptyNotice = dom.releasedExamsList.querySelector('.empty-state-notice');
    if (emptyNotice) emptyNotice.remove();

    // Renderiza laudo liberado
    const examCard = document.createElement('div');
    examCard.className = 'released-exam-card';
    examCard.innerHTML = `
      <h5>📋 ${exam.nome}</h5>
      <p>${exam.resultado}</p>
    `;
    dom.releasedExamsList.appendChild(examCard);
  }

  function triggerCriticalOutcome(outcomeType) {
    isCaseActive = false;
    clearInterval(clockInterval);
    caseOutcome = outcomeType;

    dom.studentDiagnosis.disabled = true;
    dom.studentConduct.disabled = true;
    dom.submitResolutionBtn.disabled = true;

    if (outcomeType === 'OBITO') {
      alert('CRÍTICO: O paciente evoluiu para colapso cardiorrespiratório irreversível devido à deterioração biológica.');
    } else if (outcomeType === 'ABANDONO') {
      alert('ATENÇÃO: O paciente ficou insatisfeito com a condução da consulta e retirou-se do ambulatório.');
    }

    finalizeClinicalCase();
  }

  async function finalizeClinicalCase() {
    if (!isCaseActive && caseOutcome === 'EM_ANDAMENTO') return;

    isCaseActive = false;
    clearInterval(clockInterval);

    dom.submitResolutionBtn.disabled = true;
    dom.submitResolutionBtn.textContent = 'Avaliando com o Preceptor...';

    const diagnosis = dom.studentDiagnosis.value.trim() || 'Não informado pelo estudante.';
    const conduct = dom.studentConduct.value.trim() || 'Não informada pelo estudante.';

    const payload = {
      gabarito: currentCase.gabaritoPreceptor,
      diagnosticoAluno: diagnosis,
      condutaAluno: conduct,
      examesSolicitados: requestedExams,
      desfecho: caseOutcome === 'EM_ANDAMENTO' ? 'CONCLUIDO' : caseOutcome,
      tempoSegundos: elapsedSeconds
    };

    const session = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
    const identifier = session.identifier || 'ANONIMO';

    try {
      const response = await ApiService.avaliarCondutaPreceptor(identifier, currentCase.id, payload);
      
      if (response.sucesso && response.resultado) {
        showPreceptorModal(response.resultado, payload.desfecho);
      } else {
        showFallbackModal(payload.desfecho);
      }
    } catch (err) {
      console.error(err);
      showFallbackModal(payload.desfecho);
    } finally {
      dom.submitResolutionBtn.textContent = '⚖️ Submeter ao Preceptor Avaliador';
    }
  }

  function showPreceptorModal(result, desfecho) {
    dom.preceptorGrade.textContent = result.nota;
    dom.caseOutcomeTitle.textContent = desfecho === 'CONCLUIDO' 
      ? 'Atendimento Finalizado' 
      : desfecho === 'OBITO' ? 'Desfecho Crítico: Óbito' : 'Desfecho: Abandono de Consulta';
    
    dom.caseOutcomeSummary.textContent = result.acertouDiagnostico 
      ? 'Diagnóstico correto identificado.' 
      : 'Diagnóstico divergente do gabarito oficial.';

    dom.preceptorFeedbackText.innerHTML = `
      <p style="margin-bottom: 12px;">${result.parecer}</p>
      ${result.pontosCriticos && result.pontosCriticos.length > 0 ? `
        <strong>Pontos Críticos:</strong>
        <ul style="margin-left: 20px; margin-top: 6px;">
          ${result.pontosCriticos.map(p => `<li>${p}</li>`).join('')}
        </ul>
      ` : ''}
    `;

    dom.preceptorModal.classList.add('active');
  }

  function showFallbackModal(desfecho) {
    dom.preceptorGrade.textContent = desfecho === 'CONCLUIDO' ? '70' : '30';
    dom.caseOutcomeTitle.textContent = `Caso Encerrado (${desfecho})`;
    dom.caseOutcomeSummary.textContent = 'Avaliação gerada via contingência local.';
    dom.preceptorFeedbackText.innerHTML = `
      <p>O atendimento foi registrado no histórico da plataforma.</p>
      <p><strong>Diagnóstico Esperado:</strong> ${currentCase.gabaritoPreceptor.diagnostico}</p>
      <p><strong>Conduta Recomendada:</strong> ${currentCase.gabaritoPreceptor.conduta}</p>
    `;
    dom.preceptorModal.classList.add('active');
  }

  function switchTab(tabId) {
    dom.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
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

    dom.sendQuestionBtn.addEventListener('click', submitPatientQuestion);
    dom.questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPatientQuestion();
    });
  }

  return {
    init,
    startCase,
    requestExam,
    switchTab
  };
})();

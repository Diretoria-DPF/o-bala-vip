/**
 * MOTOR DA CLÍNICA MÉDICA VIRTUAL (OSCE COM GEMINI & MOTOR CONTEXTUAL LAIFT)
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
  let askedThemes = new Set();
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

    // Abas de navegação
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
  // INICIALIZAÇÃO DE CASO CLÍNICO
  // =========================================================

  function startCase(caseId) {
    initDomReferences();

    const selected = (typeof clinicalCases !== 'undefined')
      ? (clinicalCases.find(c => c.id === caseId) || clinicalCases[0])
      : null;

    if (!selected) {
      console.error('Nenhum caso clínico encontrado no banco de dados.');
      return;
    }

    currentCase = selected;
    vitality = selected.vitalidadeInicial || 100;
    patience = selected.pacienciaInicial || 100;
    elapsedSeconds = 0;
    conversationHistory = [];
    requestedExams = [];
    askedThemes.clear();
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
    if (!currentCase) return;
    const v = currentCase.sinaisVitais;
    if (dom.vitalPA) dom.vitalPA.textContent = v.pa;
    if (dom.vitalFC) dom.vitalFC.textContent = v.fc;
    if (dom.vitalFR) dom.vitalFR.textContent = v.fr;
    if (dom.vitalTemp) dom.vitalTemp.textContent = v.temp;
    if (dom.vitalSpO2) dom.vitalSpO2.textContent = v.spo2;
    if (dom.vitalGlasgow) dom.vitalGlasgow.textContent = v.glasgow;
  }

  function renderSuggestions() {
    if (!dom.suggestionsList || !currentCase) return;
    dom.suggestionsList.innerHTML = '';
    currentCase.perguntasSugeridas.forEach(suggestion => {
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

  // =========================================================
  // CRONÔMETRO E DECAIMENTO DINÂMICO
  // =========================================================

  function handleTimeTick() {
    if (!isCaseActive) return;

    elapsedSeconds++;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (dom.timeElapsed) {
      dom.timeElapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (elapsedSeconds > 0 && elapsedSeconds % 60 === 0 && currentCase) {
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
  // MOTOR HEURÍSTICO CONTEXTUAL AVANÇADO (LOCAL FALLBACK)
  // Adapta respostas baseado em prontuário, gravidade e diálogo
  // =========================================================

  function gerarRespostaContextualLocal(pergunta) {
    const p = pergunta.toLowerCase().trim();
    const caso = currentCase;
    const ctx = caso.contextoOculto || {};
    const pac = caso.paciente || {};
    const isEmergencia = caso.tipo === 'emergencia';

    // Moduladores de estado clínico
    let prefixoGravidade = '';
    if (vitality < 30) {
      prefixoGravidade = (isEmergencia)
        ? "(falando com imensa dificuldade, engasgando em secreção) ...argh... d-doutor... "
        : "(voz extremamente fraca e arrastada) ...doutor(a)... mal consigo falar... ";
    } else if (vitality < 60) {
      prefixoGravidade = (isEmergencia)
        ? "(ofegante e tossindo) ...espera... "
        : "(suspirando de cansaço) ...ai... ";
    }

    let sufixoPaciencia = '';
    if (patience < 25) {
      sufixoPaciencia = " Por favor, doutor(a), não aguento mais pergunta, faz alguma coisa!";
    }

    // 1. Manobras de Exame Físico solicitadas no chat
    if (p.includes('auscultar') || p.includes('estetoscópio') || p.includes('pulmão') || p.includes('ouvir seu peito') || p.includes('respirar fundo')) {
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Pode colocar o aparelho... meu peito chia parecendo uma chaleira fervendo... <em>[Ausculta pulmonar: Roncos difusos, sibilos bilaterais e estertores crepitantes em bases (broncorreia intensa).]</em>`;
      }
      return `${prefixoGravidade}Pode auscultar sim... o peito não dói tanto, o problema é o corpo todo... <em>[Ausculta pulmonar: Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.]</em>`;
    }

    if (p.includes('olhar sua pupila') || p.includes('olhar seu olho') || p.includes('olhos') || p.includes('pupila') || p.includes('lanterna')) {
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}A luz arde demais, doutor... tá tudo escuro e fechado... <em>[Exame ocular: Miose puntiforme extrema bilateral e hiporreativa à luz (compatível com síndrome colinérgica).]</em>`;
      }
      return `${prefixoGravidade}Pode olhar... minhas vistas só tão pesadas de cansaço... <em>[Exame ocular: Pupilas isocóricas e fotorreagentes, escleras anictéricas.]</em>`;
    }

    if (p.includes('palpar') || p.includes('apertar sua barriga') || p.includes('abdômen') || p.includes('abdome')) {
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Minha barriga tá roncando e doendo... parece que vai desmanchar de cólica! <em>[Exame abdominal: Abdome flácido, difusamente doloroso à palpação leve, peristaltismo aumentado (borborigmos frequentes).]</em>`;
      }
      return `${prefixoGravidade}Não sinto tanta dor na barriga não, doutor... é mais nas pernas e nos braços. <em>[Exame abdominal: Abdome inocente, ruídos hidroaéreos presentes, sem visceromegalias.]</em>`;
    }

    // 2. Exposição Toxicológica, Remédios e Substâncias
    if (p.includes('remédio') || p.includes('medicamento') || p.includes('veneno') || p.includes('produto') || p.includes('passou') || p.includes('usou') || p.includes('química') || p.includes('lavoura') || p.includes('inseticida') || p.includes('pulverizou') || p.includes('tomou')) {
      askedThemes.add('substancia');
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Eu tava aplicando veneno de bicho na roça de milho com a bomba costal. Tinha um cheiro muito forte de alho podre! Eu não olhei o nome no rótulo, mas o encarregado disse que era forte pra lagarta.${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGravidade}Olhe, eu tomo Sinvastatina de 40 miligramas toda noite por causa do colesterol alto há 3 anos. Mas semana passada peguei uma infecção no peito e o médico do posto me receitou Claritromicina de 500 pra tomar de 12 em 12 horas. Tomei direitinho até ontem.${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}${ctx.exposicaoReal || 'Tomei os remédios que me receitaram normalmente...'}`;
    }

    // 3. Tempo de início e cronologia dos fatos
    if (p.includes('tempo') || p.includes('quando') || p.includes('começou') || p.includes('horas') || p.includes('dias') || p.includes('repente') || p.includes('momento')) {
      askedThemes.add('tempo');
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Foi hoje de manhã cedo! Tava aplicando há umas duas horas debaixo do sol quente, aí comecei a suar frio, a baba começou a escorrer e de repente minhas pernas bambearam faz menos de uma hora!${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGravidade}As dores no corpo e essa canseira começaram faz uns 3 dias, uns dias depois que iniciei o antibiótico novo. Mas o susto grande foi hoje de manhã quando fui urinar e a cor saiu escura.${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}Começou há pouco tempo e só foi piorando...`;
    }

    // 4. Equipamento de Proteção Individual (EPI) e Contaminação Dérmica
    if (p.includes('proteção') || p.includes('epi') || p.includes('máscara') || p.includes('luva') || p.includes('bota') || p.includes('roupa') || p.includes('macacão') || p.includes('lavou') || p.includes('pele')) {
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Doutor... tava um calor dos infernos na lavoura... tirei a máscara de pano porque tava sufocando. Minha camisa de algodão ficou encharcada do veneno quando a mangueira da bomba vazou nas minhas costas!${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}Não mexo com veneno nem produtos químicos não, sou professora aposentada, fico mais em casa.`;
    }

    // 5. Sintomas Musculares, Fraqueza e Mobilidade
    if (p.includes('músculo') || p.includes('braço') || p.includes('perna') || p.includes('força') || p.includes('moleza') || p.includes('fraqueza') || p.includes('tremer') || p.includes('treme') || p.includes('andar')) {
      askedThemes.add('muscular');
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Meus músculos tão dando uns pulos sozinhos, parece que tem bicho andando debaixo da carne! Minhas pernas não seguram meu peso de jeito nenhum...${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGravidade}Dói demais, doutor(a)! Principalmente nas coxas e nos ombros. Hoje cedo não consegui levantar os braços nem para pentear o cabelo ou escovar os dentes de tanta fraqueza nas juntas.${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}Sinto uma fraqueza que não me deixa nem ficar de pé direito...`;
    }

    // 6. Urina, Cor e Função Renal
    if (p.includes('urina') || p.includes('xixi') || p.includes('cor') || p.includes('café') || p.includes('sangue') || p.includes('ardência') || p.includes('rim') || p.includes('bebeu água')) {
      askedThemes.add('urina');
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGravidade}A urina saiu escura, parecendo borra de café forte ou refrigerante de cola! Não ardeu nada para sair, mas a quantidade foi bem pouquinha hoje, mesmo eu tomando água.${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Eu... eu acho que urinei na roupa quando caí na roça, doutor... perdi o controle de tudo lá...${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}A urina está bem alterada hoje...`;
    }

    // 7. Sintomas Respiratórios, Salivação e Secreção
    if (p.includes('respiração') || p.includes('ar') || p.includes('fôlego') || p.includes('sufoc') || p.includes('baba') || p.includes('saliva') || p.includes('catarro') || p.includes('afog')) {
      askedThemes.add('respiratorio');
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Tô afogando na própria baba! Vem um catarro grosso que não para de subir na garganta e meu peito parece amarrado por uma corda de aço... não entra ar!${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGravidade}Minha respiração até que tá calma agora, o problema no peito era a pneumonia da semana passada, mas o catarro já tinha sumido com o antibiótico.${sufixoPaciencia}`;
      }
      return `${prefixoGravidade}Falta ar quando tento falar muito rápido...`;
    }

    // 8. Histórico Patológico Pregresso, Alergias e Hábitos
    if (p.includes('alergia') || p.includes('outra doença') || p.includes('pressão') || p.includes('diabetes') || p.includes('bebe') || p.includes('fuma') || p.includes('histórico') || p.includes('saúde')) {
      if (caso.id === 'caso_tox_01') {
        return `${prefixoGravidade}Nunca tive doença grave, doutor! Não tenho alergia que eu saiba, fumo um fumo de rolo às vezes e tomo minha cachacinha no fim de semana, mas saúde de ferro até hoje!${sufixoPaciencia}`;
      }
      if (caso.id === 'caso_clin_02') {
        return `${prefixoGrafico}Eu tenho pressão alta controlada e colesterol alto há anos. Alergia só tenho a Dipirona, fico toda empipocada e inchada se tomar! Nunca fumei nem bebo nada alcoólico.`;
      }
      return `${prefixoGravidade}De saúde sempre fui uma pessoa comum, sem muitas doenças graves...`;
    }

    // 9. Acolhimento, Empatia e Calma transmitida pelo estudante
    if (p.includes('calma') || p.includes('tranquil') || p.includes('estou aqui') || p.includes('vai ficar bem') || p.includes('vamos cuidar') || p.includes('ajudar') || p.includes('não se preocupe')) {
      patience = Math.min(100, patience + 6);
      vitality = Math.min(100, vitality + 1);
      updateMetersUI();
      if (isEmergencia) {
        return `${prefixoGravidade}Deus te ouça, doutor(a)... confio em vocês... mas faz esse aperto no meu peito parar...`;
      }
      return `${prefixoGravidade}Muito obrigada pela atenção e pelo carinho, doutor(a)... me sinto um pouco mais segura ouvindo isso.`;
    }

    // 10. Resposta Padrão Integrada Dinâmica (caso fuja das intenções mapeadas)
    if (isEmergencia) {
      return `${prefixoGravidade}Minha cabeça tá zonza e a vista tá falhando... ${ctx.sintomas || 'Tô com muita falta de ar e baba'}. Me dá um remédio logo, por favor...${sufixoPaciencia}`;
    }

    return `${prefixoGravidade}Doutor(a), como te falei, minha queixa é essa fraqueza no corpo que não passa e essa urina estranha de cor escura. Me explica o que tá acontecendo comigo...${sufixoPaciencia}`;
  }

  // =========================================================
  // SUBMISSÃO DE PERGUNTAS (CHAT ANAMNESE)
  // =========================================================

  async function submitPatientQuestion() {
    if (!dom.questionInput || !isCaseActive || !currentCase) return;

    const text = dom.questionInput.value.trim();
    if (!text) return;

    // Renderiza mensagem do estudante
    appendChatBubble('student', 'Você (Estudante)', text);
    dom.questionInput.value = '';
    if (dom.sendQuestionBtn) dom.sendQuestionBtn.disabled = true;

    // Indicador de digitação do paciente
    const typingBubble = appendChatBubble('patient', currentCase.paciente.nome, '<em>Pensando e tentando falar...</em>');

    let falaObtida = '';
    let respostaSucesso = false;

    try {
      // Monta payload completo com todo o prontuário para alimentar o Gemini
      const contextoCompleto = {
        ...currentCase.contextoOculto,
        pacienteIdade: currentCase.paciente.idade,
        pacienteProfissao: currentCase.paciente.profissao,
        queixaPrincipal: currentCase.queixaPrincipal,
        historicoAdmissao: currentCase.historicoAdmissao,
        sinaisVitais: currentCase.sinaisVitais,
        vitalidadeAtual: Math.round(vitality),
        pacienciaAtual: Math.round(patience),
        examesJaLiberados: requestedExams
      };

      const recentHistory = conversationHistory.slice(-4).join('\n');

      const response = await ApiService.conversarComPaciente(
        currentCase.id,
        text,
        recentHistory,
        contextoCompleto
      );

      if (response && response.sucesso && response.falaPaciente && response.falaPaciente.trim().length > 0) {
        falaObtida = response.falaPaciente.trim();
        respostaSucesso = true;
      }
    } catch (apiError) {
      console.warn('API Gemini indisponível ou com erro. Acionando Motor Contextual LAIFT:', apiError);
    }

    // Se a API não respondeu ou deu erro, o Motor Heurístico Contextual assume com fluidez
    if (!respostaSucesso || !falaObtida) {
      falaObtida = gerarRespostaContextualLocal(text);
    }

    typingBubble.remove();
    appendChatBubble('patient', currentCase.paciente.nome, falaObtida);
    conversationHistory.push(`Estudante: ${text}`);
    conversationHistory.push(`Paciente: ${falaObtida}`);

    // Feedback no estado de paciência
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
  // SOLICITAÇÃO DE EXAMES LABORATORIAIS
  // =========================================================

  function requestExam(examId) {
    if (!isCaseActive || !currentCase) return;

    const exam = currentCase.examesDisponiveis.find(e => e.id === examId);
    if (!exam || requestedExams.includes(examId)) return;

    requestedExams.push(examId);

    // Desativa o botão no catálogo
    const row = document.getElementById(`exam-row-${examId}`);
    if (row) {
      const btn = row.querySelector('button');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Solicitado';
      }
    }

    // Aplica penalidades de tempo e medidores
    elapsedSeconds += (exam.custoTempoMin || 5) * 60;
    applyDecay(Math.abs(exam.impactoVitalidade || 0), Math.abs(exam.impactoPaciencia || 0));

    // Remove mensagem de estado vazio
    const emptyNotice = dom.releasedExamsList?.querySelector('.empty-state-notice');
    if (emptyNotice) emptyNotice.remove();

    // Renderiza o laudo
    const examCard = document.createElement('div');
    examCard.className = 'released-exam-card';
    examCard.innerHTML = `
      <h5>📋 ${exam.nome}</h5>
      <p>${exam.resultado}</p>
    `;
    dom.releasedExamsList?.appendChild(examCard);

    // Feedback no chat se o exame for relevante
    if (exam.essencial) {
      appendChatBubble('patient', 'Enfermagem do Leito', `O laudo do exame <strong>${exam.nome}</strong> acabou de chegar da bancada e foi anexado à aba de Exames.`);
    }
  }

  // =========================================================
  // DESFECHO CRÍTICO E FINALIZAÇÃO DO CASO
  // =========================================================

  function triggerCriticalOutcome(outcomeType) {
    isCaseActive = false;
    clearInterval(clockInterval);
    caseOutcome = outcomeType;

    if (dom.studentDiagnosis) dom.studentDiagnosis.disabled = true;
    if (dom.studentConduct) dom.studentConduct.disabled = true;
    if (dom.submitResolutionBtn) dom.submitResolutionBtn.disabled = true;

    if (outcomeType === 'OBITO') {
      alert('DESFECHO CRÍTICO: O paciente evoluiu para colapso irreversível devido à deterioração clínica e tempo excessivo sem conduta adequada.');
    } else if (outcomeType === 'ABANDONO') {
      alert('DESFECHO CLÍNICO: O paciente ficou angustiado ou exausto com a condução da consulta e optou por abandonar o atendimento.');
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
      const response = await ApiService.avaliarCondutaPreceptor(identifier, currentCase.id, payload);
      if (response && response.sucesso && response.resultado) {
        showPreceptorModal(response.resultado, payload.desfecho);
      } else {
        avaliarCondutaLocalmente(payload);
      }
    } catch (err) {
      console.warn('Falha na conexão com Preceptor online. Aplicando avaliação pedagógica local:', err);
      avaliarCondutaLocalmente(payload);
    } finally {
      if (dom.submitResolutionBtn) {
        dom.submitResolutionBtn.textContent = '⚖️ Submeter ao Preceptor Avaliador';
      }
    }
  }

  // Avaliador Pedagógico Heurístico Local (Garante nota e feedback caso a API falhe)
  function avaliarCondutaLocalmente(dados) {
    const gab = currentCase.gabaritoPreceptor || {};
    const diagAluno = (dados.diagnosticoAluno || '').toLowerCase();
    const condAluno = (dados.condutaAluno || '').toLowerCase();

    const palavras = gab.palavrasChave || [];
    let acertosPalavras = 0;

    palavras.forEach(p => {
      const termo = p.toLowerCase();
      if (diagAluno.includes(termo) || condAluno.includes(termo)) {
        acertosPalavras++;
      }
    });

    const proporcaoAcerto = (palavras.length > 0) ? (acertosPalavras / palavras.length) : 0.5;
    let nota = Math.round(proporcaoAcerto * 80) + 15;

    if (dados.desfecho === 'OBITO') nota = Math.min(35, nota);
    if (dados.desfecho === 'ABANDONO') nota = Math.min(45, nota);

    const acertouDiag = proporcaoAcerto >= 0.45;

    const resultadoLocal = {
      nota: Math.min(100, nota),
      acertouDiagnostico: acertouDiag,
      parecer: `Avaliação registrada pelo corpo docente da LAIFT. O diagnóstico principal formulado foi ${acertouDiag ? 'compatível com o quadro clínico apresentado' : 'divergente do padrão esperado para o caso'}. Recomenda-se revisar as diretrizes de farmacoterapia de urgência e interações medicamentosas.`,
      pontosCriticos: [
        `Diagnóstico oficial LAIFT: ${gab.diagnostico}`,
        `Conduta prioritária recomendada: ${gab.conduta}`
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

    dom.sendQuestionBtn?.addEventListener('click', submitPatientQuestion);
    dom.questionInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPatientQuestion();
    });
  }

  return {
    init,
    startCase,
    requestExam,
    switchTab,
    submitPatientQuestion,
    finalizeClinicalCase
  };
})();

// Declarações globais para suporte aos atributos inline do index.html
window.submitPatientQuestion = ClinicEngine.submitPatientQuestion;
window.finalizeClinicalCase = ClinicEngine.finalizeClinicalCase;
window.ClinicEngine = ClinicEngine;

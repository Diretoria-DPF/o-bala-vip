/**
 * MOTOR DA CLÍNICA MÉDICA VIRTUAL (OSCE MULTIPLATAFORMA LAIFT)
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 * 
 * Funcionalidades:
 * - Integração com API de IA (Groq / DeepSeek / Gemini) via Google Apps Script
 * - Motor Cognitivo Heurístico Local com classificação semântica de intenções
 * - Simulação de exame físico interativo direto pelo diálogo
 * - Modulação dinâmica de fala por nível de vitalidade (fadiga, dispneia, confusão)
 * - Avaliador Pedagógico Heurístico com parecer técnico e notas proporcionais
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
  let intentHistory = {}; // Rastreia repetições para gerar respostas variadas
  let caseOutcome = 'EM_ANDAMENTO'; // 'EM_ANDAMENTO' | 'CONCLUIDO' | 'OBITO' | 'ABANDONO'

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

    // Diálogo e Anamnese
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
  // INICIALIZAÇÃO DO CASO CLÍNICO
  // =========================================================

  function startCase(caseId) {
    initDomReferences();

    const selected = (typeof clinicalCases !== 'undefined' && Array.isArray(clinicalCases))
      ? (clinicalCases.find(c => c.id === caseId) || clinicalCases[0])
      : null;

    if (!selected) {
      console.error('[ClinicEngine] Nenhum caso clínico localizado na base.');
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

  // =========================================================
  // CRONÔMETRO E MONITORAMENTO BIOLÓGICO
  // =========================================================

  function handleTimeTick() {
    if (!isCaseActive) return;

    elapsedSeconds++;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (dom.timeElapsed) {
      dom.timeElapsed.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Decaimento programado a cada 60 segundos
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
  // MOTOR COGNITIVO HEURÍSTICO LOCAL (PERSONA LEIGA REALISTA)
  // =========================================================

  function gerarRespostaContextualLocal(pergunta) {
    const p = pergunta.toLowerCase().trim();
    const casoId = currentCase ? currentCase.id : '';
    const isEmergencia = currentCase ? currentCase.tipo === 'emergencia' : true;

    // Modulação fisiológica da voz conforme a gravidade biológica
    let prefixo = '';
    if (vitality < 30) {
      prefixo = isEmergencia
        ? "(falando com imenso esforço, engasgando na saliva) ...ai... d-doutor... "
        : "(voz muito fraca e arrastada) ...doutor(a)... tá difícil falar... ";
    } else if (vitality < 60) {
      prefixo = isEmergencia
        ? "(respirando curto e tossindo) ...espera... "
        : "(suspirando de cansaço) ...ai, meu Deus... ";
    }

    // Helper de controle de repetições para evitar falas idênticas
    function registrarIntent(chave) {
      intentHistory[chave] = (intentHistory[chave] || 0) + 1;
      return intentHistory[chave];
    }

    // 1. Identificação / Nome / Idade / Origem
    if (p.includes('seu nome') || p.includes('quem é você') || p.includes('como se chama') || p.includes('quem é o senhor') || p.includes('como é seu nome')) {
      const vez = registrarIntent('nome');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}Meu nome é Agenor... Agenor Silveira... trabalho como diarista na lavoura do seu Bento...`
          : `${prefixo}É Agenor Silveira, doutor... minha cabeça tá confusa, mas é esse meu nome.`;
      }
      return `${prefixo}Me chamo Marilene Souza, sou professora aposentada...`;
    }

    if (p.includes('idade') || p.includes('quantos anos')) {
      return casoId === 'caso_tox_01'
        ? `${prefixo}Tenho 52 anos... fiz aniversário em julho passado...`
        : `${prefixo}Tenho 61 anos, doutor(a)...`;
    }

    if (p.includes('quem trouxe') || p.includes('veio com quem') || p.includes('família') || p.includes('esposa') || p.includes('filho')) {
      return casoId === 'caso_tox_01'
        ? `${prefixo}Foram os companheiros da roça... me viram caído na beira do milharal e me jogaram na caçamba do carro... minha esposa nem sabe ainda!`
        : `${prefixo}Vim sozinha de táxi, meus filhos moram em outra cidade...`;
    }

    // 2. Exame Físico Interativo Solicitado no Chat
    if (p.includes('auscultar') || p.includes('estetoscópio') || p.includes('ouvir seu peito') || p.includes('ouvir o pulmão') || p.includes('respirar fundo')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Pode colocar o aparelho... mas não consigo puxar o ar fundo sem tossir... <em>[Ausculta pulmonar: Roncos difusos, sibilos disseminados bilaterais e fervilhar de estertores crepitantes em ambas as bases pulmonares (broncorreia severa).]</em>`;
      }
      return `${prefixo}Pode ouvir sim, doutor(a)... <em>[Ausculta pulmonar: Murmúrio vesicular presente e distribuído bilateralmente, sem ruídos adventícios no momento.]</em>`;
    }

    if (p.includes('olhar o olho') || p.includes('olhar sua pupila') || p.includes('pupila') || p.includes('lanterna') || p.includes('olhos')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}A luz dói, doutor... tá tudo embaçado e escuro demais ao meu redor... <em>[Exame ocular: Miose bilateral puntiforme extrema ('em cabeça de alfinete') e hiporreativa à estimulação luminosa.]</em>`;
      }
      return `${prefixo}Pode olhar... sinto minhas pálpebras pesadas de cansaço... <em>[Exame ocular: Pupilas isocóricas e fotorreagentes, escleras anictéricas.]</em>`;
    }

    if (p.includes('palpar') || p.includes('apertar sua barriga') || p.includes('abdômen') || p.includes('abdome') || p.includes('estômago')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Ai! Tá doendo muito por dentro, parece que vai soltar tudo numa diarreia! <em>[Exame físico: Abdome flácido, difusamente doloroso à palpação leve, peristaltismo hiperativo com borborigmos frequentes.]</em>`;
      }
      return `${prefixo}Não sinto dor na barriga não, doutor... a aflição maior é nas pernas e nas costas. <em>[Exame físico: Abdome flácido, indolor à palpação, sem massas ou visceromegalias.]</em>`;
    }

    if (p.includes('força') || p.includes('aperta minha mão') || p.includes('mexer o braço') || p.includes('mexer a perna')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Tento apertar, mas a mão parece de borracha... os dedos tremem e não seguram! <em>[Exame neurológico: Fraqueza muscular generalizada (Grau III/V), fasciculações involuntárias visíveis na musculatura escapular e braços.]</em>`;
      }
      return `${prefixo}Tento fazer força, mas os braços e as coxas ardem como se tivessem rasgando...`;
    }

    // 3. Dor e Sintomas Dolorosos
    if (p.includes('dor') || p.includes('dói') || p.includes('doendo') || p.includes('onde dói') || p.includes('sente dor')) {
      const vez = registrarIntent('dor');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}O que mais dói é esse aperto no peito, parece que sentaram no meu tórax! E a cabeça tá estourando de dor com a vista turva.`
          : `${prefixo}Dói o peito para respirar, doutor... e sinto uma cólica horrível revirando a barriga!`;
      }
      return `${prefixo}Dói o corpo inteiro, doutor(a)... principalmente as coxas, as costas e os ombros. Uma queimação pesada e insuportável.`;
    }

    // 4. Agente Químico / Veneno / Remédios
    if (p.includes('veneno') || p.includes('produto') || p.includes('química') || p.includes('lavoura') || p.includes('inseticida') || p.includes('pulveriz') || p.includes('passou')) {
      const vez = registrarIntent('veneno');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}Eu tava borrifando veneno de matar lagarta no milho com a bomba costal. Tinha um cheiro muito forte e enjoativo, parecendo alho podre!`
          : `${prefixo}Era um líquido escuro que o feitor colocou no galão... não olhei a marca, mas ele disse que era tiro e queda pra praga. O cheiro de alho podre impregnou em tudo.`;
      }
      return `${prefixo}Eu não mexo com veneno de roça não, doutor... fico em casa.`;
    }

    if (p.includes('remédio') || p.includes('medicamento') || p.includes('tomou') || p.includes('toma')) {
      const vez = registrarIntent('remedio');
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Não tomei nenhum remédio hoje não, senhor(a)... só tomei café puro de manhã antes de pegar a enxada e a bomba.`;
      }
      return vez === 1
        ? `${prefixo}Tomo Sinvastatina de 40mg toda noite por causa do colesterol faz anos... e semana passada o médico do posto me deu Claritromicina de 500mg pra uma infecção no pulmão. Tomei os dois juntos.`
        : `${prefixo}Tomo o remédio do colesterol e terminei ontem o antibiótico que me passaram pro peito.`;
    }

    // 5. EPIs e Exposição Dérmica / Inalatória
    if (p.includes('proteção') || p.includes('epi') || p.includes('máscara') || p.includes('luva') || p.includes('macacão') || p.includes('roupa') || p.includes('costas') || p.includes('lavou')) {
      const vez = registrarIntent('epi');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}Tava um sol escaldante na roça... tirei a máscara de pano porque tava sufocando de calor... aí a mangueira da bomba rachou e o líquido derramou nas minhas costas, encharcando minha camisa toda!`
          : `${prefixo}Tava só de camisa de algodão e botina velha... a camisa colou no meu corpo encharcada do produto. Não lavei com água porque não tinha torneira perto.`;
      }
      return `${prefixo}Trabalho de professora, não uso roupas especiais nem máscara em casa...`;
    }

    // 6. Cronologia e Tempo
    if (p.includes('tempo') || p.includes('quando') || p.includes('que horas') || p.includes('começou') || p.includes('há quanto')) {
      const vez = registrarIntent('tempo');
      if (casoId === 'caso_tox_01') {
        return vez === 1
          ? `${prefixo}Começou tem pouco tempo! Eu tava borrifando fazia umas duas horas... de repente comecei a suar frio, a saliva começou a escorrer e as pernas falharam faz nem uma hora!`
          : `${prefixo}Faz menos de uma hora que caí no chão... a piora foi rápida demais depois que a roupa molhou.`;
      }
      return `${prefixo}As dores nas juntas começaram faz uns 3 dias, mas hoje de manhã perdi as forças de vez ao ver a urina preta.`;
    }

    // 7. Respiração, Salivação e Secreções
    if (p.includes('saliva') || p.includes('baba') || p.includes('cuspe') || p.includes('ar') || p.includes('respira') || p.includes('fôlego') || p.includes('sufoc') || p.includes('engasg')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Tô me afogando na própria saliva, doutor! Não para de brotar uma baba grossa e branca na boca... e meu peito chia parecendo um fole furado, o ar não entra!`;
      }
      return `${prefixo}O ar entra normal agora, mas meu coração parece que tá acelerado de fraqueza no corpo.`;
    }

    // 8. Urina e Cor
    if (p.includes('urina') || p.includes('xixi') || p.includes('cor da urina') || p.includes('água') || p.includes('bebeu')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Acho que me urinei todo na calça quando caí desmaiado na roça... perdi o controle do corpo lá.`;
      }
      return `${prefixo}Foi o que mais me assustou hoje cedo! Minha urina saiu bem escura, da cor de borra de café ou refrigerante de cola, e foi só um pouquinho de nada.`;
    }

    // 9. Músculos, Tremores e Formigamento
    if (p.includes('trem') || p.includes('músculo') || p.includes('carne') || p.includes('fraqueza') || p.includes('pula') || p.includes('perna')) {
      if (casoId === 'caso_tox_01') {
        return `${prefixo}Minha carne fica pulando e tremendo sozinha no braço e na perna, parecendo que tem bicho rastejando debaixo da pele! E as pernas não me aguentam em pé.`;
      }
      return `${prefixo}Sinto uma fraqueza terrível... não consegui nem erguer o braço para pentear o cabelo hoje de manhã.`;
    }

    // 10. Acolhimento e Apoio
    if (p.includes('calma') || p.includes('tranquilo') || p.includes('vai passar') || p.includes('estamos aqui') || p.includes('vamos cuidar') || p.includes('ajudar')) {
      patience = Math.min(100, patience + 6);
      vitality = Math.min(100, vitality + 1);
      updateMetersUI();
      return isEmergencia
        ? `${prefixo}Deus abençoe vocês... tô confiando no senhor(a)... mas me dá logo um remédio que sinto meu peito fechando...`
        : `${prefixo}Obrigada pelo carinho e paciência, doutor(a)... me sinto um pouco mais calma ouvindo isso.`;
    }

    // 11. Resposta Leiga Aberta Dinâmica
    if (isEmergencia) {
      return `${prefixo}Doutor(a)... tá tudo escurecendo na minha vista, tô afogando nessa baba e meu peito tá apertado demais... faz essa agonia parar, por favor!`;
    }

    return `${prefixo}Doutor(a), tô assustada demais com esse corpo mole e esse xixi escuro... me ajuda a descobrir o que tá acontecendo comigo?`;
  }

  // =========================================================
  // SUBMISSÃO DE PERGUNTAS (CHAT ANAMNESE)
  // =========================================================

  async function submitPatientQuestion() {
    if (!dom.questionInput || !isCaseActive || !currentCase) return;

    const text = dom.questionInput.value.trim();
    if (!text) return;

    // Renderiza pergunta do estudante
    appendChatBubble('student', 'Você (Estudante)', text);
    dom.questionInput.value = '';
    if (dom.sendQuestionBtn) dom.sendQuestionBtn.disabled = true;

    // Placeholder de digitação
    const typingBubble = appendChatBubble('patient', currentCase.paciente.nome, '<em>Tentando respirar e responder...</em>');

    let falaObtida = '';
    let apiSucesso = false;

    try {
      const recentHistory = conversationHistory.slice(-4).join('\n');

      // Monta contexto completo com o prontuário para a IA
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
        } else {
          console.warn('[ClinicEngine] API externa não retornou fala válida:', response);
        }
      }
    } catch (apiError) {
      console.warn('[ClinicEngine] Falha na comunicação com o backend:', apiError);
    }

    // Se a IA externa falhar, aciona o Motor Heurístico Local robusto
    if (!apiSucesso || !falaObtida) {
      falaObtida = gerarRespostaContextualLocal(text);
    }

    typingBubble.remove();
    appendChatBubble('patient', currentCase.paciente.nome, falaObtida);
    conversationHistory.push(`Estudante: ${text}`);
    conversationHistory.push(`Paciente: ${falaObtida}`);

    // Modulação de paciência do paciente
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
  // SOLICITAÇÃO DE EXAMES COMPLEMENTARES
  // =========================================================

  function requestExam(examId) {
    if (!isCaseActive || !currentCase) return;

    const exam = (currentCase.examesDisponiveis || []).find(e => e.id === examId);
    if (!exam || requestedExams.includes(examId)) return;

    requestedExams.push(examId);

    // Desativa botão no catálogo
    const row = document.getElementById(`exam-row-${examId}`);
    if (row) {
      const btn = row.querySelector('button');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Solicitado';
      }
    }

    // Aplica tempo decorrido e penalidades biológicas
    elapsedSeconds += (exam.custoTempoMin || 5) * 60;
    applyDecay(Math.abs(exam.impactoVitalidade || 0), Math.abs(exam.impactoPaciencia || 0));

    // Remove aviso de vazio
    const emptyNotice = dom.releasedExamsList?.querySelector('.empty-state-notice');
    if (emptyNotice) emptyNotice.remove();

    // Renderiza o laudo liberado
    const examCard = document.createElement('div');
    examCard.className = 'released-exam-card';
    examCard.innerHTML = `
      <h5>📋 ${exam.nome}</h5>
      <p>${exam.resultado}</p>
    `;
    dom.releasedExamsList?.appendChild(examCard);

    // Feedback no chat se o exame for crítico
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
          showPreceptorModal(response.resultado, payload.desfecho);
          return;
        }
      }
      avaliarCondutaLocalmente(payload);
    } catch (err) {
      console.warn('[ClinicEngine] Preceptor online indisponível. Aplicando avaliação heurística:', err);
      avaliarCondutaLocalmente(payload);
    } finally {
      if (dom.submitResolutionBtn) {
        dom.submitResolutionBtn.textContent = '⚖️ Submeter ao Preceptor Avaliador';
      }
    }
  }

  // Avaliação Pedagógica Heurística Local
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

// Declarações globais para suporte aos atributos inline do HTML
window.submitPatientQuestion = ClinicEngine.submitPatientQuestion;
window.finalizeClinicalCase = ClinicEngine.finalizeClinicalCase;
window.ClinicEngine = ClinicEngine;

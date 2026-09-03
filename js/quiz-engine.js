/**
 * MOTOR DE SIMULAÇÃO DE FARMACOLOGIA E TOXICOLOGIA
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const QuizEngine = (() => {
  let activeModule = 'farmaco'; // 'farmaco' | 'toxico'
  let currentMode = 'study';    // 'study' | 'exam'
  let selectedTopics = new Set();
  let filteredQuestions = [];
  let currentQuestionIndex = 0;
  let userAnswers = [];
  let score = 0;
  let timeLeft = 0;
  let timerInterval = null;
  let quizActive = false;
  let startTime = 0;

  // Cache de referências DOM
  const dom = {};

  function initDomReferences() {
    dom.topicsGrid = document.getElementById('topicsGrid');
    dom.quizModuleTitle = document.getElementById('quizModuleTitle');
    dom.startQuizBtn = document.getElementById('startQuiz');
    dom.selectAllBtn = document.getElementById('selectAll');
    dom.deselectAllBtn = document.getElementById('deselectAll');
    dom.continueBtn = document.getElementById('continueBtn');
    dom.resetProgressBtn = document.getElementById('resetProgressBtn');
    dom.modeButtons = document.querySelectorAll('.mode-btn');
    dom.startScreen = document.getElementById('startScreen');
    dom.quizContainer = document.getElementById('quizContainer');
    dom.resultsContainer = document.getElementById('resultsContainer');
    dom.currentTopic = document.getElementById('currentTopic');
    dom.timer = document.getElementById('timer');
    dom.currentQuestion = document.getElementById('currentQuestion');
    dom.totalQuestions = document.getElementById('totalQuestions');
    dom.progress = document.getElementById('progress');
    dom.questionText = document.getElementById('questionText');
    dom.optionsContainer = document.getElementById('optionsContainer');
    dom.explanation = document.getElementById('explanation');
    dom.explanationText = document.getElementById('explanationText');
    dom.apiDataSourceTag = document.getElementById('apiDataSourceTag');
    dom.prevBtn = document.getElementById('prevBtn');
    dom.nextBtn = document.getElementById('nextBtn');
    dom.finishBtn = document.getElementById('finishBtn');
    dom.totalTopics = document.getElementById('totalTopics');
    dom.selectedTopics = document.getElementById('selectedTopics');
    dom.totalQs = document.getElementById('totalQs');
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function getStorageKey() {
    return `laift_quiz_${activeModule}_progress`;
  }

  function setModule(moduleName) {
    activeModule = moduleName;
    selectedTopics.clear();
    clearInterval(timerInterval);
    quizActive = false;

    if (dom.quizModuleTitle) {
      dom.quizModuleTitle.textContent = activeModule === 'farmaco' 
        ? '💊 Tópicos de Farmacologia' 
        : '🧪 Tópicos de Toxicologia';
    }

    renderTopics();
    checkSavedProgress();
    resetQuizStage();
  }

  function getModuleQuestions() {
    return allQuestions.filter(q => q.module === activeModule);
  }

  function renderTopics() {
    const questions = getModuleQuestions();
    const topics = [...new Set(questions.map(q => q.topic))];

    dom.totalTopics.textContent = topics.length;
    dom.totalQs.textContent = questions.length;
    dom.topicsGrid.innerHTML = '';

    topics.forEach(topic => {
      const count = questions.filter(q => q.topic === topic).length;
      const button = document.createElement('button');
      button.className = 'topic-btn';
      button.dataset.topic = topic;
      button.innerHTML = `<span>${topic}</span><span class="topic-count">${count}</span>`;
      button.addEventListener('click', () => toggleTopic(topic));
      dom.topicsGrid.appendChild(button);
    });

    updateTopicCounters();
  }

  function toggleTopic(topic) {
    if (selectedTopics.has(topic)) {
      selectedTopics.delete(topic);
    } else {
      selectedTopics.add(topic);
    }
    updateTopicButtons();
    updateTopicCounters();
  }

  function updateTopicButtons() {
    dom.topicsGrid.querySelectorAll('.topic-btn').forEach(btn => {
      const topic = btn.dataset.topic;
      if (selectedTopics.has(topic)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateTopicCounters() {
    dom.selectedTopics.textContent = selectedTopics.size;
    const questions = getModuleQuestions();
    const available = questions.filter(q => selectedTopics.has(q.topic)).length;
    dom.totalQs.textContent = selectedTopics.size > 0 ? available : questions.length;
  }

  function selectAllTopics() {
    const questions = getModuleQuestions();
    selectedTopics = new Set(questions.map(q => q.topic));
    updateTopicButtons();
    updateTopicCounters();
  }

  function deselectAllTopics() {
    selectedTopics.clear();
    updateTopicButtons();
    updateTopicCounters();
  }

  function setMode(mode) {
    currentMode = mode;
    dom.modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
        if (mode === 'exam') btn.classList.add('warning');
        else btn.classList.remove('warning');
      } else {
        btn.classList.remove('active', 'warning');
      }
    });
  }

  function resetQuizStage() {
    dom.startScreen.classList.remove('hidden');
    dom.quizContainer.classList.add('hidden');
    dom.resultsContainer.classList.add('hidden');
  }

  function startQuiz() {
    if (selectedTopics.size === 0) {
      alert('Por favor, selecione ao menos um tópico antes de iniciar!');
      return;
    }

    const questions = getModuleQuestions();
    filteredQuestions = questions.filter(q => selectedTopics.has(q.topic));

    if (filteredQuestions.length === 0) {
      alert('Nenhuma questão encontrada para os tópicos selecionados.');
      return;
    }

    if (currentMode === 'exam') {
      shuffle(filteredQuestions);
    }

    userAnswers = new Array(filteredQuestions.length).fill(null);
    currentQuestionIndex = 0;
    quizActive = true;
    startTime = Date.now();

    dom.startScreen.classList.add('hidden');
    dom.resultsContainer.classList.add('hidden');
    dom.quizContainer.classList.remove('hidden');

    clearInterval(timerInterval);

    if (currentMode === 'exam') {
      timeLeft = filteredQuestions.length * 90; // 90 segundos por questão
      startTimer();
    } else {
      dom.timer.textContent = 'Modo Estudo';
    }

    loadQuestion();
  }

  async function loadQuestion() {
    if (!quizActive || currentQuestionIndex >= filteredQuestions.length) return;

    const q = filteredQuestions[currentQuestionIndex];
    dom.currentTopic.textContent = q.topic;
    dom.currentQuestion.textContent = currentQuestionIndex + 1;
    dom.totalQuestions.textContent = filteredQuestions.length;
    dom.questionText.textContent = q.question;

    const progressPct = ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;
    dom.progress.style.width = `${progressPct}%`;

    dom.optionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'option';
      optionEl.tabIndex = 0;

      if (userAnswers[currentQuestionIndex] === idx) {
        optionEl.classList.add('selected');
      }

      optionEl.innerHTML = `
        <div class="option-letter">${String.fromCharCode(65 + idx)}</div>
        <div class="option-text">${opt}</div>
      `;

      optionEl.addEventListener('click', () => selectOption(idx));
      optionEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(idx);
        }
      });

      dom.optionsContainer.appendChild(optionEl);
    });

    dom.prevBtn.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === filteredQuestions.length - 1) {
      dom.nextBtn.classList.add('hidden');
      dom.finishBtn.classList.remove('hidden');
    } else {
      dom.nextBtn.classList.remove('hidden');
      dom.finishBtn.classList.add('hidden');
    }

    dom.explanation.classList.remove('show');
    if (userAnswers[currentQuestionIndex] !== null && currentMode === 'study') {
      await showExplanation(q);
    }
  }

  async function selectOption(idx) {
    userAnswers[currentQuestionIndex] = idx;
    saveProgress();
    loadQuestion();

    if (currentMode === 'study') {
      await showExplanation(filteredQuestions[currentQuestionIndex]);
    }
  }

  async function showExplanation(question) {
    const userAnswer = userAnswers[currentQuestionIndex];
    const options = dom.optionsContainer.querySelectorAll('.option');

    options.forEach((opt, idx) => {
      opt.classList.remove('correct', 'incorrect');
      if (idx === question.correct) opt.classList.add('correct');
      else if (idx === userAnswer && userAnswer !== question.correct) opt.classList.add('incorrect');
    });

    let explanationContent = question.explanation;

    // Se estiver em toxicologia e houver chave para enriquecimento ao vivo
    if (activeModule === 'toxico' && question.apiDrugQuery) {
      dom.apiDataSourceTag.classList.remove('hidden');
      dom.apiDataSourceTag.textContent = 'Consultando OpenFDA...';

      const liveData = await ApiService.fetchOpenFdaWarning(question.apiDrugQuery);
      if (liveData && liveData.conteudo) {
        dom.apiDataSourceTag.textContent = 'OpenFDA Live Data';
        dom.apiDataSourceTag.style.background = 'var(--success)';
        explanationContent = `<strong>[Alerta Oficial FDA]:</strong> ${liveData.conteudo.substring(0, 320)}...<br><br>${explanationContent}`;
      } else {
        dom.apiDataSourceTag.textContent = 'Base Local LAIFT';
        dom.apiDataSourceTag.style.background = 'var(--secondary)';
      }
    } else {
      dom.apiDataSourceTag.classList.add('hidden');
    }

    dom.explanationText.innerHTML = explanationContent;
    dom.explanation.classList.add('show');
  }

  function nextQuestion() {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      currentQuestionIndex++;
      loadQuestion();
    }
  }

  function prevQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadQuestion();
    }
  }

  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        finishQuiz();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    dom.timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async function finishQuiz() {
    quizActive = false;
    clearInterval(timerInterval);

    score = 0;
    const topicScores = {};
    const topicCounts = {};

    filteredQuestions.forEach((q, idx) => {
      const topic = q.topic;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;

      if (userAnswers[idx] === q.correct) {
        score++;
        topicScores[topic] = (topicScores[topic] || 0) + 1;
      } else {
        topicScores[topic] = topicScores[topic] || 0;
      }
    });

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

    // Sincroniza telemetria no Google Sheets caso usuário esteja autenticado
    const session = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
    if (session.identifier) {
      ApiService.sincronizarMetricasSimulado(
        session.identifier,
        activeModule,
        currentMode,
        score,
        filteredQuestions.length,
        elapsedSeconds,
        topicScores
      ).catch(err => console.warn('Erro ao sincronizar métricas:', err));
    }

    renderResults(score, filteredQuestions.length, topicScores, topicCounts);
  }

  function renderResults(hits, total, topicScores, topicCounts) {
    dom.quizContainer.classList.add('hidden');
    dom.resultsContainer.classList.remove('hidden');
    dom.resultsContainer.innerHTML = '';

    const pct = total > 0 ? ((hits / total) * 100).toFixed(1) : 0;

    const card = document.createElement('div');
    card.className = 'text-center';
    card.innerHTML = `
      <h2 style="color: var(--primary); margin-bottom: 12px;">🎯 Simulado Concluído</h2>
      <div style="font-size: 3.5rem; font-weight: 800; color: var(--primary); margin: 15px 0;">${hits}/${total}</div>
      <p style="font-size: 1.2rem; color: var(--text-muted); margin-bottom: 24px;">Aproveitamento: <strong>${pct}%</strong></p>
      
      <div style="text-align: left; max-width: 500px; margin: 0 auto 30px;" id="topicBreakdown"></div>
      
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-secondary" id="retryWrongBtn">🔍 Revisar Questões Erradas</button>
        <button class="btn btn-primary" id="restartQuizBtn">🔄 Novo Simulado</button>
      </div>
    `;

    dom.resultsContainer.appendChild(card);

    const breakdown = card.querySelector('#topicBreakdown');
    for (const t in topicCounts) {
      const tHits = topicScores[t] || 0;
      const tTotal = topicCounts[t];
      const tPct = Math.round((tHits / tTotal) * 100);

      const row = document.createElement('div');
      row.style.marginBottom = '12px';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600;">
          <span>${t}</span>
          <span>${tHits}/${tTotal} (${tPct}%)</span>
        </div>
        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px;">
          <div style="height: 100%; width: ${tPct}%; background: ${tPct >= 70 ? 'var(--success)' : 'var(--accent)'};"></div>
        </div>
      `;
      breakdown.appendChild(row);
    }

    card.querySelector('#retryWrongBtn').addEventListener('click', retryWrongQuestions);
    card.querySelector('#restartQuizBtn').addEventListener('click', () => {
      localStorage.removeItem(getStorageKey());
      setModule(activeModule);
    });
  }

  function retryWrongQuestions() {
    const wrong = filteredQuestions.filter((q, idx) => userAnswers[idx] !== q.correct);
    if (wrong.length === 0) {
      alert('Parabéns! Você gabaritou todas as questões!');
      return;
    }
    filteredQuestions = wrong;
    userAnswers = new Array(wrong.length).fill(null);
    currentQuestionIndex = 0;
    currentMode = 'study';
    setMode('study');

    dom.resultsContainer.classList.add('hidden');
    dom.quizContainer.classList.remove('hidden');
    quizActive = true;
    loadQuestion();
  }

  function saveProgress() {
    if (currentMode === 'exam') return;
    const progressData = {
      activeModule,
      userAnswers,
      currentQuestionIndex,
      timestamp: Date.now()
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(progressData));
    checkSavedProgress();
  }

  function checkSavedProgress() {
    const saved = localStorage.getItem(getStorageKey());
    if (saved && dom.continueBtn && dom.resetProgressBtn) {
      dom.continueBtn.classList.remove('hidden');
      dom.resetProgressBtn.classList.remove('hidden');
    } else if (dom.continueBtn && dom.resetProgressBtn) {
      dom.continueBtn.classList.add('hidden');
      dom.resetProgressBtn.classList.add('hidden');
    }
  }

  function continueProgress() {
    const saved = localStorage.getItem(getStorageKey());
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      filteredQuestions = getModuleQuestions();
      userAnswers = data.userAnswers || new Array(filteredQuestions.length).fill(null);
      currentQuestionIndex = data.currentQuestionIndex || 0;
      quizActive = true;
      currentMode = 'study';
      setMode('study');

      dom.startScreen.classList.add('hidden');
      dom.quizContainer.classList.remove('hidden');
      loadQuestion();
    } catch (e) {
      console.error(e);
    }
  }

  function resetProgress() {
    if (confirm('Tem certeza que deseja apagar o progresso salvo deste módulo?')) {
      localStorage.removeItem(getStorageKey());
      checkSavedProgress();
      setModule(activeModule);
    }
  }

  function init() {
    initDomReferences();

    dom.startQuizBtn.addEventListener('click', startQuiz);
    dom.selectAllBtn.addEventListener('click', selectAllTopics);
    dom.deselectAllBtn.addEventListener('click', deselectAllTopics);
    dom.prevBtn.addEventListener('click', prevQuestion);
    dom.nextBtn.addEventListener('click', nextQuestion);
    dom.finishBtn.addEventListener('click', finishQuiz);
    dom.continueBtn.addEventListener('click', continueProgress);
    dom.resetProgressBtn.addEventListener('click', resetProgress);

    dom.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    document.addEventListener('keydown', (e) => {
      if (!quizActive) return;
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.key === 'ArrowLeft') prevQuestion();
      if (e.key === 'ArrowRight') nextQuestion();
      if (['1', '2', '3', '4'].includes(e.key)) {
        selectOption(parseInt(e.key) - 1);
      }
    });
  }

  return {
    init,
    setModule
  };
})();

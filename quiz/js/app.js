/**
 * SIMULADOR DE FARMACOLOGIA LAIFT — MOTOR PRINCIPAL
 * Integração: SmilesDrawer, QuizAPIEngine (RxNav/PubChem/ChEBI) e Google Sheets.
 */

const APPS_SCRIPT_GATEWAY = 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

let selectedTopics = new Set();
let currentMode = "study"; 
let filteredQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let timeLeft = 0; 
let timerInterval;
let quizActive = false;
let quizCompleted = false;
let quizStartTime = null;
let smilesDrawerInstance = null;

// Elementos da Interface
const topicsGrid = document.getElementById('topicsGrid');
const startQuizBtn = document.getElementById('startQuiz');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const continueBtn = document.getElementById('continueBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const startScreen = document.getElementById('startScreen');
const quizContainer = document.getElementById('quizContainer');
const resultsContainer = document.getElementById('resultsContainer');
const currentTopicElement = document.getElementById('currentTopic');
const timerElement = document.getElementById('timer');
const currentQuestionElement = document.getElementById('currentQuestion');
const totalQuestionsElement = document.getElementById('totalQuestions');
const progressBar = document.getElementById('progress');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const explanation = document.getElementById('explanation');
const explanationText = document.getElementById('explanationText');
const feedbackAnalogia = document.getElementById('feedbackAnalogia');
const btnVerDossie = document.getElementById('btnVerDossie');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const finishBtn = document.getElementById('finishBtn');
const totalTopicsElement = document.getElementById('totalTopics');
const selectedTopicsElement = document.getElementById('selectedTopics');
const totalQsElement = document.getElementById('totalQs');
const answeredStatElement = document.getElementById('answeredStat');
const correctStatElement = document.getElementById('correctStat');
const progressStatElement = document.getElementById('progressStat');
const totalQuestionsStatElement = document.getElementById('totalQuestionsStat');

const infoBtn = document.getElementById('infoBtn');
const instructionsModal = document.getElementById('instructionsModal');
const closeModal = document.getElementById('closeModal');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initSmilesDrawer() {
    if (typeof SmilesDrawer !== 'undefined' && !smilesDrawerInstance) {
        smilesDrawerInstance = new SmilesDrawer.Drawer({
            width: 220,
            height: 140,
            bondThickness: 1.4,
            bondLength: 14,
            shortBondLength: 0.85,
            compactDrawing: true,
            themes: {
                dark: {
                    C: '#e2e8f0',
                    O: '#ef4444',
                    N: '#38bdf8',
                    F: '#4ade80',
                    CL: '#facc15',
                    BR: '#fb923c',
                    I: '#c084fc',
                    P: '#f97316',
                    S: '#eab308',
                    BACKGROUND: 'transparent'
                }
            }
        });
    }
}

function initializeApp() {
    initSmilesDrawer();

    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    const topics = [...new Set(questionsList.map(q => q.topic))];
    
    totalTopicsElement.textContent = topics.length;
    totalQsElement.textContent = questionsList.length;
    totalQuestionsStatElement.textContent = questionsList.length;
    
    topicsGrid.innerHTML = '';
    topics.forEach(topic => {
        const count = questionsList.filter(q => q.topic === topic).length;
        const button = document.createElement('button');
        button.className = 'topic-btn';
        button.innerHTML = `<span>${topic}</span><span class="topic-count">${count}</span>`;
        button.dataset.topic = topic;
        button.addEventListener('click', () => toggleTopic(topic));
        topicsGrid.appendChild(button);
    });
    
    const savedProgress = localStorage.getItem('pharmaQuizProgress');
    if (savedProgress) {
        try {
            const progress = JSON.parse(savedProgress);
            if (progress.userAnswers && progress.userAnswers.length > 0) {
                continueBtn.style.display = 'block';
                updateStats();
            }
        } catch (e) {
            console.error('Erro ao carregar progresso:', e);
        }
    }
    updateStats();
    updateDynamicButtons(); 
}

function updateDynamicButtons() {
    const totalAvailableTopics = document.querySelectorAll('.topic-btn').length;
    
    if (selectedTopics.size > 0) {
        deselectAllBtn.classList.remove('secondary');
        deselectAllBtn.classList.add('active-clear');
    } else {
        deselectAllBtn.classList.add('secondary');
        deselectAllBtn.classList.remove('active-clear');
    }

    if (selectedTopics.size < totalAvailableTopics && totalAvailableTopics > 0) {
        selectAllBtn.classList.remove('secondary');
        selectAllBtn.classList.add('active-select');
    } else {
        selectAllBtn.classList.add('secondary');
        selectAllBtn.classList.remove('active-select');
    }
}

function toggleTopic(topic) {
    if (selectedTopics.has(topic)) {
        selectedTopics.delete(topic);
    } else {
        selectedTopics.add(topic);
    }
    updateTopicButtons();
    updateStats();
    updateDynamicButtons(); 
}

function updateTopicButtons() {
    document.querySelectorAll('.topic-btn').forEach(btn => {
        const topic = btn.dataset.topic;
        if (selectedTopics.has(topic)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    selectedTopicsElement.textContent = selectedTopics.size;
}

function selectAllTopics() {
    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    const topics = [...new Set(questionsList.map(q => q.topic))];
    selectedTopics = new Set(topics);
    updateTopicButtons();
    updateStats();
    updateDynamicButtons(); 
}

function deselectAllTopics() {
    selectedTopics.clear();
    updateTopicButtons();
    updateStats();
    updateDynamicButtons(); 
}

function setMode(mode) {
    currentMode = mode;
    modeButtons.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
            if (mode === 'exam') btn.classList.add('warning');
            else btn.classList.remove('warning');
        } else {
            btn.classList.remove('active', 'warning');
        }
    });
}

function updateStats() {
    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    let answered = 0;
    let correct = 0;
    const savedProgress = localStorage.getItem('pharmaQuizProgress');
    if (savedProgress) {
        try {
            const progress = JSON.parse(savedProgress);
            if (progress.userAnswers) {
                answered = progress.userAnswers.filter(a => a !== null).length;
                correct = progress.userAnswers.reduce((acc, answer, index) => {
                    if (answer !== null && questionsList[index] && answer === questionsList[index].correct) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);
            }
        } catch (e) {}
    }
    
    answeredStatElement.textContent = answered;
    correctStatElement.textContent = correct;
    const progressPercentage = questionsList.length > 0 ? Math.round((answered / questionsList.length) * 100) : 0;
    progressStatElement.textContent = `${progressPercentage}%`;

    if (answered > 0) {
        resetProgressBtn.style.display = 'block';
    } else {
        resetProgressBtn.style.display = 'none';
    }
}

function resetProgress() {
    if (confirm("Tem certeza que deseja apagar todo o seu progresso? As respostas salvas serão zeradas.")) {
        localStorage.removeItem('pharmaQuizProgress');
        userAnswers = [];
        continueBtn.style.display = 'none';
        resetProgressBtn.style.display = 'none';
        
        if (quizActive || quizContainer.style.display === 'flex' || quizContainer.style.display === 'block') {
            quizActive = false;
            clearInterval(timerInterval);
            quizContainer.style.display = 'none';
            resultsContainer.style.display = 'none';
            startScreen.style.display = 'flex';
        }
        updateStats();
    }
}

function startQuiz() {
    if (selectedTopics.size === 0) { 
        alert('Por favor, selecione pelo menos um tópico para começar!'); 
        return; 
    }
    
    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    filteredQuestions = [...questionsList.filter(q => selectedTopics.has(q.topic))];
    
    if (filteredQuestions.length === 0) { 
        alert('Nenhuma questão encontrada para os tópicos selecionados!'); 
        return; 
    }
    
    if (currentMode === 'exam') {
        shuffleArray(filteredQuestions);
    }

    userAnswers = new Array(filteredQuestions.length).fill(null);
    quizStartTime = Date.now();
    
    const savedProgress = localStorage.getItem('pharmaQuizProgress');
    if (savedProgress && currentMode === 'study') {
        try {
            const progress = JSON.parse(savedProgress);
            filteredQuestions.forEach((q, index) => {
                const originalIndex = questionsList.findIndex(item => item.id === q.id);
                if (originalIndex !== -1 && progress.userAnswers[originalIndex] !== null) {
                    userAnswers[index] = progress.userAnswers[originalIndex];
                }
            });
        } catch (e) {}
    }
    
    startScreen.style.display = 'none';
    quizContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    clearInterval(timerInterval); 
    
    if (currentMode === 'exam') {
        timeLeft = filteredQuestions.length * 90; 
        startTimer();
    } else {
        timerElement.textContent = 'Modo Estudo';
        timerElement.style.animation = 'none';
    }
    
    quizActive = true;
    currentQuestionIndex = 0;
    loadQuestion();
}

function continueQuiz() {
    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    filteredQuestions = [...questionsList];
    userAnswers = new Array(filteredQuestions.length).fill(null);
    quizStartTime = Date.now();
    
    const savedProgress = localStorage.getItem('pharmaQuizProgress');
    if (savedProgress) {
        try {
            const progress = JSON.parse(savedProgress);
            userAnswers = [...progress.userAnswers];
            currentQuestionIndex = userAnswers.findIndex(answer => answer === null);
            if (currentQuestionIndex === -1) currentQuestionIndex = 0;
        } catch (e) { 
            currentQuestionIndex = 0; 
        }
    }
    
    startScreen.style.display = 'none';
    quizContainer.style.display = 'block';
    resultsContainer.style.display = 'none';
    
    currentMode = 'study';
    setMode('study');
    
    clearInterval(timerInterval);
    timerElement.textContent = 'Continuando...';
    timerElement.style.animation = 'none';
    
    quizActive = true;
    loadQuestion();
}

async function renderMolecularStructure(question) {
    const canvas = document.getElementById('quizMolCanvas');
    const label = document.getElementById('quizMolLabel');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const farmacoAlvo = question.farmacoAlvo || question.drug || null;
    let smiles = question.smiles || null;

    if (label) {
        label.textContent = farmacoAlvo || (smiles ? 'Estrutura Química' : '--');
    }

    if (!smiles && farmacoAlvo && typeof QuizAPIEngine !== 'undefined') {
        if (label) label.textContent = `${farmacoAlvo} (Buscando...)`;
        const info = await QuizAPIEngine.buscarEstruturaMolecular(farmacoAlvo);
        if (info && info.smiles) {
            smiles = info.smiles;
            if (label) label.textContent = `${farmacoAlvo} ${info.cid ? `(CID: ${info.cid})` : ''}`;
        }
    }

    if (smiles && typeof SmilesDrawer !== 'undefined') {
        initSmilesDrawer();
        SmilesDrawer.parse(smiles, (tree) => {
            smilesDrawerInstance.draw(tree, canvas, 'dark', false);
        }, (err) => {
            console.warn('Erro ao renderizar estrutura química:', err);
        });
    }
}

function loadQuestion() {
    if (!quizActive || currentQuestionIndex >= filteredQuestions.length) return;
    
    const question = filteredQuestions[currentQuestionIndex];
    currentTopicElement.textContent = question.topic;
    currentQuestionElement.textContent = currentQuestionIndex + 1;
    totalQuestionsElement.textContent = filteredQuestions.length;
    questionText.textContent = question.question;
    
    const progress = ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;
    progressBar.style.width = `${progress}%`;
    optionsContainer.innerHTML = '';
    
    // Projeção Molecular Integrada
    renderMolecularStructure(question);

    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.tabIndex = 0;
        
        if (userAnswers[currentQuestionIndex] === index) optionElement.classList.add('selected');
        
        const optionLetter = document.createElement('div');
        optionLetter.className = 'option-letter';
        optionLetter.textContent = String.fromCharCode(65 + index);
        
        const optionText = document.createElement('div');
        optionText.textContent = option;
        
        optionElement.appendChild(optionLetter);
        optionElement.appendChild(optionText);
        
        optionElement.addEventListener('click', () => selectOption(index));
        optionElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectOption(index);
            }
        });
        
        optionsContainer.appendChild(optionElement);
    });
    
    prevBtn.disabled = currentQuestionIndex === 0;
    if (currentQuestionIndex === filteredQuestions.length - 1) {
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        finishBtn.style.display = 'none';
    }
    
    explanation.style.display = 'none';
    explanation.classList.remove('show');
    if (userAnswers[currentQuestionIndex] !== null && currentMode === 'study') {
        showExplanation();
    }
}

function selectOption(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    saveProgress();
    updateStats();
    loadQuestion();
    if (currentMode === 'study') showExplanation();
}

function showExplanation() {
    const question = filteredQuestions[currentQuestionIndex];
    const userAnswer = userAnswers[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    
    options.forEach((option, index) => {
        option.classList.remove('correct', 'incorrect');
        if (index === question.correct) option.classList.add('correct');
        else if (index === userAnswer && userAnswer !== question.correct) option.classList.add('incorrect');
    });
    
    explanationText.textContent = question.explanation;

    // Analogia Pedagógica
    if (feedbackAnalogia) {
        if (question.analogiaDidatica) {
            feedbackAnalogia.innerHTML = `💡 <strong>Analogia Prática:</strong> ${question.analogiaDidatica}`;
            feedbackAnalogia.style.display = 'block';
        } else {
            feedbackAnalogia.style.display = 'none';
        }
    }

    // Botão de Dossiê Farmacológico
    if (btnVerDossie) {
        const farmacoAlvo = question.farmacoAlvo || question.drug || null;
        if (farmacoAlvo) {
            btnVerDossie.style.display = 'inline-block';
            btnVerDossie.onclick = () => abrirDossieClinico(farmacoAlvo);
        } else {
            btnVerDossie.style.display = 'none';
        }
    }

    explanation.style.display = 'block';
    explanation.classList.add('show');
}

async function abrirDossieClinico(farmacoAlvo) {
    const modal = document.getElementById('modalDossieQuiz');
    const content = document.getElementById('dossieContent');
    if (!modal || !content) return;

    modal.style.display = 'flex';
    content.innerHTML = `<p style="color: #94a3b8;">Consultando NLM (RxClass), PubChem e ChEBI para <strong>${farmacoAlvo}</strong>...</p>`;

    if (typeof QuizAPIEngine !== 'undefined') {
        const dossie = await QuizAPIEngine.gerarDossieFarmaco(farmacoAlvo);
        content.innerHTML = `
            <h3 style="color: #38bdf8; margin-top: 0;">📋 Ficha Farmacológica: ${dossie.farmaco}</h3>
            <div style="font-size: 0.85rem; line-height: 1.5; color: #cbd5e1; text-align: left;">
                <p><strong>Classe Terapêutica (ATC):</strong> <span style="color: #4ade80;">${dossie.classesATC}</span></p>
                <p><strong>Identificador RxCUI:</strong> <code>${dossie.rxcui}</code></p>
                <p><strong>Nomenclatura IUPAC:</strong> <span style="font-family: monospace; color: #94a3b8;">${dossie.iupac}</span></p>
                <p><strong>Fórmula / Massa:</strong> ${dossie.formula} • ${dossie.pesoMolecular} g/mol</p>
                <p><strong>Papel Biológico (ChEBI):</strong><br><em>${dossie.definicao}</em></p>
            </div>
            <button class="control-btn secondary" style="margin-top: 14px; width: 100%;" onclick="document.getElementById('modalDossieQuiz').style.display='none'">Fechar Ficha</button>
        `;
    } else {
        content.innerHTML = `
            <p>Serviço de consulta de APIs científicas indisponível no momento.</p>
            <button class="control-btn secondary" style="margin-top: 10px;" onclick="document.getElementById('modalDossieQuiz').style.display='none'">Fechar</button>
        `;
    }
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

async function persistirMetricasQuiz(scoreTotal, totalQuestoes, tempoGasto) {
    let alunoIdentificador = "Visitante";
    let alunoNome = "Aluno Virtual";
    try {
        const sessao = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
        if (sessao.identifier) alunoIdentificador = sessao.identifier;
        if (sessao.name) alunoNome = sessao.name;
    } catch (e) {}

    const topicosArray = Array.from(selectedTopics);
    const modulo = topicosArray.length > 0 ? topicosArray.slice(0, 3).join(', ') : "Farmacologia Geral";

    const payload = {
        acao: "registrarMetricasQuiz",
        identificador: alunoIdentificador,
        nome: alunoNome,
        modulo: modulo,
        modo: currentMode === 'exam' ? "Modo Prova" : "Modo Estudo",
        acertos: scoreTotal,
        total: totalQuestoes,
        aproveitamento: totalQuestoes > 0 ? Math.round((scoreTotal / totalQuestoes) * 100) : 0,
        tempoGasto: tempoGasto,
        topicos: topicosArray.join(', ') || "Geral"
    };

    try {
        await fetch(APPS_SCRIPT_GATEWAY, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.warn("[Quiz Engine] Falha na sincronização das métricas:", err);
    }
}

function finishQuiz() {
    quizActive = false;
    quizCompleted = true;
    clearInterval(timerInterval);
    
    score = 0;
    const topicScores = {};
    const topicCounts = {};
    
    filteredQuestions.forEach((question, index) => {
        const topic = question.topic;
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        
        if (userAnswers[index] === question.correct) {
            score++;
            topicScores[topic] = (topicScores[topic] || 0) + 1;
        } else {
            topicScores[topic] = topicScores[topic] || 0;
        }
    });
    
    const tempoGasto = quizStartTime ? Math.max(1, Math.round((Date.now() - quizStartTime) / 1000)) : 0;
    persistirMetricasQuiz(score, filteredQuestions.length, tempoGasto);
    showResults(score, topicScores, topicCounts);
}

function showResults(score, topicScores, topicCounts) {
    quizContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '';
    
    const percentage = (score / filteredQuestions.length) * 100;
    
    const header = document.createElement('h2');
    header.textContent = '🎯 RESULTADOS DO SIMULADO';
    resultsContainer.appendChild(header);
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'score-display';
    scoreDisplay.textContent = `${score}/${filteredQuestions.length}`;
    resultsContainer.appendChild(scoreDisplay);
    
    const scoreText = document.createElement('div');
    scoreText.className = 'score-text';
    
    let performanceText = '';
    if (percentage >= 90) performanceText = '🎉 Excelente! Domínio total do conteúdo, Pensamento Provador no máximo!';
    else if (percentage >= 70) performanceText = '👍 Muito bom! Você está bem preparado!';
    else if (percentage >= 50) performanceText = '📚 Bom, mas o pensamento provador diz que precisamos revisar alguns conceitos.';
    else performanceText = '🔁 Recomendo voltar aos conceitos básicos e afiar o machado da farmacologia.';
    
    scoreText.textContent = `${percentage.toFixed(1)}% de acertos. ${performanceText}`;
    resultsContainer.appendChild(scoreText);
    
    const topicsTitle = document.createElement('h3');
    topicsTitle.textContent = '📊 Desempenho por Tópico:';
    resultsContainer.appendChild(topicsTitle);
    
    const topicsContainer = document.createElement('div');
    topicsContainer.className = 'topic-performance';
    
    for (const topic in topicCounts) {
        const topicScore = topicScores[topic] || 0;
        const topicPercentage = (topicScore / topicCounts[topic]) * 100;
        
        const topicDiv = document.createElement('div');
        topicDiv.style.marginBottom = '15px';
        
        const topicHeader = document.createElement('div');
        topicHeader.style.display = 'flex';
        topicHeader.style.justifyContent = 'space-between';
        topicHeader.style.marginBottom = '5px';
        
        const topicName = document.createElement('span');
        topicName.textContent = topic;
        topicName.style.fontWeight = 'bold';
        
        const topicScoreElement = document.createElement('span');
        topicScoreElement.textContent = `${topicScore}/${topicCounts[topic]} (${topicPercentage.toFixed(0)}%)`;
        topicScoreElement.style.color = topicPercentage >= 70 ? 'var(--success)' : 
                                      topicPercentage >= 50 ? 'var(--warning)' : 
                                      'var(--danger)';
        
        topicHeader.appendChild(topicName);
        topicHeader.appendChild(topicScoreElement);
        
        const progressBar = document.createElement('div');
        progressBar.className = 'performance-bar';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'performance-fill';
        progressFill.style.width = `${topicPercentage}%`;
        progressFill.style.background = topicPercentage >= 70 ? 'var(--success)' : 
                                       topicPercentage >= 50 ? 'var(--warning)' : 
                                       'var(--danger)';
        
        progressBar.appendChild(progressFill);
        topicDiv.appendChild(topicHeader);
        topicDiv.appendChild(progressBar);
        topicsContainer.appendChild(topicDiv);
    }
    
    resultsContainer.appendChild(topicsContainer);
    
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';

    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'restart-btn';
    reviewBtn.textContent = '🔍 Revisar Erradas';
    reviewBtn.addEventListener('click', () => reviewWrongQuestions());

    const retryBtn = document.createElement('button');
    retryBtn.className = 'restart-btn';
    retryBtn.style.background = 'var(--warning)';
    retryBtn.textContent = '🔄 Refazer Este Simulado';
    retryBtn.addEventListener('click', () => {
        localStorage.removeItem('pharmaQuizProgress');
        userAnswers = new Array(filteredQuestions.length).fill(null);
        currentQuestionIndex = 0;
        quizStartTime = Date.now();
        
        resultsContainer.style.display = 'none';
        quizContainer.style.display = 'block';
        quizActive = true;
        
        if (currentMode === 'exam') {
            timeLeft = filteredQuestions.length * 90;
            startTimer();
        } else {
            timerElement.textContent = 'Modo Estudo';
            timerElement.style.animation = 'none';
        }
        
        loadQuestion();
        updateStats();
    });
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'home-btn';
    restartBtn.textContent = '🏠 Selecionar Novos Tópicos';
    restartBtn.addEventListener('click', () => {
        localStorage.removeItem('pharmaQuizProgress');
        userAnswers = [];
        continueBtn.style.display = 'none';
        resetProgressBtn.style.display = 'none';
        
        resultsContainer.style.display = 'none';
        startScreen.style.display = 'flex';
        selectedTopics.clear();
        updateTopicButtons();
        updateStats();
        updateDynamicButtons();
    });

    actionButtons.appendChild(reviewBtn);
    actionButtons.appendChild(retryBtn);
    actionButtons.appendChild(restartBtn);
    resultsContainer.appendChild(actionButtons);
}

function reviewWrongQuestions() {
    const wrongQuestions = filteredQuestions.filter((question, index) => {
        return userAnswers[index] !== question.correct;
    });
    
    if (wrongQuestions.length === 0) {
        alert('Parabéns! Você não errou nenhuma questão!');
        return;
    }
    
    filteredQuestions = wrongQuestions;
    userAnswers = new Array(wrongQuestions.length).fill(null);
    currentQuestionIndex = 0;
    currentMode = 'study';
    quizStartTime = Date.now();
    
    resultsContainer.style.display = 'none';
    quizContainer.style.display = 'block';
    quizActive = true;
    
    clearInterval(timerInterval);
    timerElement.textContent = 'Modo Estudo (Revisão)';
    timerElement.style.animation = 'none';
    
    loadQuestion();
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (quizActive) finishQuiz();
        }
    }, 1000); 
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (timeLeft < 300) timerElement.style.animation = 'pulse 1s infinite';
    else timerElement.style.animation = 'none';
}

function saveProgress() {
    if (currentMode === 'exam') return;

    const questionsList = (typeof allQuestions !== 'undefined') ? allQuestions : [];
    const allUserAnswers = new Array(questionsList.length).fill(null);
    filteredQuestions.forEach((q, filteredIndex) => {
        const originalIndex = questionsList.findIndex(item => item.id === q.id);
        if (originalIndex !== -1) {
            allUserAnswers[originalIndex] = userAnswers[filteredIndex];
        }
    });
    
    const progress = {
        userAnswers: allUserAnswers,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('pharmaQuizProgress', JSON.stringify(progress));
}

// Event Listeners
infoBtn.addEventListener('click', () => { instructionsModal.style.display = 'flex'; });
closeModal.addEventListener('click', () => { instructionsModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === instructionsModal) { instructionsModal.style.display = 'none'; }
    const modalDossie = document.getElementById('modalDossieQuiz');
    if (e.target === modalDossie) { modalDossie.style.display = 'none'; }
});

startQuizBtn.addEventListener('click', startQuiz);
continueBtn.addEventListener('click', continueQuiz);
resetProgressBtn.addEventListener('click', resetProgress);
selectAllBtn.addEventListener('click', selectAllTopics);
deselectAllBtn.addEventListener('click', deselectAllTopics);
prevBtn.addEventListener('click', prevQuestion);
nextBtn.addEventListener('click', nextQuestion);
finishBtn.addEventListener('click', finishQuiz);

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

document.addEventListener('keydown', (e) => {
    if (!quizActive) return;
    if (document.activeElement.classList.contains('option') && (e.key === 'Enter' || e.key === ' ')) return;
    
    switch(e.key) {
        case 'ArrowLeft': 
            if (!prevBtn.disabled) prevQuestion(); 
            break;
        case 'ArrowRight':
            if (!nextBtn.disabled && nextBtn.style.display !== 'none') nextQuestion(); 
            break;
        case '1': case '2': case '3': case '4':
            const optionIndex = parseInt(e.key) - 1;
            if (optionIndex >= 0 && optionIndex < 4) selectOption(optionIndex);
            break;
    }
});

window.addEventListener('load', initializeApp);

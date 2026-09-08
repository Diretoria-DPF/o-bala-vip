/**
 * MOTOR DE EXECUÇÃO DO QUIZ DE FARMACOLOGIA
 */
const QuizEngine = {
  indiceAtual: 0,
  acertos: 0,
  tempoInicio: null,
  bloqueado: false,

  iniciar(questoes = QUIZ_FARMACOLOGIA_DB) {
    this.questoes = questoes;
    this.indiceAtual = 0;
    this.acertos = 0;
    this.tempoInicio = Date.now();
    this.renderizarQuestao();
  },

  renderizarQuestao() {
    this.bloqueado = false;
    const q = this.questoes[this.indiceAtual];
    if (!q) return this.finalizarQuiz();

    document.getElementById("quizModulo").textContent = `${q.modulo} • Nível ${q.nivel}`;
    document.getElementById("quizProgresso").textContent = `Questão ${this.indiceAtual + 1} de ${this.questoes.length}`;
    document.getElementById("quizEnunciado").textContent = q.enunciado;

    // Projeta o fármaco no canvas lateral usando o SmilesDrawer da bancada
    if (typeof SmilesDrawer !== "undefined" && q.smiles) {
      const canvas = document.getElementById("quizMolCanvas");
      SmilesDrawer.parse(q.smiles, (tree) => {
        const drawer = new SmilesDrawer.Drawer({ width: 220, height: 140, compactDrawing: true });
        drawer.draw(tree, canvas, "dark", false);
      });
      document.getElementById("quizMolLabel").textContent = `${q.farmacoAlvo} (CID: ${q.pubchemCid})`;
    }

    // Monta a lista de alternativas
    const container = document.getElementById("quizAlternativas");
    container.innerHTML = "";

    q.alternativas.forEach((alt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-alt-btn";
      btn.innerHTML = `<strong>${alt.letra})</strong> ${alt.texto}`;
      btn.onclick = () => this.responder(alt, btn);
      container.appendChild(btn);
    });

    document.getElementById("quizFeedbackArea").style.display = "none";
  },

  responder(altSelecionada, btnElemento) {
    if (this.bloqueado) return;
    this.bloqueado = true;

    const q = this.questoes[this.indiceAtual];
    const acertou = altSelecionada.correta;

    if (acertou) {
      this.acertos++;
      btnElemento.classList.add("alt-correta");
    } else {
      btnElemento.classList.add("alt-incorreta");
      // Destaca a alternativa certa
      const botoes = document.querySelectorAll(".quiz-alt-btn");
      q.alternativas.forEach((alt, idx) => {
        if (alt.correta) botoes[idx].classList.add("alt-correta");
      });
    }

    // Exibe o feedback técnico e a analogia didática
    const feedbackBox = document.getElementById("quizFeedbackArea");
    feedbackBox.innerHTML = `
      <div class="feedback-status ${acertou ? 'txt-sucesso' : 'txt-erro'}">
        ${acertou ? "✔ Resposta Correta!" : "✖ Resposta Incorreta"}
      </div>
      <p class="feedback-justificativa">${altSelecionada.feedback}</p>
      <div class="feedback-analogia">
        💡 <strong>Analogia Prática:</strong> ${q.analogiaDidatica}
      </div>
      <button class="btn btn-play" onclick="QuizEngine.avancar()" style="margin-top: 12px;">
        ${this.indiceAtual + 1 < this.questoes.length ? "Próxima Questão ➔" : "Ver Desempenho Final"}
      </button>
    `;
    feedbackBox.style.display = "block";
  },

  avancar() {
    this.indiceAtual++;
    this.renderizarQuestao();
  },

  async finalizarQuiz() {
    const tempoGastoSegundos = Math.round((Date.now() - this.tempoInicio) / 1000);
    const aproveitamento = Math.round((this.acertos / this.questoes.length) * 100);

    // Recupera identificador do aluno em sessão
    let alunoIdentificador = "Visitante";
    let alunoNome = "Aluno Virtual";
    try {
      const sessao = JSON.parse(localStorage.getItem("laift_student_session") || "{}");
      if (sessao.identifier) alunoIdentificador = sessao.identifier;
      if (sessao.name) alunoNome = sessao.name;
    } catch (e) {}

    // Exibe tela final
    const container = document.getElementById("quizCard");
    container.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2>Quiz Finalizado!</h2>
        <div style="font-size: 2.2rem; font-weight: bold; color: ${aproveitamento >= 70 ? 'var(--neon-green)' : '#ff9800'}; margin: 15px 0;">
          ${aproveitamento}%
        </div>
        <p>Você acertou <strong>${this.acertos}</strong> de <strong>${this.questoes.length}</strong> questões.</p>
        <p style="color: var(--text-secondary); font-size: 0.85rem;">Tempo total: ${tempoGastoSegundos} segundos</p>
        <button class="btn btn-reset" onclick="QuizEngine.iniciar()" style="margin-top: 15px;">Reiniciar Treinamento</button>
      </div>
    `;

    // Persiste no Google Sheets via Apps Script na rota de métricas
    try {
      await fetch(APPS_SCRIPT_GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          acao: "registrarMetricasQuiz",
          identificador: alunoIdentificador,
          nome: alunoNome,
          modulo: "Farmacologia & Terapêutica",
          modo: "Treinamento Interativo",
          acertos: this.acertos,
          total: this.questoes.length,
          aproveitamento: aproveitamento,
          tempoGasto: tempoGastoSegundos,
          topicos: "AINEs, Metabolismo Hepático, SNA"
        })
      });
    } catch (err) {
      console.warn("Falha na sincronização das métricas:", err);
    }
  }
};

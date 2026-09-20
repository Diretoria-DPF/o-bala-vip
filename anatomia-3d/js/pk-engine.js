/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/pk-engine.js                                     */
/* ========================================================================= */

/**
 * MOTOR FARMACOCINÉTICO (PK) & SIMULAÇÃO PLASMÁTICA COMPARTIMENTAL
 * Ecossistema LAIFT - Módulo Master 3D
 * - Modelação biofarmacêutica: Bolus IV (ordem 0/decaimento) e Oral (Equação de Bateman)
 * - Renderização responsiva Chart.js adaptada ao Dark Mode científico
 * - Sincronização direta com malhas 3D no ThreeEngine (Highlight de tecidos-alvo)
 * - Persistência automatizada de sessões de estudo para cômputo curricular
 */

const PKEngine = (() => {
  let chartInstance = null;
  const CANVAS_ID = "pkChartCanvas";

  // Configurações de Paleta Científica (Dark Mode LAIFT)
  const PALETTE = {
    primary: "#38bdf8",          // Sky 400 (Curva Oral)
    primaryGlow: "rgba(56, 189, 248, 0.22)",
    accent: "#34d399",           // Emerald 400 (Curva IV)
    accentGlow: "rgba(52, 211, 153, 0.22)",
    grid: "#1e293b",             // Slate 800
    textMuted: "#94a3b8",        // Slate 400
    tooltipBg: "rgba(2, 6, 23, 0.92)",
    borderSubtle: "#334155"
  };

  // =========================================================================
  // 1. INICIALIZAÇÃO DO MOTOR
  // =========================================================================
  function init() {
    console.log("[PKEngine] Inicializando Motor Farmacocinético Compartimental...");
    renderEmptyStateChart();
  }

  // =========================================================================
  // 2. MODELAÇÃO MATEMÁTICA FARMACOCINÉTICA (1 COMPARTIMENTO)
  // =========================================================================
  /**
   * Modela a curva de concentração plasmática ao longo de 24 horas.
   * @param {Object} params - dose (mg), f (biodisponibilidade 0-1), vd (L), halfLife (h), ka (h^-1)
   * @param {String} route - 'IV' ou 'ORAL'
   * @returns {Object} { labels: Array<String>, concentrations: Array<Number> }
   */
  function calculateCurve(params, route = "ORAL") {
    const dose = Number(params.dose) || 500;
    const f = typeof params.f !== "undefined" ? Number(params.f) : 1.0;
    const vd = Number(params.vd) || 40;
    const halfLife = Number(params.halfLife) || 4;
    const ka = Number(params.ka) || 1.5;

    // Constante de eliminação de primeira ordem: ke = ln(2) / t(1/2)
    const ke = Math.LN2 / Math.max(halfLife, 0.05);

    const labels = [];
    const concentrations = [];

    // Passo de cálculo de 0.5 horas num intervalo de 24 horas
    for (let t = 0; t <= 24; t += 0.5) {
      let conc = 0;

      if (route.toUpperCase() === "IV") {
        // Modelo Bolus Intravenoso: C(t) = (Dose / Vd) * e^(-ke * t)
        const c0 = (dose * f) / vd;
        conc = c0 * Math.exp(-ke * t);
      } else {
        // Modelo Oral de 1 Compartimento (Equação de Bateman):
        // C(t) = [F * Dose * ka / (Vd * (ka - ke))] * [e^(-ke * t) - e^(-ka * t)]
        if (Math.abs(ka - ke) < 0.0001) {
          // Prevenção de divisão por zero se ka == ke
          conc = ((f * dose * ke * t) / vd) * Math.exp(-ke * t);
        } else {
          const preFator = (f * dose * ka) / (vd * (ka - ke));
          conc = preFator * (Math.exp(-ke * t) - Math.exp(-ka * t));
        }
      }

      labels.push(t % 2 === 0 ? `${t}h` : "");
      concentrations.push(Math.max(0, parseFloat(conc.toFixed(2))));
    }

    return { labels, concentrations };
  }

  // =========================================================================
  // 3. EXECUÇÃO DE SIMULAÇÃO & RENDERIZAÇÃO GRÁFICA
  // =========================================================================
  /**
   * Executa a simulação completa de um composto e atualiza a interface.
   * @param {String} drugName - Nome do fármaco ou princípio ativo
   * @param {Object} params - Parâmetros farmacocinéticos (dose, vd, halfLife, etc.)
   * @param {String} route - Via de administração ('ORAL' ou 'IV')
   */
  function simulateDrug(drugName, params, route = "ORAL") {
    const via = (route || params.route || "ORAL").toUpperCase();
    const dataSet = calculateCurve(params, via);

    const isIV = via === "IV";
    const lineColor = isIV ? PALETTE.accent : PALETTE.primary;
    const fillColor = isIV ? PALETTE.accentGlow : PALETTE.primaryGlow;

    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas || typeof Chart === "undefined") {
      console.warn("[PKEngine] Canvas ou Chart.js indisponível para renderização.");
      return;
    }

    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = canvas.getContext("2d");

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: dataSet.labels,
        datasets: [
          {
            label: `${drugName} (${via}) - Nível Plasmático (mg/L)`,
            data: dataSet.concentrations,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 2.2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: lineColor,
            fill: true,
            tension: 0.38
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 650,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              color: PALETTE.textMuted,
              font: { size: 11, weight: "600" }
            }
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: PALETTE.tooltipBg,
            titleColor: PALETTE.primary,
            bodyColor: "#f8fafc",
            borderColor: PALETTE.borderSubtle,
            borderWidth: 1,
            padding: 8,
            displayColors: false,
            callbacks: {
              label: (context) => ` Concentração: ${context.parsed.y} mg/L`
            }
          }
        },
        scales: {
          x: {
            grid: { color: PALETTE.grid, drawBorder: false },
            ticks: { color: PALETTE.textMuted, font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: PALETTE.grid, drawBorder: false },
            ticks: { color: PALETTE.textMuted, font: { size: 10 } }
          }
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false
        }
      }
    });

    // INTEGRAÇÃO 3D DIRETA:
    // Destaca o órgão-alvo na malha e aciona o fluxo hemodinâmico de partículas
    const targetKey = params.targetOrgan || params.targetMesh;
    if (targetKey && typeof ThreeEngine !== "undefined") {
      console.log(`[PKEngine] Acionando resposta 3D no tecido-alvo: ${targetKey}`);
      ThreeEngine.highlightOrgan(targetKey);

      // Se for intravenoso, dispara fluxo arterial de partículas
      if (isIV && typeof ThreeEngine.triggerParticleFlow === "function") {
        ThreeEngine.triggerParticleFlow("aorta_flow");
        setTimeout(() => {
          if (typeof ThreeEngine.stopParticles === "function") {
            ThreeEngine.stopParticles();
          }
        }, 4000);
      }
    }

    // Persiste o registo acadêmico de simulação
    if (typeof ApiCache !== "undefined" && typeof ApiCache.registrarSimulacao === "function") {
      ApiCache.registrarSimulacao(drugName, via);
    }
  }

  // =========================================================
  // 4. ESTADO DE PRONTIDÃO (EMPTY STATE)
  // =========================================================
  function renderEmptyStateChart() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas || typeof Chart === "undefined") return;

    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = canvas.getContext("2d");

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["0h", "3h", "6h", "9h", "12h", "15h", "18h", "21h", "24h"],
        datasets: [
          {
            label: "Aguardando Simulação Farmacocinética...",
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            borderColor: PALETTE.grid,
            borderWidth: 1.8,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: PALETTE.textMuted, font: { size: 10 } }
          }
        },
        scales: {
          x: {
            grid: { color: PALETTE.grid, drawBorder: false },
            ticks: { color: PALETTE.textMuted, font: { size: 9 } }
          },
          y: {
            beginAtZero: true,
            max: 50,
            grid: { color: PALETTE.grid, drawBorder: false },
            ticks: { color: PALETTE.textMuted, font: { size: 9 } }
          }
        }
      }
    });
  }

  return {
    init,
    calculateCurve,
    simulateDrug,
    renderEmptyStateChart
  };
})();

// Inicialização segura
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", PKEngine.init);
} else {
  PKEngine.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/pk-engine.js                               */
/* ========================================================================= */

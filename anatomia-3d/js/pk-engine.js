/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/pk-engine.js                            */
/* ========================================================================= */

/**
 * MOTOR FARMACOCINÉTICO (PK) E VISUALIZAÇÃO DE DADOS
 * Ecossistema LAIFT - Módulo Anatomia 3D & Biohacking
 * Modela curvas de Concentração-Tempo (Oral e IV) utilizando equações unicompartimentais.
 */

const PKEngine = (() => {
  let chartInstance = null;
  const CANVAS_ID = 'pkChartCanvas';

  // Configurações Globais de Tema (Alinhado ao CSS)
  const THEME = {
    primary: '#38bdf8',       // Sky 400
    primaryGlow: 'rgba(56, 189, 248, 0.2)',
    accent: '#34d399',        // Emerald 400
    accentGlow: 'rgba(52, 211, 153, 0.2)',
    gridColor: 'rgba(51, 65, 85, 0.5)', // Slate 700 c/ opacidade
    textColor: '#94a3b8'      // Slate 400
  };

  /**
   * Inicializa o gráfico vazio (Estado Prontidão)
   */
  function init() {
    console.log('[LAIFT PK-Engine] Inicializando Motor Matemático...');
    renderEmptyChart();
  }

  /**
   * Equação Unicompartimental
   * @param {Object} params - dose (mg), f (biodisponibilidade 0-1), vd (L), halfLife (h), ka (taxa de absorção h-1)
   * @param {String} route - 'IV' ou 'ORAL'
   * @returns {Object} { labels: Array<String>, data: Array<Number> }
   */
  function calculatePharmacokinetics(params, route = 'ORAL') {
    // Valores padrão de segurança caso falte algum parâmetro
    const dose = params.dose || 500;
    const f = params.f || 1.0; 
    const vd = params.vd || 50; 
    const halfLife = params.halfLife || 2; 
    const ka = params.ka || 1.5; // Constante de absorção genérica

    const ke = Math.LN2 / halfLife; // Constante de eliminação (0.693 / t1/2)
    
    const labels = [];
    const data = [];

    // Calcula a concentração ao longo de 24 horas (intervalos de 30 min)
    for (let t = 0; t <= 24; t += 0.5) {
      let concentracao = 0;

      if (route === 'IV') {
        // Modelo Bolus IV: C(t) = C0 * e^(-ke*t)
        const c0 = (dose * f) / vd;
        concentracao = c0 * Math.exp(-ke * t);
      } else {
        // Modelo Oral (Bateman): C(t) = [F*D*ka / Vd*(ka-ke)] * [e^(-ke*t) - e^(-ka*t)]
        if (Math.abs(ka - ke) < 0.001) {
          // Prevenção de divisão por zero (se ka == ke)
          concentracao = ((f * dose * ke * t) / vd) * Math.exp(-ke * t);
        } else {
          const fator = (f * dose * ka) / (vd * (ka - ke));
          concentracao = fator * (Math.exp(-ke * t) - Math.exp(-ka * t));
        }
      }

      labels.push(t === Math.floor(t) ? `${t}h` : ''); // Formata rótulos para o eixo X
      data.push(Math.max(0, parseFloat(concentracao.toFixed(2)))); // Limpa pequenos ruídos matemáticos
    }

    return { labels, data };
  }

  /**
   * Renderiza a simulação no Chart.js
   * @param {String} drugName - Nome do fármaco/composto
   * @param {Object} params - Parâmetros farmacocinéticos
   * @param {String} route - 'IV' ou 'ORAL'
   */
  function simulateDrug(drugName, params, route) {
    const pkData = calculatePharmacokinetics(params, route);
    
    // Define as cores com base na via de administração
    const colorLine = route === 'IV' ? THEME.accent : THEME.primary;
    const colorFill = route === 'IV' ? THEME.accentGlow : THEME.primaryGlow;

    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = document.getElementById(CANVAS_ID).getContext('2d');
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: pkData.labels,
        datasets: [{
          label: `[${drugName}] Plasmática (mg/L) - Via ${route}`,
          data: pkData.data,
          borderColor: colorLine,
          backgroundColor: colorFill,
          borderWidth: 2,
          pointRadius: 0,       // Esconde pontos para uma curva limpa
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4          // Suaviza a curva (Bézier)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Fundamental para o layout Mobile-First flexível
        plugins: {
          legend: {
            display: true,
            labels: { color: THEME.textColor, font: { size: 10 } }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(2, 6, 23, 0.9)',
            titleColor: THEME.primary,
            bodyColor: '#fff',
            borderColor: THEME.border,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: THEME.gridColor, drawBorder: false },
            ticks: { color: THEME.textColor, maxTicksLimit: 12 }
          },
          y: {
            beginAtZero: true,
            grid: { color: THEME.gridColor, drawBorder: false },
            ticks: { color: THEME.textColor }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });

    // INTEGRAÇÃO COM O MOTOR 3D:
    // Se a simulação incluir um órgão alvo, enviamos a ordem para o ThreeEngine acender a malha 3D
    if (params.targetOrgan && typeof ThreeEngine !== 'undefined') {
      console.log(`[LAIFT PK-Engine] Acendendo órgão alvo no modelo 3D: ${params.targetOrgan}`);
      ThreeEngine.highlightOrgan(params.targetOrgan);
    }
  }

  /**
   * Desenha o gráfico inicial vazio aguardando ação do aluno.
   */
  function renderEmptyChart() {
    const ctx = document.getElementById(CANVAS_ID);
    if(!ctx) return;

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['0h', '4h', '8h', '12h', '16h', '20h', '24h'],
        datasets: [{
          label: 'Aguardando Simulação Farmacocinética...',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: THEME.gridColor,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: THEME.textColor } } },
        scales: {
          x: { grid: { color: THEME.gridColor } },
          y: { beginAtZero: true, max: 100, grid: { color: THEME.gridColor } }
        }
      }
    });
  }

  return {
    init,
    simulateDrug
  };
})();

// Inicialização
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', PKEngine.init);
} else {
  PKEngine.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/pk-engine.js                               */
/* ========================================================================= */

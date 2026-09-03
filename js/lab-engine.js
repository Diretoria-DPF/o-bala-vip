/**
 * MOTOR DO LABORATÓRIO VIRTUAL DE QUÍMICA & TOXICOLOGIA
 * Ensaios de Coloração de Chama e Precipitação Forense
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const LabEngine = (() => {
  const reagents = [
    {
      id: 'nacl',
      name: 'Cloreto de Sódio (NaCl)',
      type: 'flame',
      color: '#fbbf24', // Amarelo Intenso
      flameClass: 'flame-sodium',
      emissionWavelength: '589 nm',
      observation: 'Linha D de emissão atômica característica do Sódio. Chama amarela brilhante e duradoura decorrente da transição 3p -> 3s.'
    },
    {
      id: 'kcl',
      name: 'Cloreto de Potássio (KCl)',
      type: 'flame',
      color: '#c084fc', // Violeta / Lilás
      flameClass: 'flame-potassium',
      emissionWavelength: '766 nm',
      observation: 'Coloração violeta/lilás característica dos íons Potássio. Observação clínica: o potássio é frequentemente mascarado por traços de sódio sem o uso de vidro de cobalto.'
    },
    {
      id: 'cucl2',
      name: 'Cloreto de Cobre II (CuCl2)',
      type: 'flame',
      color: '#2dd4bf', // Azul-esverdeado
      flameClass: 'flame-copper',
      emissionWavelength: '510-530 nm',
      observation: 'Chama verde-azulada característica de haletos de cobre. Ensaio de Beilstein para identificação de compostos halogenados.'
    },
    {
      id: 'bacl2',
      name: 'Cloreto de Bário (BaCl2)',
      type: 'flame',
      color: '#bef264', // Verde Maçã
      flameClass: 'flame-barium',
      emissionWavelength: '524 nm',
      observation: 'Coloração verde-maçã característica de sais de Bário. Alerta toxicológico: sais solúveis de bário provocam hipocalemia grave e paralisia muscular flácida.'
    },
    {
      id: 'pbi2_reaction',
      name: 'Reação Forense: Nitrato de Chumbo + Iodeto de Potássio',
      type: 'precipitation',
      observation: 'Precipitação imediata de Iodeto de Chumbo II (PbI2), formando um sedimento cristalino amarelo-ouro brilhante ("Chuva de Ouro"). Kps = 1,4 x 10^-8.'
    }
  ];

  let dom = {};

  function initDomReferences() {
    dom.shelf = document.getElementById('reagentShelf');
    dom.flame = document.getElementById('burnerFlame');
    dom.log = document.getElementById('labLogText');
  }

  function renderShelf() {
    dom.shelf.innerHTML = '';
    reagents.forEach(reagent => {
      const bottle = document.createElement('div');
      bottle.className = 'reagent-bottle';
      bottle.textContent = reagent.name;
      bottle.addEventListener('click', () => performTest(reagent));
      dom.shelf.appendChild(bottle);
    });
  }

  function performTest(reagent) {
    if (reagent.type === 'flame') {
      triggerFlameAnimation(reagent.color);
      dom.log.innerHTML = `
        <strong>Ensaio Espectroscópico à Chama:</strong> ${reagent.name}<br>
        <strong>Comprimento de Onda Dominante:</strong> ${reagent.emissionWavelength}<br>
        <span style="color: #94a3b8;">${reagent.observation}</span>
      `;
    } else if (reagent.type === 'precipitation') {
      resetFlame();
      dom.log.innerHTML = `
        <strong>Reação de Precipitação / Análise Forense:</strong><br>
        Pb(NO3)2 (aq) + 2 KI (aq) &rarr; <strong>PbI2 (s) &darr;</strong> + 2 KNO3 (aq)<br>
        <span style="color: #facc15;">${reagent.observation}</span>
      `;
    }
  }

  function triggerFlameAnimation(color) {
    dom.flame.style.background = `linear-gradient(to top, ${color}, #ffffff)`;
    dom.flame.style.boxShadow = `0 0 35px ${color}`;

    setTimeout(() => {
      resetFlame();
    }, 4500);
  }

  function resetFlame() {
    dom.flame.style.background = 'linear-gradient(to top, #3b82f6, #60a5fa)';
    dom.flame.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.6)';
  }

  function init() {
    initDomReferences();
    renderShelf();
  }

  return {
    init
  };
})();

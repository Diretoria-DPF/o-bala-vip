(function() {
  // ==========================================
  // 1. SISTEMA DE TELEMETRIA (RASTREIO DE ERROS)
  // ==========================================
  const relatorioErros = [];
  window.addEventListener('error', function(e) { relatorioErros.push(`[ERRO] ${e.message} (Linha: ${e.lineno})`); console.warn("LAIFT Rastreio:", e.message); });
  window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
      alert("=== LAIFT: MODO DEPURAÇÃO ===\n\n" + (relatorioErros.length ? relatorioErros.join('\n') : "✅ Sistema estável. Nenhum erro registado."));
    }
  });

  // ==========================================
  // 2. SISTEMA DE ÁUDIO (Web Audio API)
  // ==========================================
  let audioCtx = null;
  function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  function tocarSom(tipo) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    if (tipo === 'gota') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (tipo === 'erro') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (tipo === 'sucesso') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
  }

  // ==========================================
  // 3. TABELAS QUÍMICAS E CONSTANTES ORIGINAIS
  // ==========================================
  const MM = { Na:23, Al:27, Zn:65.4, Mg:24.3, CuSO4:159.6, NaCl:58.4, CaCO3:100, KI:166, AgNO3:169.9, PbNO3:331, NaOH:40, HCl:36.5, Li:6.94, K:39.1, Ca:40.08, NaHCO3:84.0, K2CO3:138.2, KOH:56.1, LiOH:23.95, CaOH2:74.09, I2:253.8, S:32.06, P:30.97, Fe:55.8, Ni:58.7, Cu:63.5, Sn:118.7, Pb:207.2, HNO3:63.0, HClO4:100.5, H3PO4:98.0 };
  const CONC_AQ = { H2O2_aq:3.0, PbNO3_aq:1.0, AgNO3_aq:1.0, CdNO3_aq:1.0, CuSO4_aq:1.0, FeCl3_aq:1.0, ZnSO4_aq:1.0, NiCl2_aq:1.0, SbCl3_aq:1.0, CaCl2_aq:1.0, BaCl2_aq:1.0, HCl_aq:6.0, H2SO4_aq:9.0, AcidoAcetico_aq:1.0, KI_aq:1.0, NH42S_aq:1.0, NaOH_aq:6.0, NH3_aq:5.0, Na2CO3_aq:1.0, NaClO_aq:2.0, NaHCO3_aq:1.0, K2CO3_aq:1.0, KOH_aq:6.0, LiOH_aq:5.0, CaOH2_aq:0.5, HNO3_aq:6.0, HClO4_aq:6.0, H3PO4_aq:4.0 };
  const BP = { H2O_l:100, Etanol_l:78.4, Acetona_l:56, Hexano_l:68.7, Benzeno_l:80.1, Tolueno_l:110.6, Metanol_l:64.7, Cloroformio_l:61.2 };
  const FP = { H2O_l:0, Etanol_l:-114, Acetona_l:-95, Hexano_l:-95, Benzeno_l:5.5, Tolueno_l:-95, Metanol_l:-98, Cloroformio_l:-63.5 };
  const PRECIP_TABLE = [
    { cat:'Ag+', an:'Cl-', cC:1, cA:1, prod:'AgCl_s', cor:'#f5f5f5' }, { cat:'Pb2+', an:'Cl-', cC:1, cA:2, prod:'PbCl2_s', cor:'#eceff1' },
    { cat:'Pb2+', an:'I-', cC:1, cA:2, prod:'PbI2_s', cor:'#ffeb3b' }, { cat:'Ag+', an:'I-', cC:1, cA:1, prod:'AgI_s', cor:'#fff9c4' },
    { cat:'Cu2+', an:'OH-', cC:1, cA:2, prod:'Cu(OH)2_s', cor:'#4dd0e1' }, { cat:'Fe3+', an:'OH-', cC:1, cA:3, prod:'Fe(OH)3_s', cor:'#8d6e63' },
    { cat:'Ni2+', an:'OH-', cC:1, cA:2, prod:'Ni(OH)2_s', cor:'#a5d6a7' }, { cat:'Ca2+', an:'CO3_2-', cC:1, cA:1, prod:'CaCO3_s', cor:'#fafafa' },
    { cat:'Ba2+', an:'CO3_2-', cC:1, cA:1, prod:'BaCO3_s', cor:'#f5f5f5' }, { cat:'Pb2+', an:'S_2-', cC:1, cA:1, prod:'PbS_s', cor:'#212121' },
    { cat:'Ag+', an:'S_2-', cC:2, cA:1, prod:'Ag2S_s', cor:'#1a1a1a' }, { cat:'Cu2+', an:'S_2-', cC:1, cA:1, prod:'CuS_s', cor:'#1b1b1b' },
    { cat:'Cd2+', an:'S_2-', cC:1, cA:1, prod:'CdS_s', cor:'#fdd835' }, { cat:'Zn2+', an:'S_2-', cC:1, cA:1, prod:'ZnS_s', cor:'#e8eaf6' },
    { cat:'Sb3+', an:'S_2-', cC:2, cA:3, prod:'Sb2S3_s', cor:'#ff7043' }, { cat:'Ca2+', an:'SO4_2-', cC:1, cA:1, prod:'CaSO4_s', cor:'#f5f5f5' },
    { cat:'Ba2+', an:'SO4_2-', cC:1, cA:1, prod:'BaSO4_s', cor:'#ffffff' }, { cat:'Pb2+', an:'SO4_2-', cC:1, cA:1, prod:'PbSO4_s', cor:'#eceff1' }
  ];

  // ==========================================
  // 4. ESTADO GLOBAL DO LABORATÓRIO E HISTÓRICO
  // ==========================================
  let sys = { maxVol:250, vol:0, temp:25, pressao:1, isClosed:false, modoTermico:'ambiente', especies:new Map(), shattered:false, fenolftaleina:false };
  let historico = [], timerAdd = null, timerLoop = null, qtdRestante = 0, incrAdd = 1, phDataPoints = [];
  let velocidadeTempo = 1, agitadorAtivo = false, focoAtivo = false;

  const logEl = document.getElementById('logStream'), phCanvas = document.getElementById('phCanvas'), phCtx = phCanvas.getContext('2d');
  phCanvas.width = 280; phCanvas.height = 140;

  function salvarEstado() {
    historico.push(JSON.stringify({ vol: sys.vol, temp: sys.temp, especies: Array.from(sys.especies.entries()) }));
    if (historico.length > 5) historico.shift();
  }

  function desfazerAcao() {
    if (historico.length === 0) { log('Nada para desfazer.', 'log-warn'); return; }
    const estadoAntigo = JSON.parse(historico.pop());
    sys.vol = estadoAntigo.vol; sys.temp = estadoAntigo.temp; sys.especies = new Map(estadoAntigo.especies);
    atualizarEquilibrio(); atualizarEstadoFisico(); atualizarUI(); log('↩ Última ação desfeita.', 'log-info');
  }

  function log(msg, cls='') {
    const ts = new Date().toTimeString().slice(0,8); const entry = document.createElement('div');
    entry.className = 'log-entry'; entry.innerHTML = `<span class="log-time">[${ts}]</span><span class="${cls}">${msg}</span>`;
    logEl.prepend(entry); if (logEl.children.length > 70) logEl.removeChild(logEl.lastChild);
  }
  
  function limparRegistro() {
    logEl.innerHTML = '<span style="color:#546e7a;">[Sistema] Registro limpo.</span>';
  }
  
  function qtd(chave) { return sys.especies.get(chave) || 0; }
  function adicionarEspecie(chave, mmol) { if (mmol <= 0) return; sys.especies.set(chave, (sys.especies.get(chave)||0)+mmol); }
  function removerEspecie(chave, mmol) { const atual = sys.especies.get(chave)||0; const novo = Math.max(0, atual-mmol); if (novo < 1e-12) sys.especies.delete(chave); else sys.especies.set(chave, novo); }

  // ==========================================
  // 5. SISTEMA AVANÇADO DE MISSÕES
  // ==========================================
  const missoes = [
    { titulo: "Missão 1: Neutralização Básica", desc: "Atinge um pH entre 7.0 e 7.5 usando ácido e base. (Volume > 20mL).", check: () => calcularpH() >= 7.0 && calcularpH() <= 7.5 && sys.vol >= 20 },
    { titulo: "Missão 2: Chuva de Ouro", desc: "Forma um precipitado amarelo intenso de Iodeto de Chumbo (PbI₂).", check: () => qtd('PbI2_s') > 0.1 },
    { titulo: "Missão 3: Libertação de Gás H₂", desc: "Faz um metal sólido reagir com ácido para gerar gás Hidrogénio.", check: () => qtd('H2_g') > 1 },
    { titulo: "Missão 4: Ponto de Ebulição", desc: "Aquece a água no laboratório até que comece a evaporar ativamente (100°C).", check: () => sys.temp >= 100 && qtd('H2O_l') > 0 },
    { titulo: "Missão 5: Hidróxido Azul", desc: "Cria um precipitado azul claro de Hidróxido de Cobre (Cu(OH)₂).", check: () => qtd('Cu(OH)2_s') > 0.1 },
    { titulo: "Missão 6: Chuva de Prata", desc: "Mistura Nitrato de Prata (AgNO₃) com Cloreto (Ex: NaCl ou HCl) para formar AgCl.", check: () => qtd('AgCl_s') > 0.1 },
    { titulo: "Missão 7: Gelo de Laboratório", desc: "Usa o sistema de resfriamento para baixar a temperatura da água até congelar (0°C).", check: () => sys.temp <= 0 && qtd('H2O_s') > 0 },
    { titulo: "Missão 8: Ambiente Super Ácido", desc: "Cria uma solução altamente corrosiva com pH menor ou igual a 2.0.", check: () => calcularpH() <= 2.0 && sys.vol > 10 },
    { titulo: "Missão 9: Ambiente Super Básico", desc: "Cria uma solução fortemente alcalina com pH maior ou igual a 12.0.", check: () => calcularpH() >= 12.0 && sys.vol > 10 },
    { titulo: "Missão 10: Efervescência de Carbonato", desc: "Mistura um carbonato (como NaHCO₃ ou CaCO₃) com ácido para liberar CO₂.", check: () => qtd('CO2_g') > 0.5 }
  ];
  let missaoAtual = 0;

  function atualizarUI_Missao() {
    if (missaoAtual >= missoes.length) {
      document.getElementById('missionTitle').innerText = "🎉 Mestre Laboratorial!";
      document.getElementById('missionDesc').innerText = "Concluíste todas as 10 missões propostas com sucesso.";
      document.getElementById('missionStatus').style.display = 'none';
      if(document.getElementById('btnNextMission')) document.getElementById('btnNextMission').style.display = 'none';
      return;
    }
    const m = missoes[missaoAtual];
    document.getElementById('missionTitle').innerText = m.titulo;
    document.getElementById('missionDesc').innerText = m.desc;
    document.getElementById('missionStatus').innerText = "Pendente";
    document.getElementById('missionStatus').style.display = 'inline-block';
    document.getElementById('missionStatus').style.borderColor = "#ff9800";
    document.getElementById('missionStatus').style.color = "#ff9800";
    if(document.getElementById('btnNextMission')) document.getElementById('btnNextMission').style.display = 'none';
  }

  function verificarMissoes() {
    if (missaoAtual >= missoes.length) return;
    if (missoes[missaoAtual].check()) {
      const badge = document.getElementById('missionStatus');
      if (badge && badge.innerText !== 'Concluída ✅') {
        badge.innerText = 'Concluída ✅';
        badge.style.borderColor = 'var(--neon-green)';
        badge.style.color = 'var(--neon-green)';
        if(document.getElementById('btnNextMission')) document.getElementById('btnNextMission').style.display = 'block';
        tocarSom('sucesso');
        log('🏆 ' + missoes[missaoAtual].titulo + ' Concluída!', 'log-info');
      }
    }
  }

  window.proximaMissao = function() { missaoAtual++; resetarLaboratorio(); atualizarUI_Missao(); };
  
  window.abrirLivroMissoes = function() {
    let html = '<ul style="list-style:none; padding:0;">';
    missoes.forEach((m, i) => {
      let status = i < missaoAtual ? "✅ Concluída" : i === missaoAtual ? "▶ Em Progresso" : "🔒 Bloqueada";
      let color = i < missaoAtual ? "var(--neon-green)" : i === missaoAtual ? "#ff9800" : "#546e7a";
      html += `<li style="color:${color}; margin-bottom:12px; border-bottom:1px dashed #1e3a5f; padding-bottom:8px;"><strong>${m.titulo}</strong> <span style="font-size:0.6rem;">(${status})</span><br><span style="color:#b0bec5; font-size:0.75rem;">${m.desc}</span></li>`;
    });
    html += '</ul>';
    document.getElementById('missionsList').innerHTML = html;
    document.getElementById('missionsModal').style.display = 'flex';
  };
  
  window.fecharLivroMissoes = function() { document.getElementById('missionsModal').style.display = 'none'; };

  // Funções do Livro de Missões exportadas para o HTML
  window.proximaMissao = function() { 
    missaoAtual++; 
    resetarLaboratorio(); 
    atualizarUI_Missao(); 
  };
  
  window.abrirLivroMissoes = function() {
    let html = '<ul style="list-style:none; padding:0;">';
    missoes.forEach((m, i) => {
      let status = i < missaoAtual ? "✅ Concluída" : i === missaoAtual ? "▶ Em Progresso" : "🔒 Bloqueada";
      let color = i < missaoAtual ? "var(--neon-green)" : i === missaoAtual ? "#ff9800" : "#546e7a";
      html += `<li style="color:${color}; margin-bottom:12px; border-bottom:1px dashed #1e3a5f; padding-bottom:8px;"><strong>${m.titulo}</strong> <span style="font-size:0.6rem;">(${status})</span><br><span style="color:#b0bec5; font-size:0.75rem;">${m.desc}</span></li>`;
    });
    html += '</ul>';
    document.getElementById('missionsList').innerHTML = html;
    document.getElementById('missionsModal').style.display = 'flex';
  };
  
  window.fecharLivroMissoes = function() {
    document.getElementById('missionsModal').style.display = 'none';
  };

  // ==========================================
  // 6. INCIDENTES, RESET E TROCA DE VIDRARIA
  // ==========================================
  function dispararAlerta(titulo, msg) {
    if (window.pararAdicao) window.pararAdicao();
    window.setModoTermico('ambiente'); tocarSom('erro');
    let ticketHTML = `<div class="incident-ticket"><h3>🚨 RELATÓRIO DE INCIDENTE</h3><p><strong>FALHA:</strong> ${titulo}</p><p><strong>CAUSA:</strong> ${msg}</p><p><strong>STATUS TÉRMICO:</strong> ${sys.temp.toFixed(1)} °C</p><p><strong>PRESSÃO:</strong> ${sys.pressao.toFixed(2)} atm</p></div>`;
    document.getElementById('alertTitle').innerText = "Sistema de Segurança Ativado";
    document.getElementById('alertMsg').innerHTML = ticketHTML;
    document.getElementById('alertOverlay').style.display = 'flex';
    log(`🚨 INCIDENTE: ${titulo}`, 'log-danger');
  }

  function resetarLaboratorio() {
    if (timerAdd) { clearInterval(timerAdd); timerAdd = null; }
    document.getElementById('btnStartAdd').innerText = '▶ Adicionar'; window.setModoTermico('ambiente'); document.getElementById('tempAlvo').value = 25;
    sys.especies.clear(); sys.vol = 0; sys.temp = 25; sys.pressao = 1; sys.shattered = false; sys.fenolftaleina = false; historico = []; phDataPoints = [];
    document.getElementById('alertOverlay').style.display = 'none'; document.getElementById('qtdInput').value = '10'; document.getElementById('bubbleOverlay').style.opacity = '0'; document.getElementById('pressWarn').style.display = 'none'; document.getElementById('freezeOverlay').style.opacity = '0';
    atualizarUI_Missao();
    atualizarUI(); window.limparCurvaPH(); log('Sistema resetado.', 'log-info');
  }

  function trocarVidraria() {
    if (sys.vol > 0 || sys.especies.size > 0) { if (!confirm('Trocar vidraria descarta o conteúdo. Continuar?')) return; }
    const v = document.getElementById('vidrariaSelect').value; const vessel = document.getElementById('vessel');
    vessel.className = 'glass-vessel'; sys.isClosed = false;
    if (v === 'tubo_20') { sys.maxVol=20; vessel.classList.add('vessel-beaker'); vessel.style.width='40px'; vessel.style.height='140px'; }
    else if (v === 'becker_250') { sys.maxVol=250; vessel.classList.add('vessel-beaker'); vessel.style.width='150px'; vessel.style.height='180px'; }
    else if (v === 'becker_1000') { sys.maxVol=1000; vessel.classList.add('vessel-beaker'); vessel.style.width='220px'; vessel.style.height='240px'; }
    else if (v === 'erlen_250') { sys.maxVol=250; vessel.classList.add('vessel-flask'); vessel.style.width='150px'; vessel.style.height='180px'; sys.isClosed=true; }
    document.getElementById('glasswareZone').classList.toggle('closed-system', sys.isClosed);
    resetarLaboratorio(); log(`Vidraria: ${v.replace(/_/g,' ')} (${sys.maxVol} mL)`, 'log-info');
  }

  // ==========================================
  // 7. ANIMAÇÕES E INÍCIO DE ADIÇÃO
  // ==========================================
  function animarDespejo(modo) {
    const zone = document.getElementById('glasswareZone'); const animEl = document.createElement('div');
    if (modo === 'gota') { animEl.className = 'anim-drop'; zone.appendChild(animEl); tocarSom('gota'); setTimeout(() => animEl.remove(), 300); } 
    else if (modo === 'jato') { if (document.querySelector('.anim-stream')) return; animEl.className = 'anim-stream'; zone.appendChild(animEl); } 
    else if (modo === 'tudo') { animEl.className = 'anim-splash'; zone.appendChild(animEl); setTimeout(() => animEl.remove(), 400); }
  }
  function pararAnimacaoJato() { const stream = document.querySelector('.anim-stream'); if (stream) stream.remove(); }
  function getSelectedReagent() { const sel = document.querySelector('input[name="reagenteSel"]:checked'); return sel ? sel.value : null; }

  function iniciarAdicao() {
    initAudio(); if (sys.shattered) return;
    const reag = getSelectedReagent(); if (!reag) { log('Selecione um reagente.', 'log-warn'); return; }
    let raw = parseFloat(document.getElementById('qtdInput').value); if (isNaN(raw) || raw <= 0) return;
    
    salvarEstado(); qtdRestante = raw; const modo = document.getElementById('modoAdd').value;
    if (modo === 'tudo') {
      animarDespejo('tudo'); processarCarga(reag, qtdRestante); log(`Adicionado ${qtdRestante.toFixed(1)} de ${reag}.`);
    } else {
      incrAdd = (modo === 'jato') ? 10 : 1; document.getElementById('btnStartAdd').innerText = '⚡ Adicionando...';
      if (modo === 'jato') animarDespejo('jato');
      if (timerAdd) clearInterval(timerAdd);
      timerAdd = setInterval(() => {
        if (qtdRestante <= 0 || sys.shattered) { window.pararAdicao(); return; }
        if (modo === 'gota') animarDespejo('gota');
        let add = Math.min(incrAdd, qtdRestante); qtdRestante -= add; processarCarga(reag, add);
      }, 280 / velocidadeTempo);
    }
  }

  function pararAdicao() {
    if (timerAdd) { clearInterval(timerAdd); timerAdd = null; }
    document.getElementById('btnStartAdd').innerText = '▶ Adicionar'; pararAnimacaoJato();
  }

  // ==========================================
  // 8. LÓGICA QUÍMICA
  // ==========================================
  function processarCarga(reag, qtdAdd) {
    if (qtdAdd <= 0 || sys.shattered) return;
    let mmol = 0;

    if (reag.endsWith('_l')) {
      adicionarEspecie(reag, qtdAdd * 10);
      sys.vol += qtdAdd;
    } else if (reag.endsWith('_aq')) {
      const conc = CONC_AQ[reag] || 1;
      mmol = conc * qtdAdd;
      adicionarEspecie('H2O_l', qtdAdd * 10);
      sys.vol += qtdAdd;

      const dissocMap = {
        'HCl_aq': [['H+', 1], ['Cl-', 1]],
        'H2SO4_aq': [['H+', 2], ['SO4_2-', 1]],
        'HNO3_aq': [['H+', 1], ['NO3-', 1]],
        'HClO4_aq': [['H+', 1], ['ClO4-', 1]],
        'H3PO4_aq': [['H+', 3], ['PO4_3-', 1]],
        'AcidoAcetico_aq': [['H+', 0.1], ['CH3COO-', 0.1]],
        'NaOH_aq': [['Na+', 1], ['OH-', 1]],
        'NH3_aq': [['NH3', 1], ['OH-', 0.1]],
        'NaClO_aq': [['Na+', 1], ['ClO-', 1]],
        'KI_aq': [['K+', 1], ['I-', 1]],
        'NH42S_aq': [['NH4+', 2], ['S_2-', 1]],
        'Na2CO3_aq': [['Na+', 2], ['CO3_2-', 1]],
        'PbNO3_aq': [['Pb2+', 1], ['NO3-', 2]],
        'AgNO3_aq': [['Ag+', 1], ['NO3-', 1]],
        'CdNO3_aq': [['Cd2+', 1], ['NO3-', 2]],
        'CuSO4_aq': [['Cu2+', 1], ['SO4_2-', 1]],
        'FeCl3_aq': [['Fe3+', 1], ['Cl-', 3]],
        'ZnSO4_aq': [['Zn2+', 1], ['SO4_2-', 1]],
        'NiCl2_aq': [['Ni2+', 1], ['Cl-', 2]],
        'SbCl3_aq': [['Sb3+', 1], ['Cl-', 3]],
        'CaCl2_aq': [['Ca2+', 1], ['Cl-', 2]],
        'BaCl2_aq': [['Ba2+', 1], ['Cl-', 2]],
        'H2O2_aq': [['H2O2', 1]],
        'NaHCO3_aq': [['Na+', 1], ['HCO3-', 1]],
        'K2CO3_aq': [['K+', 2], ['CO3_2-', 1]],
        'KOH_aq': [['K+', 1], ['OH-', 1]],
        'LiOH_aq': [['Li+', 1], ['OH-', 1]],
        'CaOH2_aq': [['Ca2+', 1], ['OH-', 2]]
      };

      if (dissocMap[reag]) {
        dissocMap[reag].forEach(([sp, f]) => adicionarEspecie(sp, mmol * f));
      }

    } else if (reag.endsWith('_s')) {
      let mm = MM[reag.replace('_s', '')] || 100;
      mmol = (qtdAdd * 1000) / mm;
      adicionarEspecie(reag, mmol);

    } else if (reag === 'fenolftaleina') {
      sys.fenolftaleina = true;
      log('Indicador fenolftaleína adicionado.');
    }
    
    if (sys.vol > sys.maxVol) {
      dispararAlerta('Transbordamento!', 'Volume excedeu a capacidade.');
      sys.vol = sys.maxVol;
    }

    atualizarEquilibrio();
    atualizarEstadoFisico();
    atualizarUI();
    verificarMissoes(); // Verifica se a adição concluiu a missão
    registrarPontoPH();
  }

  function atualizarEquilibrio() {
    const volL = sys.vol / 1000;
    
    // Dissolução
    if (volL > 0 && qtd('H2O_l') > 0) {
      let txDissolucao = agitadorAtivo ? 1.0 : 0.2; 
      
      let sNaCl = qtd('NaCl_s'); 
      if (sNaCl > 0) { let r = sNaCl * txDissolucao; removerEspecie('NaCl_s', r); adicionarEspecie('Na+', r); adicionarEspecie('Cl-', r); }
      
      let sCuSO4 = qtd('CuSO4_s'); 
      if (sCuSO4 > 0) { let r = sCuSO4 * txDissolucao; removerEspecie('CuSO4_s', r); adicionarEspecie('Cu2+', r); adicionarEspecie('SO4_2-', r); }
      
      let sNaHCO3 = qtd('NaHCO3_s'); 
      if (sNaHCO3 > 0) { let r = sNaHCO3 * txDissolucao; removerEspecie('NaHCO3_s', r); adicionarEspecie('Na+', r); adicionarEspecie('HCO3-', r); }
    }
    
    // Neutralização Ácido-Base
    const h = qtd('H+'), oh = qtd('OH-');
    if (h > 0 && oh > 0) {
      const r = Math.min(h, oh);
      removerEspecie('H+', r);
      removerEspecie('OH-', r);
      adicionarEspecie('H2O_l', r);
      sys.temp += r * 0.05; // Reação exotérmica
    }
    
    // Reações de Metais e Carbonatos com Ácido
    const hNow = qtd('H+');
    if (hNow > 0) {
      const metais = ['Zn_s','Mg_s','Al_s','Na_s','Li_s','K_s','Ca_s','Fe_s','Ni_s','Cu_s','Sn_s','Pb_s'];
      for (let m of metais) {
        let qm = qtd(m);
        if (qm <= 0) continue;

        let valencia = 1; 
        if (['Mg_s','Ca_s','Zn_s','Fe_s','Ni_s','Cu_s','Sn_s','Pb_s'].includes(m)) valencia = 2;
        else if (['Al_s','Fe_s'].includes(m)) valencia = 3;

        let ion = m.replace('_s', '') + (valencia > 1 ? valencia + '+' : '+');
        if (m === 'Na_s') ion = 'Na+'; else if (m === 'Li_s') ion = 'Li+'; else if (m === 'K_s') ion = 'K+'; else if (m === 'Ca_s') ion = 'Ca2+'; else if (m === 'Fe_s') ion = 'Fe2+'; else if (m === 'Ni_s') ion = 'Ni2+'; else if (m === 'Cu_s') ion = 'Cu2+'; else if (m === 'Sn_s') ion = 'Sn2+'; else if (m === 'Pb_s') ion = 'Pb2+';

        if (hNow >= valencia) {
          let r = Math.min(qm, hNow / valencia);
          if (!agitadorAtivo) r *= 0.5; // Reação mais lenta sem agitação
          
          removerEspecie(m, r); removerEspecie('H+', valencia * r); adicionarEspecie(ion, r); adicionarEspecie('H2_g', r * (valencia === 2 ? 1 : valencia === 3 ? 1.5 : 0.5));
          sys.temp += r * (m === 'Na_s' ? 5 : m === 'Li_s' ? 4.5 : m === 'K_s' ? 5.5 : m === 'Ca_s' ? 3 : 2);
        }
      }

      // Carbonatos
      const co3 = qtd('CO3_2-');
      if (co3 > 0 && hNow >= 2) { const r = Math.min(co3, hNow / 2); removerEspecie('CO3_2-', r); removerEspecie('H+', 2 * r); adicionarEspecie('H2O_l', r); adicionarEspecie('CO2_g', r); }

      const caco3 = qtd('CaCO3_s');
      if (caco3 > 0 && hNow >= 2) { const r = Math.min(caco3, hNow / 2); removerEspecie('CaCO3_s', r); removerEspecie('H+', 2 * r); adicionarEspecie('Ca2+', r); adicionarEspecie('H2O_l', r); adicionarEspecie('CO2_g', r); }

      // Gás Cloro Tóxico
      const clo = qtd('ClO-'), cl = qtd('Cl-');
      if (clo > 0 && cl > 0 && hNow >= 2) {
        const r = Math.min(clo, cl, hNow / 2); removerEspecie('ClO-', r); removerEspecie('Cl-', r); removerEspecie('H+', 2 * r); adicionarEspecie('H2O_l', r); adicionarEspecie('Cl2_g', r); log('⚠ Gás cloro (Cl₂) liberado!', 'log-danger');
      }
    }

    // Reações Explosivas
    const alcalinos = ['Na_s', 'Li_s', 'K_s'];
    for (let m of alcalinos) {
      let qm = qtd(m); let agua = qtd('H2O_l');
      if (qm > 0 && agua > 0) {
        let ion = m === 'Na_s' ? 'Na+' : m === 'Li_s' ? 'Li+' : 'K+';
        let r = Math.min(qm, agua);
        removerEspecie(m, r); removerEspecie('H2O_l', r); adicionarEspecie(ion, r); adicionarEspecie('OH-', r); adicionarEspecie('H2_g', r / 2);
        sys.temp += r * (m === 'K_s' ? 6 : m === 'Li_s' ? 4.8 : 5);
        if (r > 15) dispararAlerta('Explosão!', `Reação violenta de ${m.replace('_s', '')} com água!`);
      }
    }

    // Cálcio + Água
    let ca = qtd('Ca_s'); let agua2 = qtd('H2O_l');
    if (ca > 0 && agua2 > 0) {
      let r = Math.min(ca, agua2); if (!agitadorAtivo) r *= 0.5;
      removerEspecie('Ca_s', r); removerEspecie('H2O_l', r); adicionarEspecie('Ca2+', r); adicionarEspecie('OH-', 2 * r); adicionarEspecie('H2_g', r); sys.temp += r * 3;
    }

    // Peróxido de Hidrogênio
    const h2o2 = qtd('H2O2');
    if (h2o2 > 0 && (sys.temp > 50 || qtd('Fe3+') > 0 || qtd('Pb2+') > 0)) {
      const r = Math.min(h2o2, 3); removerEspecie('H2O2', r); adicionarEspecie('H2O_l', r); adicionarEspecie('O2_g', r / 2);
    }

    // Precipitados
    PRECIP_TABLE.forEach(p => {
      let cq = qtd(p.cat), aq = qtd(p.an);
      if (cq > 0 && aq > 0) {
        let fc = cq / p.cC; let fa = aq / p.cA; let m = Math.min(fc, fa);
        removerEspecie(p.cat, m * p.cC); removerEspecie(p.an, m * p.cA); adicionarEspecie(p.prod, m);
      }
    });
  }

  function atualizarEstadoFisico() {
    if (sys.shattered) return;
    let congelando = false;

    if (!sys.isClosed) {
      for (const [solv, pe] of Object.entries(BP)) {
        let q = qtd(solv);
        if (q > 0 && sys.temp >= pe) {
          let ex = sys.temp - pe; let tx = (0.5 + ex * 0.05) * velocidadeTempo; 
          let ev = Math.min(q, tx);
          removerEspecie(solv, ev); sys.vol -= ev * 0.018; 
          if (ev > 0.05) log(`${solv.replace('_l', '')} evaporando a ${sys.temp.toFixed(1)}°C.`);
        }
      }
    }

    for (const [solv, pf] of Object.entries(FP)) {
      let q = qtd(solv);
      if (q > 0 && sys.temp <= pf) {
        let solidName = solv.replace('_l', '_s'); let freeze = Math.min(q, 0.8 * velocidadeTempo);
        removerEspecie(solv, freeze); adicionarEspecie(solidName, freeze); sys.vol -= freeze * 0.018; congelando = true;
      }
    }
    
    document.getElementById('freezeOverlay').style.opacity = congelando ? '0.75' : '0';
    
    if (sys.vol < 0.05) sys.vol = 0; if (sys.vol > sys.maxVol) sys.vol = sys.maxVol;
    if (sys.temp > 550) { dispararAlerta('Choque Térmico!', 'A vidraria derreteu a 550°C!'); sys.shattered = true; return; }
    
    if (sys.isClosed) {
      const nGas = (qtd('H2_g') + qtd('CO2_g') + qtd('Cl2_g') + qtd('O2_g')) / 1000;
      const volLivre = (sys.maxVol - sys.vol) / 1000;
      sys.pressao = (volLivre > 0 && nGas > 0) ? 1 + (nGas * 0.082 * (sys.temp + 273.15)) / volLivre : 1;
      
      const warnEl = document.getElementById('pressWarn');
      if (sys.pressao > 5.5) { warnEl.style.display = 'inline'; warnEl.className = 'press-critical'; warnEl.innerText = '⚠ CRÍTICO'; } 
      else if (sys.pressao > 3.0) { warnEl.style.display = 'inline'; warnEl.className = 'press-warning'; warnEl.innerText = '⚠ Alta pressão'; } 
      else if (sys.pressao > 1.5) { warnEl.style.display = 'inline'; warnEl.className = 'press-warning'; warnEl.innerText = '⚠ Pressão elevada'; } 
      else { warnEl.style.display = 'none'; }
      
      if (sys.pressao > 6.0) { dispararAlerta('Explosão por Pressão!', 'Acúmulo de gás excedeu 6 atm!'); sys.shattered = true; }
    } else {
      sys.pressao = 1; document.getElementById('pressWarn').style.display = 'none';
      const nGas = qtd('H2_g') + qtd('CO2_g') + qtd('O2_g');
      if (nGas > 50 && sys.vol > sys.maxVol * 0.8) { dispararAlerta('Erupção!', 'Geração violenta de gás causou transbordamento!'); sys.shattered = true; }
    }
  }

  // ==========================================
  // 9. ATUALIZAÇÕES DA INTERFACE E GRÁFICOS
  // ==========================================
  function calcularpH() {
    const volL = sys.vol/1000; if (volL<=0) return 7;
    const h=qtd('H+'), oh=qtd('OH-');
    if (h>1e-12) { let conc=h/volL; return Math.max(0,Math.min(14,-Math.log10(Math.max(conc,1e-14)))); }
    if (oh>1e-12) { let conc=oh/volL; return Math.max(0,Math.min(14,14+Math.log10(Math.max(conc,1e-14)))); }
    return 7;
  }

  function atualizarUI() {
    document.getElementById('volDisplay').innerText = `${sys.vol.toFixed(1)} / ${sys.maxVol} mL`;
    const liq = document.getElementById('liquidLayer'); liq.style.height = Math.min((sys.vol/sys.maxVol)*100,100)+'%';
    let corLiq = 'rgba(255,255,255,0.06)';
    if (sys.vol>0) {
      if (qtd('Cu2+')>0) corLiq='rgba(0,200,255,0.55)'; else if (qtd('Ni2+')>0) corLiq='rgba(100,220,140,0.55)';
      else if (qtd('Fe3+')>0||qtd('Fe2+')>0) corLiq='rgba(255,160,100,0.5)'; else if (qtd('Pb2+')>0||qtd('Ag+')>0) corLiq='rgba(220,220,240,0.25)';
      else if (qtd('Cd2+')>0) corLiq='rgba(255,230,150,0.4)'; else if (qtd('I2_aq')>0) corLiq='rgba(180,120,180,0.4)';
      if (sys.fenolftaleina) { const ph=calcularpH(); if(ph>10) corLiq='#e91e63'; else if(ph>8.5) corLiq='#f06292'; }
    }
    liq.style.backgroundColor = corLiq;
    
    let pptH=0, pptCor='transparent', best={q:0,c:'transparent'};
    PRECIP_TABLE.forEach(p=>{ let q=qtd(p.prod); if(q>0.05){ pptH+=4; if(q>best.q) best={q:q, c:p.cor}; } });
    if(qtd('Al_s')>0||qtd('Zn_s')>0||qtd('Mg_s')>0||qtd('Ca_s')>0||qtd('S_s')>0||qtd('I2_s')>0||qtd('Fe_s')>0||qtd('Ni_s')>0||qtd('Cu_s')>0||qtd('Sn_s')>0||qtd('Pb_s')>0){ pptH+=4; if(best.q===0) best.c='#b0bec5'; }
    document.getElementById('precipLayer').style.height = Math.min(pptH,45)+'%'; document.getElementById('precipLayer').style.backgroundColor = best.c;
    
    const gasEl=document.getElementById('gasHalo');
    if(qtd('Cl2_g')>0){ gasEl.style.opacity='0.85'; gasEl.style.background='radial-gradient(circle, rgba(180,220,80,0.5) 0%, transparent 80%)'; }
    else if(qtd('H2_g')>0||qtd('CO2_g')>0||qtd('O2_g')>0){ gasEl.style.opacity='0.5'; gasEl.style.background='radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)'; }
    else { gasEl.style.opacity='0'; }
    document.getElementById('bubbleOverlay').style.opacity = (sys.temp>60 || qtd('H2_g')>5 || qtd('CO2_g')>5) ? '1' : '0';
    
    document.getElementById('hudTemp').innerText = sys.temp.toFixed(1)+' °C'; document.getElementById('hudPress').innerText = sys.pressao.toFixed(2)+' atm'; document.getElementById('hudPH').innerText = calcularpH().toFixed(2);
    const tPct = ((sys.temp+10)/560)*100; document.getElementById('thermoFill').style.height = Math.min(100,Math.max(0,tPct))+'%';
    let tCol = sys.temp>50 ? '#ff1744' : sys.temp<=0 ? '#4fc3f7' : '#00ff88'; document.getElementById('thermoFill').style.backgroundColor = tCol; document.getElementById('thermoBulb').style.backgroundColor = tCol;
    
    let tagsHtml = '';
    for (let [esp, q] of sys.especies) {
      if (q<0.05) continue;
      let cls='tag-aq'; if(esp.endsWith('_s')) cls='tag-s'; else if(esp.endsWith('_g')) cls='tag-g'; else if(esp.endsWith('_l')) cls='tag-l';
      let nome = esp.replace(/_s|_g|_l|_aq/g,'').replace(/_2-/g,'²⁻').replace(/3\+/g,'³⁺').replace(/2\+/g,'²⁺').replace(/\+/g,'⁺').replace(/-/g,'⁻');
      tagsHtml += `<span class="tag ${cls}" title="${q.toFixed(2)} mmol">${nome} ${q.toFixed(1)}</span>`;
    }
    document.getElementById('speciesTags').innerHTML = tagsHtml || '<span style="color:#546e7a;">vazio</span>';
  }

  function registrarPontoPH() {
    const ph = calcularpH(); const volPct = sys.maxVol>0 ? (sys.vol/sys.maxVol)*100 : 0;
    phDataPoints.push({vol:volPct, ph:ph}); if (phDataPoints.length>200) phDataPoints.shift(); desenharCurvaPH();
  }
  
  function desenharCurvaPH() {
    const w=phCanvas.width, h=phCanvas.height; phCtx.clearRect(0,0,w,h); phCtx.fillStyle='#020617'; phCtx.fillRect(0,0,w,h); phCtx.strokeStyle='#1e3a5f'; phCtx.lineWidth=1;
    for (let i=0; i<=14; i+=2) { let y=h-(i/14)*h; phCtx.beginPath(); phCtx.moveTo(0,y); phCtx.lineTo(w,y); phCtx.stroke(); phCtx.fillStyle='#546e7a'; phCtx.font='9px Fira Code'; phCtx.fillText(i,2,y-2); }
    if (phDataPoints.length<2) return;
    phCtx.strokeStyle='#00ff88'; phCtx.lineWidth=2; phCtx.shadowColor='rgba(0,255,136,0.5)'; phCtx.shadowBlur=6; phCtx.beginPath();
    for (let i=0; i<phDataPoints.length; i++) { let x=(phDataPoints[i].vol/100)*w, y=h-(phDataPoints[i].ph/14)*h; if (i===0) phCtx.moveTo(x,y); else phCtx.lineTo(x,y); }
    phCtx.stroke(); phCtx.shadowBlur=0;
  }
  
  function limparCurvaPH() { phDataPoints=[]; desenharCurvaPH(); log('Curva de pH limpa.'); }

  // ==========================================
  // 10. FUNÇÕES EXPORTADAS (BOTÕES HTML) E LOOP
  // ==========================================
  window.setVelocidade = function(v) {
    velocidadeTempo = v;
    document.querySelectorAll('.btn-time').forEach(b => b.classList.remove('active-btn')); 
    document.getElementById('btnT'+v).classList.add('active-btn');
    clearInterval(timerLoop); 
    timerLoop = setInterval(loopTermico, 200 / velocidadeTempo);
  };
  
  window.toggleAgitador = function() { 
    agitadorAtivo = !agitadorAtivo; 
    document.getElementById('btnAgitador').classList.toggle('active-btn', agitadorAtivo); 
    document.getElementById('agitadorFisico').classList.toggle('ativo', agitadorAtivo); 
  };
  
  window.toggleFoco = function() { 
    focoAtivo = !focoAtivo; 
    const stage = document.getElementById('visualStage'); 
    if (focoAtivo) { stage.classList.add('focus-active'); document.body.style.overflow = 'hidden'; } 
    else { stage.classList.remove('focus-active'); document.body.style.overflow = 'auto'; } 
  };
  
  window.setModoTermico = function(modo) {
    if (sys.modoTermico === modo) modo = 'ambiente'; sys.modoTermico = modo;
    document.getElementById('btnHeat').classList.toggle('active-btn', modo==='aquecendo'); 
    document.getElementById('btnThermostat').classList.toggle('active-btn', modo==='termostato'); 
    document.getElementById('btnCool').classList.toggle('active-btn', modo==='resfriando');
    document.getElementById('flameFX').style.opacity = modo==='aquecendo' ? '1' : '0'; 
    document.getElementById('iceFX').style.opacity = modo==='resfriando' ? '1' : '0';
  };
  
  window.ajustarPotenciaChama = function(val) { document.documentElement.style.setProperty('--flame-scale', 0.5 + val*0.07); };

  function loopTermico() {
    if (sys.shattered) return;
    const pot = parseInt(document.getElementById('heatSlider').value)||5; const incr = (0.4 + Math.pow(pot,1.7)*0.18) * velocidadeTempo;
    let alterou = false;
    if (sys.modoTermico==='aquecendo') { sys.temp+=incr; alterou=true; }
    else if (sys.modoTermico==='resfriando') { sys.temp-=1.8 * velocidadeTempo; if(sys.temp<-120) sys.temp=-120; alterou=true; }
    else if (sys.modoTermico==='termostato') { const alvo=parseFloat(document.getElementById('tempAlvo').value)||25; if(sys.temp<alvo-0.3){ sys.temp+=incr*0.4; alterou=true; } else if(sys.temp>alvo+0.3){ sys.temp-=0.8*velocidadeTempo; alterou=true; } }
    else if (sys.modoTermico==='ambiente') { if(sys.temp>25.3){ sys.temp-=0.4*velocidadeTempo; alterou=true; } else if(sys.temp<24.7){ sys.temp+=0.4*velocidadeTempo; alterou=true; } else sys.temp=25; }
    if (alterou) { atualizarEquilibrio(); atualizarEstadoFisico(); atualizarUI(); registrarPontoPH(); }
  }

  function construirCatalogo() {
    const grupos = [
      ['💧 Solventes Polares', [['H2O_l','Água Destilada (H₂O)'], ['Etanol_l','Etanol Absoluto (C₂H₆O)'], ['Acetona_l','Acetona Pura (C₃H₆O)'], ['Metanol_l','Metanol (CH₃OH)']]],
      ['🛢️ Solventes Apolares', [['Hexano_l','Hexano (C₆H₁₄)'], ['Benzeno_l','Benzeno (C₆H₆)'], ['Tolueno_l','Tolueno (C₇H₈)'], ['Cloroformio_l','Clorofórmio (CHCl₃)']]],
      ['⚠️ Alto Risco', [['Na_s','Sódio Metálico (Na)'], ['Li_s','Lítio Metálico (Li)'], ['K_s','Potássio Metálico (K)'], ['H2O2_aq','Peróxido de Hidrogênio (H₂O₂)']]],
      ['⚙️ Metais Sólidos', [['Zn_s','Zinco (Zn)'], ['Mg_s','Magnésio (Mg)'], ['Al_s','Alumínio (Al)'], ['Ca_s','Cálcio (Ca)'], ['Fe_s','Ferro (Fe)'], ['Ni_s','Níquel (Ni)'], ['Cu_s','Cobre (Cu)'], ['Sn_s','Estanho (Sn)'], ['Pb_s','Chumbo (Pb)']]],
      ['🧪 Metais em Solução', [['PbNO3_aq','Nitrato de Chumbo (Pb(NO₃)₂)'], ['AgNO3_aq','Nitrato de Prata (AgNO₃)'], ['CdNO3_aq','Nitrato de Cádmio (Cd(NO₃)₂)'], ['CuSO4_aq','Sulfato de Cobre (CuSO₄)'], ['FeCl3_aq','Cloreto de Ferro III (FeCl₃)'], ['ZnSO4_aq','Sulfato de Zinco (ZnSO₄)'], ['NiCl2_aq','Cloreto de Níquel (NiCl₂)'], ['SbCl3_aq','Cloreto de Antimônio (SbCl₃)'], ['CaCl2_aq','Cloreto de Cálcio (CaCl₂)'], ['BaCl2_aq','Cloreto de Bário (BaCl₂)']]],
      ['🔥 Ácidos', [['HCl_aq','Ácido Clorídrico (HCl)'], ['H2SO4_aq','Ácido Sulfúrico (H₂SO₄)'], ['HNO3_aq','Ácido Nítrico (HNO₃)'], ['HClO4_aq','Ácido Perclórico (HClO₄)'], ['H3PO4_aq','Ácido Fosfórico (H₃PO₄)'], ['AcidoAcetico_aq','Ácido Acético (CH₃COOH)']]],
      ['🧼 Bases', [['NaOH_aq','Hidróxido de Sódio (NaOH)'], ['KOH_aq','Hidróxido de Potássio (KOH)'], ['LiOH_aq','Hidróxido de Lítio (LiOH)'], ['NH3_aq','Amônia (NH₃)'], ['Na2CO3_aq','Carbonato de Sódio (Na₂CO₃)'], ['NaHCO3_aq','Bicarbonato de Sódio (NaHCO₃)'], ['K2CO3_aq','Carbonato de Potássio (K₂CO₃)'], ['CaOH2_aq','Água de Cal (Ca(OH)₂)'], ['NaClO_aq','Água Sanitária (NaClO)']]],
      ['🧂 Sais e Outros', [['NaCl_s','Cloreto de Sódio (NaCl)'], ['CuSO4_s','Sulfato de Cobre Anidro (CuSO₄)'], ['CaCO3_s','Carbonato de Cálcio (CaCO₃)'], ['NaHCO3_s','Bicarbonato de Sódio (NaHCO₃)'], ['KI_aq','Iodeto de Potássio (KI)'], ['NH42S_aq','Sulfeto de Amônio ((NH₄)₂S)'], ['I2_s','Iodo (I₂)'], ['S_s','Enxofre (S)'], ['P_s','Fósforo Vermelho (P)']]],
      ['🔬 Indicador', [['fenolftaleina','Fenolftaleína (C₂₀H₁₄O₄)']]]
    ];
    let html = '';
    grupos.forEach(([titulo, itens], idx) => {
      html += `<details ${idx===0?'open':''}><summary>${titulo}</summary><div class="reagent-list">`;
      itens.forEach(([val, label], i) => { html += `<label><input type="radio" name="reagenteSel" value="${val}" ${idx===0&&i===0?'checked':''}> ${label}</label>`; });
      html += '</div></details>';
    });
    document.getElementById('catalogContainer').innerHTML = html;
  }

  // Exportações Finais
  window.abrirManual = () => document.getElementById('manualModal').style.display = 'flex'; 
  window.fecharManual = () => document.getElementById('manualModal').style.display = 'none';
  window.resetarLaboratorio = resetarLaboratorio; 
  window.trocarVidraria = trocarVidraria; 
  window.iniciarAdicao = iniciarAdicao; 
  window.pararAdicao = pararAdicao;
  window.limparCurvaPH = limparCurvaPH; 
  window.limparRegistro = limparRegistro;
  window.desfazerAcao = desfazerAcao;

  // Início Automático
  construirCatalogo(); 
  resetarLaboratorio(); 
  atualizarUI_Missao(); // Assegura que a primeira Missão aparece ao iniciar
  timerLoop = setInterval(loopTermico, 200);
  log('🚀 LAIFT Engine Uninassau iniciado com Sucesso!', 'log-info');
})();

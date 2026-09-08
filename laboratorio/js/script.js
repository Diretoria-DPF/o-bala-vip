/**
 * LAIFT — LABORATÓRIO VIRTUAL DE BANCADA & SÍNTESE FARMACÊUTICA
 * Motor Físico-Químico, Cinemática Térmica, SmilesDrawer e Telemetria Integrada.
 */
(function() {
  // ==========================================
  // 1. SISTEMA DE TELEMETRIA (RASTREIO DE ERROS)
  // ==========================================
  const relatorioErros = [];
  window.addEventListener('error', function(e) {
    relatorioErros.push(`[ERRO] ${e.message} (Linha: ${e.lineno})`);
    console.warn("LAIFT Rastreio:", e.message);
  });

  window.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
      alert("=== LAIFT: MODO DEPURAÇÃO ===\n\n" + (relatorioErros.length ? relatorioErros.join('\n') : "✅ Sistema estável. Nenhum erro registrado."));
    }
  });

  // ==========================================
  // 2. SISTEMA DE ÁUDIO (Web Audio API)
  // ==========================================
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function tocarSom(tipo) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (tipo === 'gota') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (tipo === 'erro') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (tipo === 'sucesso') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  }

  // ==========================================
  // 3. TABELAS QUÍMICAS E CONSTANTES
  // ==========================================
  const APPS_SCRIPT_GATEWAY = window.APPS_SCRIPT_GATEWAY || 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

  const MM = {
    Na:23, Al:27, Zn:65.4, Mg:24.3, CuSO4:159.6, NaCl:58.4, CaCO3:100, KI:166, AgNO3:169.9,
    PbNO3:331, NaOH:40, HCl:36.5, Li:6.94, K:39.1, Ca:40.08, NaHCO3:84.0, K2CO3:138.2, KOH:56.1,
    LiOH:23.95, CaOH2:74.09, I2:253.8, S:32.06, P:30.97, Fe:55.8, Ni:58.7, Cu:63.5, Sn:118.7,
    Pb:207.2, HNO3:63.0, HClO4:100.5, H3PO4:98.0, AcidoSalicilico:138.12, pAminofenol:109.13, AcidoBenzoico:122.12
  };

  const CONC_AQ = {
    H2O2_aq:3.0, PbNO3_aq:1.0, AgNO3_aq:1.0, CdNO3_aq:1.0, CuSO4_aq:1.0, FeCl3_aq:1.0, ZnSO4_aq:1.0,
    NiCl2_aq:1.0, SbCl3_aq:1.0, CaCl2_aq:1.0, BaCl2_aq:1.0, CoCl2_aq:1.0, SCN_aq:1.0, HCl_aq:6.0,
    H2SO4_aq:9.0, AcidoAcetico_aq:1.0, KI_aq:1.0, NH42S_aq:1.0, NaOH_aq:6.0, NH3_aq:5.0, Na2CO3_aq:1.0,
    NaClO_aq:2.0, NaHCO3_aq:1.0, K2CO3_aq:1.0, KOH_aq:6.0, LiOH_aq:5.0, CaOH2_aq:0.5, HNO3_aq:6.0,
    HClO4_aq:6.0, H3PO4_aq:4.0
  };

  const BP = {
    H2O_l:100, Etanol_l:78.4, Acetona_l:56, Hexano_l:68.7, Benzeno_l:80.1, Tolueno_l:110.6,
    Metanol_l:64.7, Cloroformio_l:61.2, AnidridoAcetico_l:139.8, AlcoolIsopentilico_l:131.1, Anilina_l:184.1
  };

  const FP = {
    H2O_l:0, Etanol_l:-114, Acetona_l:-95, Hexano_l:-95, Benzeno_l:5.5, Tolueno_l:-95,
    Metanol_l:-98, Cloroformio_l:-63.5, AnidridoAcetico_l:-73, AlcoolIsopentilico_l:-117, Anilina_l:-6
  };

  const PRECIP_TABLE = [
    { cat:'Ag+', an:'Cl-', cC:1, cA:1, prod:'AgCl_s', cor:'#f5f5f5', nomePubChem:'Silver chloride' },
    { cat:'Pb2+', an:'Cl-', cC:1, cA:2, prod:'PbCl2_s', cor:'#eceff1', nomePubChem:'Lead(II) chloride' },
    { cat:'Pb2+', an:'I-', cC:1, cA:2, prod:'PbI2_s', cor:'#ffeb3b', nomePubChem:'Lead(II) iodide' },
    { cat:'Ag+', an:'I-', cC:1, cA:1, prod:'AgI_s', cor:'#fff9c4', nomePubChem:'Silver iodide' },
    { cat:'Cu2+', an:'OH-', cC:1, cA:2, prod:'Cu(OH)2_s', cor:'#4dd0e1', nomePubChem:'Copper(II) hydroxide' },
    { cat:'Fe3+', an:'OH-', cC:1, cA:3, prod:'Fe(OH)3_s', cor:'#8d6e63', nomePubChem:'Iron(III) hydroxide' },
    { cat:'Ni2+', an:'OH-', cC:1, cA:2, prod:'Ni(OH)2_s', cor:'#a5d6a7', nomePubChem:'Nickel(II) hydroxide' },
    { cat:'Ca2+', an:'CO3_2-', cC:1, cA:1, prod:'CaCO3_s', cor:'#fafafa', nomePubChem:'Calcium carbonate' },
    { cat:'Ba2+', an:'CO3_2-', cC:1, cA:1, prod:'BaCO3_s', cor:'#f5f5f5', nomePubChem:'Barium carbonate' },
    { cat:'Pb2+', an:'S_2-', cC:1, cA:1, prod:'PbS_s', cor:'#212121', nomePubChem:'Lead(II) sulfide' },
    { cat:'Ag+', an:'S_2-', cC:2, cA:1, prod:'Ag2S_s', cor:'#1a1a1a', nomePubChem:'Silver sulfide' },
    { cat:'Cu2+', an:'S_2-', cC:1, cA:1, prod:'CuS_s', cor:'#1b1b1b', nomePubChem:'Copper(II) sulfide' },
    { cat:'Cd2+', an:'S_2-', cC:1, cA:1, prod:'CdS_s', cor:'#fdd835', nomePubChem:'Cadmium sulfide' },
    { cat:'Zn2+', an:'S_2-', cC:1, cA:1, prod:'ZnS_s', cor:'#e8eaf6', nomePubChem:'Zinc sulfide' },
    { cat:'Sb3+', an:'S_2-', cC:2, cA:3, prod:'Sb2S3_s', cor:'#ff7043', nomePubChem:'Antimony trisulfide' },
    { cat:'Ca2+', an:'SO4_2-', cC:1, cA:1, prod:'CaSO4_s', cor:'#f5f5f5', nomePubChem:'Calcium sulfate' },
    { cat:'Ba2+', an:'SO4_2-', cC:1, cA:1, prod:'BaSO4_s', cor:'#ffffff', nomePubChem:'Barium sulfate' },
    { cat:'Pb2+', an:'SO4_2-', cC:1, cA:1, prod:'PbSO4_s', cor:'#eceff1', nomePubChem:'Lead(II) sulfate' }
  ];

  // ==========================================
  // 4. ESTADO GLOBAL DO LABORATÓRIO E HISTÓRICO
  // ==========================================
  let sys = { maxVol:250, vol:0, temp:25, pressao:1, isClosed:false, modoTermico:'ambiente', especies:new Map(), shattered:false, fenolftaleina:false };
  let historico = [], timerAdd = null, timerLoop = null, qtdRestante = 0, incrAdd = 1, phDataPoints = [];
  let velocidadeTempo = 1, agitadorAtivo = false, focoAtivo = false, reagentesAdicionados = new Set(), reacoesCatalogadas = new Set();
  let smilesDrawerInstance = null;
  let compostoAtualParaDossie = null;

  const logEl = document.getElementById('logStream');
  const phCanvas = document.getElementById('phCanvas');
  const phCtx = phCanvas ? phCanvas.getContext('2d') : null;
  if (phCanvas) { phCanvas.width = 280; phCanvas.height = 140; }

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
    if (!logEl) return;
    const ts = new Date().toTimeString().slice(0,8);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${ts}]</span><span class="${cls}">${msg}</span>`;
    logEl.prepend(entry);
    if (logEl.children.length > 70) logEl.removeChild(logEl.lastChild);
  }

  function limparRegistro() {
    if (logEl) logEl.innerHTML = '<span style="color:#546e7a;">[Sistema] Registro limpo.</span>';
  }

  function qtd(chave) { return sys.especies.get(chave) || 0; }
  function adicionarEspecie(chave, mmol) { if (mmol <= 0) return; sys.especies.set(chave, (sys.especies.get(chave)||0)+mmol); }
  function removerEspecie(chave, mmol) {
    const atual = sys.especies.get(chave)||0;
    const novo = Math.max(0, atual-mmol);
    if (novo < 1e-12) sys.especies.delete(chave);
    else sys.especies.set(chave, novo);
  }

  // ==========================================
  // 5. ORÁCULO PUBCHEM, SMILESDRAWER & NUVEM
  // ==========================================
  function initSmilesDrawer() {
    try {
      if (typeof SmilesDrawer !== 'undefined' && !smilesDrawerInstance) {
        smilesDrawerInstance = new SmilesDrawer.Drawer({
          width: 250,
          height: 160,
          bondThickness: 1.5,
          bondLength: 15,
          shortBondLength: 0.85,
          bondSpacing: 0.18 * 15,
          atomVisualization: 'default',
          isomeric: true,
          compactDrawing: true,
          themes: {
            dark: {
              C: '#e0e0e0', O: '#ff5252', N: '#40c4ff', F: '#69f0ae',
              CL: '#ffd740', BR: '#ff6e40', I: '#e040fb', P: '#ffab40',
              S: '#ffd740', BACKGROUND: 'transparent'
            }
          }
        });
      }
    } catch (e) {
      console.warn('SmilesDrawer indisponível:', e);
    }
  }

  function projetarEstruturaMolecular(smiles, nome, iupac, formula, peso) {
    const canvas = document.getElementById('moleculeCanvas');
    const placeholder = document.getElementById('molPlaceholder');
    const elName = document.getElementById('molName');
    const elIupac = document.getElementById('molIupac');
    const elFormula = document.getElementById('molFormula');
    const elWeight = document.getElementById('molWeight');
    const btnDossie = document.getElementById('btnDossieLab');

    if (elName) elName.textContent = nome || 'Nenhum';
    if (elIupac) elIupac.textContent = iupac || '--';
    if (elFormula) elFormula.textContent = formula || '--';
    if (elWeight) elWeight.textContent = peso ? `${peso} g/mol` : '--';

    if (!canvas || !smiles || smiles === '--') {
      if (placeholder) placeholder.style.display = 'block';
      if (btnDossie) btnDossie.style.display = 'none';
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    if (placeholder) placeholder.style.display = 'none';
    if (btnDossie) btnDossie.style.display = 'block';

    if (typeof SmilesDrawer !== 'undefined') {
      initSmilesDrawer();
      SmilesDrawer.parse(smiles, function(tree) {
        if (smilesDrawerInstance) smilesDrawerInstance.draw(tree, canvas, 'dark', false);
      }, function(err) {
        console.warn('Falha ao renderizar SMILES:', err);
      });
    }
  }

  async function consultarDadosPubChem(termo) {
    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termo.trim())}/property/MolecularWeight,MolecularFormula,CanonicalSMILES,IUPACName/JSON`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties.length > 0) {
        const p = data.PropertyTable.Properties[0];
        return { cid: p.CID, formula: p.MolecularFormula, pesoMolecular: p.MolecularWeight, smiles: p.CanonicalSMILES, iupac: p.IUPACName };
      }
    } catch (e) { console.warn('[PubChem] Consulta falhou:', e); }
    return null;
  }

  async function catalogarFormulacaoNoBanco(nomeProduto, reagentesArray, tempAtual, agitacaoLigada, observacaoReacao) {
    let identificador = 'Visitante';
    try {
      const sessao = JSON.parse(localStorage.getItem('laift_student_session') || '{}');
      if (sessao.identifier) identificador = sessao.identifier;
    } catch (e) {}

    // Resolução avançada com fallback
    let dadosQuimicos = null;
    if (typeof ChemicalAPIEngine !== 'undefined' && typeof ChemicalAPIEngine.resolveCompleteCompound === 'function') {
      dadosQuimicos = await ChemicalAPIEngine.resolveCompleteCompound(nomeProduto);
    } else {
      dadosQuimicos = await consultarDadosPubChem(nomeProduto);
    }

    const payload = {
      acao: 'registrarFormulacaoLab',
      identificador: identificador,
      produto: nomeProduto,
      reagentes: reagentesArray || Array.from(reagentesAdicionados),
      temperatura: tempAtual !== undefined ? tempAtual : sys.temp,
      agitacao: agitacaoLigada !== undefined ? agitacaoLigada : agitadorAtivo,
      sistema: sys.isClosed ? 'Fechado' : 'Aberto',
      observacoes: observacaoReacao || 'Reação detectada na bancada virtual.',
      dadosPubChem: dadosQuimicos || { formula: 'Indeterminada', pesoMolecular: '--', smiles: '--', iupac: nomeProduto, cid: '--' }
    };

    try {
      await fetch(APPS_SCRIPT_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      log(`🧪 Composto [${nomeProduto}] catalogado no acervo!`, 'log-info');
    } catch (err) {
      console.warn('[Laboratório] Não foi possível persistir a reação:', err);
    }
  }

  async function verificarSinteseFarmaceutica() {
    if (typeof LAB_DATABASE === 'undefined' || !LAB_DATABASE.reactions) return;

    for (const rx of LAB_DATABASE.reactions) {
      if (!rx.reagentesObrigatorios) continue;
      const todosPresentes = rx.reagentesObrigatorios.every(r => reagentesAdicionados.has(r));
      const catalisadorOk = !rx.catalisador || reagentesAdicionados.has(rx.catalisador);
      const tempOk = sys.temp >= (rx.tempMinima || 20);
      const agitacaoOk = !rx.precisaAgitador || agitadorAtivo;

      if (todosPresentes && catalisadorOk && tempOk && agitacaoOk) {
        if (!reacoesCatalogadas.has(rx.id)) {
          reacoesCatalogadas.add(rx.id);

          const prodInfo = (LAB_DATABASE.species && LAB_DATABASE.species[rx.produtoId]) ? LAB_DATABASE.species[rx.produtoId] : {};
          const nomeTermo = prodInfo.pubchemQuery || rx.nomeComposto;
          compostoAtualParaDossie = nomeTermo;

          tocarSom('sucesso');
          log(`✨ SÍNTESE CONCLUÍDA: ${rx.nomeComposto}!`, 'log-info');

          // Consulta em profundidade
          let smiles = prodInfo.smiles || '--';
          let iupac = prodInfo.iupac || '--';
          let formula = prodInfo.formula || '--';
          let peso = prodInfo.molarMass || '--';

          if (typeof ChemicalAPIEngine !== 'undefined' && typeof ChemicalAPIEngine.resolveCompleteCompound === 'function') {
            const completo = await ChemicalAPIEngine.resolveCompleteCompound(nomeTermo);
            if (completo) {
              smiles = completo.smiles || smiles;
              iupac = completo.iupac || iupac;
              formula = completo.formula || formula;
              peso = completo.molarMass || peso;
            }
          }

          projetarEstruturaMolecular(smiles, prodInfo.label || rx.nomeComposto, iupac, formula, peso);

          if (rx.corPrecipitado) {
            adicionarEspecie(rx.produtoId, 8);
          }

          catalogarFormulacaoNoBanco(
            nomeTermo,
            Array.from(reagentesAdicionados),
            sys.temp,
            agitadorAtivo,
            rx.descricao || 'Síntese farmacêutica concluída com sucesso.'
          );
        }
      }
    }
  }

  // ==========================================
  // 6. SISTEMA AVANÇADO DE MISSÕES
  // ==========================================
  const missoes = [
    { titulo: "Missão 1: Neutralização Básica", desc: "Atinge um pH entre 7.0 e 7.5 usando ácido e base. (Volume > 20mL).", check: () => calcularpH() >= 7.0 && calcularpH() <= 7.5 && sys.vol >= 20 },
    { titulo: "Missão 2: Chuva de Ouro", desc: "Forma um precipitado amarelo intenso de Iodeto de Chumbo (PbI₂).", check: () => qtd('PbI2_s') > 0.1 },
    { titulo: "Missão 3: Libertação de Gás H₂", desc: "Faz um metal sólido reagir com ácido para gerar gás Hidrogénio.", check: () => qtd('H2_g') > 1 },
    { titulo: "Missão 4: Ponto de Ebulição", desc: "Aquece a água no laboratório até que comece a evaporar ativamente (100°C).", check: () => sys.temp >= 100 && qtd('H2O_l') > 0 },
    { titulo: "Missão 5: Síntese da Aspirina", desc: "Mistura Ácido Salicílico + Anidrido Acético com H₂SO₄ sob aquecimento (>60°C).", check: () => reacoesCatalogadas.has('sintese_aspirina') },
    { titulo: "Missão 6: Chuva de Prata", desc: "Mistura Nitrato de Prata (AgNO₃) com Cloreto (Ex: NaCl ou HCl) para formar AgCl.", check: () => qtd('AgCl_s') > 0.1 },
    { titulo: "Missão 7: Síntese de Paracetamol", desc: "Mistura 4-Aminofenol + Anidrido Acético sob aquecimento e agitação (>55°C).", check: () => reacoesCatalogadas.has('sintese_paracetamol') },
    { titulo: "Missão 8: Ambiente Super Ácido", desc: "Cria uma solução altamente corrosiva com pH menor ou igual a 2.0.", check: () => calcularpH() <= 2.0 && sys.vol > 10 },
    { titulo: "Missão 9: Aroma de Banana (Éster)", desc: "Mistura Ácido Acético com Álcool Isopentílico catalisado por H₂SO₄ sob calor.", check: () => reacoesCatalogadas.has('sintese_aroma_banana') },
    { titulo: "Missão 10: Efervescência de Carbonato", desc: "Mistura um carbonato (como NaHCO₃ ou CaCO₃) com ácido para liberar CO₂.", check: () => qtd('CO2_g') > 0.5 }
  ];
  let missaoAtual = 0;

  function atualizarUI_Missao() {
    const elTitle = document.getElementById('missionTitle');
    const elDesc = document.getElementById('missionDesc');
    const elStatus = document.getElementById('missionStatus');
    const btnNext = document.getElementById('btnNextMission');

    if (!elTitle || !elDesc || !elStatus) return;

    if (missaoAtual >= missoes.length) {
      elTitle.innerText = "🎉 Mestre Laboratorial!";
      elDesc.innerText = "Concluíste todas as 10 missões propostas com sucesso.";
      elStatus.style.display = 'none';
      if (btnNext) btnNext.style.display = 'none';
      return;
    }

    const m = missoes[missaoAtual];
    elTitle.innerText = m.titulo;
    elDesc.innerText = m.desc;
    elStatus.innerText = "Pendente";
    elStatus.style.display = 'inline-block';
    elStatus.style.borderColor = "#ff9800";
    elStatus.style.color = "#ff9800";
    if (btnNext) btnNext.style.display = 'none';
  }

  function verificarMissoes() {
    if (missaoAtual >= missoes.length) return;
    if (missoes[missaoAtual].check()) {
      const badge = document.getElementById('missionStatus');
      if (badge && badge.innerText !== 'Concluída ✅') {
        badge.innerText = 'Concluída ✅';
        badge.style.borderColor = 'var(--neon-green)';
        badge.style.color = 'var(--neon-green)';
        const btnNext = document.getElementById('btnNextMission');
        if (btnNext) btnNext.style.display = 'block';
        tocarSom('sucesso');
        log('🏆 ' + missoes[missaoAtual].titulo + ' Concluída!', 'log-info');
      }
    }
  }

  // ==========================================
  // 7. INCIDENTES, RESET E TROCA DE VIDRARIA
  // ==========================================
  function dispararAlerta(titulo, msg) {
    if (window.pararAdicao) window.pararAdicao();
    window.setModoTermico('ambiente');
    tocarSom('erro');

    const ticketHTML = `<div class="incident-ticket"><h3>🚨 RELATÓRIO DE INCIDENTE</h3><p><strong>FALHA:</strong> ${titulo}</p><p><strong>CAUSA:</strong> ${msg}</p><p><strong>STATUS TÉRMICO:</strong> ${sys.temp.toFixed(1)} °C</p><p><strong>PRESSÃO:</strong> ${sys.pressao.toFixed(2)} atm</p></div>`;
    const elTitle = document.getElementById('alertTitle');
    const elMsg = document.getElementById('alertMsg');
    const elOverlay = document.getElementById('alertOverlay');

    if (elTitle) elTitle.innerText = "Sistema de Segurança Ativado";
    if (elMsg) elMsg.innerHTML = ticketHTML;
    if (elOverlay) elOverlay.style.display = 'flex';
    log(`🚨 INCIDENTE: ${titulo}`, 'log-danger');
  }

  function resetarLaboratorio() {
    if (timerAdd) { clearInterval(timerAdd); timerAdd = null; }
    const btnAdd = document.getElementById('btnStartAdd');
    if (btnAdd) btnAdd.innerText = '▶ Adicionar';
    window.setModoTermico('ambiente');
    const tempAlvo = document.getElementById('tempAlvo');
    if (tempAlvo) tempAlvo.value = 25;

    sys.especies.clear();
    sys.vol = 0;
    sys.temp = 25;
    sys.pressao = 1;
    sys.shattered = false;
    sys.fenolftaleina = false;
    historico = [];
    phDataPoints = [];
    reagentesAdicionados.clear();
    reacoesCatalogadas.clear();
    compostoAtualParaDossie = null;

    const overlay = document.getElementById('alertOverlay');
    if (overlay) overlay.style.display = 'none';

    const qtdInput = document.getElementById('qtdInput');
    if (qtdInput) qtdInput.value = '10';

    const bubble = document.getElementById('bubbleOverlay');
    if (bubble) bubble.style.opacity = '0';

    const pressWarn = document.getElementById('pressWarn');
    if (pressWarn) pressWarn.style.display = 'none';

    const freeze = document.getElementById('freezeOverlay');
    if (freeze) freeze.style.opacity = '0';

    const btnDossie = document.getElementById('btnDossieLab');
    if (btnDossie) btnDossie.style.display = 'none';

    projetarEstruturaMolecular(null);
    atualizarUI_Missao();
    atualizarUI();
    window.limparCurvaPH();
    log('Sistema resetado.', 'log-info');
  }

  function trocarVidraria() {
    if (sys.vol > 0 || sys.especies.size > 0) {
      if (!confirm('Trocar vidraria descarta o conteúdo atual. Continuar?')) return;
    }
    const sel = document.getElementById('vidrariaSelect');
    const vessel = document.getElementById('vessel');
    if (!sel || !vessel) return;

    const v = sel.value;
    vessel.className = 'glass-vessel';
    sys.isClosed = false;

    if (v === 'tubo_20') {
      sys.maxVol = 20;
      vessel.classList.add('vessel-beaker');
      vessel.style.width = '40px';
      vessel.style.height = '140px';
    } else if (v === 'becker_250') {
      sys.maxVol = 250;
      vessel.classList.add('vessel-beaker');
      vessel.style.width = '150px';
      vessel.style.height = '180px';
    } else if (v === 'becker_1000') {
      sys.maxVol = 1000;
      vessel.classList.add('vessel-beaker');
      vessel.style.width = '220px';
      vessel.style.height = '240px';
    } else if (v === 'erlen_250') {
      sys.maxVol = 250;
      vessel.classList.add('vessel-flask');
      vessel.style.width = '150px';
      vessel.style.height = '180px';
      sys.isClosed = true;
    }

    const zone = document.getElementById('glasswareZone');
    if (zone) zone.classList.toggle('closed-system', sys.isClosed);
    resetarLaboratorio();
    log(`Vidraria: ${v.replace(/_/g,' ')} (${sys.maxVol} mL)`, 'log-info');
  }

  // ==========================================
  // 8. ANIMAÇÕES E ADIÇÃO
  // ==========================================
  function animarDespejo(modo) {
    const zone = document.getElementById('glasswareZone');
    if (!zone) return;
    const animEl = document.createElement('div');

    if (modo === 'gota') {
      animEl.className = 'anim-drop';
      zone.appendChild(animEl);
      tocarSom('gota');
      setTimeout(() => animEl.remove(), 300);
    } else if (modo === 'jato') {
      if (document.querySelector('.anim-stream')) return;
      animEl.className = 'anim-stream';
      zone.appendChild(animEl);
    } else if (modo === 'tudo') {
      animEl.className = 'anim-splash';
      zone.appendChild(animEl);
      setTimeout(() => animEl.remove(), 400);
    }
  }

  function pararAnimacaoJato() {
    const stream = document.querySelector('.anim-stream');
    if (stream) stream.remove();
  }

  function getSelectedReagent() {
    const sel = document.querySelector('input[name="reagenteSel"]:checked');
    return sel ? sel.value : null;
  }

  function iniciarAdicao() {
    initAudio();
    if (sys.shattered) return;
    const reag = getSelectedReagent();
    if (!reag) { log('Selecione um reagente.', 'log-warn'); return; }

    const raw = parseFloat(document.getElementById('qtdInput').value);
    if (isNaN(raw) || raw <= 0) return;

    salvarEstado();
    qtdRestante = raw;
    const modo = document.getElementById('modoAdd').value;

    if (modo === 'tudo') {
      animarDespejo('tudo');
      processarCarga(reag, qtdRestante);
      log(`Adicionado ${qtdRestante.toFixed(1)} de ${reag}.`);
    } else {
      incrAdd = (modo === 'jato') ? 10 : 1;
      const btn = document.getElementById('btnStartAdd');
      if (btn) btn.innerText = '⚡ Adicionando...';
      if (modo === 'jato') animarDespejo('jato');
      if (timerAdd) clearInterval(timerAdd);

      timerAdd = setInterval(() => {
        if (qtdRestante <= 0 || sys.shattered) { window.pararAdicao(); return; }
        if (modo === 'gota') animarDespejo('gota');
        let add = Math.min(incrAdd, qtdRestante);
        qtdRestante -= add;
        processarCarga(reag, add);
      }, 280 / velocidadeTempo);
    }
  }

  function pararAdicao() {
    if (timerAdd) { clearInterval(timerAdd); timerAdd = null; }
    const btn = document.getElementById('btnStartAdd');
    if (btn) btn.innerText = '▶ Adicionar';
    pararAnimacaoJato();
  }

  // ==========================================
  // 9. LÓGICA QUÍMICA & EQUILÍBRIO
  // ==========================================
  function processarCarga(reag, qtdAdd) {
    if (qtdAdd <= 0 || sys.shattered) return;
    let mmol = 0;
    reagentesAdicionados.add(reag);

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
        'CoCl2_aq': [['Co2+', 1], ['Cl-', 2]],
        'SCN_aq': [['K+', 1], ['SCN-', 1]],
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
      const mm = MM[reag.replace('_s', '')] || 100;
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
    verificarSinteseFarmaceutica();
    atualizarEstadoFisico();
    atualizarUI();
    verificarMissoes();
    registrarPontoPH();
  }

  function atualizarEquilibrio() {
    const volL = sys.vol / 1000;

    // Dissolução
    if (volL > 0 && qtd('H2O_l') > 0) {
      const txDissolucao = agitadorAtivo ? 1.0 : 0.2;
      const sNaCl = qtd('NaCl_s');
      if (sNaCl > 0) { const r = sNaCl * txDissolucao; removerEspecie('NaCl_s', r); adicionarEspecie('Na+', r); adicionarEspecie('Cl-', r); }

      const sCuSO4 = qtd('CuSO4_s');
      if (sCuSO4 > 0) { const r = sCuSO4 * txDissolucao; removerEspecie('CuSO4_s', r); adicionarEspecie('Cu2+', r); adicionarEspecie('SO4_2-', r); }

      const sNaHCO3 = qtd('NaHCO3_s');
      if (sNaHCO3 > 0) { const r = sNaHCO3 * txDissolucao; removerEspecie('NaHCO3_s', r); adicionarEspecie('Na+', r); adicionarEspecie('HCO3-', r); }
    }

    // Neutralização Ácido-Base
    const h = qtd('H+'), oh = qtd('OH-');
    if (h > 0 && oh > 0) {
      const r = Math.min(h, oh);
      removerEspecie('H+', r);
      removerEspecie('OH-', r);
      adicionarEspecie('H2O_l', r);
      sys.temp += r * 0.05;
    }

    // Reações com Ácidos
    const hNow = qtd('H+');
    if (hNow > 0) {
      const metais = ['Zn_s','Mg_s','Al_s','Na_s','Li_s','K_s','Ca_s','Fe_s','Ni_s','Cu_s','Sn_s','Pb_s'];
      for (const m of metais) {
        const qm = qtd(m);
        if (qm <= 0) continue;

        let valencia = 1;
        if (['Mg_s','Ca_s','Zn_s','Fe_s','Ni_s','Cu_s','Sn_s','Pb_s'].includes(m)) valencia = 2;
        else if (['Al_s','Fe_s'].includes(m)) valencia = 3;

        let ion = m.replace('_s', '') + (valencia > 1 ? valencia + '+' : '+');
        if (m === 'Na_s') ion = 'Na+'; else if (m === 'Li_s') ion = 'Li+'; else if (m === 'K_s') ion = 'K+';
        else if (m === 'Ca_s') ion = 'Ca2+'; else if (m === 'Fe_s') ion = 'Fe2+'; else if (m === 'Ni_s') ion = 'Ni2+';
        else if (m === 'Cu_s') ion = 'Cu2+'; else if (m === 'Sn_s') ion = 'Sn2+'; else if (m === 'Pb_s') ion = 'Pb2+';

        if (hNow >= valencia) {
          let r = Math.min(qm, hNow / valencia);
          if (!agitadorAtivo) r *= 0.5;
          removerEspecie(m, r);
          removerEspecie('H+', valencia * r);
          adicionarEspecie(ion, r);
          adicionarEspecie('H2_g', r * (valencia === 2 ? 1 : valencia === 3 ? 1.5 : 0.5));
          sys.temp += r * (m === 'Na_s' ? 5 : m === 'Li_s' ? 4.5 : m === 'K_s' ? 5.5 : m === 'Ca_s' ? 3 : 2);
        }
      }

      // Carbonatos
      const co3 = qtd('CO3_2-');
      if (co3 > 0 && hNow >= 2) {
        const r = Math.min(co3, hNow / 2);
        removerEspecie('CO3_2-', r);
        removerEspecie('H+', 2 * r);
        adicionarEspecie('H2O_l', r);
        adicionarEspecie('CO2_g', r);
      }

      const caco3 = qtd('CaCO3_s');
      if (caco3 > 0 && hNow >= 2) {
        const r = Math.min(caco3, hNow / 2);
        removerEspecie('CaCO3_s', r);
        removerEspecie('H+', 2 * r);
        adicionarEspecie('Ca2+', r);
        adicionarEspecie('H2O_l', r);
        adicionarEspecie('CO2_g', r);
      }

      // Gás Cloro Tóxico
      const clo = qtd('ClO-'), cl = qtd('Cl-');
      if (clo > 0 && cl > 0 && hNow >= 2) {
        const r = Math.min(clo, cl, hNow / 2);
        removerEspecie('ClO-', r);
        removerEspecie('Cl-', r);
        removerEspecie('H+', 2 * r);
        adicionarEspecie('H2O_l', r);
        adicionarEspecie('Cl2_g', r);
        log('⚠ Gás cloro (Cl₂) liberado!', 'log-danger');
      }
    }

    // Reações Alcalinas Violentas
    const alcalinos = ['Na_s', 'Li_s', 'K_s'];
    for (const m of alcalinos) {
      const qm = qtd(m);
      const agua = qtd('H2O_l');
      if (qm > 0 && agua > 0) {
        const ion = m === 'Na_s' ? 'Na+' : m === 'Li_s' ? 'Li+' : 'K+';
        const r = Math.min(qm, agua);
        removerEspecie(m, r);
        removerEspecie('H2O_l', r);
        adicionarEspecie(ion, r);
        adicionarEspecie('OH-', r);
        adicionarEspecie('H2_g', r / 2);
        sys.temp += r * (m === 'K_s' ? 6 : m === 'Li_s' ? 4.8 : 5);
        if (r > 15) dispararAlerta('Explosão!', `Reação violenta de ${m.replace('_s', '')} com água!`);
      }
    }

    // Cálcio + Água
    const ca = qtd('Ca_s'), agua2 = qtd('H2O_l');
    if (ca > 0 && agua2 > 0) {
      let r = Math.min(ca, agua2);
      if (!agitadorAtivo) r *= 0.5;
      removerEspecie('Ca_s', r);
      removerEspecie('H2O_l', r);
      adicionarEspecie('Ca2+', r);
      adicionarEspecie('OH-', 2 * r);
      adicionarEspecie('H2_g', r);
      sys.temp += r * 3;
    }

    // Decomposição de H2O2
    const h2o2 = qtd('H2O2');
    if (h2o2 > 0 && (sys.temp > 50 || qtd('Fe3+') > 0 || qtd('Pb2+') > 0)) {
      const r = Math.min(h2o2, 3);
      removerEspecie('H2O2', r);
      adicionarEspecie('H2O_l', r);
      adicionarEspecie('O2_g', r / 2);
    }

    // Precipitados
    PRECIP_TABLE.forEach(p => {
      const cq = qtd(p.cat), aq = qtd(p.an);
      if (cq > 0 && aq > 0) {
        const fc = cq / p.cC, fa = aq / p.cA;
        const m = Math.min(fc, fa);
        removerEspecie(p.cat, m * p.cC);
        removerEspecie(p.an, m * p.cA);
        adicionarEspecie(p.prod, m);
        if (m > 0.1 && !reacoesCatalogadas.has(p.prod)) {
          reacoesCatalogadas.add(p.prod);
          catalogarFormulacaoNoBanco(p.nomePubChem || p.prod.replace('_s', ''), Array.from(reagentesAdicionados), sys.temp, agitadorAtivo, `Precipitado insolúvel formado (${p.cor}).`);
        }
      }
    });
  }

  function atualizarEstadoFisico() {
    if (sys.shattered) return;
    let congelando = false;

    if (!sys.isClosed) {
      for (const [solv, pe] of Object.entries(BP)) {
        const q = qtd(solv);
        if (q > 0 && sys.temp >= pe) {
          const ex = sys.temp - pe;
          const tx = (0.5 + ex * 0.05) * velocidadeTempo;
          const ev = Math.min(q, tx);
          removerEspecie(solv, ev);
          sys.vol -= ev * 0.018;
          if (ev > 0.05) log(`${solv.replace('_l', '')} evaporando a ${sys.temp.toFixed(1)}°C.`);
        }
      }
    }

    for (const [solv, pf] of Object.entries(FP)) {
      const q = qtd(solv);
      if (q > 0 && sys.temp <= pf) {
        const solidName = solv.replace('_l', '_s');
        const freeze = Math.min(q, 0.8 * velocidadeTempo);
        removerEspecie(solv, freeze);
        adicionarEspecie(solidName, freeze);
        sys.vol -= freeze * 0.018;
        congelando = true;
      }
    }

    const freezeOverlay = document.getElementById('freezeOverlay');
    if (freezeOverlay) freezeOverlay.style.opacity = congelando ? '0.75' : '0';

    if (sys.vol < 0.05) sys.vol = 0;
    if (sys.vol > sys.maxVol) sys.vol = sys.maxVol;
    if (sys.temp > 550) {
      dispararAlerta('Choque Térmico!', 'A vidraria derreteu a 550°C!');
      sys.shattered = true;
      return;
    }

    if (sys.isClosed) {
      const nGas = (qtd('H2_g') + qtd('CO2_g') + qtd('Cl2_g') + qtd('O2_g')) / 1000;
      const volLivre = (sys.maxVol - sys.vol) / 1000;
      sys.pressao = (volLivre > 0 && nGas > 0) ? 1 + (nGas * 0.082 * (sys.temp + 273.15)) / volLivre : 1;

      const warnEl = document.getElementById('pressWarn');
      if (warnEl) {
        if (sys.pressao > 5.5) { warnEl.style.display = 'inline'; warnEl.className = 'press-critical'; warnEl.innerText = '⚠ CRÍTICO'; }
        else if (sys.pressao > 3.0) { warnEl.style.display = 'inline'; warnEl.className = 'press-warning'; warnEl.innerText = '⚠ Alta pressão'; }
        else if (sys.pressao > 1.5) { warnEl.style.display = 'inline'; warnEl.className = 'press-warning'; warnEl.innerText = '⚠ Pressão elevada'; }
        else { warnEl.style.display = 'none'; }
      }

      if (sys.pressao > 6.0) {
        dispararAlerta('Explosão por Pressão!', 'Acúmulo de gás excedeu 6 atm!');
        sys.shattered = true;
      }
    } else {
      sys.pressao = 1;
      const warnEl = document.getElementById('pressWarn');
      if (warnEl) warnEl.style.display = 'none';

      const nGas = qtd('H2_g') + qtd('CO2_g') + qtd('O2_g');
      if (nGas > 50 && sys.vol > sys.maxVol * 0.8) {
        dispararAlerta('Erupção!', 'Geração violenta de gás causou transbordamento!');
        sys.shattered = true;
      }
    }
  }

  // ==========================================
  // 10. ATUALIZAÇÕES DA INTERFACE E GRÁFICOS
  // ==========================================
  function calcularpH() {
    const volL = sys.vol / 1000;
    if (volL <= 0) return 7;
    const h = qtd('H+'), oh = qtd('OH-');
    if (h > 1e-12) {
      const conc = h / volL;
      return Math.max(0, Math.min(14, -Math.log10(Math.max(conc, 1e-14))));
    }
    if (oh > 1e-12) {
      const conc = oh / volL;
      return Math.max(0, Math.min(14, 14 + Math.log10(Math.max(conc, 1e-14))));
    }
    return 7;
  }

  function atualizarUI() {
    const volDisplay = document.getElementById('volDisplay');
    if (volDisplay) volDisplay.innerText = `${sys.vol.toFixed(1)} / ${sys.maxVol} mL`;

    const liq = document.getElementById('liquidLayer');
    if (liq) {
      liq.style.height = Math.min((sys.vol / sys.maxVol) * 100, 100) + '%';
      let corLiq = 'rgba(255,255,255,0.06)';
      if (sys.vol > 0) {
        if (qtd('Cu2+') > 0) corLiq = 'rgba(0,200,255,0.55)';
        else if (qtd('Ni2+') > 0) corLiq = 'rgba(100,220,140,0.55)';
        else if (qtd('Fe3+') > 0 || qtd('Fe2+') > 0) corLiq = 'rgba(255,160,100,0.5)';
        else if (qtd('Pb2+') > 0 || qtd('Ag+') > 0) corLiq = 'rgba(220,220,240,0.25)';
        else if (qtd('Cd2+') > 0) corLiq = 'rgba(255,230,150,0.4)';
        else if (qtd('I2_aq') > 0) corLiq = 'rgba(180,120,180,0.4)';
        if (sys.fenolftaleina) {
          const ph = calcularpH();
          if (ph > 10) corLiq = '#e91e63';
          else if (ph > 8.5) corLiq = '#f06292';
        }
      }
      liq.style.backgroundColor = corLiq;
    }

    let pptH = 0, best = { q: 0, c: 'transparent' };
    PRECIP_TABLE.forEach(p => {
      const q = qtd(p.prod);
      if (q > 0.05) { pptH += 4; if (q > best.q) best = { q: q, c: p.cor }; }
    });

    const precipitadosSolidos = ['Al_s','Zn_s','Mg_s','Ca_s','S_s','I2_s','Fe_s','Ni_s','Cu_s','Sn_s','Pb_s','AcidoSalicilico_s','pAminofenol_s','AAS_s','Paracetamol_s'];
    if (precipitadosSolidos.some(sp => qtd(sp) > 0)) {
      pptH += 4;
      if (best.q === 0) best.c = '#b0bec5';
    }

    const precipLayer = document.getElementById('precipLayer');
    if (precipLayer) {
      precipLayer.style.height = Math.min(pptH, 45) + '%';
      precipLayer.style.backgroundColor = best.c;
    }

    const gasEl = document.getElementById('gasHalo');
    if (gasEl) {
      if (qtd('Cl2_g') > 0) {
        gasEl.style.opacity = '0.85';
        gasEl.style.background = 'radial-gradient(circle, rgba(180,220,80,0.5) 0%, transparent 80%)';
      } else if (qtd('H2_g') > 0 || qtd('CO2_g') > 0 || qtd('O2_g') > 0) {
        gasEl.style.opacity = '0.5';
        gasEl.style.background = 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)';
      } else {
        gasEl.style.opacity = '0';
      }
    }

    const bubbleOverlay = document.getElementById('bubbleOverlay');
    if (bubbleOverlay) bubbleOverlay.style.opacity = (sys.temp > 60 || qtd('H2_g') > 5 || qtd('CO2_g') > 5) ? '1' : '0';

    const hudTemp = document.getElementById('hudTemp');
    const hudPress = document.getElementById('hudPress');
    const hudPH = document.getElementById('hudPH');
    if (hudTemp) hudTemp.innerText = sys.temp.toFixed(1) + ' °C';
    if (hudPress) hudPress.innerText = sys.pressao.toFixed(2) + ' atm';
    if (hudPH) hudPH.innerText = calcularpH().toFixed(2);

    const thermoFill = document.getElementById('thermoFill');
    const thermoBulb = document.getElementById('thermoBulb');
    if (thermoFill && thermoBulb) {
      const tPct = ((sys.temp + 10) / 560) * 100;
      thermoFill.style.height = Math.min(100, Math.max(0, tPct)) + '%';
      const tCol = sys.temp > 50 ? '#ff1744' : sys.temp <= 0 ? '#4fc3f7' : '#00ff88';
      thermoFill.style.backgroundColor = tCol;
      thermoBulb.style.backgroundColor = tCol;
    }

    const speciesTags = document.getElementById('speciesTags');
    if (speciesTags) {
      let tagsHtml = '';
      for (const [esp, q] of sys.especies) {
        if (q < 0.05) continue;
        let cls = 'tag-aq';
        if (esp.endsWith('_s')) cls = 'tag-s';
        else if (esp.endsWith('_g')) cls = 'tag-g';
        else if (esp.endsWith('_l')) cls = 'tag-l';
        const nome = esp.replace(/_s|_g|_l|_aq/g,'').replace(/_2-/g,'²⁻').replace(/3\+/g,'³⁺').replace(/2\+/g,'²⁺').replace(/\+/g,'⁺').replace(/-/g,'⁻');
        tagsHtml += `<span class="tag ${cls}" title="${q.toFixed(2)} mmol">${nome} ${q.toFixed(1)}</span>`;
      }
      speciesTags.innerHTML = tagsHtml || '<span style="color:#546e7a;">vazio</span>';
    }
  }

  function registrarPontoPH() {
    const ph = calcularpH();
    const volPct = sys.maxVol > 0 ? (sys.vol / sys.maxVol) * 100 : 0;
    phDataPoints.push({ vol: volPct, ph: ph });
    if (phDataPoints.length > 200) phDataPoints.shift();
    desenharCurvaPH();
  }

  function desenharCurvaPH() {
    if (!phCtx || !phCanvas) return;
    const w = phCanvas.width, h = phCanvas.height;
    phCtx.clearRect(0, 0, w, h);
    phCtx.fillStyle = '#020617';
    phCtx.fillRect(0, 0, w, h);
    phCtx.strokeStyle = '#1e3a5f';
    phCtx.lineWidth = 1;

    for (let i = 0; i <= 14; i += 2) {
      const y = h - (i / 14) * h;
      phCtx.beginPath();
      phCtx.moveTo(0, y);
      phCtx.lineTo(w, y);
      phCtx.stroke();
      phCtx.fillStyle = '#546e7a';
      phCtx.font = '9px Fira Code';
      phCtx.fillText(i, 2, y - 2);
    }

    if (phDataPoints.length < 2) return;
    phCtx.strokeStyle = '#00ff88';
    phCtx.lineWidth = 2;
    phCtx.shadowColor = 'rgba(0,255,136,0.5)';
    phCtx.shadowBlur = 6;
    phCtx.beginPath();

    for (let i = 0; i < phDataPoints.length; i++) {
      const x = (phDataPoints[i].vol / 100) * w;
      const y = h - (phDataPoints[i].ph / 14) * h;
      if (i === 0) phCtx.moveTo(x, y);
      else phCtx.lineTo(x, y);
    }
    phCtx.stroke();
    phCtx.shadowBlur = 0;
  }

  function limparCurvaPH() {
    phDataPoints = [];
    desenharCurvaPH();
    log('Curva de pH limpa.');
  }

  // ==========================================
  // 11. DOSSIÊ CLÍNICO E PRECEPTOR DE BANCADA
  // ==========================================
  window.abrirDossieCompostoAtual = async function() {
    const modal = document.getElementById('dossieLabModal');
    const content = document.getElementById('dossieLabContent');
    if (!modal || !content) return;

    modal.style.display = 'flex';
    content.innerHTML = `<p style="color:#94a3b8;">Consultando bases científicas (PubChem, ChEBI, Wikidata) para <strong>${compostoAtualParaDossie || 'Composto'}</strong>...</p>`;

    if (!compostoAtualParaDossie) {
      content.innerHTML = '<p>Nenhum produto selecionado ou sintetizado recentemente.</p>';
      return;
    }

    let dossie = null;
    if (typeof ChemicalAPIEngine !== 'undefined' && typeof ChemicalAPIEngine.resolveCompleteCompound === 'function') {
      dossie = await ChemicalAPIEngine.resolveCompleteCompound(compostoAtualParaDossie);
    } else {
      dossie = await consultarDadosPubChem(compostoAtualParaDossie);
    }

    if (dossie) {
      content.innerHTML = `
        <h4 style="color:#38bdf8; margin:0 0 8px;">🔬 ${compostoAtualParaDossie}</h4>
        <p><strong>Nome IUPAC:</strong> <span style="font-family:monospace; color:#94a3b8;">${dossie.iupac || '--'}</span></p>
        <p><strong>Fórmula / Massa:</strong> ${dossie.formula || '--'} • ${dossie.molarMass || dossie.pesoMolecular || '--'} g/mol</p>
        <p><strong>CID PubChem:</strong> <code>${dossie.cid || dossie.pubchemCid || '--'}</code></p>
        <p><strong>Nº CAS:</strong> <code>${dossie.cas || '--'}</code></p>
        <p><strong>ChEMBL:</strong> <code>${dossie.chemblId || '--'}</code></p>
        <p><strong>Papel Biológico / Farmacológico:</strong><br><em style="color:#e2e8f0;">${dossie.papelBiologico || dossie.definicao || 'Propriedades terapêuticas consolidadas.'}</em></p>
      `;
    } else {
      content.innerHTML = '<p style="color:#ef4444;">Não foi possível recuperar dados completos deste composto.</p>';
    }
  };

  window.toggleLabChat = function() {
    const drawer = document.getElementById('labChatDrawer');
    if (drawer) drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
  };

  // ==========================================
  // 11. DOSSIÊ CLÍNICO E PRECEPTOR DE BANCADA (COM MOTOR LOCAL)
  // ==========================================
  window.enviarDuvidaLab = async function() {
    const input = document.getElementById('labChatInput');
    const msg = input ? input.value.trim() : '';
    if (!msg) return;

    const chatBox = document.getElementById('labChatMessages');
    chatBox.innerHTML += `<div class="lab-chat-msg msg-aluno">${msg}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const idTemp = 'lab_typing_' + Date.now();
    chatBox.innerHTML += `<div class="lab-chat-msg msg-preceptor" id="${idTemp}">Consultando base farmacotécnica e parâmetros...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      // 1. Processamento Local Imediato (Rápido, 0 Tokens, Alta Precisão)
      let respostaTexto = "";
      if (typeof LabPreceptorEngine !== 'undefined') {
        respostaTexto = await LabPreceptorEngine.processarMensagem(msg, sys, calcularpH, agitadorAtivo);
      }

      // 2. Se o motor local não gerou resposta específica, consulta o gateway remoto (Apps Script / IA)
      if (!respostaTexto && APPS_SCRIPT_GATEWAY) {
        const especiesLista = Array.from(sys.especies.keys()).join(', ') || 'Nenhuma';
        const res = await fetch(APPS_SCRIPT_GATEWAY, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            acao: 'consultarPreceptorIA',
            duvida: msg,
            modulo: 'Laboratório de Bancada',
            contexto: `T:${sys.temp.toFixed(1)}C, pH:${calcularpH().toFixed(2)}, Vol:${sys.vol.toFixed(1)}mL, Espécies:${especiesLista}, Sistema:${sys.isClosed ? 'Fechado' : 'Aberto'}`
          })
        });
        const data = await res.json();
        respostaTexto = data.resposta;
      }

      const elTyping = document.getElementById(idTemp);
      if (elTyping) elTyping.remove();

      // Renderiza a resposta formatando quebras de linha Markdown
      const htmlFormatado = (respostaTexto || "Dica do Preceptor: Acompanhe os parâmetros de temperatura e pH no painel superior.").replace(/\n/g, '<br>');
      chatBox.innerHTML += `<div class="lab-chat-msg msg-preceptor">${htmlFormatado}</div>`;
    } catch (e) {
      const elTyping = document.getElementById(idTemp);
      if (elTyping) elTyping.remove();
      chatBox.innerHTML += `<div class="lab-chat-msg msg-preceptor">Orientação de Bancada: Sistema a <strong>${sys.temp.toFixed(1)}°C</strong> com pH <strong>${calcularpH().toFixed(2)}</strong>. Verifique o catálogo de precursores para avançar na síntese.</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  };


  // Alertas Proativos do Preceptor no Chat (Disparados uma vez por evento crítico)
  let alertaPressaoEmitido = false;
  let alertaSinteseQuasePronta = false;

  function verificarAlertasProativosPreceptor() {
    const chatBox = document.getElementById('labChatMessages');
    if (!chatBox) return;

    // Alerta de Pressão Crítica em Sistema Fechado
    if (sys.isClosed && sys.pressao > 3.0 && !alertaPressaoEmitido) {
      alertaPressaoEmitido = true;
      chatBox.innerHTML += `
        <div class="lab-chat-msg msg-preceptor" style="border-left-color: #ef4444;">
          ⚠️ <strong>Atenção Imediata:</strong> A pressão interna atingiu <strong>${sys.pressao.toFixed(2)} atm</strong>. Reduza a chama ou remova a rolha do frasco para evitar estilhaçamento da vidraria!
        </div>
      `;
      chatBox.scrollTop = chatBox.scrollHeight;
    } else if (sys.pressao <= 1.5) {
      alertaPressaoEmitido = false;
    }

    // Alerta de Precursores Presentes sem Ativação Térmica (Ex: AAS)
    const temSalicilico = (sys.especies.get('AcidoSalicilico_s') || 0) > 0;
    const temAnidrido = (sys.especies.get('AnidridoAcetico_l') || 0) > 0;
    if (temSalicilico && temAnidrido && sys.temp < 50 && !alertaSinteseQuasePronta) {
      alertaSinteseQuasePronta = true;
      chatBox.innerHTML += `
        <div class="lab-chat-msg msg-preceptor">
          💡 <strong>Dica Farmacotécnica:</strong> Você reuniu os precursores da Aspirina no vaso, mas a temperatura (${sys.temp.toFixed(1)}°C) está abaixo da energia de ativação necessária. Ligue o aquecedor para atingir <strong>60°C</strong> e ative o agitador.
        </div>
      `;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  // ==========================================
  // 12. LOOP TÉRMICO E CONTROLES DE AMBIENTE
  // ==========================================
  window.setVelocidade = function(v) {
    velocidadeTempo = v;
    document.querySelectorAll('.btn-time').forEach(b => b.classList.remove('active-btn'));
    const btnV = document.getElementById('btnT' + v);
    if (btnV) btnV.classList.add('active-btn');
    clearInterval(timerLoop);
    timerLoop = setInterval(loopTermico, 200 / velocidadeTempo);
  };

  window.toggleAgitador = function() {
    agitadorAtivo = !agitadorAtivo;
    const btn = document.getElementById('btnAgitador');
    const agFisico = document.getElementById('agitadorFisico');
    if (btn) btn.classList.toggle('active-btn', agitadorAtivo);
    if (agFisico) agFisico.classList.toggle('ativo', agitadorAtivo);
    verificarSinteseFarmaceutica();
  };

  window.toggleFoco = function() {
    focoAtivo = !focoAtivo;
    const stage = document.getElementById('visualStage');
    if (!stage) return;
    if (focoAtivo) {
      stage.classList.add('focus-active');
      document.body.style.overflow = 'hidden';
    } else {
      stage.classList.remove('focus-active');
      document.body.style.overflow = 'auto';
    }
  };

  window.setModoTermico = function(modo) {
    if (sys.modoTermico === modo) modo = 'ambiente';
    sys.modoTermico = modo;

    const btnHeat = document.getElementById('btnHeat');
    const btnThermostat = document.getElementById('btnThermostat');
    const btnCool = document.getElementById('btnCool');
    const flameFX = document.getElementById('flameFX');
    const iceFX = document.getElementById('iceFX');

    if (btnHeat) btnHeat.classList.toggle('active-btn', modo === 'aquecendo');
    if (btnThermostat) btnThermostat.classList.toggle('active-btn', modo === 'termostato');
    if (btnCool) btnCool.classList.toggle('active-btn', modo === 'resfriando');
    if (flameFX) flameFX.style.opacity = modo === 'aquecendo' ? '1' : '0';
    if (iceFX) iceFX.style.opacity = modo === 'resfriando' ? '1' : '0';
  };

  window.ajustarPotenciaChama = function(val) {
    document.documentElement.style.setProperty('--flame-scale', 0.5 + val * 0.07);
  };

  function loopTermico() {
    if (sys.shattered) return;
    const heatSlider = document.getElementById('heatSlider');
    const pot = heatSlider ? parseInt(heatSlider.value) || 5 : 5;
    const incr = (0.4 + Math.pow(pot, 1.7) * 0.18) * velocidadeTempo;
    let alterou = false;

    if (sys.modoTermico === 'aquecendo') {
      sys.temp += incr;
      alterou = true;
    } else if (sys.modoTermico === 'resfriando') {
      sys.temp -= 1.8 * velocidadeTempo;
      if (sys.temp < -120) sys.temp = -120;
      alterou = true;
    } else if (sys.modoTermico === 'termostato') {
      const tempAlvoEl = document.getElementById('tempAlvo');
      const alvo = tempAlvoEl ? parseFloat(tempAlvoEl.value) || 25 : 25;
      if (sys.temp < alvo - 0.3) { sys.temp += incr * 0.4; alterou = true; }
      else if (sys.temp > alvo + 0.3) { sys.temp -= 0.8 * velocidadeTempo; alterou = true; }
    } else if (sys.modoTermico === 'ambiente') {
      if (sys.temp > 25.3) { sys.temp -= 0.4 * velocidadeTempo; alterou = true; }
      else if (sys.temp < 24.7) { sys.temp += 0.4 * velocidadeTempo; alterou = true; }
      else sys.temp = 25;
    }

    if (alterou) {
      atualizarEquilibrio();
      verificarSinteseFarmaceutica();
      atualizarEstadoFisico();
      atualizarUI();
      registrarPontoPH();
    }
  }

  function construirCatalogo() {
    const grupos = [
      ['💊 Precursores Farmacêuticos', [
        ['AcidoSalicilico_s','Ácido Salicílico (Precursor AAS)'],
        ['AnidridoAcetico_l','Anidrido Acético (Agente Acetilante)'],
        ['pAminofenol_s','4-Aminofenol (Precursor Paracetamol)'],
        ['AlcoolIsopentilico_l','Álcool Isopentílico (Síntese Éster)'],
        ['Anilina_l','Anilina Pura (Precursor Acetanilida)'],
        ['AcidoBenzoico_s','Ácido Benzóico (Síntese Benzoatos)']
      ]],
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
      html += `<details ${idx === 0 ? 'open' : ''}><summary>${titulo}</summary><div class="reagent-list">`;
      itens.forEach(([val, label], i) => {
        html += `<label><input type="radio" name="reagenteSel" value="${val}" ${idx === 0 && i === 0 ? 'checked' : ''}> ${label}</label>`;
      });
      html += '</div></details>';
    });

    const catContainer = document.getElementById('catalogContainer');
    if (catContainer) catContainer.innerHTML = html;
  }

  // ==========================================
  // 13. EXPORTAÇÕES GLOBAIS E INICIALIZAÇÃO
  // ==========================================
  window.proximaMissao = function() { missaoAtual++; resetarLaboratorio(); atualizarUI_Missao(); };
  window.abrirLivroMissoes = function() {
    let html = '<ul style="list-style:none; padding:0;">';
    missoes.forEach((m, i) => {
      const status = i < missaoAtual ? "✅ Concluída" : i === missaoAtual ? "▶ Em Progresso" : "🔒 Bloqueada";
      const color = i < missaoAtual ? "var(--neon-green)" : i === missaoAtual ? "#ff9800" : "#546e7a";
      html += `<li style="color:${color}; margin-bottom:12px; border-bottom:1px dashed #1e3a5f; padding-bottom:8px;"><strong>${m.titulo}</strong> <span style="font-size:0.6rem;">(${status})</span><br><span style="color:#b0bec5; font-size:0.75rem;">${m.desc}</span></li>`;
    });
    html += '</ul>';
    const listEl = document.getElementById('missionsList');
    const modal = document.getElementById('missionsModal');
    if (listEl) listEl.innerHTML = html;
    if (modal) modal.style.display = 'flex';
  };

  window.fecharLivroMissoes = function() {
    const modal = document.getElementById('missionsModal');
    if (modal) modal.style.display = 'none';
  };

  window.abrirManual = () => {
    const modal = document.getElementById('manualModal');
    if (modal) modal.style.display = 'flex';
  };

  window.fecharManual = () => {
    const modal = document.getElementById('manualModal');
    if (modal) modal.style.display = 'none';
  };

  window.resetarLaboratorio = resetarLaboratorio;
  window.trocarVidraria = trocarVidraria;
  window.iniciarAdicao = iniciarAdicao;
  window.pararAdicao = pararAdicao;
  window.limparCurvaPH = limparCurvaPH;
  window.limparRegistro = limparRegistro;
  window.desfazerAcao = desfazerAcao;
  window.consultarDadosPubChem = consultarDadosPubChem;
  window.catalogarFormulacaoNoBanco = catalogarFormulacaoNoBanco;

  construirCatalogo();
  resetarLaboratorio();
  atualizarUI_Missao();
  initSmilesDrawer();
  timerLoop = setInterval(loopTermico, 200);
  log('🚀 LAIFT Engine Uninassau iniciado com Sucesso!', 'log-info');
})();

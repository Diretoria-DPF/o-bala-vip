/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura em Cascata de 3 Camadas:
 *   Camada 1: Base Curada Expandida + IndexedDB Local (0 tokens, resposta instantânea)
 *   Camada 2: Cache Global Compartilhado na Planilha (Apps Script / Acervo)
 *   Camada 3: Inferência Cognitiva Dinâmica via Cluster Groq (openai/gpt-oss-120b)
 */

window.APPS_SCRIPT_GATEWAY = window.APPS_SCRIPT_GATEWAY || 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

const LabPreceptorEngine = {
  // =========================================================================
  // 1. BASE BASE INICIAL DE ROTAS CURADAS (CAMADA 1)
  // =========================================================================
  ROTAS_SINTESE: {
    "aspirina": {
      nome: "Ácido Acetilsalicílico (Aspirina)",
      reagentes: ["Ácido Salicílico (C7H6O3)", "Anidrido Acético ((CH3CO)2O)"],
      catalisador: "Ácido Sulfúrico Concentrado (H2SO4)",
      solvente: "Ácido Acético Glacial",
      tempMin: 60,
      tempMax: 80,
      tempoReacao: "30 min",
      equacao: "C7H6O3 + (CH3CO)2O -> C9H8O4 + CH3COOH",
      perigos: "Corrosivo, Irritante. Vapores de anidrido acético são lacrimogêneos.",
      tipoReacao: "Acetilação fenólica",
      descricao: "Acetilação do ácido salicílico com anidrido acético catalisada por ácido sulfúrico. O produto precipita como cristais brancos ao resfriar em banho de gelo."
    },
    "paracetamol": {
      nome: "Paracetamol (Acetaminofeno)",
      reagentes: ["p-Aminofenol (C6H7NO)", "Anidrido Acético ((CH3CO)2O)"],
      catalisador: "Ácido Sulfúrico ou Autocatalítico",
      solvente: "Água purificada",
      tempMin: 80,
      tempMax: 100,
      tempoReacao: "45 min",
      equacao: "C6H7NO + (CH3CO)2O -> C8H9NO2 + CH3COOH",
      perigos: "Irritante; risco de oxidação do p-aminofenol a subprodutos quinônicos escurecidos.",
      tipoReacao: "Acetilação quimiosseletiva de amina aromática",
      descricao: "Acetilação seletiva do grupamento amino do p-aminofenol com anidrido acético em meio aquoso. O paracetamol cristaliza após resfriamento lento."
    },
    "dipirona": {
      nome: "Dipirona Sódica (Metamizol)",
      reagentes: ["4-Metilaminoantipirina", "Formaldeído (CH2O)", "Bissulfito de Sódio (NaHSO3)"],
      catalisador: "NaOH aquoso (controle de pH entre 6.5 e 7.5)",
      solvente: "Água purificada",
      tempMin: 70,
      tempMax: 90,
      tempoReacao: "1 h",
      equacao: "C11H13N3O + CH2O + NaHSO3 -> C13H16N3NaO4S",
      perigos: "Formaldeído é tóxico e volátil. Manipular estritamente sob capela de exaustão.",
      tipoReacao: "Sulfometilação nucleofílica seguida de salificação",
      descricao: "Reação da 4-metilaminoantipirina com formaldeído e bissulfito de sódio, seguida de metilação e salificação alcalina."
    },
    "ibuprofeno": {
      nome: "Ibuprofeno",
      reagentes: ["Isobutilbenzeno", "Cloreto de Acetila", "Dióxido de Carbono (CO2)"],
      catalisador: "Cloreto de Alumínio (AlCl3) / Catalisador de Paládio",
      solvente: "Diclorometano (CH2Cl2)",
      tempMin: 0,
      tempMax: 25,
      tempoReacao: "2 h",
      equacao: "C10H14 + CH3COCl + CO2 -> C13H18O2",
      perigos: "Corrosivo e inflamável; liberação vigorosa de gás HCl durante a acilação.",
      tipoReacao: "Acoplamento de Friedel-Crafts + Carboxilação",
      descricao: "Acilação de Friedel-Crafts do isobutilbenzeno, seguida de redução e carboxilação catalisada por paládio (processo BHC)."
    }
  },

  // Ingestão dinâmica de arrays de sínteses externas (BANCO_SINTESES_LAIFT)
  carregarBaseSintesesDinamica() {
    if (typeof window.BANCO_SINTESES_LAIFT === 'undefined' || !Array.isArray(window.BANCO_SINTESES_LAIFT)) {
      return;
    }

    window.BANCO_SINTESES_LAIFT.forEach(item => {
      if (!item || !item.nomeComposto) return;
      const chaveId = (item.id || '').replace(/^sintese_/, '').toLowerCase().trim();
      const chaveNome = (item.nomeComposto || '').toLowerCase().trim();
      const chaveNormalizada = chaveNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const dadosFormatados = {
        nome: item.nomeComposto,
        reagentes: Array.isArray(item.reagentesObrigatorios) ? item.reagentesObrigatorios : [],
        catalisador: item.catalisador || 'Sem catalisador específico',
        solvente: item.solvente || 'Meio direto',
        tempMin: item.tempMinima !== undefined ? item.tempMinima : (item.tempMin || 20),
        tempMax: item.tempMaxima !== undefined ? item.tempMaxima : (item.tempMax || 100),
        tempoReacao: item.tempoReacao || '--',
        equacao: item.equacaoQuimica || item.equacao || '--',
        perigos: Array.isArray(item.perigos) ? item.perigos.join(', ') : (item.perigos || 'Manipulação padrão'),
        tipoReacao: item.tipoReacao || 'Síntese química',
        descricao: item.descricao || ''
      };

      if (chaveId) this.ROTAS_SINTESE[chaveId] = dadosFormatados;
      if (chaveNome) this.ROTAS_SINTESE[chaveNome] = dadosFormatados;
      if (chaveNormalizada) this.ROTAS_SINTESE[chaveNormalizada] = dadosFormatados;
    });

    console.log(`✅ [Preceptor] ${Object.keys(this.ROTAS_SINTESE).length} rotas de síntese indexadas.`);
  },

  // =========================================================================
  // 2. DISPARO REMOTO AO APPS SCRIPT (CAMADA 3 — GROQ 120B)
  // =========================================================================
  async consultarGroqRemoto(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const gateway = window.APPS_SCRIPT_GATEWAY;
    if (!gateway || gateway.includes('SEU_GATEWAY')) {
      throw new Error('Endpoint do Apps Script não configurado em window.APPS_SCRIPT_GATEWAY.');
    }

    const especiesVaso = Array.from(sys.especies.entries())
      .filter(([_, q]) => q > 0.01)
      .map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`)
      .join(', ') || 'Vidraria limpa / solvente puro';

    const contextoBancada = `
[PARÂMETROS REAIS DA BANCADA NO MOMENTO]:
- Temperatura Atual: ${sys.temp.toFixed(1)} °C
- Pressão Interna: ${sys.pressao.toFixed(2)} atm
- pH Medido: ${calcularpH().toFixed(2)}
- Volume Total: ${sys.vol.toFixed(1)} mL (capacidade: ${sys.maxVol} mL)
- Sistema Físico: ${sys.isClosed ? 'FECHADO COM ROLHA' : 'ABERTO À ATMOSFERA'}
- Agitador Magnético: ${agitadorAtivo ? 'LIGADO' : 'DESLIGADO'}
- Espécies no vaso: [${especiesVaso}]
`.trim();

    const payload = {
      acao: 'consultarPreceptorIA',
      duvida: msgUsuario,
      contexto: contextoBancada
    };

    const res = await fetch(gateway, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data || !data.resposta) {
      throw new Error(data?.erro || 'O backend retornou uma resposta sem conteúdo textual.');
    }

    return data.resposta;
  },

  // =========================================================================
  // 3. EXECUÇÃO EM CASCATA COM AUTO-APRENDIZADO (3 CAMADAS)
  // =========================================================================
  async processarMensagem(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const texto = msgUsuario.toLowerCase().trim();
    const textoSemAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Diagnóstico do vaso atual
    if (textoSemAcento.includes("o que tem") || textoSemAcento.includes("acontecendo") || textoSemAcento.includes("analis") || textoSemAcento.includes("diagnostico") || textoSemAcento.includes("status")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico da Vidraria Atual:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação de Risco:** ${diag.alerta}
      `.trim();
    }

    // 2. Predição de incompatibilidades
    if (textoSemAcento.includes("acontece se") || textoSemAcento.includes("misturar") || textoSemAcento.includes("adicionar") || textoSemAcento.includes("colocar")) {
      if (typeof LAB_DATABASE !== 'undefined' && LAB_DATABASE.species) {
        for (const [reag, info] of Object.entries(LAB_DATABASE.species)) {
          if (textoSemAcento.includes(reag.toLowerCase()) || textoSemAcento.includes((info.label || '').toLowerCase())) {
            return this.predizerMistura(reag, sys);
          }
        }
      }
    }

    // 3. Extração limpa do composto solicitado
    const termoComposto = textoSemAcento
      .replace(/como sintetizar|como fazer|rota de sintese de|sintese de|sintetizar|como preparar|preparo de|reacao de|fazer/gi, '')
      .replace(/[?.,!]/g, '')
      .trim();

    // --- CAMADA 1: Busca no Acervo Curado (0 ms / 0 tokens) ---[cite: 2]
    for (const [chave, rota] of Object.entries(this.ROTAS_SINTESE)) {
      const chaveSemAcento = chave.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nomeSemAcento = rota.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (textoSemAcento.includes(chaveSemAcento) || nomeSemAcento.includes(termoComposto) || (termoComposto && termoComposto.includes(chaveSemAcento))) {
        return `
**🧪 Rota de Síntese Oficial: ${rota.nome}**[cite: 2]

**1. Parâmetros Ideais:**
* **Precursores:** ${rota.reagentes.join(' + ')}[cite: 2]
* **Catalisador:** ${rota.catalisador}[cite: 2]
* **Solvente:** ${rota.solvente || 'Direto'}[cite: 2]
* **Faixa Térmica:** ${rota.tempMin}°C a ${rota.tempMax}°C (${rota.tempoReacao})[cite: 2]
* **Equação Química:** \`${rota.equacao}\`[cite: 2]

**2. Mecanismo & Procedimento:**
* **Classificação:** ${rota.tipoReacao}[cite: 2]
* **Procedimento:** ${rota.descricao}[cite: 2]

**3. Biossegurança e Riscos:**
* **⚠️ Alerta Operacional:** ${rota.perigos}[cite: 2]

*(⚡ Resposta entregue instantaneamente da Base Curada LAIFT)*
        `.trim();
      }
    }

    // --- CAMADA 2: Cache Global Compartilhado na Planilha (0 tokens) ---
    const gateway = window.APPS_SCRIPT_GATEWAY;
    if (gateway && termoComposto.length >= 3) {
      try {
        const resGlobal = await fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ acao: 'consultarCacheGlobal', termo: termoComposto })
        });
        if (resGlobal.ok) {
          const dataGlobal = await resGlobal.json();
          if (dataGlobal && dataGlobal.sucesso && dataGlobal.sinteseCurada) {
            const rotaCurada = dataGlobal.sinteseCurada.respostaFormatada || dataGlobal.sinteseCurada;
            return `${rotaCurada}\n\n*(🌐 Resposta recuperada do Acervo Global LAIFT)*`;
          }
        }
      } catch (e) {
        console.warn('[Preceptor] Cache global indisponível:', e);
      }
    }

    // --- CAMADA 3: Disparo Cognitivo ao Groq 120B (openai/gpt-oss-120b) ---
    try {
      const respostaIA = await this.consultarGroqRemoto(msgUsuario, sys, calcularpH, agitadorAtivo);

      // Persistência em segundo plano na planilha para alimentar o aprendizado
      if (termoComposto.length >= 3 && gateway) {
        fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            acao: 'salvarCacheGlobal',
            termo: termoComposto,
            dados: {
              nome: termoComposto.toUpperCase(),
              sintese: { respostaFormatada: respostaIA }
            }
          })
        }).catch(() => {});
      }

      return `${respostaIA}\n\n*(🧠 Resposta gerada pelo Groq 120B & Destilada para o acervo)*`;

    } catch (erroGroq) {
      console.error('[Preceptor IA Error]:', erroGroq);

      return `
⚠️ **Não foi possível obter resposta do Preceptor Remoto (Groq 120B).**
*Falha detectada:* \`${erroGroq.message || erroGroq}\`

**Parâmetros Atuais da Bancada:**
* **Temperatura:** ${sys.temp.toFixed(1)} °C | **pH:** ${calcularpH().toFixed(2)} | **Volume:** ${sys.vol.toFixed(1)} mL
* **Agitador:** ${agitadorAtivo ? 'Ligado' : 'Desligado'} | **Sistema:** ${sys.isClosed ? 'Fechado' : 'Aberto'}

*Sugestão:* Você pode consultar compostos da base curada com resposta imediata: **Dipirona**, **Aspirina**, **Paracetamol**, **Ibuprofeno**, **Diclofenaco**, **Captopril**, **Losartana**, **Amoxicilina** ou **Omeprazol**.
      `.trim();
    }
  },

  gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo) {
    const ph = calcularpH();
    const temp = sys.temp;
    const vol = sys.vol;
    const especies = Array.from(sys.especies.entries()).filter(([_, q]) => q > 0.05);

    if (vol === 0 && especies.length === 0) {
      return {
        resumo: "A vidraria está limpa e vazia.",
        detalhes: "Adicione reagentes pelo catálogo para acompanhar reações.",
        alerta: "Nenhum risco detectado."
      };
    }

    const caracteristicaPH = ph < 3 ? "Fortemente Ácida" : ph < 6.5 ? "Levemente Ácida" : ph <= 7.5 ? "Neutra" : ph < 11 ? "Levemente Básica" : "Fortemente Alcalina";
    const estadoTermico = temp < 10 ? "Resfriada (Gelo)" : temp <= 35 ? "Ambiente" : temp < 70 ? "Aquecimento Moderado" : "Alta Temperatura";
    const especiesNomes = especies.map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`).join(', ');

    return {
      resumo: `Vaso com **${vol.toFixed(1)} mL** a **${temp.toFixed(1)}°C** (${estadoTermico}). Solução **${caracteristicaPH}** (pH ${ph.toFixed(2)}).`,
      detalhes: `**Espécies presentes:** ${especiesNomes || "Apenas solvente base"}. Agitador: **${agitadorAtivo ? "Ativo" : "Desligado"}**.`,
      alerta: sys.pressao > 2.0 ? `Pressão elevada (${sys.pressao.toFixed(2)} atm)!` : "Parâmetros estáveis."
    };
  },

  predizerMistura(reagenteAlvo, sys) {
    const temAcido = (sys.especies.get('H+') || 0) > 0.1 || (sys.especies.get('HCl_aq') || 0) > 0 || (sys.especies.get('H2SO4_aq') || 0) > 0;
    const temAgua = (sys.especies.get('H2O_l') || 0) > 0;

    if (['Na_s', 'Li_s', 'K_s'].includes(reagenteAlvo) && temAgua) {
      return "⚠️ **PERIGO EXTREMO:** Metais alcalinos reagem violentamente com água liberando calor suficiente para ignição do gás hidrogênio (H₂).";
    }

    if (reagenteAlvo === 'NaClO_aq' && temAcido) {
      return "⚠️ **ALERTA TOXICOLÓGICO:** A acidificação de hipoclorito gera **Gás Cloro (Cl₂)**, altamente corrosivo e asfixiante.";
    }

    if (['CaCO3_s', 'NaHCO3_s', 'NaHCO3_aq', 'Na2CO3_aq'].includes(reagenteAlvo) && temAcido) {
      return "🧪 **Efervescência:** Reação com liberação rápida de **Dióxido de Carbono (CO₂)**. Cuidado com sobrepressão em sistema fechado.";
    }

    return "A adição alterará a estequiometria e o pH da mistura. Acompanhe a curva de pH após o despejo.";
  }
};

// =========================================================================
// 4. EXPORTAÇÃO GLOBAL E UTILITÁRIOS DO CHAT
// =========================================================================
window.LabPreceptorEngine = LabPreceptorEngine;

window.enviarDuvidaRapida = function(pergunta) {
  const input = document.getElementById('labChatInput');
  if (input) {
    input.value = pergunta;
    if (typeof window.enviarDuvidaLab === 'function') {
      window.enviarDuvidaLab();
    }
  }
};

window.limparChatPreceptor = function() {
  const chatBox = document.getElementById('labChatMessages');
  if (!chatBox) return;

  chatBox.innerHTML = `
    <div class="lab-chat-msg msg-preceptor">
      Bancada conectada ao <strong>Preceptor Virtual LAIFT</strong> (Cluster Groq 120B com acervo de síntese ativo). O que você deseja formular ou investigar?
      <div class="chip-container">
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Dipirona?')">💊 Síntese de Dipirona</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Aspirina?')">🧪 Rota da Aspirina</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Ibuprofeno?')">🔬 Rota do Ibuprofeno</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('O que tem no meu vaso?')">🌡️ Diagnóstico da Vidraria</button>
      </div>
    </div>
  `;
  chatBox.scrollTop = 0;
};

// Inicialização automática das rotas dinâmicas
if (typeof LabPreceptorEngine !== 'undefined') {
  LabPreceptorEngine.carregarBaseSintesesDinamica();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.limparChatPreceptor();
  });
}

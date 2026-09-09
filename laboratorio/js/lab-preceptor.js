/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura Híbrida: Sistema Especialista Local + Sugestões Interativas + Cache Quimiométrico
 */

const LabPreceptorEngine = {
  // 1. CACHE LOCAL PARA ECONOMIA DE REDE E TOKENS
  obterDoCache(termo) {
    try {
      const cache = JSON.parse(localStorage.getItem('laift_chem_cache') || '{}');
      return cache[termo.toLowerCase().trim()] || null;
    } catch (e) {
      return null;
    }
  },

  salvarNoCache(termo, dados) {
    try {
      const cache = JSON.parse(localStorage.getItem('laift_chem_cache') || '{}');
      cache[termo.toLowerCase().trim()] = dados;
      localStorage.setItem('laift_chem_cache', JSON.stringify(cache));
    } catch (e) {
      console.warn('[Preceptor Cache] Falha ao gravar cache local:', e);
    }
  },

  // 2. BASE LOCAL EXPANDIDA DE ROTAS DE SÍNTESE
  ROTAS_SINTESE: {
    "aspirina": {
      nome: "Ácido Acetilsalicílico (Aspirina)",
      reagentes: ["AcidoSalicilico_s", "AnidridoAcetico_l"],
      catalisador: "H2SO4_aq (gotas)",
      vidraria: "Béquer ou Erlenmeyer (250 mL)",
      tempIdeal: "60°C a 70°C (Banho-maria sob agitação)",
      passos: [
        "Carregue 10 g de Ácido Salicílico sólido no béquer.",
        "Adicione 15 mL de Anidrido Acético líquido.",
        "Adicione 3 a 5 gotas de Ácido Sulfúrico (H₂SO₄) como catalisador.",
        "Ligue o aquecimento entre 60°C e 70°C e mantenha o agitador magnético ativo.",
        "Aguarde a acetilação da hidroxila fenólica. O produto cristaliza como precipitado branco."
      ],
      perigos: "Vapores de anidrido acético são lacrimogêneos e o ácido sulfúrico é cáustico.",
      mecanismo: "Ataque nucleofílico do oxigênio fenólico à carbonila do anidrido ativada por prótons."
    },
    "paracetamol": {
      nome: "Paracetamol (Acetaminofeno)",
      reagentes: ["pAminofenol_s", "AnidridoAcetico_l"],
      catalisador: "Autocatalítico",
      vidraria: "Béquer (250 mL)",
      tempIdeal: "55°C a 65°C",
      passos: [
        "Adicione 4-Aminofenol sólido no vaso reacional.",
        "Adicione Anidrido Acético líquido sob agitação contínua.",
        "Aqueça suavemente entre 55°C e 65°C.",
        "A amina reage seletivamente formando o Paracetamol cristalino."
      ],
      perigos: "4-aminofenol pode oxidar em contato prolongado com o ar.",
      mecanismo: "Acilação quimiosseletiva do grupo amino primário aromático."
    },
    "salicilato de metila": {
      nome: "Salicilato de Metila (Óleo de Wintergreen)",
      reagentes: ["AcidoSalicilico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      vidraria: "Erlenmeyer com rolha (250 mL)",
      tempIdeal: "65°C a 75°C",
      passos: [
        "Misture Ácido Salicílico sólido com Metanol líquido.",
        "Adicione Ácido Sulfúrico concentrado como catalisador desidratante.",
        "Aqueça entre 65°C e 75°C mantendo o sistema preferencialmente fechado.",
        "Separação de fase oleosa com aroma canforado característico."
      ],
      perigos: "Metanol é volátil, inflamável e tóxico.",
      mecanismo: "Esterificação clássica de Fischer com desidratação intermolecular."
    },
    "acetanilida": {
      nome: "Acetanilida",
      reagentes: ["Anilina_l", "AnidridoAcetico_l"],
      catalisador: "Não requer",
      vidraria: "Béquer (250 mL)",
      tempIdeal: "Temperatura ambiente (20°C a 25°C)",
      passos: [
        "Adicione Anilina pura na vidraria sob agitação.",
        "Adicione Anidrido Acético gota a gota devido à liberação de calor.",
        "Precipitação imediata de escamas peroladas de acetanilida."
      ],
      perigos: "Anilina é tóxica dérmica e meta-hemoglobinizante.",
      mecanismo: "Amidação nucleofílica exotérmica espontânea."
    },
    "acetato de isopentila": {
      nome: "Acetato de Isopentila (Aroma de Banana)",
      reagentes: ["AcidoAcetico_aq", "AlcoolIsopentilico_l"],
      catalisador: "H2SO4_aq",
      vidraria: "Erlenmeyer (250 mL)",
      tempIdeal: "70°C a 80°C",
      passos: [
        "Misture Ácido Acético com Álcool Isopentílico na proporção 1:1.",
        "Adicione gotas de Ácido Sulfúrico concentrado.",
        "Aqueça acima de 70°C.",
        "Separação de camada éster com odor frutal marcante."
      ],
      perigos: "Vapores inflamáveis de álcool.",
      mecanismo: "Esterificação catalisada por ácido de Brønsted."
    },
    "chuva de ouro": {
      nome: "Iodeto de Chumbo II (Precipitado Cristalino Dourado)",
      reagentes: ["PbNO3_aq", "KI_aq"],
      catalisador: "Não requer",
      vidraria: "Tubo de ensaio ou Béquer",
      tempIdeal: "Ambiente (aquecer e resfriar para lâminas douradas)",
      passos: [
        "Adicione solução incolor de Nitrato de Chumbo II.",
        "Adicione solução incolor de Iodeto de Potássio.",
        "Formação instantânea de cristais amarelos intensos de PbI₂.",
        "Aquecer até dissolver e resfriar lentamente gera cristais cintilantes."
      ],
      perigos: "Compostos solúveis de chumbo são neurotóxicos cumulativos.",
      mecanismo: "Dupla troca com insolubilização regida por Ksp (9.8 × 10⁻⁹)."
    }
  },

  // 3. ANALISADOR DO ESTADO FÍSICO DO VASO
  gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo) {
    const ph = calcularpH();
    const temp = sys.temp;
    const vol = sys.vol;
    const especies = Array.from(sys.especies.entries()).filter(([_, q]) => q > 0.05);

    if (vol === 0 && especies.length === 0) {
      return {
        estado: "Vazio",
        resumo: "A vidraria está limpa e vazia no momento.",
        detalhes: "Escolha um precursor no catálogo à esquerda e adicione ao béquer para iniciar.",
        alerta: "Nenhum risco físico ou químico registrado."
      };
    }

    let caracteristicaPH = ph < 3 ? "Fortemente Ácida (Corrosiva)" : ph < 6.5 ? "Levemente Ácida" : ph <= 7.5 ? "Neutra" : ph < 11 ? "Levemente Básica" : "Fortemente Alcalina (Cáustica)";
    let estadoTermico = temp < 10 ? "Resfriada (Banho de Gelo)" : temp <= 35 ? "Temperatura Ambiente" : temp < 70 ? "Aquecimento Moderado" : "Alta Temperatura";

    let especiesNomes = especies.map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`).join(', ');

    return {
      estado: "Em Operação",
      resumo: `O vaso contém **${vol.toFixed(1)} mL** a **${temp.toFixed(1)}°C** (${estadoTermico}). Solução **${caracteristicaPH}** (pH ${ph.toFixed(2)}).`,
      detalhes: `**Espécies ativas:** ${especiesNomes || "Apenas solvente base"}. Agitador: **${agitadorAtivo ? "Ligado" : "Desligado"}**. Sistema: **${sys.isClosed ? "Fechado com Rolha" : "Aberto"}**.`,
      alerta: sys.pressao > 2.0 ? `⚠️ **Alerta:** Pressão interna elevada (${sys.pressao.toFixed(2)} atm)!` : (temp > 85 ? "Atenção à evaporação rápida de solventes voláteis." : "Parâmetros de bancada sob controle seguro.")
    };
  },

  // 4. PREDIÇÃO DE MISTURAS E RISCOS
  predizerMistura(reagenteAlvo, sys) {
    const temAcido = (sys.especies.get('H+') || 0) > 0.1 || (sys.especies.get('HCl_aq') || 0) > 0 || (sys.especies.get('H2SO4_aq') || 0) > 0;
    const temAgua = (sys.especies.get('H2O_l') || 0) > 0;

    if (['Na_s', 'Li_s', 'K_s'].includes(reagenteAlvo) && temAgua) {
      return "⚠️ **PERIGO EXTREMO:** Metais alcalinos reagem violentamente com água, gerando hidróxido cáustico, gás hidrogênio altamente inflamável (H₂) e calor suficiente para provocar ignição ou explosão imediata.";
    }

    if (reagenteAlvo === 'NaClO_aq' && temAcido) {
      return "⚠️ **ALERTA TOXICOLÓGICO:** A acidificação de hipoclorito de sódio causa desproporcionamento com liberação de **Gás Cloro (Cl₂)**, altamente tóxico e sufocante.";
    }

    if (['CaCO3_s', 'NaHCO3_s', 'NaHCO3_aq', 'Na2CO3_aq'].includes(reagenteAlvo) && temAcido) {
      return "🧪 **Efervescência Química:** Ocorre protonação do carbonato liberando **Dióxido de Carbono (CO₂)**. Se o sistema estiver fechado com rolha, a pressão interna subirá velozmente.";
    }

    return "A adição alterará a concentração de espécies e o pH. Monitore a curva gráfica e o HUD após o despejo.";
  },

  // 5. MOTOR PRINCIPAL DE PROCESSAMENTO DE MENSAGENS
  async processarMensagem(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const texto = msgUsuario.toLowerCase().trim();

    // A: Pedido de Guia Geral, Opções de Criação ou Combinações
    if (texto.includes("como usar") || texto.includes("opcoes") || texto.includes("o que posso criar") || texto.includes("combinac") || texto.includes("o que fazer") || texto.includes("ajuda") || texto.includes("comecar")) {
      return `
**👨‍🏫 Guia de Operações da Bancada LAIFT:**

Você pode simular reações orgânicas, inorgânicas e fenômenos físico-químicos:

**1. Sínteses Farmacêuticas Disponíveis:**
* **Aspirina (AAS):** Ácido Salicílico + Anidrido Acético + gotas de H₂SO₄ (60°C a 70°C).
* **Paracetamol:** 4-Aminofenol + Anidrido Acético (55°C a 65°C).
* **Salicilato de Metila:** Ácido Salicílico + Metanol + H₂SO₄ (65°C a 75°C).
* **Acetanilida:** Anilina + Anidrido Acético (ambiente, 25°C).
* **Acetato de Isopentila (Banana):** Ácido Acético + Álcool Isopentílico + H₂SO₄ (> 70°C).

**2. Fenômenos Inorgânicos:**
* **Chuva de Ouro:** Nitrato de Chumbo II + Iodeto de Potássio (precipitado amarelo cintilante).
* **Neutralizações:** HCl + NaOH (mudança de pH e curva de titulação na aba 📈 Curva pH).
* **Efervescência:** Carbonatos (NaHCO₃ ou CaCO₃) + Ácido (liberação de CO₂).

*Dica: Clique na aba **🔬 Molécula** no painel direito para ver a projeção estrutural 2D e o dossiê da molécula em foco!*
      `.trim();
    }

    // B: Rota de Síntese Específica
    for (const [chave, rota] of Object.entries(this.ROTAS_SINTESE)) {
      if (texto.includes(chave) || (chave === "aspirina" && (texto.includes("aas") || texto.includes("acetilsalicilico")))) {
        return `
**🧪 Rota de Síntese: ${rota.nome}**

**1. Parâmetros Ideais:**
* **Precursores:** ${rota.reagentes.join(' + ')}
* **Catalisador:** ${rota.catalisador}
* **Faixa Térmica:** ${rota.tempIdeal}
* **Vidraria Indicada:** ${rota.vidraria}

**2. Modo Operacional:**
${rota.passos.map((p, idx) => `* **Passo ${idx + 1}:** ${p}`).join('\n')}

**3. Mecanismo & Biossegurança:**
* **Mecanismo:** ${rota.mecanismo}
* **⚠️ Risco:** ${rota.perigos}
        `.trim();
      }
    }

    // C: Diagnóstico do Vaso Atual
    if (texto.includes("o que tem") || texto.includes("acontecendo") || texto.includes("analis") || texto.includes("diagnostico") || texto.includes("status")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico da Vidraria Atual:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação:** ${diag.alerta}
      `.trim();
    }

    // D: Predição de Misturas e Incompatibilidades
    if (texto.includes("acontece se") || texto.includes("misturar") || texto.includes("adicionar") || texto.includes("colocar")) {
      if (typeof LAB_DATABASE !== 'undefined' && LAB_DATABASE.species) {
        for (const [reag, info] of Object.entries(LAB_DATABASE.species)) {
          if (texto.includes(reag.toLowerCase()) || texto.includes(info.label.toLowerCase())) {
            return this.predizerMistura(reag, sys);
          }
        }
      }
    }

    // E: Dúvida Livre / Farmacológica -> Envia ao Apps Script (Groq 120B) se configurado
    const gateway = window.APPS_SCRIPT_GATEWAY || (typeof LAIFT_CONFIG !== 'undefined' ? LAIFT_CONFIG.GATEWAY_URL : null);
    if (gateway) {
      try {
        const especiesVaso = Array.from(sys.especies.entries())
          .filter(([_, q]) => q > 0.05)
          .map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`)
          .join(', ') || 'Vaso vazio';

        const contextoBancada = `T:${sys.temp.toFixed(1)}C; Pressao:${sys.pressao.toFixed(2)}atm; pH:${calcularpH().toFixed(2)}; Vol:${sys.vol.toFixed(1)}mL; Vidraria:${sys.isClosed ? 'Fechada' : 'Aberta'}; Agitador:${agitadorAtivo ? 'Ligado' : 'Parado'}; Especies:${especiesVaso}.`;

        const res = await fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            acao: 'consultarPreceptorIA',
            duvida: msgUsuario,
            contexto: contextoBancada
          })
        });

        const data = await res.json();
        if (data && data.resposta) {
          return data.resposta;
        }
      } catch (e) {
        console.warn('[Preceptor] Falha no gateway remoto, mantendo modo local:', e);
      }
    }

    // Fallback Pedagógico Informativo Local
    return `
**👨‍🏫 Orientação do Preceptor:**
Sua vidraria está a **${sys.temp.toFixed(1)}°C** com **pH ${calcularpH().toFixed(2)}** e volume de **${sys.vol.toFixed(1)} mL**.

Você pode me perguntar:
* *"Como sintetizar Aspirina?"* ou *"Como fazer Paracetamol?"*
* *"O que posso criar aqui?"* para ver a lista de rotas de bancada.
* *"O que tem no meu vaso?"* para uma leitura analítica completa.
    `.trim();
  }
};

// Funções Utilitárias Globais do Chat
window.limparChatPreceptor = function() {
  const chatBox = document.getElementById('labChatMessages');
  if (!chatBox) return;

  chatBox.innerHTML = `
    <div class="lab-chat-msg msg-preceptor">
      Conversa reiniciada. Sou o <strong>Preceptor Virtual LAIFT</strong>. Como posso orientar sua bancada agora?
      <div class="chip-container">
        <button class="chat-chip" onclick="enviarDuvidaRapida('O que posso criar aqui?')">🧪 O que posso criar aqui?</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Aspirina?')">💊 Rota da Aspirina</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como fazer Paracetamol?')">🔬 Rota do Paracetamol</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('O que tem no meu vaso?')">🌡️ Diagnóstico do Vaso</button>
      </div>
    </div>
  `;
  chatBox.scrollTop = 0;
};

window.enviarDuvidaRapida = function(pergunta) {
  const input = document.getElementById('labChatInput');
  if (input) {
    input.value = pergunta;
    if (typeof window.enviarDuvidaLab === 'function') {
      window.enviarDuvidaLab();
    }
  }
};

// Inicializa o chat ao carregar a página
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.limparChatPreceptor();
  });
}

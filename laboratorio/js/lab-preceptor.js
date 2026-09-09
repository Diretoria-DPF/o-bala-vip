/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura em Cascata de 3 Camadas:
 *   Camada 1: IndexedDB Local (Cache offline ultra-rápido, 0 tokens)
 *   Camada 2: Cache Global Compartilhado (Planilha via Apps Script, 0 tokens)
 *   Camada 3: Motor Cognitivo (Cluster Groq 120B com auto-aprendizado e destilação)
 */

window.APPS_SCRIPT_GATEWAY = window.APPS_SCRIPT_GATEWAY || 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

const LabPreceptorEngine = {
  // 1. CACHE LOCAL DE CONTINGÊNCIA RÁPIDA (FALLBACK)
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

  // 2. BASE ESPECIALISTA DE ROTAS CURADAS (RESOLUÇÃO INSTANTÂNEA)
  ROTAS_SINTESE: {
    "dipirona": {
      nome: "Dipirona Sódica (Metamizol)",
      reagentes: ["4-Aminoantipirina", "Formaldeído", "Bissulfito de Sódio"],
      catalisador: "Meio aquoso sob pH controlado (6.0 - 7.0)",
      vidraria: "Béquer ou Balão de Fundo Redondo (250 mL)",
      tempIdeal: "50°C a 60°C",
      passos: [
        "Carregue a 4-aminoantipirina em água purificada sob agitação contínua.",
        "Adicione solução de formaldeído para formar o intermediário metilênico de adição.",
        "Adicione bissulfito de sódio aquoso para sulfonar a cadeia nitrogenada.",
        "Mantenha o aquecimento a 55°C até que a precipitação dos cristais de Dipirona ocorra.",
        "Resfrie em banho de gelo para cristalização do produto farmacêutico purificado."
      ],
      perigos: "Formaldeído emite vapores irritantes e voláteis. Manipular sob exaustão.",
      mecanismo: "Condensação de amina primária com carbonila seguida por adição nucleofílica de bissulfito gerando aminometanossulfonato."
    },
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

  // 3. ANALISADOR DINÂMICO DO VASO
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

    const caracteristicaPH = ph < 3 ? "Fortemente Ácida (Corrosiva)" : ph < 6.5 ? "Levemente Ácida" : ph <= 7.5 ? "Neutra" : ph < 11 ? "Levemente Básica" : "Fortemente Alcalina (Cáustica)";
    const estadoTermico = temp < 10 ? "Resfriada (Banho de Gelo)" : temp <= 35 ? "Temperatura Ambiente" : temp < 70 ? "Aquecimento Moderado" : "Alta Temperatura";

    const especiesNomes = especies.map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`).join(', ');

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

  // 5. MOTOR PRINCIPAL: CASCATA DE TRÊS CAMADAS COM DESTILAÇÃO
  async processarMensagem(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const texto = msgUsuario.toLowerCase().trim();

    // A. Comandos de Guia e Navegação Rápida
    if (texto.includes("como usar") || texto.includes("opcoes") || texto.includes("o que posso criar") || texto.includes("combinac") || texto.includes("o que fazer") || texto.includes("ajuda") || texto.includes("comecar")) {
      return `
**👨‍🏫 Guia de Operações da Bancada LAIFT:**

Você pode simular reações orgânicas, inorgânicas e fenômenos físico-químicos:

**1. Sínteses Farmacêuticas Mapeadas:**
* **Dipirona Sódica:** 4-Aminoantipirina + Formaldeído + Bissulfito de Sódio (55°C).
* **Aspirina (AAS):** Ácido Salicílico + Anidrido Acético + gotas de H₂SO₄ (60°C a 70°C).
* **Paracetamol:** 4-Aminofenol + Anidrido Acético (55°C a 65°C).
* **Salicilato de Metila:** Ácido Salicílico + Metanol + H₂SO₄ (65°C a 75°C).
* **Acetanilida:** Anilina + Anidrido Acético (25°C).
* **Acetato de Isopentila (Banana):** Ácido Acético + Álcool Isopentílico + H₂SO₄ (> 70°C).

**2. Fenômenos Físico-Químicos:**
* **Chuva de Ouro:** Nitrato de Chumbo II + Iodeto de Potássio (precipitado PbI₂ dourado).
* **Curvas de Titulação:** HCl + NaOH com monitoramento dinâmico na aba 📈 Curva pH.
* **Efervescência:** Carbonatos (NaHCO₃/CaCO₃) + Ácido (desprendimento de CO₂).

*Dica: Alterne entre as visualizações 2D e 3D WebGL na aba **🔬 Molécula**!*
      `.trim();
    }

    // B. Diagnóstico da Vidraria Atual
    if (texto.includes("o que tem") || texto.includes("acontecendo") || texto.includes("analis") || texto.includes("diagnostico") || texto.includes("status")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico da Vidraria Atual:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação:** ${diag.alerta}
      `.trim();
    }

    // C. Predição de Incompatibilidades Químicas
    if (texto.includes("acontece se") || texto.includes("misturar") || texto.includes("adicionar") || texto.includes("colocar")) {
      if (typeof LAB_DATABASE !== 'undefined' && LAB_DATABASE.species) {
        for (const [reag, info] of Object.entries(LAB_DATABASE.species)) {
          if (texto.includes(reag.toLowerCase()) || texto.includes(info.label.toLowerCase())) {
            return this.predizerMistura(reag, sys);
          }
        }
      }
    }

    // D. Verificação de Rotas Curadas Locais
    for (const [chave, rota] of Object.entries(this.ROTAS_SINTESE)) {
      if (texto.includes(chave) || (chave === "aspirina" && (texto.includes("aas") || texto.includes("acetilsalicilico")))) {
        return `
**🧪 Rota de Síntese: ${rota.nome}**

**1. Parâmetros Ideais:**
* **Precursores:** ${rota.reagentes.join(' + ')}
* **Catalisador/Meio:** ${rota.catalisador}
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

    // ==========================================
    // CASCATA DE 3 CAMADAS (AUTO-APRENDIZADO)
    // ==========================================
    const termoComposto = texto
      .replace(/como sintetizar|como fazer|rota de sintese de|sintese de|sintetizar|como preparar|preparo de|reacao de|fazer/gi, '')
      .replace(/[?.,!]/g, '')
      .trim();

    const chaveConsulta = termoComposto.length >= 3 ? termoComposto : texto;

    // --- CAMADA 1: IndexedDB Local (0 ms / 0 tokens) ---
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterRotaSinteseLocal === 'function') {
      try {
        const rotaLocal = await LabStorageEngine.obterRotaSinteseLocal(chaveConsulta);
        if (rotaLocal) {
          return `${rotaLocal}\n\n*(⚡ Resposta recuperada instantaneamente da memória local IndexedDB)*`;
        }
      } catch (errLocal) {
        console.warn('[Preceptor Camada 1] Falha ao consultar IndexedDB:', errLocal);
      }
    }

    const fallbackMem = this.obterDoCache(chaveConsulta);
    if (fallbackMem) {
      return `${fallbackMem}\n\n*(⚡ Resposta recuperada do cache rápido)*`;
    }

    // --- CAMADA 2: Cache Global Compartilhado (Apps Script / Planilha — 0 tokens) ---
    const gateway = window.APPS_SCRIPT_GATEWAY;
    if (gateway && chaveConsulta.length >= 3) {
      try {
        const resGlobal = await fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            acao: 'consultarCacheGlobal',
            termo: chaveConsulta
          })
        });

        if (resGlobal.ok) {
          const dataGlobal = await resGlobal.json();
          if (dataGlobal && dataGlobal.sucesso && dataGlobal.sinteseCurada) {
            const rotaCurada = dataGlobal.sinteseCurada.respostaFormatada || dataGlobal.sinteseCurada;

            // Alimenta a Camada 1 (IndexedDB) para acessos subsequentes locais
            if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarRotaSinteseLocal === 'function') {
              await LabStorageEngine.salvarRotaSinteseLocal(chaveConsulta, rotaCurada);
            }
            this.salvarNoCache(chaveConsulta, rotaCurada);

            return `${rotaCurada}\n\n*(🌐 Resposta recuperada do Acervo Global LAIFT)*`;
          }
        }
      } catch (errGlobal) {
        console.warn('[Preceptor Camada 2] Cache global indisponível:', errGlobal);
      }
    }

    // --- CAMADA 3: Motor Cognitivo Groq 120B (Geração e Destilação Contínua) ---
    if (gateway) {
      try {
        const especiesVaso = Array.from(sys.especies.entries())
          .filter(([_, q]) => q > 0.05)
          .map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`)
          .join(', ') || 'Vaso vazio';

        const contextoBancada = `T:${sys.temp.toFixed(1)}°C; Pressao:${sys.pressao.toFixed(2)}atm; pH:${calcularpH().toFixed(2)}; Vol:${sys.vol.toFixed(1)}mL; Vidraria:${sys.isClosed ? 'Fechada' : 'Aberta'}; Agitador:${agitadorAtivo ? 'Ligado' : 'Parado'}; Especies:[${especiesVaso}].`;

        const resIA = await fetch(gateway, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            acao: 'consultarPreceptorIA',
            duvida: msgUsuario,
            contexto: contextoBancada
          })
        });

        if (resIA.ok) {
          const dataIA = await resIA.json();
          if (dataIA && dataIA.resposta) {
            const respostaFormatada = dataIA.resposta;

            // Destilação do aprendizado: persiste na Camada 1 (IndexedDB Local)
            if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarRotaSinteseLocal === 'function') {
              await LabStorageEngine.salvarRotaSinteseLocal(chaveConsulta, respostaFormatada);
            }
            this.salvarNoCache(chaveConsulta, respostaFormatada);

            // Destilação do aprendizado: sincroniza na Camada 2 (Planilha Global)
            fetch(gateway, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                acao: 'salvarCacheGlobal',
                termo: chaveConsulta,
                dados: {
                  nome: chaveConsulta.toUpperCase(),
                  sintese: { respostaFormatada: respostaFormatada }
                }
              })
            }).catch(() => {});

            return respostaFormatada;
          }
        }
      } catch (errIA) {
        console.warn('[Preceptor Camada 3] Falha na chamada da IA Groq 120B:', errIA);
      }
    }

    // Fallback didático caso não haja conexão de rede
    return `
**👨‍🏫 Orientação do Preceptor LAIFT:**
Sua bancada opera a **${sys.temp.toFixed(1)}°C** com **pH ${calcularpH().toFixed(2)}** e volume de **${sys.vol.toFixed(1)} mL**.

Você pode me perguntar:
* *"Como sintetizar Dipirona?"*, *"Como sintetizar Aspirina?"* ou *"Rota do Paracetamol"*.
* *"O que posso criar aqui?"* para inspecionar os reagentes da bancada.
* *"O que tem no meu vaso?"* para obter um diagnóstico físico-químico imediato.
    `.trim();
  }
};

// ==========================================
// FUNÇÕES UTILITÁRIAS GLOBAIS DO CHAT
// ==========================================
window.limparChatPreceptor = function() {
  const chatBox = document.getElementById('labChatMessages');
  if (!chatBox) return;

  chatBox.innerHTML = `
    <div class="lab-chat-msg msg-preceptor">
      Conversa reiniciada. Sou o <strong>Preceptor Virtual LAIFT</strong> (conectado ao cluster Groq 120B e com aprendizado de bancada ativo). Como posso orientar sua síntese agora?
      <div class="chip-container">
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Dipirona?')">💊 Síntese de Dipirona</button>
        <button class="chat-chip" onclick="enviarDuvidaRapida('Como sintetizar Aspirina?')">🧪 Rota da Aspirina</button>
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.limparChatPreceptor();
  });
}

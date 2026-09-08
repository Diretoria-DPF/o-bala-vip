/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura Híbrida: Sistema Especialista Local + Cache Quimiométrico + Enriquecimento por APIs
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

  // 2. BASE LOCAL EXPANDIDA DE ROTAS DE SÍNTESE E PROTOCOLOS
  ROTAS_SINTESE: {
    "aspirina": {
      nome: "Ácido Acetilsalicílico (Aspirina)",
      reagentes: ["AcidoSalicilico_s", "AnidridoAcetico_l"],
      catalisador: "H2SO4_aq",
      vidraria: "becker_250 ou erlen_250",
      tempIdeal: "60°C a 70°C",
      agitacao: true,
      passos: [
        "Adicione Ácido Salicílico sólido (aprox. 10 g) ao béquer ou erlenmeyer.",
        "Adicione Anidrido Acético líquido (10 a 15 mL) para solubilizar o precursor.",
        "Adicione gotas de Ácido Sulfúrico Concentrado (H₂SO₄) para atuar como catalisador ácido.",
        "Ligue o aquecimento até atingir entre 60°C e 70°C e mantenha o agitador magnético ativo.",
        "Aguarde a acetilação da hidroxila fenólica. O produto cristalizará na forma de precipitado branco."
      ],
      perigos: "Vapores de anidrido acético são irritantes e lacrimogêneos. O ácido sulfúrico é altamente corrosivo.",
      mecanismo: "Ataque nucleofílico do oxigênio fenólico do ácido salicílico à carbonila ativada do anidrido acético."
    },
    "paracetamol": {
      nome: "Paracetamol (Acetaminofeno)",
      reagentes: ["pAminofenol_s", "AnidridoAcetico_l"],
      catalisador: "Não obrigatório (autocatalítico)",
      vidraria: "becker_250",
      tempIdeal: "55°C a 65°C",
      agitacao: true,
      passos: [
        "Carregue o 4-Aminofenol sólido no vaso de reação.",
        "Adicione Anidrido Acético líquido sob agitação contínua.",
        "Aqueça suavemente entre 55°C e 65°C.",
        "A amina aromática, mais nucleofílica que o fenol, reage preferencialmente formando o Paracetamol cristalino."
      ],
      perigos: "O 4-aminofenol pode causar oxidação e irritação dérmica. Controle o aquecimento para evitar decomposição.",
      mecanismo: "Acilação seletiva da amina primária formando ligação amídica estável."
    },
    "salicilato de metila": {
      nome: "Salicilato de Metila (Óleo de Wintergreen)",
      reagentes: ["AcidoSalicilico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      vidraria: "erlen_250",
      tempIdeal: "65°C a 75°C",
      agitacao: false,
      passos: [
        "Misture Ácido Salicílico sólido com Metanol líquido.",
        "Adicione Ácido Sulfúrico concentrado como catalisador desidratante.",
        "Aqueça entre 65°C e 75°C. Recomenda-se sistema fechado para condensação de vapores.",
        "Formação de camada oleosa com aroma característico canforado/mentolado."
      ],
      perigos: "Metanol é altamente inflamável e tóxico por inalação. Mantenha em sistema controlado.",
      mecanismo: "Esterificação de Fischer (condensação entre ácido carboxílico e álcool primário)."
    },
    "acetanilida": {
      nome: "Acetanilida",
      reagentes: ["Anilina_l", "AnidridoAcetico_l"],
      catalisador: "Não obrigatório",
      vidraria: "becker_250",
      tempIdeal: "Ambiente (20°C a 25°C)",
      agitacao: true,
      passos: [
        "Adicione Anilina pura na vidraria sob agitação.",
        "Adicione Anidrido Acético gota a gota devido ao caráter exotérmico da reação.",
        "A reação ocorre à temperatura ambiente, formando cristais perolados de acetanilida."
      ],
      perigos: "Anilina é tóxica e meta-hemoglobinizante. Manipule com máxima cautela.",
      mecanismo: "Acetilação nucleofílica de amina aromática."
    },
    "acetato de isopentila": {
      nome: "Acetato de Isopentila (Aroma de Banana)",
      reagentes: ["AcidoAcetico_aq", "AlcoolIsopentilico_l"],
      catalisador: "H2SO4_aq",
      vidraria: "erlen_250",
      tempIdeal: "70°C a 80°C",
      agitacao: false,
      passos: [
        "Misture Ácido Acético com Álcool Isopentílico na proporção 1:1.",
        "Adicione gotas de Ácido Sulfúrico.",
        "Aqueça acima de 70°C.",
        "Separação de fase orgânica com odor frutal intenso."
      ],
      perigos: "Vapores inflamáveis de álcool e ácido acético volátil.",
      mecanismo: "Esterificação clássica com deslocamento de equilíbrio por calor."
    },
    "chuva de ouro": {
      nome: "Iodeto de Chumbo II (Precipitado Dourado)",
      reagentes: ["PbNO3_aq", "KI_aq"],
      catalisador: "Não requer",
      vidraria: "tubo_20 ou becker_250",
      tempIdeal: "Ambiente (ou aquecimento para recristalização)",
      agitacao: false,
      passos: [
        "Adicione Nitrato de Chumbo II em solução (incolor).",
        "Adicione Iodeto de Potássio em solução (incolor).",
        "Precipitação imediata de cristais amarelos intensos de PbI₂.",
        "Se aquecido e resfriado lentamente, os cristais assumem aspecto de lâminas douradas cintilantes."
      ],
      perigos: "Compostos de chumbo são cumulativos e neurotóxicos.",
      mecanismo: "Reação de dupla troca com produto de solubilidade extremamente baixo (Ksp = 9.8 × 10⁻⁹)."
    }
  },

  // 3. ANALISADOR DE ESTADO ATUAL DO VASO REACIONAL
  gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo) {
    const ph = calcularpH();
    const temp = sys.temp;
    const vol = sys.vol;
    const especies = Array.from(sys.especies.entries()).filter(([_, q]) => q > 0.05);

    if (vol === 0 && especies.length === 0) {
      return {
        estado: "Vazio",
        resumo: "A vidraria está limpa e vazia. Escolha um solvente (como Água Destilada ou Etanol) ou precursores no catálogo à esquerda para iniciar.",
        alerta: "Nenhum risco no momento."
      };
    }

    let caracteristicaPH = ph < 3 ? "Altamente Ácida (Corrosiva)" : ph < 6.5 ? "Levemente Ácida" : ph <= 7.5 ? "Neutra" : ph < 11 ? "Moderadamente Básica" : "Fortemente Alcalina (Cáustica)";
    let estadoTermico = temp < 10 ? "Resfriada / Próxima ao congelamento" : temp <= 35 ? "Temperatura Ambiente" : temp < 70 ? "Aquecimento Moderado" : "Alta Temperatura / Sob Refluxo";

    let especiesNomes = especies.map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`).join(', ');

    return {
      estado: "Em Operação",
      resumo: `O sistema contém **${vol.toFixed(1)} mL** a **${temp.toFixed(1)}°C** (${estadoTermico}). Solução **${caracteristicaPH}** (pH ${ph.toFixed(2)}).`,
      detalhes: `**Espécies detectadas:** ${especiesNomes || "Apenas solvente base"}. Agitador: **${agitadorAtivo ? "Ativo" : "Parado"}**. Vidraria: **${sys.isClosed ? "Fechada (Pressão monitorada)" : "Aberta"}**.`,
      alerta: sys.pressao > 2.0 ? `Pressão elevada (${sys.pressao.toFixed(2)} atm). Risco de rompimento da vidraria!` : (temp > 90 ? "Atenção à evaporação acelerada de solventes voláteis." : "Parâmetros físicos sob controle seguro.")
    };
  },

  // 4. PREDIÇÃO DE MISTURA ("O que acontece se misturar X?")
  predizerMistura(reagenteAlvo, sys) {
    const temAcido = sys.especies.get('H+') > 0.1 || sys.especies.get('HCl_aq') > 0 || sys.especies.get('H2SO4_aq') > 0;
    const temAgua = (sys.especies.get('H2O_l') || 0) > 0;

    if (['Na_s', 'Li_s', 'K_s'].includes(reagenteAlvo)) {
      if (temAgua) {
        return "⚠️ **PERIGO EXTREMO:** Os metais alcalinos reagem violentamente com a água presente no vaso, gerando hidróxido, gás hidrogênio altamente inflamável (H₂) e calor excessivo que pode provocar explosão imediata.";
      }
    }

    if (reagenteAlvo === 'NaClO_aq' && sys.especies.get('Cl-') > 0 && temAcido) {
      return "⚠️ **ALERTA TOXICOLÓGICO:** A combinação de hipoclorito, íons cloreto e meio ácido causará desproporcionamento com liberação violenta de **Gás Cloro (Cl₂)**, altamente tóxico e sufocante.";
    }

    if (['CaCO3_s', 'NaHCO3_s', 'NaHCO3_aq', 'Na2CO3_aq'].includes(reagenteAlvo) && temAcido) {
      return "🧪 **Efervescência Química:** O carbonato será protonado pelo ácido presente no vaso, liberando dióxido de carbono (**CO₂**) e água. Se a vidraria estiver fechada, a pressão subirá rapidamente.";
    }

    return "A adição alterará a concentração iônica e o volume da solução. Monitore o pH e a curva gráfica após a inserção.";
  },

  // 5. MOTOR PRINCIPAL DE PROCESSAMENTO DE MENSAGENS
  async processarMensagem(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const texto = msgUsuario.toLowerCase().trim();

    // A: Pergunta de Síntese ("como fazer / sintetizar X")
    for (const [chave, rota] of Object.entries(this.ROTAS_SINTESE)) {
      if (texto.includes(chave) || (chave === "aspirina" && (texto.includes("aas") || texto.includes("acetilsalicilico")))) {
        return `
**🧪 Rota de Síntese: ${rota.nome}**

**1. Parâmetros Ideais:**
* **Precursores:** ${rota.reagentes.join(' + ')}
* **Catalisador:** ${rota.catalisador}
* **Faixa Térmica:** ${rota.tempIdeal} (Agitador: ${rota.agitacao ? 'Ligado' : 'Opcional'})
* **Vidraria Indicada:** ${rota.vidraria}

**2. Procedimento Operacional:**
${rota.passos.map((p, idx) => `* **Passo ${idx + 1}:** ${p}`).join('\n')}

**3. Biossegurança e Mecanismo:**
* **Mecanismo:** ${rota.mecanismo}
* **⚠️ Risco:** ${rota.perigos}
        `.trim();
      }
    }

    // B: Diagnóstico do Vaso Atual ("o que tem / o que está acontecendo / analise")
    if (texto.includes("o que tem") || texto.includes("acontecendo") || texto.includes("analis") || texto.includes("diagnostico") || texto.includes("status")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico Atual da Bancada:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação de Risco:** ${diag.alerta}
      `.trim();
    }

    // C: Predição de Mistura ("o que acontece se / se eu colocar")
    if (texto.includes("acontece se") || texto.includes("misturar") || texto.includes("posso colocar") || texto.includes("adicionar")) {
      for (const [reag, info] of Object.entries(LAB_DATABASE.species || {})) {
        if (texto.includes(reag.toLowerCase()) || texto.includes(info.label.toLowerCase())) {
          return this.predizerMistura(reag, sys);
        }
      }
    }

    // D: Consulta de Fármaco Arbitrário (Pesquisa com Cache Local + APIs Externas)
    const palavras = texto.replace(/[?.,!]/g, '').split(' ');
    for (const termo of palavras) {
      if (termo.length > 3) {
        // Tenta buscar no cache do navegador primeiro (Zero Tokens / Zero Latência)
        const emCache = this.obterDoCache(termo);
        if (emCache) {
          return `
**📋 Ficha Técnica (Acervo Local): ${emCache.nome}**
* **IUPAC:** ${emCache.iupac}
* **Fórmula / Massa:** ${emCache.formula} (${emCache.molarMass} g/mol)
* **Número CAS:** ${emCache.cas} • **ChEBI:** ${emCache.chebiId}
* **Papel Farmacológico:** ${emCache.papelBiologico}
          `.trim();
        }

        // Se não tiver no cache, busca dinamicamente nas APIs públicas (PubChem / ChEBI / Wikidata)
        if (typeof ChemicalAPIEngine !== 'undefined') {
          const comp = await ChemicalAPIEngine.resolveCompleteCompound(termo);
          if (comp && comp.smiles) {
            const card = {
              nome: termo.toUpperCase(),
              iupac: comp.iupac || '--',
              formula: comp.formula || '--',
              molarMass: comp.molarMass || comp.pesoMolecular || '--',
              cas: comp.cas || '--',
              chebiId: comp.chebiId || '--',
              papelBiologico: comp.papelBiologico || 'Composto farmacologicamente caracterizado.'
            };
            this.salvarNoCache(termo, card);

            return `
**🌐 Identificação Quimiométrica (PubChem / ChEBI): ${card.nome}**
* **IUPAC:** ${card.iupac}
* **Fórmula / Massa:** ${card.formula} (${card.molarMass} g/mol)
* **Número CAS:** ${card.cas} • **ChEBI:** ${card.chebiId}
* **Papel Clínico:** ${card.papelBiologico}
            `.trim();
          }
        }
      }
    }

    // E: Resposta Pedagógica Padrão Integrada ao Contexto Físico
    const phAtual = calcularpH().toFixed(2);
    const tempAtual = sys.temp.toFixed(1);
    return `
**👨‍🏫 Orientação do Preceptor LAIFT:**
Sua bancada está operando a **${tempAtual}°C** com **pH ${phAtual}** e volume de **${sys.vol.toFixed(1)} mL**.

Para orientar seu experimento com exatidão, você pode me perguntar:
* *"Como sintetizar Aspirina?"* (ou Paracetamol, Salicilato de Metila, Acetanilida)
* *"O que tem no meu vaso agora?"* para uma leitura analítica completa das espécies em equilíbrio.
* *"O que acontece se eu misturar Sódio Metálico?"* para checagem prévia de risco e estequiometria.
    `.trim();
  }
};

// Exportação global
if (typeof window !== "undefined") {
  window.LabPreceptorEngine = LabPreceptorEngine;
}

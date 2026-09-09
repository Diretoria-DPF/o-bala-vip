/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura em Cascata de 3 Camadas:
 *   Camada 1: Base Curada Expandida (Catálogo Farmacêutico & Industrial) + IndexedDB Local (0 tokens, resposta instantânea)
 *   Camada 2: Cache Global Compartilhado na Planilha (Apps Script / Acervo)
 *   Camada 3: Inferência Cognitiva Dinâmica via Cluster Groq (openai/gpt-oss-120b)
 */

window.APPS_SCRIPT_GATEWAY = window.APPS_SCRIPT_GATEWAY || 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

const LabPreceptorEngine = {
  // =========================================================================
  // 1. BASE DE SÍNTESES FARMACÊUTICAS E INDUSTRIAIS (CAMADA 1)
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
      perigos: "Corrosivo e inflamável; liberação intensa de gás clorídrico (HCl) na acilação.",
      tipoReacao: "Acoplamento de Friedel-Crafts + Carboxilação",
      descricao: "Síntese multi-etapas: acilação de Friedel-Crafts do isobutilbenzeno, seguida de redução e carboxilação catalisada por paládio (processo verde BHC)."
    },
    "diclofenaco": {
      nome: "Diclofenaco Sódico",
      reagentes: ["2,6-Dicloroanilina", "Ácido 2-clorofenilacético"],
      catalisador: "Cloreto Cuproso (CuCl)",
      solvente: "Dimetilformamida (DMF)",
      tempMin: 120,
      tempMax: 140,
      tempoReacao: "4 h",
      equacao: "C6H5Cl2N + C8H7ClO2 -> C14H10Cl2NNaO2",
      perigos: "Tóxico; DMF apresenta toxicidade reprodutiva.",
      tipoReacao: "Acoplamento de Ullmann + Ciclização",
      descricao: "Acoplamento de Ullmann entre 2,6-dicloroanilina e ácido 2-clorofenilacético, seguido de ciclização a indolinona e abertura alcalina com NaOH."
    },
    "losartana": {
      nome: "Losartana Potássica",
      reagentes: ["2-Butil-4-cloroimidazol", "Brometo de 4'-bromometil-2-bifenilcarbonitrila", "Azida de Sódio (NaN3)"],
      catalisador: "Hidreto de Sódio (NaH)",
      solvente: "Tetraidrofurano (THF)",
      tempMin: 0,
      tempMax: 60,
      tempoReacao: "6 h",
      equacao: "C7H11ClN2 + C14H10Br2N + NaN3 -> C22H23ClN6O",
      perigos: "Azida de sódio é altamente tóxica e explosiva ao contato com metais pesados ou ácidos.",
      tipoReacao: "N-Alquilação + Cicloadição 1,3-dipolar (Tetrazolação)",
      descricao: "Alquilação do anel imidazol, seguida de tetrazolação da nitrila com azida e hidrólise para isolamento da losartana."
    },
    "captopril": {
      nome: "Captopril",
      reagentes: ["L-Prolina", "Ácido 3-acetiltio-2-metilpropanóico"],
      catalisador: "Dicicloexilcarbodiimida (DCC)",
      solvente: "Diclorometano (CH2Cl2)",
      tempMin: 0,
      tempMax: 25,
      tempoReacao: "3 h",
      equacao: "C5H9NO2 + C6H10O3S -> C9H15NO3S",
      perigos: "DCC é potente sensibilizante dérmico; presença de tióis com odor sulfuroso forte.",
      tipoReacao: "Acoplamento peptídico + Desproteção de tiol",
      descricao: "Condensação da L-prolina com ácido 3-acetiltio-2-metilpropanóico com ativação por DCC, seguida de hidrólise básica do grupo tioéster."
    },
    "anlodipino": {
      nome: "Besilato de Anlodipino",
      reagentes: ["2-Clorobenzaldeído", "Acetoacetato de Metila", "3-Aminocrotonato de Metila"],
      catalisador: "Acetato de Amônio (NH4OAc)",
      solvente: "Etanol Absoluto",
      tempMin: 80,
      tempMax: 90,
      tempoReacao: "4 h",
      equacao: "C7H5ClO + C5H8O3 + C5H9NO2 -> C20H25ClN2O5",
      perigos: "Irritante dérmico e respiratório.",
      tipoReacao: "Síntese multicomponente de Hantzsch",
      descricao: "Condensação multicomponente de Hantzsch para formação do anel 1,4-diidropiridínico assimétrico característico."
    },
    "metformina": {
      nome: "Cloridrato de Metformina",
      reagentes: ["Cianoguanidina (Dicandiamida)", "Cloridrato de Dimetilamina"],
      catalisador: "HCl aquoso / Autocatalítico",
      solvente: "Dimetilformamida (DMF) ou Tolueno",
      tempMin: 100,
      tempMax: 120,
      tempoReacao: "5 h",
      equacao: "C2H4N4 + C2H7N -> C4H11N5",
      perigos: "Vapores de amina voláteis e inflamáveis sob refluxo térmico.",
      tipoReacao: "Adição nucleofílica de amina a nitrila",
      descricao: "Reação da cianoguanidina com dimetilamina em solvente polar, gerando o esqueleto de biguanida isolado como sal cloridrato."
    },
    "amoxicilina": {
      nome: "Amoxicilina Tri-hidratada",
      reagentes: ["Ácido 6-Aminopenicilânico (6-APA)", "Cloreto de D-p-hidroxifenilglicina protegido"],
      catalisador: "Trietilamina (Et3N) ou Enzima Penicilina Acilase",
      solvente: "Diclorometano aquoso (CH2Cl2)",
      tempMin: 0,
      tempMax: 25,
      tempoReacao: "2 h",
      equacao: "C8H12N2O3S + C9H9ClNO3 -> C16H19N3O5S",
      perigos: "Antibiótico beta-lactâmico com elevado potencial alergênico e anafilático.",
      tipoReacao: "Acilação enantiosseletiva de amina beta-lactâmica",
      descricao: "Acilação do núcleo 6-APA com cloreto de p-hidroxifenilglicina protegido sob pH controlado (6.0), seguida de desproteção ácida."
    },
    "omeprazol": {
      nome: "Omeprazol",
      reagentes: ["Sulfeto de Omeprazol (tioéter precursor)", "Ácido m-Cloroperbenzóico (MCPBA)"],
      catalisador: "Controle estequiométrico estrito (sem catalisador)",
      solvente: "Diclorometano (CH2Cl2)",
      tempMin: 0,
      tempMax: 25,
      tempoReacao: "2 h",
      equacao: "C17H19N3OS + MCPBA -> C17H19N3O3S",
      perigos: "Perácidos são oxidantes térmicos instáveis com risco de decomposição violenta.",
      tipoReacao: "Oxidação quimiosseletiva de sulfeto a sulfóxido",
      descricao: "Oxidação controlada do tioéter precursor com perácido a temperaturas sub-ambiente para prevenir a superoxidação a sulfona."
    },
    "diazepam": {
      nome: "Diazepam",
      reagentes: ["2-Amino-5-clorobenzofenona", "Cloreto de Cloroacetila", "Amônia (NH3)"],
      catalisador: "NaOH aquoso",
      solvente: "Etanol Absoluto",
      tempMin: 60,
      tempMax: 80,
      tempoReacao: "4 h",
      equacao: "C13H10ClNO + C2H2Cl2O + NH3 -> C16H13ClN2O",
      perigos: "Substância psicotrópica controlada; cloreto de cloroacetila é vesicante severo.",
      tipoReacao: "Acilação seguida de amonólise e ciclização intramolecular",
      descricao: "Formação do anel benzodiazepínico de 7 membros via acilação da aminobenzofenona, amonólise e fechamento térmico de anel."
    },
    "clonazepam": {
      nome: "Clonazepam",
      reagentes: ["2-Amino-5-nitrobenzofenona", "Cloreto de Cloroacetila", "Amônia"],
      catalisador: "NaOH aquoso",
      solvente: "Etanol Absoluto",
      tempMin: 60,
      tempMax: 80,
      tempoReacao: "5 h",
      equacao: "C13H10N2O3 + C2H2Cl2O -> C15H10ClN3O3",
      perigos: "Composto sujeito a controle sanitário estrito; vapores tóxicos e corrosivos.",
      tipoReacao: "Ciclização benzodiazepínica aromática",
      descricao: "Condensação da 2-amino-5-nitrobenzofenona com cloreto de cloroacetila seguida de ciclização induzida por amônia."
    },
    "fluoxetina": {
      nome: "Cloridrato de Fluoxetina",
      reagentes: ["(3-Cloropropil)benzeno", "4-(Trifluorometil)fenol", "Metilamina"],
      catalisador: "NaOH aquoso",
      solvente: "Dimetilformamida (DMF)",
      tempMin: 60,
      tempMax: 80,
      tempoReacao: "4 h",
      equacao: "C9H11Cl + C7H5F3O + CH5N -> C17H18F3NO·HCl",
      perigos: "Fenóis fluorados são cáusticos; metilamina é um gás inflamável e irritante.",
      tipoReacao: "Adição de Michael + Aminação nucleofílica",
      descricao: "Eterificação aromática do fenol fluorado com o haleto, seguida de aminação nucleofílica com metilamina e salificação."
    },
    "sertralina": {
      nome: "Cloridrato de Sertralina",
      reagentes: ["4-(3,4-Diclorofenil)-3,4-diidronaftalen-1(2H)-ona", "3,4-Diclorofenil-lítio", "Metilamina"],
      catalisador: "Pd/C (Hidrogenação catalítica)",
      solvente: "Tetraidrofurano (THF)",
      tempMin: -78,
      tempMax: 25,
      tempoReacao: "3 h",
      equacao: "C10H8O + C6H3Cl2Li -> C17H17Cl2N·HCl",
      perigos: "Reagentes organolíticos são pirofóricos (queimam espontaneamente em contato com o ar).",
      tipoReacao: "Adição nucleofílica de organolítico + Aminação redutiva cis-seletiva",
      descricao: "Adição organometálica à tetralona, seguida de desidratação e hidrogenação catalítica diastereosseletiva para obter o isômero cis."
    },
    "atorvastatina": {
      nome: "Atorvastatina Cálcica",
      reagentes: ["4-Fluorobenzaldeído", "Acetoacetato de Etila", "Isobutirilacetato de Etila"],
      catalisador: "NaOH / Ácido Piválico",
      solvente: "Etanol Absoluto",
      tempMin: 60,
      tempMax: 80,
      tempoReacao: "8 h",
      equacao: "C7H5FO + C6H10O3 + C8H14O3 -> C33H35FN2O5",
      perigos: "Solventes voláteis inflamáveis.",
      tipoReacao: "Síntese convergente de Paal-Knorr para anel pirrólico",
      descricao: "Condensação de Paal-Knorr para construção do anel pirrol central pentassubstituído, seguida de extensão enantiossedletiva da cadeia lateral."
    },
    "sildenafila": {
      nome: "Citrato de Sildenafila",
      reagentes: ["2-Etoxibenzamida", "4-Metilpiperazina", "Cloreto de 5-(2-clorofenil)-1H-pirazol-3-carbonila"],
      catalisador: "Trietilamina (Et3N) e Ácido Cítrico",
      solvente: "Dimetilformamida (DMF)",
      tempMin: 70,
      tempMax: 90,
      tempoReacao: "8 h",
      equacao: "C9H11NO2 + C5H12N2 + C10H6Cl2N2O -> C22H30N6O4S·C6H8O7",
      perigos: "Cloretos de acila e sulfonila liberam fumos densos de HCl.",
      tipoReacao: "Acoplamento e ciclização a pirazolopirimidinona + Sulfonilação",
      descricao: "Acoplamento para fechamento do sistema pirazolopirimidinona, sulfonilação na posição 5' com piperazina e precipitação com ácido cítrico."
    },
    "salicilato de metila": {
      nome: "Salicilato de Metila",
      reagentes: ["AcidoSalicilico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      solvente: "Metanol_l",
      tempMin: 65,
      tempMax: 75,
      tempoReacao: "3 h",
      equacao: "C7H6O3 + CH3OH -> C8H8O3 + H2O",
      perigos: "Inflamável, Irritante. Metanol é tóxico por ingestão e inalação.",
      tipoReacao: "Esterificação clássica de Fischer",
      descricao: "Esterificação de Fischer entre ácido salicílico e excesso de metanol catalisada por ácido sulfúrico concentrado sob refluxo térmico."
    },
    "acetato de isopentila": {
      nome: "Acetato de Isopentila (Aroma de Banana)",
      reagentes: ["AcidoAcetico_aq", "AlcoolIsopentilico_l"],
      catalisador: "H2SO4_aq",
      solvente: "AcidoAcetico_aq",
      tempMin: 70,
      tempMax: 90,
      tempoReacao: "2 h",
      equacao: "CH3COOH + C5H12O -> C7H14O2 + H2O",
      perigos: "Vapores inflamáveis.",
      tipoReacao: "Esterificação de Fischer",
      descricao: "Condensação ácida de álcool isopentílico com ácido acético com separação de fase do éster insolúvel em água."
    },
    "chuva de ouro": {
      nome: "Iodeto de Chumbo II (Precipitado Dourado)",
      reagentes: ["PbNO3_aq", "KI_aq"],
      catalisador: "Não requer",
      solvente: "Agua_l",
      tempMin: 20,
      tempMax: 90,
      tempoReacao: "Imediato",
      equacao: "Pb(NO3)2 + 2KI -> PbI2 + 2KNO3",
      perigos: "Tóxico cumulativo (sais solúveis de chumbo são neurotóxicos).",
      tipoReacao: "Dupla troca com precipitação regida por Ksp",
      descricao: "Reação aquosa instantânea que forma um precipitado amarelo intenso de PbI2. Ao aquecer até dissolução e resfriar lentamente, recristalizam lâminas douradas cintilantes."
    }
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

    // Normalização semântica (remove acentos para comparação uniforme)
    const textoSemAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Diagnóstico do vaso atual
    if (textoSemAcento.includes("o que tem") || textoSemAcento.includes("acontecendo") || textoSemAcento.includes("analis") || textoSemAcento.includes("diagnostico") || textoSemAcento.includes("status do vaso")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico da Vidraria Atual:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação de Risco:** ${diag.alerta}
      `.trim();
    }

    // 2. Extração limpa do nome do composto
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

      // Sincroniza em segundo plano com a planilha para consultas futuras custarem 0 tokens
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
  }
};

// =========================================================================
// 4. UTILITÁRIOS GLOBAIS DO CHAT
// =========================================================================
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.limparChatPreceptor();
  });
}

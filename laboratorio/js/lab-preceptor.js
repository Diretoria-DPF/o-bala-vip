/**
 * LAIFT — MOTOR COGNITIVO DO PRECEPTOR VIRTUAL DE BANCADA
 * Arquitetura em Cascata de 3 Camadas:
 *   Camada 1: Base Curada + IndexedDB / Cache Local (0 tokens, resposta instantânea)
 *   Camada 2: Cache Global Compartilhado na Planilha (Apps Script)
 *   Camada 3: Inferência Cognitiva Dinâmica via Cluster Groq (openai/gpt-oss-120b)
 */

window.APPS_SCRIPT_GATEWAY = window.APPS_SCRIPT_GATEWAY || 'https://script.google.com/macros/s/AKfycbxbIrLKrfWjia_K-05aywbo9sou__8RW3MzIjeD3WoNc6CNJILXutTl93NfiBVwbDSM/exec';

const LabPreceptorEngine = {
  // =========================================================================
  // 1. BASE EXPANDIDA DE SÍNTESES FARMACÊUTICAS E INDUSTRIAIS (CAMADA 1)
  // =========================================================================
  ROTAS_SINTESE: {
    "aspirina": {
      nome: "Ácido Acetilsalicílico (Aspirina)",
      reagentes: ["Ácido Salicílico (C7H6O3)", "Anidrido Acético ((CH3CO)2O)"],
      catalisador: "Ácido Sulfúrico Concentrado (H2SO4)",
      solvente: "Ácido Acético Glacial",
      faixaTermica: "60°C a 80°C (30 min)",
      equacao: "C7H6O3 + (CH3CO)2O ➔ C9H8O4 + CH3COOH",
      perigos: "Vapores lacrimogêneos e risco de queimadura por ácido concentrado.",
      tipoReacao: "Esterificação / Acetilação fenólica",
      descricao: "Acetilação do ácido salicílico com anidrido acético catalisada por ácido sulfúrico. O produto precipita como cristais brancos ao resfriar em banho de gelo."
    },
    "paracetamol": {
      nome: "Paracetamol (Acetaminofeno)",
      reagentes: ["4-Aminofenol (p-aminofenol)", "Anidrido Acético"],
      catalisador: "Ácido Sulfúrico ou Autocatalítico",
      solvente: "Água purificada",
      faixaTermica: "80°C a 100°C (45 min)",
      equacao: "C6H7NO + (CH3CO)2O ➔ C8H9NO2 + CH3COOH",
      perigos: "Irritante dérmico e ocular; risco de oxidação do 4-aminofenol a subprodutos quinônicos.",
      tipoReacao: "Acilação quimiosseletiva de amina aromática",
      descricao: "Acetilação seletiva do grupo amino do p-aminofenol em meio aquoso. O paracetamol cristaliza após resfriamento lento."
    },
    "dipirona": {
      nome: "Dipirona Sódica (Metamizol Sódico)",
      reagentes: ["4-Metilaminoantipirina", "Formaldeído (CH2O)", "Bissulfito de Sódio (NaHSO3)"],
      catalisador: "NaOH (controle de pH 6.5 - 7.5)",
      solvente: "Água purificada",
      faixaTermica: "70°C a 90°C (1 h)",
      equacao: "C11H13N3O + CH2O + NaHSO3 ➔ C13H16N3NaO4S",
      perigos: "Formaldeído é tóxico e volátil. Manipular estritamente sob capela de exaustão.",
      tipoReacao: "Sulfometilação nucleofílica seguida de salificação",
      descricao: "Condensação da 4-metilaminoantipirina com formaldeído e bissulfito de sódio em meio alcalino brando, seguida de cristalização."
    },
    "ibuprofeno": {
      nome: "Ibuprofeno",
      reagentes: ["Isobutilbenzeno", "Cloreto de Acetila", "Dióxido de Carbono (CO2)"],
      catalisador: "Cloreto de Alumínio (AlCl3) / Catalisador de Paládio",
      solvente: "Diclorometano (CH2Cl2)",
      faixaTermica: "0°C a 25°C (2 h)",
      equacao: "C10H14 + CH3COCl + CO2 ➔ C13H18O2",
      perigos: "Corrosivo e inflamável; liberação vigorosa de gás HCl durante a acilação.",
      tipoReacao: "Acilação de Friedel-Crafts seguida de carboxilação catalítica",
      descricao: "Acilação de Friedel-Crafts do isobutilbenzeno seguida de hidrogenação enantiossedletiva e carbonilação (processo verde BHC)."
    },
    "diclofenaco": {
      nome: "Diclofenaco Sódico",
      reagentes: ["2,6-Dicloroanilina", "Ácido 2-clorofenilacético"],
      catalisador: "Cloreto Cuproso (CuCl)",
      solvente: "Dimetilformamida (DMF)",
      faixaTermica: "120°C a 140°C (4 h)",
      equacao: "C6H5Cl2N + C8H7ClO2 ➔ C14H10Cl2NNaO2",
      perigos: "Compostos halogenados aromáticos tóxicos; solvente DMF teratogênico.",
      tipoReacao: "Acoplamento de Ullmann com ciclização a indolinona e abertura alcalina",
      descricao: "Acoplamento de Ullmann catalisado por cobre, seguido de ciclização e hidrólise alcalina com hidróxido de sódio."
    },
    "losartana": {
      nome: "Losartana Potássica",
      reagentes: ["2-Butil-4-cloroimidazol", "Brometo de 4'-bromometil-2-bifenilcarbonitrila", "Azida de Sódio (NaN3)"],
      catalisador: "Hidreto de Sódio (NaH)",
      solvente: "Tetraidrofurano (THF)",
      faixaTermica: "0°C a 60°C (6 h)",
      equacao: "C7H11ClN2 + C14H10Br2N + NaN3 ➔ C22H23ClN6O",
      perigos: "Azida de sódio é altamente tóxica e pode formar azidas metálicas explosivas.",
      tipoReacao: "N-Alquilação nucleofílica seguida de cicloadição [3+2] gerando anel tetrazol",
      descricao: "Alquilação da posição 1 do imidazol, tetrazolação da nitrila aromática com azida e salificação com hidróxido de potássio."
    },
    "captopril": {
      nome: "Captopril",
      reagentes: ["L-Prolina", "Ácido 3-acetiltio-2-metilpropanóico"],
      catalisador: "Dicicloexilcarbodiimida (DCC)",
      solvente: "Diclorometano (CH2Cl2)",
      faixaTermica: "0°C a 25°C (3 h)",
      equacao: "C5H9NO2 + C6H10O3S ➔ C9H15NO3S",
      perigos: "Odor fétido e irritante característico de tióis; DCC é sensibilizante dérmico severo.",
      tipoReacao: "Acoplamento peptídico seguido de amonólise do tioéster",
      descricao: "Condensação de L-prolina com o derivado tioéster via DCC, seguida de hidrólise básica branda para regenerar o grupo sulfidrila (-SH) livre."
    },
    "anlodipino": {
      nome: "Besilato de Anlodipino",
      reagentes: ["2-Clorobenzaldeído", "Acetoacetato de Metila", "3-Aminocrotonato de Metila"],
      catalisador: "Acetato de Amônio (NH4OAc)",
      solvente: "Etanol Absoluto",
      faixaTermica: "80°C a 90°C (4 h)",
      equacao: "C7H5ClO + C5H8O3 + C5H9NO2 ➔ C20H25ClN2O5",
      perigos: "Irritante respiratório e ocular.",
      tipoReacao: "Condensação multicomponente de Hantzsch",
      descricao: "Formação do núcleo 1,4-diidropiridínico assimétrico via síntese de Hantzsch, seguido de introdução da cadeia aminoetoximetil."
    },
    "metformina": {
      nome: "Cloridrato de Metformina",
      reagentes: ["Cianoguanidina (Dicandiamida)", "Cloridrato de Dimetilamina"],
      catalisador: "Autocatalítico em meio ácido",
      solvente: "Tolueno ou DMF",
      faixaTermica: "130°C a 150°C (3 h)",
      equacao: "C2H4N4 + C2H7N·HCl ➔ C4H11N5·HCl",
      perigos: "Aquecimento de sais de amina a altas temperaturas pode liberar aminas voláteis.",
      tipoReacao: "Adição nucleofílica de amina a nitrila com rearranjo a biguanida",
      descricao: "Fusão térmica ou refluxo da cianoguanidina com cloridrato de dimetilamina, gerando o cloridrato de metformina com elevado rendimento."
    },
    "amoxicilina": {
      nome: "Amoxicilina Tri-hidratada",
      reagentes: ["Ácido 6-Aminopenicilânico (6-APA)", "Cloreto de D-p-hidroxifenilglicina protegido"],
      catalisador: "Trietilamina (Et3N) ou Enzima Penicilina Acilase",
      solvente: "Diclorometano aquoso ou tampão fosfato",
      faixaTermica: "0°C a 5°C (química) ou 25°C (enzimática)",
      equacao: "C8H12N2O3S + C8H9NO3 ➔ C16H19N3O5S",
      perigos: "Antibióticos beta-lactâmicos podem provocar choque anafilático em operadores sensibilizados.",
      tipoReacao: "Acilação estereosseletiva do anel beta-lactâmico",
      descricao: "Acilação da amina livre do 6-APA com o derivado ativado da hidroxifenilglicina, mantendo estrito controle de pH (5.5 - 6.5) para evitar abertura do anel beta-lactâmico."
    },
    "omeprazol": {
      nome: "Omeprazol",
      reagentes: ["2-Mercapto-5-metoxibenzimidazol", "2-Clorometil-3,5-dimetil-4-metoxipiridina"],
      catalisador: "Carbonato de Sódio e Ácido m-cloroperbenzóico (mCPBA)",
      solvente: "Diclorometano / Metanol",
      faixaTermica: "-10°C a 0°C (oxidação)",
      equacao: "C17H19N3OS + [O] ➔ C17H19N3O2S",
      perigos: "Agentes oxidantes orgânicos podem se decompor violentamente sob calor.",
      tipoReacao: "Substituição nucleofílica seguida de oxidação quimiosseletiva a sulfóxido",
      descricao: "Condensação do tiol com a piridina clorada formando o tioéter intermediário, seguido de oxidação cuidadosa a sulfóxido com mCPBA a temperaturas sub-zero."
    },
    "diazepam": {
      nome: "Diazepam",
      reagentes: ["2-Metilamino-5-clorobenzofenona", "Cloreto de Cloroacetila", "Amônia"],
      catalisador: "Hidróxido de Sódio / Piridina",
      solvente: "Etanol Absoluto",
      faixaTermica: "60°C a 80°C (4 h)",
      equacao: "C14H12ClNO + C2H2Cl2O + NH3 ➔ C16H13ClN2O",
      perigos: "Substância controlada psicotrópica; cloretos de acila são altamente corrosivos.",
      tipoReacao: "Acilação de amina aromática seguida de amonólise e ciclização intramolecular",
      descricao: "Cloroacetilação da benzofenona com cloreto de cloroacetila, seguida de ciclização em presença de amônia etanólica formando o anel 1,4-benzodiazepínico."
    },
    "clonazepam": {
      nome: "Clonazepam",
      reagentes: ["2-Amino-2'-cloro-5-nitrobenzofenona", "Cloreto de Cloroacetila", "Amônia"],
      catalisador: "Piridina e Base suave",
      solvente: "Etanol",
      faixaTermica: "60°C a 80°C (5 h)",
      equacao: "C13H9ClN2O3 + C2H2Cl2O + NH3 ➔ C15H10ClN3O3",
      perigos: "Composto controlado; risco químico de vapores irritantes durante a acilação.",
      tipoReacao: "Ciclização benzodiazepínica intramolecular",
      descricao: "Síntese do núcleo benzodiazepínico halogenado e nitrado a partir da condensação da cloroacetamida com amônia a quente."
    },
    "fluoxetina": {
      nome: "Cloridrato de Fluoxetina",
      reagentes: ["beta-Dimetilaminopropiofenona", "4-(Trifluorometil)fenol"],
      catalisador: "Boroidreto de Sódio (redução) e Base Forte (KOH)",
      solvente: "Tolueno / Dimetilsulfóxido (DMSO)",
      faixaTermica: "80°C a 100°C (4 h)",
      equacao: "C11H15NO + C7H5F3O ➔ C17H18F3NO",
      perigos: "Fenóis trifluorometilados são tóxicos e corrosivos.",
      tipoReacao: "Redução de cetona a álcool seguida de substituição nucleofílica aromática e N-desmetilação",
      descricao: "Redução da cetona ao álcool correspondente, eterificação com p-trifluorometilfenol e N-desmetilação seletiva via cloroformiato de etila."
    },
    "sertralina": {
      nome: "Cloridrato de Sertralina",
      reagentes: ["4-(3,4-Diclorofenil)-3,4-diidro-1(2H)-naftalenona", "Metilamina gasosa"],
      catalisador: "Tetracloreto de Titânio (TiCl4) e Hidrogênio sobre Pd/C",
      solvente: "Tetraidrofurano / Metanol",
      faixaTermica: "-10°C a 25°C",
      equacao: "C16H12Cl2O + CH3NH2 + H2 ➔ C17H17Cl2N·HCl",
      perigos: "TiCl4 reage violentamente com a umidade do ar liberando fumaça densa de HCl.",
      tipoReacao: "Formação de imina aromática seguida de hidrogenação catalítica cis-seletiva",
      descricao: "Condensação da tetralona com metilamina ativada por TiCl4 gerando a imina, que é hidrogenada cataliticamente para isolamento do diastereoisômero cis desejado."
    },
    "atorvastatina": {
      nome: "Atorvastatina Cálcica",
      reagentes: ["Dicetona fluorada aromática", "Cadeia lateral di-hidroxi-heptanoato quiral"],
      catalisador: "Ácido Piválico",
      solvente: "Tolueno / Heptano",
      faixaTermica: "80°C a 95°C (8 h)",
      equacao: "Intermediário Paal-Knorr ➔ Núcleo Pirrólico Quiral",
      perigos: "Solventes aromáticos inflamáveis.",
      tipoReacao: "Síntese de Paal-Knorr para formação de anel pirrólico pentassubstituído",
      descricao: "Condensação de Paal-Knorr entre 1,4-dicetona e amina quiral protegida, seguida de desproteção dos grupos aceto-hidróxi e salificação com acetato de cálcio."
    },
    "sildenafila": {
      nome: "Citrato de Sildenafila",
      reagentes: ["Ácido 4-Amino-1-metil-3-propilpirazol-5-carboxílico", "Cloreto de 2-Etoxibenzoíla", "Cloreto de 4-Metilpiperazina-1-sulfonila"],
      catalisador: "Base nitrogenada (Et3N) e Ácido Cítrico",
      solvente: "Diclorometano / Acetona",
      faixaTermica: "70°C a 90°C",
      equacao: "Condensação Pirazolopirimidinona + Clorossulfonilação ➔ Citrato",
      perigos: "Cloretos de sulfonila são fortemente corrosivos e tóxicos.",
      tipoReacao: "Ciclização intramolecular a pirazolopirimidinona seguida de sulfonilação",
      descricao: "Acoplamento e condensação formando o núcleo heterocíclico, sulfonilação na posição 5' com piperazina e salificação quantitativa com ácido cítrico."
    }
  },

  // =========================================================================
  // 2. CONSULTA REMOTA DIRETA AO GROQ 120B VIA APPS SCRIPT (CAMADA 3)
  // =========================================================================
  async consultarGroqRemoto(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const gateway = window.APPS_SCRIPT_GATEWAY;
    if (!gateway || gateway.includes('SEU_GATEWAY')) {
      throw new Error('Gateway Apps Script não configurado em window.APPS_SCRIPT_GATEWAY.');
    }

    // Monta o resumo físico-químico rigoroso do vaso da bancada
    const especiesVaso = Array.from(sys.especies.entries())
      .filter(([_, q]) => q > 0.01)
      .map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`)
      .join(', ') || 'Vidraria vazia / apenas solvente base';

    const contextoBancada = `
[ESTADO DA BANCADA NO MOMENTO]:
- Temperatura Atual: ${sys.temp.toFixed(1)} °C
- Pressão Interna: ${sys.pressao.toFixed(2)} atm
- pH Medido: ${calcularpH().toFixed(2)}
- Volume Ocupado: ${sys.vol.toFixed(1)} mL (capacidade: ${sys.maxVol} mL)
- Sistema Físico: ${sys.isClosed ? 'FECHADO COM ROLHA' : 'ABERTO À ATMOSFERA'}
- Agitador Magnético: ${agitadorAtivo ? 'LIGADO' : 'DESLIGADO'}
- Espécies presentes no vaso: [${especiesVaso}]
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
      throw new Error(`Servidor respondeu com status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data || !data.resposta) {
      throw new Error(data?.erro || 'Formato de resposta inválido do cluster Groq.');
    }

    return data.resposta;
  },

  // =========================================================================
  // 3. MOTOR PRINCIPAL DE PROCESSAMENTO (CASCATA COM APRENDIZADO)
  // =========================================================================
  async processarMensagem(msgUsuario, sys, calcularpH, agitadorAtivo) {
    const texto = msgUsuario.toLowerCase().trim();

    // 1. Diagnóstico da Vidraria Atual
    if (texto.includes("o que tem") || texto.includes("acontecendo") || texto.includes("analis") || texto.includes("diagnostico") || texto.includes("status do vaso")) {
      const diag = this.gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo);
      return `
**🔬 Diagnóstico da Vidraria Atual:**
${diag.resumo}

${diag.detalhes}

**⚠️ Avaliação de Risco:** ${diag.alerta}
      `.trim();
    }

    // 2. Predição de Misturas e Riscos Químicos Locais
    if (texto.includes("acontece se") || texto.includes("misturar") || texto.includes("adicionar") || texto.includes("colocar")) {
      if (typeof LAB_DATABASE !== 'undefined' && LAB_DATABASE.species) {
        for (const [reag, info] of Object.entries(LAB_DATABASE.species)) {
          if (texto.includes(reag.toLowerCase()) || texto.includes(info.label.toLowerCase())) {
            return this.predizerMistura(reag, sys);
          }
        }
      }
    }

    // 3. Extração do Termo-Chave de Fármaco/Composto
    const termoComposto = texto
      .replace(/como sintetizar|como fazer|rota de sintese de|sintese de|sintetizar|como preparar|preparo de|reacao de|fazer/gi, '')
      .replace(/[?.,!]/g, '')
      .trim();

    // --- CAMADA 1: Busca na Base Curada Local (0 ms / 0 tokens) ---
    for (const [chave, rota] of Object.entries(this.ROTAS_SINTESE)) {
      if (texto.includes(chave) || (termoComposto && termoComposto.includes(chave))) {
        return `
**🧪 Rota de Síntese Oficial: ${rota.nome}**

**1. Parâmetros Ideais:**
* **Precursores:** ${rota.reagentes.join(' + ')}
* **Catalisador:** ${rota.catalisador}
* **Solvente / Meio:** ${rota.solvente || 'Meio direto'}
* **Faixa Térmica:** ${rota.faixaTermica}
* **Equação Química:** \`${rota.equacao}\`

**2. Mecanismo & Procedimento:**
* **Tipo de Reação:** ${rota.tipoReacao}
* **Modo Operacional:** ${rota.descricao}

**3. Biossegurança e Riscos:**
* **⚠️ Alerta Operacional:** ${rota.perigos}

*(⚡ Resposta entregue instantaneamente da Base Curada LAIFT)*
        `.trim();
      }
    }

    // --- CAMADA 1B: Verificação de Memória de Aprendizado Local (IndexedDB) ---
    if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.obterRotaSinteseLocal === 'function') {
      try {
        const rotaLocal = await LabStorageEngine.obterRotaSinteseLocal(termoComposto || texto);
        if (rotaLocal) {
          return `${rotaLocal}\n\n*(⚡ Resposta recuperada da memória local IndexedDB)*`;
        }
      } catch (e) {
        console.warn('[Preceptor] Falha ao consultar IndexedDB:', e);
      }
    }

    // --- CAMADA 2: Consulta ao Cache Global Compartilhado (Planilha via Apps Script) ---
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
            if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarRotaSinteseLocal === 'function') {
              await LabStorageEngine.salvarRotaSinteseLocal(termoComposto, rotaCurada);
            }
            return `${rotaCurada}\n\n*(🌐 Resposta recuperada do Acervo Global LAIFT)*`;
          }
        }
      } catch (errGlobal) {
        console.warn('[Preceptor] Cache global não respondeu:', errGlobal);
      }
    }

    // --- CAMADA 3: Disparo Cognitivo ao Groq 120B (Inferência Dinâmica) ---
    try {
      const respostaIA = await this.consultarGroqRemoto(msgUsuario, sys, calcularpH, agitadorAtivo);

      // Destilação do aprendizado: salva no IndexedDB e na Planilha para não gastar novos tokens
      if (termoComposto.length >= 3) {
        if (typeof LabStorageEngine !== 'undefined' && typeof LabStorageEngine.salvarRotaSinteseLocal === 'function') {
          await LabStorageEngine.salvarRotaSinteseLocal(termoComposto, respostaIA);
        }
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

      return `${respostaIA}\n\n*(🧠 Resposta gerada dinamicamente pelo Groq LLaMA-3.3 120B & Destilada para o banco)*`;

    } catch (erroGroq) {
      console.error('[Preceptor IA] Falha no cluster Groq:', erroGroq);
      
      // Diagnóstico transparente
      return `
⚠️ **Não foi possível conectar ao cluster Groq 120B no momento.**
*Motivo técnico:* \`${erroGroq.message || erroGroq}\`

**Condições Atuais da Bancada:**
* **Temperatura:** ${sys.temp.toFixed(1)} °C | **pH:** ${calcularpH().toFixed(2)} | **Volume:** ${sys.vol.toFixed(1)} mL
* **Agitador:** ${agitadorAtivo ? 'Ligado' : 'Parado'} | **Sistema:** ${sys.isClosed ? 'Fechado com rolha' : 'Aberto'}

*Dica:* Para testar sínteses instantâneas com 0 tokens, pergunte sobre: **Dipirona**, **Aspirina**, **Paracetamol**, **Ibuprofeno**, **Diclofenaco**, **Losartana**, **Amoxicilina** ou **Omeprazol**.
      `.trim();
    }
  },

  // Diagnóstico do vaso
  gerarDiagnosticoVaso(sys, calcularpH, agitadorAtivo) {
    const ph = calcularpH();
    const temp = sys.temp;
    const vol = sys.vol;
    const especies = Array.from(sys.especies.entries()).filter(([_, q]) => q > 0.05);

    if (vol === 0 && especies.length === 0) {
      return {
        resumo: "A vidraria está limpa e vazia.",
        detalhes: "Adicione um precursor pelo catálogo para iniciar a mistura.",
        alerta: "Nenhum risco detectado."
      };
    }

    const caracteristicaPH = ph < 3 ? "Fortemente Ácida" : ph < 6.5 ? "Levemente Ácida" : ph <= 7.5 ? "Neutra" : ph < 11 ? "Levemente Básica" : "Fortemente Alcalina";
    const estadoTermico = temp < 10 ? "Resfriada (Gelo)" : temp <= 35 ? "Ambiente" : temp < 70 ? "Aquecimento Moderado" : "Alta Temperatura";
    const especiesNomes = especies.map(([esp, q]) => `${esp.replace(/_s|_g|_l|_aq/g, '')} (${q.toFixed(1)} mmol)`).join(', ');

    return {
      resumo: `Vaso com **${vol.toFixed(1)} mL** a **${temp.toFixed(1)}°C** (${estadoTermico}). Solução **${caracteristicaPH}** (pH ${ph.toFixed(2)}).`,
      detalhes: `**Espécies no vaso:** ${especiesNomes || "Apenas solvente base"}. Agitador: **${agitadorAtivo ? "Ativo" : "Desligado"}**. Sistema: **${sys.isClosed ? "Fechado" : "Aberto"}**.`,
      alerta: sys.pressao > 2.0 ? `Pressão elevada (${sys.pressao.toFixed(2)} atm)! Risco de sobrepressão.` : "Parâmetros físicos controlados."
    };
  },

  // Predição de reatividade
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
// 4. UTILITÁRIOS GLOBAIS DO CHAT
// =========================================================================
window.limparChatPreceptor = function() {
  const chatBox = document.getElementById('labChatMessages');
  if (!chatBox) return;

  chatBox.innerHTML = `
    <div class="lab-chat-msg msg-preceptor">
      Bancada conectada ao <strong>Preceptor Virtual LAIFT</strong> (Cluster Groq 120B com auto-aprendizado). Como posso orientar sua síntese ou análise?
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

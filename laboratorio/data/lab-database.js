/**
 * BASE DE DADOS CIENTÍFICA DO LABORATÓRIO VIRTUAL LAIFT
 * Consolidação das espécies moleculares, regras de reações e roteiros de bancada.
 */

const LAB_DATABASE = {
  // 1. ESPÉCIES MOLECULARES E IÔNICAS
  species: {
    "H2O_l": { label: "Água", phase: "l", molarMass: 18.015, density: 1.0, bp: 100, fp: 0 },
    "Etanol_l": { label: "Etanol Absoluto", phase: "l", molarMass: 46.07, density: 0.789, bp: 78.4, fp: -114 },
    "Acetona_l": { label: "Acetona", phase: "l", molarMass: 58.08, density: 0.784, bp: 56.0, fp: -95 },
    "Hexano_l": { label: "Hexano", phase: "l", molarMass: 86.18, density: 0.655, bp: 68.7, fp: -95 },
    "Benzeno_l": { label: "Benzeno", phase: "l", molarMass: 78.11, density: 0.876, bp: 80.1, fp: 5.5 },
    "Tolueno_l": { label: "Tolueno", phase: "l", molarMass: 92.14, density: 0.867, bp: 110.6, fp: -95 },
    "Metanol_l": { label: "Metanol", phase: "l", molarMass: 32.04, density: 0.792, bp: 64.7, fp: -98 },
    "Cloroformio_l": { label: "Clorofórmio", phase: "l", molarMass: 119.38, density: 1.489, bp: 61.2, fp: -63.5 },

    // Ácidos e Bases em Solução com Dissociação Direta
    "HCl_aq": { label: "Ácido Clorídrico", phase: "aq", conc: 6.0, molarMass: 36.46, dissociation: [["H+", 1], ["Cl-", 1]] },
    "H2SO4_aq": { label: "Ácido Sulfúrico", phase: "aq", conc: 9.0, molarMass: 98.08, dissociation: [["H+", 2], ["SO4_2-", 1]] },
    "HNO3_aq": { label: "Ácido Nítrico", phase: "aq", conc: 6.0, molarMass: 63.01, dissociation: [["H+", 1], ["NO3-", 1]] },
    "HClO4_aq": { label: "Ácido Perclórico", phase: "aq", conc: 6.0, molarMass: 100.46, dissociation: [["H+", 1], ["ClO4-", 1]] },
    "H3PO4_aq": { label: "Ácido Fosfórico", phase: "aq", conc: 4.0, molarMass: 97.99, dissociation: [["H+", 3], ["PO4_3-", 1]] },
    "AcidoAcetico_aq": { label: "Ácido Acético", phase: "aq", conc: 1.0, molarMass: 60.05, dissociation: [["H+", 0.1], ["CH3COO-", 0.1]] },
    "NaOH_aq": { label: "Hidróxido de Sódio", phase: "aq", conc: 6.0, molarMass: 40.0, dissociation: [["Na+", 1], ["OH-", 1]] },
    "KOH_aq": { label: "Hidróxido de Potássio", phase: "aq", conc: 6.0, molarMass: 56.11, dissociation: [["K+", 1], ["OH-", 1]] },
    "LiOH_aq": { label: "Hidróxido de Lítio", phase: "aq", conc: 5.0, molarMass: 23.95, dissociation: [["Li+", 1], ["OH-", 1]] },
    "NH3_aq": { label: "Amônia em Solução", phase: "aq", conc: 5.0, molarMass: 17.03, dissociation: [["NH4+", 0.1], ["OH-", 0.1]] },
    "CaOH2_aq": { label: "Água de Cal", phase: "aq", conc: 0.5, molarMass: 74.09, dissociation: [["Ca2+", 1], ["OH-", 2]] },
    "NaClO_aq": { label: "Hipoclorito de Sódio", phase: "aq", conc: 2.0, molarMass: 74.44, dissociation: [["Na+", 1], ["ClO-", 1]] },

    // Sais e Metais em Solução
    "NaCl_aq": { label: "Cloreto de Sódio Sol.", phase: "aq", conc: 1.0, molarMass: 58.44, dissociation: [["Na+", 1], ["Cl-", 1]] },
    "NaHCO3_aq": { label: "Bicarbonato de Sódio Sol.", phase: "aq", conc: 1.0, molarMass: 84.01, dissociation: [["Na+", 1], ["HCO3-", 1]] },
    "Na2CO3_aq": { label: "Carbonato de Sódio Sol.", phase: "aq", conc: 1.0, molarMass: 105.99, dissociation: [["Na+", 2], ["CO3_2-", 1]] },
    "K2CO3_aq": { label: "Carbonato de Potássio Sol.", phase: "aq", conc: 1.0, molarMass: 138.21, dissociation: [["K+", 2], ["CO3_2-", 1]] },
    "KI_aq": { label: "Iodeto de Potássio", phase: "aq", conc: 1.0, molarMass: 166.0, dissociation: [["K+", 1], ["I-", 1]] },
    "NH42S_aq": { label: "Sulfeto de Amônio", phase: "aq", conc: 1.0, molarMass: 68.15, dissociation: [["NH4+", 2], ["S_2-", 1]] },
    "AgNO3_aq": { label: "Nitrato de Prata", phase: "aq", conc: 1.0, molarMass: 169.87, dissociation: [["Ag+", 1], ["NO3-", 1]] },
    "PbNO3_aq": { label: "Nitrato de Chumbo II", phase: "aq", conc: 1.0, molarMass: 331.2, dissociation: [["Pb2+", 1], ["NO3-", 2]] },
    "CuSO4_aq": { label: "Sulfato de Cobre II", phase: "aq", conc: 1.0, molarMass: 159.61, dissociation: [["Cu2+", 1], ["SO4_2-", 1]] },
    "FeCl3_aq": { label: "Cloreto de Ferro III", phase: "aq", conc: 1.0, molarMass: 162.2, dissociation: [["Fe3+", 1], ["Cl-", 3]] },
    "ZnSO4_aq": { label: "Sulfato de Zinco", phase: "aq", conc: 1.0, molarMass: 161.47, dissociation: [["Zn2+", 1], ["SO4_2-", 1]] },
    "NiCl2_aq": { label: "Cloreto de Níquel II", phase: "aq", conc: 1.0, molarMass: 129.6, dissociation: [["Ni2+", 1], ["Cl-", 2]] },
    "BaCl2_aq": { label: "Cloreto de Bário", phase: "aq", conc: 1.0, molarMass: 208.23, dissociation: [["Ba2+", 1], ["Cl-", 2]] },
    "CaCl2_aq": { label: "Cloreto de Cálcio", phase: "aq", conc: 1.0, molarMass: 110.98, dissociation: [["Ca2+", 1], ["Cl-", 2]] },
    "H2O2_aq": { label: "Peróxido de Hidrogênio Sol.", phase: "aq", conc: 3.0, molarMass: 34.01, dissociation: [["H2O2", 1]] },

    // Metais Sólidos
    "Zn_s": { label: "Zinco Metálico", phase: "s", molarMass: 65.38 },
    "Mg_s": { label: "Magnésio Metálico", phase: "s", molarMass: 24.31 },
    "Al_s": { label: "Alumínio Metálico", phase: "s", molarMass: 26.98 },
    "Fe_s": { label: "Ferro Metálico", phase: "s", molarMass: 55.85 },
    "Cu_s": { label: "Cobre Metálico", phase: "s", molarMass: 63.55 },
    "Na_s": { label: "Sódio Metálico", phase: "s", molarMass: 22.99 },
    "K_s": { label: "Potássio Metálico", phase: "s", molarMass: 39.10 },
    "Ca_s": { label: "Cálcio Metálico", phase: "s", molarMass: 40.08 },
    "Pb_s": { label: "Chumbo Metálico", phase: "s", molarMass: 207.2 },

    // Gases Gerados
    "H2_g": { label: "Gás Hidrogênio", phase: "g", molarMass: 2.016 },
    "CO2_g": { label: "Dióxido de Carbono", phase: "g", molarMass: 44.01 },
    "Cl2_g": { label: "Gás Cloro (Tóxico)", phase: "g", molarMass: 70.90 },
    "O2_g": { label: "Gás Oxigênio", phase: "g", molarMass: 32.0 },

    // Precipitados Insolúveis
    "AgCl_s": { label: "Cloreto de Prata", phase: "s", molarMass: 143.32, color: "#f5f5f5", pubchemName: "Silver chloride" },
    "PbI2_s": { label: "Iodeto de Chumbo II", phase: "s", molarMass: 461.01, color: "#ffeb3b", pubchemName: "Lead(II) iodide" },
    "Cu(OH)2_s": { label: "Hidróxido de Cobre II", phase: "s", molarMass: 97.56, color: "#4dd0e1", pubchemName: "Copper(II) hydroxide" },
    "Fe(OH)3_s": { label: "Hidróxido de Ferro III", phase: "s", molarMass: 106.87, color: "#8d6e63", pubchemName: "Iron(III) hydroxide" },
    "BaSO4_s": { label: "Sulfato de Bário", phase: "s", molarMass: 233.39, color: "#ffffff", pubchemName: "Barium sulfate" },
    "CaCO3_s": { label: "Carbonato de Cálcio", phase: "s", molarMass: 100.09, color: "#fafafa", pubchemName: "Calcium carbonate" }
  },

  // 2. REGRAS DECLARATIVAS DE REAÇÃO (Estequiometria, Balanço e Fenômenos)
  reactions: [
    {
      id: "neutralizacao_hcl_naoh",
      type: "acid_base",
      reactants: ["H+", "OH-"],
      stoichiometry: { "H+": 1, "OH-": 1 },
      products: [{ species: "H2O_l", coef: 1 }],
      exothermicDeltaT: 0.05,
      description: "Neutralização ácido-base com formação de água."
    },
    {
      id: "precipitacao_agcl",
      type: "precipitation",
      reactants: ["Ag+", "Cl-"],
      stoichiometry: { "Ag+": 1, "Cl-": 1 },
      products: [{ species: "AgCl_s", coef: 1 }],
      color: "#f5f5f5",
      pubchemQuery: "Silver chloride",
      description: "Precipitação de cloreto de prata insolúvel."
    },
    {
      id: "precipitacao_pbi2",
      type: "precipitation",
      reactants: ["Pb2+", "I-"],
      stoichiometry: { "Pb2+": 1, "I-": 2 },
      products: [{ species: "PbI2_s", coef: 1 }],
      color: "#ffeb3b",
      pubchemQuery: "Lead(II) iodide",
      description: "Chuva de Ouro: formação de iodeto de chumbo amarelo."
    },
    {
      id: "precipitacao_cu_oh2",
      type: "precipitation",
      reactants: ["Cu2+", "OH-"],
      stoichiometry: { "Cu2+": 1, "OH-": 2 },
      products: [{ species: "Cu(OH)2_s", coef: 1 }],
      color: "#4dd0e1",
      pubchemQuery: "Copper(II) hydroxide",
      description: "Formação de hidróxido de cobre II gelatinoso azul."
    },
    {
      id: "precipitacao_baso4",
      type: "precipitation",
      reactants: ["Ba2+", "SO4_2-"],
      stoichiometry: { "Ba2+": 1, "SO4_2-": 1 },
      products: [{ species: "BaSO4_s", coef: 1 }],
      color: "#ffffff",
      pubchemQuery: "Barium sulfate",
      description: "Precipitação densa de sulfato de bário."
    },
    {
      id: "redox_zn_hcl",
      type: "gas_evolution",
      reactants: ["Zn_s", "H+"],
      stoichiometry: { "Zn_s": 1, "H+": 2 },
      products: [{ species: "Zn2+", coef: 1 }, { species: "H2_g", coef: 1 }],
      exothermicDeltaT: 2.0,
      description: "Corrosão de zinco por ácido forte com liberação de H₂."
    },
    {
      id: "gas_bicarbonato_acido",
      type: "gas_evolution",
      reactants: ["HCO3-", "H+"],
      stoichiometry: { "HCO3-": 1, "H+": 1 },
      products: [{ species: "H2O_l", coef: 1 }, { species: "CO2_g", coef: 1 }],
      description: "Efervescência de dióxido de carbono por acidificação de bicarbonato."
    },
    {
      id: "gas_cloro_hipoclorito",
      type: "toxic_gas",
      reactants: ["ClO-", "Cl-", "H+"],
      stoichiometry: { "ClO-": 1, "Cl-": 1, "H+": 2 },
      products: [{ species: "H2O_l", coef: 1 }, { species: "Cl2_g", coef: 1 }],
      description: "Liberação perigosa de gás cloro (Cl₂) em meio acidificado."
    }
  ],

  // 3. ROTEIROS DE BANCADA E PRÁTICAS EXPERIMENTAIS
  scenarios: [
    {
      name: "Titulação Ácido-Base Clássica",
      initialLoad: { reagent: "HCl_aq", volume: 20 },
      titrant: "NaOH_aq",
      expectedPhenomenon: "Neutralização em pH 7.0 com aquecimento sutil."
    },
    {
      name: "Síntese da Chuva de Ouro",
      initialLoad: { reagent: "PbNO3_aq", volume: 15 },
      titrant: "KI_aq",
      expectedPhenomenon: "Precipitação amarela cristalina de PbI₂."
    },
    {
      name: "Ataque Ácido a Metal Anfótero",
      initialLoad: { reagent: "HCl_aq", volume: 25 },
      titrant: "Zn_s",
      expectedPhenomenon: "Efervescência vigorosa de gás H₂ inflamável."
    }
  ]
};

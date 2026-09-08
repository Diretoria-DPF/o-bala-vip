/**
 * REPOSITÓRIO CIENTÍFICO E FARMACOTÉCNICO DA BANCADA (LAIFT)
 * Base de espécies físico-químicas, precursores de síntese e reações mapeadas.
 */

const LAB_DATABASE = {
  // 1. ESPÉCIES MOLECULARES, PRECURSORES E SOLVENTES
  species: {
    // Solventes e Veículos
    "H2O_l": { label: "Água Destilada", phase: "l", molarMass: 18.015, density: 1.0, bp: 100, fp: 0, smiles: "O", iupac: "oxidane" },
    "Etanol_l": { label: "Etanol Absoluto", phase: "l", molarMass: 46.07, density: 0.789, bp: 78.4, fp: -114, smiles: "CCO", iupac: "ethanol" },
    "Acetona_l": { label: "Acetona Pura", phase: "l", molarMass: 58.08, density: 0.784, bp: 56.0, fp: -95, smiles: "CC(=O)C", iupac: "propan-2-one" },
    "Hexano_l": { label: "Hexano", phase: "l", molarMass: 86.18, density: 0.655, bp: 68.7, fp: -95, smiles: "CCCCCC", iupac: "hexane" },
    "Cloroformio_l": { label: "Clorofórmio", phase: "l", molarMass: 119.38, density: 1.489, bp: 61.2, fp: -63.5, smiles: "ClC(Cl)Cl", iupac: "trichloromethane" },
    "Metanol_l": { label: "Metanol", phase: "l", molarMass: 32.04, density: 0.792, bp: 64.7, fp: -98, smiles: "CO", iupac: "methanol" },
    "AlcoolIsopentilico_l": { label: "Álcool Isopentílico", phase: "l", molarMass: 88.15, density: 0.81, bp: 131.1, fp: -117, smiles: "CC(C)CCO", iupac: "3-methylbutan-1-ol" },

    // Precursores de Síntese Farmacêutica & Reagentes Orgânicos
    "AcidoSalicilico_s": { label: "Ácido Salicílico", phase: "s", molarMass: 138.12, smiles: "C1=CC=C(C(=C1)C(=O)O)O", iupac: "2-hydroxybenzoic acid", pubchemQuery: "Salicylic acid" },
    "AnidridoAcetico_l": { label: "Anidrido Acético", phase: "l", molarMass: 102.09, density: 1.08, bp: 139.8, smiles: "CC(=O)OC(=O)C", iupac: "acetyl acetate", pubchemQuery: "Acetic anhydride" },
    "pAminofenol_s": { label: "4-Aminofenol", phase: "s", molarMass: 109.13, smiles: "C1=CC(=CC=C1N)O", iupac: "4-aminophenol", pubchemQuery: "4-Aminophenol" },
    "AcidoAcetico_aq": { label: "Ácido Acético Glacial", phase: "aq", conc: 1.0, molarMass: 60.05, smiles: "CC(=O)O", iupac: "acetic acid", dissociation: [["H+", 0.1], ["CH3COO-", 0.1]] },
    "Anilina_l": { label: "Anilina", phase: "l", molarMass: 93.13, density: 1.02, bp: 184.1, smiles: "C1=CC=C(C=C1)N", iupac: "aniline", pubchemQuery: "Aniline" },
    "AcidoBenzoico_s": { label: "Ácido Benzóico", phase: "s", molarMass: 122.12, smiles: "C1=CC=C(C=C1)C(=O)O", iupac: "benzoic acid", pubchemQuery: "Benzoic acid" },

    // Ácidos e Bases Fortes (Catalisadores e Reagentes)
    "HCl_aq": { label: "Ácido Clorídrico (6M)", phase: "aq", conc: 6.0, molarMass: 36.46, dissociation: [["H+", 1], ["Cl-", 1]] },
    "H2SO4_aq": { label: "Ácido Sulfúrico Concentrado", phase: "aq", conc: 9.0, molarMass: 98.08, dissociation: [["H+", 2], ["SO4_2-", 1]] },
    "HNO3_aq": { label: "Ácido Nítrico (6M)", phase: "aq", conc: 6.0, molarMass: 63.01, dissociation: [["H+", 1], ["NO3-", 1]] },
    "NaOH_aq": { label: "Hidróxido de Sódio (6M)", phase: "aq", conc: 6.0, molarMass: 40.0, dissociation: [["Na+", 1], ["OH-", 1]] },
    "KOH_aq": { label: "Hidróxido de Potássio (6M)", phase: "aq", conc: 6.0, molarMass: 56.11, dissociation: [["K+", 1], ["OH-", 1]] },
    "NH3_aq": { label: "Amônia em Solução (5M)", phase: "aq", conc: 5.0, molarMass: 17.03, dissociation: [["NH4+", 0.1], ["OH-", 0.1]] },
    "NaHCO3_aq": { label: "Bicarbonato de Sódio", phase: "aq", conc: 1.0, molarMass: 84.01, dissociation: [["Na+", 1], ["HCO3-", 1]] },
    "Na2CO3_aq": { label: "Carbonato de Sódio", phase: "aq", conc: 1.0, molarMass: 105.99, dissociation: [["Na+", 2], ["CO3_2-", 1]] },
    "NaClO_aq": { label: "Hipoclorito de Sódio", phase: "aq", conc: 2.0, molarMass: 74.44, dissociation: [["Na+", 1], ["ClO-", 1]] },

    // Sais e Reagentes Metálicos
    "NaCl_s": { label: "Cloreto de Sódio", phase: "s", molarMass: 58.44 },
    "KI_aq": { label: "Iodeto de Potássio", phase: "aq", conc: 1.0, molarMass: 166.0, dissociation: [["K+", 1], ["I-", 1]] },
    "AgNO3_aq": { label: "Nitrato de Prata", phase: "aq", conc: 1.0, molarMass: 169.87, dissociation: [["Ag+", 1], ["NO3-", 1]] },
    "PbNO3_aq": { label: "Nitrato de Chumbo II", phase: "aq", conc: 1.0, molarMass: 331.2, dissociation: [["Pb2+", 1], ["NO3-", 2]] },
    "CuSO4_aq": { label: "Sulfato de Cobre II", phase: "aq", conc: 1.0, molarMass: 159.61, dissociation: [["Cu2+", 1], ["SO4_2-", 1]] },
    "FeCl3_aq": { label: "Cloreto de Ferro III", phase: "aq", conc: 1.0, molarMass: 162.2, dissociation: [["Fe3+", 1], ["Cl-", 3]] },
    "BaCl2_aq": { label: "Cloreto de Bário", phase: "aq", conc: 1.0, molarMass: 208.23, dissociation: [["Ba2+", 1], ["Cl-", 2]] },
    "CoCl2_aq": { label: "Cloreto de Cobalto II", phase: "aq", conc: 1.0, molarMass: 129.84, dissociation: [["Co2+", 1], ["Cl-", 2]] },
    "H2O2_aq": { label: "Peróxido de Hidrogênio", phase: "aq", conc: 3.0, molarMass: 34.01, dissociation: [["H2O2", 1]] },

    // Metais Sólidos
    "Zn_s": { label: "Zinco Metálico", phase: "s", molarMass: 65.38 },
    "Mg_s": { label: "Magnésio Metálico", phase: "s", molarMass: 24.31 },
    "Al_s": { label: "Alumínio Metálico", phase: "s", molarMass: 26.98 },
    "Na_s": { label: "Sódio Metálico", phase: "s", molarMass: 22.99 },
    "Ca_s": { label: "Cálcio Metálico", phase: "s", molarMass: 40.08 },

    // Produtos e Fármacos Sintetizados
    "AAS_s": {
      label: "Ácido Acetilsalicílico (Aspirina)",
      phase: "s",
      molarMass: 180.16,
      formula: "C9H8O4",
      smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
      iupac: "2-acetyloxybenzoic acid",
      pubchemQuery: "Aspirin"
    },
    "Paracetamol_s": {
      label: "Paracetamol (Acetaminofeno)",
      phase: "s",
      molarMass: 151.16,
      formula: "C8H9NO2",
      smiles: "CC(=O)NC1=CC=C(O)C=C1",
      iupac: "N-(4-hydroxyphenyl)acetamide",
      pubchemQuery: "Acetaminophen"
    },
    "SalicilatoMetila_l": {
      label: "Salicilato de Metila",
      phase: "l",
      molarMass: 152.15,
      formula: "C8H8O3",
      smiles: "COC(=O)C1=CC=CC=C1O",
      iupac: "methyl 2-hydroxybenzoate",
      pubchemQuery: "Methyl salicylate"
    },
    "Acetanilida_s": {
      label: "Acetanilida",
      phase: "s",
      molarMass: 135.17,
      formula: "C8H9NO",
      smiles: "CC(=O)NC1=CC=CC=C1",
      iupac: "N-phenylacetamide",
      pubchemQuery: "Acetanilide"
    },
    "AcetatoIsopentila_l": {
      label: "Acetato de Isopentila (Aroma Banana)",
      phase: "l",
      molarMass: 130.18,
      formula: "C7H14O2",
      smiles: "CC(=O)OCCC(C)C",
      iupac: "3-methylbutyl acetate",
      pubchemQuery: "Isoamyl acetate"
    },
    "BenzoatoMetila_l": {
      label: "Benzoato de Metila",
      phase: "l",
      molarMass: 136.15,
      formula: "C8H8O2",
      smiles: "COC(=O)C1=CC=CC=C1",
      iupac: "methyl benzoate",
      pubchemQuery: "Methyl benzoate"
    }
  },

  // 2. REGRAS DE SÍNTESE, CINÉTICA E CONDIÇÕES DE REAÇÃO
  reactions: [
    // SÍNTESE DA ASPIRINA (AAS)
    {
      id: "sintese_aspirina",
      nomeComposto: "Ácido Acetilsalicílico",
      produtoId: "AAS_s",
      reagentesObrigatorios: ["AcidoSalicilico_s", "AnidridoAcetico_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 60,
      precisaAgitador: true,
      corPrecipitado: "#ffffff",
      descricao: "Acetilação do Ácido Salicílico catalisada por ácido sulfúrico formando cristais de Aspirina."
    },
    // SÍNTESE DO PARACETAMOL
    {
      id: "sintese_paracetamol",
      nomeComposto: "Paracetamol",
      produtoId: "Paracetamol_s",
      reagentesObrigatorios: ["pAminofenol_s", "AnidridoAcetico_l"],
      catalisador: null,
      tempMinima: 55,
      precisaAgitador: true,
      corPrecipitado: "#f8fafc",
      descricao: "Acetilação da amina do 4-aminofenol com anidrido acético gerando Paracetamol."
    },
    // SÍNTESE DO SALICILATO DE METILA (ÓLEO DE WINTERGREEN)
    {
      id: "sintese_salicilato_metila",
      nomeComposto: "Salicilato de Metila",
      produtoId: "SalicilatoMetila_l",
      reagentesObrigatorios: ["AcidoSalicilico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 65,
      precisaAgitador: false,
      corLiquido: "rgba(254, 240, 138, 0.4)",
      descricao: "Esterificação de Fischer: síntese do éster aromático salicilato de metila."
    },
    // SÍNTESE DE ACETANILIDA
    {
      id: "sintese_acetanilida",
      nomeComposto: "Acetanilida",
      produtoId: "Acetanilida_s",
      reagentesObrigatorios: ["Anilina_l", "AnidridoAcetico_l"],
      catalisador: null,
      tempMinima: 20,
      precisaAgitador: true,
      corPrecipitado: "#ffffff",
      descricao: "Acetilação da anilina formando lâminas cristalinas de acetanilida."
    },
    // SÍNTESE DO ÉSTER DE ISOPENTILA (AROMA DE BANANA)
    {
      id: "sintese_aroma_banana",
      nomeComposto: "Acetato de Isopentila",
      produtoId: "AcetatoIsopentila_l",
      reagentesObrigatorios: ["AcidoAcetico_aq", "AlcoolIsopentilico_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 70,
      precisaAgitador: false,
      corLiquido: "rgba(253, 224, 71, 0.3)",
      descricao: "Esterificação produzindo éster com aroma característico de banana."
    },
    // SÍNTESE DO BENZOATO DE METILA
    {
      id: "sintese_benzoato_metila",
      nomeComposto: "Benzoato de Metila",
      produtoId: "BenzoatoMetila_l",
      reagentesObrigatorios: ["AcidoBenzoico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 65,
      precisaAgitador: false,
      corLiquido: "rgba(241, 245, 249, 0.3)",
      descricao: "Esterificação de Fischer produzindo benzoato de metila."
    }
  ]
};

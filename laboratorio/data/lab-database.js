/**
 * REPOSITÓRIO CIENTÍFICO E FARMACOTÉCNICO DA BANCADA (LAIFT)
 * Base de espécies físico-químicas, precursores de síntese, constantes termodinâmicas e reações.
 */

const LAB_DATABASE = {
  // =========================================================================
  // 1. ESPÉCIES MOLECULARES, PRECURSORES, SOLVENTES E REAGENTES DA BANCADA
  // =========================================================================
  species: {
    // ---------------------------------------------------------
    // Solventes e Veículos
    // ---------------------------------------------------------
    "H2O_l": {
      label: "Água Destilada",
      phase: "l",
      molarMass: 18.015,
      density: 1.0,
      bp: 100,
      fp: 0,
      smiles: "O",
      iupac: "oxidane",
      pubchemQuery: "Water",
      cid: 962
    },
    "Etanol_l": {
      label: "Etanol Absoluto",
      phase: "l",
      molarMass: 46.07,
      density: 0.789,
      bp: 78.4,
      fp: -114,
      smiles: "CCO",
      iupac: "ethanol",
      pubchemQuery: "Ethanol",
      cid: 702
    },
    "Acetona_l": {
      label: "Acetona Pura",
      phase: "l",
      molarMass: 58.08,
      density: 0.784,
      bp: 56.0,
      fp: -95,
      smiles: "CC(=O)C",
      iupac: "propan-2-one",
      pubchemQuery: "Acetone",
      cid: 180
    },
    "Metanol_l": {
      label: "Metanol",
      phase: "l",
      molarMass: 32.04,
      density: 0.792,
      bp: 64.7,
      fp: -98,
      smiles: "CO",
      iupac: "methanol",
      pubchemQuery: "Methanol",
      cid: 887
    },
    "Hexano_l": {
      label: "Hexano",
      phase: "l",
      molarMass: 86.18,
      density: 0.655,
      bp: 68.7,
      fp: -95,
      smiles: "CCCCCC",
      iupac: "hexane",
      pubchemQuery: "Hexane",
      cid: 8058
    },
    "Benzeno_l": {
      label: "Benzeno",
      phase: "l",
      molarMass: 78.11,
      density: 0.876,
      bp: 80.1,
      fp: 5.5,
      smiles: "C1=CC=CC=C1",
      iupac: "benzene",
      pubchemQuery: "Benzene",
      cid: 241
    },
    "Tolueno_l": {
      label: "Tolueno",
      phase: "l",
      molarMass: 92.14,
      density: 0.867,
      bp: 110.6,
      fp: -95,
      smiles: "CC1=CC=CC=C1",
      iupac: "methylbenzene",
      pubchemQuery: "Toluene",
      cid: 1140
    },
    "Cloroformio_l": {
      label: "Clorofórmio",
      phase: "l",
      molarMass: 119.38,
      density: 1.489,
      bp: 61.2,
      fp: -63.5,
      smiles: "ClC(Cl)Cl",
      iupac: "trichloromethane",
      pubchemQuery: "Chloroform",
      cid: 6212
    },
    "AlcoolIsopentilico_l": {
      label: "Álcool Isopentílico",
      phase: "l",
      molarMass: 88.15,
      density: 0.81,
      bp: 131.1,
      fp: -117,
      smiles: "CC(C)CCO",
      iupac: "3-methylbutan-1-ol",
      pubchemQuery: "Isoamyl alcohol",
      cid: 31260
    },

    // ---------------------------------------------------------
    // Precursores de Síntese Farmacêutica & Orgânicos
    // ---------------------------------------------------------
    "AcidoSalicilico_s": {
      label: "Ácido Salicílico",
      phase: "s",
      molarMass: 138.12,
      formula: "C7H6O3",
      smiles: "C1=CC=C(C(=C1)C(=O)O)O",
      iupac: "2-hydroxybenzoic acid",
      pubchemQuery: "Salicylic acid",
      cid: 338,
      chebiId: "CHEBI:16914",
      papelBiologico: "Precursor de salicilatos e queratolítico tópico."
    },
    "AnidridoAcetico_l": {
      label: "Anidrido Acético",
      phase: "l",
      molarMass: 102.09,
      density: 1.08,
      bp: 139.8,
      fp: -73,
      smiles: "CC(=O)OC(=O)C",
      iupac: "acetyl acetate",
      pubchemQuery: "Acetic anhydride",
      cid: 7918
    },
    "pAminofenol_s": {
      label: "4-Aminofenol",
      phase: "s",
      molarMass: 109.13,
      formula: "C6H7NO",
      smiles: "C1=CC(=CC=C1N)O",
      iupac: "4-aminophenol",
      pubchemQuery: "4-Aminophenol",
      cid: 403,
      chebiId: "CHEBI:28566"
    },
    "AcidoAcetico_aq": {
      label: "Ácido Acético (1M)",
      phase: "aq",
      conc: 1.0,
      molarMass: 60.05,
      smiles: "CC(=O)O",
      iupac: "acetic acid",
      pubchemQuery: "Acetic acid",
      cid: 176,
      dissociation: [["H+", 0.1], ["CH3COO-", 0.1]]
    },
    "Anilina_l": {
      label: "Anilina",
      phase: "l",
      molarMass: 93.13,
      density: 1.02,
      bp: 184.1,
      fp: -6,
      smiles: "C1=CC=C(C=C1)N",
      iupac: "aniline",
      pubchemQuery: "Aniline",
      cid: 6115
    },
    "AcidoBenzoico_s": {
      label: "Ácido Benzóico",
      phase: "s",
      molarMass: 122.12,
      formula: "C7H6O2",
      smiles: "C1=CC=C(C=C1)C(=O)O",
      iupac: "benzoic acid",
      pubchemQuery: "Benzoic acid",
      cid: 243
    },

    // ---------------------------------------------------------
    // Ácidos e Bases
    // ---------------------------------------------------------
    "HCl_aq": {
      label: "Ácido Clorídrico (6M)",
      phase: "aq",
      conc: 6.0,
      molarMass: 36.46,
      dissociation: [["H+", 1], ["Cl-", 1]]
    },
    "H2SO4_aq": {
      label: "Ácido Sulfúrico Concentrado (9M)",
      phase: "aq",
      conc: 9.0,
      molarMass: 98.08,
      dissociation: [["H+", 2], ["SO4_2-", 1]]
    },
    "HNO3_aq": {
      label: "Ácido Nítrico (6M)",
      phase: "aq",
      conc: 6.0,
      molarMass: 63.01,
      dissociation: [["H+", 1], ["NO3-", 1]]
    },
    "HClO4_aq": {
      label: "Ácido Perclórico (6M)",
      phase: "aq",
      conc: 6.0,
      molarMass: 100.46,
      dissociation: [["H+", 1], ["ClO4-", 1]]
    },
    "H3PO4_aq": {
      label: "Ácido Fosfórico (4M)",
      phase: "aq",
      conc: 4.0,
      molarMass: 98.00,
      dissociation: [["H+", 3], ["PO4_3-", 1]]
    },
    "NaOH_aq": {
      label: "Hidróxido de Sódio (6M)",
      phase: "aq",
      conc: 6.0,
      molarMass: 40.0,
      dissociation: [["Na+", 1], ["OH-", 1]]
    },
    "KOH_aq": {
      label: "Hidróxido de Potássio (6M)",
      phase: "aq",
      conc: 6.0,
      molarMass: 56.11,
      dissociation: [["K+", 1], ["OH-", 1]]
    },
    "LiOH_aq": {
      label: "Hidróxido de Lítio (5M)",
      phase: "aq",
      conc: 5.0,
      molarMass: 23.95,
      dissociation: [["Li+", 1], ["OH-", 1]]
    },
    "CaOH2_aq": {
      label: "Água de Cal / Hidróxido de Cálcio (0.5M)",
      phase: "aq",
      conc: 0.5,
      molarMass: 74.09,
      dissociation: [["Ca2+", 1], ["OH-", 2]]
    },
    "NH3_aq": {
      label: "Amônia em Solução (5M)",
      phase: "aq",
      conc: 5.0,
      molarMass: 17.03,
      dissociation: [["NH4+", 0.1], ["OH-", 0.1]]
    },
    "NaHCO3_aq": {
      label: "Bicarbonato de Sódio (1M)",
      phase: "aq",
      conc: 1.0,
      molarMass: 84.01,
      dissociation: [["Na+", 1], ["HCO3-", 1]]
    },
    "Na2CO3_aq": {
      label: "Carbonato de Sódio (1M)",
      phase: "aq",
      conc: 1.0,
      molarMass: 105.99,
      dissociation: [["Na+", 2], ["CO3_2-", 1]]
    },
    "K2CO3_aq": {
      label: "Carbonato de Potássio (1M)",
      phase: "aq",
      conc: 1.0,
      molarMass: 138.21,
      dissociation: [["K+", 2], ["CO3_2-", 1]]
    },
    "NaClO_aq": {
      label: "Hipoclorito de Sódio (2M)",
      phase: "aq",
      conc: 2.0,
      molarMass: 74.44,
      dissociation: [["Na+", 1], ["ClO-", 1]]
    },

    // ---------------------------------------------------------
    // Sais e Soluções Metálicas
    // ---------------------------------------------------------
    "NaCl_s": { label: "Cloreto de Sódio Sólido", phase: "s", molarMass: 58.44 },
    "CuSO4_s": { label: "Sulfato de Cobre II Anidro", phase: "s", molarMass: 159.61 },
    "CaCO3_s": { label: "Carbonato de Cálcio Sólido", phase: "s", molarMass: 100.09 },
    "NaHCO3_s": { label: "Bicarbonato de Sódio Sólido", phase: "s", molarMass: 84.01 },
    "KI_aq": { label: "Iodeto de Potássio (1M)", phase: "aq", conc: 1.0, molarMass: 166.0, dissociation: [["K+", 1], ["I-", 1]] },
    "AgNO3_aq": { label: "Nitrato de Prata (1M)", phase: "aq", conc: 1.0, molarMass: 169.87, dissociation: [["Ag+", 1], ["NO3-", 1]] },
    "PbNO3_aq": { label: "Nitrato de Chumbo II (1M)", phase: "aq", conc: 1.0, molarMass: 331.2, dissociation: [["Pb2+", 1], ["NO3-", 2]] },
    "CuSO4_aq": { label: "Sulfato de Cobre II (1M)", phase: "aq", conc: 1.0, molarMass: 159.61, dissociation: [["Cu2+", 1], ["SO4_2-", 1]] },
    "FeCl3_aq": { label: "Cloreto de Ferro III (1M)", phase: "aq", conc: 1.0, molarMass: 162.2, dissociation: [["Fe3+", 1], ["Cl-", 3]] },
    "ZnSO4_aq": { label: "Sulfato de Zinco (1M)", phase: "aq", conc: 1.0, molarMass: 161.47, dissociation: [["Zn2+", 1], ["SO4_2-", 1]] },
    "NiCl2_aq": { label: "Cloreto de Níquel II (1M)", phase: "aq", conc: 1.0, molarMass: 129.60, dissociation: [["Ni2+", 1], ["Cl-", 2]] },
    "CdNO3_aq": { label: "Nitrato de Cádmio (1M)", phase: "aq", conc: 1.0, molarMass: 236.42, dissociation: [["Cd2+", 1], ["NO3-", 2]] },
    "BaCl2_aq": { label: "Cloreto de Bário (1M)", phase: "aq", conc: 1.0, molarMass: 208.23, dissociation: [["Ba2+", 1], ["Cl-", 2]] },
    "CaCl2_aq": { label: "Cloreto de Cálcio (1M)", phase: "aq", conc: 1.0, molarMass: 110.98, dissociation: [["Ca2+", 1], ["Cl-", 2]] },
    "CoCl2_aq": { label: "Cloreto de Cobalto II (1M)", phase: "aq", conc: 1.0, molarMass: 129.84, dissociation: [["Co2+", 1], ["Cl-", 2]] },
    "SbCl3_aq": { label: "Cloreto de Antimônio III (1M)", phase: "aq", conc: 1.0, molarMass: 228.11, dissociation: [["Sb3+", 1], ["Cl-", 3]] },
    "SCN_aq": { label: "Tiocianato de Potássio (1M)", phase: "aq", conc: 1.0, molarMass: 97.18, dissociation: [["K+", 1], ["SCN-", 1]] },
    "NH42S_aq": { label: "Sulfeto de Amônio (1M)", phase: "aq", conc: 1.0, molarMass: 68.14, dissociation: [["NH4+", 2], ["S_2-", 1]] },
    "H2O2_aq": { label: "Peróxido de Hidrogênio (3M)", phase: "aq", conc: 3.0, molarMass: 34.01, dissociation: [["H2O2", 1]] },

    // ---------------------------------------------------------
    // Metais e Substâncias Simples
    // ---------------------------------------------------------
    "Zn_s": { label: "Zinco Metálico", phase: "s", molarMass: 65.38 },
    "Mg_s": { label: "Magnésio Metálico", phase: "s", molarMass: 24.31 },
    "Al_s": { label: "Alumínio Metálico", phase: "s", molarMass: 26.98 },
    "Na_s": { label: "Sódio Metálico", phase: "s", molarMass: 22.99 },
    "Li_s": { label: "Lítio Metálico", phase: "s", molarMass: 6.94 },
    "K_s": { label: "Potássio Metálico", phase: "s", molarMass: 39.10 },
    "Ca_s": { label: "Cálcio Metálico", phase: "s", molarMass: 40.08 },
    "Fe_s": { label: "Ferro Metálico", phase: "s", molarMass: 55.85 },
    "Ni_s": { label: "Níquel Metálico", phase: "s", molarMass: 58.69 },
    "Cu_s": { label: "Cobre Metálico", phase: "s", molarMass: 63.55 },
    "Sn_s": { label: "Estanho Metálico", phase: "s", molarMass: 118.71 },
    "Pb_s": { label: "Chumbo Metálico", phase: "s", molarMass: 207.20 },
    "I2_s": { label: "Iodo Elementar", phase: "s", molarMass: 253.81 },
    "S_s": { label: "Enxofre Elementar", phase: "s", molarMass: 32.06 },
    "P_s": { label: "Fósforo Vermelho", phase: "s", molarMass: 30.97 },

    // ---------------------------------------------------------
    // Indicador
    // ---------------------------------------------------------
    "fenolftaleina": {
      label: "Fenolftaleína",
      phase: "s",
      molarMass: 318.32,
      smiles: "C1=CC=C2C(=C1)C(=O)OC2(C3=CC=C(C=C3)O)C4=CC=C(C=C4)O",
      iupac: "3,3-bis(4-hydroxyphenyl)-2-benzofuran-1-one",
      pubchemQuery: "Phenolphthalein",
      cid: 4764
    },

    // ---------------------------------------------------------
    // Fármacos e Produtos Sintetizados
    // ---------------------------------------------------------
    "AAS_s": {
      label: "Ácido Acetilsalicílico (Aspirina)",
      phase: "s",
      molarMass: 180.16,
      formula: "C9H8O4",
      smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
      iupac: "2-acetyloxybenzoic acid",
      pubchemQuery: "Aspirin",
      cid: 2244,
      chebiId: "CHEBI:15365",
      cas: "50-78-2",
      classe: "Anti-inflamatório Não Esteroidal (AINE)",
      papelBiologico: "Inibidor irreversível da COX-1 (acetilação da Ser-529), reduzindo tromboxano A2 e prostaglandinas."
    },
    "Paracetamol_s": {
      label: "Paracetamol (Acetaminofeno)",
      phase: "s",
      molarMass: 151.16,
      formula: "C8H9NO2",
      smiles: "CC(=O)NC1=CC=C(O)C=C1",
      iupac: "N-(4-hydroxyphenyl)acetamide",
      pubchemQuery: "Acetaminophen",
      cid: 1983,
      chebiId: "CHEBI:46195",
      cas: "103-90-2",
      classe: "Analgésico e Antipirético",
      papelBiologico: "Inibição central da síntese de prostaglandinas e modulação da via canabinoide/serotoninérgica descendente."
    },
    "SalicilatoMetila_l": {
      label: "Salicilato de Metila",
      phase: "l",
      molarMass: 152.15,
      formula: "C8H8O3",
      smiles: "COC(=O)C1=CC=CC=C1O",
      iupac: "methyl 2-hydroxybenzoate",
      pubchemQuery: "Methyl salicylate",
      cid: 4133,
      chebiId: "CHEBI:31844",
      cas: "119-36-8",
      classe: "Rubefaciente e Analgésico Tópico",
      papelBiologico: "Pró-fármaco tópico que sofre hidrólise cutânea liberando ácido salicílico com ação anti-inflamatória local."
    },
    "Acetanilida_s": {
      label: "Acetanilida",
      phase: "s",
      molarMass: 135.17,
      formula: "C8H9NO",
      smiles: "CC(=O)NC1=CC=CC=C1",
      iupac: "N-phenylacetamide",
      pubchemQuery: "Acetanilide",
      cid: 904,
      chebiId: "CHEBI:28807",
      cas: "103-84-4",
      classe: "Analgésico Histórico (Precursor do Paracetamol)",
      papelBiologico: "Metabolizada in vivo no fígado por hidroxilação em 4-aminofenol e acetaminofeno."
    },
    "AcetatoIsopentila_l": {
      label: "Acetato de Isopentila (Aroma de Banana)",
      phase: "l",
      molarMass: 130.18,
      formula: "C7H14O2",
      smiles: "CC(=O)OCCC(C)C",
      iupac: "3-methylbutyl acetate",
      pubchemQuery: "Isoamyl acetate",
      cid: 31276,
      chebiId: "CHEBI:31725",
      cas: "123-92-2",
      classe: "Éster Aromatizante e Excipiente",
      papelBiologico: "Excipiente flavorizante utilizado em formulações orais e feromônio de alarme biológico."
    },
    "BenzoatoMetila_l": {
      label: "Benzoato de Metila",
      phase: "l",
      molarMass: 136.15,
      formula: "C8H8O2",
      smiles: "COC(=O)C1=CC=CC=C1",
      iupac: "methyl benzoate",
      pubchemQuery: "Methyl benzoate",
      cid: 8050,
      chebiId: "CHEBI:31839",
      cas: "93-58-3",
      classe: "Éster Aromático / Fragrância",
      papelBiologico: "Solvente e aromatizante na indústria cosmética e farmacotécnica."
    }
  },

  // =========================================================================
  // 2. REGRAS DE SÍNTESE, CINÉTICA E CONDIÇÕES DE REAÇÃO
  // =========================================================================
  reactions: [
    {
      id: "sintese_aspirina",
      nomeComposto: "Ácido Acetilsalicílico",
      produtoId: "AAS_s",
      reagentesObrigatorios: ["AcidoSalicilico_s", "AnidridoAcetico_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 60,
      precisaAgitador: true,
      corPrecipitado: "#ffffff",
      descricao: "Acetilação do grupamento hidroxila fenólico do Ácido Salicílico pelo Anidrido Acético com catálise ácida, formando Aspirina e Ácido Acético."
    },
    {
      id: "sintese_paracetamol",
      nomeComposto: "Paracetamol",
      produtoId: "Paracetamol_s",
      reagentesObrigatorios: ["pAminofenol_s", "AnidridoAcetico_l"],
      catalisador: null,
      tempMinima: 55,
      precisaAgitador: true,
      corPrecipitado: "#f8fafc",
      descricao: "Acetilação seletiva da amina aromática primária do 4-aminofenol gerando ligação amídica estável e cristais de Paracetamol."
    },
    {
      id: "sintese_salicilato_metila",
      nomeComposto: "Salicilato de Metila",
      produtoId: "SalicilatoMetila_l",
      reagentesObrigatorios: ["AcidoSalicilico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 65,
      precisaAgitador: false,
      corLiquido: "rgba(254, 240, 138, 0.4)",
      descricao: "Esterificação de Fischer: condensação do ácido carboxílico com metanol sob refluxo ácido produzindo óleo aromático rubefaciente."
    },
    {
      id: "sintese_acetanilida",
      nomeComposto: "Acetanilida",
      produtoId: "Acetanilida_s",
      reagentesObrigatorios: ["Anilina_l", "AnidridoAcetico_l"],
      catalisador: null,
      tempMinima: 20,
      precisaAgitador: true,
      corPrecipitado: "#ffffff",
      descricao: "Acetilação exotérmica de amina primária por ataque nucleofílico ao anidrido acético, precipitando lâminas brilhantes de acetanilida."
    },
    {
      id: "sintese_aroma_banana",
      nomeComposto: "Acetato de Isopentila",
      produtoId: "AcetatoIsopentila_l",
      reagentesObrigatorios: ["AcidoAcetico_aq", "AlcoolIsopentilico_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 70,
      precisaAgitador: false,
      corLiquido: "rgba(253, 224, 71, 0.3)",
      descricao: "Esterificação de Fischer entre ácido acético e álcool isopentílico formando éster volátil com odor marcante de fruta."
    },
    {
      id: "sintese_benzoato_metila",
      nomeComposto: "Benzoato de Metila",
      produtoId: "BenzoatoMetila_l",
      reagentesObrigatorios: ["AcidoBenzoico_s", "Metanol_l"],
      catalisador: "H2SO4_aq",
      tempMinima: 65,
      precisaAgitador: false,
      corLiquido: "rgba(241, 245, 249, 0.3)",
      descricao: "Esterificação de Fischer do ácido benzóico com metanol catalisada por ácido inorgânico forte."
    }
  ]
};

// Exportação global resiliente para o ambiente do navegador
if (typeof window !== "undefined") {
  window.LAB_DATABASE = LAB_DATABASE;
}

/* ========================================================================= */
/* ARQUIVO: anatomia-3d/data/bio-database.js                               */
/* ========================================================================= */

/**
 * BASE DE CONHECIMENTO BIOMÉDICO, ANATÔMICO & FARMACOCINÉTICO MULTIESCALA
 * Ecossistema LAIFT - Módulo Master 3D / Bio-Twin
 * - Mapeamento dos 10 Sistemas Anatômicos (Macro) com árvore de órgãos e tecidos
 * - Dissecção em 5 Camadas (Pele, Músculos, Esqueleto, Vasos e Vísceras)
 * - Trajetórias Cinéticas e Biofarmacotécnicas de 7 Vias de Administração
 * - Processos Fisiológicos Dinâmicos (Meso) com Cronometragem e Inervação
 * - Alvos Cristalográficos PDB, Enzimas e Patógenos (Nano / Micro)
 * - Protocolos de Biohacking, ATP e Otimização Celular
 */

const ATLAS_DATABASE = {
  // =========================================================================
  // 1. ÁRVORE ANATÔMICA COMPLETA & HIERARQUIA DE ÓRGÃOS (NÍVEL 1: MACRO)
  // =========================================================================
  sistemas: [
    {
      id: "digestorio",
      nome: "Sistema Digestório",
      icone: "🍽️",
      cor: "#f97316",
      focoCamera: { x: 0, y: 1.05, z: 2.2 },
      targetLook: { x: 0, y: 0.95, z: 0 },
      descricao: "Trato gastrointestinal contínuo responsável pela digestão mecânica/química, motilidade, absorção enteral e metabolismo pré-sistêmico.",
      camadaDisseccao: 5,
      meshKeywords: ["digest", "stomach", "liver", "esophag", "intestin", "oral", "pancrea", "gall"],
      orgaos: [
        {
          id: "cavidade_oral",
          nome: "Cavidade Oral & Glândulas Salivares",
          meshKey: "oral",
          camada: 5,
          descricao: "Mastigação, insalivação e início da hidrólise de amido via amilase salivar.",
          subestruturas: ["Dentes", "Língua", "Glândula Parótida", "Glândula Submandibular", "Palato"]
        },
        {
          id: "esofago",
          nome: "Esôfago",
          meshKey: "esophag",
          camada: 5,
          descricao: "Conduto muscular com transição de músculo estriado para liso que propaga ondas peristálticas primárias e secundárias.",
          subestruturas: ["Esfíncter Esofágico Superior", "Corpo Esofágico", "Esfíncter Esofágico Inferior (Cárdia)"]
        },
        {
          id: "estomago",
          nome: "Estômago",
          meshKey: "stomach",
          camada: 5,
          descricao: "Reservatório ácido (pH 1.5 - 2.0) para digestão proteica e emulsificação.",
          subestruturas: ["Fundo Gástrico", "Corpo Gástrico", "Antro", "Piloro", "Mucosa com Células Parietais"]
        },
        {
          id: "figado",
          nome: "Fígado & Sistema Porta",
          meshKey: "liver",
          camada: 5,
          descricao: "Glândula anexa primária; síntese biliar, glicogênese e biotransformação de fármacos via CYP450.",
          subestruturas: ["Lobo Direito", "Lobo Esquerdo", "Veia Porta Hepática", "Ducto Hepático Comum"]
        },
        {
          id: "vesicula_biliar",
          nome: "Vesícula Biliar",
          meshKey: "gall",
          camada: 5,
          descricao: "Concentração e ejeção de ácidos e sais biliares acionada por colecistocinina (CCK).",
          subestruturas: ["Corpo da Vesícula", "Ducto Cístico", "Ducto Colédoco"]
        },
        {
          id: "pancreas",
          nome: "Pâncreas",
          meshKey: "pancrea",
          camada: 5,
          descricao: "Função anfícrina: zimogênios digestivos exócrinos (tripsina/lipase) e secreção endócrina (insulina/glucagon).",
          subestruturas: ["Cabeça do Pâncreas", "Corpo", "Cauda", "Ducto Pancreático de Wirsung"]
        },
        {
          id: "intestino_delgado",
          nome: "Intestino Delgado",
          meshKey: "intestin",
          camada: 5,
          descricao: "Principal sítio de absorção de nutrientes e fármacos; epitélio viloso de alta área superficial (~30 m²).",
          subestruturas: ["Duodeno", "Jejuno", "Íleo", "Placas de Peyer"]
        },
        {
          id: "intestino_grosso",
          nome: "Intestino Grosso (Cólon) & Reto",
          meshKey: "intestin",
          camada: 5,
          descricao: "Reabsorção hidroeletrolítica, fermentação microbiológica e formação do bolo fecal.",
          subestruturas: ["Ceco", "Apêndice Cecal", "Cólon Ascendente", "Cólon Transverso", "Cólon Descendente", "Sigmoide", "Ampola Retal"]
        }
      ],
      processosDisponiveis: ["degluticao_humana", "peristaltismo_intestinal"]
    },
    {
      id: "cardiovascular",
      nome: "Sistema Cardiovascular",
      icone: "❤️",
      cor: "#ef4444",
      focoCamera: { x: 0.08, y: 1.25, z: 1.85 },
      targetLook: { x: 0, y: 1.2, z: 0 },
      descricao: "Circuito hemodinâmico de distribuição rápida de oxigênio, metabólitos, calor e xenobióticos.",
      camadaDisseccao: 4,
      meshKeywords: ["heart", "aort", "arter", "vein", "cardio", "vascular", "ventric"],
      orgaos: [
        {
          id: "coracao",
          nome: "Coração (Miocárdio)",
          meshKey: "heart",
          camada: 5,
          descricao: "Bomba eletromecânica quadricameral sustentando a pequena e grande circulação.",
          subestruturas: ["Átrio Direito", "Ventrículo Direito", "Átrio Esquerdo", "Ventrículo Esquerdo", "Septo Interventricular", "Valvas Mitral/Tricúspide"]
        },
        {
          id: "aorta",
          nome: "Artéria Aorta & Ramos Principais",
          meshKey: "aort",
          camada: 4,
          descricao: "Tronco arterial elástico de alta pressão que conduz o débito cardíaco sistêmico.",
          subestruturas: ["Aorta Ascendente", "Arco Aórtico", "Tronco Braquiocefálico", "Aorta Torácica", "Aorta Abdominal"]
        },
        {
          id: "sistema_venoso_cava",
          nome: "Veias Cavas & Sistema Venoso Central",
          meshKey: "vein",
          camada: 4,
          descricao: "Vaso de capacitância e retorno venoso sistêmico de baixa pressão para o átrio direito.",
          subestruturas: ["Veia Cava Superior", "Veia Cava Inferior", "Veia Jugular Interna", "Veia Subclávia", "Veia Ilíaca"]
        },
        {
          id: "circulacao_pulmonar",
          nome: "Vasos Pulmonares",
          meshKey: "arter",
          camada: 4,
          descricao: "Circuito de baixa resistência arterial que conduz o sangue desoxigenado para hematose alveolar.",
          subestruturas: ["Tronco Pulmonar", "Artérias Pulmonares", "Veias Pulmonares"]
        }
      ],
      processosDisponiveis: ["ciclo_cardiaco"]
    },
    {
      id: "nervoso",
      nome: "Sistema Nervoso",
      icone: "🧠",
      cor: "#38bdf8",
      focoCamera: { x: 0, y: 1.75, z: 1.75 },
      targetLook: { x: 0, y: 1.7, z: 0 },
      descricao: "Controle bioelétrico e neuroquímico central e periférico; barreira hematoencefálica (BHE) seletiva.",
      camadaDisseccao: 5,
      meshKeywords: ["brain", "cerebr", "nerve", "spinal", "neural", "cortex"],
      orgaos: [
        {
          id: "encefalo",
          nome: "Encéfalo (Cérebro & Córtex)",
          meshKey: "brain",
          camada: 5,
          descricao: "Processamento motor/cognitivo com alta densidade de receptores GABAérgicos, glutamatérgicos e colinérgicos.",
          subestruturas: ["Córtex Cerebral", "Corpo Caloso", "Tálamo", "Hipotálamo", "Hipocampo"]
        },
        {
          id: "cerebelo",
          nome: "Cerebelo",
          meshKey: "cerebr",
          camada: 5,
          descricao: "Modulação do tônus postural, propriocepção e coordenação fina motora.",
          subestruturas: ["Hemisférios Cerebelares", "Vermis"]
        },
        {
          id: "tronco_encefalico",
          nome: "Tronco Encefálico",
          meshKey: "brain",
          camada: 5,
          descricao: "Centros vitais autônomos regulando frequência cardíaca, vasoconstrição e ritmo respiratório.",
          subestruturas: ["Mesencéfalo", "Ponte", "Bulbo (Medula Oblonga)"]
        },
        {
          id: "medula_espinhal",
          nome: "Medula Espinhal & Nervos Raquidianos",
          meshKey: "spinal",
          camada: 4,
          descricao: "Via ascendente/descendente condutora de impulsos e centro dos arcos reflexos motores.",
          subestruturas: ["Substância Cinzenta H-medular", "Fascículos Ascendentes", "Raízes Nervosas Espinhais"]
        }
      ],
      processosDisponiveis: ["sinapse_colinergica"]
    },
    {
      id: "respiratorio",
      nome: "Sistema Respiratório",
      icone: "🫁",
      cor: "#06b6d4",
      focoCamera: { x: 0, y: 1.3, z: 1.95 },
      targetLook: { x: 0, y: 1.25, z: 0 },
      descricao: "Árvore ventilatória e alvéolos sustentando hematose e trocas gasosas por difusão passiva.",
      camadaDisseccao: 5,
      meshKeywords: ["lung", "trachea", "bronch", "laryn", "pulmo", "respir", "pleura"],
      orgaos: [
        {
          id: "traqueia_laringe",
          nome: "Laringe, Epiglote & Traqueia",
          meshKey: "trachea",
          camada: 5,
          descricao: "Conduto aéreo cartilaginoso com reflexos protetores mecânicos e fonação.",
          subestruturas: ["Cartilagem Tireoide", "Epiglote", "Pregas Vocais", "Anéis Traqueais"]
        },
        {
          id: "pulmoes",
          nome: "Pulmões & Árvore Brônquica",
          meshKey: "lung",
          camada: 5,
          descricao: "Superfície alveolar de ~100 m² vascularizada por capilares contínuos para trocas gasosas.",
          subestruturas: ["Lobo Superior Direito", "Lobo Médio", "Lobo Inferior Direito", "Lobo Superior Esquerdo", "Lobo Inferior Esquerdo", "Alvéolos"]
        }
      ],
      processosDisponiveis: []
    },
    {
      id: "urinario",
      nome: "Sistema Renal & Urinário",
      icone: "💧",
      cor: "#eab308",
      focoCamera: { x: 0, y: 0.95, z: 1.9 },
      targetLook: { x: 0, y: 0.9, z: 0 },
      descricao: "Depuração de metabólitos, controle volêmico, equilíbrio acidobásico e secreção de renina/eritropoietina.",
      camadaDisseccao: 5,
      meshKeywords: ["kidney", "renal", "ureter", "bladder", "urin", "nephr"],
      orgaos: [
        {
          id: "rins",
          nome: "Rins & Néfrons",
          meshKey: "kidney",
          camada: 5,
          descricao: "Órgão retroperitoneal par contendo cerca de 1 milhão de néfrons funcionais por unidade.",
          subestruturas: ["Córtex Renal", "Medula Renal", "Glomérulos", "Túbulos Contorcidos", "Pelve Renal"]
        },
        {
          id: "ureteres_bexiga",
          nome: "Ureteres & Bexiga Urinária",
          meshKey: "bladder",
          camada: 5,
          descricao: "Armazenamento e condução de urina sob controle esfincteriano e do músculo detrusor.",
          subestruturas: ["Ureteres", "Músculo Detrusor", "Trígono Vesical", "Uretra"]
        }
      ],
      processosDisponiveis: ["filtracao_glomerular"]
    },
    {
      id: "musculoesqueletico",
      nome: "Sistema Musculoesquelético",
      icone: "🦴",
      cor: "#a855f7",
      focoCamera: { x: 0, y: 1.1, z: 2.8 },
      targetLook: { x: 0, y: 1.0, z: 0 },
      descricao: "Estrutura biomecânica de sustentação, reserva de cálcio ósseo e miócitos contráteis.",
      camadaDisseccao: 3,
      meshKeywords: ["bone", "skelet", "muscl", "tendon", "femur", "tibia", "spine"],
      orgaos: [
        {
          id: "esqueleto_axial",
          nome: "Esqueleto Axial",
          meshKey: "bone",
          camada: 3,
          descricao: "Proteção do neuroeixo e cavidade torácica.",
          subestruturas: ["Crânio", "Coluna Vertebral", "Costelas", "Esterno"]
        },
        {
          id: "esqueleto_apendicular",
          nome: "Esqueleto Apendicular & Articulações",
          meshKey: "skelet",
          camada: 3,
          descricao: "Alavancas ósseas e locomoção.",
          subestruturas: ["Cíngulo Escapular", "Úmero/Rádio/Ulna", "Pelve Óssea", "Fêmur/Tíbia/Fíbula"]
        },
        {
          id: "musculos_esqueleticos",
          nome: "Grupos Musculares Esqueléticos",
          meshKey: "muscl",
          camada: 2,
          descricao: "Fibras estriadas voluntárias dependentes de acoplamento excitação-contração por cálcio.",
          subestruturas: ["Musculatura Peitoral", "Deltoide", "Reto Abdominal", "Quadríceps", "Gastrocnêmio"]
        }
      ],
      processosDisponiveis: []
    },
    {
      id: "endocrino",
      nome: "Sistema Endócrino",
      icone: "🧪",
      cor: "#ec4899",
      focoCamera: { x: 0, y: 1.35, z: 1.8 },
      targetLook: { x: 0, y: 1.3, z: 0 },
      descricao: "Comunicação humoral lenta por mensageiros químicos carreados no plasma.",
      camadaDisseccao: 5,
      meshKeywords: ["thyroid", "adrenal", "pituit", "hormon", "endocrin"],
      orgaos: [
        {
          id: "tireoide",
          nome: "Tireoide & Paratireoides",
          meshKey: "thyroid",
          camada: 5,
          descricao: "Metabolismo basal (T3/T4) e balanço de cálcio sérico (PTH/Calcitonina).",
          subestruturas: ["Lobo Direito", "Lobo Esquerdo", "Istmo", "Glândulas Paratireoides"]
        },
        {
          id: "adrenais",
          nome: "Glândulas Suprarrenais (Adrenais)",
          meshKey: "adrenal",
          camada: 5,
          descricao: "Secreção de mineralocorticoides (aldosterona), glicocorticoides (cortisol) e catecolaminas (adrenalina).",
          subestruturas: ["Córtex Adrenal (Zonas Glomerulosa/Fasciculada/Reticular)", "Medula Adrenal"]
        }
      ],
      processosDisponiveis: []
    },
    {
      id: "imunologico",
      nome: "Sistema Linfático & Imunológico",
      icone: "🛡️",
      cor: "#10b981",
      focoCamera: { x: 0, y: 1.15, z: 2.1 },
      targetLook: { x: 0, y: 1.1, z: 0 },
      descricao: "Drenagem intersticial e vigilância celular mediada por linfócitos, macrófagos e anticorpos.",
      camadaDisseccao: 4,
      meshKeywords: ["lymph", "spleen", "thymus", "node", "immune"],
      orgaos: [
        {
          id: "baco",
          nome: "Baço",
          meshKey: "spleen",
          camada: 5,
          descricao: "Hemocaterese e imunidade adaptativa frente a patógenos encapsulados.",
          subestruturas: ["Polpa Vermelha", "Polpa Branca"]
        },
        {
          id: "linfonodos",
          nome: "Linfonodos & Ductos Linfáticos",
          meshKey: "node",
          camada: 4,
          descricao: "Filtragem da linfa e apresentação de antígenos às células T e B.",
          subestruturas: ["Linfonodos Cervicais", "Linfonodos Axilares", "Linfonodos Inguinais", "Ducto Torácico"]
        }
      ],
      processosDisponiveis: []
    },
    {
      id: "tegumentar",
      nome: "Sistema Tegumentar",
      icone: "🧴",
      cor: "#fbbf24",
      focoCamera: { x: 0, y: 1.1, z: 2.5 },
      targetLook: { x: 0, y: 1.0, z: 0 },
      descricao: "Primeira linha de defesa imunológica inata, barreira contra perda de água e termorregulação.",
      camadaDisseccao: 1,
      meshKeywords: ["skin", "derma", "integum", "epiderm"],
      orgaos: [
        {
          id: "pele",
          nome: "Pele & Anexos Cutâneos",
          meshKey: "skin",
          camada: 1,
          descricao: "Estrato córneo queratinizado como barreira lipofílica limitante de difusão de fármacos.",
          subestruturas: ["Estrato Córneo", "Epiderme Celular", "Derme Vascularizada", "Hipoderme Adiposa"]
        }
      ],
      processosDisponiveis: []
    },
    {
      id: "reprodutor",
      nome: "Sistema Reprodutor",
      icone: "🧬",
      cor: "#6366f1",
      focoCamera: { x: 0, y: 0.75, z: 1.9 },
      targetLook: { x: 0, y: 0.7, z: 0 },
      descricao: "Gametogênese, produção de andrógenos/estrógenos e função reprodutiva.",
      camadaDisseccao: 5,
      meshKeywords: ["reprod", "genit", "pelvis", "uter", "testi"],
      orgaos: [
        {
          id: "estruturas_genitais",
          nome: "Órgãos Genitais & Gônadas",
          meshKey: "genit",
          camada: 5,
          descricao: "Tecidos dependentes de regulação pelo eixo hipotálamo-hipófise-gonadal.",
          subestruturas: ["Gônadas", "Vias Condutoras", "Estruturas Genitais Externas"]
        }
      ],
      processosDisponiveis: []
    }
  ],

  // =========================================================================
  // 2. MOTOR DE TRAJETÓRIAS FARMACOLÓGICAS (7 VIAS DE ADMINISTRAÇÃO)
  // =========================================================================
  viasAdministracao: {
    "ORAL": {
      id: "ORAL",
      nome: "Via Oral (Enteral)",
      icone: "💊",
      corFluxo: "#f59e0b",
      biodisponibilidadeMedia: "30% a 90% (Variável)",
      tMaxMedio: "45 a 90 min",
      primeiraPassagemHepatica: true,
      barreirasBiologicas: "Acidez gástrica (pH 1.5), enzimas enterais, efluxo via Glicoproteína-P e CYP3A4 nos enterócitos.",
      descricaoClinica: "Via mais comum, segura e econômica. A absorção ocorre predominantemente no duodeno e jejuno devido à grande superfície das microvilosidades. O fármaco absorvido atinge a veia porta e sofre metabolização no fígado antes da circulação sistêmica.",
      orgaosSequenciais: ["Boca", "Esôfago", "Estômago", "Intestino Delgado", "Veia Porta Hepática", "Fígado", "Coração", "Aorta Sistêmica"],
      waypoints3D: [
        { x: 0.0, y: 1.74, z: 0.12, label: "Inserção Oral (Bolo)" },
        { x: 0.0, y: 1.52, z: 0.06, label: "Trânsito Esofágico" },
        { x: -0.06, y: 1.05, z: 0.08, label: "Dissolução Gástrica" },
        { x: 0.02, y: 0.88, z: 0.07, label: "Absorção Duodenal" },
        { x: 0.05, y: 0.98, z: 0.04, label: "Eixo Porta-Hepático" },
        { x: 0.09, y: 1.06, z: 0.06, label: "Metabolismo de 1ª Passagem (CYP450)" },
        { x: 0.04, y: 1.25, z: 0.08, label: "Circulação Sistêmica (Coração)" }
      ]
    },
    "INTRAVENOSA": {
      id: "INTRAVENOSA",
      nome: "Via Intravenosa (Bolus / Infusão IV)",
      icone: "🩸",
      corFluxo: "#ef4444",
      biodisponibilidadeMedia: "100% (Definição F = 1.0)",
      tMaxMedio: "Instantâneo (~0 min)",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Nenhuma barreira de absorção primária. Acesso direto ao compartimento central vascular.",
      descricaoClinica: "Injeção direta no leito vascular venoso. Ideal para situações de emergência médica e substâncias irritantes teciduais. Exige controle rigoroso da velocidade de infusão para prevenir concentrações tóxicas imediatas.",
      orgaosSequenciais: ["Veia Periférica do Braço", "Veia Cava Superior", "Átrio Direito", "Ventrículo Direito", "Circulação Pulmonar", "Coração Esquerdo", "Aorta Sistêmica"],
      waypoints3D: [
        { x: 0.32, y: 1.12, z: 0.05, label: "Acesso Venoso Periférico" },
        { x: 0.22, y: 1.22, z: 0.04, label: "Veia Basílica / Subclávia" },
        { x: 0.08, y: 1.30, z: 0.05, label: "Veia Cava Superior" },
        { x: 0.05, y: 1.25, z: 0.07, label: "Átrio / Ventrículo Direito" },
        { x: 0.0, y: 1.28, z: 0.04, label: "Pequena Circulação Pulmonar" },
        { x: 0.04, y: 1.24, z: 0.08, label: "Ventrículo Esquerdo" },
        { x: 0.02, y: 1.35, z: 0.05, label: "Distribuição Sistêmica Aórtica" }
      ]
    },
    "INTRAMUSCULAR": {
      id: "INTRAMUSCULAR",
      nome: "Via Intramuscular (IM)",
      icone: "💉",
      corFluxo: "#a855f7",
      biodisponibilidadeMedia: "75% a 100%",
      tMaxMedio: "15 a 30 min (Aquosa) / Dias (Depot)",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Endotélio dos capilares musculares fenestrados e fáscia muscular conectiva.",
      descricaoClinica: "Injeção profunda em massa muscular altamente vascularizada (deltoide ou glúteo). Permite a administração de formulações oleosas de liberação prolongada (depot), que formam um reservatório tecidual de liberação lenta.",
      orgaosSequenciais: ["Tecido Muscular Profundo (Deltoide)", "Leito Capilar Muscular", "Veias Subclávias", "Veia Cava Superior", "Coração", "Aorta"],
      waypoints3D: [
        { x: 0.38, y: 1.35, z: 0.03, label: "Depósito Intramuscular (Deltoide)" },
        { x: 0.28, y: 1.32, z: 0.04, label: "Drenagem Capilar Muscular" },
        { x: 0.15, y: 1.30, z: 0.05, label: "Veia Axilar / Subclávia" },
        { x: 0.05, y: 1.25, z: 0.07, label: "Coração Direito" },
        { x: 0.03, y: 1.32, z: 0.06, label: "Ejeção Arterial Sistêmica" }
      ]
    },
    "NASAL": {
      id: "NASAL",
      nome: "Via Nasal (Inalação / Spray)",
      icone: "👃",
      corFluxo: "#06b6d4",
      biodisponibilidadeMedia: "40% a 80%",
      tMaxMedio: "5 a 15 min",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Depuração mucociliar respiratória, enzimas proteolíticas da mucosa nasal e epitélio colunar ciliado.",
      descricaoClinica: "Apresenta dupla via de absorção: (1) drenagem pelos plexos vasculares de Kiesselbach para a circulação sistêmica e (2) translocação axonal direta pelo nervo olfatório e lâmina crivosa em direção ao Sistema Nervoso Central, contornando a BHE.",
      orgaosSequenciais: ["Conchas Nasais", "Mucosa Olfatória", "Lâmina Crivosa do Etmoide", "Encéfalo (SNC) / Veias Jugulares", "Coração"],
      waypoints3D: [
        { x: 0.0, y: 1.76, z: 0.15, label: "Nebulização Nasal" },
        { x: 0.0, y: 1.75, z: 0.10, label: "Plexo Vascular de Kiesselbach" },
        { x: 0.0, y: 1.78, z: 0.07, label: "Via Direta Nariz-Cérebro (Lâmina Crivosa)" },
        { x: 0.0, y: 1.82, z: 0.05, label: "Distribuição Encéfalo / SNC" },
        { x: 0.03, y: 1.55, z: 0.04, label: "Drenagem Jugular para o Coração" }
      ]
    },
    "TOPICA": {
      id: "TOPICA",
      nome: "Via Tópica & Transdérmica",
      icone: "🧴",
      corFluxo: "#fbbf24",
      biodisponibilidadeMedia: "5% a 30% (Transdérmica)",
      tMaxMedio: "2 a 8 horas (Lenta e Contínua)",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Estrato córneo (estratos queratinizados densos e lipídios intercelulares hidrofóbicos).",
      descricaoClinica: "Ação local ou sistêmica (adesivos transdérmicos como nicotina e fentanil). Fármacos lipofílicos de baixo peso molecular penetram a matriz lipídica do estrato córneo e atingem a derme capilarizada de forma sustentada e linear.",
      orgaosSequenciais: ["Estrato Córneo", "Epiderme", "Plexo Capilar Dérmico", "Veias Cutâneas", "Circulação Geral"],
      waypoints3D: [
        { x: 0.35, y: 0.95, z: 0.08, label: "Aplicação Tópica no Dorso Cutâneo" },
        { x: 0.34, y: 0.95, z: 0.06, label: "Partição no Estrato Córneo" },
        { x: 0.32, y: 0.96, z: 0.04, label: "Capilarização Dérmica" },
        { x: 0.22, y: 1.08, z: 0.04, label: "Veia Radial / Cefálica" },
        { x: 0.05, y: 1.25, z: 0.07, label: "Entrada Sistêmica Contínua" }
      ]
    },
    "OCULAR": {
      id: "OCULAR",
      nome: "Via Ocular (Colírio / Pomada)",
      icone: "👁️",
      corFluxo: "#38bdf8",
      biodisponibilidadeMedia: "1% a 7% (Baixa Penetração)",
      tMaxMedio: "10 a 25 min (Tecido Ocular)",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Lavagem lacrimal contínua, epitélio corneano hidrofóbico e drenagem nasolacrimal acelerada.",
      descricaoClinica: "Destinada primariamente a efeitos oftálmicos locais. Menos de 5% da dose atinge a câmara anterior do olho; o excedente é drenado pelo ducto nasolacrimal para a mucosa nasal, podendo gerar absorção sistêmica involuntária.",
      orgaosSequenciais: ["Fundo de Saco Conjuntival", "Córnea", "Câmara Anterior / Humor Aquoso", "Ducto Nasolacrimal", "Mucosa Nasal"],
      waypoints3D: [
        { x: -0.04, y: 1.78, z: 0.16, label: "Instilação no Saco Conjuntival" },
        { x: -0.035, y: 1.78, z: 0.14, label: "Penetração Corneana (Ação Local)" },
        { x: -0.02, y: 1.75, z: 0.13, label: "Drenagem pelo Ducto Nasolacrimal" },
        { x: 0.0, y: 1.70, z: 0.10, label: "Fração Absorvida pela Mucosa Nasal" }
      ]
    },
    "OTOLOGICA": {
      id: "OTOLOGICA",
      nome: "Via Otológica (Gotas Auriculares)",
      icone: "👂",
      corFluxo: "#e2e8f0",
      biodisponibilidadeMedia: "Ação Tópica Local (< 1% Sistêmica)",
      tMaxMedio: "Variável (Efeito de Contato)",
      primeiraPassagemHepatica: false,
      barreirasBiologicas: "Conduto auditivo externo queratinizado e membrana timpânica espessa (quando íntegra).",
      descricaoClinica: "Exclusivamente tópica para afecções do meato acústico externo (otites externas) e cerúmen. Com a membrana timpânica íntegra, não ocorre absorção sistêmica relevante nem penetração para a orelha média.",
      orgaosSequenciais: ["Pavilhão Auricular", "Meato Acústico Externo", "Membrana Timpânica"],
      waypoints3D: [
        { x: 0.16, y: 1.76, z: 0.02, label: "Instilação no Pavilhão Auricular" },
        { x: 0.13, y: 1.75, z: 0.01, label: "Conduto Auditivo Externo" },
        { x: 0.10, y: 1.74, z: 0.00, label: "Membrana Timpânica (Limite da Ação)" }
      ]
    }
  },

  // =========================================================================
  // 3. PROCESSOS FISIOLÓGICOS DINÂMICOS (NÍVEL 2: MESO / TIMELINE)
  // =========================================================================
  processos: {
    "degluticao_humana": {
      id: "degluticao_humana",
      titulo: "Fisiologia da Deglutição Humana",
      sistema: "digestorio",
      descricao: "Sequência neuromuscular reflexa coordenada dividida em estágios orais, faríngeos e esofágicos.",
      etapas: [
        {
          ordem: 1,
          fase: "Fase Oral (Voluntária)",
          duracaoMs: 1000,
          descricao: "Mastigação coordenada, insalivação rica em ptialina e compactação do bolo. O dorso da língua eleva-se contra o palato duro, projetando o bolo para o istmo das fauces.",
          nervos: "NC V3 (Trigêmeo) e NC XII (Hipoglosso)",
          musculos: "Masseter, Temporal, Pterigóideos Medial/Lateral e Músculos Intrínsecos da Língua",
          acaoParticulas: "oral_cavity",
          enzimas: ["Amilase Salivar (Ptialina - PDB: 1SMD)", "Lipase Lingual"]
        },
        {
          ordem: 2,
          fase: "Fase Faríngea (Involuntária / Reflexa)",
          duracaoMs: 1000,
          descricao: "Oclusão de segurança das vias aéreas: o palato mole veda a nasofaringe; a laringe eleva-se e a epiglote fecha a fenda glótica. Inibição respiratória reflexa bulbar.",
          nervos: "NC IX (Glossofaríngeo) e NC X (Vago)",
          musculos: "Constritor Superior e Médio da Faringe, Palatofaringeo e Salpingofaringeo",
          acaoParticulas: "pharynx_transit",
          enzimas: ["Mucina (Lubrificação Glicoproteica)"]
        },
        {
          ordem: 3,
          fase: "Fase Esofágica",
          duracaoMs: 3500,
          descricao: "Relaxamento transitório do Esfíncter Esofágico Superior (EES). O plexo mioentérico de Auerbach propaga ondas peristálticas primárias (propulsivas) a 3-4 cm/s.",
          nervos: "NC X (Nervo Vago) e Plexo Mioentérico de Auerbach",
          musculos: "Musculatura Esofágica Estriada (1/3 superior) e Lisa Circular/Longitudinal (2/3 inferiores)",
          acaoParticulas: "esophagus_wave",
          enzimas: []
        },
        {
          ordem: 4,
          fase: "Relaxamento Receptivo Gástrico",
          duracaoMs: 1500,
          descricao: "Liberação de NO e VIP pelas fibras vagais NANC, relaxando o Esfíncter Esofágico Inferior (EEI). Acomodação de volume gástrico sem aumento tensional da pressão intragástrica.",
          nervos: "Vias Vago-Vagais Não-Adrenérgicas Não-Colinérgicas (NANC)",
          musculos: "Esfíncter Esofágico Inferior e Fundo Gástrico",
          acaoParticulas: "stomach_entry",
          enzimas: ["Pepsinogênio / Pepsina (PDB: 4PEP)", "Ácido Clorídrico (Bomba H+/K+-ATPase)"]
        }
      ]
    },
    "ciclo_cardiaco": {
      id: "ciclo_cardiaco",
      titulo: "Ciclo Eletromecânico Cardíaco",
      sistema: "cardiovascular",
      descricao: "Sequência rítmica de despolarização elétrica e contração sincicial miocárdica.",
      etapas: [
        {
          ordem: 1,
          fase: "Sístole Atrial (Despolarização)",
          duracaoMs: 800,
          descricao: "O Nó Sinoatrial despolariza o sincício atrial (Onda P no ECG). Enchimento ativo final (20-30%) do volume diastólico ventricular.",
          nervos: "Tônus Vagal basal vs Condução Internodal",
          musculos: "Miocárdio Atrial Direito e Esquerdo",
          acaoParticulas: "atria_to_ventricle",
          enzimas: []
        },
        {
          ordem: 2,
          fase: "Contração Isovolumétrica",
          duracaoMs: 400,
          descricao: "O estímulo percorre as fibras de Purkinje (Complexo QRS). A pressão ventricular supera a atrial, fechando as valvas AV (Mitral e Tricúspide - Bulha B1).",
          nervos: "Condução rápida via Canais Nav1.5",
          musculos: "Ventrículos (Músculos Papilares e Parede Livre)",
          acaoParticulas: "ventricle_pressurize",
          enzimas: ["SERCA2a (ATPase de Cálcio Sarcoplasmática)"]
        },
        {
          ordem: 3,
          fase: "Ejeção Ventricular Rápida",
          duracaoMs: 1200,
          descricao: "A pressão ventricular ultrapassa as pressões aórtica e pulmonar, abrindo as valvas semilunares e ejetando o volume sistólico (~70 mL).",
          nervos: "Modulação Beta-1 Adrenérgica",
          musculos: "Miocárdio Ventricular em Tensão Máxima",
          acaoParticulas: "aorta_flow",
          enzimas: []
        }
      ]
    },
    "peristaltismo_intestinal": {
      id: "peristaltismo_intestinal",
      titulo: "Motilidade e Peristaltismo Enteral",
      sistema: "digestorio",
      descricao: "Propulsão e mistura do quimo coordenada pelos plexos mioentéricos entéricos.",
      etapas: [
        {
          ordem: 1,
          fase: "Contração a Montante",
          duracaoMs: 1500,
          descricao: "Estiramento da parede intestinal ativa interneurônios colinérgicos. Liberação de Substância P e Acetilcolina antes do bolo alimentar.",
          nervos: "Plexo de Auerbach",
          musculos: "Camada Circular Interna do Músculo Liso",
          acaoParticulas: "quimo_propulsion",
          enzimas: ["Enteropeptidase"]
        },
        {
          ordem: 2,
          fase: "Relaxamento Receptivo a Jusante",
          duracaoMs: 1500,
          descricao: "Liberação de NO e VIP adiante do bolo alimentar, relaxando o lúmen e permitindo a progressão do quimo.",
          nervos: "Neurônios Inibitórios Entéricos",
          musculos: "Camada Longitudinal Externa",
          acaoParticulas: "quimo_advance",
          enzimas: ["Amilase Pancreática", "Lipase Pancreática"]
        }
      ]
    },
    "filtracao_glomerular": {
      id: "filtracao_glomerular",
      titulo: "Filtração Glomerular & Dinâmica Tubular",
      sistema: "urinario",
      descricao: "Separação física por pressão hidrostática através da barreira capilar-podocitária renal.",
      etapas: [
        {
          ordem: 1,
          fase: "Ultrafiltração Glomerular",
          duracaoMs: 1000,
          descricao: "O plasma atravessa o endotélio fenestrado, lâmina basal e fendas de filtração dos podócitos sob pressão de filtração líquida de ~10 mmHg.",
          nervos: "Autorregulação Miogênica da Arteríola Aferente",
          musculos: "Células Mesangiais Glomerulares",
          acaoParticulas: "glomerular_filter",
          enzimas: ["Anidrase Carbônica Tipo IV"]
        },
        {
          ordem: 2,
          fase: "Reabsorção no Túbulo Contorcido Proximal",
          duracaoMs: 2000,
          descricao: "Recuperação ativa de sódio, água e glicose total (via SGLT2) contra gradiente de concentração.",
          nervos: "Transportadores Dependentes de ATP",
          musculos: "Epitélio Tubular com Borda em Escova",
          acaoParticulas: "tubular_reabsorption",
          enzimas: ["Na+/K+-ATPase Basolateral (PDB: 3B8E)"]
        }
      ]
    },
    "sinapse_colinergica": {
      id: "sinapse_colinergica",
      titulo: "Transmissão Sináptica Colinérgica",
      sistema: "nervoso",
      descricao: "Neurotransmissão química na fenda sináptica e hidrólise de acetilcolina por AChE.",
      etapas: [
        {
          ordem: 1,
          fase: "Despolarização e Influxo de Cálcio",
          duracaoMs: 500,
          descricao: "O potencial de ação alcança o botão pré-sináptico, abrindo canais de cálcio voltagem-dependentes Cav2.1 e mobilizando vesículas de acetilcolina.",
          nervos: "Neurônio Motor Somático",
          musculos: "Placa Motora Terminal",
          acaoParticulas: "synapse_calcium",
          enzimas: ["Colina Acetiltransferase (ChAT)"]
        },
        {
          ordem: 2,
          fase: "Exocitose e Degradação Enzimática",
          duracaoMs: 1500,
          descricao: "Abertura dos canais nicotínicos pós-sinápticos e clivagem imediata da acetilcolina em colina e acetato pela AChE.",
          nervos: "Receptores Nicotínicos e Muscarínicos",
          musculos: "Sarcolema Muscular",
          acaoParticulas: "synapse_ache_cleave",
          enzimas: ["Acetilcolinesterase (PDB: 4EY7)"]
        }
      ]
    }
  },

  // =========================================================================
  // 4. CRISTALOGRAFIA PDB, ENZIMAS & PATÓGENOS (NÍVEL 4: NANO)
  // =========================================================================
  alvosMoleculares: [
    {
      id: "ptialina",
      nome: "Amilase Salivar (Ptialina)",
      tipo: "enzima",
      pdbId: "1SMD",
      sistema: "digestorio",
      funcao: "Endoamilase cálcio-dependente que cliva ligações glicosídicas alfa-1,4 do amido na cavidade oral.",
      liganteFarmaco: "Acarbose (Inibidor da Alfa-Amilase)",
      quimica: { formula: "C25H43NO18", pesoMolecular: "645.6 g/mol", classe: "Hidrolase (EC 3.2.1.1)" }
    },
    {
      id: "pepsina",
      nome: "Pepsina Gástrica",
      tipo: "enzima",
      pdbId: "4PEP",
      sistema: "digestorio",
      funcao: "Endopeptidase ácida aspartato; degradação de ligações peptídicas aromáticas no pH gástrico.",
      liganteFarmaco: "Pepstatina A (Inibidor Específico)",
      quimica: { formula: "C34H63N5O9", pesoMolecular: "685.9 g/mol", pH_otimo: "1.5 - 2.0" }
    },
    {
      id: "h_pylori",
      nome: "Urease de Helicobacter pylori",
      tipo: "patogeno",
      pdbId: "1E9Z",
      sistema: "digestorio",
      funcao: "Enzima níquel-dependente de 540 kDa que hidrolisa ureia gerando amônia protetora contra o ácido gástrico.",
      liganteFarmaco: "Claritromicina + Amoxicilina + Omeprazol",
      quimica: { subunidades: "Alfa (26 kDa) e Beta (61 kDa)", patogenicidade: "Colonização e úlcera péptica" }
    },
    {
      id: "cox2",
      nome: "Ciclooxigenase-2 (COX-2)",
      tipo: "enzima",
      pdbId: "3LN1",
      sistema: "cardiovascular",
      funcao: "Oxigenase indutível que catalisa a síntese de prostaglandina H2 (PGH2) na cascata inflamatória.",
      liganteFarmaco: "Celecoxibe (Complexo Co-Cristalizado no Sítio Ativo)",
      quimica: { formula: "C17H14F3N3O2S", pesoMolecular: "381.4 g/mol", seletividade: "Seletivo COX-2" }
    },
    {
      id: "ache",
      nome: "Acetilcolinesterase (AChE)",
      tipo: "enzima",
      pdbId: "4EY7",
      sistema: "nervoso",
      funcao: "Serina hidrolase com velocidade catalítica ultra-rápida. Cliva acetilcolina na placa motora e SNC.",
      liganteFarmaco: "Donepezila / Pralidoxima (Reativador Enzimático de Organofosforados)",
      quimica: { sitio_ativo: "Tríade Ser200-His440-Glu327", inibidores: "Organofosforados e Carbamatos" }
    },
    {
      id: "sars_cov2_mpro",
      nome: "Protease Principal Mpro (SARS-CoV-2)",
      tipo: "patogeno",
      pdbId: "7VH8",
      sistema: "respiratorio",
      funcao: "Cisteína protease viral indispensável para o processamento das poliproteínas de replicação do vírus.",
      liganteFarmaco: "Nirmatrelvir (Paxlovid)",
      quimica: { diade_catalitica: "Cys145 e His41", tipo: "Inibidor Covalente Reversível" }
    },
    {
      id: "bomba_na_k",
      nome: "Bomba Sódio-Potássio (Na+/K+-ATPase)",
      tipo: "enzima",
      pdbId: "3B8E",
      sistema: "urinario",
      funcao: "Transportador ativo primário que expulsa 3 Na+ e capta 2 K+ consumindo 1 ATP para manter o potencial celular.",
      liganteFarmaco: "Digoxina / Ouabaína (Cardiotônicos)",
      quimica: { estequiometria: "3Na+ : 2K+ : 1ATP", gradiente: "Motor primário da reabsorção renal" }
    },
    {
      id: "complexo_1_mito",
      nome: "Complexo I Mitocondrial (NADH:Ubiquinona)",
      tipo: "enzima",
      pdbId: "5LUF",
      sistema: "cardiovascular",
      funcao: "Enzima de 1 MDa da cadeia respiratória; transfere elétrons do NADH para a CoQ10 gerando gradiente de prótons.",
      liganteFarmaco: "Metformina (Inibidor Parcial) / Rotenona (Tóxico)",
      quimica: { centros_redox: "Fe-S e FMN", localizacao: "Membrana Mitocondrial Interna" }
    },
    {
      id: "cyp3a4",
      nome: "Citocromo P450 3A4 (CYP3A4)",
      tipo: "enzima",
      pdbId: "1TQN",
      sistema: "digestorio",
      funcao: "Monooxigenase microssomal hepática e intestinal responsável pelo metabolismo oxidativo de mais de 50% dos fármacos.",
      liganteFarmaco: "Claritromicina / Cetoconazol (Inibidores Potentes)",
      quimica: { grupo_prostetico: "Heme Fe-Protoporfirina IX", localizacao: "Retículo Endoplasmático Liso" }
    }
  ],

  // =========================================================================
  // 5. PROTOCOLOS DE BIOHACKING & OTIMIZAÇÃO CELULAR
  // =========================================================================
  protocols: [
    {
      id: "bio_mag_treonato",
      nome: "Magnésio L-Treonato",
      icone: "🧠",
      viaMetabolica: "Neuroplasticidade e Densidade Sináptica",
      mecanismoAcao: "Sal de magnésio quelado com ácido L-treônico que atravessa a barreira hematoencefálica (BHE) via transportadores de alta afinidade, otimizando o potencial sináptico e os receptores NMDA.",
      tags: ["Nootrópico", "Mineral Quelado", "SNC", "Alta Biodisponibilidade"],
      cofatores: ["Vitamina B6 (Piridoxal-5-Fosfato)", "Zinco", "Vitamina D3"],
      sistema: "nervoso",
      targetMesh: "brain",
      pkData: {
        route: "ORAL",
        vd: 35,
        halfLife: 5.5,
        dose: 2000,
        ka: 1.8,
        targetOrgan: "brain"
      }
    },
    {
      id: "bio_coq10_ubiquinol",
      nome: "Coenzima Q10 (Ubiquinol)",
      icone: "⚡",
      viaMetabolica: "Cadeia Transportadora de Elétrons Mitocondrial",
      mecanismoAcao: "Forma reduzida e metabolicamente ativa da CoQ10. Atua nos complexos I e II da crista mitocondrial transferindo elétrons para o complexo III, otimizando a síntese de ATP miocárdico e cerebral.",
      tags: ["Bioenergética", "Anti-aging", "Fosforilação Oxidativa", "Lipofílico"],
      cofatores: ["PQQ (Pirroloquinolina Quinona)", "L-Carnitina", "Magnésio"],
      sistema: "cardiovascular",
      targetMesh: "heart",
      pkData: {
        route: "ORAL",
        vd: 120,
        halfLife: 33.0,
        dose: 200,
        ka: 0.5,
        targetOrgan: "heart"
      }
    },
    {
      id: "bio_pqq",
      nome: "PQQ (Pirroloquinolina Quinona)",
      icone: "🔋",
      viaMetabolica: "Biogênese Mitocondrial",
      mecanismoAcao: "Cofator redox e ativador das vias de transcrição PGC-1α e CREB. Induz a síntese de novas mitocôndrias no interior de células envelhecidas e neutraliza radicais livres de oxigênio.",
      tags: ["Biogênese", "Fator de Transcrição", "Neuroproteção"],
      cofatores: ["Ubiquinol", "Ácido Alfa-Lipóico (ALA)"],
      sistema: "digestorio",
      targetMesh: "liver",
      pkData: {
        route: "ORAL",
        vd: 45,
        halfLife: 4.2,
        dose: 20,
        ka: 2.1,
        targetOrgan: "liver"
      }
    },
    {
      id: "bio_mag_bisglicinato",
      nome: "Magnésio Bisglicinato",
      icone: "💪",
      viaMetabolica: "Relaxamento Neuromuscular e Glicólise",
      mecanismoAcao: "Magnésio quelado a duas moléculas de glicina. Absorção transcelular via transportadores peptídicos PEPT1 no jejuno, sem concorrência com canais TRPM6, sustentando mais de 300 enzimas ATPases.",
      tags: ["Quelato Aminoácido", "Recuperação Física", "Sistema Parassimpático"],
      cofatores: ["Taurina", "Cálcio", "Potássio"],
      sistema: "musculoesqueletico",
      targetMesh: "bone",
      pkData: {
        route: "ORAL",
        vd: 40,
        halfLife: 4.8,
        dose: 400,
        ka: 1.5,
        targetOrgan: "muscle"
      }
    },
    {
      id: "bio_creatina_mono",
      nome: "Creatina Monoidratada",
      icone: "🏃",
      viaMetabolica: "Sistema Fosfogênio (ATP-CP)",
      mecanismoAcao: "Armazenada nos miócitos sob a forma de fosfocreatina. Doador rápido de radicais fosfato para a síntese instantânea de ATP em contrações de alta intensidade via creatina quinase (CK).",
      tags: ["Ergogênico", "Ressíntese de ATP", "Músculo Esquelético"],
      cofatores: ["Carboidratos Simples", "Sódio"],
      sistema: "musculoesqueletico",
      targetMesh: "bone",
      pkData: {
        route: "ORAL",
        vd: 100,
        halfLife: 3.0,
        dose: 5000,
        ka: 2.5,
        targetOrgan: "muscle"
      }
    },
    {
      id: "bio_zinco_picolinato",
      nome: "Zinco Picolinato",
      icone: "🛡️",
      viaMetabolica: "Catálise Enzimática e Imunomodulação",
      mecanismoAcao: "Zinco conjugado ao ácido picolínico. Facilita a passagem pelas membranas celulares, integrando dedos de zinco estruturais do DNA e ativando a enzima superóxido dismutase (SOD1).",
      tags: ["Sistema Imunológico", "Síntese Proteica", "Metaloenzima"],
      cofatores: ["Cobre", "Vitamina C", "Quercetina"],
      sistema: "imunologico",
      targetMesh: "bone",
      pkData: {
        route: "ORAL",
        vd: 60,
        halfLife: 280.0,
        dose: 30,
        ka: 1.2,
        targetOrgan: "bones"
      }
    },
    {
      id: "bio_glutationa_iv",
      nome: "Glutationa (GSH) Endovenosa",
      icone: "🩸",
      viaMetabolica: "Sistema Antioxidante Mestre & Detoxificação Hepática",
      mecanismoAcao: "Tripeptídeo endógeno (L-glutamato, L-cisteína, glicina). Neutraliza espécies reativas de oxigênio (EROs) e sustenta a conjugação hepática de Fase II mediada pela GST.",
      tags: ["Antioxidante Mestre", "Detoxificação Fase II", "Bolus IV"],
      cofatores: ["N-Acetilcisteína (NAC)", "Selênio", "Ácido Alfa-Lipóico"],
      sistema: "digestorio",
      targetMesh: "liver",
      pkData: {
        route: "IV",
        vd: 15,
        halfLife: 0.25,
        dose: 1200,
        ka: 0.0,
        targetOrgan: "liver"
      }
    }
  ]
};

// =========================================================================
// RETROCOMPATIBILIDADE GLOBAL
// =========================================================================
const BioDatabase = {
  protocols: ATLAS_DATABASE.protocols,
  sistemas: ATLAS_DATABASE.sistemas,
  viasAdministracao: ATLAS_DATABASE.viasAdministracao,
  processos: ATLAS_DATABASE.processos,
  alvosMoleculares: ATLAS_DATABASE.alvosMoleculares
};

if (typeof window !== "undefined") {
  window.ATLAS_DATABASE = ATLAS_DATABASE;
  window.BioDatabase = BioDatabase;
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/data/bio-database.js                         */
/* ========================================================================= */

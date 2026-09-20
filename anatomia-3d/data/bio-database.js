/* ========================================================================= */
/* ARQUIVO: anatomia-3d/data/bio-database.js                               */
/* ========================================================================= */

/**
 * BASE DE DADOS INTEGRADA: ATLAS ANATÔMICO, FISIOLOGIA & BIOHACKING
 * Ecossistema LAIFT - Módulo Master 3D
 * Consolidação: 10 Sistemas (Macro), Timelines Fisiológicas (Meso),
 * PDBs Cristalográficos e Patógenos (Micro/Nano) e Otimização Celular.
 */

const ATLAS_DATABASE = {
  // =========================================================================
  // 1. SISTEMAS ANATÔMICOS COMPLETOS (NÍVEL 1: MACRO)
  // =========================================================================
  sistemas: [
    {
      id: "digestorio",
      nome: "Sistema Digestório",
      icone: "🍽️",
      cor: "#f97316",
      focoCamera: { x: 0, y: 1.05, z: 2.2 },
      targetLook: { x: 0, y: 0.95, z: 0 },
      orgaos: ["Boca", "Faringe", "Esôfago", "Estômago", "Fígado", "Vesícula Biliar", "Pâncreas", "Intestino Delgado", "Cólon", "Reto"],
      meshKeywords: ["digest", "stomach", "liver", "esophag", "intestin", "oral", "pancrea", "gall"],
      descricao: "Responsável pela preensão, motilidade propulsiva, clivagem enzimática de macromoléculas, absorção enteral e excreção fecal.",
      processosDisponiveis: ["degluticao_humana", "peristaltismo_intestinal"]
    },
    {
      id: "cardiovascular",
      nome: "Sistema Cardiovascular",
      icone: "❤️",
      cor: "#ef4444",
      focoCamera: { x: 0.08, y: 1.25, z: 1.85 },
      targetLook: { x: 0, y: 1.2, z: 0 },
      orgaos: ["Coração", "Aorta Ascendente", "Artérias Coronárias", "Veias Cavas", "Circulação Pulmonar", "Microvasculatura"],
      meshKeywords: ["heart", "aort", "arter", "vein", "cardio", "vascular", "ventric"],
      descricao: "Circuito hemodinâmico de distribuição convectiva de oxigênio, substratos energéticos, remoção de CO₂ e transporte de hormônios e xenobióticos.",
      processosDisponiveis: ["ciclo_cardiaco"]
    },
    {
      id: "nervoso",
      nome: "Sistema Nervoso",
      icone: "🧠",
      cor: "#38bdf8",
      focoCamera: { x: 0, y: 1.75, z: 1.75 },
      targetLook: { x: 0, y: 1.7, z: 0 },
      orgaos: ["Encéfalo", "Córtex Cerebral", "Tronco Encefálico", "Cerebelo", "Medula Espinhal", "Plexos Autonômicos"],
      meshKeywords: ["brain", "cerebr", "nerve", "spinal", "neural", "cortex"],
      descricao: "Coordenação neuroelétrica de alta velocidade, processamento somatossensorial, regulação autonômica simpática/parassimpática e cognição.",
      processosDisponiveis: ["sinapse_colinergica"]
    },
    {
      id: "respiratorio",
      nome: "Sistema Respiratório",
      icone: "🫁",
      cor: "#06b6d4",
      focoCamera: { x: 0, y: 1.3, z: 1.95 },
      targetLook: { x: 0, y: 1.25, z: 0 },
      orgaos: ["Cavidade Nasal", "Laringe", "Traqueia", "Árvore Brônquica", "Pulmões", "Membrana Alvéolo-Capilar"],
      meshKeywords: ["lung", "trachea", "bronch", "laryn", "pulmo", "respir", "pleura"],
      descricao: "Hematose alveolar primária, difusão passiva gasosa, regulação tampão do equilíbrio acidobásico e fonação.",
      processosDisponiveis: []
    },
    {
      id: "urinario",
      nome: "Sistema Renal & Urinário",
      icone: "💧",
      cor: "#eab308",
      focoCamera: { x: 0, y: 0.95, z: 1.9 },
      targetLook: { x: 0, y: 0.9, z: 0 },
      orgaos: ["Rins", "Córtex Renal", "Néfrons", "Glomérulos", "Ureteres", "Bexiga Urinária", "Uretra"],
      meshKeywords: ["kidney", "renal", "ureter", "bladder", "urin", "nephr"],
      descricao: "Ultrafiltração plasmática, reabsorção tubular seletiva, depuração de xenobióticos polares e homeostase hidroeletrolítica.",
      processosDisponiveis: ["filtracao_glomerular"]
    },
    {
      id: "musculoesqueletico",
      nome: "Sistema Musculoesquelético",
      icone: "🦴",
      cor: "#a855f7",
      focoCamera: { x: 0, y: 1.1, z: 2.8 },
      targetLook: { x: 0, y: 1.0, z: 0 },
      orgaos: ["Esqueleto Axial", "Esqueleto Apendicular", "Fáscias Musculares", "Músculo Estriado Esquelético", "Tendões", "Articulações"],
      meshKeywords: ["bone", "skelet", "muscl", "tendon", "femur", "tibia", "spine"],
      descricao: "Suporte biomecânico, alavancas locomotoras, proteção de órgãos vitais e reserva mineral de cálcio e fosfato inorgânico.",
      processosDisponiveis: []
    },
    {
      id: "endocrino",
      nome: "Sistema Endócrino",
      icone: "🧪",
      cor: "#ec4899",
      focoCamera: { x: 0, y: 1.35, z: 1.8 },
      targetLook: { x: 0, y: 1.3, z: 0 },
      orgaos: ["Hipotálamo", "Hipófise", "Tireoide", "Paratireoides", "Suprarrenais", "Ilhotas Pancreáticas", "Gônadas"],
      meshKeywords: ["thyroid", "adrenal", "pituit", "hormon", "endocrin"],
      descricao: "Comunicação parácrina e hormonal de médio/longo prazo regulando metabolismo basal, glicemia, osmolaridade e resposta ao estresse.",
      processosDisponiveis: []
    },
    {
      id: "imunologico",
      nome: "Sistema Linfático & Imunológico",
      icone: "🛡️",
      cor: "#10b981",
      focoCamera: { x: 0, y: 1.15, z: 2.1 },
      targetLook: { x: 0, y: 1.1, z: 0 },
      orgaos: ["Linfonodos", "Baço", "Timo", "Medula Óssea", "Vasos Linfáticos", "Placas de Peyer"],
      meshKeywords: ["lymph", "spleen", "thymus", "node", "immune"],
      descricao: "Vigilância imunológica, drenagem de fluido intersticial, maturação de linfócitos T/B e apresentação de antígenos.",
      processosDisponiveis: []
    },
    {
      id: "tegumentar",
      nome: "Sistema Tegumentar",
      icone: "🧴",
      cor: "#fbbf24",
      focoCamera: { x: 0, y: 1.1, z: 2.5 },
      targetLook: { x: 0, y: 1.0, z: 0 },
      orgaos: ["Epiderme", "Derme", "Hipoderme", "Glândulas Sudoríparas", "Folículos Pilosos"],
      meshKeywords: ["skin", "derma", "integum", "epiderm"],
      descricao: "Barreira física e antimicrobiana primária, termorregulação via sudorese e síntese cutânea de colecalciferol (vitamina D3).",
      processosDisponiveis: []
    },
    {
      id: "reprodutor",
      nome: "Sistema Reprodutor",
      icone: "🧬",
      cor: "#6366f1",
      focoCamera: { x: 0, y: 0.75, z: 1.9 },
      targetLook: { x: 0, y: 0.7, z: 0 },
      orgaos: ["Gônadas", "Trato Genital", "Estruturas Genitais Externas"],
      meshKeywords: ["reprod", "genit", "pelvis", "uter", "testi"],
      descricao: "Gametogênese, secreção de esteroides sexuais e perpetuação biológica da espécie.",
      processosDisponiveis: []
    }
  ],

  // =========================================================================
  // 2. PROCESSOS FISIOLÓGICOS DINÂMICOS (NÍVEL 2: MESO / TIMELINE)
  // =========================================================================
  processos: {
    "degluticao_humana": {
      id: "degluticao_humana",
      titulo: "Fisiologia da Deglutição Humana",
      sistema: "digestorio",
      descricao: "Coordenação reflexa motora e mecânica de transporte do bolo alimentar da cavidade oral até a cárdia gástrica.",
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
      descricao: "Sequência cíclica de eventos bioelétricos, pressóricos e volumétricos que determinam o débito cardíaco.",
      etapas: [
        {
          ordem: 1,
          fase: "Sístole Atrial (Despolarização)",
          duracaoMs: 800,
          descricao: "O Nó Sinoatrial despolariza o sincício atrial (Onda P). Enchimento ativo final (20-30%) do volume diastólico final ventricular.",
          nervos: "Tônus Vagal basal vs Condução Internodal",
          musculos: "Miocárdio Atrial Direito e Esquerdo",
          acaoParticulas: "atria_to_ventricle",
          enzimas: []
        },
        {
          ordem: 2,
          fase: "Contração Isovolumétrica",
          duracaoMs: 400,
          descricao: "O estímulo percorre as fibras de Purkinje (Complexo QRS). Pressão intraventricular supera a atrial, fechando as valvas AV (Mitral e Tricúspide - 1ª Bulha B1).",
          nervos: "Condução rápida via Canais de Sódio Nav1.5",
          musculos: "Ventrículos (Músculos Papilares e Parede Livre)",
          acaoParticulas: "ventricle_pressurize",
          enzimas: ["SERCA2a (Bomba Ca2+ do Retículo Sarcoplasmático)"]
        },
        {
          ordem: 3,
          fase: "Ejeção Ventricular Rápida",
          duracaoMs: 1200,
          descricao: "Pressão ventricular ultrapassa as pressões aórtica (>80 mmHg) e pulmonar (>10 mmHg). Abertura das valvas semilunares e ejeção do volume sistólico (~70 mL).",
          nervos: "Modulação Inotrópica Positiva Beta-1 Adrenérgica",
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
      descricao: "Propulsão anal rítmica do quimo alimentar mediada pelo Complexo Motor Migratório e plexos intrínsecos.",
      etapas: [
        {
          ordem: 1,
          fase: "Contração a Montante",
          duracaoMs: 1500,
          descricao: "Neurônios sensoriais entéricos detectam distensão mecânica. Liberação de Substância P e Acetilcolina antes do bolo, contraindo o músculo circular.",
          nervos: "Plexo de Auerbach (Colinérgico)",
          musculos: "Camada Circular Interna do Intestino",
          acaoParticulas: "quimo_propulsion",
          enzimas: ["Enteropeptidase (Ativadora do Tripsinogênio)"]
        },
        {
          ordem: 2,
          fase: "Relaxamento a Jusante",
          duracaoMs: 1500,
          descricao: "Liberação coordenada de Óxido Nítrico (NO) e Peptídeo Intestinal Vasoativo (VIP) adiante do bolo, permitindo a progressão do quimo.",
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
          descricao: "Recuperação ativa de 65-70% do sódio, água, glicose total (via SGLT2) e aminoácidos contra gradiente.",
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
      descricao: "Neurotransmissão química na fenda sináptica e degradação enzimática da acetilcolina.",
      etapas: [
        {
          ordem: 1,
          fase: "Despolarização e influxo de Cálcio",
          duracaoMs: 500,
          descricao: "O potencial de ação alcança o terminal axonal pré-sináptico, ativando canais de cálcio dependentes de voltagem (Cav2.1).",
          nervos: "Neurônio Motor Somático",
          musculos: "Placa Motora Terminal",
          acaoParticulas: "synapse_calcium",
          enzimas: ["Colina Acetiltransferase (ChAT)"]
        },
        {
          ordem: 2,
          fase: "Exocitose e Degradação por AChE",
          duracaoMs: 1500,
          descricao: "Fusão de vesículas SNAP/SNARE e liberação de acetilcolina. Ativação de receptores nicotínicos e hidrólise imediata por AChE.",
          nervos: "Receptores Nicotínicos e Muscarínicos M1-M5",
          musculos: "Sarcolema Muscular",
          acaoParticulas: "synapse_ache_cleave",
          enzimas: ["Acetilcolinesterase (PDB: 4EY7)"]
        }
      ]
    }
  },

  // =========================================================================
  // 3. ENZIMAS, CRISTALOGRAFIA & PATÓGENOS (NÍVEL 3 & 4: MICRO / NANO)
  // =========================================================================
  alvosMoleculares: [
    {
      id: "ptialina",
      nome: "Amilase Salivar (Ptialina)",
      tipo: "enzima",
      pdbId: "1SMD",
      sistema: "digestorio",
      funcao: "Endoamilase cálcio-dependente que cliva ligações glicosídicas alfa-1,4 do amido na cavidade oral, gerando maltose e maltotriose.",
      liganteFarmaco: "Acarbose (Inibidor da Alfa-Amilase)",
      quimica: { formula: "C25H43NO18", pesoMolecular: "645.6 g/mol", classe: "Hidrolase (EC 3.2.1.1)" }
    },
    {
      id: "pepsina",
      nome: "Pepsina Gástrica",
      tipo: "enzima",
      pdbId: "4PEP",
      sistema: "digestorio",
      funcao: "Endopeptidase ácida aspartato; degradação de ligações peptídicas aromáticas (Phe, Trp, Tyr) no antro e corpo gástrico.",
      liganteFarmaco: "Pepstatina A (Inibidor Específico)",
      quimica: { formula: "C34H63N5O9", pesoMolecular: "685.9 g/mol", pH_otimo: "1.5 - 2.0" }
    },
    {
      id: "h_pylori",
      nome: "Urease de Helicobacter pylori",
      tipo: "patogeno",
      pdbId: "1E9Z",
      sistema: "digestorio",
      funcao: "Complexo enzimático níquel-dependente de 540 kDa. Converte ureia em amônia e dióxido de carbono, alcalinizando a microzona da mucosa e promovendo lesão ulcerosa.",
      liganteFarmaco: "Claritromicina + Amoxicilina + Omeprazol (Tríplice Terapia)",
      quimica: { subunidades: "Alfa (26 kDa) e Beta (61 kDa)", patogenicidade: "Colonização gástrica profunda" }
    },
    {
      id: "cox2",
      nome: "Ciclooxigenase-2 (COX-2)",
      tipo: "enzima",
      pdbId: "3LN1",
      sistema: "cardiovascular",
      funcao: "Oxigenase indutível por citocinas inflamatórias. Converte ácido araquidônico em prostaglandina H2 (PGH2), mediando dor, hiperalgesia e vasodilatação.",
      liganteFarmaco: "Celecoxibe (Complexo Co-Cristalizado no Sítio Ativo)",
      quimica: { formula: "C17H14F3N3O2S", pesoMolecular: "381.4 g/mol", seletividade: "COX-2 / COX-1 > 30x" }
    },
    {
      id: "ache",
      nome: "Acetilcolinesterase (AChE)",
      tipo: "enzima",
      pdbId: "4EY7",
      sistema: "nervoso",
      funcao: "Serina hidrolase com velocidade catalítica ultra-rápida ($k_{cat} \\approx 25.000\\ s^{-1}$). Cliva acetilcolina na fenda sináptica motora e autonômica.",
      liganteFarmaco: "Donepezila / Pralidoxima (Reativador Enzimático de Organofosforados)",
      quimica: { sitio_ativo: "Tríade Catalítica Ser200-His440-Glu327", inibidores: "Organofosforados e Carbamatos" }
    },
    {
      id: "sars_cov2_mpro",
      nome: "Protease Principal Mpro (SARS-CoV-2)",
      tipo: "patogeno",
      pdbId: "7VH8",
      sistema: "respiratorio",
      funcao: "Cisteína protease essencial para clivagem das poliproteínas pp1a e pp1ab em proteínas não-estruturais necessárias para replicação do RNA viral.",
      liganteFarmaco: "Nirmatrelvir (Paxlovid)",
      quimica: { diade_catalitica: "Cys145 e His41", tipo: "Quimioterápico Antiviral" }
    },
    {
      id: "bomba_na_k",
      nome: "Bomba Sódio-Potássio (Na+/K+-ATPase)",
      tipo: "enzima",
      pdbId: "3B8E",
      sistema: "urinario",
      funcao: "Transportador ativo primário P-ATPase. Move 3 Na+ para o meio extracelular e 2 K+ para o citoplasma consumindo 1 ATP, mantendo a voltagem transmembrana.",
      liganteFarmaco: "Digoxina / Ouabaína (Glicosídeos Cardiotônicos)",
      quimica: { estequiometria: "3Na+ : 2K+ : 1ATP", gradiente: "Base para transporte secundário de glicose e cálcio" }
    },
    {
      id: "complexo_1_mito",
      nome: "NADH:Ubiquinona Oxidorredutase (Complexo I)",
      tipo: "enzima",
      pdbId: "5LUF",
      sistema: "cardiovascular",
      funcao: "Maior enzima da cadeia de fosforilação oxidativa mitocondrial. Transfere elétrons do NADH para a Coenzima Q10, bombeando 4 prótons para o espaço intermembrana.",
      liganteFarmaco: "Metformina (Inibidor Parcial) / Rotenona (Tóxico)",
      quimica: { massa: "1 MDa", centros_redox: "Centros Ferro-Enxofre (Fe-S) e FMN" }
    },
    {
      id: "cyp3a4",
      nome: "Citocromo P450 3A4 (CYP3A4)",
      tipo: "enzima",
      pdbId: "1TQN",
      sistema: "digestorio",
      funcao: "Hemo-monooxigenase microssomal hepática e intestinal. Responsável pela biotransformação oxidativa de mais de 50% de todos os medicamentos terapêuticos.",
      liganteFarmaco: "Claritromicina / Cetoconazol (Inibidores Potentes de Fase I)",
      quimica: { grupo_prostetico: "Heme Fe-protoporfirina IX", localizacao: "Retículo Endoplasmático Liso" }
    }
  ],

  // =========================================================================
  // 4. PROTOCOLOS DE BIOHACKING & OTIMIZAÇÃO CELULAR (RETROCOMPATÍVEL)
  // =========================================================================
  protocols: [
    {
      id: "bio_mag_treonato",
      nome: "Magnésio L-Treonato",
      icone: "🧠",
      viaMetabolica: "Neuroplasticidade e Densidade Sináptica",
      mecanismoAcao: "Sal de magnésio quelado com ácido L-treônico. Atravessa ativamente a barreira hematoencefálica (BHE) via transportadores específicos de alta afinidade, otimizando o potencial de repouso neuronal e os receptores NMDA na memória de trabalho.",
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
      mecanismoAcao: "Forma reduzida e bioativa da CoQ10. Atua no complexo I e II da membrana mitocondrial interna, aceitando elétrons e transferindo-os para o complexo III. Essencial para a fosforilação oxidativa e aumento da síntese de ATP miocárdico.",
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
      mecanismoAcao: "Cofator redox e ativador das vias celulares PGC-1α e CREB. Induz a proliferação espontânea de novas mitocôndrias em tecidos de alta demanda energética, multiplicando a taxa de fosforilação oxidativa e protegendo o DNA mitocondrial.",
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
      mecanismoAcao: "Magnésio duplamente quelado a moléculas de glicina. Absorção transcelular via transportadores peptídicos PEPT1 no intestino delgado, evitando competição com cálcio pelos canais iônicos TRPM6. Suporte a mais de 300 reações enzimáticas ATP-dependentes.",
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
      mecanismoAcao: "Armazenada nos miócitos sob a forma de fosfocreatina. Doador rápido de fosfato para regeneração direta de ADP em ATP via creatina quinase (CK) em esforços de explosão. Promove retenção hídrica intracelular anabólica.",
      tags: ["Ergogênico", "Ressíntese de ATP", "Músculo Esquelético"],
      cofatores: ["Carboidratos Simples (Insulina-Dependentes)", "Sódio"],
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
      mecanismoAcao: "Zinco quelado com ácido picolínico. Apresenta translocação intracelular aprimorada, atuando como centro catalítico e estrutural de metaloenzimas essenciais, RNA polimerases, SOD1 (superóxido dismutase) e na maturação de linfócitos T auxiliares.",
      tags: ["Sistema Imunológico", "Síntese Proteica", "Cofator Metaloenzima"],
      cofatores: ["Cobre", "Vitamina C", "Quercetina"],
      sistema: "imunologico",
      targetMesh: "bone",
      pkData: {
        route: "ORAL",
        vd: 60,
        halfLife: 280,
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
      mecanismoAcao: "Tripeptídeo endógeno (L-glutamato, L-cisteína e glicina). Principal neutralizador de Espécies Reativas de Oxigênio (EROs). A administração intravenosa contorna a degradação gástrica, sustentando as reações de conjugação hepática de Fase II mediadas pela Glutationa S-Transferase (GST).",
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
// RETROCOMPATIBILIDADE ABSOLUTA
// =========================================================================
const BioDatabase = {
  protocols: ATLAS_DATABASE.protocols
};

if (typeof window !== "undefined") {
  window.ATLAS_DATABASE = ATLAS_DATABASE;
  window.BioDatabase = BioDatabase;
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/data/bio-database.js                         */
/* ========================================================================= */

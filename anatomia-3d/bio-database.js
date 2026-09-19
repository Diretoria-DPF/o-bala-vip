/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/data/bio-database.js                       */
/* ========================================================================= */

/**
 * BASE DE DADOS NATIVA DE BIOHACKING E OTIMIZAÇÃO CELULAR
 * Ecossistema LAIFT - Módulo Anatomia 3D
 * Contém parâmetros termodinâmicos, vias de absorção, sinergias minerais 
 * e dados farmacocinéticos (PK) para simulação 3D.
 */

const BioDatabase = {
  protocols: [
    // ---------------------------------------------------------
    // OTIMIZAÇÃO NEUROCOGNITIVA & BARREIRA HEMATOENCEFÁLICA
    // ---------------------------------------------------------
    {
      id: "bio_mag_treonato",
      nome: "Magnésio L-Treonato",
      icone: "🧠",
      viaMetabolica: "Neuroplasticidade e Densidade Sináptica",
      mecanismoAcao: "Sal de magnésio quelado com ácido L-treónico. Único composto de magnésio comprovado por cruzar eficientemente a barreira hematoencefálica (BHE) via transportadores específicos de alta afinidade, otimizando o potencial de repouso neuronal e a memória de trabalho.",
      tags: ["Nootrópico", "Mineral Quelado", "SNC", "Alta Biodisponibilidade"],
      cofatores: ["Vitamina B6 (Piridoxal-5-Fosfato)", "Zinco", "Vitamina D3"],
      pkData: {
        route: "ORAL",
        vd: 35,         // Volume de distribuição centralizado no SNC
        halfLife: 5.5,  // Meia-vida biológica em horas
        dose: 2000,     // Dose usual em mg (cerca de 144mg de Mg elementar)
        ka: 1.8,        // Constante de absorção (rápida captação)
        targetOrgan: "brain" // Gatilho para o Three.js iluminar o cérebro
      }
    },

    // ---------------------------------------------------------
    // OTIMIZAÇÃO MITOCONDRIAL & ENERGIA CELULAR (ATP)
    // ---------------------------------------------------------
    {
      id: "bio_coq10_ubiquinol",
      nome: "Coenzima Q10 (Ubiquinol)",
      icone: "⚡",
      viaMetabolica: "Cadeia Transportadora de Eletrões (Mitocôndria)",
      mecanismoAcao: "Forma reduzida e metabolicamente ativa da CoQ10. Atua no complexo I e II da membrana mitocondrial interna, aceitando eletrões e transferindo-os para o complexo III. Essencial para a fosforilação oxidativa e aumento massivo da síntese de ATP, além de neutralizar radicais livres intramitocondriais.",
      tags: ["Bioenergética", "Anti-aging", "Fosforilação Oxidativa", "Lipofílico"],
      cofatores: ["PQQ (Pirroloquinolina Quinona)", "L-Carnitina", "Magnésio"],
      pkData: {
        route: "ORAL",
        vd: 120,        // Ampla distribuição tecidual (altamente lipofílico)
        halfLife: 33,   // Eliminação lenta
        dose: 200,      
        ka: 0.5,        // Absorção lenta e dependente da presença de lípidos
        targetOrgan: "heart" // Acumula-se fortemente no músculo cardíaco e fígado
      }
    },
    {
      id: "bio_pqq",
      nome: "PQQ (Pirroloquinolina Quinona)",
      icone: "🔋",
      viaMetabolica: "Biogénese Mitocondrial",
      mecanismoAcao: "Cofator redox e ativador das vias de sinalização celular PGC-1α e CREB. Induz a proliferação espontânea de novas mitocôndrias no interior das células envelhecidas, multiplicando o rendimento energético e protegendo o DNA mitocondrial do stress oxidativo.",
      tags: ["Biogénese", "Fator de Transcrição", "Neuroproteção"],
      cofatores: ["Ubiquinol", "Ácido Alfa-Lipóico (ALA)"],
      pkData: {
        route: "ORAL",
        vd: 45,
        halfLife: 4.2,
        dose: 20,
        ka: 2.1,
        targetOrgan: "liver" // Metabolismo hepático ativo
      }
    },

    // ---------------------------------------------------------
    // RECUPERAÇÃO MUSCULAR & TRANSPORTE PARACELULAR
    // ---------------------------------------------------------
    {
      id: "bio_mag_bisglicinato",
      nome: "Magnésio Bisglicinato",
      icone: "💪",
      viaMetabolica: "Relaxamento Neuromuscular e Glicólise",
      mecanismoAcao: "Magnésio duplamente quelado a moléculas de glicina. Utiliza os transportadores de dipeptídeos no intestino delgado (absorção transcelular), evitando a competição com outros minerais pelos canais catiónicos (TRPM6). Promove relaxamento muscular profundo e suporta a atividade de mais de 300 enzimas ATP-dependentes.",
      tags: ["Quelato Aminoácido", "Recuperação Física", "Sistema Nervoso Parassimpático"],
      cofatores: ["Taurina", "Cálcio", "Potássio"],
      pkData: {
        route: "ORAL",
        vd: 40,
        halfLife: 4.8,
        dose: 400,      // mg de magnésio elementar
        ka: 1.5,        // Absorção linear e sem efeito laxativo
        targetOrgan: "muscle" // Gatilho 3D para iluminar a musculatura esquelética
      }
    },
    {
      id: "bio_creatina_mono",
      nome: "Creatina Monohidratada",
      icone: "🏃",
      viaMetabolica: "Sistema Fosfogénio (ATP-CP)",
      mecanismoAcao: "Armazenada no músculo esquelético sob a forma de fosfocreatina. Atua como um doador ultrarrápido de grupos fosfato para regenerar o ADP em ATP durante esforços de alta intensidade e curta duração. Otimiza a performance física e apresenta propriedades osmóticas, promovendo hidratação intracelular.",
      tags: ["Ergogénico", "Ressíntese de ATP", "Músculo Esquelético"],
      cofatores: ["Insulina (Carboidratos simples)", "Sódio"],
      pkData: {
        route: "ORAL",
        vd: 100,
        halfLife: 3.0,
        dose: 5000,     // Dose de manutenção (5g)
        ka: 2.5,        // Absorção quase completa e rápida
        targetOrgan: "muscle" 
      }
    },

    // ---------------------------------------------------------
    // IMUNIDADE & OTIMIZAÇÃO ENZIMÁTICA
    // ---------------------------------------------------------
    {
      id: "bio_zinco_picolinato",
      nome: "Zinco Picolinato",
      icone: "🛡️",
      viaMetabolica: "Catálise Enzimática e Imunomodulação",
      mecanismoAcao: "Zinco ligado ao ácido picolínico (metabólito do triptofano). Apresenta a maior biodisponibilidade intracelular entre as formas de zinco, facilitando a passagem pelas membranas celulares. Essencial para a função da RNA polimerase, estabilidade das membranas e maturação de linfócitos T.",
      tags: ["Sistema Imunitário", "Transporte Intracelular", "Síntese Proteica"],
      cofatores: ["Cobre", "Vitamina C", "Quercetina"],
      pkData: {
        route: "ORAL",
        vd: 60,
        halfLife: 280,  // O zinco possui um pool de renovação muito lento no organismo
        dose: 30,
        ka: 1.2,
        targetOrgan: "bones" // Armazenado maioritariamente nos ossos e músculo
      }
    },

    // ---------------------------------------------------------
    // EXEMPLO DE VIA INTRAVENOSA (BOLUS)
    // ---------------------------------------------------------
    {
      id: "bio_glutationa_iv",
      nome: "Glutationa (GSH) Lipossomal / IV",
      icone: "🩸",
      viaMetabolica: "Sistema Antioxidante Mestre & Detoxificação Hepática",
      mecanismoAcao: "Tripéptido (glutamato, cisteína, glicina). Principal neutralizador de Espécies Reativas de Oxigénio (EROs) a nível celular. A administração IV bypassa a degradação proteolítica no trato gastrointestinal, garantindo entrega tecidual a 100% para suportar a conjugação de toxinas nas fases I e II do fígado.",
      tags: ["Antioxidante", "Detoxificação", "Bolus IV"],
      cofatores: ["N-Acetilcisteína (NAC)", "Selénio", "Vitamina C"],
      pkData: {
        route: "IV",    // Gatilho para o PKEngine desenhar a curva exponencial pura
        vd: 15,         // Distribuição extracelular inicial
        halfLife: 0.25, // Eliminação plasmática extremamente rápida (captação celular e oxidação)
        dose: 1200,
        ka: 0,          // Via IV não tem constante de absorção
        targetOrgan: "liver" 
      }
    }
  ]
};

// Exportação global
if (typeof window !== "undefined") {
  window.BioDatabase = BioDatabase;
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/data/bio-database.js                          */
/* ========================================================================= */

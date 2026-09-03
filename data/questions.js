/**
 * BANCO DE QUESTÕES COMENTADAS (FARMACOLOGIA BÁSICA & TOXICOLOGIA CLÍNICA)
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const allQuestions = [
  // =========================================================
  // MÓDULO 1: FARMACOLOGIA BÁSICA
  // =========================================================
  {
    id: 1,
    module: "farmaco",
    topic: "Farmacocinética",
    question: "Um fármaco com volume de distribuição aparente (Vd) de 0,1 L/kg em um adulto de 70 kg concentra-se primariamente em qual compartimento orgânico?",
    options: [
      "No compartimento vascular (plasma sanguíneo), apresentando alta ligação a proteínas plasmáticas.",
      "No tecido adiposo periférico, devido à alta lipossolubilidade da molécula.",
      "Nos fluidos intracelulares profundos e matriz óssea.",
      "Na circulação êntero-hepática, acumulando-se preferencialmente na bile."
    ],
    correct: 0,
    explanation: "Um volume de distribuição aparente próximo ao volume plasmático fisiológico (cerca de 3 a 5 litros, ou ~0,05 a 0,1 L/kg) indica que o fármaco está retido quase exclusivamente no leito vascular, geralmente devido ao elevado peso molecular ou à alta afinidade por proteínas plasmáticas como a albumina.",
    apiFallback: false
  },
  {
    id: 2,
    module: "farmaco",
    topic: "Farmacodinâmica",
    question: "Na curva dose-resposta gradual, a adição de um antagonista competitivo reversível causa qual alteração nos parâmetros farmacológicos do agonista?",
    options: [
      "Diminuição da eficácia máxima (Emax) sem alterar a potência (EC50).",
      "Desvio da curva para a direita, aumentando a EC50 (diminui potência) mantendo a mesma eficácia máxima (Emax).",
      "Desvio da curva para a esquerda com aumento da eficácia máxima.",
      "Supressão irreversível da resposta tecidual independentemente da concentração de agonista."
    ],
    correct: 1,
    explanation: "Antagonistas competitivos reversíveis competem pelo mesmo sítio ortostérico do receptor. O bloqueio pode ser superado pelo aumento da concentração do agonista (surmontable), o que preserva a resposta máxima (Emax), mas exige maiores concentrações para atingir 50% do efeito, aumentando o valor numérico da EC50.",
    apiFallback: false
  },
  {
    id: 3,
    module: "farmaco",
    topic: "Sistema Nervoso Autônomo",
    question: "A ativação de receptores adrenérgicos beta-1 no miocárdio desencadeia quais efeitos celulares via proteína Gs?",
    options: [
      "Ativação da fosfolipase C, acúmulo de IP3 e bloqueio dos canais de cálcio do retículo sarcoplasmático.",
      "Abertura de canais de potássio acoplados à Gi, causando hiperpolarização e bradicardia sinusal.",
      "Estimulação da adenilil ciclase, aumento dos níveis de AMP cíclico (AMPc) e ativação da Proteína Quinase A (PKA).",
      "Bloqueio da recaptação neuronal de noradrenalina no terminal axonal pré-sináptico."
    ],
    correct: 2,
    explanation: "Receptores beta-1 são acoplados à proteína heterotrimérica Gs. Sua estimulação ativa a adenilil ciclase, convertendo ATP em AMP cíclico intracelular. O AMPc ativa a PKA, fosforilando canais de cálcio do tipo L e fosfolambano, resultando em inotropismo, cronotropismo e dromotropismo positivos.",
    apiFallback: false
  },
  {
    id: 4,
    module: "farmaco",
    topic: "Anti-inflamatórios",
    question: "Qual o mecanismo farmacodinâmico responsável pela gastrolesividade e inibição da agregação plaquetária observadas no uso terapêutico de Ácido Acetilsalicílico (AAS)?",
    options: [
      "Bloqueio reversível da lipoxigenase com supressão de leucotrieno B4 e aumento de muco gástrico.",
      "Acetilação irreversível da serina-530 no sítio ativo da Ciclo-oxigenase-1 (COX-1), inibindo a síntese de TXA2 e prostaglandinas citoprotetoras.",
      "Inibição competitiva seletiva da COX-2 vascular endotelial, suprimindo prostaciclinas.",
      "Antagonismo direto dos receptores de tromboxano TP expressos na membrana do megacariócito."
    ],
    correct: 1,
    explanation: "O AAS liga-se covalentemente à COX-1 por acetilação do resíduo de serina 530. Como as plaquetas não possuem núcleo para sintetizar novas enzimas, a inibição da síntese de Tromboxano A2 (TXA2) é permanente durante toda a sobrevida celular (7 a 10 dias). No estômago, a supressão de PGE2 e PGI2 reduz a secreção de muco protetor e bicarbonato.",
    apiFallback: false
  },

  // =========================================================
  // MÓDULO 2: TOXICOLOGIA CLÍNICA & FORENSE
  // =========================================================
  {
    id: 201,
    module: "toxico",
    topic: "Antídotos & Fármacos",
    apiDrugQuery: "acetaminophen",
    question: "Na intoxicação aguda por superdosagem de Paracetamol (Acetaminofeno), qual alteração metabólica hepática é neutralizada pela N-Acetilcisteína (NAC)?",
    options: [
      "Acúmulo do metabólito reativo eletrofílico NAPQI por depleção das reservas de Glutationa (GSH).",
      "Inibição direta da glicuronidação pela ausência de cofatores enzimáticos microssomais.",
      "Bloqueio da conversão de paracetamol em sulfato no citosol das células de Kupffer.",
      "Superprodução mitocondrial de ácido úrico com necrose intersticial periportal."
    ],
    correct: 0,
    explanation: "Em doses tóxicas, as vias de sulfatação e glicuronidação saturam-se. A via do CYP2E1 produz grandes quantidades de NAPQI (N-acetil-p-benzoquinona imina). Esgotada a glutationa hepática em mais de 70%, o NAPQI liga-se covalentemente às macromoléculas celulares, causando necrose centrolobular massiva. A NAC restaura a glutationa e conjuga-se diretamente com o NAPQI.",
    apiFallback: true
  },
  {
    id: 202,
    module: "toxico",
    topic: "Toxicologia Ocupacional & Praguicidas",
    question: "Qual o antídoto específico empregado para reverter a síndrome colinérgica muscarínica (broncorreia, broncoespasmo, bradicardia) causada por organofosforados?",
    options: [
      "Flumazenil, por antagonismo dos receptores GABA-A centrais.",
      "Sulfato de Atropina, por antagonismo competitivo dos receptores muscarínicos.",
      "Naloxona, por bloqueio dos receptores mu-opioides periféricos.",
      "Azul de Metileno, por restauração do ferro férrico da hemoglobina a ferro ferroso."
    ],
    correct: 1,
    explanation: "A atropina é um antagonista competitivo dos receptores colinérgicos muscarínicos pós-ganglionares. Na intoxicação por inibidores da colinesterase, sua administração endovenosa deve ser titulada rapidamente até o controle da broncorreia e da hipersecreção pulmonar (critério de atropinização efetiva).",
    apiFallback: true
  },
  {
    id: 203,
    module: "toxico",
    topic: "Antídotos & Fármacos",
    apiDrugQuery: "diazepam",
    question: "Qual risco clínico grave limita o uso rotineiro do antagonista Flumazenil em pacientes com rebaixamento de consciência e suspeita de superdosagem mista?",
    options: [
      "Desenvolvimento de hipertensão maligna associada a acidente vascular encefálico hemorrágico.",
      "Precipitação de crises convulsivas refratárias e arritmias ventriculares, especialmente na coingestão com Antidepressivos Tricíclicos.",
      "Hepatotoxicidade fulminante decorrente da indução microssomal acelerada de metabólitos tóxicos.",
      "Depressão respiratória paradoxal por bloqueio competitivo do centro bulbar respiratório."
    ],
    correct: 1,
    explanation: "O Flumazenil bloqueia reversivelmente o sítio benzodiazepínico no complexo GABA-A. Em usuários crônicos de benzodiazepínicos, pode precipitar abstinência grave com convulsões. Em intoxicações mistas com antidepressivos tricíclicos ou agentes pró-convulsivantes, a perda da inibição GABAérgica desmascara arritmias cardíacas graves e estado de mal epiléptico de difícil controle.",
    apiFallback: true
  },
  {
    id: 204,
    module: "toxico",
    topic: "Metais Pesados & Toxicocinética",
    question: "O mecanismo patogênico da intoxicação aguda por Chumbo (Saturnismo) no sistema hematopoiético decorre principalmente da inibição de quais enzimas da síntese do heme?",
    options: [
      "ALA-desidratase (Ácido Delta-Aminolevulínico Desidratase) e Ferroquelatase.",
      "Ciclo-oxigenase plaquetária e Protoporfirinogênio Oxidase.",
      "Glicose-6-Fosfato Desidrogenase (G6PD) e Citocromo C Redutase.",
      "Metemoglobina Redutase dependente de NADH e Tirosina Quinase."
    ],
    correct: 0,
    explanation: "O chumbo tem alta afinidade por grupamentos sulfidrila (-SH). Ele inibe a enzima citosólica ALA-desidratase (provocando acúmulo de ALA plasmático/urinário) e a enzima mitocondrial ferroquelatase (impedindo a inserção do ferro ferroso na protoporfirina IX, formando a zinco-protoporfirina). O quadro hematológico clássico é uma anemia microcítica e hipocrômica com pontilhado basófilo nas hemácias.",
    apiFallback: false
  }
];

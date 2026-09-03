/**
 * BANCO DE DADOS DE CASOS CLÍNICOS E AMBULATORIAIS (OSCE VIRTUAL)
 * Liga Acadêmica Interdisciplinar de Farmacologia e Toxicologia (LAIFT)
 */

const clinicalCases = [
  {
    id: "caso_tox_01",
    titulo: "Emergência Toxicológica: Lavoura e Insuficiência Respiratória",
    tipo: "emergencia", // 'emergencia' (risco de morte/vitalidade) ou 'ambulatorio' (risco de abandono/paciência)
    vitalidadeInicial: 75,
    pacienciaInicial: 85,
    taxaDecaimento: {
      vitalidadePorMinuto: 4,
      pacienciaPorMinuto: 2
    },
    paciente: {
      nome: "Agenor Silveira",
      idade: 52,
      peso: "72 kg",
      genero: "Masculino",
      profissao: "Trabalhador Rural",
      alergias: "Nenhuma conhecida",
      imagem: "👤"
    },
    sinaisVitais: {
      pa: "90/60 mmHg",
      fc: "42 bpm",
      fr: "30 irpm",
      temp: "36.2 °C",
      spo2: "84% (ar ambiente)",
      glasgow: "12 (Abertura ocular ao estímulo verbal, resposta verbal confusa)"
    },
    queixaPrincipal: "Tô sufocando... minhas vistas tão fechando... muita baba saindo... fraqueza nas pernas...",
    historicoAdmissao: "Paciente trazido às pressas por colega de trabalho após colapso em campo de cultivo de milho. Colega relata que ele aplicava defensivos agrícolas costais sob sol intenso e começou a vomitar, tremer e perder as forças há cerca de 40 minutos.",
    
    // Contexto confidencial injetado no System Prompt do Gemini para guiar a atuação
    contextoOculto: {
      nome: "Agenor",
      idade: 52,
      exposicaoReal: "Pulverizou inseticida organofosforado (Metamidofós) sem máscara respiratória e com camisa de algodão encharcada pelo produto.",
      sintomas: "Hipersalivação copiosa, broncorreia, broncoespasmo severo, miose puntiforme bilateral, fasciculações musculares e bradicardia.",
      comportamento: "Extremamente angustiado, sentindo sensação iminente de morte por afogamento em secreções.",
      regrasFala: "Fale com fala entrecortada, gaguejando pelo cansaço respiratório. Se perguntarem o que usou, diga: 'Era um remédio de bicho pro mato com cheiro forte de alho podre... não lembro o nome do rótulo'."
    },

    perguntasSugeridas: [
      "Qual produto químico ou veneno o senhor estava aplicando?",
      "O senhor usava máscara, luvas e macacão de proteção impermeável?",
      "Há quanto tempo os sintomas de falta de ar e salivação começaram?",
      "O produto entrou em contato direto com sua pele ou roupas?"
    ],

    examesDisponiveis: [
      {
        id: "colinesterase",
        nome: "Atividade da Colinesterase Plasmática e Eritrocitária",
        custoTempoMin: 10,
        impactoVitalidade: 0,
        impactoPaciencia: -2,
        essencial: true,
        resultado: "Colinesterase Plasmática: 980 U/L (Referência: 4.650 a 10.440 U/L). Inibição severa (>80%) compatível com síndrome colinérgica aguda."
      },
      {
        id: "gasometria",
        nome: "Gasometria Arterial",
        custoTempoMin: 5,
        impactoVitalidade: 0,
        impactoPaciencia: -2,
        essencial: true,
        resultado: "pH: 7.21 | PaCO2: 56 mmHg | PaO2: 54 mmHg | HCO3-: 22 mEq/L | SatO2: 83%. Acidose respiratória descompensada com hipoxemia grave."
      },
      {
        id: "ecg",
        nome: "Eletrocardiograma (ECG)",
        custoTempoMin: 3,
        impactoVitalidade: 0,
        impactoPaciencia: -1,
        essencial: true,
        resultado: "Bradicardia sinusal acentuada (40 bpm), intervalo PR limítrofe, sem supradesnível de segmento ST ou extrassístoles ventriculares."
      },
      {
        id: "hemograma",
        nome: "Hemograma Completo",
        custoTempoMin: 15,
        impactoVitalidade: -2,
        impactoPaciencia: -5,
        essencial: false,
        resultado: "Hemoglobina: 14.2 g/dL | Hematócrito: 43% | Leucócitos: 9.100/mm³ (Sem desvio) | Plaquetas: 220.000/mm³."
      },
      {
        id: "tomografia",
        nome: "Tomografia Computadorizada de Crânio",
        custoTempoMin: 25,
        impactoVitalidade: -10, // Tempo perdido transportando paciente instável
        impactoPaciencia: -15,
        essencial: false,
        resultado: "Ausência de hemorragias agudas, desvios de linha média ou lesões isquêmicas expansivas. Exame sem relevância diagnóstica imediata."
      }
    ],

    gabaritoPreceptor: {
      diagnostico: "Intoxicação exógena aguda grave por inseticida inibidor da acetilcolinesterase (Organofosforado) manifestando Síndrome Colinérgica (efeitos muscarínicos e nicotínicos preponderantes).",
      conduta: "Desobstrução imediata de vias aéreas com aspiração de secreções e oxigenoterapia de alto fluxo; Administração endovenosa imediata de ATROPINA (1 a 2 mg a cada 5-10 minutos) titulada até a cessação da broncorreia e roncos pulmonares (atropinização); Remoção imediata de roupas contaminadas e lavagem dérmica vigorosa com água corrente e sabão; Avaliação precoce do uso de PRALIDOXIMA (reativador de colinesterase) antes do envelhecimento enzimático.",
      palavrasChave: ["atropina", "organofosforado", "colinergica", "descontaminacao", "oxigenio", "pralidoxima", "broncorreia"]
    }
  },

  {
    id: "caso_clin_02",
    titulo: "Farmácia Clínica Ambulatorial: Fadiga Muscular e Urina Escura",
    tipo: "ambulatorio",
    vitalidadeInicial: 90,
    pacienciaInicial: 80,
    taxaDecaimento: {
      vitalidadePorMinuto: 1,
      pacienciaPorMinuto: 6 // Decai mais rápido por frustração e cansaço
    },
    paciente: {
      nome: "Marilene Fontes",
      idade: 61,
      peso: "68 kg",
      genero: "Feminino",
      profissao: "Professora Aposentada",
      alergias: "Dipirona",
      imagem: "👵"
    },
    sinaisVitais: {
      pa: "135/85 mmHg",
      fc: "76 bpm",
      fr: "16 irpm",
      temp: "36.6 °C",
      spo2: "97% (ar ambiente)",
      glasgow: "15 (Lúcida, orientada, queixosa de fadiga intensa)"
    },
    queixaPrincipal: "Doutor(a), mal consigo levantar os braços para escovar os dentes... e hoje cedo minha urina saiu escura como café forte.",
    historicoAdmissao: "Comparece ao ambulatório caminhando com passos curtos e auxílio da filha. Relata dores musculares difusas e perda acentuada de força nos membros superiores e coxas há 3 dias. Refere ter tratado uma infecção pulmonar recentemente.",
    
    contextoOculto: {
      nome: "Marilene",
      idade: 61,
      exposicaoReal: "Usa Sinvastatina 40 mg à noite há 3 anos para dislipidemia. Há 6 dias, recebeu prescrição médica de Claritromicina 500 mg de 12/12h para pneumonia comunitária. A Claritromicina inibiu fortemente o CYP3A4, provocando acúmulo plasmático de Sinvastatina e rabdomiólise aguda.",
      sintomas: "Mialgia severa em grandes grupamentos musculares, astenia extrema, urina avermelhada/amarronzada por mioglobinúria.",
      comportamento: "Polida, porém cansada, impaciente se fizerem perguntas repetidas sobre outros assuntos.",
      regrasFala: "Explique suas dores no corpo e fraqueza. Se perguntarem sobre remédios, cite que toma 'um pro colesterol há anos' e 'um antibiótico novo que começou semana passada pro peito'."
    },

    perguntasSugeridas: [
      "Quais remédios a senhora toma todos os dias de forma contínua?",
      "Iniciou algum antibiótico ou medicamento novo nos últimos 7 a 10 dias?",
      "A senhora praticou exercícios pesados ou sofreu alguma queda recente?",
      "Além da urina escura, notou inchaço nas pernas ou diminuição da quantidade de urina?"
    ],

    examesDisponiveis: [
      {
        id: "cpk",
        nome: "Creatina Fosfoquinase (CPK Total)",
        custoTempoMin: 15,
        impactoVitalidade: 0,
        impactoPaciencia: 2, // Exame altamente pertinente, paciente aprova
        essencial: true,
        resultado: "CPK Total: 16.450 U/L (Referência para mulheres: 26 a 192 U/L). Elevação maciça compatível com necrose de fibras musculares esqueléticas (Rabdomiólise)."
      },
      {
        id: "eas",
        nome: "Urina Tipo I (EAS / Fita Reativa)",
        custoTempoMin: 10,
        impactoVitalidade: 0,
        impactoPaciencia: 1,
        essencial: true,
        resultado: "Cor: Castanho escuro | Reação para Hemoglobina/Mioglobina: ++++ (Fortemente Positivo) | Hemácias no Sedimento: 1 por campo (Dissociação entre fita reagente e microscopia confirma Mioglobinúria)."
      },
      {
        id: "funcao_renal",
        nome: "Ureia, Creatinina e Eletrólitos",
        custoTempoMin: 15,
        impactoVitalidade: 0,
        impactoPaciencia: 0,
        essencial: true,
        resultado: "Creatinina Sérica: 2.4 mg/dL (Basal conhecido da paciente: 0.8 mg/dL) | Ureia: 82 mg/dL | Potássio Sérico: 5.6 mEq/L (Hipercalemia leve). Configura Lesão Renal Aguda (LRA estágio KDIGO 2)."
      },
      {
        id: "transaminases",
        nome: "TGO (AST) e TGP (ALT)",
        custoTempoMin: 15,
        impactoVitalidade: 0,
        impactoPaciencia: -2,
        essencial: false,
        resultado: "TGO (AST): 420 U/L (Elevada por liberação muscular) | TGP (ALT): 95 U/L | Bilirrubinas normais."
      },
      {
        id: "raiox",
        nome: "Radiografia Simples de Membros Inferiores",
        custoTempoMin: 20,
        impactoVitalidade: 0,
        impactoPaciencia: -12, // Paciente reclama do esforço inútil
        essencial: false,
        resultado: "Estruturas ósseas íntegras, sem fraturas, calcificações anormais ou derrames articulares."
      }
    ],

    gabaritoPreceptor: {
      diagnostico: "Rabdomiólise induzida por interação farmacocinética grave (inibição enzimática do CYP3A4 pela Claritromicina elevando os níveis tóxicos de Sinvastatina), complicada com Lesão Renal Aguda (LRA) nefrotóxica por Mioglobinúria e Hipercalemia secundária.",
      conduta: "Suspensão imediata da Sinvastatina e da Claritromicina; Internação hospitalar para hidratação venosa vigorosa com Cristaloides (Solução Salina 0,9%) para prevenir a precipitação tubular de mioglobina; Monitorização seriada de Potássio sérico e ECG (risco de arritmias por hipercalemia); Troca do antibiótico para opção que não interfira no metabolismo hepático (ex: Amoxicilina com Clavulanato ou Azitromicina).",
      palavrasChave: ["sinvastatina", "claritromicina", "cyp3a4", "rabdomiolise", "mioglobina", "hidratacao", "renal"]
    }
  }
];

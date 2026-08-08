export const RESPOSTAS_CLINICAS = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
  { valor: "nao_sabe", rotulo: "Não sabe" }
];

export const SECOES_PERGUNTAS_ANAMNESE = [
  {
    id: "saude",
    titulo: "Saúde geral e segurança",
    descricao: "Condições que exigem avaliação individual antes de qualquer procedimento.",
    detalheCampo: "condicoesSaudeDetalhes",
    detalheRotulo: "Detalhes das condições de saúde",
    perguntas: [
      ["gestacaoLactacao", "Está gestante, suspeita de gestação ou amamentando?", true],
      ["alergiaGraveAnafilaxia", "Já teve alergia grave ou anafilaxia?", true],
      ["coagulopatiaTrombose", "Possui distúrbio de coagulação, trombose ou sangramento anormal?", true],
      ["diabetes", "Possui diabetes?", true],
      ["hipertensao", "Possui hipertensão arterial?", true],
      ["cardiopatiaMarcapasso", "Possui cardiopatia, arritmia, marcapasso ou outro dispositivo?", true],
      ["doencaAutoimune", "Possui doença autoimune?", true],
      ["imunossupressao", "Possui baixa imunidade ou condição de imunossupressão?", true],
      ["cancerTratamentoOncologico", "Possui câncer ativo ou está em tratamento oncológico?", true],
      ["doencaRenalHepatica", "Possui doença renal ou hepática?", true],
      ["epilepsiaDesmaios", "Possui epilepsia, convulsões ou histórico de desmaios?", true],
      ["outraCondicaoClinica", "Possui outra doença, condição clínica ou acompanhamento de saúde?", true],
      ["cirurgiaInternacaoRecente", "Realizou cirurgia ou internação recente?", false]
    ]
  },
  {
    id: "medicamentos",
    titulo: "Medicamentos, alergias e eventos recentes",
    descricao: "Registrar nomes, doses, datas e motivo de uso sempre que a resposta for positiva.",
    detalheCampo: "medicamentosEventosDetalhes",
    detalheRotulo: "Medicamentos, alergias e eventos recentes - detalhes",
    perguntas: [
      ["usaMedicamentos", "Usa medicamentos, suplementos ou fitoterápicos atualmente?", false],
      ["anticoagulanteAntiagregante", "Usa anticoagulante ou antiagregante plaquetário?", true],
      ["corticoideImunossupressor", "Usa corticoide ou imunossupressor?", true],
      ["isotretinoina", "Usa ou usou isotretinoína recentemente?", true],
      ["alergiaMedicamentoSubstancia", "Possui alergia a medicamento, cosmético ou substância?", true],
      ["alergiaAnestesicoLidocaina", "Possui alergia a anestésico ou lidocaína?", true],
      ["infeccaoFebreAtual", "Está com febre, infecção ou usando antibiótico?", true],
      ["herpesAtivaRecorrente", "Possui herpes ativa ou recorrente?", true],
      ["vacinaDoencaRecente", "Teve doença ou vacinação recente?", false],
      ["procedimentoOdontologicoRecente", "Fez ou fará procedimento odontológico próximo à data?", false]
    ]
  },
  {
    id: "pele",
    titulo: "Pele e cicatrização",
    descricao: "Avaliar a área pretendida e fatores que podem alterar cicatrização ou pigmentação.",
    detalheCampo: "peleCicatrizacaoDetalhes",
    detalheRotulo: "Pele e cicatrização - detalhes",
    perguntas: [
      ["lesaoInflamacaoPeleAtual", "Há ferida, inflamação, dermatite, acne ativa ou infecção na área?", true],
      ["queloideCicatrizHipertrofica", "Possui tendência a queloide ou cicatriz hipertrófica?", true],
      ["manchasHiperpigmentacao", "Possui tendência a manchas ou hiperpigmentação?", false],
      ["sensibilidadeCutanea", "Possui pele sensível, rosácea ou dermatite recorrente?", false],
      ["exposicaoSolarRecente", "Teve exposição solar intensa ou bronzeamento recente?", false]
    ]
  },
  {
    id: "historico",
    titulo: "Histórico estético e materiais implantados",
    descricao: "Identificar produto, marca, lote quando disponível, área, quantidade, data e intercorrências.",
    detalheCampo: "procedimentosEsteticosDetalhes",
    detalheRotulo: "Procedimentos anteriores - detalhes",
    perguntas: [
      ["procedimentoEsteticoRecente", "Realizou procedimento estético recentemente?", false],
      ["preenchimentoAnterior", "Já realizou preenchimento na área ou próximo dela?", true],
      ["materialPermanente", "Possui PMMA, silicone, biopolímero ou material permanente?", true],
      ["toxinaBotulinicaAnterior", "Já aplicou toxina botulínica?", false],
      ["fiosBioestimuladorAnterior", "Já realizou fios de sustentação ou bioestimulador?", false],
      ["laserPeelingMicroagulhamento", "Fez laser, peeling ou microagulhamento recentemente?", false],
      ["intercorrenciaEsteticaAnterior", "Já teve reação ou intercorrência em procedimento estético?", true]
    ]
  },
  {
    id: "corporal",
    titulo: "Avaliação corporal e drenagem",
    descricao: "Preencher quando o atendimento envolver drenagem, massagem ou procedimento corporal.",
    detalheCampo: "avaliacaoCorporalDetalhes",
    detalheRotulo: "Avaliação corporal - localização, início, evolução e detalhes",
    perguntas: [
      ["tromboseFlebiteAtualSuspeita", "Possui ou há suspeita de trombose ou flebite atual?", true],
      ["insuficienciaCardiacaDescompensada", "Possui insuficiência cardíaca descompensada?", true],
      ["insuficienciaRenalAguda", "Possui insuficiência renal aguda ou descompensada?", true],
      ["infeccaoCutaneaCorporal", "Há celulite infecciosa, erisipela ou outra infecção aguda?", true],
      ["edemaSemDiagnostico", "Apresenta edema recente, súbito ou sem diagnóstico?", true],
      ["varizesDolorosas", "Possui varizes dolorosas, vermelhidão ou calor local?", true],
      ["alteracaoSensibilidade", "Possui perda ou alteração de sensibilidade na área?", false],
      ["cirurgiaLinfaticaOncologica", "Realizou retirada de linfonodos ou cirurgia oncológica na área?", true]
    ]
  },
  {
    id: "habitos",
    titulo: "Hábitos e rotina de cuidados",
    descricao: "Fatores que interferem na preparação, recuperação e manutenção do resultado.",
    detalheCampo: "habitosRotinaDetalhes",
    detalheRotulo: "Rotina de pele, produtos, ácidos, exposição solar e outros hábitos",
    perguntas: [
      ["tabagismo", "Fuma ou usa nicotina?", false],
      ["consumoAlcool", "Consome bebida alcoólica com frequência?", false],
      ["atividadeFisicaIntensa", "Pratica atividade física intensa?", false]
    ]
  }
];

const CAMPOS_BASE = {
  tipoAvaliacao: "",
  inicioEvolucaoQueixa: "",
  impactoQueixaMotivacao: "",
  historicoFamiliar: "",
  procedimentoPretendido: "",
  areaTratamento: "",
  expectativaResultado: "",
  fototipoFitzpatrick: "",
  tipoPele: "",
  pressaoArterial: "",
  peso: "",
  altura: "",
  avaliacaoPele: "",
  achadosExame: "",
  classificacaoRisco: "nao_avaliado",
  condutaProfissional: "",
  orientacoesPreProcedimento: "",
  examesEncaminhamentos: "",
  informacoesConferidas: ""
};

for (const secao of SECOES_PERGUNTAS_ANAMNESE) {
  CAMPOS_BASE[secao.detalheCampo] = "";
  for (const [campo] of secao.perguntas) CAMPOS_BASE[campo] = "";
}

export function criarAnamneseInicial(extras = {}) {
  return {
    clienteId: "",
    profissionalId: "",
    queixaPrincipal: "",
    objetivoTratamento: "",
    gestanteOuLactante: false,
    alergias: false,
    descricaoAlergias: "",
    usaMedicamentos: false,
    medicamentosEmUso: "",
    doencasCronicas: false,
    descricaoDoencas: "",
    procedimentoEsteticoRecente: false,
    procedimentosRecentes: "",
    contraindicacaoDeclarada: false,
    contraindicacoes: "",
    habitosCuidados: "",
    observacoes: "",
    dadosClinicos: { ...CAMPOS_BASE },
    ...extras
  };
}

function respostaLegada(valor) {
  return valor === true ? "sim" : "";
}

export function normalizarAnamnese(item = {}, extrasDados = {}) {
  const dadosRecebidos = item.dadosClinicos && typeof item.dadosClinicos === "object"
    ? item.dadosClinicos
    : {};
  const dadosClinicos = {
    ...CAMPOS_BASE,
    gestacaoLactacao: respostaLegada(item.gestanteOuLactante),
    usaMedicamentos: respostaLegada(item.usaMedicamentos),
    alergiaMedicamentoSubstancia: respostaLegada(item.alergias),
    outraCondicaoClinica: respostaLegada(item.doencasCronicas),
    procedimentoEsteticoRecente: respostaLegada(item.procedimentoEsteticoRecente),
    condicoesSaudeDetalhes: item.descricaoDoencas || "",
    medicamentosEventosDetalhes: [item.descricaoAlergias, item.medicamentosEmUso].filter(Boolean).join("\n"),
    procedimentosEsteticosDetalhes: item.procedimentosRecentes || "",
    habitosRotinaDetalhes: item.habitosCuidados || "",
    classificacaoRisco: item.contraindicacaoDeclarada ? "atencao" : "nao_avaliado",
    condutaProfissional: item.contraindicacoes || "",
    ...dadosRecebidos,
    ...extrasDados
  };

  return {
    ...criarAnamneseInicial(),
    ...item,
    clienteId: item.clienteId || "",
    profissionalId: item.profissionalId || "",
    dadosClinicos
  };
}

const sim = (dados, campo) => dados?.[campo] === "sim";

function juntarDetalhes(...valores) {
  return valores.map((valor) => String(valor || "").trim()).filter(Boolean).join("\n");
}

export function prepararPayloadAnamnese(ficha = {}) {
  const dados = { ...CAMPOS_BASE, ...(ficha.dadosClinicos || {}) };
  const doencas = [
    "diabetes", "hipertensao", "cardiopatiaMarcapasso", "doencaAutoimune",
    "imunossupressao", "cancerTratamentoOncologico", "doencaRenalHepatica",
    "epilepsiaDesmaios", "coagulopatiaTrombose", "outraCondicaoClinica"
  ];
  const classificacao = dados.classificacaoRisco;

  return {
    ...ficha,
    dadosClinicos: dados,
    gestanteOuLactante: sim(dados, "gestacaoLactacao"),
    alergias: sim(dados, "alergiaGraveAnafilaxia") || sim(dados, "alergiaMedicamentoSubstancia") || sim(dados, "alergiaAnestesicoLidocaina"),
    descricaoAlergias: juntarDetalhes(dados.medicamentosEventosDetalhes),
    usaMedicamentos: sim(dados, "usaMedicamentos") || sim(dados, "anticoagulanteAntiagregante") || sim(dados, "corticoideImunossupressor") || sim(dados, "isotretinoina"),
    medicamentosEmUso: juntarDetalhes(dados.medicamentosEventosDetalhes),
    doencasCronicas: doencas.some((campo) => sim(dados, campo)),
    descricaoDoencas: juntarDetalhes(dados.condicoesSaudeDetalhes),
    procedimentoEsteticoRecente: sim(dados, "procedimentoEsteticoRecente"),
    procedimentosRecentes: juntarDetalhes(dados.procedimentosEsteticosDetalhes),
    contraindicacaoDeclarada: classificacao === "adiar" || classificacao === "encaminhar",
    contraindicacoes: juntarDetalhes(dados.condutaProfissional, dados.examesEncaminhamentos),
    habitosCuidados: juntarDetalhes(dados.habitosRotinaDetalhes)
  };
}

export function obterIndicadoresAnamnese(ficha = {}) {
  const dados = ficha.dadosClinicos || {};
  const perguntas = SECOES_PERGUNTAS_ANAMNESE.flatMap((secao) => secao.perguntas);
  const alertas = perguntas.filter(([campo, , atencao]) => atencao && dados[campo] === "sim");
  const respostasPositivas = perguntas.filter(([campo]) => dados[campo] === "sim");
  const pendentes = perguntas.filter(([campo]) => !dados[campo]);
  return { alertas, respostasPositivas, pendentes, total: perguntas.length };
}

export function resumirAnamneseFicha(ficha = {}) {
  const dados = ficha.dadosClinicos || {};
  const positivas = SECOES_PERGUNTAS_ANAMNESE.flatMap((secao) => secao.perguntas)
    .filter(([campo]) => dados[campo] === "sim")
    .map(([, rotulo]) => rotulo.replace(/\?$/, ""));

  return [
    ficha.queixaPrincipal && `Queixa principal: ${ficha.queixaPrincipal}`,
    dados.inicioEvolucaoQueixa && `Início e evolução: ${dados.inicioEvolucaoQueixa}`,
    ficha.objetivoTratamento && `Objetivo: ${ficha.objetivoTratamento}`,
    dados.procedimentoPretendido && `Procedimento pretendido: ${dados.procedimentoPretendido}`,
    dados.areaTratamento && `Área: ${dados.areaTratamento}`,
    positivas.length ? `Respostas positivas: ${positivas.join("; ")}` : "",
    dados.condicoesSaudeDetalhes && `Condições de saúde: ${dados.condicoesSaudeDetalhes}`,
    dados.medicamentosEventosDetalhes && `Medicamentos, alergias e eventos: ${dados.medicamentosEventosDetalhes}`,
    dados.procedimentosEsteticosDetalhes && `Histórico estético: ${dados.procedimentosEsteticosDetalhes}`,
    dados.avaliacaoPele && `Avaliação da pele: ${dados.avaliacaoPele}`,
    dados.achadosExame && `Achados da avaliação: ${dados.achadosExame}`,
    dados.condutaProfissional && `Conduta profissional: ${dados.condutaProfissional}`,
    dados.orientacoesPreProcedimento && `Orientações: ${dados.orientacoesPreProcedimento}`,
    ficha.observacoes && `Observações: ${ficha.observacoes}`
  ].filter(Boolean).join("\n");
}

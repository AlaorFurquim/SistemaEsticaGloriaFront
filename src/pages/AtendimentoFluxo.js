import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarMoeda } from "../utils/masks";

const passos = ["Cadastro", "Queixas", "Anamnese", "Orçamento", "Termos", "Contrato", "Fotos", "Receita", "Pagamento"];
const hoje = new Date().toISOString().slice(0, 10);

const itemReceitaVazio = {
  medicamentoSubstancia: "",
  concentracao: "",
  formaFarmaceutica: "",
  quantidade: "",
  posologia: "",
  duracao: "",
  observacoes: ""
};

const anamneseInicial = {
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
  observacoes: ""
};

const inicial = {
  cadastroNome: "",
  cadastroTelefone: "",
  cadastroDocumento: "",
  cadastroEmail: "",
  cadastroDataNascimento: "",
  cadastroEndereco: "",
  cadastroObservacoes: "",
  cadastroServicoId: "",
  cadastroData: "",
  cadastroHorario: "",
  cadastroValor: "",
  cadastroDesconto: "0",
  queixas: "",
  profissionalId: "",
  anamnese: "",
  anamneseFicha: { ...anamneseInicial },
  fotosAnamnese: [],
  orcamentoStatus: "aprovado",
  valor: "",
  desconto: "0",
  orcamentoItens: [],
  orcamentoObservacoes: "",
  justificativaOrcamentoNegado: "",
  linkTermo: "",
  contratoObservacoes: "",
  fotosAntes: [],
  fotosDepois: [],
  precisaReceita: "nao",
  receitaTipo: "Simples",
  receitaValidade: "",
  receitaNumeroVias: 1,
  receitaOrientacoes: "",
  receitaObservacoes: "",
  receitaItens: [{ ...itemReceitaVazio }],
  formaPagamento: "Pix",
  vencimento: hoje,
  marcarComoPago: true,
  observacoesFinanceiro: "",
  temRetorno: "nao",
  dataRetorno: "",
  horarioRetorno: ""
};

function toNumber(valor) {
  const normalizado = String(valor || "0").replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function dataHora(valor) {
  if (!valor) return "-";
  return new Date(valor).toLocaleString("pt-BR");
}

function toInputDateTime(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 16);
}

function toInputDate(valor) {
  return toInputDateTime(valor).slice(0, 10);
}

function toInputTime(valor) {
  return toInputDateTime(valor).slice(11, 16);
}

function parseFormJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function valorPreenchido(...valores) {
  const encontrado = valores.find((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "");
  return encontrado === undefined ? "" : encontrado;
}

const nomeLabel = (item) => String(item?.nome || "").trim();

function encontrarPorNome(lista, texto) {
  const normalizado = String(texto || "").trim().toLowerCase();
  if (!normalizado) return null;

  return lista.find((item) =>
    String(item.id) === normalizado ||
    nomeLabel(item).toLowerCase() === normalizado ||
    nomeLabel(item).toLowerCase().startsWith(normalizado)
  ) || null;
}

function enviarTermoWhatsApp(cliente, linkTermo) {
  const telefone = String(cliente?.telefone || "").replace(/\D/g, "");

  if (!telefone) {
    alertaErro("Cliente sem telefone cadastrado.");
    return;
  }

  if (!linkTermo) {
    alertaErro("Termo sem link de aceite.");
    return;
  }

  const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
  const texto = `Olá ${cliente?.nome || ""}, segue o termo de consentimento para leitura e aceite: ${linkTermo}`;
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank");
}

export default function AtendimentoFluxo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [passoAtual, setPassoAtual] = useState(0);
  const [atendimento, setAtendimento] = useState(null);
  const [registro, setRegistro] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [opcoesOrcamento, setOpcoesOrcamento] = useState([]);
  const [itemOrcamento, setItemOrcamento] = useState({ itemSelecionado: "", quantidade: 1 });
  const [form, setForm] = useState(inicial);
  const [arquivos, setArquivos] = useState({ anamnese: [], antes: [], depois: [] });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [servicoCadastroBusca, setServicoCadastroBusca] = useState("");
  const [profissionalCadastroBusca, setProfissionalCadastroBusca] = useState("");

  const cliente = atendimento?.cliente || {};
  const servico = atendimento?.servico || {};
  const profissionalSelecionado = profissionais.find((x) => String(x.id) === String(form.profissionalId));
  const profissional = profissionalSelecionado || atendimento?.profissional || {};

  const contrato = useMemo(() => {
    return [
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
      "",
      `Contratante: ${cliente.nome || "Paciente"}`,
      `Documento: ${cliente.documento || "não informado"}`,
      `Telefone: ${cliente.telefone || "não informado"}`,
      "",
      `Serviço: ${servico.nome || "Atendimento"}`,
      `Profissional: ${profissional.nome || "Profissional responsável"}`,
      `Data do atendimento: ${dataHora(atendimento?.dataHora)}`,
      `Valor aprovado: ${formatarMoeda((form.orcamentoItens || []).reduce((soma, item) => soma + Number(item.total || 0), 0) - toNumber(form.desconto))}`,
      "",
      "Declaro que recebi as orientações do atendimento, compreendi os cuidados, riscos, benefícios e autorizo o tratamento conforme explicado.",
      form.contratoObservacoes ? `Observações: ${form.contratoObservacoes}` : ""
    ].filter(Boolean).join("\n");
  }, [atendimento, cliente, form.contratoObservacoes, form.desconto, form.orcamentoItens, profissional, servico]);

  async function carregar() {
    try {
      setCarregando(true);
      const [atendimentoRes, fluxoRes, opcoesRes, profissionaisRes] = await Promise.all([
        api.get(`/atendimentos/${id}`),
        api.get(`/atendimentos/${id}/fluxo`),
        api.get("/orcamentos/itens/pesquisar"),
        api.get("/profissionais")
      ]);
      const fluxo = fluxoRes.data || {};
      const salvo = parseFormJson(fluxo.formJson);
      const linkTermo = fluxo.tokenAceite ? `${window.location.origin}/aceite/${fluxo.tokenAceite}` : "";
      const servico = atendimentoRes.data.servico;
      const paciente = atendimentoRes.data.cliente || {};
      const itensPadrao = servico?.id
        ? [{
            produtoId: null,
            servicoId: servico.id,
            tipo: "SERVICO",
            descricao: servico.controlaMl
              ? `${servico.nome}${servico.areaAplicacao ? ` - ${servico.areaAplicacao}` : ""} (1 ml)`
              : servico.nome,
            quantidade: 1,
            valorUnitario: Number(servico.controlaMl ? servico.valorPorMl : atendimentoRes.data.valorFinal || atendimentoRes.data.valor || servico.valor || 0),
            total: Number(servico.controlaMl ? servico.valorPorMl : atendimentoRes.data.valorFinal || atendimentoRes.data.valor || servico.valor || 0)
          }]
        : [];

      setAtendimento(atendimentoRes.data);
      setRegistro(fluxo);
      setOpcoesOrcamento(opcoesRes.data || []);
      setProfissionais(profissionaisRes.data || []);
      setPassoAtual(Number(fluxo.passoAtual || 0));
      const cadastroServicoId = valorPreenchido(salvo.cadastroServicoId, servico?.id ? String(servico.id) : "");
      const cadastroProfissionalId = valorPreenchido(salvo.profissionalId, atendimentoRes.data.profissionalId ? String(atendimentoRes.data.profissionalId) : "");
      const servicoCadastro = (opcoesRes.data || []).find((item) => item.tipo === "SERVICO" && String(item.id) === String(cadastroServicoId));
      const profissionalCadastro = (profissionaisRes.data || []).find((item) => String(item.id) === String(cadastroProfissionalId));
      setServicoCadastroBusca(nomeLabel(servicoCadastro || servico));
      setProfissionalCadastroBusca(nomeLabel(profissionalCadastro || atendimentoRes.data.profissional));
      setForm({
        ...inicial,
        ...salvo,
        cadastroNome: valorPreenchido(salvo.cadastroNome, paciente.nome),
        cadastroTelefone: valorPreenchido(salvo.cadastroTelefone, paciente.telefone),
        cadastroDocumento: valorPreenchido(salvo.cadastroDocumento, paciente.documento),
        cadastroEmail: valorPreenchido(salvo.cadastroEmail, paciente.email),
        cadastroDataNascimento: valorPreenchido(salvo.cadastroDataNascimento, paciente.dataNascimento ? toInputDate(paciente.dataNascimento) : ""),
        cadastroEndereco: valorPreenchido(salvo.cadastroEndereco, paciente.endereco),
        cadastroObservacoes: valorPreenchido(salvo.cadastroObservacoes, paciente.observacoes),
        cadastroServicoId,
        cadastroData: valorPreenchido(salvo.cadastroData, toInputDate(atendimentoRes.data.dataHora)),
        cadastroHorario: valorPreenchido(salvo.cadastroHorario, toInputTime(atendimentoRes.data.dataHora)),
        cadastroValor: valorPreenchido(salvo.cadastroValor, atendimentoRes.data.valorFinal, atendimentoRes.data.valor, servico?.valor, "0"),
        cadastroDesconto: valorPreenchido(salvo.cadastroDesconto, atendimentoRes.data.desconto, "0"),
        anamneseFicha: { ...anamneseInicial, ...(salvo.anamneseFicha || {}) },
        profissionalId: cadastroProfissionalId,
        orcamentoItens: salvo.orcamentoItens?.length ? salvo.orcamentoItens : itensPadrao,
        valor: salvo.valor ?? String((salvo.orcamentoItens?.length ? salvo.orcamentoItens : itensPadrao).reduce((soma, item) => soma + Number(item.total || 0), 0)),
        linkTermo,
        observacoesFinanceiro: salvo.observacoesFinanceiro ?? `Atendimento #${id}`,
        receitaItens: salvo.receitaItens?.length ? salvo.receitaItens : [{ ...itemReceitaVazio }]
      });
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível abrir o atendimento.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarAnamnese(campo, valor) {
    setForm((atual) => ({
      ...atual,
      anamneseFicha: {
        ...atual.anamneseFicha,
        [campo]: valor
      }
    }));
  }

  function alterarItemReceita(index, campo, valor) {
    setForm((atual) => {
      const itens = [...atual.receitaItens];
      itens[index] = { ...itens[index], [campo]: valor };
      return { ...atual, receitaItens: itens };
    });
  }

  function adicionarItemOrcamento() {
    const selecionado = opcoesOrcamento.find((x) => `${x.tipo}-${x.id}` === itemOrcamento.itemSelecionado);

    if (!selecionado) {
      alertaErro("Selecione um produto ou serviço.");
      return;
    }

    const quantidade = Number(itemOrcamento.quantidade || 1);
    const usaMl = selecionado.tipo === "SERVICO" && selecionado.controlaMl;
    const valor = Number(usaMl ? selecionado.valorPorMl : selecionado.valor || 0);
    const descricao = usaMl
      ? `${selecionado.nome}${selecionado.areaAplicacao ? ` - ${selecionado.areaAplicacao}` : ""} (${quantidade} ml)`
      : selecionado.nome;

    setForm((atual) => ({
      ...atual,
      orcamentoItens: [
        ...(atual.orcamentoItens || []),
        {
          produtoId: selecionado.tipo === "PRODUTO" ? selecionado.id : null,
          servicoId: selecionado.tipo === "SERVICO" ? selecionado.id : null,
          tipo: selecionado.tipo,
          descricao,
          quantidade,
          valorUnitario: valor,
          total: quantidade * valor
        }
      ]
    }));

    setItemOrcamento({ itemSelecionado: "", quantidade: 1 });
  }

  function removerItemOrcamento(index) {
    setForm((atual) => ({
      ...atual,
      orcamentoItens: atual.orcamentoItens.filter((_, idx) => idx !== index)
    }));
  }

  function selecionarArquivos(tipo, files, campo) {
    const lista = Array.from(files || []);
    setArquivos((atual) => ({ ...atual, [tipo]: lista }));
    alterar(campo, lista.map((file) => file.name));
  }

  function resumirAnamneseFicha(ficha = {}) {
    const alertas = [
      ficha.gestanteOuLactante && "Gestante ou lactante",
      ficha.alergias && `Alergias: ${ficha.descricaoAlergias || "sim"}`,
      ficha.usaMedicamentos && `Medicamentos: ${ficha.medicamentosEmUso || "sim"}`,
      ficha.doencasCronicas && `Doenças/condições: ${ficha.descricaoDoencas || "sim"}`,
      ficha.procedimentoEsteticoRecente && `Procedimentos recentes: ${ficha.procedimentosRecentes || "sim"}`,
      ficha.contraindicacaoDeclarada && `Contraindicações: ${ficha.contraindicacoes || "sim"}`
    ].filter(Boolean);

    return [
      ficha.queixaPrincipal && `Queixa principal: ${ficha.queixaPrincipal}`,
      ficha.objetivoTratamento && `Objetivo do tratamento: ${ficha.objetivoTratamento}`,
      alertas.length ? `Alertas: ${alertas.join("; ")}` : "",
      ficha.habitosCuidados && `Hábitos e cuidados: ${ficha.habitosCuidados}`,
      ficha.observacoes && `Observações: ${ficha.observacoes}`
    ].filter(Boolean).join("\n");
  }

  function montarRegistro(proximoPasso = passoAtual) {
    return {
      passoAtual: proximoPasso,
      formJson: JSON.stringify(form),
      queixas: form.queixas,
      anamnese: resumirAnamneseFicha(form.anamneseFicha) || form.anamnese,
      orcamentoStatus: form.orcamentoStatus,
      justificativaOrcamentoNegado: form.justificativaOrcamentoNegado,
      contratoTexto: contrato,
      fotosJson: JSON.stringify({
        anamnese: form.fotosAnamnese,
        antes: form.fotosAntes,
        depois: form.fotosDepois
      }),
      precisaReceita: form.precisaReceita === "sim"
    };
  }

  const subtotalOrcamento = (form.orcamentoItens || []).reduce((soma, item) => soma + Number(item.total || 0), 0);
  const totalOrcamento = subtotalOrcamento - toNumber(form.desconto);
  const servicosFluxo = opcoesOrcamento.filter((item) => item.tipo === "SERVICO");

  async function salvarFluxo(proximoPasso = passoAtual) {
    const res = await api.put(`/atendimentos/${id}/fluxo`, montarRegistro(proximoPasso));
    setRegistro(res.data);
  }

  async function salvarCadastroAtendimento() {
    const servicoSelecionado = encontrarPorNome(servicosFluxo, servicoCadastroBusca);
    const profissionalSelecionadoCadastro = encontrarPorNome(profissionais, profissionalCadastroBusca);

    const res = await api.put(`/atendimentos/${id}/cadastro-fluxo`, {
      nome: form.cadastroNome,
      telefone: form.cadastroTelefone,
      documento: form.cadastroDocumento,
      email: form.cadastroEmail,
      dataNascimento: form.cadastroDataNascimento || null,
      endereco: form.cadastroEndereco,
      observacoes: form.cadastroObservacoes,
      servicoId: Number(servicoSelecionado?.id || form.cadastroServicoId || atendimento?.servicoId || servico.id),
      profissionalId: profissionalSelecionadoCadastro?.id ? Number(profissionalSelecionadoCadastro.id) : form.profissionalId ? Number(form.profissionalId) : null,
      dataHora: `${form.cadastroData}T${form.cadastroHorario}`,
      valor: toNumber(form.cadastroValor),
      desconto: toNumber(form.cadastroDesconto)
    });

    setAtendimento(res.data);
  }

  useEffect(() => {
    if (carregando || !registro) return undefined;

    const timer = setTimeout(() => {
      api.put(`/atendimentos/${id}/fluxo`, montarRegistro(passoAtual))
        .then((res) => setRegistro(res.data))
        .catch(() => {});
    }, 900);

    return () => clearTimeout(timer);
  }, [form, passoAtual, contrato]);

  function validarPasso() {
    if (passoAtual === 0) {
      if (!form.cadastroNome.trim()) {
        alertaErro("Informe o nome do paciente.");
        return false;
      }

      if (!encontrarPorNome(servicosFluxo, servicoCadastroBusca) && !form.cadastroServicoId) {
        alertaErro("Selecione o procedimento.");
        return false;
      }

      if (!form.cadastroData || !form.cadastroHorario) {
        alertaErro("Informe data e horario do atendimento.");
        return false;
      }
    }

    if (passoAtual === 0 && !encontrarPorNome(profissionais, profissionalCadastroBusca) && !form.profissionalId) {
      alertaErro("Selecione a profissional responsável pelo atendimento.");
      return false;
    }

    if (passoAtual === 1 && !form.queixas.trim()) {
      alertaErro("Informe as queixas do paciente.");
      return false;
    }

    if (passoAtual === 2 && !form.anamneseFicha.queixaPrincipal.trim()) {
      alertaErro("Informe a queixa principal da anamnese.");
      return false;
    }

    if (passoAtual === 3) {
      if (!(form.orcamentoItens || []).length) {
        alertaErro("Adicione pelo menos um item ao orçamento.");
        return false;
      }

      if (form.orcamentoStatus === "negado" && !form.justificativaOrcamentoNegado.trim()) {
        alertaErro("Informe a justificativa do orçamento negado.");
        return false;
      }

      if (form.orcamentoStatus === "aprovado" && totalOrcamento <= 0) {
        alertaErro("O total do orçamento precisa ser maior que zero.");
        return false;
      }
    }

    if (passoAtual === 5 && !registro?.termoAceito) {
      alertaErro("A paciente precisa aceitar o termo e o contrato pelo link antes de seguir.");
      return false;
    }

    if (passoAtual === 7 && form.precisaReceita === "sim") {
      const itensValidos = form.receitaItens.filter((item) => item.medicamentoSubstancia.trim() && item.posologia.trim());
      if (!itensValidos.length) {
        alertaErro("Informe pelo menos um item da receita com medicamento e posologia.");
        return false;
      }
    }

    if (passoAtual === 8 && form.temRetorno === "sim" && (!form.dataRetorno || !form.horarioRetorno)) {
      alertaErro("Informe data e horário do retorno.");
      return false;
    }

    return true;
  }

  async function proximo() {
    if (!validarPasso()) return;
    const destino = passoAtual === 3 && form.orcamentoStatus === "negado" ? passoAtual : Math.min(passoAtual + 1, passos.length - 1);

    try {
      setSalvando(true);
      if (passoAtual === 0) {
        await salvarCadastroAtendimento();
      }
      await salvarFluxo(destino);

      if (passoAtual === 3 && form.orcamentoStatus === "negado") {
        await finalizar(true);
        return;
      }

      setPassoAtual(destino);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível salvar o andamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function voltar() {
    if (passoAtual === 0) {
      navigate("/agenda");
      return;
    }

    const destino = Math.max(passoAtual - 1, 0);
    try {
      await salvarFluxo(destino);
      setPassoAtual(destino);
    } catch {
      setPassoAtual(destino);
    }
  }

  async function atualizarAceite() {
    await carregar();
    alertaSucesso("Status do aceite atualizado.");
  }

  function montarReceita() {
    return {
      validade: form.receitaValidade || null,
      tipoReceita: form.receitaTipo,
      numeroVias: Number(form.receitaNumeroVias || 1),
      orientacoes: form.receitaOrientacoes,
      observacoes: form.receitaObservacoes,
      itens: form.receitaItens
        .filter((item) => item.medicamentoSubstancia.trim() || item.posologia.trim())
        .map((item) => ({
          medicamentoSubstancia: item.medicamentoSubstancia,
          concentracao: item.concentracao,
          formaFarmaceutica: item.formaFarmaceutica,
          quantidade: item.quantidade,
          posologia: item.posologia,
          duracao: item.duracao,
          observacoes: item.observacoes
        }))
    };
  }

  function montarOrcamento() {
    return {
      desconto: toNumber(form.desconto),
      formaPagamento: form.formaPagamento,
      observacoes: form.orcamentoStatus === "negado"
        ? `Orçamento negado: ${form.justificativaOrcamentoNegado}`
        : form.orcamentoObservacoes,
      itens: (form.orcamentoItens || []).map((item) => ({
        produtoId: item.produtoId,
        servicoId: item.servicoId,
        descricao: item.descricao,
        quantidade: Number(item.quantidade || 1),
        valorUnitario: Number(item.valorUnitario || 0)
      }))
    };
  }

  async function salvarArquivosDoFluxo() {
    const clienteId = atendimento?.clienteId || atendimento?.cliente?.id;
    const profissionalId = atendimento?.profissionalId || atendimento?.profissional?.id;
    const anamneseFicha = form.anamneseFicha || {};

    if (anamneseFicha.queixaPrincipal?.trim()) {
      await api.post("/anamneses", {
        ...anamneseFicha,
        clienteId,
        profissionalId: form.profissionalId ? Number(form.profissionalId) : profissionalId || null
      });
    }

    if (arquivos.anamnese.length) {
      const data = new FormData();
      data.append("clienteId", clienteId);
      if (profissionalId) data.append("profissionalId", profissionalId);
      data.append("tipoConsulta", atendimento?.retorno ? "Retorno" : "PrimeiraConsulta");
      data.append("observacoes", `Anamnese do atendimento #${id}\n${resumirAnamneseFicha(form.anamneseFicha) || form.anamnese || ""}`);
      arquivos.anamnese.forEach((file) => data.append("arquivos", file));
      await api.post("/prontuarios", data);
    }

    if (arquivos.antes.length) {
      const data = new FormData();
      data.append("ClienteId", clienteId);
      if (profissionalId) data.append("ProfissionalId", profissionalId);
      data.append("Procedimento", servico.nome || "Atendimento");
      data.append("Tags", `atendimento-${id}`);
      data.append("Observacoes", `Fotos do atendimento #${id}`);
      data.append("fotoAntes", arquivos.antes[0]);
      if (arquivos.depois[0]) data.append("fotoDepois", arquivos.depois[0]);
      await api.post("/fotos-evolucao", data);
    }
  }

  async function finalizar(orcamentoNegado = false) {
    if (!orcamentoNegado && !validarPasso()) return;

    setSalvando(true);
    const desconto = toNumber(form.desconto);

    try {
      await salvarFluxo(passoAtual);
      await salvarArquivosDoFluxo();

      await api.post(`/atendimentos/${id}/finalizar-fluxo`, {
        orcamentoAprovado: !orcamentoNegado,
        justificativaOrcamentoNegado: form.justificativaOrcamentoNegado,
        valor: subtotalOrcamento,
        desconto,
        formaPagamento: form.formaPagamento,
        vencimento: form.vencimento,
        marcarComoPago: form.marcarComoPago,
        observacoesFinanceiro: [
          form.observacoesFinanceiro,
          form.queixas ? `Queixas: ${form.queixas}` : "",
          form.precisaReceita === "sim" ? "Receita emitida pelo fluxo do atendimento." : "Sem receita."
        ].filter(Boolean).join("\n"),
        precisaReceita: form.precisaReceita === "sim",
        receita: form.precisaReceita === "sim" ? montarReceita() : null,
        orcamento: montarOrcamento(),
        registro: montarRegistro(passoAtual),
        profissionalId: form.profissionalId ? Number(form.profissionalId) : null,
        agendarRetorno: form.temRetorno === "sim",
        dataHoraRetorno: form.temRetorno === "sim" ? `${form.dataRetorno}T${form.horarioRetorno}` : null
      });

      await alertaSucesso(orcamentoNegado ? "Atendimento salvo como orçamento negado." : "Atendimento finalizado e financeiro alimentado.");
      navigate("/atendimentos");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível finalizar o atendimento.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div>
        <PageHeader title="Iniciar atendimento" subtitle="Carregando atendimento" />
        <div className="panel">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Iniciar atendimento" subtitle={`${cliente.nome || "Paciente"} • ${servico.nome || "Atendimento"}`} />

      <div className="atendimento-flow">
        <aside className="flow-steps">
          {passos.map((passo, index) => (
            <button key={passo} type="button" className={index === passoAtual ? "active" : index < passoAtual ? "done" : ""} onClick={() => setPassoAtual(index)}>
              <span>{index + 1}</span>
              {passo}
            </button>
          ))}
        </aside>

        <section className="panel flow-panel">
          {passoAtual === 0 && (
            <div className="flow-section">
              <h3>Cadastro</h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label>Paciente</label>
                  <input className="form-control" value={form.cadastroNome} onChange={(e) => alterar("cadastroNome", e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>Telefone</label>
                  <input className="form-control" value={form.cadastroTelefone} onChange={(e) => alterar("cadastroTelefone", e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>CPF/documento</label>
                  <input className="form-control" value={form.cadastroDocumento} onChange={(e) => alterar("cadastroDocumento", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Email</label>
                  <input type="email" className="form-control" value={form.cadastroEmail} onChange={(e) => alterar("cadastroEmail", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Nascimento</label>
                  <input type="date" className="form-control" value={form.cadastroDataNascimento} onChange={(e) => alterar("cadastroDataNascimento", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Profissional</label>
                  <input
                    className="form-control"
                    list="profissionais-atendimento-fluxo"
                    value={profissionalCadastroBusca}
                    onChange={(e) => {
                      const texto = e.target.value;
                      const prof = encontrarPorNome(profissionais, texto);
                      setProfissionalCadastroBusca(texto);
                      alterar("profissionalId", prof?.id ? String(prof.id) : "");
                    }}
                    placeholder="Digite a profissional"
                  />
                  <datalist id="profissionais-atendimento-fluxo">
                    {profissionais.map((prof) => (
                      <option key={prof.id} value={nomeLabel(prof)} />
                    ))}
                  </datalist>
                </div>
                <div className="col-md-6">
                  <label>Endereço</label>
                  <input className="form-control" value={form.cadastroEndereco} onChange={(e) => alterar("cadastroEndereco", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Procedimento</label>
                  <input
                    className="form-control"
                    list="servicos-atendimento-fluxo"
                    value={servicoCadastroBusca}
                    onChange={(e) => {
                      const texto = e.target.value;
                      const servicoEscolhido = encontrarPorNome(servicosFluxo, texto);
                      setServicoCadastroBusca(texto);
                      alterar("cadastroServicoId", servicoEscolhido?.id ? String(servicoEscolhido.id) : "");
                    }}
                    placeholder="Digite o procedimento"
                  />
                  <datalist id="servicos-atendimento-fluxo">
                    {servicosFluxo.map((opcao) => (
                      <option key={opcao.id} value={nomeLabel(opcao)} />
                    ))}
                  </datalist>
                </div>
                <div className="col-md-3">
                  <label>Data</label>
                  <input type="date" className="form-control" value={form.cadastroData} onChange={(e) => alterar("cadastroData", e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>Horário</label>
                  <input type="time" className="form-control" value={form.cadastroHorario} onChange={(e) => alterar("cadastroHorario", e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>Valor</label>
                  <input type="number" step="0.01" className="form-control" value={form.cadastroValor} onChange={(e) => alterar("cadastroValor", e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label>Desconto</label>
                  <input type="number" step="0.01" className="form-control" value={form.cadastroDesconto} onChange={(e) => alterar("cadastroDesconto", e.target.value)} />
                </div>
                <div className="col-12">
                  <label>Observações do cadastro</label>
                  <textarea className="form-control" rows="3" value={form.cadastroObservacoes} onChange={(e) => alterar("cadastroObservacoes", e.target.value)} />
                </div>
              </div>
              <div className="flow-grid d-none">
                <div><span>Paciente</span><strong>{cliente.nome || "-"}</strong></div>
                <div><span>Telefone</span><strong>{cliente.telefone || "-"}</strong></div>
                <div><span>Documento</span><strong>{cliente.documento || "-"}</strong></div>
                <div><span>Email</span><strong>{cliente.email || "-"}</strong></div>
                <div><span>Serviço</span><strong>{servico.nome || "-"}</strong></div>
                <div className="flow-field-card">
                  <span>Profissional</span>
                  <select className="form-select" value={form.profissionalId} onChange={(e) => alterar("profissionalId", e.target.value)}>
                    <option value="">Selecione...</option>
                    {profissionais.map((prof) => (
                      <option key={prof.id} value={prof.id}>{prof.nome}</option>
                    ))}
                  </select>
                </div>
                <div><span>Data</span><strong>{dataHora(atendimento?.dataHora)}</strong></div>
                <div><span>Status</span><strong>{atendimento?.status || "-"}</strong></div>
              </div>
            </div>
          )}

          {passoAtual === 1 && (
            <div className="flow-section">
              <h3>Queixas do paciente</h3>
              <textarea className="form-control" rows="8" value={form.queixas} onChange={(e) => alterar("queixas", e.target.value)} placeholder="Descreva a queixa principal, incômodos, expectativas e histórico relatado." />
            </div>
          )}

          {passoAtual === 2 && (
            <div className="flow-section">
              <h3>Anamnese com fotos</h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label>Queixa principal</label>
                  <input className="form-control" value={form.anamneseFicha.queixaPrincipal} onChange={(e) => alterarAnamnese("queixaPrincipal", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Objetivo do tratamento</label>
                  <input className="form-control" value={form.anamneseFicha.objetivoTratamento} onChange={(e) => alterarAnamnese("objetivoTratamento", e.target.value)} />
                </div>

                <div className="col-12 anamnese-checks">
                  {[
                    ["gestanteOuLactante", "Gestante ou lactante"],
                    ["alergias", "Possui alergias"],
                    ["usaMedicamentos", "Usa medicamentos"],
                    ["doencasCronicas", "Doenças crônicas"],
                    ["procedimentoEsteticoRecente", "Procedimento recente"],
                    ["contraindicacaoDeclarada", "Contraindicação declarada"]
                  ].map(([campo, label]) => (
                    <label className="form-check" key={campo}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!form.anamneseFicha[campo]}
                        onChange={(e) => alterarAnamnese(campo, e.target.checked)}
                      />
                      <span className="form-check-label">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="col-md-4">
                  <label>Alergias</label>
                  <input className="form-control" value={form.anamneseFicha.descricaoAlergias} onChange={(e) => alterarAnamnese("descricaoAlergias", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Medicamentos em uso</label>
                  <input className="form-control" value={form.anamneseFicha.medicamentosEmUso} onChange={(e) => alterarAnamnese("medicamentosEmUso", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label>Doenças / condições</label>
                  <input className="form-control" value={form.anamneseFicha.descricaoDoencas} onChange={(e) => alterarAnamnese("descricaoDoencas", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Procedimentos recentes</label>
                  <input className="form-control" value={form.anamneseFicha.procedimentosRecentes} onChange={(e) => alterarAnamnese("procedimentosRecentes", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Contraindicações</label>
                  <input className="form-control" value={form.anamneseFicha.contraindicacoes} onChange={(e) => alterarAnamnese("contraindicacoes", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Hábitos e cuidados</label>
                  <textarea className="form-control" rows="3" value={form.anamneseFicha.habitosCuidados} onChange={(e) => alterarAnamnese("habitosCuidados", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label>Observações</label>
                  <textarea className="form-control" rows="3" value={form.anamneseFicha.observacoes} onChange={(e) => alterarAnamnese("observacoes", e.target.value)} />
                </div>
              </div>
              <textarea className="form-control d-none" rows="7" value={form.anamnese} onChange={(e) => alterar("anamnese", e.target.value)} placeholder="Histórico, alergias, medicações, contraindicações, procedimentos anteriores e observações clínicas." />
              <label className="flow-upload">
                Fotos da anamnese
                <input type="file" multiple accept="image/*" onChange={(e) => selecionarArquivos("anamnese", e.target.files, "fotosAnamnese")} />
              </label>
              <small>{form.fotosAnamnese.length ? form.fotosAnamnese.join(", ") : "Nenhuma foto selecionada"}</small>
            </div>
          )}

          {passoAtual === 3 && (
            <div className="flow-section">
              <h3>Orçamento</h3>
              <div className="flow-choice">
                <label><input type="radio" checked={form.orcamentoStatus === "aprovado"} onChange={() => alterar("orcamentoStatus", "aprovado")} /> Orçamento aprovado</label>
                <label><input type="radio" checked={form.orcamentoStatus === "negado"} onChange={() => alterar("orcamentoStatus", "negado")} /> Orçamento negado</label>
              </div>
              {form.orcamentoStatus === "negado" ? (
                <div className="row g-3">
                  <div className="col-12">
                    <textarea className="form-control" rows="5" value={form.justificativaOrcamentoNegado} onChange={(e) => alterar("justificativaOrcamentoNegado", e.target.value)} placeholder="Justificativa do orçamento negado." />
                  </div>
                  <div className="col-12">
                    <div className="flow-total">Total do orçamento: {formatarMoeda(totalOrcamento)}</div>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label>Produto/Serviço</label>
                    <select className="form-select" value={itemOrcamento.itemSelecionado} onChange={(e) => setItemOrcamento({ ...itemOrcamento, itemSelecionado: e.target.value })}>
                      <option value="">Selecione...</option>
                      {opcoesOrcamento.map((opcao) => (
                        <option key={`${opcao.tipo}-${opcao.id}`} value={`${opcao.tipo}-${opcao.id}`}>
                          {opcao.tipo === "PRODUTO" ? "Produto" : "Serviço"} - {opcao.nome} - {formatarMoeda(opcao.valor)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label>Quantidade / ml</label>
                    <input type="number" step="0.001" className="form-control" value={itemOrcamento.quantidade} onChange={(e) => setItemOrcamento({ ...itemOrcamento, quantidade: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <label>Desconto</label>
                    <input type="number" step="0.01" className="form-control" value={form.desconto} onChange={(e) => alterar("desconto", e.target.value)} />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button type="button" className="btn btn-outline-primary w-100" onClick={adicionarItemOrcamento}>Adicionar</button>
                  </div>
                  <div className="col-12">
                    <table className="table professional-table">
                      <tbody>
                        {(form.orcamentoItens || []).map((item, index) => (
                          <tr key={index}>
                            <td>{item.tipo === "PRODUTO" ? "Produto" : "Serviço"}</td>
                            <td>{item.descricao}</td>
                            <td>{item.quantidade}</td>
                            <td>{formatarMoeda(item.valorUnitario)}</td>
                            <td>{formatarMoeda(item.total)}</td>
                            <td className="text-end">
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removerItemOrcamento(index)}>Remover</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-12">
                    <label>Observações do orçamento</label>
                    <textarea className="form-control" rows="3" value={form.orcamentoObservacoes} onChange={(e) => alterar("orcamentoObservacoes", e.target.value)} />
                  </div>
                  <div className="col-12">
                    <div className="flow-total">Subtotal: {formatarMoeda(subtotalOrcamento)} • Total: {formatarMoeda(totalOrcamento)}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {passoAtual === 4 && (
            <div className="flow-section">
              <h3>Termo de consentimento e LGPD</h3>
              <div className="term-preview">
                <div className="term-preview-header">
                  <span>Prévia do termo</span>
                  <strong>{servico.nome || "Atendimento"}</strong>
                  <small>{cliente.nome || "Paciente"} • {profissional.nome || "Profissional responsável"}</small>
                </div>

                <section>
                  <h4>Consentimento</h4>
                  <p>Declaro que recebi informações claras sobre os procedimentos, seus objetivos, possíveis riscos, benefícios, cuidados necessários e alternativas.</p>
                  <p>Autorizo a realização dos procedimentos e serviços listados abaixo, conforme orçamento apresentado e explicado pela profissional responsável.</p>
                </section>

                <section>
                  <h4>LGPD e uso de imagem</h4>
                  <p>Autorizo o registro de fotografias e imagens estritamente necessárias para prontuário, acompanhamento da evolução, comparação de antes e depois, documentação técnica do atendimento e proteção dos direitos da paciente e da profissional.</p>
                  <p>O uso de imagem para divulgação, redes sociais, portfólio, materiais comerciais ou publicidade será perguntado de forma separada no link de aceite enviado à paciente.</p>
                </section>

                <section>
                  <h4>Serviços e itens aceitos</h4>
                  <table className="table professional-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qtd.</th>
                        <th>Valor unit.</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.orcamentoItens || []).map((item, index) => (
                        <tr key={index}>
                          <td>{item.descricao}</td>
                          <td>{item.quantidade}</td>
                          <td>{formatarMoeda(item.valorUnitario || 0)}</td>
                          <td>{formatarMoeda(item.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flow-total">Subtotal: {formatarMoeda(subtotalOrcamento)} • Desconto: {formatarMoeda(toNumber(form.desconto))} • Total: {formatarMoeda(totalOrcamento)}</div>
                </section>

                <section>
                  <h4>Contrato</h4>
                  <p>O contrato alimentado será conferido na próxima aba e enviado junto neste mesmo aceite.</p>
                </section>
              </div>
              <div className="flow-accept">
                <strong>Envio do aceite na próxima aba.</strong>
                <span>O link único será enviado no contrato alimentado, incluindo termo, contrato, LGPD e todos os itens do orçamento.</span>
              </div>
            </div>
          )}

          {passoAtual === 5 && (
            <div className="flow-section">
              <h3>Contrato alimentado</h3>
              <textarea className="form-control flow-contract" rows="12" value={contrato} readOnly />
              <label>Observações adicionais</label>
              <textarea className="form-control" rows="3" value={form.contratoObservacoes} onChange={(e) => alterar("contratoObservacoes", e.target.value)} />
              <label>Link para aceite do termo e contrato</label>
              <div className="input-group">
                <input className="form-control" value={form.linkTermo} readOnly />
                <button className="btn btn-light" type="button" onClick={() => navigator.clipboard?.writeText(form.linkTermo)}>Copiar</button>
                <button className="btn btn-outline-success" type="button" onClick={() => enviarTermoWhatsApp(cliente, form.linkTermo)}>WhatsApp</button>
              </div>
              <div className={registro?.termoAceito ? "flow-accept ok" : "flow-accept"}>
                <strong>{registro?.termoAceito ? "Termo e contrato aceitos" : "Aguardando aceite do termo e contrato"}</strong>
                <span>{registro?.dataAceiteTermo ? dataHora(registro.dataAceiteTermo) : "A paciente deve concordar com o termo, contrato e itens do orçamento pelo link."}</span>
              </div>
              <button type="button" className="btn btn-outline-secondary" onClick={atualizarAceite}>Atualizar aceite</button>
            </div>
          )}

          {passoAtual === 6 && (
            <div className="flow-section">
              <h3>Fotos do antes e depois</h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="flow-upload">Fotos do antes<input type="file" multiple accept="image/*" onChange={(e) => selecionarArquivos("antes", e.target.files, "fotosAntes")} /></label>
                  <small>{form.fotosAntes.length ? form.fotosAntes.join(", ") : "Nenhuma foto selecionada"}</small>
                </div>
                <div className="col-md-6">
                  <label className="flow-upload">Fotos do depois<input type="file" multiple accept="image/*" onChange={(e) => selecionarArquivos("depois", e.target.files, "fotosDepois")} /></label>
                  <small>{form.fotosDepois.length ? form.fotosDepois.join(", ") : "Nenhuma foto selecionada"}</small>
                </div>
              </div>
            </div>
          )}

          {passoAtual === 7 && (
            <div className="flow-section">
              <h3>Receita</h3>
              <div className="flow-choice">
                <label><input type="radio" checked={form.precisaReceita === "sim"} onChange={() => alterar("precisaReceita", "sim")} /> Sim</label>
                <label><input type="radio" checked={form.precisaReceita === "nao"} onChange={() => alterar("precisaReceita", "nao")} /> Não</label>
              </div>
              {form.precisaReceita === "sim" && (
                <div className="flow-receita">
                  <div className="row g-3">
                    <div className="col-md-4"><label>Tipo</label><select className="form-select" value={form.receitaTipo} onChange={(e) => alterar("receitaTipo", e.target.value)}><option>Simples</option><option>Manipulada</option><option>Antimicrobiano</option><option>Controle Especial</option></select></div>
                    <div className="col-md-4"><label>Validade</label><input type="date" className="form-control" value={form.receitaValidade} onChange={(e) => alterar("receitaValidade", e.target.value)} /></div>
                    <div className="col-md-4"><label>Número de vias</label><input type="number" min="1" max="2" className="form-control" value={form.receitaNumeroVias} onChange={(e) => alterar("receitaNumeroVias", e.target.value)} /></div>
                  </div>
                  {form.receitaItens.map((item, index) => (
                    <div className="flow-prescription-item" key={index}>
                      <div className="row g-3">
                        <div className="col-md-6"><label>Medicamento/substância</label><input className="form-control" value={item.medicamentoSubstancia} onChange={(e) => alterarItemReceita(index, "medicamentoSubstancia", e.target.value)} /></div>
                        <div className="col-md-3"><label>Concentração</label><input className="form-control" value={item.concentracao} onChange={(e) => alterarItemReceita(index, "concentracao", e.target.value)} /></div>
                        <div className="col-md-3"><label>Quantidade</label><input className="form-control" value={item.quantidade} onChange={(e) => alterarItemReceita(index, "quantidade", e.target.value)} /></div>
                        <div className="col-md-6"><label>Forma farmacêutica</label><input className="form-control" value={item.formaFarmaceutica} onChange={(e) => alterarItemReceita(index, "formaFarmaceutica", e.target.value)} /></div>
                        <div className="col-md-6"><label>Duração</label><input className="form-control" value={item.duracao} onChange={(e) => alterarItemReceita(index, "duracao", e.target.value)} /></div>
                        <div className="col-12"><label>Posologia</label><textarea className="form-control" rows="3" value={item.posologia} onChange={(e) => alterarItemReceita(index, "posologia", e.target.value)} /></div>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-light" onClick={() => alterar("receitaItens", [...form.receitaItens, { ...itemReceitaVazio }])}>Adicionar item</button>
                  <label>Orientações</label>
                  <textarea className="form-control" rows="3" value={form.receitaOrientacoes} onChange={(e) => alterar("receitaOrientacoes", e.target.value)} />
                  <label>Observações</label>
                  <textarea className="form-control" rows="3" value={form.receitaObservacoes} onChange={(e) => alterar("receitaObservacoes", e.target.value)} />
                </div>
              )}
            </div>
          )}

          {passoAtual === 8 && (
            <div className="flow-section">
              <h3>Formas e informações de pagamento</h3>
              <div className="row g-3">
                <div className="col-md-6"><label>Forma de pagamento</label><select className="form-select" value={form.formaPagamento} onChange={(e) => alterar("formaPagamento", e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option><option>Transferência</option><option>Boleto</option></select></div>
                <div className="col-md-6"><label>Vencimento</label><input type="date" className="form-control" value={form.vencimento} onChange={(e) => alterar("vencimento", e.target.value)} /></div>
                <div className="col-12"><label className="flow-check"><input type="checkbox" checked={form.marcarComoPago} onChange={(e) => alterar("marcarComoPago", e.target.checked)} /> Marcar como pago agora</label></div>
                <div className="col-12"><label>Observações do financeiro</label><textarea className="form-control" rows="4" value={form.observacoesFinanceiro} onChange={(e) => alterar("observacoesFinanceiro", e.target.value)} /></div>
                <div className="col-12">
                  <label>Haverá retorno?</label>
                  <div className="flow-choice">
                    <label><input type="radio" checked={form.temRetorno === "sim"} onChange={() => alterar("temRetorno", "sim")} /> Sim</label>
                    <label><input type="radio" checked={form.temRetorno === "nao"} onChange={() => alterar("temRetorno", "nao")} /> Não</label>
                  </div>
                </div>
                {form.temRetorno === "sim" && (
                  <>
                    <div className="col-md-6">
                      <label>Data do retorno</label>
                      <input type="date" className="form-control" value={form.dataRetorno} onChange={(e) => alterar("dataRetorno", e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label>Horário do retorno</label>
                      <input type="time" className="form-control" value={form.horarioRetorno} onChange={(e) => alterar("horarioRetorno", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flow-actions">
            <button type="button" className="btn btn-outline-secondary" onClick={voltar} disabled={salvando}>{passoAtual === 0 ? "Voltar para agenda" : "Voltar"}</button>
            {passoAtual < passos.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={proximo} disabled={salvando}>{passoAtual === 3 && form.orcamentoStatus === "negado" ? "Salvar orçamento negado" : "Próximo"}</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => finalizar(false)} disabled={salvando}>Finalizar atendimento</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

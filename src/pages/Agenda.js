import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useNavigate } from "react-router-dom";
import { format, getDay, parse, startOfWeek } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarDataHora, mascaraTelefone } from "../utils/masks";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const inicial = {
  modoCliente: "existente",
  clienteId: "",
  nome: "",
  telefone: "",
  servicoId: "",
  dataAtendimento: "",
  horarioAtendimento: "",
  tipoAgendamento: "PrimeiroAtendimento"
};

const detalhesInicial = {
  clienteId: "",
  servicoId: "",
  profissionalId: "",
  dataAtendimento: "",
  horarioAtendimento: "",
  tipoConsulta: "PrimeiraConsulta",
  status: "Agendado"
};

const clienteLabel = (cliente) =>
  cliente ? `${cliente.nome || ""}${cliente.telefone ? ` - ${cliente.telefone}` : ""}`.trim() : "";

const servicoLabel = (servico) =>
  servico ? String(servico.nome || "").trim() : "";

function encontrarPorLabel(lista, texto, labelFn) {
  const normalizado = String(texto || "").trim().toLowerCase();
  if (!normalizado) return null;

  return lista.find((item) =>
    String(item.id) === normalizado ||
    labelFn(item).toLowerCase() === normalizado ||
    labelFn(item).toLowerCase().startsWith(normalizado) ||
    labelFn(item).toLowerCase().includes(normalizado)
  ) || null;
}

function filtrarPorLabel(lista, texto, labelFn) {
  const normalizado = String(texto || "").trim().toLowerCase();
  if (!normalizado) return [];

  return lista
    .filter((item) => {
      const label = labelFn(item).toLowerCase();
      const telefone = String(item.telefone || "").replace(/\D/g, "");
      const buscaTelefone = normalizado.replace(/\D/g, "");

      return label.includes(normalizado) || (buscaTelefone && telefone.includes(buscaTelefone));
    })
    .slice(0, 8);
}

function toInputDateTime(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toInputDate(date) {
  return toInputDateTime(date).slice(0, 10);
}

function toInputTime(date) {
  return toInputDateTime(date).slice(11, 16);
}

function atendimentoFinalizado(status) {
  return status === "Concluido" || status === "Finalizado";
}

function normalizarProcedimento(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function corPorProcedimento(nome, id) {
  const texto = normalizarProcedimento(nome);
  const coresFixas = [
    { termo: "preenchimento", cor: "#be185d" },
    { termo: "limpeza de pele", cor: "#0891b2" },
    { termo: "drenagem", cor: "#7c3aed" }
  ];
  const encontrada = coresFixas.find((item) => texto.includes(item.termo));

  if (encontrada) return encontrada.cor;

  const paleta = ["#2563eb", "#0f766e", "#b45309", "#9333ea", "#db2777", "#15803d", "#c2410c", "#4f46e5"];
  const base = String(id || nome || "procedimento");
  const indice = [...base].reduce((soma, char) => soma + char.charCodeAt(0), 0) % paleta.length;
  return paleta[indice];
}

function corPorTipo(tipoConsulta, retorno, status, servico, servicoId) {
  if (atendimentoFinalizado(status)) return "#16a34a";
  if (retorno || tipoConsulta === "Retorno") return "#f59e0b";
  return corPorProcedimento(servico, servicoId);
}

function textoTipo(tipoConsulta, retorno) {
  if (retorno || tipoConsulta === "Retorno") return "Retorno";
  return "Primeiro atendimento";
}

function mesmaData(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatarHora(date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatarDataLonga(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export default function Agenda() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [resumoAberto, setResumoAberto] = useState(false);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [editandoDetalhes, setEditandoDetalhes] = useState(false);
  const [slotSelecionado, setSlotSelecionado] = useState(new Date());
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [form, setForm] = useState(inicial);
  const [formDetalhes, setFormDetalhes] = useState(detalhesInicial);
  const [clienteBusca, setClienteBusca] = useState("");
  const [servicoBusca, setServicoBusca] = useState("");
  const [clienteDetalhesBusca, setClienteDetalhesBusca] = useState("");
  const [servicoDetalhesBusca, setServicoDetalhesBusca] = useState("");
  const [clienteBuscaFocado, setClienteBuscaFocado] = useState(false);
  const [servicoBuscaFocado, setServicoBuscaFocado] = useState(false);
  const [clienteDetalhesFocado, setClienteDetalhesFocado] = useState(false);
  const [servicoDetalhesFocado, setServicoDetalhesFocado] = useState(false);
  const sugestoesClientes = filtrarPorLabel(clientes, clienteBusca, clienteLabel);
  const sugestoesServicos = filtrarPorLabel(servicos, servicoBusca, servicoLabel);
  const sugestoesClientesDetalhes = filtrarPorLabel(clientes, clienteDetalhesBusca, clienteLabel);
  const sugestoesServicosDetalhes = filtrarPorLabel(servicos, servicoDetalhesBusca, servicoLabel);

  async function carregar() {
    try {
      const [agendaRes, clientesRes, servicosRes, profissionaisRes] = await Promise.all([
        api.get("/atendimentos/agenda"),
        api.get("/clientes"),
        api.get("/servicos"),
        api.get("/profissionais")
      ]);

      setEventos(
        (agendaRes.data || [])
          .filter((x) => x.status !== "Cancelado")
          .map((x) => ({
            id: x.id,
            title: x.title,
            start: new Date(x.start),
            end: new Date(x.end),
            resource: x,
            cor: corPorTipo(x.tipoConsulta, x.retorno, x.status, x.servico, x.servicoId)
          }))
      );
      setClientes(clientesRes.data || []);
      setServicos(servicosRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "N\u00e3o foi poss\u00edvel carregar a agenda de atendimentos."
      );
    }
  }

  function eventStyleGetter(event) {
    return {
      style: {
        backgroundColor: `${event.cor}1a`,
        borderRadius: "8px",
        border: `1px solid ${event.cor}`,
        borderLeft: `5px solid ${event.cor}`,
        color: event.cor,
        fontWeight: 800,
        opacity: 0.95,
        padding: "2px 4px"
      }
    };
  }

  function abrirDetalhes(evento) {
    const clienteSelecionado = clientes.find((cliente) => String(cliente.id) === String(evento.resource?.clienteId));
    const servicoSelecionado = servicos.find((servico) => String(servico.id) === String(evento.resource?.servicoId));

    setEventoSelecionado(evento);
    setDataSelecionada(evento.start);
    setEditandoDetalhes(false);
    setClienteDetalhesBusca(clienteLabel(clienteSelecionado));
    setServicoDetalhesBusca(servicoLabel(servicoSelecionado));
    setFormDetalhes({
      clienteId: evento.resource?.clienteId || "",
      servicoId: evento.resource?.servicoId || "",
      profissionalId: evento.resource?.profissionalId || "",
      dataAtendimento: toInputDate(evento.start),
      horarioAtendimento: toInputTime(evento.start),
      tipoConsulta: evento.resource?.retorno || evento.resource?.tipoConsulta === "Retorno" ? "Retorno" : "PrimeiraConsulta",
      status: evento.resource?.status || "Agendado"
    });
    setDetalhesAberto(true);
  }

  function abrirResumoDoDia(slotInfo) {
    setDataSelecionada(slotInfo.start);
    setSlotSelecionado(slotInfo.start);
    setResumoAberto(true);
  }

  function abrirNovoAgendamento(dataBase = slotSelecionado) {
    const servicoInicial = servicos[0];

    setForm({
      ...inicial,
      servicoId: servicoInicial?.id ? String(servicoInicial.id) : "",
      dataAtendimento: toInputDate(dataBase),
      horarioAtendimento: toInputTime(dataBase)
    });
    setClienteBusca("");
    setServicoBusca(servicoLabel(servicoInicial));

    setResumoAberto(false);
    setModalAberto(true);
  }

  function fecharAgendamento() {
    setModalAberto(false);
    setForm(inicial);
    setClienteBusca("");
    setServicoBusca("");
  }

  async function salvarAgendamentoCompatibilidade(payload) {
    let clienteId = payload.clienteId;

    if (!clienteId) {
      const existente = clientes.find((cliente) => {
        const telefoneCliente = String(cliente.telefone || "").replace(/\D/g, "");
        const telefonePayload = String(payload.telefone || "").replace(/\D/g, "");

        return (
          (telefonePayload && telefoneCliente === telefonePayload) ||
          String(cliente.nome || "").trim().toLowerCase() === String(payload.nome || "").trim().toLowerCase()
        );
      });

      if (existente) {
        clienteId = existente.id;
      } else {
        const clienteRes = await api.post("/clientes", {
          nome: payload.nome,
          telefone: payload.telefone,
          ativo: true
        });

        clienteId = clienteRes.data.id;
      }
    }

    const servico = servicos.find((item) => String(item.id) === String(payload.servicoId)) || servicos[0];
    const profissional = profissionais[0];

    if (!servico) {
      throw new Error("Cadastre pelo menos um serviço antes de agendar.");
    }

    await api.post("/atendimentos", {
      clienteId: Number(clienteId),
      servicoId: Number(servico.id),
      profissionalId: profissional?.id ? Number(profissional.id) : null,
      dataHora: payload.dataHora,
      tipoConsulta: "PrimeiraConsulta",
      retorno: false,
      status: "Agendado",
      valor: Number(servico.valor || 0),
      desconto: 0
    });
  }

  async function salvarAgendamento(e) {
    e.preventDefault();
    const clienteSelecionado = encontrarPorLabel(clientes, clienteBusca, clienteLabel);
    const servicoSelecionado = encontrarPorLabel(servicos, servicoBusca, servicoLabel);

    if (form.modoCliente === "existente" && !clienteSelecionado) {
      alertaErro("Selecione o cliente ou habilite o cadastro de novo cliente.");
      return;
    }

    if (form.modoCliente === "novo" && (!form.nome.trim() || !form.telefone.trim())) {
      alertaErro("Preencha nome e telefone do novo cliente.");
      return;
    }

    if (!form.dataAtendimento || !form.horarioAtendimento) {
      alertaErro("Preencha data e horário.");
      return;
    }

    if (!servicoSelecionado) {
      alertaErro("Selecione o procedimento.");
      return;
    }

    try {
      const payload = {
        clienteId: form.modoCliente === "existente" ? Number(clienteSelecionado.id) : null,
        nome: form.modoCliente === "novo" ? form.nome.trim() : "",
        telefone: form.modoCliente === "novo" ? form.telefone.trim() : "",
        servicoId: Number(servicoSelecionado.id),
        dataHora: `${form.dataAtendimento}T${form.horarioAtendimento}`,
        tipoAgendamento: form.tipoAgendamento
      };

      try {
        await api.post("/atendimentos/agenda-rapida", payload);
      } catch (error) {
        if (error.response?.status !== 405) {
          throw error;
        }

        if (payload.tipoAgendamento === "Retorno") {
          throw new Error("Reinicie a API para usar agendamento rápido de retorno.");
        }

        await salvarAgendamentoCompatibilidade(payload);
      }

      await alertaSucesso("Atendimento agendado com sucesso.");
      fecharAgendamento();
      await carregar();
    } catch (error) {
      alertaErro(error.response?.data || error.message || "N\u00e3o foi poss\u00edvel agendar o atendimento.");
    }
  }

  async function iniciarAtendimento() {
    if (!eventoSelecionado) return;

    try {
      try {
        await api.put(`/atendimentos/${eventoSelecionado.id}/iniciar`);
      } catch (error) {
        if (error.response?.status !== 405 && error.response?.status !== 404) {
          throw error;
        }
      }

      setDetalhesAberto(false);
      navigate(`/atendimentos/${eventoSelecionado.id}/iniciar`);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "N\u00e3o foi poss\u00edvel iniciar o atendimento."
      );
    }
  }

  async function salvarDetalhesAtendimento(e) {
    e.preventDefault();
    if (!eventoSelecionado) return;
    const clienteSelecionado = encontrarPorLabel(clientes, clienteDetalhesBusca, clienteLabel);
    const servicoSelecionado = encontrarPorLabel(servicos, servicoDetalhesBusca, servicoLabel);

    if (!clienteSelecionado || !servicoSelecionado || !formDetalhes.dataAtendimento || !formDetalhes.horarioAtendimento) {
      alertaErro("Preencha cliente, procedimento, data e horário.");
      return;
    }

    try {
      const servico = servicoSelecionado;
      const profissional = profissionais.find((item) => String(item.id) === String(formDetalhes.profissionalId));
      const retorno = formDetalhes.tipoConsulta === "Retorno";
      const valor = Number(eventoSelecionado.resource?.valor ?? servico?.valor ?? 0);
      const desconto = Number(eventoSelecionado.resource?.desconto ?? 0);

      if (retorno && !eventoSelecionado.resource?.atendimentoOrigemId) {
        alertaErro("Para mudar para retorno, inicie pelo fluxo de agendamento de retorno vinculado ao atendimento anterior.");
        return;
      }

      await api.put(`/atendimentos/${eventoSelecionado.id}`, {
        id: eventoSelecionado.id,
        clienteId: Number(clienteSelecionado.id),
        servicoId: Number(servicoSelecionado.id),
        profissionalId: formDetalhes.profissionalId ? Number(formDetalhes.profissionalId) : null,
        dataHora: `${formDetalhes.dataAtendimento}T${formDetalhes.horarioAtendimento}`,
        tipoConsulta: retorno ? "Retorno" : "PrimeiraConsulta",
        retorno,
        atendimentoOrigemId: eventoSelecionado.resource?.atendimentoOrigemId || null,
        status: formDetalhes.status,
        valor,
        desconto,
        valorFinal: valor - desconto,
        valorComissao: profissional ? (valor - desconto) * (Number(profissional.percentualComissao || 0) / 100) : 0
      });

      await alertaSucesso("Atendimento atualizado com sucesso.");
      setEditandoDetalhes(false);
      setDetalhesAberto(false);
      await carregar();
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível atualizar o atendimento.");
    }
  }

  async function confirmarCancelamento(e) {
    e.preventDefault();

    if (!eventoSelecionado || !motivoCancelamento.trim()) {
      alertaErro("Informe o motivo do cancelamento.");
      return;
    }

    try {
      await api.put(`/atendimentos/${eventoSelecionado.id}/cancelar`, {
        motivo: motivoCancelamento.trim()
      });

      await alertaSucesso("Atendimento cancelado.");
      setCancelamentoAberto(false);
      setDetalhesAberto(false);
      setMotivoCancelamento("");
      await carregar();
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "N\u00e3o foi poss\u00edvel cancelar o atendimento."
      );
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const atendimentosDoDia = eventos
    .filter((evento) => mesmaData(evento.start, dataSelecionada))
    .sort((a, b) => a.start - b.start);

  const itemDetalhe = eventoSelecionado?.resource;
  const detalheFinalizado = atendimentoFinalizado(itemDetalhe?.status);

  return (
    <div>
      <PageHeader
        title="Agenda Visual"
        subtitle="Clique em uma data ou horário para ver o resumo e agendar"
      />

      <div className="panel agenda-panel">
        <Calendar
          localizer={localizer}
          events={eventos}
          startAccessor="start"
          endAccessor="end"
          culture="pt-BR"
          style={{ height: 650 }}
          selectable
          onSelectSlot={abrirResumoDoDia}
          onSelectEvent={abrirDetalhes}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: "Pr\u00f3ximo",
            previous: "Anterior",
            today: "Hoje",
            month: "M\u00eas",
            week: "Semana",
            day: "Dia",
            agenda: "Lista",
            date: "Data",
            time: "Horário",
            event: "Evento",
            noEventsInRange: "Nenhum atendimento neste per\u00edodo"
          }}
        />

        <div className="d-flex gap-3 mt-3 flex-wrap">
          {servicos.map((servico) => (
            <span key={servico.id}>
              <span style={{ width: 14, height: 14, background: corPorProcedimento(servico.nome, servico.id), display: "inline-block", borderRadius: 4, marginRight: 6 }} />
              {servico.nome}
            </span>
          ))}

          <span>
            <span style={{ width: 14, height: 14, background: "#f59e0b", display: "inline-block", borderRadius: 4, marginRight: 6 }} />
            Retorno
          </span>

          <span>
            <span style={{ width: 14, height: 14, background: "#16a34a", display: "inline-block", borderRadius: 4, marginRight: 6 }} />
            Finalizado
          </span>
        </div>
      </div>

      {resumoAberto && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content agenda-day-modal">
              <div className="modal-header">
                <div>
                  <span className="agenda-day-kicker">Resumo do dia</span>
                  <h5 className="modal-title">{formatarDataLonga(dataSelecionada)}</h5>
                </div>

                <button type="button" className="btn-close" onClick={() => setResumoAberto(false)} />
              </div>

              <div className="modal-body">
                <div className="agenda-day-count">
                  {atendimentosDoDia.length} atendimento(s)
                </div>

                {atendimentosDoDia.length > 0 ? (
                  <div className="agenda-day-list">
                    {atendimentosDoDia.map((evento) => (
                      <button
                        type="button"
                        className="agenda-day-item"
                        key={evento.id}
                        onClick={() => {
                          setResumoAberto(false);
                          abrirDetalhes(evento);
                        }}
                      >
                        <span className="agenda-day-time">
                          {formatarHora(evento.start)}
                          {" - "}
                          {formatarHora(evento.end)}
                        </span>

                        <span className="agenda-day-info">
                          <strong>{evento.title}</strong>
                          <small>
                            {evento.resource?.profissional || "Profissional não informado"}
                            {" • "}
                            {textoTipo(evento.resource?.tipoConsulta, evento.resource?.retorno)}
                          </small>
                        </span>

                        <span className="agenda-day-status" style={{ backgroundColor: evento.cor }}>
                          {evento.resource?.status || "Agendado"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="agenda-day-empty">
                    Nenhum atendimento agendado para este dia.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setResumoAberto(false)}>
                  Fechar
                </button>

                <button type="button" className="btn btn-primary" onClick={() => abrirNovoAgendamento(slotSelecionado)}>
                  Novo atendimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.55)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={salvarAgendamento}>
                <div className="modal-header">
                  <h5 className="modal-title">Novo agendamento</h5>
                  <button type="button" className="btn-close" onClick={fecharAgendamento} />
                </div>

                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label>Cliente</label>
                      <select
                        className="form-select"
                        value={form.modoCliente}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            modoCliente: e.target.value,
                            clienteId: "",
                            nome: "",
                            telefone: ""
                          })
                        }
                      >
                        <option value="existente">Pesquisar/selecionar cliente cadastrado</option>
                        <option value="novo">Cadastrar novo cliente</option>
                      </select>
                    </div>

                    {form.modoCliente === "existente" ? (
                      <div className="col-md-12 search-field">
                        <label>Pesquisar cliente</label>
                        <input
                          className="form-control"
                          value={clienteBusca}
                          onChange={(e) => {
                            const texto = e.target.value;
                            const cliente = encontrarPorLabel(clientes, texto, clienteLabel);
                            setClienteBusca(texto);
                            setForm({ ...form, clienteId: cliente?.id ? String(cliente.id) : "" });
                          }}
                          onFocus={() => setClienteBuscaFocado(true)}
                          onBlur={() => setTimeout(() => setClienteBuscaFocado(false), 120)}
                          placeholder="Digite o nome ou telefone"
                          required
                        />
                        {clienteBuscaFocado && sugestoesClientes.length > 0 && (
                          <div className="search-suggestions">
                            {sugestoesClientes.map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setClienteBusca(clienteLabel(cliente));
                                  setForm({ ...form, clienteId: String(cliente.id) });
                                  setClienteBuscaFocado(false);
                                }}
                              >
                                <strong>{cliente.nome}</strong>
                                {cliente.telefone && <span>{cliente.telefone}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="col-md-7">
                          <label>Nome do paciente</label>
                          <input
                            className="form-control"
                            value={form.nome}
                            onChange={(e) => setForm({ ...form, nome: e.target.value })}
                            required
                          />
                        </div>

                        <div className="col-md-5">
                          <label>Telefone</label>
                          <input
                            className="form-control"
                            value={form.telefone}
                            onChange={(e) => setForm({ ...form, telefone: mascaraTelefone(e.target.value) })}
                            required
                          />
                        </div>
                      </>
                    )}

                    <div className="col-md-12 search-field">
                      <label>Procedimento</label>
                      <input
                        className="form-control"
                        value={servicoBusca}
                        onChange={(e) => {
                          const texto = e.target.value;
                          const servico = encontrarPorLabel(servicos, texto, servicoLabel);
                          setServicoBusca(texto);
                          setForm({ ...form, servicoId: servico?.id ? String(servico.id) : "" });
                        }}
                        onFocus={() => setServicoBuscaFocado(true)}
                        onBlur={() => setTimeout(() => setServicoBuscaFocado(false), 120)}
                        placeholder="Digite o procedimento"
                        required
                      />
                      {servicoBuscaFocado && sugestoesServicos.length > 0 && (
                        <div className="search-suggestions">
                          {sugestoesServicos.map((servico) => (
                            <button
                              key={servico.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setServicoBusca(servicoLabel(servico));
                                setForm({ ...form, servicoId: String(servico.id) });
                                setServicoBuscaFocado(false);
                              }}
                            >
                              <strong>{servico.nome}</strong>
                              {servico.areaAplicacao && <span>{servico.areaAplicacao}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label>Data do atendimento</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.dataAtendimento}
                        onChange={(e) => setForm({ ...form, dataAtendimento: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label>Horário</label>
                      <input
                        type="time"
                        className="form-control"
                        value={form.horarioAtendimento}
                        onChange={(e) => setForm({ ...form, horarioAtendimento: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-12">
                      <label>Tipo de agendamento</label>
                      <select
                        className="form-select"
                        value={form.tipoAgendamento}
                        onChange={(e) => setForm({ ...form, tipoAgendamento: e.target.value })}
                      >
                        <option value="PrimeiroAtendimento">Primeiro atendimento</option>
                        <option value="Retorno">Retorno</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={fecharAgendamento}>
                    Cancelar
                  </button>

                  <button type="submit" className="btn btn-primary">
                    Agendar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {detalhesAberto && eventoSelecionado && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.55)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={salvarDetalhesAtendimento}>
                <div className="modal-header">
                  <h5 className="modal-title">Detalhes do atendimento</h5>
                  <button type="button" className="btn-close" onClick={() => setDetalhesAberto(false)} />
                </div>

                <div className="modal-body">
                  {!editandoDetalhes ? (
                    <div className="agenda-detail-list">
                      <div>
                        <span>Paciente / serviço</span>
                        <strong>{eventoSelecionado.title}</strong>
                      </div>
                      <div>
                        <span>Início</span>
                        <strong>{formatarDataHora(eventoSelecionado.start)}</strong>
                      </div>
                      <div>
                        <span>Fim</span>
                        <strong>{formatarDataHora(eventoSelecionado.end)}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{itemDetalhe?.status || "-"}</strong>
                      </div>
                      <div>
                        <span>Profissional</span>
                        <strong>{itemDetalhe?.profissional || "-"}</strong>
                      </div>
                      <div>
                        <span>Tipo</span>
                        <strong>{textoTipo(itemDetalhe?.tipoConsulta, itemDetalhe?.retorno)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-3">
                      <div className="col-md-12 search-field">
                        <label>Cliente</label>
                        <input
                          className="form-control"
                          value={clienteDetalhesBusca}
                          onChange={(e) => {
                            const texto = e.target.value;
                            const cliente = encontrarPorLabel(clientes, texto, clienteLabel);
                            setClienteDetalhesBusca(texto);
                            setFormDetalhes({ ...formDetalhes, clienteId: cliente?.id ? String(cliente.id) : "" });
                          }}
                          onFocus={() => setClienteDetalhesFocado(true)}
                          onBlur={() => setTimeout(() => setClienteDetalhesFocado(false), 120)}
                          placeholder="Digite o nome ou telefone"
                          required
                        />
                        {clienteDetalhesFocado && sugestoesClientesDetalhes.length > 0 && (
                          <div className="search-suggestions">
                            {sugestoesClientesDetalhes.map((cliente) => (
                              <button
                                key={cliente.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setClienteDetalhesBusca(clienteLabel(cliente));
                                  setFormDetalhes({ ...formDetalhes, clienteId: String(cliente.id) });
                                  setClienteDetalhesFocado(false);
                                }}
                              >
                                <strong>{cliente.nome}</strong>
                                {cliente.telefone && <span>{cliente.telefone}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-md-12 search-field">
                        <label>Procedimento</label>
                        <input
                          className="form-control"
                          value={servicoDetalhesBusca}
                          onChange={(e) => {
                            const texto = e.target.value;
                            const servico = encontrarPorLabel(servicos, texto, servicoLabel);
                            setServicoDetalhesBusca(texto);
                            setFormDetalhes({ ...formDetalhes, servicoId: servico?.id ? String(servico.id) : "" });
                          }}
                          onFocus={() => setServicoDetalhesFocado(true)}
                          onBlur={() => setTimeout(() => setServicoDetalhesFocado(false), 120)}
                          placeholder="Digite o procedimento"
                          required
                        />
                        {servicoDetalhesFocado && sugestoesServicosDetalhes.length > 0 && (
                          <div className="search-suggestions">
                            {sugestoesServicosDetalhes.map((servico) => (
                              <button
                                key={servico.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setServicoDetalhesBusca(servicoLabel(servico));
                                  setFormDetalhes({ ...formDetalhes, servicoId: String(servico.id) });
                                  setServicoDetalhesFocado(false);
                                }}
                              >
                                <strong>{servico.nome}</strong>
                                {servico.areaAplicacao && <span>{servico.areaAplicacao}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-md-12">
                        <label>Profissional</label>
                        <select
                          className="form-select"
                          value={formDetalhes.profissionalId}
                          onChange={(e) => setFormDetalhes({ ...formDetalhes, profissionalId: e.target.value })}
                        >
                          <option value="">Sem profissional</option>
                          {profissionais.map((profissional) => (
                            <option key={profissional.id} value={profissional.id}>
                              {profissional.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label>Data</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formDetalhes.dataAtendimento}
                          onChange={(e) => setFormDetalhes({ ...formDetalhes, dataAtendimento: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label>Horário</label>
                        <input
                          type="time"
                          className="form-control"
                          value={formDetalhes.horarioAtendimento}
                          onChange={(e) => setFormDetalhes({ ...formDetalhes, horarioAtendimento: e.target.value })}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label>Tipo</label>
                        <select
                          className="form-select"
                          value={formDetalhes.tipoConsulta}
                          onChange={(e) => setFormDetalhes({ ...formDetalhes, tipoConsulta: e.target.value })}
                        >
                          <option value="PrimeiraConsulta">Primeiro atendimento</option>
                          <option value="Retorno">Retorno</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label>Status</label>
                        <select
                          className="form-select"
                          value={formDetalhes.status}
                          onChange={(e) => setFormDetalhes({ ...formDetalhes, status: e.target.value })}
                        >
                          <option value="Agendado">Agendado</option>
                          <option value="Em atendimento">Em atendimento</option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer agenda-detail-actions">
                  {!editandoDetalhes ? (
                    <>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setDetalhesAberto(false)}>
                        Ok
                      </button>

                      <button type="button" className="btn btn-outline-primary" onClick={() => setEditandoDetalhes(true)}>
                        Editar
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        disabled={detalheFinalizado}
                        onClick={() => {
                          setMotivoCancelamento("");
                          setCancelamentoAberto(true);
                        }}
                      >
                        Cancelamento
                      </button>

                      <button type="button" className="btn btn-primary" onClick={iniciarAtendimento} disabled={detalheFinalizado}>
                        Iniciar atendimento
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-light" onClick={() => setEditandoDetalhes(false)}>
                        Cancelar edição
                      </button>

                      <button type="submit" className="btn btn-primary">
                        Salvar alterações
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {cancelamentoAberto && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.62)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={confirmarCancelamento}>
                <div className="modal-header">
                  <h5 className="modal-title">Motivo do cancelamento</h5>
                  <button type="button" className="btn-close" onClick={() => setCancelamentoAberto(false)} />
                </div>

                <div className="modal-body">
                  <label>Motivo</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={motivoCancelamento}
                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                    placeholder="Ex.: paciente desmarcou, conflito de horário..."
                    required
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setCancelamentoAberto(false)}>
                    Voltar
                  </button>

                  <button type="submit" className="btn btn-danger">
                    Confirmar cancelamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


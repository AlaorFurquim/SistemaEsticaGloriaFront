import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import api from "../api";
import PageHeader from "../components/PageHeader";
import {
  alertaErro,
  alertaInfo,
  alertaSucesso
} from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const inicial = {
  clienteId: "",
  servicoId: "",
  profissionalId: "",
  dataHora: "",
  observacao: "",
  tipoConsulta: "PrimeiraConsulta",
  retorno: false,
  atendimentoOrigemId: ""
};

function toInputDateTime(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function corPorTipo(tipoConsulta, retorno) {
  if (retorno || tipoConsulta === "Retorno") return "#f59e0b";
  if (tipoConsulta === "PrimeiraConsulta" || tipoConsulta === "Primeira Consulta") return "#2563eb";
  return "#16a34a";
}

function textoTipo(tipoConsulta, retorno) {
  if (retorno || tipoConsulta === "Retorno") return "Retorno";
  if (tipoConsulta === "PrimeiraConsulta" || tipoConsulta === "Primeira Consulta") return "Primeira consulta";
  return "Consulta normal";
}

export default function Agenda() {
  const [eventos, setEventos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [consultasAnteriores, setConsultasAnteriores] = useState([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(inicial);

  async function carregar() {
    try {
      const [agendaRes, clientesRes, servicosRes, profissionaisRes] =
        await Promise.all([
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
            cor: corPorTipo(x.tipoConsulta, x.retorno)
          }))
      );

      setClientes(clientesRes.data || []);
      setServicos(servicosRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar a agenda de atendimentos."
      );
    }
  }

  async function carregarConsultasAnteriores(clienteId) {
    if (!clienteId) {
      setConsultasAnteriores([]);
      return;
    }

    try {
      const res = await api.get(`/atendimentos/cliente/${clienteId}/anteriores`);
      setConsultasAnteriores(res.data || []);
    } catch {
      setConsultasAnteriores([]);
      alertaErro("Não foi possível carregar consultas anteriores.");
    }
  }

  function eventStyleGetter(event) {
    return {
      style: {
        backgroundColor: event.cor,
        borderRadius: "8px",
        border: "none",
        color: "#fff",
        fontWeight: 600,
        opacity: 0.95,
        padding: "2px 4px"
      }
    };
  }

  function abrirDetalhes(evento) {
    const item = evento.resource;

    alertaInfo(
      "Detalhes do Atendimento",
      `
        <div style="text-align:left">
          <p><strong>Cliente/Serviço:</strong> ${evento.title}</p>
          <p><strong>Início:</strong> ${formatarDataHora(evento.start)}</p>
          <p><strong>Fim:</strong> ${formatarDataHora(evento.end)}</p>
          <p><strong>Status:</strong> ${item.status || "-"}</p>
          <p><strong>Profissional:</strong> ${item.profissional || "-"}</p>
          <p><strong>Tipo:</strong> ${textoTipo(item.tipoConsulta, item.retorno)}</p>
          ${
            item.consultaOrigem
              ? `<p><strong>Consulta original:</strong> ${item.consultaOrigem}</p>`
              : ""
          }
        </div>
      `
    );
  }

  function abrirNovoAtendimento(slotInfo) {
    setForm({
      ...inicial,
      dataHora: toInputDateTime(slotInfo.start)
    });

    setConsultasAnteriores([]);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setForm(inicial);
    setConsultasAnteriores([]);
  }

  function alterarTipoConsulta(tipoConsulta) {
    setForm({
      ...form,
      tipoConsulta,
      retorno: tipoConsulta === "Retorno",
      atendimentoOrigemId:
        tipoConsulta === "Retorno" ? form.atendimentoOrigemId : ""
    });
  }

  async function salvarAtendimento(e) {
    e.preventDefault();

    if (!form.clienteId || !form.servicoId || !form.profissionalId || !form.dataHora) {
      alertaErro("Preencha cliente, serviço, profissional e data/hora.");
      return;
    }

    if (form.tipoConsulta === "Retorno" && !form.atendimentoOrigemId) {
      alertaErro("Para retorno, selecione a consulta original.");
      return;
    }

    try {
      await api.post("/atendimentos", {
        clienteId: Number(form.clienteId),
        servicoId: Number(form.servicoId),
        profissionalId: Number(form.profissionalId),
        dataHora: form.dataHora,
        observacao: form.observacao,
        tipoConsulta: form.tipoConsulta,
        retorno: form.tipoConsulta === "Retorno",
        atendimentoOrigemId:
          form.tipoConsulta === "Retorno"
            ? Number(form.atendimentoOrigemId)
            : null,
        status: "Agendado"
      });

      await alertaSucesso("Atendimento agendado com sucesso.");
      fecharModal();
      await carregar();
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível agendar o atendimento."
      );
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Agenda Visual"
        subtitle="Clique em uma data ou horário para agendar um atendimento"
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
          onSelectSlot={abrirNovoAtendimento}
          onSelectEvent={abrirDetalhes}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Lista",
            date: "Data",
            time: "Horário",
            event: "Evento",
            noEventsInRange: "Nenhum atendimento neste período"
          }}
        />

        <div className="d-flex gap-3 mt-3 flex-wrap">
          <span>
            <span style={{ width: 14, height: 14, background: "#2563eb", display: "inline-block", borderRadius: 4, marginRight: 6 }} />
            Primeira consulta
          </span>

          <span>
            <span style={{ width: 14, height: 14, background: "#16a34a", display: "inline-block", borderRadius: 4, marginRight: 6 }} />
            Consulta normal
          </span>

          <span>
            <span style={{ width: 14, height: 14, background: "#f59e0b", display: "inline-block", borderRadius: 4, marginRight: 6 }} />
            Retorno
          </span>
        </div>
      </div>

      {modalAberto && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            background: "rgba(0,0,0,0.55)"
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={salvarAtendimento}>
                <div className="modal-header">
                  <h5 className="modal-title">Novo atendimento</h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={fecharModal}
                  />
                </div>

                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label>Cliente</label>
                      <select
                        className="form-select"
                        value={form.clienteId}
                        onChange={async (e) => {
                          const cliente = e.target.value;

                          setForm({
                            ...form,
                            clienteId: cliente,
                            atendimentoOrigemId: ""
                          });

                          await carregarConsultasAnteriores(cliente);
                        }}
                        required
                      >
                        <option value="">Selecione</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label>Serviço</label>
                      <select
                        className="form-select"
                        value={form.servicoId}
                        onChange={(e) =>
                          setForm({ ...form, servicoId: e.target.value })
                        }
                        required
                      >
                        <option value="">Selecione</option>
                        {servicos.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label>Profissional</label>
                      <select
                        className="form-select"
                        value={form.profissionalId}
                        onChange={(e) =>
                          setForm({ ...form, profissionalId: e.target.value })
                        }
                        required
                      >
                        <option value="">Selecione</option>
                        {profissionais.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label>Data e hora</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={form.dataHora}
                        onChange={(e) =>
                          setForm({ ...form, dataHora: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="col-md-3">
                      <label>Tipo de consulta</label>
                      <select
                        className="form-select"
                        value={form.tipoConsulta}
                        onChange={(e) => alterarTipoConsulta(e.target.value)}
                      >
                        <option value="PrimeiraConsulta">Primeira consulta</option>
                        <option value="ConsultaNormal">Consulta normal</option>
                        <option value="Retorno">Retorno</option>
                      </select>
                    </div>

                    {form.tipoConsulta === "Retorno" && (
                      <div className="col-md-12">
                        <label>Consulta original</label>
                        <select
                          className="form-select"
                          value={form.atendimentoOrigemId}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              atendimentoOrigemId: e.target.value
                            })
                          }
                          required
                        >
                          <option value="">Selecione a consulta original</option>

                          {consultasAnteriores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {new Date(c.dataHora).toLocaleString("pt-BR")}
                              {" - "}
                              {c.servico || "Serviço"}
                              {" - "}
                              {c.profissional || "Profissional"}
                              {" - "}
                              {c.status}
                            </option>
                          ))}
                        </select>

                        {!consultasAnteriores.length && (
                          <small className="text-danger">
                            Este cliente ainda não possui consulta concluída para vincular retorno.
                          </small>
                        )}
                      </div>
                    )}

                    <div className="col-md-12">
                      <label>Observação</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={form.observacao}
                        onChange={(e) =>
                          setForm({ ...form, observacao: e.target.value })
                        }
                        placeholder="Observações do atendimento"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={fecharModal}
                  >
                    Cancelar
                  </button>

                  <button type="submit" className="btn btn-primary">
                    Agendar atendimento
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
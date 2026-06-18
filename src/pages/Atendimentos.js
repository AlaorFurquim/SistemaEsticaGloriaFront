import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarDataHora, formatarMoeda } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarAcao,
  confirmarExclusao
} from "../utils/alerts";

const inicial = {
  clienteId: "",
  servicoId: "",
  profissionalId: "",
  dataHora: "",
  status: "Agendado",
  valor: 0,
  desconto: 0,
  tipoConsulta: "ConsultaNormal",
  retorno: false,
  atendimentoOrigemId: ""
};

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [consultasAnteriores, setConsultasAnteriores] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const [atendimentosRes, clientesRes, servicosRes, profissionaisRes] =
        await Promise.all([
          api.get("/atendimentos"),
          api.get("/clientes"),
          api.get("/servicos"),
          api.get("/profissionais")
        ]);

      setAtendimentos((atendimentosRes.data || []).filter(x => x.status !== "Cancelado"));
      setClientes(clientesRes.data || []);
      setServicos(servicosRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar os dados dos atendimentos."
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
    }
  }

  function selecionarServico(id) {
    const servico = servicos.find(x => x.id === Number(id));

    setForm({
      ...form,
      servicoId: id,
      valor: servico ? servico.valor : 0
    });
  }

  function alterarTipoConsulta(tipoConsulta) {
    setForm({
      ...form,
      tipoConsulta,
      retorno: tipoConsulta === "Retorno",
      atendimentoOrigemId: tipoConsulta === "Retorno" ? form.atendimentoOrigemId : ""
    });
  }

  async function alterarCliente(clienteId) {
    setForm({
      ...form,
      clienteId,
      atendimentoOrigemId: ""
    });

    await carregarConsultasAnteriores(clienteId);
  }

  async function salvar(e) {
    e.preventDefault();

    if (form.tipoConsulta === "Retorno" && !form.atendimentoOrigemId) {
      alertaErro("Para retorno, selecione a consulta original.");
      return;
    }

    try {
      const payload = {
        ...form,
        clienteId: Number(form.clienteId),
        servicoId: Number(form.servicoId),
        profissionalId: form.profissionalId ? Number(form.profissionalId) : null,
        valor: Number(form.valor),
        desconto: Number(form.desconto),
        retorno: form.tipoConsulta === "Retorno",
        atendimentoOrigemId:
          form.tipoConsulta === "Retorno"
            ? Number(form.atendimentoOrigemId)
            : null
      };

      if (editandoId) {
        await api.put(`/atendimentos/${editandoId}`, payload);
        await alertaSucesso("Atendimento atualizado com sucesso.");
      } else {
        await api.post("/atendimentos", payload);
        await alertaSucesso("Atendimento agendado com sucesso.");
      }

      setForm(inicial);
      setEditandoId(null);
      setConsultasAnteriores([]);
      await carregar();
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível salvar o atendimento."
      );
    }
  }

  async function concluir(id) {
    const confirmou = await confirmarAcao(
      "Concluir atendimento?",
      "Ao confirmar, o atendimento será marcado como concluído e lançado no caixa, se houver caixa aberto."
    );

    if (!confirmou) return;

    try {
      await api.put(`/atendimentos/${id}/concluir`, "Dinheiro", {
        headers: { "Content-Type": "application/json" }
      });

      await alertaSucesso("Atendimento concluído com sucesso.");
      await carregar();
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível concluir o atendimento."
      );
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();
    if (!confirmou) return;

    try {
      await api.delete(`/atendimentos/${id}`);
      await alertaSucesso("Atendimento cancelado com sucesso.");
      await carregar();
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível cancelar o atendimento."
      );
    }
  }

  async function editar(x) {
    setEditandoId(x.id);

    const tipoConsulta = x.retorno
      ? "Retorno"
      : x.tipoConsulta || "ConsultaNormal";

    const novoForm = {
      clienteId: x.clienteId,
      servicoId: x.servicoId,
      profissionalId: x.profissionalId || "",
      dataHora: x.dataHora?.slice(0, 16),
      status: x.status,
      valor: x.valor,
      desconto: x.desconto,
      tipoConsulta,
      retorno: tipoConsulta === "Retorno",
      atendimentoOrigemId: x.atendimentoOrigemId || ""
    };

    setForm(novoForm);
    await carregarConsultasAnteriores(x.clienteId);
  }

  function cancelarEdicao() {
    setForm(inicial);
    setEditandoId(null);
    setConsultasAnteriores([]);
  }

  function textoTipoConsulta(x) {
    if (x.retorno || x.tipoConsulta === "Retorno") return "Retorno";

    if (
      x.tipoConsulta === "PrimeiraConsulta" ||
      x.tipoConsulta === "Primeira Consulta"
    ) {
      return "Primeira consulta";
    }

    return "Consulta normal";
  }

  function badgeTipoConsulta(x) {
    const texto = textoTipoConsulta(x);

    if (texto === "Retorno") {
      return <span className="badge bg-warning text-dark">Retorno</span>;
    }

    if (texto === "Primeira consulta") {
      return <span className="badge bg-primary">Primeira consulta</span>;
    }

    return <span className="badge bg-success">Consulta normal</span>;
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        subtitle="Agenda, edição, conclusão e comissão automática"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Cliente</label>
            <select
              className="form-select"
              value={form.clienteId}
              onChange={e => alterarCliente(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {clientes.map(x => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label>Serviço</label>
            <select
              className="form-select"
              value={form.servicoId}
              onChange={e => selecionarServico(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {servicos.map(x => (
                <option key={x.id} value={x.id}>
                  {x.nome} - {formatarMoeda(x.valor)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label>Profissional</label>
            <select
              className="form-select"
              value={form.profissionalId || ""}
              onChange={e =>
                setForm({ ...form, profissionalId: e.target.value })
              }
            >
              <option value="">Selecione</option>
              {profissionais.map(x => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label>Data/Hora</label>
            <input
              type="datetime-local"
              className="form-control"
              value={form.dataHora}
              onChange={e =>
                setForm({ ...form, dataHora: e.target.value })
              }
              required
            />
          </div>

          <div className="col-md-2">
            <label>Tipo de consulta</label>
            <select
              className="form-select"
              value={form.tipoConsulta}
              onChange={e => alterarTipoConsulta(e.target.value)}
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
                onChange={e =>
                  setForm({ ...form, atendimentoOrigemId: e.target.value })
                }
                required
              >
                <option value="">Selecione a consulta original</option>
                {consultasAnteriores.map(c => (
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

          <div className="col-md-1">
            <label>Valor</label>
            <input
              type="number"
              className="form-control"
              value={form.valor}
              onChange={e =>
                setForm({ ...form, valor: e.target.value })
              }
            />
          </div>

          <div className="col-md-1">
            <label>Desc.</label>
            <input
              type="number"
              className="form-control"
              value={form.desconto}
              onChange={e =>
                setForm({ ...form, desconto: e.target.value })
              }
            />
          </div>

          <div className="col-md-12 d-flex justify-content-end gap-2">
            {editandoId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}

            <button className="btn btn-primary">
              {editandoId ? "Atualizar" : "Agendar"}
            </button>
          </div>
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Profissional</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Total</th>
              <th>Comissão</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {atendimentos.map(x => (
              <tr key={x.id}>
                <td>{formatarDataHora(x.dataHora)}</td>
                <td>{x.cliente?.nome}</td>
                <td>{x.servico?.nome}</td>
                <td>{x.profissional?.nome}</td>
                <td>{badgeTipoConsulta(x)}</td>
                <td>
                  <span
                    className={
                      x.status === "Concluido"
                        ? "badge bg-success"
                        : x.status === "Cancelado"
                        ? "badge bg-danger"
                        : "badge bg-warning text-dark"
                    }
                  >
                    {x.status}
                  </span>
                </td>
                <td>{formatarMoeda(x.valorFinal)}</td>
                <td>{formatarMoeda(x.valorComissao)}</td>
                <td className="actions">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => editar(x)}
                  >
                    Editar
                  </button>

                  {x.status !== "Concluido" && (
                    <button
                      className="btn btn-outline-success btn-sm"
                      onClick={() => concluir(x.id)}
                    >
                      Concluir
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => excluir(x.id)}
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            ))}

            {!atendimentos.length && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  Nenhum atendimento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
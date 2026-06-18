import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarExclusao
} from "../utils/alerts";

const inicial = {
  nome: "",
  valor: 0,
  duracaoMinutos: 30,

  codigoServicoMunicipal: "",
  codigoTributacaoMunicipal: "",
  itemListaServico: "",
  cnae: "",
  aliquotaIss: 0,
  issRetido: false,

  ativo: true
};

export default function Servicos() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const res = await api.get("/servicos");
      setLista(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os serviços.");
    }
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        valor: Number(form.valor || 0),
        duracaoMinutos: Number(form.duracaoMinutos || 0),
        aliquotaIss: Number(form.aliquotaIss || 0),
        issRetido: Boolean(form.issRetido)
      };

      if (editandoId) {
        await api.put(`/servicos/${editandoId}`, payload);
        await alertaSucesso("Serviço atualizado com sucesso.");
      } else {
        await api.post("/servicos", payload);
        await alertaSucesso("Serviço cadastrado com sucesso.");
      }

      setForm(inicial);
      setEditandoId(null);
      await carregar();
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível salvar o serviço.");
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();

    if (!confirmou) return;

    try {
      await api.delete(`/servicos/${id}`);
      await carregar();
      await alertaSucesso("Serviço excluído com sucesso.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível excluir o serviço.");
    }
  }

  function editar(servico) {
    setEditandoId(servico.id);
    setForm({
      ...inicial,
      ...servico,
      codigoServicoMunicipal: servico.codigoServicoMunicipal || "",
      codigoTributacaoMunicipal: servico.codigoTributacaoMunicipal || "",
      itemListaServico: servico.itemListaServico || "",
      cnae: servico.cnae || "",
      aliquotaIss: servico.aliquotaIss || 0,
      issRetido: servico.issRetido || false
    });
  }

  function cancelarEdicao() {
    setForm(inicial);
    setEditandoId(null);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle="Tabela de serviços do salão e dados fiscais para NFS-e"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <h5>Dados do serviço</h5>

        <div className="row g-2">
          <div className="col-md-5">
            <label>Serviço</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="col-md-2">
            <label>Valor</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })}
            />
          </div>

          <div className="col-md-2">
            <label>Duração</label>
            <input
              type="number"
              className="form-control"
              value={form.duracaoMinutos}
              onChange={e => setForm({ ...form, duracaoMinutos: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <label>Ativo</label>
            <select
              className="form-select"
              value={form.ativo ? "true" : "false"}
              onChange={e => setForm({ ...form, ativo: e.target.value === "true" })}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
        </div>

        <hr />

        <h5>Dados fiscais para NFS-e</h5>

        <div className="row g-2">
          <div className="col-md-3">
            <label>Cód. Serviço Municipal</label>
            <input
              className="form-control"
              value={form.codigoServicoMunicipal}
              onChange={e => setForm({ ...form, codigoServicoMunicipal: e.target.value })}
              placeholder="Ex: 601"
            />
          </div>

          <div className="col-md-3">
            <label>Cód. Tributação Municipal</label>
            <input
              className="form-control"
              value={form.codigoTributacaoMunicipal}
              onChange={e => setForm({ ...form, codigoTributacaoMunicipal: e.target.value })}
              placeholder="Ex: 601"
              required
            />
          </div>

          <div className="col-md-3">
            <label>Item Lista Serviço</label>
            <input
              className="form-control"
              value={form.itemListaServico}
              onChange={e => setForm({ ...form, itemListaServico: e.target.value })}
              placeholder="Ex: 6.01"
              required
            />
          </div>

          <div className="col-md-3">
            <label>CNAE</label>
            <input
              className="form-control"
              value={form.cnae}
              onChange={e => setForm({ ...form, cnae: e.target.value })}
              placeholder="Ex: 9602501"
            />
          </div>

          <div className="col-md-3">
            <label>Alíquota ISS %</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.aliquotaIss}
              onChange={e => setForm({ ...form, aliquotaIss: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <label>ISS Retido?</label>
            <select
              className="form-select"
              value={form.issRetido ? "true" : "false"}
              onChange={e => setForm({ ...form, issRetido: e.target.value === "true" })}
            >
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>

          <div className="col-md-12 d-flex justify-content-end gap-2 mt-3">
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
              {editandoId ? "Atualizar serviço" : "Salvar serviço"}
            </button>
          </div>
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Valor</th>
              <th>Duração</th>
              <th>Item Lista</th>
              <th>Cód. Tributação</th>
              <th>CNAE</th>
              <th>ISS</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {lista.map(x => (
              <tr key={x.id}>
                <td>{x.nome}</td>
                <td>{formatarMoeda(x.valor)}</td>
                <td>{x.duracaoMinutos} min</td>
                <td>{x.itemListaServico || "-"}</td>
                <td>{x.codigoTributacaoMunicipal || "-"}</td>
                <td>{x.cnae || "-"}</td>
                <td>{x.aliquotaIss || 0}%</td>
                <td className="actions">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => editar(x)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => excluir(x.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}

            {!lista.length && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
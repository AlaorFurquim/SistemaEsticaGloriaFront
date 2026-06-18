import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { mascaraTelefone } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarExclusao
} from "../utils/alerts";

const inicial = {
  nome: "",
  telefone: "",
  especialidade: "",
  percentualComissao: 40,
  corAgenda: "#6f4cff",
  ativo: true
};

export default function Profissionais() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const res = await api.get("/profissionais");
      setLista(res.data);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar os profissionais."
      );
    }
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        percentualComissao: Number(form.percentualComissao)
      };

      let mensagemSucesso = "";

      if (editandoId) {
        await api.put(`/profissionais/${editandoId}`, payload);
        mensagemSucesso = "Profissional atualizado com sucesso.";
      } else {
        await api.post("/profissionais", payload);
        mensagemSucesso = "Profissional cadastrado com sucesso.";
      }

      setForm(inicial);
      setEditandoId(null);

      await carregar();

      await alertaSucesso(mensagemSucesso);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível salvar o profissional."
      );
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();

    if (!confirmou) return;

    try {
      await api.delete(`/profissionais/${id}`);

      await carregar();

      await alertaSucesso("Profissional excluído com sucesso.");
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível excluir o profissional."
      );
    }
  }

  function editar(profissional) {
    setEditandoId(profissional.id);
    setForm(profissional);
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
        title="Profissionais"
        subtitle="Comissões, especialidades e cor na agenda"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Nome</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={e =>
                setForm({ ...form, nome: e.target.value })
              }
              required
            />
          </div>

          <div className="col-md-2">
            <label>Telefone</label>
            <input
              className="form-control"
              value={form.telefone || ""}
              onChange={e =>
                setForm({
                  ...form,
                  telefone: mascaraTelefone(e.target.value)
                })
              }
            />
          </div>

          <div className="col-md-3">
            <label>Especialidade</label>
            <input
              className="form-control"
              value={form.especialidade || ""}
              onChange={e =>
                setForm({
                  ...form,
                  especialidade: e.target.value
                })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Comissão %</label>
            <input
              type="number"
              className="form-control"
              value={form.percentualComissao}
              onChange={e =>
                setForm({
                  ...form,
                  percentualComissao: e.target.value
                })
              }
            />
          </div>

          <div className="col-md-1">
            <label>Cor</label>
            <input
              type="color"
              className="form-control form-control-color"
              value={form.corAgenda}
              onChange={e =>
                setForm({
                  ...form,
                  corAgenda: e.target.value
                })
              }
            />
          </div>

          <div className="col-md-1 d-flex align-items-end">
            <button className="btn btn-primary w-100">
              {editandoId ? "Atualizar" : "Salvar"}
            </button>
          </div>

          {editandoId && (
            <div className="col-md-12 d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelarEdicao}
              >
                Cancelar edição
              </button>
            </div>
          )}
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Cor</th>
              <th>Nome</th>
              <th>Especialidade</th>
              <th>Comissão</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {lista.map(x => (
              <tr key={x.id}>
                <td>
                  <span
                    className="color-dot"
                    style={{ background: x.corAgenda }}
                  ></span>
                </td>
                <td>{x.nome}</td>
                <td>{x.especialidade}</td>
                <td>{x.percentualComissao}%</td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
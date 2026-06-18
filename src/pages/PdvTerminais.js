import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";

const inicial = {
  numero: "",
  descricao: "",
  ativo: true
};

export default function PdvTerminais() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    const res = await api.get("/pdvterminais");
    setLista(res.data || []);
  }

  async function salvar(e) {
    e.preventDefault();

    if (editandoId) {
      await api.put(`/pdvterminais/${editandoId}`, form);
    } else {
      await api.post("/pdvterminais", form);
    }

    setForm(inicial);
    setEditandoId(null);
    carregar();
  }

  function editar(pdv) {
    setEditandoId(pdv.id);
    setForm({
      numero: pdv.numero,
      descricao: pdv.descricao,
      ativo: pdv.ativo
    });
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir este PDV?")) return;

    await api.delete(`/pdvterminais/${id}`);
    carregar();
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="PDVs / Terminais"
        subtitle="Cadastro dos terminais de atendimento e caixa"
      />

      <div className="panel">
        <h5>{editandoId ? "Editar PDV" : "Novo PDV"}</h5>

        <form onSubmit={salvar}>
          <div className="row g-2">
            <div className="col-md-3">
              <label>Número</label>
              <input
                className="form-control"
                placeholder="PDV-01"
                value={form.numero}
                onChange={(e) =>
                  setForm({ ...form, numero: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-5">
              <label>Descrição</label>
              <input
                className="form-control"
                placeholder="Recepção"
                value={form.descricao}
                onChange={(e) =>
                  setForm({ ...form, descricao: e.target.value })
                }
                required
              />
            </div>

            <div className="col-md-2">
              <label>Status</label>
              <select
                className="form-select"
                value={form.ativo ? "true" : "false"}
                onChange={(e) =>
                  setForm({ ...form, ativo: e.target.value === "true" })
                }
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100">
                {editandoId ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="panel mt-3">
        <h5>PDVs cadastrados</h5>

        <table className="table professional-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Descrição</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((pdv) => (
              <tr key={pdv.id}>
                <td>{pdv.numero}</td>
                <td>{pdv.descricao}</td>
                <td>{pdv.ativo ? "Ativo" : "Inativo"}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => editar(pdv)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => excluir(pdv.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}

            {lista.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center">
                  Nenhum PDV cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
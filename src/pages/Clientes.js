import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { mascaraCpfCnpj, mascaraTelefone } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarExclusao,
  loading,
  fecharLoading
} from "../utils/alerts";

const inicial = {
  nome: "",
  telefone: "",
  documento: "",
  endereco: "",
  email: "",
  dataNascimento: "",
  observacoes: "",
  ativo: true
};

export default function Clientes() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      const res = await api.get("/clientes");
      setLista(res.data);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar os clientes."
      );
    }
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      loading();

      let mensagemSucesso = "";

      if (editandoId) {
        await api.put(`/clientes/${editandoId}`, form);
        mensagemSucesso = "Cliente atualizado com sucesso.";
      } else {
        await api.post("/clientes", form);
        mensagemSucesso = "Cliente cadastrado com sucesso.";
      }

      setForm(inicial);
      setEditandoId(null);

      await carregar();

      fecharLoading();

      await alertaSucesso(mensagemSucesso);
    } catch (error) {
      fecharLoading();

      alertaErro(
        error.response?.data ||
          "Não foi possível salvar o cliente."
      );
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();

    if (!confirmou) return;

    try {
      loading();

      await api.delete(`/clientes/${id}`);

      await carregar();

      fecharLoading();

      await alertaSucesso("Cliente excluído com sucesso.");
    } catch (error) {
      fecharLoading();

      alertaErro(
        error.response?.data ||
          "Não foi possível excluir o cliente."
      );
    }
  }

  function editar(cliente) {
    setEditandoId(cliente.id);
    setForm(cliente);
  }

  function cancelarEdicao() {
    setForm(inicial);
    setEditandoId(null);
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = lista.filter(x =>
    x.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro completo com máscaras e histórico básico"
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

          <div className="col-md-2">
            <label>CPF/CNPJ</label>
            <input
              className="form-control"
              value={form.documento || ""}
              onChange={e =>
                setForm({
                  ...form,
                  documento: mascaraCpfCnpj(e.target.value)
                })
              }
            />
          </div>

          <div className="col-md-2">
            <label>E-mail</label>
            <input
              className="form-control"
              value={form.email || ""}
              onChange={e =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Nascimento</label>
            <input
              type="date"
              className="form-control"
              value={form.dataNascimento ? String(form.dataNascimento).substring(0, 10) : ""}
              onChange={e =>
                setForm({ ...form, dataNascimento: e.target.value })
              }
            />
          </div>

          <div className="col-md-3">
            <label>Endereço</label>
            <input
              className="form-control"
              value={form.endereco || ""}
              onChange={e =>
                setForm({ ...form, endereco: e.target.value })
              }
            />
          </div>

          <div className="col-md-10">
            <label>Observações</label>
            <input
              className="form-control"
              value={form.observacoes || ""}
              onChange={e =>
                setForm({ ...form, observacoes: e.target.value })
              }
            />
          </div>

          <div className="col-md-2 d-flex align-items-end gap-2">
            <button className="btn btn-primary w-100">
              {editandoId ? "Atualizar" : "Salvar"}
            </button>

            {editandoId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="panel">
        <div className="table-toolbar">
          <input
            className="form-control"
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <table className="table professional-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Documento</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map(x => (
              <tr key={x.id}>
                <td>{x.nome}</td>
                <td>{x.telefone}</td>
                <td>{x.documento}</td>
                <td>{x.email}</td>
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
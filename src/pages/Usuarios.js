import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import {
  alertaErro,
  alertaSucesso,
  confirmarExclusao
} from "../utils/alerts";

const inicial = {
  nome: "",
  email: "",
  senha: "",
  perfilId: "",
  profissionalId: "",
  ativo: true
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const usuariosRes = await api.get("/usuarios");
      const perfisRes = await api.get("/usuarios/perfis");
      const profissionaisRes = await api.get("/profissionais");

      setUsuarios(usuariosRes.data);
      setPerfis(perfisRes.data);
      setProfissionais(profissionaisRes.data);
    } catch (error) {
      alertaErro(
        error.response?.data ||
        "Não foi possível carregar os usuários."
      );
    }
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        perfilId: Number(form.perfilId),
        profissionalId: form.profissionalId ? Number(form.profissionalId) : null,
        ativo: form.ativo
      };

      let mensagem = "";

      if (editandoId) {
        await api.put(`/usuarios/${editandoId}`, payload);
        mensagem = "Usuário atualizado com sucesso.";
      } else {
        await api.post("/usuarios", payload);
        mensagem = "Usuário criado com sucesso.";
      }

      setForm(inicial);
      setEditandoId(null);

      await carregar();

      await alertaSucesso(mensagem);
    } catch (error) {
      alertaErro(
        error.response?.data ||
        "Erro ao salvar usuário."
      );
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();

    if (!confirmou) return;

    try {
      await api.delete(`/usuarios/${id}`);

      await carregar();

      await alertaSucesso(
        "Usuário inativado com sucesso."
      );
    } catch (error) {
      alertaErro(
        error.response?.data ||
        "Não foi possível inativar o usuário."
      );
    }
  }

  function editar(usuario) {
    setEditandoId(usuario.id);

    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfilId: usuario.perfilId,
      profissionalId: usuario.profissionalId || "",
      ativo: usuario.ativo
    });
  }

  function cancelar() {
    setForm(inicial);
    setEditandoId(null);
  }

  useEffect(() => {
    carregar();
  }, []);

  const perfilSelecionado = perfis.find(p => String(p.id) === String(form.perfilId));
  const deveSelecionarProfissional = perfilSelecionado?.nome === "Profissional";

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Controle de acesso ao sistema por perfil"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">

          <div className="col-md-3">
            <label>Nome</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={e =>
                setForm({
                  ...form,
                  nome: e.target.value
                })
              }
              required
            />
          </div>

          <div className="col-md-3">
            <label>E-mail</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={e =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
              required
            />
          </div>

          <div className="col-md-2">
            <label>Senha</label>
            <input
              type="password"
              className="form-control"
              placeholder={
                editandoId
                  ? "Deixe vazio para manter"
                  : ""
              }
              value={form.senha}
              onChange={e =>
                setForm({
                  ...form,
                  senha: e.target.value
                })
              }
              required={!editandoId}
            />
          </div>

          <div className="col-md-2">
            <label>Perfil</label>
            <select
              className="form-select"
              value={form.perfilId}
              onChange={e =>
                setForm({
                  ...form,
                  perfilId: e.target.value,
                  profissionalId: ""
                })
              }
              required
            >
              <option value="">
                Selecione
              </option>

              {perfis.map(p => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {deveSelecionarProfissional && (
            <div className="col-md-2">
              <label>Profissional vinculado</label>
              <select
                className="form-select"
                value={form.profissionalId}
                onChange={e =>
                  setForm({
                    ...form,
                    profissionalId: e.target.value
                  })
                }
                required
              >
                <option value="">Selecione</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-md-2">
            <label>Status</label>
            <select
              className="form-select"
              value={form.ativo ? "true" : "false"}
              onChange={e =>
                setForm({
                  ...form,
                  ativo:
                    e.target.value === "true"
                })
              }
            >
              <option value="true">
                Ativo
              </option>
              <option value="false">
                Inativo
              </option>
            </select>
          </div>

          <div className="col-md-12 d-flex justify-content-end gap-2 mt-3">

            {editandoId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelar}
              >
                Cancelar
              </button>
            )}

            <button className="btn btn-primary">
              {editandoId
                ? "Atualizar usuário"
                : "Criar usuário"}
            </button>

          </div>
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Profissional</th>
              <th>Status</th>
              <th width="180">Ações</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.perfil}</td>
                <td>{u.profissional || "-"}</td>

                <td>
                  {u.ativo ? (
                    <span className="badge bg-success">
                      Ativo
                    </span>
                  ) : (
                    <span className="badge bg-secondary">
                      Inativo
                    </span>
                  )}
                </td>

                <td className="actions">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => editar(u)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => excluir(u.id)}
                  >
                    Inativar
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

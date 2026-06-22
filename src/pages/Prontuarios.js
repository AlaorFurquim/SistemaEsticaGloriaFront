import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const clienteLabel = (cliente) =>
  cliente ? String(cliente.nome || "").trim() : "";

function encontrarCliente(clientes, texto) {
  const normalizado = String(texto || "").trim().toLowerCase();
  if (!normalizado) return null;

  return clientes.find((cliente) => {
    const label = clienteLabel(cliente).toLowerCase();
    return String(cliente.id) === normalizado || label === normalizado || label.includes(normalizado);
  }) || null;
}

function filtrarClientes(clientes, texto) {
  const normalizado = String(texto || "").trim().toLowerCase();
  if (!normalizado) return [];

  return clientes
    .filter((cliente) => {
      const label = clienteLabel(cliente).toLowerCase();
      return label.includes(normalizado);
    })
    .slice(0, 8);
}

export default function Prontuarios() {
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteBuscaFocada, setClienteBuscaFocada] = useState(false);
  const [prontuarioEditando, setProntuarioEditando] = useState(null);
  const [lista, setLista] = useState([]);

  const [form, setForm] = useState({
    profissionalId: "",
    tipoConsulta: "PrimeiraConsulta",
    observacoes: ""
  });

  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDepois, setFotoDepois] = useState(null);
  const [arquivos, setArquivos] = useState([]);
  const sugestoesClientes = filtrarClientes(clientes, clienteBusca);

  function limparFormulario() {
    setProntuarioEditando(null);
    setForm({
      profissionalId: "",
      tipoConsulta: "PrimeiraConsulta",
      observacoes: ""
    });
    setFotoAntes(null);
    setFotoDepois(null);
    setArquivos([]);
  }

  async function carregarBase() {
    try {
      const [cli, prof] = await Promise.all([
        api.get("/clientes"),
        api.get("/profissionais")
      ]);

      setClientes(cli.data || []);
      setProfissionais(prof.data || []);
    } catch {
      alertaErro("Não foi possível carregar clientes e profissionais.");
    }
  }

  async function carregarProntuarios(id = clienteId) {
    if (!id) {
      setLista([]);
      return;
    }

    try {
      const res = await api.get(`/prontuarios/cliente/${id}`);
      setLista(res.data || []);
    } catch {
      alertaErro("Não foi possível carregar os prontuários.");
    }
  }

  function formatarTipoConsulta(tipo) {
    switch (tipo) {
      case "Retorno":
        return "Retorno";
      case "PrimeiraConsulta":
      case "Primeira Consulta":
        return "Avaliação inicial";
      case "Consulta":
      case "Consulta Normal":
        return "Procedimento";
      default:
        return "Procedimento";
    }
  }

  async function salvar(e) {
    e.preventDefault();

    if (!clienteId) {
      alertaErro("Selecione um cliente.");
      return;
    }

    const data = new FormData();
    data.append("clienteId", clienteId);

    if (form.profissionalId) {
      data.append("profissionalId", form.profissionalId);
    }

    data.append("tipoConsulta", form.tipoConsulta);
    data.append("observacoes", form.observacoes || "");

    if (fotoAntes) {
      data.append("arquivos", fotoAntes);
    }

    if (fotoDepois) {
      data.append("arquivos", fotoDepois);
    }

    arquivos.forEach((arquivo) => {
      data.append("arquivos", arquivo);
    });

    try {
      loading();

      const config = {
        headers: { "Content-Type": "multipart/form-data" }
      };

      if (prontuarioEditando) {
        await api.put(`/prontuarios/${prontuarioEditando.id}`, data, config);
      } else {
        await api.post("/prontuarios", data, config);
      }

      limparFormulario();

      await carregarProntuarios();

      fecharLoading();
      alertaSucesso("Prontuário salvo com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar o prontuário.");
    }
  }

  async function abrirAnexo(anexo) {
    try {
      const res = await api.get(`/prontuarios/anexos/${anexo.id}`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: anexo.tipoArquivo })
      );

      window.open(url, "_blank");
    } catch {
      alertaErro("Não foi possível abrir o anexo.");
    }
  }

  function editarProntuario(prontuario) {
    const cliente = clientes.find((item) => String(item.id) === String(prontuario.clienteId));
    setProntuarioEditando(prontuario);
    setClienteId(String(prontuario.clienteId));
    setClienteBusca(clienteLabel(cliente));
    setForm({
      profissionalId: prontuario.profissionalId ? String(prontuario.profissionalId) : "",
      tipoConsulta: prontuario.tipoConsulta || "PrimeiraConsulta",
      observacoes: prontuario.observacoes || ""
    });
    setFotoAntes(null);
    setFotoDepois(null);
    setArquivos([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    carregarBase();
  }, []);

  return (
    <div>
      <PageHeader
        title="Prontuários"
        subtitle="Histórico estético com evolução, fotos, PDFs e anexos"
      />

      <div className="panel mb-3">
        <label>Cliente</label>
        <div className="search-field">
          <input
          className="form-control"
          value={clienteBusca}
          onChange={(e) => {
            const texto = e.target.value;
            const cliente = encontrarCliente(clientes, texto);
            setClienteBusca(texto);
            setClienteId(cliente?.id ? String(cliente.id) : "");
            setLista([]);
            limparFormulario();
          }}
          onFocus={() => setClienteBuscaFocada(true)}
          onBlur={() => setTimeout(() => setClienteBuscaFocada(false), 120)}
          placeholder="Digite o nome ou telefone do cliente"
        />

          {clienteBuscaFocada && sugestoesClientes.length > 0 && (
            <div className="search-suggestions">
              {sugestoesClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setClienteBusca(clienteLabel(cliente));
                    setClienteId(String(cliente.id));
                    setClienteBuscaFocada(false);
                    limparFormulario();
                    carregarProntuarios(cliente.id);
                  }}
                >
                  <strong>{cliente.nome}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form className="panel mb-3" onSubmit={salvar}>
        {prontuarioEditando && (
          <div className="alert alert-warning py-2 mb-3">
            Editando prontuÃ¡rio de {formatarDataHora(prontuarioEditando.dataCadastro)}. Ao salvar, as novas informaÃ§Ãµes ficam no mesmo registro.
          </div>
        )}

        <div className="row g-2">
          <div className="col-md-3">
            <label>Profissional</label>
            <select
              className="form-select"
              value={form.profissionalId}
              onChange={(e) =>
                setForm({ ...form, profissionalId: e.target.value })
              }
            >
              <option value="">Selecione...</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label>Tipo de registro</label>
            <select
              className="form-select"
              value={form.tipoConsulta}
              onChange={(e) =>
                setForm({ ...form, tipoConsulta: e.target.value })
              }
            >
              <option value="PrimeiraConsulta">Avaliação inicial</option>
              <option value="Consulta">Procedimento</option>
              <option value="Retorno">Retorno</option>
            </select>
          </div>

          <div className="col-md-3">
            <label>Foto antes</label>
            <input
              className="form-control"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFotoAntes(e.target.files?.[0] || null)}
            />
          </div>

          <div className="col-md-3">
            <label>Foto depois</label>
            <input
              className="form-control"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFotoDepois(e.target.files?.[0] || null)}
            />
          </div>

          <div className="col-md-12">
            <label>Outros anexos</label>
            <input
              className="form-control"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => setArquivos(Array.from(e.target.files || []))}
            />
            <small className="text-muted">
              Use para PDFs de consentimento, documentos ou imagens adicionais.
            </small>
          </div>

          <div className="col-md-12">
            <label>Evolução, queixa principal e conduta</label>
            <textarea
              className="form-control"
              rows="5"
              placeholder="Ex.: queixa principal, procedimento realizado, produtos utilizados, orientações pós-procedimento e retorno sugerido."
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <button className="btn btn-primary w-100">
              {prontuarioEditando ? "Atualizar" : "Salvar"}
            </button>
          </div>

          {prontuarioEditando && (
            <div className="col-md-2">
              <button type="button" className="btn btn-light w-100" onClick={limparFormulario}>
                Cancelar ediÃ§Ã£o
              </button>
            </div>
          )}
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Profissional</th>
              <th>Registro</th>
              <th>Evolução / conduta</th>
              <th>Anexos</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td>{formatarDataHora(p.dataCadastro)}</td>
                <td>{p.profissionalNome}</td>
                <td>{formatarTipoConsulta(p.tipoConsulta)}</td>
                <td>{p.observacoes}</td>
                <td className="actions">
                  {p.anexos?.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => abrirAnexo(a)}
                    >
                      {a.nomeArquivo}
                    </button>
                  ))}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => editarProntuario(p)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}

            {!lista.length && (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  Nenhum prontuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

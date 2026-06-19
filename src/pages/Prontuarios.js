import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

export default function Prontuarios() {
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [lista, setLista] = useState([]);

  const [form, setForm] = useState({
    profissionalId: "",
    tipoConsulta: "PrimeiraConsulta",
    observacoes: ""
  });

  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDepois, setFotoDepois] = useState(null);
  const [arquivos, setArquivos] = useState([]);

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

      await api.post("/prontuarios", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setForm({
        profissionalId: "",
        tipoConsulta: "PrimeiraConsulta",
        observacoes: ""
      });

      setFotoAntes(null);
      setFotoDepois(null);
      setArquivos([]);

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
        <select
          className="form-select"
          value={clienteId}
          onChange={(e) => {
            setClienteId(e.target.value);
            carregarProntuarios(e.target.value);
          }}
        >
          <option value="">Selecione...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <form className="panel mb-3" onSubmit={salvar}>
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
              Salvar
            </button>
          </div>
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
              </tr>
            ))}

            {!lista.length && (
              <tr>
                <td colSpan="5" className="text-center text-muted py-4">
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
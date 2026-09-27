import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import FotoEditor from "../components/FotoEditor";
import { Link } from "react-router-dom";

export default function MeuPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    api.get("/meu-perfil", { signal: abort.signal }).then(({ data }) => { setPerfil(data); setFoto(data.foto || null); })
      .catch(e => { if (e.code !== "ERR_CANCELED") setErro("Não foi possível carregar seu perfil. Atualize a página para tentar novamente."); });
    return () => abort.abort();
  }, []);
  async function salvar() {
    setSalvando(true); setErro(""); setMensagem("");
    try {
      const { data } = await api.put("/meu-perfil/foto", { foto });
      setPerfil(atual => ({ ...atual, foto: data.foto }));
      window.dispatchEvent(new CustomEvent("fotoPerfilAtualizada", { detail: data.foto }));
      setMensagem("Foto do perfil salva.");
    } catch (e) { setErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível salvar sua foto. Tente novamente."); }
    finally { setSalvando(false); }
  }
  return <div className="profile-page"><PageHeader title="Meu perfil" subtitle="Sua foto, do seu jeito." />
    <p><Link className="btn btn-outline-primary" to="/alterar-senha">Alterar minha senha</Link></p>
    {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
    {mensagem && <div className="alert alert-success" role="status">{mensagem}</div>}
    {perfil ? <div className="panel"><div className="profile-details"><strong>{perfil.nome}</strong><span>{perfil.email}</span></div>
      <FotoEditor label="Foto de perfil" circular value={foto} disabled={salvando} onChange={value => { setFoto(value); setMensagem(""); }} />
      {perfil.profissionalId && <p className="text-muted">Sua foto também identifica você na agenda e no link de agendamento da clínica.</p>}
      <button type="button" className="btn btn-primary" disabled={salvando || foto === (perfil.foto || null)} onClick={salvar}>{salvando ? "Salvando…" : "Salvar foto"}</button>
    </div> : !erro && <p role="status">Carregando perfil…</p>}
  </div>;
}

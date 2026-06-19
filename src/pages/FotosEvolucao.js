import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

function montarUrlImagem(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}${url}`;
}

export default function FotosEvolucao() {
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({ clienteId: "", profissionalId: "", procedimento: "", tags: "", observacoes: "" });
  const [fotoAntes, setFotoAntes] = useState(null);
  const [fotoDepois, setFotoDepois] = useState(null);

  async function carregar() {
    try {
      const [fotos, cli, prof] = await Promise.all([api.get("/fotos-evolucao"), api.get("/clientes"), api.get("/profissionais")]);
      setLista(fotos.data || []); setClientes(cli.data || []); setProfissionais(prof.data || []);
    } catch (e) { alertaErro(e.response?.data || "Não foi possível carregar fotos."); }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!fotoAntes) return alertaErro("Informe a foto antes.");
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
    data.append("fotoAntes", fotoAntes);
    if (fotoDepois) data.append("fotoDepois", fotoDepois);
    try {
      loading(); await api.post("/fotos-evolucao", data, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ clienteId: "", profissionalId: "", procedimento: "", tags: "", observacoes: "" }); setFotoAntes(null); setFotoDepois(null);
      await carregar(); fecharLoading(); alertaSucesso("Fotos salvas com sucesso.");
    } catch (e) { fecharLoading(); alertaErro(e.response?.data || "Não foi possível salvar fotos."); }
  }

  useEffect(() => { carregar(); }, []);

  return <div>
    <PageHeader title="Fotos Antes/Depois" subtitle="Galeria por procedimento, tags, profissional e comparação visual" />
    <form className="panel mb-3" onSubmit={salvar}>
      <div className="row g-2">
        <div className="col-md-3"><label>Cliente</label><select className="form-select" value={form.clienteId} onChange={e=>setForm({...form, clienteId:e.target.value})} required><option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="col-md-3"><label>Profissional</label><select className="form-select" value={form.profissionalId} onChange={e=>setForm({...form, profissionalId:e.target.value})}><option value="">Selecione...</option>{profissionais.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
        <div className="col-md-3"><label>Procedimento</label><input className="form-control" value={form.procedimento} onChange={e=>setForm({...form, procedimento:e.target.value})} required /></div>
        <div className="col-md-3"><label>Tags</label><input className="form-control" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} /></div>
        <div className="col-md-3"><label>Foto antes</label><input className="form-control" type="file" accept="image/*" onChange={e=>setFotoAntes(e.target.files?.[0])} /></div>
        <div className="col-md-3"><label>Foto depois</label><input className="form-control" type="file" accept="image/*" onChange={e=>setFotoDepois(e.target.files?.[0])} /></div>
        <div className="col-md-4"><label>Observações</label><input className="form-control" value={form.observacoes} onChange={e=>setForm({...form, observacoes:e.target.value})} /></div>
        <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
      </div>
    </form>
    <div className="foto-grid">{lista.map(f=><div className="foto-card" key={f.id}><strong>{f.procedimento}</strong><span>{f.cliente?.nome} - {formatarDataHora(f.data)}</span><div className="foto-comparacao"><img src={montarUrlImagem(f.urlAntes)} alt="Antes" />{f.urlDepois && <img src={montarUrlImagem(f.urlDepois)} alt="Depois" />}</div><small>{f.tags}</small></div>)}</div>
  </div>;
}

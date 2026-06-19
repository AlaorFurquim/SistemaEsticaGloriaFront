import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const inicial = {
  clienteId: "",
  profissionalId: "",
  queixaPrincipal: "",
  objetivoTratamento: "",
  gestanteOuLactante: false,
  alergias: false,
  descricaoAlergias: "",
  usaMedicamentos: false,
  medicamentosEmUso: "",
  doencasCronicas: false,
  descricaoDoencas: "",
  procedimentoEsteticoRecente: false,
  procedimentosRecentes: "",
  contraindicacaoDeclarada: false,
  contraindicacoes: "",
  habitosCuidados: "",
  observacoes: ""
};

export default function Anamneses() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const [anamneses, clientesRes, profissionaisRes] = await Promise.all([
        api.get("/anamneses"),
        api.get("/clientes"),
        api.get("/profissionais")
      ]);
      setLista(anamneses.data || []);
      setClientes(clientesRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as anamneses.");
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.clienteId) return alertaErro("Selecione o cliente.");
    if (!form.queixaPrincipal.trim()) return alertaErro("Informe a queixa principal.");

    const payload = {
      ...form,
      clienteId: Number(form.clienteId),
      profissionalId: form.profissionalId ? Number(form.profissionalId) : null
    };

    try {
      loading();
      if (editandoId) await api.put(`/anamneses/${editandoId}`, payload);
      else await api.post("/anamneses", payload);
      setForm(inicial);
      setEditandoId(null);
      await carregar();
      fecharLoading();
      alertaSucesso(editandoId ? "Anamnese atualizada com sucesso." : "Anamnese salva com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar a anamnese.");
    }
  }

  function editar(item) {
    setEditandoId(item.id);
    setForm({
      clienteId: item.clienteId || "",
      profissionalId: item.profissionalId || "",
      queixaPrincipal: item.queixaPrincipal || "",
      objetivoTratamento: item.objetivoTratamento || "",
      gestanteOuLactante: !!item.gestanteOuLactante,
      alergias: !!item.alergias,
      descricaoAlergias: item.descricaoAlergias || "",
      usaMedicamentos: !!item.usaMedicamentos,
      medicamentosEmUso: item.medicamentosEmUso || "",
      doencasCronicas: !!item.doencasCronicas,
      descricaoDoencas: item.descricaoDoencas || "",
      procedimentoEsteticoRecente: !!item.procedimentoEsteticoRecente,
      procedimentosRecentes: item.procedimentosRecentes || "",
      contraindicacaoDeclarada: !!item.contraindicacaoDeclarada,
      contraindicacoes: item.contraindicacoes || "",
      habitosCuidados: item.habitosCuidados || "",
      observacoes: item.observacoes || ""
    });
  }

  function campoBool(campo, label) {
    return (
      <label className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          checked={!!form[campo]}
          onChange={e => setForm({ ...form, [campo]: e.target.checked })}
        />
        <span className="form-check-label">{label}</span>
      </label>
    );
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader title="Anamnese" subtitle="Ficha clínica inicial com riscos, contraindicações e histórico estético" />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Cliente</label>
            <select className="form-select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label>Profissional</label>
            <select className="form-select" value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })}>
              <option value="">Selecione...</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label>Queixa principal</label>
            <input className="form-control" value={form.queixaPrincipal} onChange={e => setForm({ ...form, queixaPrincipal: e.target.value })} />
          </div>
          <div className="col-md-12">
            <label>Objetivo do tratamento</label>
            <input className="form-control" value={form.objetivoTratamento} onChange={e => setForm({ ...form, objetivoTratamento: e.target.value })} />
          </div>

          <div className="col-md-12 anamnese-checks">
            {campoBool("gestanteOuLactante", "Gestante ou lactante")}
            {campoBool("alergias", "Possui alergias")}
            {campoBool("usaMedicamentos", "Usa medicamentos")}
            {campoBool("doencasCronicas", "Doenças crônicas")}
            {campoBool("procedimentoEsteticoRecente", "Procedimento recente")}
            {campoBool("contraindicacaoDeclarada", "Contraindicação declarada")}
          </div>

          <div className="col-md-4"><label>Alergias</label><input className="form-control" value={form.descricaoAlergias} onChange={e => setForm({ ...form, descricaoAlergias: e.target.value })} /></div>
          <div className="col-md-4"><label>Medicamentos em uso</label><input className="form-control" value={form.medicamentosEmUso} onChange={e => setForm({ ...form, medicamentosEmUso: e.target.value })} /></div>
          <div className="col-md-4"><label>Doenças / condições</label><input className="form-control" value={form.descricaoDoencas} onChange={e => setForm({ ...form, descricaoDoencas: e.target.value })} /></div>
          <div className="col-md-6"><label>Procedimentos recentes</label><input className="form-control" value={form.procedimentosRecentes} onChange={e => setForm({ ...form, procedimentosRecentes: e.target.value })} /></div>
          <div className="col-md-6"><label>Contraindicações</label><input className="form-control" value={form.contraindicacoes} onChange={e => setForm({ ...form, contraindicacoes: e.target.value })} /></div>
          <div className="col-md-6"><label>Hábitos e cuidados</label><textarea className="form-control" rows="3" value={form.habitosCuidados} onChange={e => setForm({ ...form, habitosCuidados: e.target.value })} /></div>
          <div className="col-md-6"><label>Observações</label><textarea className="form-control" rows="3" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="col-md-2"><button className="btn btn-primary w-100">{editandoId ? "Atualizar" : "Salvar"}</button></div>
          {editandoId && <div className="col-md-2"><button type="button" className="btn btn-light w-100" onClick={() => { setEditandoId(null); setForm(inicial); }}>Cancelar</button></div>}
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead><tr><th>Data</th><th>Cliente</th><th>Queixa</th><th>Alertas</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(item => (
              <tr key={item.id}>
                <td>{formatarDataHora(item.data)}</td>
                <td>{item.cliente?.nome}</td>
                <td>{item.queixaPrincipal}</td>
                <td>{[item.alergias && "Alergia", item.usaMedicamentos && "Medicamentos", item.contraindicacaoDeclarada && "Contraindicação"].filter(Boolean).join(", ") || "-"}</td>
                <td><button className="btn btn-outline-primary btn-sm" onClick={() => editar(item)}>Editar</button></td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan="5" className="text-center text-muted py-4">Nenhuma anamnese cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

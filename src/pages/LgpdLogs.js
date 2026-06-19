import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const textoPadrao = "Autorizo o tratamento dos meus dados pessoais e dados sensíveis de saúde/estética para cadastro, atendimento, prontuário, comunicação e obrigações legais da clínica.";

export default function LgpdLogs() {
  const [logs, setLogs] = useState([]);
  const [consentimentos, setConsentimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [backup, setBackup] = useState(null);
  const [form, setForm] = useState({ clienteId: "", finalidade: "Atendimento clínico/estético", canal: "Sistema", textoConsentimento: textoPadrao, consentiu: true, observacoes: "" });

  async function carregar() {
    try {
      const [logsRes, consentimentosRes, clientesRes] = await Promise.all([
        api.get("/lgpd-logs"),
        api.get("/lgpd-consentimentos"),
        api.get("/clientes")
      ]);
      setLogs(logsRes.data || []);
      setConsentimentos(consentimentosRes.data || []);
      setClientes(clientesRes.data || []);
    } catch {
      alertaErro("Não foi possível carregar LGPD.");
    }
  }

  async function salvarConsentimento(e) {
    e.preventDefault();
    if (!form.clienteId) return alertaErro("Selecione o cliente.");
    await api.post("/lgpd-consentimentos", { ...form, clienteId: Number(form.clienteId) });
    setForm({ clienteId: "", finalidade: "Atendimento clínico/estético", canal: "Sistema", textoConsentimento: textoPadrao, consentiu: true, observacoes: "" });
    await carregar();
    alertaSucesso("Consentimento registrado.");
  }

  async function anonimizar(clienteId) {
    const motivo = window.prompt("Informe o motivo da anonimização:");
    if (!motivo) return;
    const ok = await confirmarAcao("Anonimizar cliente?", "Dados pessoais serão removidos do cadastro do cliente.");
    if (!ok) return;
    await api.post(`/lgpd-clientes/${clienteId}/anonimizar`, { motivo });
    await carregar();
    alertaSucesso("Cliente anonimizado.");
  }

  async function gerarBackup() {
    const res = await api.get("/lgpd-backup");
    setBackup(res.data);
    alertaSucesso("Resumo de backup gerado.");
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader title="LGPD" subtitle="Logs, consentimentos, anonimização e backup operacional" />

      <div className="panel mb-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Consentimento de uso de dados</h5>
          <button className="btn btn-outline-primary btn-sm" onClick={gerarBackup}>Gerar resumo de backup</button>
        </div>

        {backup && (
          <div className="report-summary mb-3">
            <div><span>Clientes</span><strong>{backup.clientes}</strong></div>
            <div><span>Prontuários</span><strong>{backup.prontuarios}</strong></div>
            <div><span>Receitas</span><strong>{backup.receitas}</strong></div>
            <div><span>Termos</span><strong>{backup.termos}</strong></div>
            <div><span>Logs</span><strong>{backup.logsLgpd}</strong></div>
          </div>
        )}

        <form onSubmit={salvarConsentimento}>
          <div className="row g-2">
            <div className="col-md-3">
              <label>Cliente</label>
              <select className="form-select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-md-3"><label>Finalidade</label><input className="form-control" value={form.finalidade} onChange={e => setForm({ ...form, finalidade: e.target.value })} /></div>
            <div className="col-md-2"><label>Canal</label><input className="form-control" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })} /></div>
            <div className="col-md-2 d-flex align-items-end">
              <label className="form-check">
                <input className="form-check-input" type="checkbox" checked={form.consentiu} onChange={e => setForm({ ...form, consentiu: e.target.checked })} />
                <span className="form-check-label">Consentiu</span>
              </label>
            </div>
            <div className="col-md-12"><label>Texto</label><textarea className="form-control" rows="3" value={form.textoConsentimento} onChange={e => setForm({ ...form, textoConsentimento: e.target.value })} /></div>
            <div className="col-md-10"><label>Observações</label><input className="form-control" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Registrar</button></div>
          </div>
        </form>
      </div>

      <div className="panel mb-3">
        <h5>Consentimentos registrados</h5>
        <table className="table professional-table">
          <thead><tr><th>Data</th><th>Cliente</th><th>Finalidade</th><th>Canal</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {consentimentos.map(x => (
              <tr key={x.id}>
                <td>{formatarDataHora(x.data)}</td>
                <td>{x.cliente?.nome}</td>
                <td>{x.finalidade}</td>
                <td>{x.canal}</td>
                <td>{x.consentiu ? "Consentiu" : "Revogado/negado"}</td>
                <td><button className="btn btn-outline-danger btn-sm" onClick={() => anonimizar(x.clienteId)}>Anonimizar cliente</button></td>
              </tr>
            ))}
            {!consentimentos.length && <tr><td colSpan="6" className="text-center text-muted py-4">Nenhum consentimento registrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h5>Trilha de auditoria</h5>
        <table className="table professional-table">
          <thead><tr><th>Data</th><th>Usuário</th><th>Cliente</th><th>Ação</th><th>Recurso</th><th>IP</th></tr></thead>
          <tbody>
            {logs.map(x => <tr key={x.id}><td>{formatarDataHora(x.data)}</td><td>{x.usuario?.nome}</td><td>{x.cliente?.nome}</td><td>{x.acao}</td><td>{x.recurso}</td><td>{x.ip}</td></tr>)}
            {!logs.length && <tr><td colSpan="6" className="text-center text-muted py-4">Nenhum log registrado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

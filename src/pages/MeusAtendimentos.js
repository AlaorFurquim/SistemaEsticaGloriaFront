import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import ConfirmacaoAgendamento from "../components/ConfirmacaoAgendamento";
import OrigemAgendamento from "../components/OrigemAgendamento";
import { formatarDataHora, formatarMoeda } from "../utils/masks";
import { statusAtendimento } from "../utils/atendimentoStatus";

export default function MeusAtendimentos() {
  const [dados, setDados] = useState([]), [busca, setBusca] = useState("");
  const [erro, setErro] = useState(""), [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const consulta = new AbortController(); setCarregando(true); setErro("");
    api.get("/atendimentos", { signal: consulta.signal }).then(res => setDados(res.data || [])).catch(error => {
      if (!consulta.signal.aborted) setErro(typeof error.response?.data === "string" ? error.response.data : "Não foi possível carregar seus atendimentos.");
    }).finally(() => { if (!consulta.signal.aborted) setCarregando(false); });
    return () => consulta.abort();
  }, [versao]);
  const lista = dados.filter(x => `${x.cliente?.nome || ""} ${x.servico?.nome || ""}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  return <div><PageHeader title="Meus atendimentos" subtitle="Consulte e acompanhe os atendimentos vinculados a você." />
    <section className="panel"><label htmlFor="buscar-meu-atendimento">Buscar cliente ou serviço</label><input id="buscar-meu-atendimento" className="form-control mb-3" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome do cliente ou serviço" />
      {carregando ? <p role="status">Carregando seus atendimentos…</p> : erro ? <div role="alert"><p>{erro}</p><button className="btn btn-outline-primary" onClick={() => setVersao(v => v + 1)}>Tentar novamente</button></div> : <div className="table-responsive"><table className="table professional-table">
        <thead><tr><th>Data / horário</th><th>Cliente</th><th>Serviço</th><th>Situação</th><th>Valor</th><th></th></tr></thead>
        <tbody>{lista.map(x => { const status = statusAtendimento(x.status, x.encaixe); return <tr key={x.id}><td>{formatarDataHora(x.dataHora)}</td><td>{x.cliente?.nome}</td><td>{x.servico?.nome}</td><td><span className={`badge ${status.badge}`}>{status.label}</span><ConfirmacaoAgendamento status={x.status} origem={x.confirmacaoOrigem} /><OrigemAgendamento atendimento={x} /></td><td>{formatarMoeda(x.valorFinal)}</td><td><Link className="btn btn-outline-primary btn-sm" to={`/agenda?atendimento=${x.id}`}>Abrir atendimento</Link></td></tr>; })}
          {!lista.length && <tr><td colSpan="6" className="text-center text-muted py-4">Nenhum atendimento encontrado.</td></tr>}
        </tbody></table></div>}
    </section>
  </div>;
}

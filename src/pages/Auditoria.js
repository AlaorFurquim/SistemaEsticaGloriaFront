import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarDataHora } from "../utils/masks";
import { alertaErro } from "../utils/alerts";

const nomesAcoes = { ADDED: "Criou", MODIFIED: "Alterou", DELETED: "Excluiu" };
const nomesEntidades = {
  Cliente: "Cliente", Atendimento: "Atendimento", Produto: "Produto", Servico: "Serviço",
  Profissional: "Profissional", Venda: "Venda", VendaItem: "Item da venda", Orcamento: "Orçamento",
  Usuario: "Usuário", Receita: "Receita", Prontuario: "Prontuário", Agenda: "Agenda",
  FinanceiroLancamento: "Lançamento financeiro", MovimentacaoEstoque: "Movimentação de estoque"
};
const camposOcultos = new Set(["TenantId"]);

function objeto(valor) {
  try { return valor ? JSON.parse(valor) : null; } catch { return null; }
}

function nomeCampo(campo) {
  return String(campo).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/Id$/, "").trim();
}

function valorLegivel(valor) {
  if (valor === null || valor === undefined || valor === "") return "-";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return formatarDataHora(valor);
  return String(valor);
}

function detalhes(valor) {
  const dados = objeto(valor);
  if (!dados) return valor || "-";
  const itens = Object.entries(dados).filter(([campo]) => !camposOcultos.has(campo));
  if (!itens.length) return "Sem campos para exibir.";
  return itens.map(([campo, conteudo]) => `${nomeCampo(campo)}: ${valorLegivel(conteudo)}`).join(" | ");
}

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({ entidade: "", acao: "", usuario: "", inicio: "", fim: "" });

  async function carregar(e) {
    e?.preventDefault();
    setCarregando(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
      const resposta = await api.get("/administracao/auditoria", { params });
      setLogs(resposta.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os logs de auditoria.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const resumo = useMemo(() => ({
    total: logs.length,
    criados: logs.filter(x => x.acao === "ADDED").length,
    alterados: logs.filter(x => x.acao === "MODIFIED").length,
    excluidos: logs.filter(x => x.acao === "DELETED").length
  }), [logs]);

  async function limpar() {
    setFiltros({ entidade: "", acao: "", usuario: "", inicio: "", fim: "" });
    setCarregando(true);
    try {
      const resposta = await api.get("/administracao/auditoria");
      setLogs(resposta.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os logs de auditoria.");
    } finally {
      setCarregando(false);
    }
  }

  return <div className="audit-page">
    <PageHeader title="Logs e auditoria" subtitle="Histórico de inclusões, alterações e exclusões realizadas no sistema." />

    <div className="audit-metrics">
      <div><span>Registros encontrados</span><strong>{resumo.total}</strong></div>
      <div><span>Inclusões</span><strong>{resumo.criados}</strong></div>
      <div><span>Alterações</span><strong>{resumo.alterados}</strong></div>
      <div><span>Exclusões</span><strong>{resumo.excluidos}</strong></div>
    </div>

    <form className="panel audit-filters" onSubmit={carregar}>
      <div><label>Tela ou registro</label><input className="form-control" placeholder="Ex.: Cliente, Venda" value={filtros.entidade} onChange={e => setFiltros({ ...filtros, entidade: e.target.value })} /></div>
      <div><label>Operação</label><select className="form-select" value={filtros.acao} onChange={e => setFiltros({ ...filtros, acao: e.target.value })}><option value="">Todas</option><option value="ADDED">Inclusões</option><option value="MODIFIED">Alterações</option><option value="DELETED">Exclusões</option></select></div>
      <div><label>Usuário</label><input className="form-control" placeholder="Nome do usuário" value={filtros.usuario} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })} /></div>
      <div><label>Data inicial</label><input type="date" className="form-control" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} /></div>
      <div><label>Data final</label><input type="date" className="form-control" value={filtros.fim} onChange={e => setFiltros({ ...filtros, fim: e.target.value })} /></div>
      <div className="audit-filter-actions"><button type="button" className="btn btn-outline-secondary" onClick={limpar}>Limpar</button><button className="btn btn-primary">Pesquisar</button></div>
    </form>

    <div className="panel audit-list-panel">
      <div className="audit-list-heading"><div><h5>Histórico de atividades</h5><p>São exibidos os 300 registros mais recentes de acordo com os filtros.</p></div><button type="button" className="btn btn-outline-secondary btn-sm" onClick={carregar}>Atualizar</button></div>
      <div className="table-responsive">
        <table className="table professional-table audit-table"><thead><tr><th>Data e hora</th><th>Tela / registro</th><th>Operação</th><th>Usuário</th><th>Unidade</th><th>Antes</th><th>Depois</th></tr></thead>
        <tbody>{logs.map(log => <tr key={log.id}><td className="audit-date">{formatarDataHora(log.data)}</td><td><strong>{nomesEntidades[log.entidade] || log.entidade}</strong><small>Registro #{log.chave || "-"}</small></td><td><span className={`audit-badge ${log.acao === "ADDED" ? "success" : log.acao === "DELETED" ? "danger" : "warning"}`}>{nomesAcoes[log.acao] || log.acao}</span></td><td>{log.usuario || "Sistema"}</td><td>{log.unidade || "-"}</td><td className="audit-values">{detalhes(log.valoresAntes)}</td><td className="audit-values">{detalhes(log.valoresDepois)}</td></tr>)}
        {!logs.length && <tr><td colSpan="7" className="text-center text-muted py-4">{carregando ? "Carregando atividades..." : "Nenhuma atividade encontrada."}</td></tr>}</tbody></table>
      </div>
    </div>
  </div>;
}

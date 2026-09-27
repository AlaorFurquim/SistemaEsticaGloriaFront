import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda } from "../utils/masks";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";

function dataLocal(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export default function FechamentoMensal() {
  const [mes, setMes] = useState(() => dataLocal().slice(0, 7));
  const [vencimento, setVencimento] = useState(() => dataLocal());
  const [dados, setDados] = useState([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [fechando, setFechando] = useState(false);
  const [erro, setErro] = useState("");
  const requisicao = useRef(0);

  async function carregar(competencia) {
    const numero = ++requisicao.current;
    setCarregando(true);
    setErro("");
    setDetalhe(null);
    try {
      const [ano, numeroMes] = competencia.split("-").map(Number);
      const res = await api.get("/comissoes/mensal", { params: { ano, mes: numeroMes } });
      if (numero === requisicao.current) setDados(res.data);
    } catch (error) {
      if (numero === requisicao.current) {
        setDados([]);
        setErro("Não foi possível carregar o fechamento mensal. Tente novamente.");
      }
    } finally {
      if (numero === requisicao.current) setCarregando(false);
    }
  }

  useEffect(() => {
    if (mes) carregar(mes);
    else { setDados([]); setCarregando(false); }
    return () => { requisicao.current += 1; };
  }, [mes]);

  async function fechar(profissional) {
    if (fechando || !vencimento || !mes) return;
    setFechando(true);
    try {
      const ok = await confirmarAcao("Fechar comissão mensal?", `${profissional.profissional} — ${mes.split("-").reverse().join("/")}: ${formatarMoeda(profissional.totalPendente)}. Será criada uma conta a pagar com vencimento em ${vencimento.split("-").reverse().join("/")}.`);
      if (!ok) return;
      const [ano, numeroMes] = mes.split("-").map(Number);
      await api.post("/comissoes/fechar", {
        profissionalId: profissional.profissionalId,
        dataInicio: `${mes}-01`,
        dataFim: dataLocal(new Date(ano, numeroMes, 0)),
        dataVencimento: vencimento,
        observacao: `Fechamento mensal ${mes}.`
      });
      await carregar(mes);
      await alertaSucesso("Comissões fechadas e conta a pagar criada no financeiro.");
    } catch (error) {
      alertaErro(typeof error.response?.data === "string" ? error.response.data : "Não foi possível fechar as comissões.");
      await carregar(mes);
    } finally {
      setFechando(false);
    }
  }

  const linhas = dados.filter(x => !profissionalId || String(x.profissionalId) === profissionalId);
  const totais = linhas.reduce((acc, x) => ({ base: acc.base + x.totalBase, pendente: acc.pendente + x.totalPendente, fechado: acc.fechado + x.totalFechado }), { base: 0, pendente: 0, fechado: 0 });

  return <div>
    <PageHeader title="Fechamento mensal" subtitle="Confira as comissões do mês e feche os valores de cada profissional" />
    <div className="panel mb-3">
      <div className="row g-3 align-items-end">
        <div className="col-md-3"><label htmlFor="competencia">Mês de referência</label><input id="competencia" type="month" min="1900-01" max="9998-12" className="form-control" value={mes} disabled={fechando} onChange={e => setMes(e.target.value)} /></div>
        <div className="col-md-3"><label htmlFor="profissional-mensal">Profissional</label><select id="profissional-mensal" className="form-select" value={profissionalId} onChange={e => { setProfissionalId(e.target.value); setDetalhe(null); }}><option value="">Todos</option>{dados.map(x => <option key={x.profissionalId} value={x.profissionalId}>{x.profissional}</option>)}</select></div>
        <div className="col-md-3"><label htmlFor="vencimento-comissao">Vencimento da comissão</label><input id="vencimento-comissao" type="date" className="form-control" value={vencimento} disabled={fechando} onChange={e => setVencimento(e.target.value)} required /></div>
        <div className="col-md-3"><button className="btn btn-outline-primary" disabled={!mes || carregando || fechando} onClick={() => carregar(mes)}>Atualizar</button> <Link to="/comissoes" className="btn btn-outline-primary">Regras</Link></div>
      </div>
      <p className="text-muted mt-3 mb-0">Apuração pela data dos atendimentos concluídos e das vendas finalizadas. Valores fechados preservam a comissão registrada no fechamento. Fechar gera uma conta a pagar; o pagamento é registrado no financeiro.</p>
    </div>
    {erro && <div role="alert" className="alert alert-danger">{erro}</div>}
    {!mes && <div className="alert alert-info">Selecione o mês de referência.</div>}
    {carregando ? <div role="status" className="panel">Carregando comissões…</div> : !erro && mes && <>
      <div className="row g-3 mb-3">{[["Base comissionável", totais.base], ["Comissão total do mês", totais.pendente + totais.fechado], ["Pendente de fechamento", totais.pendente], ["Já fechado", totais.fechado]].map(([titulo, valor]) => <div className="col-md-3" key={titulo}><div className="metric-card"><span>{titulo}</span><strong>{formatarMoeda(valor)}</strong></div></div>)}</div>
      <div className="panel mb-3"><h5>Comissões por profissional</h5><div className="table-responsive"><table className="table professional-table">
        <thead><tr><th>Profissional</th><th className="text-end">Base</th><th className="text-end">Comissão do mês</th><th className="text-end">Já fechado</th><th className="text-end">Pendente</th><th>Situação</th><th>Ações</th></tr></thead>
        <tbody>{linhas.map(x => <tr key={x.profissionalId}><td>{x.profissional}{!x.ativo && " (inativo)"}</td><td className="text-end">{formatarMoeda(x.totalBase)}</td><td className="text-end fw-bold">{formatarMoeda(x.totalPendente + x.totalFechado)}</td><td className="text-end">{formatarMoeda(x.totalFechado)}</td><td className="text-end">{formatarMoeda(x.totalPendente)}</td><td>{x.totalPendente > 0 ? (x.totalFechado > 0 ? "Parcial" : "Pendente") : x.totalFechado > 0 ? "Fechado" : "Sem comissão"}</td><td><div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm" onClick={() => setDetalhe(x)}>Detalhes</button><button className="btn btn-success btn-sm" disabled={fechando || !vencimento || !x.ativo || x.totalPendente <= 0} onClick={() => fechar(x)}>Fechar mês</button></div></td></tr>)}{!linhas.length && <tr><td colSpan="7" className="text-center text-muted">Nenhum profissional encontrado.</td></tr>}</tbody>
      </table></div></div>
      {detalhe && <div className="panel"><div className="d-flex justify-content-between"><h5>Detalhamento — {detalhe.profissional}</h5><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDetalhe(null)}>Ocultar</button></div><div className="table-responsive"><table className="table professional-table"><thead><tr><th>Data</th><th>Descrição</th><th className="text-end">Base</th><th className="text-end">Comissão</th><th>Situação</th></tr></thead><tbody>{[...detalhe.pendentes, ...detalhe.fechados].sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia)).map((x, i) => <tr key={i}><td>{x.dataReferencia.slice(0, 10).split("-").reverse().join("/")}</td><td>{x.descricao}</td><td className="text-end">{formatarMoeda(x.valorBase)}</td><td className="text-end">{formatarMoeda(x.valorComissao)}</td><td>{x.fechamentoId ? `Fechado #${x.fechamentoId}` : "Pendente"}</td></tr>)}{!detalhe.pendentes.length && !detalhe.fechados.length && <tr><td colSpan="5" className="text-center text-muted">Sem comissões neste mês.</td></tr>}</tbody></table></div></div>}
    </>}
  </div>;
}

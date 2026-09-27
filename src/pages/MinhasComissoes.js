import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import PageHeader from "../components/PageHeader";
import { dataComissao } from "../components/ResumoComissaoSemana";
import useMinhasComissoes from "../hooks/useMinhasComissoes";
import { formatarMoeda } from "../utils/masks";

export default function MinhasComissoes() {
  const [referencia, setReferencia] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { dados, erro, carregando, atualizar } = useMinhasComissoes(referencia);
  const mudarSemana = passo => setReferencia(format(addDays(parseISO(referencia), passo * 7), "yyyy-MM-dd"));
  return <div className="minhas-comissoes">
    <PageHeader title="Minhas comissões" subtitle="Acompanhe quanto você ganhou com seus atendimentos e vendas." />
    <div className="panel comissao-semana-filtro">
      <div className="comissao-semana-navegacao"><button className="btn btn-outline-secondary" aria-label="Semana anterior" onClick={() => mudarSemana(-1)}>‹</button>
        <button className="btn btn-outline-primary" onClick={() => setReferencia(format(new Date(), "yyyy-MM-dd"))}>Esta semana</button>
        <button className="btn btn-outline-secondary" aria-label="Próxima semana" onClick={() => mudarSemana(1)}>›</button>
      </div>
      <label>Semana de referência<input aria-label="Semana de referência" type="date" className="form-control" value={referencia} onChange={e => { if (e.target.value) setReferencia(e.target.value); }} /></label>
    </div>
    {carregando ? <div className="panel" role="status">Carregando suas comissões…</div> : erro ? <div className="panel" role="alert"><p>{erro}</p><button className="btn btn-outline-primary" onClick={atualizar}>Tentar novamente</button></div> : dados && <>
      <div className="comissao-semana-titulo"><h2>{dataComissao(dados.inicioSemana)} a {dataComissao(dados.fimSemana)}</h2><span>{dados.profissional} · Segunda a domingo</span></div>
      <div className="comissao-semana-cards">
        <div className="comissao-semana-card destaque"><span>Comissão da semana</span><strong>{formatarMoeda(dados.totalComissao)}</strong><small>{dados.itens.length} {dados.itens.length === 1 ? "item comissionado" : "itens comissionados"}</small></div>
        <div className="comissao-semana-card"><span>A receber</span><strong>{formatarMoeda(dados.aReceber)}</strong><small>Inclui valores ainda não fechados.</small></div>
        <div className="comissao-semana-card"><span>Já pago</span><strong>{formatarMoeda(dados.pago)}</strong><small>Das comissões geradas nesta semana.</small></div>
      </div>
      <section className="panel"><h3>Detalhamento da semana</h3>
        <p className="text-muted">Comissões de serviços e vendas finalizados no período.</p>
        <div className="table-responsive"><table className="table professional-table">
          <thead><tr><th>Data</th><th>Serviço / produto</th><th className="text-end">Valor base</th><th className="text-end">Sua comissão</th><th>Situação</th></tr></thead>
          <tbody>{dados.itens.map((item, index) => <tr key={index}><td>{dataComissao(item.data)}</td><td>{item.descricao}</td><td className="text-end">{formatarMoeda(item.valorBase)}</td><td className="text-end fw-bold">{formatarMoeda(item.valorComissao)}</td><td><span className={`badge ${item.situacao === "Pago" ? "bg-success" : "bg-secondary"}`}>{item.situacao}</span></td></tr>)}
            {!dados.itens.length && <tr><td colSpan="5" className="text-center text-muted py-4">Você ainda não tem comissões nesta semana.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </>}
  </div>;
}

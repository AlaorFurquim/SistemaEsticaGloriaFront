import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import PageHeader from "./PageHeader";
import MoneyInput from "./MoneyInput";
import { formatarMoeda } from "../utils/masks";
import { alertaErro, alertaSucesso, alertaAviso, confirmarAcao } from "../utils/alerts";

const formas = ["Dinheiro", "Pix", "Cartão Débito", "Cartão Crédito"];
export default function ReceberVendaPdv({ id }) {
  const navigate = useNavigate(), location = useLocation(), lock = useRef(false);
  const [venda, setVenda] = useState(null), [caixa, setCaixa] = useState(null), [loading, setLoading] = useState(true), [erro, setErro] = useState(false), [tentativa, setTentativa] = useState(0);
  const [forma, setForma] = useState("Dinheiro"), [misto, setMisto] = useState(false), [valores, setValores] = useState({}), [emitir, setEmitir] = useState(true), [busy, setBusy] = useState(false);
  const [finalizada, setFinalizada] = useState(false), [erroNota, setErroNota] = useState(false);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setErro(false);
    Promise.all([api.get("/vendas/abertas", { signal: abort.signal }), api.get("/caixa/atual", { signal: abort.signal })])
      .then(([vendas, atual]) => { if (!abort.signal.aborted) { setVenda(vendas.data.find(v => String(v.id) === id) || null); setCaixa(atual.data); } })
      .catch(() => { if (!abort.signal.aborted) setErro(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [id, tentativa]);
  async function finalizar() {
    if (lock.current || finalizada || !venda || !caixa) return;
    const pagamentos = misto ? formas.map(formaPagamento => ({ formaPagamento, valor: Number(valores[formaPagamento] || 0) })).filter(p => p.valor > 0) : [{ formaPagamento: forma, valor: venda.total }];
    if (pagamentos.some(p => !Number.isFinite(p.valor)) || Math.round(pagamentos.reduce((s, p) => s + p.valor, 0) * 100) !== Math.round(venda.total * 100)) return alertaAviso("Os pagamentos precisam somar exatamente o total da venda.");
    lock.current = true; setBusy(true);
    try {
      if (!await confirmarAcao("Finalizar venda?", `Orçamento #${venda.id} • ${formatarMoeda(venda.total)}`)) return;
      await api.put(`/vendas/${venda.id}/finalizar`, pagamentos);
      setFinalizada(true); window.dispatchEvent(new Event("comissoesAtualizadas"));
      if (emitir) {
        try { await api.post(`/notas-fiscais/emitir-venda-completa/${venda.id}`); }
        catch { setErroNota(true); return; }
      }
      await alertaSucesso("Venda finalizada pelo PDV.");
    } catch (error) { await alertaErro(error.response?.data || "Não foi possível finalizar a venda."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div><PageHeader title="PDV" subtitle="Confira o orçamento e finalize o recebimento." />
    {loading ? <section className="panel" role="status">Carregando venda...</section> : erro ? <section className="panel" role="alert">Não foi possível carregar a venda. <button className="btn btn-primary" onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button></section> : !venda ? <section className="panel">Orçamento indisponível ou já finalizado. <Link className="btn btn-outline-primary" to="/vendas">Voltar aos orçamentos</Link></section> : finalizada ?
      <section className="panel"><h2 className="h5">Venda #{venda.id} finalizada</h2><p>{erroNota ? "O pagamento foi registrado, mas a nota fiscal não pôde ser emitida. Confira a emissão no módulo fiscal; não refaça o recebimento." : "Recebimento registrado no caixa."}</p><button className="btn btn-primary" onClick={() => navigate("/vendas")}>Voltar aos orçamentos</button></section> : !caixa ?
      <section className="panel"><h2 className="h5">Abra o caixa para iniciar as vendas</h2><p>O orçamento será mantido para você continuar o recebimento.</p><Link className="btn btn-success" to="/caixa" state={{ retornoPdv: location.pathname + location.search }}>Abrir caixa</Link></section> : <>
      <section className="panel"><h2 className="h5">Orçamento #{venda.id}</h2><p>{venda.cliente?.nome || "Cliente não identificado"}</p>
        <div className="table-responsive"><table className="table"><thead><tr><th>Item</th><th>Quantidade</th><th>Total</th></tr></thead><tbody>{venda.itens.map((item, i) => <tr key={item.id || i}><td>{item.produto?.nome || item.servico?.nome || item.nome || item.tipo}</td><td>{item.quantidade}</td><td>{formatarMoeda(item.total)}</td></tr>)}</tbody></table></div>
        <p>Desconto: {formatarMoeda(venda.desconto)}</p><strong>Total: {formatarMoeda(venda.total)}</strong>
      </section>
      <section className="panel"><h2 className="h5">Pagamento</h2><fieldset disabled={busy}>
        <label htmlFor="pdv-orcamento-forma">Forma de pagamento</label><select id="pdv-orcamento-forma" className="form-select mb-3" value={forma} onChange={e => setForma(e.target.value)} disabled={busy || misto}>{formas.map(f => <option key={f}>{f}</option>)}</select>
        <label className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={misto} onChange={e => setMisto(e.target.checked)} />Pagamento misto</label>
        {misto && <div className="row g-3 mb-3">{formas.map(f => <div className="col-sm-6 col-lg-3" key={f}><label htmlFor={`pdv-${f}`}>{f}</label><MoneyInput id={`pdv-${f}`} value={valores[f] || ""} onValueChange={valor => setValores(v => ({ ...v, [f]: valor }))} /></div>)}</div>}
        <label className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={emitir} onChange={e => setEmitir(e.target.checked)} />Emitir nota ao finalizar</label>
        <button className="btn btn-success" onClick={finalizar}>{busy ? "Finalizando..." : "Finalizar venda"}</button>
      </fieldset></section></>}
  </div>;
}

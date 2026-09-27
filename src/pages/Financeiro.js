import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import MoneyInput from "../components/MoneyInput";
import { useSessao } from "../components/SessaoProvider";
import { formatarMoeda } from "../utils/masks";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const dataLocal = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"); };
const inicial = { descricao: "", tipo: "PAGAR", tipoCusto: "VARIAVEL", recorrenteMensal: false, periodicidade: "MENSAL", dataInicioRecorrencia: "", dataFimRecorrencia: "", categoriaFinanceiraId: "", profissionalId: "", valor: "", dataVencimento: "" };
const formatarData = valor => valor ? valor.slice(0, 10).split("-").reverse().join("/") : "—";
const rotuloCusto = lancamento => {
  if (lancamento.tipo !== "PAGAR") return "—";
  if (lancamento.tipoCusto !== "FIXO") return "Variável";
  return lancamento.recorrenteMensal ? `Fixo · ${(lancamento.periodicidade || "MENSAL").toLowerCase()}` : "Fixo";
};

export default function Financeiro() {
  const { usuario } = useSessao();
  const ehAdministrador = usuario?.perfil === "Administrador";
  const [aba, setAba] = useState("resumo");
  const abas = [["resumo", "Resumo"], ["lancamentos", "Lançamentos"], ["novo", "Nova conta / salário"], ["categorias", "Categorias"]];
  const [mes, setMes] = useState(() => dataLocal().slice(0, 7));
  const [categorias, setCategorias] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [form, setForm] = useState(inicial);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [baixa, setBaixa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const consulta = useRef(0);

  async function carregar() {
    const versao = ++consulta.current;
    setCarregando(true); setErro("");
    try {
      const [ano, numeroMes] = mes.split("-").map(Number);
      const [a, b, c, d] = await Promise.all([api.get("/financeiro/categorias"), api.get("/financeiro/lancamentos"), api.get("/financeiro/resumo", { params: { ano, mes: numeroMes } }), api.get("/profissionais")]);
      if (versao !== consulta.current) return;
      setCategorias(a.data); setLancamentos(b.data); setResumo(c.data); setProfissionais(d.data);
    } catch {
      if (versao === consulta.current) { setResumo(null); setErro("Não foi possível carregar o resultado financeiro. Tente atualizar novamente."); }
    } finally { if (versao === consulta.current) setCarregando(false); }
  }

  useEffect(() => {
    if (mes) carregar(); else { setResumo(null); setCarregando(false); }
    return () => { consulta.current += 1; };
  }, [mes]);

  async function salvar(e) {
    e.preventDefault(); setSalvando(true);
    try {
      await api.post("/financeiro/lancamentos", { ...form, dataInicioRecorrencia: form.dataInicioRecorrencia || null, dataFimRecorrencia: form.dataFimRecorrencia || null, categoriaFinanceiraId: Number(form.categoriaFinanceiraId), profissionalId: form.profissionalId ? Number(form.profissionalId) : null, valor: Number(form.valor) });
      setForm(inicial); setAba("lancamentos"); await carregar(); await alertaSucesso("Lançamento criado. Registre a baixa quando o pagamento acontecer.");
    } catch (e) { alertaErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível criar o lançamento."); }
    finally { setSalvando(false); }
  }

  async function criarCategoria(e) {
    e.preventDefault(); if (!novaCategoria.trim()) return; setSalvando(true);
    try { await api.post("/financeiro/categorias", { nome: novaCategoria.trim(), tipo: "AMBOS" }); setNovaCategoria(""); await carregar(); }
    catch { alertaErro("Não foi possível criar a categoria."); } finally { setSalvando(false); }
  }

  async function baixar(e) {
    e.preventDefault(); setSalvando(true);
    try {
      await api.put("/financeiro/lancamentos/" + baixa.id + "/baixar", { formaPagamento: baixa.formaPagamento, dataPagamento: baixa.dataPagamento });
      setBaixa(null); await carregar(); await alertaSucesso("Baixa registrada na data informada.");
    } catch (e) { alertaErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível registrar a baixa."); }
    finally { setSalvando(false); }
  }

  const visiveis = lancamentos.filter(x => x.status === "PAGO" ? x.dataPagamento?.slice(0, 7) === mes : x.status === "PENDENTE" && x.dataVencimento.slice(0, 7) <= mes);
  const cards = resumo ? [
    ["Faturamento do mês", resumo.faturamentoMes, "Vendas e serviços"],
    ["Recebido no mês", resumo.recebidoMes, "Entradas recebidas no período"],
    ["Despesas pagas", resumo.pagoMes, "Contas, salários e comissões"],
    ["Quanto sobrou no mês", resumo.resultadoMes, "Recebimentos menos pagamentos"]
  ] : [];
  const reservaOperacional = resumo ? resumo.custosFixosPagos + resumo.custosFixosPendentes : 0;
  const saldoDepoisDosCompromissos = resumo ? Math.max(0, resumo.saldoAposCompromissos) : 0;
  const tetoProLabore = Math.max(0, saldoDepoisDosCompromissos - reservaOperacional);

  return <div className="financeiro-page">
    <PageHeader title="Resultado financeiro" subtitle="Acompanhe o faturamento, os pagamentos e quanto sobrou no mês">
      <Link to="/fechamento-mensal" className="btn btn-outline-primary">Fechar comissões</Link>
      <button className="btn btn-primary" disabled={carregando || salvando || !mes} onClick={carregar}>Atualizar</button>
    </PageHeader>
    <div className="financeiro-toolbar"><div className="financeiro-periodo"><label htmlFor="mes-financeiro">Mês de referência</label><input id="mes-financeiro" type="month" className="form-control" style={{ maxWidth: 240 }} min="1900-01" max="9998-12" value={mes} disabled={salvando} onChange={e => setMes(e.target.value)} />
      </div><p className="financeiro-periodo-nota">Seu resultado, mês a mês.<br /><span>Selecione o período para acompanhar os valores.</span></p>
    </div>
    <div className="financeiro-tabs" role="tablist" aria-label="Seções do financeiro">
      {abas.map(([id, titulo], index) => <button key={id} type="button" role="tab" id={"aba-fin-" + id} aria-controls={"painel-fin-" + id} aria-selected={aba === id} tabIndex={aba === id ? 0 : -1} className={"financeiro-tab" + (aba === id ? " active" : "")} onClick={() => setAba(id)} onKeyDown={e => {
        const destinos = { ArrowRight: (index + 1) % abas.length, ArrowLeft: (index + abas.length - 1) % abas.length, Home: 0, End: abas.length - 1 };
        if (destinos[e.key] === undefined) return;
        e.preventDefault();
        const proxima = abas[destinos[e.key]][0];
        setAba(proxima);
        document.getElementById("aba-fin-" + proxima)?.focus();
      }}>{titulo}</button>)}
    </div>
    {erro && <div role="alert" className="alert alert-danger">{erro}</div>}
    {carregando && <div role="status" className="panel mb-3">Carregando resultado…</div>}
    {!mes && <div className="alert alert-info">Selecione um mês.</div>}
    <section id="painel-fin-resumo" role="tabpanel" aria-labelledby="aba-fin-resumo" hidden={aba !== "resumo"} tabIndex={0}>
    {!carregando && resumo && <>
      <div className="financeiro-kpis">{cards.map(([titulo, valor, texto], index) => <article className={"financeiro-kpi financeiro-kpi-" + index} key={titulo}>
        <span className="financeiro-kpi-label">{titulo}</span>
        <strong className={valor < 0 ? "text-danger" : ""}>{formatarMoeda(valor)}</strong>
        <small>{texto}</small>
      </article>)}</div>
      {ehAdministrador && <aside className="financeiro-prolabore" aria-label="Pró-labore do administrador">
        <div className="financeiro-prolabore-conteudo">
          <span className="financeiro-prolabore-acesso">Visível somente para o administrador</span>
          <h2>Teto estimado para pró-labore</h2>
          <p>Preserva os compromissos atuais e uma reserva equivalente a um mês de custos fixos.</p>
          <div className="financeiro-prolabore-calculo">
            <span><small>Após compromissos</small><strong>{formatarMoeda(saldoDepoisDosCompromissos)}</strong></span>
            <b aria-hidden="true">−</b>
            <span><small>Reserva operacional</small><strong>{formatarMoeda(reservaOperacional)}</strong></span>
          </div>
        </div>
        <div className="financeiro-prolabore-valor">
          <span>Limite sugerido</span>
          <strong className={tetoProLabore <= 0 ? "text-danger" : ""}>{formatarMoeda(tetoProLabore)}</strong>
          <small>{tetoProLabore > 0 ? "Não ultrapassar sem revisar o caixa" : "Não há retirada segura estimada neste mês"}</small>
        </div>
        <p className="financeiro-prolabore-aviso">Estimativa gerencial. O valor oficial deve considerar a função exercida, o contrato social e a orientação do contador.</p>
      </aside>}
      <div className="financeiro-compromissos">
        <div className="financeiro-section-heading"><div><h2>Próximos compromissos</h2><p>Pendências até o fim do mês, incluindo contas atrasadas.</p></div><Link className="btn btn-outline-primary" to="/fechamento-mensal">Conferir comissões →</Link></div>
        <div className="financeiro-pendencias">{[["Contas a pagar", resumo.pendentesPagar], ["Comissões a fechar", resumo.comissoesNaoFechadas], ["Ainda a receber", resumo.pendentesReceber]].map(([t, v]) => <div key={t}><span>{t}</span><strong>{formatarMoeda(v)}</strong></div>)}</div>
        <div className="financeiro-projecao">
          <div><span>Após quitar as pendências</span><strong className={resumo.saldoAposCompromissos < 0 ? "text-danger" : ""}>{formatarMoeda(resumo.saldoAposCompromissos)}</strong></div>
          <p>Recebendo também os valores pendentes,<br />a previsão é de <strong>{formatarMoeda(resumo.fluxoProjetado)}</strong>.</p>
        </div>
      </div>
      <div className="financeiro-custos-grid">
        <div><span>Custos fixos pagos</span><strong>{formatarMoeda(resumo.custosFixosPagos)}</strong><small>Despesas mensais já pagas</small></div>
        <div><span>Custos fixos pendentes</span><strong>{formatarMoeda(resumo.custosFixosPendentes)}</strong><small>Compromissos recorrentes</small></div>
        <div><span>Custos variáveis pagos</span><strong>{formatarMoeda(resumo.custosVariaveisPagos)}</strong><small>Despesas ocasionais</small></div>
        <div><span>Custos variáveis pendentes</span><strong>{formatarMoeda(resumo.custosVariaveisPendentes)}</strong><small>Extras ainda em aberto</small></div>
      </div>
      <details className="financeiro-ajuda"><summary>Como interpretar os valores</summary><p>Registre todas as despesas e suas baixas para manter o resultado completo. Os recebimentos do caixa entram automaticamente e não devem ser lançados novamente. Sangrias e suprimentos não compõem o resultado.</p><p>Comissões fechadas já estão nas contas a pagar. A previsão considera as pendências atuais e não representa o saldo bancário nem um fechamento contábil histórico.</p></details>

    </>}
    </section>
    <section id="painel-fin-novo" role="tabpanel" aria-labelledby="aba-fin-novo" hidden={aba !== "novo"} tabIndex={0}>
    <form className="panel mb-3" onSubmit={salvar}><h5>Registrar conta ou salário</h5><div className="row g-2">
      <div className="col-md-4"><label htmlFor="descricao-fin">Descrição</label><input id="descricao-fin" required className="form-control" placeholder="Ex.: salário de setembro — Maria" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
      <div className="col-md-2"><label htmlFor="tipo-fin">Tipo</label><select id="tipo-fin" className="form-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value, tipoCusto: e.target.value === "PAGAR" ? form.tipoCusto : "VARIAVEL", recorrenteMensal: e.target.value === "PAGAR" ? form.recorrenteMensal : false })}><option value="PAGAR">Conta a pagar</option><option value="RECEBER">Conta a receber</option></select></div>
      {form.tipo === "PAGAR" && <div className="col-md-3"><label htmlFor="tipo-custo-fin">Classificação</label><select id="tipo-custo-fin" className="form-select" value={form.tipoCusto} onChange={e => setForm({ ...form, tipoCusto: e.target.value, recorrenteMensal: e.target.value === "FIXO" ? form.recorrenteMensal : false })}><option value="FIXO">Custo fixo mensal</option><option value="VARIAVEL">Custo variável / ocasional</option></select></div>}
      <div className="col-md-3"><label htmlFor="categoria-fin">Categoria</label><select id="categoria-fin" required className="form-select" value={form.categoriaFinanceiraId} onChange={e => setForm({ ...form, categoriaFinanceiraId: e.target.value })}><option value="">Selecione</option>{categorias.map(x => <option value={x.id} key={x.id}>{x.nome}</option>)}</select></div>
      <div className="col-md-3"><label htmlFor="prof-fin">Profissional (opcional)</label><select id="prof-fin" className="form-select" value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })}><option value="">Sem vínculo</option>{profissionais.map(x => <option value={x.id} key={x.id}>{x.nome}</option>)}</select></div>
      <div className="col-md-3"><label>Valor</label><MoneyInput required value={form.valor} onValueChange={valor => setForm({ ...form, valor })} /></div>
      <div className="col-md-3"><label htmlFor="venc-fin">Vencimento</label><input id="venc-fin" required type="date" className="form-control" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} /></div>
      {form.tipo === "PAGAR" && form.tipoCusto === "FIXO" && <div className="col-md-3 d-flex align-items-end"><label className="form-check mb-2"><input type="checkbox" className="form-check-input me-2" checked={form.recorrenteMensal} onChange={e => setForm({ ...form, recorrenteMensal: e.target.checked })} />Gerar recorrência</label></div>}
      {form.tipo === "PAGAR" && form.tipoCusto === "FIXO" && form.recorrenteMensal && <>
        <div className="col-md-3"><label htmlFor="periodicidade-fin">Periodicidade</label><select id="periodicidade-fin" className="form-select" value={form.periodicidade} onChange={e => setForm({ ...form, periodicidade: e.target.value })}><option value="MENSAL">Mensal</option><option value="BIMESTRAL">Bimestral</option><option value="TRIMESTRAL">Trimestral</option><option value="SEMESTRAL">Semestral</option><option value="ANUAL">Anual</option></select></div>
        <div className="col-md-3"><label htmlFor="inicio-rec-fin">Início da recorrência</label><input id="inicio-rec-fin" type="date" className="form-control" value={form.dataInicioRecorrencia} onChange={e => setForm({ ...form, dataInicioRecorrencia: e.target.value })} /></div>
        <div className="col-md-3"><label htmlFor="fim-rec-fin">Fim (opcional)</label><input id="fim-rec-fin" type="date" className="form-control" value={form.dataFimRecorrencia} onChange={e => setForm({ ...form, dataFimRecorrencia: e.target.value })} /></div>
      </>}
      <div className="col-md-3 d-flex align-items-end"><button disabled={salvando || !mes} className="btn btn-primary">Salvar lançamento</button></div>
    </div></form>
    <button type="button" className="btn btn-outline-primary mb-3" onClick={() => setAba("categorias")}>Precisa de outra categoria? Cadastre aqui</button>
    </section>
    <section id="painel-fin-categorias" role="tabpanel" aria-labelledby="aba-fin-categorias" hidden={aba !== "categorias"} tabIndex={0}>
    <form className="panel mb-3" onSubmit={criarCategoria}><div className="row g-2 align-items-end"><div className="col-md-6"><label htmlFor="nova-categoria">Nova categoria</label><input id="nova-categoria" required className="form-control" placeholder="Ex.: Salários, Encargos, Aluguel, Impostos, Taxas de cartão" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} /></div><div className="col-md-3"><button disabled={salvando || !mes} className="btn btn-outline-secondary">Adicionar categoria</button></div></div></form>
    {!carregando && resumo && <div className="panel mb-3"><h5>Despesas por categoria</h5><div className="table-responsive"><table className="table professional-table"><thead><tr><th>Categoria</th><th className="text-end">Pago no mês</th><th className="text-end">Pendente até o fim do mês</th></tr></thead><tbody>{resumo.despesasPorCategoria.map(x => <tr key={x.categoria}><td>{x.categoria}</td><td className="text-end">{formatarMoeda(x.pago)}</td><td className="text-end">{formatarMoeda(x.pendente)}</td></tr>)}{!resumo.despesasPorCategoria.length && <tr><td colSpan="3" className="text-center text-muted">Nenhuma despesa registrada. Use a aba Nova conta / salário para cadastrar.</td></tr>}</tbody></table></div></div>}
    <div className="panel"><h5>Categorias cadastradas</h5><div className="d-flex flex-wrap gap-2">{categorias.map(x => <span className="badge bg-light text-dark border" key={x.id}>{x.nome}</span>)}{!categorias.length && <p className="text-muted mb-0">Nenhuma categoria cadastrada.</p>}</div></div>
    </section>
    <section id="painel-fin-lancamentos" role="tabpanel" aria-labelledby="aba-fin-lancamentos" hidden={aba !== "lancamentos"} tabIndex={0}>
    <button type="button" className="btn btn-primary mb-3" onClick={() => setAba("novo")}>Nova conta / salário</button>
    {baixa && <form className="panel mb-3 border border-primary" onSubmit={baixar}><h5>Registrar {baixa.tipo === "PAGAR" ? "pagamento" : "recebimento"}: {baixa.descricao}</h5><p>{formatarMoeda(baixa.valor)}</p><div className="row g-2 align-items-end"><div className="col-md-3"><label htmlFor="data-baixa">Data efetiva</label><input id="data-baixa" required type="date" max={dataLocal()} className="form-control" value={baixa.dataPagamento} onChange={e => setBaixa({ ...baixa, dataPagamento: e.target.value })} /></div><div className="col-md-3"><label htmlFor="forma-baixa">Forma de pagamento</label><select id="forma-baixa" className="form-select" value={baixa.formaPagamento} onChange={e => setBaixa({ ...baixa, formaPagamento: e.target.value })}>{["Pix", "Dinheiro", "Transferência", "Boleto", "Cartão"].map(x => <option key={x}>{x}</option>)}</select></div><div className="col-md-6 d-flex gap-2"><button disabled={salvando} className="btn btn-success">Confirmar baixa</button><button type="button" disabled={salvando} className="btn btn-outline-secondary" onClick={() => setBaixa(null)}>Cancelar</button></div></div></form>}
     {!carregando && !erro && mes && <div className="panel"><h5>Pagamentos do mês e contas pendentes até o fim do mês</h5><div className="table-responsive"><table className="table professional-table"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Tipo</th><th>Custo</th><th>Categoria</th><th>Valor</th><th>Pagamento</th><th>Status</th><th>Ação</th></tr></thead><tbody>{visiveis.map(x => <tr key={x.id}><td>{formatarData(x.dataVencimento)}</td><td>{x.descricao}</td><td>{x.tipo}</td><td>{rotuloCusto(x)}</td><td>{x.categoria?.nome}</td><td>{formatarMoeda(x.valor)}</td><td>{formatarData(x.dataPagamento)}</td><td>{x.status}</td><td>{x.status === "PENDENTE" && <button disabled={salvando} className="btn btn-outline-success btn-sm" onClick={() => setBaixa({ ...x, dataPagamento: dataLocal(), formaPagamento: "Pix" })}>Registrar baixa</button>}</td></tr>)}{!visiveis.length && <tr><td colSpan="9" className="text-center text-muted">Nenhum lançamento neste período.</td></tr>}</tbody></table></div></div>}
    </section>
  </div>;
}

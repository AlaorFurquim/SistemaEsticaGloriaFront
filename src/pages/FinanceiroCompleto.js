import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarMoeda } from "../utils/masks";

const inicial = {
  tipo: "Receber",
  categoria: "Procedimentos",
  descricao: "",
  valor: 0,
  vencimento: "",
  pagamento: "",
  clienteId: "",
  observacoes: ""
};

export default function FinanceiroCompleto() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(inicial);
  const [dre, setDre] = useState(null);

  async function carregar() {
    try {
      const [lancamentos, clientesRes, dreRes] = await Promise.all([
        api.get("/financeiro-lancamentos"),
        api.get("/clientes"),
        api.get("/financeiro-dre")
      ]);

      setLista(lancamentos.data || []);
      setClientes(clientesRes.data || []);
      setDre(dreRes.data || null);
    } catch {
      alertaErro("Erro ao carregar financeiro.");
    }
  }

  async function salvar(e) {
    e.preventDefault();
    await api.post("/financeiro-lancamentos", {
      ...form,
      valor: Number(form.valor),
      clienteId: form.clienteId ? Number(form.clienteId) : null,
      pagamento: form.pagamento || null
    });
    setForm(inicial);
    await carregar();
    alertaSucesso("Lançamento salvo.");
  }

  async function marcarPago(id) {
    await api.post(`/financeiro-lancamentos/${id}/pagar`, {});
    await carregar();
    alertaSucesso("Lançamento marcado como pago.");
  }

  useEffect(() => {
    carregar();
  }, []);

  const receber = lista.filter(x => x.tipo === "Receber").reduce((s, x) => s + Number(x.valor || 0), 0);
  const pagar = lista.filter(x => x.tipo === "Pagar").reduce((s, x) => s + Number(x.valor || 0), 0);

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Contas a pagar/receber, despesas, inadimplência e DRE simples" />

      <div className="report-summary">
        <div><span>A receber</span><strong>{formatarMoeda(receber)}</strong></div>
        <div><span>A pagar</span><strong>{formatarMoeda(pagar)}</strong></div>
        <div><span>Saldo previsto</span><strong>{formatarMoeda(receber - pagar)}</strong></div>
      </div>

      {dre && (
        <div className="panel mb-3">
          <h5>DRE simples do mês</h5>
          <div className="report-summary">
            <div><span>Receitas</span><strong>{formatarMoeda(dre.receitas)}</strong></div>
            <div><span>Despesas</span><strong>{formatarMoeda(dre.despesas)}</strong></div>
            <div><span>Resultado</span><strong>{formatarMoeda(dre.resultadoPrevisto)}</strong></div>
            <div><span>Caixa realizado</span><strong>{formatarMoeda(dre.caixaRealizado)}</strong></div>
            <div><span>Inadimplência</span><strong>{formatarMoeda(dre.inadimplente)}</strong></div>
          </div>

          <table className="table professional-table mt-3">
            <thead><tr><th>Tipo</th><th>Categoria</th><th>Valor</th></tr></thead>
            <tbody>
              {(dre.categorias || []).map((c, i) => (
                <tr key={i}><td>{c.tipo}</td><td>{c.categoria}</td><td>{formatarMoeda(c.valor)}</td></tr>
              ))}
              {!dre.categorias?.length && <tr><td colSpan="3" className="text-center text-muted py-3">Sem lançamentos no período.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">
          <div className="col-md-2">
            <label>Tipo</label>
            <select className="form-select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option>Receber</option>
              <option>Pagar</option>
            </select>
          </div>
          <div className="col-md-2"><label>Categoria</label><input className="form-control" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
          <div className="col-md-3"><label>Descrição</label><input className="form-control" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required /></div>
          <div className="col-md-2"><label>Valor</label><input type="number" step="0.01" className="form-control" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} /></div>
          <div className="col-md-2"><label>Vencimento</label><input type="date" className="form-control" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} /></div>
          <div className="col-md-3">
            <label>Cliente</label>
            <select className="form-select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Sem cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="col-md-7"><label>Observações</label><input className="form-control" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead><tr><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(x => {
              const vencido = x.status !== "Pago" && x.vencimento && new Date(x.vencimento) < new Date();
              return (
                <tr key={x.id} className={vencido ? "table-warning" : ""}>
                  <td>{x.tipo}</td>
                  <td>{x.categoria}</td>
                  <td>{x.descricao}</td>
                  <td>{x.cliente?.nome || "-"}</td>
                  <td>{x.vencimento?.slice(0, 10)}</td>
                  <td>{formatarMoeda(x.valor)}</td>
                  <td>{vencido ? "Vencido" : x.status}</td>
                  <td>{x.status !== "Pago" && <button className="btn btn-outline-success btn-sm" onClick={() => marcarPago(x.id)}>Pago</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

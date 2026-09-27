import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import PageHeader from "../components/PageHeader";
import ModuleTabs from "../components/ModuleTabs";
import MoneyInput from "../components/MoneyInput";
import EnviarOrcamentoWhatsApp from "../components/EnviarOrcamentoWhatsApp";
import { formatarMoeda } from "../utils/masks";
import { alertaErro, alertaSucesso, alertaAviso, confirmarAcao, solicitarMotivo, solicitarPinOperador } from "../utils/alerts";
import { obterBranding } from "../utils/branding";
import { marcaImpressao, escaparHtml } from "../utils/marcaImpressao";

const orcamentoInicial = { clienteId: "", desconto: "", itens: [] };
const itemInicial = { tipo: "SERVICO", referenciaId: "", profissionalId: "", quantidade: "1" };

export default function Vendas() {
  const navigate = useNavigate();
  const [aba, setAba] = useState("orcamentos");
  const [vendas, setVendas] = useState([]);
  const [abertas, setAbertas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [modalOrcamentoAberto, setModalOrcamentoAberto] = useState(false);
  const [orcamento, setOrcamento] = useState(orcamentoInicial);
  const [novoItem, setNovoItem] = useState(itemInicial);
  const [orcamentoWhatsApp, setOrcamentoWhatsApp] = useState(null);

  const totaisOrcamento = useMemo(() => {
    const subtotal = orcamento.itens.reduce((total, item) => total + Number(item.total || 0), 0);
    const desconto = Number(orcamento.desconto || 0);
    return { subtotal, desconto, total: Math.max(0, subtotal - desconto) };
  }, [orcamento]);

  async function carregar() {
    try {
      const [vendasRes, abertasRes, clientesRes, servicosRes, produtosRes, profissionaisRes] = await Promise.all([
        api.get("/vendas"),
        api.get("/vendas/abertas"),
        api.get("/clientes"),
        api.get("/servicos"),
        api.get("/produtos"),
        api.get("/vendas/profissionais-comissao")
      ]);

      setVendas(vendasRes.data || []);
      setAbertas(abertasRes.data || []);
      setClientes(clientesRes.data || []);
      setServicos(servicosRes.data || []);
      setProdutos(produtosRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as vendas.");
    }
  }

  function limparOrcamento() {
    setOrcamento(orcamentoInicial);
    setNovoItem(itemInicial);
  }

  function abrirNovoOrcamento() {
    limparOrcamento();
    setModalOrcamentoAberto(true);
  }

  function opcoesDoTipo(tipo = novoItem.tipo) {
    return tipo === "PRODUTO" ? produtos : servicos;
  }

  function adicionarItemOrcamento() {
    const quantidade = Number(novoItem.quantidade || 0);
    const referenciaId = Number(novoItem.referenciaId || 0);
    const cadastro = opcoesDoTipo().find(x => x.id === referenciaId);

    if (!cadastro) return alertaAviso("Selecione um serviço ou produto.");
    if (quantidade <= 0) return alertaAviso("Informe uma quantidade maior que zero.");

    const valorUnitario = Number(novoItem.tipo === "PRODUTO" ? cadastro.precoVenda : cadastro.valor || 0);
    const item = {
      idLocal: `${Date.now()}-${Math.random()}`,
      tipo: novoItem.tipo,
      produtoId: novoItem.tipo === "PRODUTO" ? cadastro.id : null,
      servicoId: novoItem.tipo === "SERVICO" ? cadastro.id : null,
      profissionalId: novoItem.profissionalId ? Number(novoItem.profissionalId) : null,
      nome: cadastro.nome,
      quantidade,
      valorUnitario,
      total: valorUnitario * quantidade
    };

    setOrcamento(atual => ({ ...atual, itens: [...atual.itens, item] }));
    setNovoItem(itemInicial);
  }

  function removerItemOrcamento(idLocal) {
    setOrcamento(atual => ({ ...atual, itens: atual.itens.filter(item => item.idLocal !== idLocal) }));
  }

  async function salvarOrcamento(e) {
    e.preventDefault();
    if (!orcamento.itens.length) return alertaAviso("Inclua pelo menos um item no orçamento.");
    if (totaisOrcamento.desconto > totaisOrcamento.subtotal) return alertaAviso("O desconto não pode ser maior que o subtotal.");

    try {
      const payload = {
        clienteId: orcamento.clienteId ? Number(orcamento.clienteId) : null,
        desconto: Number(orcamento.desconto || 0),
        status: "ORCAMENTO",
        itens: orcamento.itens.map(item => ({
          tipo: item.tipo,
          produtoId: item.produtoId,
          servicoId: item.servicoId,
          profissionalId: item.profissionalId,
          quantidade: item.quantidade
        }))
      };

      const itensParaImpressao = [...orcamento.itens];
      const res = await api.post("/vendas", payload);
      const vendaCriada = {
        ...res.data,
        cliente: clientes.find(x => x.id === Number(payload.clienteId)),
        itens: itensParaImpressao
      };

      await carregar();
      setModalOrcamentoAberto(false);
      limparOrcamento();
      await alertaSucesso("Orçamento lançado com sucesso.");
      imprimirOrcamento(vendaCriada);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível lançar o orçamento.");
    }
  }

  function finalizar(venda) {
    navigate(`/pdv?vendaId=${venda.id}`);
  }

  async function estornar(venda) {
    const motivo = await solicitarMotivo("Estornar venda", "Motivo do estorno/devolução");
    if (!motivo) return;

    const pinOperador = await solicitarPinOperador("Autorizar estorno");
    if (!pinOperador) return;

    const ok = await confirmarAcao("Confirmar estorno?", `Venda #${venda.id} • Total: ${formatarMoeda(venda.total)}`);
    if (!ok) return;

    try {
      await api.put(`/vendas/${venda.id}/estornar`, { motivo, pinOperador });
      await carregar();
      await alertaSucesso("Venda estornada, estoque devolvido e caixa ajustado.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível estornar a venda.");
    }
  }

  function nomeItem(item) {
    return item.produto?.nome || item.servico?.nome || item.nome || (item.tipo === "PRODUTO" ? "Produto" : "Serviço");
  }

  function imprimirOrcamento(venda) {
    const branding = obterBranding();
    const itens = venda.itens || [];
    const linhas = itens.map(item => `
      <tr>
        <td>${item.tipo === "PRODUTO" ? "Produto" : "Serviço"}</td>
        <td>${escaparHtml(nomeItem(item))}</td>
        <td class="right">${Number(item.quantidade || 0).toLocaleString("pt-BR")}</td>
        <td class="right">${formatarMoeda(Number(item.valorUnitario || 0))}</td>
        <td class="right">${formatarMoeda(Number(item.total || 0))}</td>
      </tr>
    `).join("");

    const janela = window.open("", "_blank", "width=900,height=700");
    if (!janela) return alertaAviso("O navegador bloqueou a impressão. Libere pop-ups para imprimir o orçamento.");

    janela.document.write(`
      <html>
        <head>
          <title>Orçamento #${venda.id}</title>
          <style>
            *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:32px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #6f4cff;padding-bottom:18px;margin-bottom:22px}.brand h1{margin:0;font-size:28px}.brand p,.meta p{margin:4px 0;color:#475569}.badge{display:inline-block;background:#f5f3ff;color:#4c1d95;padding:6px 10px;border-radius:999px;font-weight:700}.box{border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#111827;color:#fff;text-align:left}th,td{padding:10px;border-bottom:1px solid #e2e8f0}.right{text-align:right}.totals{margin-left:auto;width:320px}.totals div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0}.total{font-size:22px;font-weight:800;color:#16a34a}.footer{margin-top:34px;color:#64748b;font-size:13px}@media print{body{margin:20px}}
          </style>
        </head>
        <body>
          <div class="top">
            <div class="brand">
              <span class="badge">ORÇAMENTO</span>
              ${marcaImpressao(branding)}
            </div>
            <div class="meta">
              <p><strong>Nº:</strong> #${venda.id || "-"}</p>
              <p><strong>Data:</strong> ${new Date(venda.data || new Date()).toLocaleString("pt-BR")}</p>
              <p><strong>Status:</strong> ${escaparHtml(venda.status || "ORCAMENTO")}</p>
            </div>
          </div>
          <div class="box"><strong>Cliente</strong><p>${escaparHtml(venda.cliente?.nome || "Consumidor")}</p></div>
          <div class="box">
            <strong>Itens do orçamento</strong>
            <table>
              <thead><tr><th>Tipo</th><th>Descrição</th><th class="right">Qtd.</th><th class="right">Unitário</th><th class="right">Total</th></tr></thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
          <div class="totals">
            <div><span>Subtotal</span><strong>${formatarMoeda(Number(venda.subtotal || 0))}</strong></div>
            <div><span>Desconto</span><strong>${formatarMoeda(Number(venda.desconto || 0))}</strong></div>
            <div class="total"><span>Total</span><strong>${formatarMoeda(Number(venda.total || 0))}</strong></div>
          </div>
          <div class="footer">Orçamento sujeito à disponibilidade de agenda, produtos e condições comerciais no momento da aprovação.</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      {orcamentoWhatsApp && <EnviarOrcamentoWhatsApp venda={orcamentoWhatsApp} onClose={() => setOrcamentoWhatsApp(null)} />}
      <PageHeader title="Vendas e orçamentos" subtitle="Lance orçamentos, imprima para o cliente e receba quando aprovado.">
        <button type="button" className="btn btn-primary" onClick={abrirNovoOrcamento}>Novo orçamento</button>
      </PageHeader>

      <ModuleTabs
        active={aba}
        onChange={setAba}
        tabs={[
          { id: "orcamentos", label: "Orçamentos", description: `${abertas.length} em aberto` },
          { id: "recebimento", label: "Recebimento", description: "Aprovar e receber" },
          { id: "historico", label: "Histórico", description: "Consulta e estorno" }
        ]}
      />

      {aba === "recebimento" && <div className="panel mb-3">
        <h5>Recebimento pelo PDV</h5>
        <p>Selecione o orçamento para conferir os itens e escolher o pagamento no PDV. Abrir o PDV não registra a venda.</p>
      </div>}

      {(aba === "orcamentos" || aba === "recebimento") && (
        <div className="panel">
          <div className="section-title">
            <div>
              <h5>Orçamentos em aberto</h5>
              <p>Envie pelo WhatsApp, imprima ou registre o recebimento quando aprovado.</p>
            </div>
          </div>
          <table className="table professional-table">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Status</th><th>Itens</th><th className="text-end">Total</th><th className="text-end">Ação</th></tr></thead>
            <tbody>
              {abertas.map(x => (
                <tr key={x.id}>
                  <td>#{x.id}</td>
                  <td>{x.cliente?.nome || "Consumidor"}</td>
                  <td><span className="badge bg-warning text-dark">{x.status}</span></td>
                  <td>{x.itens?.length || 0}</td>
                  <td className="text-end fw-bold">{formatarMoeda(x.total)}</td>
                  <td className="text-end">
                    <div className="actions justify-content-end">
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => imprimirOrcamento(x)}>Imprimir</button>
                      <button type="button" className="btn btn-outline-success btn-sm" onClick={() => setOrcamentoWhatsApp({ ...x, itens: (x.itens || []).map(item => ({ ...item, descricao: nomeItem(item) })) })}>Enviar pelo WhatsApp</button>
                      {aba === "recebimento" && <button type="button" className="btn btn-outline-success btn-sm" onClick={() => finalizar(x)}>Receber</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!abertas.length && <tr><td colSpan="6" className="text-center text-muted py-3">Nenhum orçamento em aberto.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {aba === "historico" && (
        <div className="panel">
          <h5>Histórico de vendas</h5>
          <table className="table professional-table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Status</th><th className="text-end">Total</th><th className="text-end">Ação</th></tr></thead>
            <tbody>
              {vendas.map(x => (
                <tr key={x.id}>
                  <td>{new Date(x.data).toLocaleString("pt-BR")}</td>
                  <td>{x.cliente?.nome || "Consumidor"}</td>
                  <td>{x.formaPagamento}</td>
                  <td>{x.status}</td>
                  <td className="text-end fw-bold">{formatarMoeda(x.total)}</td>
                  <td className="text-end">{x.status === "FINALIZADA" ? <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => estornar(x)}>Estornar</button> : "-"}</td>
                </tr>
              ))}
              {!vendas.length && <tr><td colSpan="6" className="text-center text-muted py-3">Nenhuma venda registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modalOrcamentoAberto && (
        <div className="modal d-block" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <form className="modal-content" onSubmit={salvarOrcamento}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Novo orçamento</h5>
                  <small className="text-muted">Monte os serviços/produtos, salve e imprima para o cliente.</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setModalOrcamentoAberto(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label>Cliente</label>
                    <select className="form-select" value={orcamento.clienteId} onChange={e => setOrcamento({ ...orcamento, clienteId: e.target.value })}>
                      <option value="">Consumidor / sem cadastro</option>
                      {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label>Desconto</label>
                    <MoneyInput value={orcamento.desconto} onValueChange={valor => setOrcamento({ ...orcamento, desconto: valor })} placeholder="R$ 0,00" />
                  </div>
                </div>

                <div className="panel compact-panel mb-3">
                  <div className="row g-2 align-items-end">
                    <div className="col-md-2">
                      <label>Tipo</label>
                      <select className="form-select" value={novoItem.tipo} onChange={e => setNovoItem({ ...itemInicial, tipo: e.target.value })}>
                        <option value="SERVICO">Serviço</option>
                        <option value="PRODUTO">Produto</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label>{novoItem.tipo === "PRODUTO" ? "Produto" : "Serviço"}</label>
                      <select className="form-select" value={novoItem.referenciaId} onChange={e => setNovoItem({ ...novoItem, referenciaId: e.target.value })}>
                        <option value="">Selecione</option>
                        {opcoesDoTipo().map(opcao => (
                          <option key={opcao.id} value={opcao.id}>
                            {opcao.nome} - {formatarMoeda(Number(novoItem.tipo === "PRODUTO" ? opcao.precoVenda : opcao.valor || 0))}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label>Profissional</label>
                      <select className="form-select" value={novoItem.profissionalId} onChange={e => setNovoItem({ ...novoItem, profissionalId: e.target.value })}>
                        <option value="">Sem profissional</option>
                        {profissionais.map(profissional => <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>)}
                      </select>
                    </div>
                    <div className="col-md-1">
                      <label>Qtd.</label>
                      <input type="number" min="0.001" step="0.001" className="form-control" value={novoItem.quantidade} onChange={e => setNovoItem({ ...novoItem, quantidade: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <button type="button" className="btn btn-outline-primary w-100" onClick={adicionarItemOrcamento}>Adicionar</button>
                    </div>
                  </div>
                </div>

                <table className="table professional-table">
                  <thead><tr><th>Tipo</th><th>Descrição</th><th className="text-end">Qtd.</th><th className="text-end">Unit.</th><th className="text-end">Total</th><th></th></tr></thead>
                  <tbody>
                    {orcamento.itens.map(item => (
                      <tr key={item.idLocal}>
                        <td><span className="badge bg-primary">{item.tipo === "PRODUTO" ? "Produto" : "Serviço"}</span></td>
                        <td>{item.nome}</td>
                        <td className="text-end">{item.quantidade}</td>
                        <td className="text-end">{formatarMoeda(item.valorUnitario)}</td>
                        <td className="text-end fw-bold">{formatarMoeda(item.total)}</td>
                        <td className="text-end"><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removerItemOrcamento(item.idLocal)}>Remover</button></td>
                      </tr>
                    ))}
                    {!orcamento.itens.length && <tr><td colSpan="6" className="text-center text-muted py-3">Adicione serviços ou produtos no orçamento.</td></tr>}
                  </tbody>
                </table>

                <div className="report-summary justify-content-end">
                  <div><span>Subtotal</span><strong>{formatarMoeda(totaisOrcamento.subtotal)}</strong></div>
                  <div><span>Desconto</span><strong>{formatarMoeda(totaisOrcamento.desconto)}</strong></div>
                  <div><span>Total</span><strong>{formatarMoeda(totaisOrcamento.total)}</strong></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setModalOrcamentoAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar e imprimir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

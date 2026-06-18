import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import {
  alertaErro,
  alertaSucesso,
  confirmarAcao,
  loading,
  fecharLoading
} from "../utils/alerts";
import { formatarMoeda, formatarDataHora } from "../utils/masks";

const formas = ["Dinheiro", "Pix", "Cartão de Crédito", "Cartão de Débito"];

export default function Orcamentos() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [opcoesItens, setOpcoesItens] = useState([]);

  const [form, setForm] = useState({
    clienteId: "",
    profissionalId: "",
    desconto: 0,
    formaPagamento: "Dinheiro",
    observacoes: ""
  });

  const [item, setItem] = useState({
    itemSelecionado: "",
    quantidade: 1
  });

  const [itens, setItens] = useState([]);
  const [orcamentoImpressao, setOrcamentoImpressao] = useState(null);

  async function carregar() {
    try {
      const [orc, cli, prof, itensPesquisa] = await Promise.all([
        api.get("/orcamentos"),
        api.get("/clientes"),
        api.get("/profissionais"),
        api.get("/orcamentos/itens/pesquisar")
      ]);

      setLista(orc.data);
      setClientes(cli.data);
      setProfissionais(prof.data);
      setOpcoesItens(itensPesquisa.data);
    } catch {
      alertaErro("Não foi possível carregar os dados de orçamento.");
    }
  }

  function adicionarItem() {
    const selecionado = opcoesItens.find(
      x => `${x.tipo}-${x.id}` === item.itemSelecionado
    );

    if (!selecionado) {
      alertaErro("Selecione um produto ou serviço.");
      return;
    }

    const quantidade = Number(item.quantidade || 1);
    const valor = Number(selecionado.valor || 0);

    setItens([
      ...itens,
      {
        produtoId: selecionado.tipo === "PRODUTO" ? selecionado.id : null,
        servicoId: selecionado.tipo === "SERVICO" ? selecionado.id : null,
        tipo: selecionado.tipo,
        descricao: selecionado.nome,
        quantidade,
        valorUnitario: valor,
        total: quantidade * valor
      }
    ]);

    setItem({ itemSelecionado: "", quantidade: 1 });
  }

  async function salvar(e) {
    e.preventDefault();

    if (!form.profissionalId) return alertaErro("Selecione a profissional.");
    if (itens.length === 0) return alertaErro("Adicione pelo menos um item.");

    try {
      loading();

      await api.post("/orcamentos", {
        ...form,
        clienteId: form.clienteId || null,
        profissionalId: Number(form.profissionalId),
        desconto: Number(form.desconto || 0),
        itens: itens.map(x => ({
          produtoId: x.produtoId,
          servicoId: x.servicoId,
          descricao: x.descricao,
          quantidade: Number(x.quantidade),
          valorUnitario: Number(x.valorUnitario)
        }))
      });

      setForm({
        clienteId: "",
        profissionalId: "",
        desconto: 0,
        formaPagamento: "Dinheiro",
        observacoes: ""
      });

      setItens([]);
      await carregar();

      fecharLoading();
      alertaSucesso("Orçamento salvo com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar o orçamento.");
    }
  }

  async function aprovar(orcamento) {
    const ok = await confirmarAcao(
      "Aprovar orçamento?",
      "Ao aprovar, será gerada uma venda e enviada para o financeiro/caixa."
    );

    if (!ok) return;

    try {
      loading();

      await api.post(`/orcamentos/${orcamento.id}/aprovar`, {
        formaPagamento: orcamento.formaPagamento || "Dinheiro"
      });

      await carregar();
      fecharLoading();
      alertaSucesso("Orçamento aprovado com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível aprovar o orçamento.");
    }
  }

  function imprimirOrcamento(orcamento) {
    setOrcamentoImpressao(orcamento);
    setTimeout(() => window.print(), 150);
  }

  function enviarWhatsApp(orcamento) {
    const telefone = (orcamento.cliente?.telefone || orcamento.cliente?.celular || "").replace(/\D/g, "");

    if (!telefone) {
      alertaErro("Cliente sem telefone cadastrado.");
      return;
    }

    const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const texto = `Olá ${orcamento.cliente?.nome || ""}, segue seu orçamento nº ${orcamento.id} no valor de ${formatarMoeda(orcamento.total)}. Qualquer dúvida fico à disposição.`;

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  const subtotal = itens.reduce((s, x) => s + x.total, 0);
  const total = subtotal - Number(form.desconto || 0);

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Orçamentos"
          subtitle="Orçamentos com produtos, serviços, profissional responsável e aprovação para o financeiro"
        />

        <form className="panel mb-3" onSubmit={salvar}>
          <div className="row g-2">
            <div className="col-md-3">
              <label>Cliente</label>
              <select
                className="form-select"
                value={form.clienteId}
                onChange={e => setForm({ ...form, clienteId: e.target.value })}
              >
                <option value="">Sem cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label>Profissional</label>
              <select
                className="form-select"
                value={form.profissionalId}
                onChange={e => setForm({ ...form, profissionalId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label>Forma Pagamento</label>
              <select
                className="form-select"
                value={form.formaPagamento}
                onChange={e => setForm({ ...form, formaPagamento: e.target.value })}
              >
                {formas.map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label>Desconto</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={form.desconto}
                onChange={e => setForm({ ...form, desconto: e.target.value })}
              />
            </div>

            <div className="col-md-2">
              <label>Total</label>
              <input className="form-control" value={formatarMoeda(total)} readOnly />
            </div>

            <div className="col-md-5">
              <label>Produto/Serviço</label>
              <select
                className="form-select"
                value={item.itemSelecionado}
                onChange={e => setItem({ ...item, itemSelecionado: e.target.value })}
              >
                <option value="">Selecione...</option>
                {opcoesItens.map(x => (
                  <option key={`${x.tipo}-${x.id}`} value={`${x.tipo}-${x.id}`}>
                    {x.tipo === "PRODUTO" ? "Produto" : "Serviço"} - {x.nome} - {formatarMoeda(x.valor)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label>Quantidade</label>
              <input
                type="number"
                step="0.001"
                className="form-control"
                value={item.quantidade}
                onChange={e => setItem({ ...item, quantidade: e.target.value })}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button type="button" className="btn btn-outline-primary w-100" onClick={adicionarItem}>
                Adicionar
              </button>
            </div>

            <div className="col-md-3 d-flex align-items-end">
              <button className="btn btn-primary w-100">Salvar orçamento</button>
            </div>
          </div>
        </form>

        <div className="panel mb-3">
          <strong>Itens do orçamento</strong>

          <table className="table professional-table">
            <tbody>
              {itens.map((x, i) => (
                <tr key={i}>
                  <td>{x.tipo === "PRODUTO" ? "Produto" : "Serviço"}</td>
                  <td>{x.descricao}</td>
                  <td>{x.quantidade}</td>
                  <td>{formatarMoeda(x.valorUnitario)}</td>
                  <td>{formatarMoeda(x.total)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setItens(itens.filter((_, idx) => idx !== i))}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <table className="table professional-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Profissional</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {lista.map(o => (
                <tr key={o.id}>
                  <td>{formatarDataHora(o.data)}</td>
                  <td>{o.cliente?.nome}</td>
                  <td>{o.profissional?.nome}</td>
                  <td>{formatarMoeda(o.total)}</td>
                  <td>{o.status}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => imprimirOrcamento(o)}>
                        Imprimir
                      </button>

                      <button className="btn btn-outline-success btn-sm" onClick={() => enviarWhatsApp(o)}>
                        WhatsApp
                      </button>

                      {o.status === 1 || o.status === "Pendente" ? (
                        <button className="btn btn-success btn-sm" onClick={() => aprovar(o)}>
                          Aprovar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {orcamentoImpressao && (
        <div className="orcamento-print-area">
          <div className="orcamento-print-header">
            <div className="orcamento-print-brand">
              <img src="/logo-gloria.jpeg" alt="Glória Couto" />
              <div>
                <strong>Glória Couto</strong>
                <span>Estética Avançada</span>
              </div>
            </div>

            <div className="orcamento-print-title">
              <h1>Orçamento</h1>
              <p>Nº {orcamentoImpressao.id}</p>
            </div>

            <div className="orcamento-print-status">{orcamentoImpressao.status}</div>
          </div>

          <div className="orcamento-print-info">
            <div><strong>Cliente</strong><span>{orcamentoImpressao.cliente?.nome || "Não informado"}</span></div>
            <div><strong>Profissional</strong><span>{orcamentoImpressao.profissional?.nome || "Não informado"}</span></div>
            <div><strong>Data</strong><span>{formatarDataHora(orcamentoImpressao.data)}</span></div>
            <div><strong>Forma de pagamento</strong><span>{orcamentoImpressao.formaPagamento}</span></div>
          </div>

          <table className="orcamento-print-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Qtd.</th>
                <th>Valor unit.</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {(orcamentoImpressao.itens || []).map(item => (
                <tr key={item.id}>
                  <td>{item.descricao || item.produto?.nome || item.servico?.nome}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatarMoeda(item.valorUnitario)}</td>
                  <td>{formatarMoeda(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="orcamento-print-totais">
            <div><span>Subtotal</span><strong>{formatarMoeda(orcamentoImpressao.subtotal)}</strong></div>
            <div><span>Desconto</span><strong>{formatarMoeda(orcamentoImpressao.desconto || 0)}</strong></div>
            <div className="orcamento-print-total"><span>Total</span><strong>{formatarMoeda(orcamentoImpressao.total)}</strong></div>
          </div>

          {orcamentoImpressao.observacoes && (
            <div className="orcamento-print-observacoes">
              <strong>Observações</strong>
              <p>{orcamentoImpressao.observacoes}</p>
            </div>
          )}

          <div className="orcamento-print-assinatura">
            <span>Assinatura do cliente</span>
          </div>
        </div>
      )}
    </div>
  );
}
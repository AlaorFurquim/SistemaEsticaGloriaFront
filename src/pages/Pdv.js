import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import LeitorCodigoCamera from "../components/LeitorCodigoCamera";
import CatalogoPdv from "../components/CatalogoPdv";
import { formatarMoeda } from "../utils/masks";
import { urlArquivo } from "../utils/urlArquivo";
import useWorkflowPdv from "../hooks/useWorkflowPdv";
import {
  alertaErro,
  alertaSucesso,
  alertaAviso,
  confirmarAcao
} from "../utils/alerts";

export default function Pdv() {
  const codigoRef = useRef(null);
  const { separado: separarProdutosServicos } = useWorkflowPdv();

  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [caixasAbertos, setCaixasAbertos] = useState([]);
  const [pdvId, setPdvId] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [cameraAberta, setCameraAberta] = useState(false);
  const [produtoBusca, setProdutoBusca] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [desconto, setDesconto] = useState(0);
  const [emitirNota, setEmitirNota] = useState(true);
  const [pix, setPix] = useState(null);
  const [pixCarregando, setPixCarregando] = useState(false);
  const [pixErro, setPixErro] = useState("");
  const [pixCopiado, setPixCopiado] = useState(false);
  const [atendimentoPendente, setAtendimentoPendente] = useState(null);

  async function carregar() {
    try {
      const produtosRes = await api.get("/produtos");
      const clientesRes = await api.get("/clientes");
      const vendasRes = await api.get("/vendas");
      const servicosRes = await api.get("/servicos");
      const pdvsRes = await api.get("/caixa/pdvs");
      const caixasRes = await api.get("/caixa/abertos");

      setProdutos(produtosRes.data || []);
      setClientes(clientesRes.data || []);
      setVendas(vendasRes.data || []);
      setServicos(servicosRes.data || []);
      carregarAtendimentoPendente(produtosRes.data || [], servicosRes.data || [], clientesRes.data || []);

      const listaPdvs = pdvsRes.data || [];
      setPdvs(listaPdvs);
      const listaCaixas = caixasRes.data || [];
      setCaixasAbertos(listaCaixas);

      const pdvSelecionadoTemCaixa = listaCaixas.some(x => String(x.pdvId) === String(pdvId));
      if (!pdvSelecionadoTemCaixa) {
        setPdvId(listaCaixas[0]?.pdvId || "");
      }
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar os dados do PDV."
      );
    }
  }

  function carregarAtendimentoPendente(produtosCarregados, servicosCarregados, clientesCarregados) {
    const salvo = sessionStorage.getItem("pdvAtendimentoPendente");
    if (!salvo) return;

    try {
      const pendente = JSON.parse(salvo);
      const itensPdv = (pendente.itens || []).map(item => {
        if (item.produtoId) {
          const produto = produtosCarregados.find(x => Number(x.id) === Number(item.produtoId));
          if (!produto) return null;
          return {
            tipo: "PRODUTO", produtoId: produto.id, servicoId: null,
            codigoBarras: produto.codigoBarras, nome: produto.nome,
            quantidade: Number(item.quantidade || 1), valorUnitario: Number(produto.precoVenda || 0),
            total: Number(produto.precoVenda || 0) * Number(item.quantidade || 1), foto: produto.foto || ""
          };
        }
        const servico = servicosCarregados.find(x => Number(x.id) === Number(item.servicoId));
        if (!servico) return null;
        return {
          tipo: "SERVICO", produtoId: null, servicoId: servico.id,
          codigoBarras: "", nome: servico.nome, quantidade: Number(item.quantidade || 1),
          valorUnitario: Number(servico.valor || 0), total: Number(servico.valor || 0) * Number(item.quantidade || 1)
        };
      }).filter(Boolean);

      const cliente = clientesCarregados.find(x => Number(x.id) === Number(pendente.clienteId));
      setItens(itensPdv);
      setDesconto(Number(pendente.desconto || 0));
      setClienteId(pendente.clienteId || "");
      setClienteBusca(cliente?.nome || pendente.clienteNome || "");
      setAtendimentoPendente(pendente);
    } catch {
      sessionStorage.removeItem("pdvAtendimentoPendente");
    }
  }

  function focarCodigo() {
    setTimeout(() => codigoRef.current?.focus(), 100);
  }

  const itensFiltrados = [
    ...produtos.map((p) => ({
      tipo: "PRODUTO",
      id: p.id,
      nome: p.nome,
      codigoBarras: p.codigoBarras,
      valor: p.precoVenda,
      estoque: p.quantidadeEstoque
    })),
    ...servicos.map((s) => ({
      tipo: "SERVICO",
      id: s.id,
      nome: s.nome,
      codigoBarras: "",
      valor: s.valor,
      estoque: null
    }))
  ].filter((x) => {
    const texto = produtoBusca.toLowerCase();

    return (
      x.nome?.toLowerCase().includes(texto) ||
      String(x.codigoBarras || "").includes(produtoBusca)
    );
  });

  const clientesFiltrados = clientes.filter((x) => {
    const texto = clienteBusca.toLowerCase();

    return (
      x.nome?.toLowerCase().includes(texto) ||
      String(x.documento || "").includes(clienteBusca) ||
      String(x.telefone || "").includes(clienteBusca)
    );
  });

  const pdvAtual = pdvs.find((x) => String(x.id) === String(pdvId));
  const caixaAtual = caixasAbertos.find((x) => String(x.pdvId) === String(pdvId));
  const pdvsComCaixaAberto = pdvs.filter(p => caixasAbertos.some(c => String(c.pdvId) === String(p.id)));

  const hoje = new Date();

  const vendasHojePdv = vendas.filter((v) => {
    const dataVenda = new Date(v.data);

    const mesmaData =
      dataVenda.getDate() === hoje.getDate() &&
      dataVenda.getMonth() === hoje.getMonth() &&
      dataVenda.getFullYear() === hoje.getFullYear();

    const mesmoPdv = String(v.pdvId || "") === String(pdvId || "");

    return mesmaData && mesmoPdv;
  });

  function adicionarServico(servico) {
    const quantidadeNumerica = Number(quantidade);

    if (quantidadeNumerica <= 0) {
      alertaAviso("Informe uma quantidade válida.");
      return;
    }

    setItens([
      ...itens,
      {
        tipo: "SERVICO",
        produtoId: null,
        servicoId: servico.id,
        codigoBarras: "",
        nome: servico.nome,
        quantidade: quantidadeNumerica,
        valorUnitario: servico.valor,
        total: servico.valor * quantidadeNumerica
      }
    ]);

    setProdutoBusca("");
    setQuantidade(1);
    focarCodigo();
  }

  function selecionarCliente(cliente) {
    setClienteId(cliente.id);
    setClienteBusca(cliente.nome);
    focarCodigo();
  }

  function limparCliente() {
    setClienteId("");
    setClienteBusca("");
    focarCodigo();
  }

  function adicionarProduto(produto, qtd) {
    if (!produto) {
      alertaAviso("Produto não encontrado.");
      focarCodigo();
      return;
    }

    const quantidadeNumerica = Number(qtd);

    if (quantidadeNumerica <= 0) {
      alertaAviso("Informe uma quantidade válida.");
      focarCodigo();
      return;
    }

    const itemExistente = itens.find((x) => x.produtoId === produto.id);
    const quantidadeAtualCarrinho = itemExistente
      ? itemExistente.quantidade
      : 0;

    const novaQuantidadeTotal =
      quantidadeAtualCarrinho + quantidadeNumerica;

    if (produto.quantidadeEstoque < novaQuantidadeTotal) {
      alertaAviso(`Estoque insuficiente para ${produto.nome}.`);
      focarCodigo();
      return;
    }

    if (itemExistente) {
      setItens(
        itens.map((x) =>
          x.produtoId === produto.id
            ? {
                ...x,
                quantidade: novaQuantidadeTotal,
                total: x.valorUnitario * novaQuantidadeTotal
              }
            : x
        )
      );
    } else {
      setItens([
        ...itens,
        {
          tipo: "PRODUTO",
          produtoId: produto.id,
          servicoId: null,
          codigoBarras: produto.codigoBarras,
          nome: produto.nome,
          quantidade: quantidadeNumerica,
          valorUnitario: produto.precoVenda,
          total: produto.precoVenda * quantidadeNumerica,
          foto: produto.foto || ""
        }
      ]);
    }

    setCodigoBarras("");
    setProdutoBusca("");
    setQuantidade(1);
    focarCodigo();
  }

  function adicionarPorCodigo(e) {
    e.preventDefault();

    const codigo = codigoBarras.trim();

    if (!codigo) {
      alertaAviso("Leia ou digite um código de barras.");
      focarCodigo();
      return;
    }

    const produto = produtos.find(
      (x) => String(x.codigoBarras || "").trim() === codigo
    );

    adicionarProduto(produto, quantidade);
  }

  function adicionarPorPesquisa(item) {
    if (item.tipo === "PRODUTO") {
      adicionarProduto(
        {
          id: item.id,
          nome: item.nome,
          codigoBarras: item.codigoBarras,
          precoVenda: item.valor,
          quantidadeEstoque: item.estoque,
          foto: item.foto
        },
        quantidade
      );
    } else {
      adicionarServico(item);
    }
  }

  function remover(index) {
    setItens(itens.filter((_, idx) => idx !== index));
    focarCodigo();
  }

  const subtotal = itens.reduce((s, x) => s + x.total, 0);
  const total = subtotal - Number(desconto || 0);

  useEffect(() => {
    if (formaPagamento !== "Pix" || total <= 0) {
      setPix(null);
      setPixErro("");
      setPixCarregando(false);
      return;
    }

    let ativo = true;
    setPixCarregando(true);
    setPixErro("");
    setPixCopiado(false);

    const temporizador = setTimeout(async () => {
      try {
        const resposta = await api.post("/pix/venda", {
          valor: total,
          txId: null,
          descricao: `Venda ${pdvAtual?.numero || "PDV"}`
        });
        if (ativo) setPix(resposta.data);
      } catch (error) {
        if (!ativo) return;
        setPix(null);
        setPixErro(error.response?.data || "Não foi possível gerar o Pix desta venda.");
      } finally {
        if (ativo) setPixCarregando(false);
      }
    }, 300);

    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, [formaPagamento, total, pdvAtual?.numero]);

  async function copiarPix() {
    if (!pix?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 2000);
    } catch {
      alertaErro("Não foi possível copiar o código Pix.");
    }
  }

  async function finalizar() {
    if (!pdvId) {
      alertaAviso("Abra o caixa de um terminal antes de usar o PDV.");
      return;
    }

    if (!caixaAtual) {
      alertaAviso("O caixa deste terminal está fechado. Abra-o antes de finalizar a venda.");
      return;
    }

    if (!itens.length) {
      alertaAviso("Adicione pelo menos um item.");
      focarCodigo();
      return;
    }

    if (total < 0) {
      alertaAviso("O desconto não pode ser maior que o subtotal.");
      return;
    }

    const confirmou = await confirmarAcao(
      "Finalizar venda?",
      `PDV: ${pdvAtual?.numero || "-"} | Total: ${formatarMoeda(total)}`
    );

    if (!confirmou) return;

    try {
      const vendaRes = await api.post("/vendas", {
        clienteId: clienteId ? Number(clienteId) : null,
        caixaId: Number(caixaAtual.id),
        formaPagamento,
        desconto: Number(desconto),
        itens: itens.map((x) => ({
          tipo: x.tipo,
          produtoId: x.produtoId,
          servicoId: x.servicoId,
          quantidade: x.quantidade
        }))
      });

      if (atendimentoPendente?.atendimentoId) {
        const payloadAtendimento = {
          ...atendimentoPendente.payload,
          formaPagamento,
          vencimento: new Date().toISOString().slice(0, 10),
          marcarComoPago: true,
          finalizarNoPdv: true,
          orcamento: {
            ...atendimentoPendente.payload.orcamento,
            formaPagamento
          }
        };
        await api.post(`/atendimentos/${atendimentoPendente.atendimentoId}/finalizar-fluxo`, payloadAtendimento);
      }

      if (emitirNota) {
        await api.post(
          `/notas-fiscais/emitir-venda-completa/${vendaRes.data.id}`
        );
      }

      setItens([]);
      setDesconto(0);
      setClienteId("");
      setClienteBusca("");
      setCodigoBarras("");
      setProdutoBusca("");
      setQuantidade(1);
      setAtendimentoPendente(null);
      sessionStorage.removeItem("pdvAtendimentoPendente");

      await carregar();

      await alertaSucesso(
        emitirNota
          ? "Venda finalizada e nota fiscal enviada com sucesso."
          : "Venda finalizada com sucesso."
      );

      focarCodigo();
    } catch (error) {
      alertaErro(
        error.response?.data || "Não foi possível finalizar a venda."
      );
    }
  }

  useEffect(() => {
    carregar();
    focarCodigo();
  }, []);

  return (
    <div>
      <PageHeader title="PDV" />

      {atendimentoPendente && (
        <div className="pdv-attendance-banner">
          <div>
            <strong>Atendimento #{atendimentoPendente.atendimentoId} pronto para receber</strong>
            <span>{atendimentoPendente.clienteNome || "Cliente"} · Itens e desconto já carregados no carrinho.</span>
          </div>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => {
            sessionStorage.removeItem("pdvAtendimentoPendente");
            setAtendimentoPendente(null);
            setItens([]);
            setDesconto(0);
            setClienteId("");
            setClienteBusca("");
          }}>Cancelar envio</button>
        </div>
      )}

      <div className="pdv-card mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label>PDV / Terminal</label>
            <select
              className="form-select"
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
            >
              <option value="">Selecione o PDV</option>
              {pdvsComCaixaAberto.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero} - {p.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <div className="alert alert-info mb-0">
              PDV atual:{" "}
              <strong>
                {pdvAtual
                  ? `${pdvAtual.numero} - ${pdvAtual.descricao}`
                  : "Nenhum"}
              </strong>
            </div>
          </div>

          <div className="col-md-4">
            <div className="alert alert-success mb-0">
              Vendas hoje neste PDV:{" "}
              <strong>{vendasHojePdv.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {!caixaAtual ? (
        <div className="pdv-caixa-fechado">
          <strong>Caixa fechado</strong>
          <p>Para registrar vendas, primeiro abra o caixa de um terminal.</p>
          <a className="btn btn-primary" href="/caixa">Abrir caixa</a>
        </div>
      ) : <div className="pdv-layout">
        {cameraAberta && <LeitorCodigoCamera onFechar={() => setCameraAberta(false)} onCodigo={codigo => {
          setCameraAberta(false);
          setCodigoBarras(codigo);
          const produto = produtos.find(x => String(x.codigoBarras || "").trim() === codigo);
          adicionarProduto(produto, quantidade);
        }} />}
        <div className="pdv-main">
          <div className="pdv-card pdv-scan-card">
            <div>
              <span className="pdv-label">Leitura rápida</span>
              <h4>Código de barras</h4>
            </div>

            <form onSubmit={adicionarPorCodigo} className="pdv-scan-form">
              <input
                ref={codigoRef}
                className="pdv-barcode-input"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                placeholder="Leia ou digite o código"
                autoComplete="off"
              />

              <input
                type="number"
                className="pdv-qtd-input"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                min="1"
              />

              <button className="btn btn-dark btn-lg">Adicionar</button>
            </form>
            <button type="button" className="btn pdv-camera-button" onClick={() => setCameraAberta(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h3l2-3h6l2 3h3v14H4z" /><circle cx="12" cy="12" r="4" /></svg>
              Ler pela câmera
            </button>
          </div>

          <div className="pdv-card">
            <div className="pdv-selecao-grid">
              <div className="pdv-cliente-compacto">
                <label>Cliente</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    value={clienteBusca}
                    onChange={(e) => {
                      setClienteBusca(e.target.value);
                      setClienteId("");
                    }}
                    placeholder="Consumidor / buscar cliente"
                    autoComplete="off"
                  />

                  {clienteId && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={limparCliente}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {clienteBusca && !clienteId && (
                  <div className="pdv-dropdown">
                    {clientesFiltrados.slice(0, 6).map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className="pdv-dropdown-item"
                        onClick={() => selecionarCliente(c)}
                      >
                        <div>
                          <strong>{c.nome}</strong>
                          <small>
                            {c.documento ||
                              c.telefone ||
                              "Cliente cadastrado"}
                          </small>
                        </div>
                      </button>
                    ))}

                    {!clientesFiltrados.length && (
                      <div className="pdv-empty">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <CatalogoPdv produtos={produtos} servicos={servicos} onAdicionar={adicionarPorPesquisa} separarProdutosServicos={separarProdutosServicos} />
            </div>
          </div>

          <div className="pdv-card">
            <div className="pdv-card-header">
              <div>
                <span className="pdv-label">Carrinho</span>
                <h4>Itens da venda</h4>
              </div>

              <strong>{itens.length} item(ns)</strong>
            </div>

            <div className="pdv-table-wrapper">
              <table className="table professional-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Produto/Serviço</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-end">Unit.</th>
                    <th className="text-end">Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {itens.map((x, i) => (
                    <tr key={i}>
                      <td>
                        <span
                          className={
                            x.tipo === "SERVICO"
                              ? "badge bg-primary"
                              : "badge bg-success"
                          }
                        >
                          {x.tipo === "SERVICO" ? "Serviço" : "Produto"}
                        </span>
                      </td>

                      <td><div className="pdv-cart-product">
                        {x.tipo === "PRODUTO" && (x.foto
                          ? <img src={urlArquivo(x.foto)} alt="" />
                          : <span className="pdv-cart-product-empty">Sem foto</span>)}
                        <strong>{x.nome}</strong>
                      </div></td>
                      <td className="text-center">{x.quantidade}</td>
                      <td className="text-end">
                        {formatarMoeda(x.valorUnitario)}
                      </td>
                      <td className="text-end fw-bold">
                        {formatarMoeda(x.total)}
                      </td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => remover(i)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!itens.length && (
                    <tr>
                      <td colSpan="6" className="pdv-empty-cart">
                        Nenhum item adicionado.
                        <br />
                        Leia o código de barras ou pesquise pelo nome.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pdv-card">
            <div className="pdv-card-header">
              <div>
                <span className="pdv-label">Vendas do dia</span>
                <h5>
                  {pdvAtual
                    ? `${pdvAtual.numero} - ${pdvAtual.descricao}`
                    : "Selecione um PDV"}
                </h5>
              </div>

              <strong>{vendasHojePdv.length} venda(s)</strong>
            </div>

            <div
              className="pdv-vendas-scroll"
              style={{
                maxHeight: "280px",
                overflowY: "auto"
              }}
            >
              <table className="table professional-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className="text-end">Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>

                <tbody>
                  {vendasHojePdv.map((x) => (
                    <tr key={x.id}>
                      <td>{new Date(x.data).toLocaleString("pt-BR")}</td>
                      <td className="text-end fw-bold">
                        {formatarMoeda(x.total)}
                      </td>
                      <td>{x.formaPagamento}</td>
                    </tr>
                  ))}

                  {!vendasHojePdv.length && (
                    <tr>
                      <td colSpan="3" className="text-center">
                        Nenhuma venda hoje neste PDV.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="pdv-sidebar">
          <div className="pdv-total-card">
            <span className="pdv-label">Resumo</span>
            <h4>Venda atual</h4>

            <div className="pdv-total-line">
              <span>PDV</span>
              <strong>{pdvAtual?.numero || "Nenhum"}</strong>
            </div>

            <div className="pdv-total-line">
              <span>Subtotal</span>
              <strong>{formatarMoeda(subtotal)}</strong>
            </div>

            <div className="pdv-field">
              <label>Desconto</label>
              <input
                type="number"
                className="form-control"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
              />
            </div>

            <div className="pdv-field">
              <label>Pagamento</label>
              <select
                className="form-select"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option>Dinheiro</option>
                <option>Pix</option>
                <option>Cartão Débito</option>
                <option>Cartão Crédito</option>
              </select>
            </div>

            {formaPagamento === "Pix" && (
              <div className="pdv-pix-box" aria-live="polite">
                {total <= 0 && <p>Adicione itens para gerar o QR Code Pix.</p>}
                {total > 0 && pixCarregando && <p>Gerando QR Code Pix...</p>}
                {total > 0 && pixErro && <div className="pdv-pix-error">{String(pixErro)}</div>}
                {total > 0 && pix && !pixCarregando && (
                  <>
                    <div className="pdv-pix-heading">
                      <strong>Pix da venda</strong>
                      <span>{formatarMoeda(total)}</span>
                    </div>
                    <div className="pdv-pix-qrcode">
                      <QRCodeSVG value={pix.copiaECola} size={176} level="M" includeMargin />
                    </div>
                    <small>Abra o aplicativo do banco e escaneie o QR Code.</small>
                    <button type="button" className="btn btn-outline-primary w-100" onClick={copiarPix}>
                      {pixCopiado ? "Código copiado" : "Copiar código Pix"}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={emitirNota}
                onChange={(e) => setEmitirNota(e.target.checked)}
                id="emitirNota"
              />
              <label className="form-check-label" htmlFor="emitirNota">
                Emitir nota fiscal ao finalizar
              </label>
            </div>

            <div className="pdv-total-final">
              <span>Total</span>
              <strong>{formatarMoeda(total)}</strong>
            </div>

            <button
              type="button"
              className="btn btn-success w-100 btn-lg"
              disabled={!itens.length || !pdvId || !caixaAtual}
              onClick={finalizar}
            >
              Finalizar venda
            </button>
          </div>
        </aside>
      </div>}
    </div>
  );
}

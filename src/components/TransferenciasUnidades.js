import { useEffect, useRef, useState } from "react";
import api from "../api";
import { alertaErro, alertaSucesso } from "../utils/alerts";

export default function TransferenciasUnidades({ unidades }) {
  const [origem, setOrigem] = useState(String(unidades[0]?.id || "")), [destino, setDestino] = useState("");
  const [produtos, setProdutos] = useState([]), [recebidos, setRecebidos] = useState([]), [historico, setHistorico] = useState([]);
  const [produto, setProduto] = useState(""), [recebido, setRecebido] = useState(""), [quantidade, setQuantidade] = useState("1"), [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState("");
  const tentativa = useRef(null), lock = useRef(false);
  async function carregar(signal) {
    setCarregando(true); setErro("");
    try {
      const [p, r, h] = await Promise.all([api.get(`/unidades-vinculadas/transferencias/produtos/${origem}`, { signal }), destino ? api.get(`/unidades-vinculadas/transferencias/produtos/${destino}`, { signal }) : Promise.resolve({ data: [] }), api.get(`/unidades-vinculadas/transferencias/${origem}`, { signal })]);
      if (signal?.aborted) return; setProdutos(p.data); setRecebidos(r.data); setHistorico(h.data);
    } catch (e) { if (!signal?.aborted) setErro("Não foi possível carregar o estoque. Atualize antes de transferir."); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }
  useEffect(() => { const c = new AbortController(); carregar(c.signal); return () => c.abort(); }, [origem, destino]);
  const selecionado = produtos.find(p => String(p.id) === produto);
  async function transferir(e) {
    e.preventDefault(); if (lock.current || carregando || erro) return;
    lock.current = true; setOcupado(true);
    const dados = { origemId: Number(origem), destinoId: Number(destino), produtoOrigemId: Number(produto), produtoDestinoId: recebido ? Number(recebido) : null, quantidade: Number(quantidade) };
    const chave = JSON.stringify(dados);
    if (tentativa.current?.chave !== chave) tentativa.current = { chave, id: crypto.randomUUID() };
    try {
      await api.post("/unidades-vinculadas/transferencias", { ...dados, id: tentativa.current.id });
      tentativa.current = null; setProduto(""); setRecebido(""); setQuantidade("1"); await carregar();
      await alertaSucesso("Transferência concluída. Estoque atualizado nas duas unidades.");
    } catch (e) { await alertaErro(typeof e.response?.data === "string" ? e.response.data : e.response?.data?.title || "Não foi possível confirmar a transferência. Confira o histórico antes de tentar novamente."); }
    finally { lock.current = false; setOcupado(false); }
  }
  return <><form className="panel mb-3" onSubmit={transferir}><h2 className="h5">Transferir produtos</h2><p>Movimente o estoque entre as suas unidades. A saída e a entrada ficam registradas no histórico de cada uma.</p>
    <fieldset disabled={ocupado}><div className="row g-3">
      <div className="col-md-6"><label htmlFor="transfer-origem">Unidade de origem</label><select id="transfer-origem" className="form-select" value={origem} onChange={e => { setOrigem(e.target.value); setDestino(""); setProduto(""); setRecebido(""); }} required>{unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
      <div className="col-md-6"><label htmlFor="transfer-destino">Unidade de destino</label><select id="transfer-destino" className="form-select" value={destino} onChange={e => { setDestino(e.target.value); setRecebido(""); }} required><option value="">Selecione a unidade</option>{unidades.filter(u => String(u.id) !== origem).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
      <div className="col-12"><label htmlFor="transfer-busca">Buscar produto na origem</label><input id="transfer-busca" className="form-control" placeholder="Nome ou código de barras" value={busca} onChange={e => setBusca(e.target.value)} /></div>
      <div className="col-md-6"><label htmlFor="transfer-produto">Produto na origem</label><select id="transfer-produto" className="form-select" value={produto} required disabled={carregando || !!erro} onChange={e => { setProduto(e.target.value); setRecebido(""); }}><option value="">Selecione o produto</option>{produtos.filter(p => String(p.id) === produto || `${p.nome} ${p.codigoBarras || ""}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase())).map(p => <option key={p.id} value={p.id}>{p.nome} · {p.quantidadeEstoque} {p.unidadeComercial}</option>)}</select></div>
      <div className="col-md-6"><label htmlFor="transfer-recebido">Cadastro no destino</label><select id="transfer-recebido" className="form-select" value={recebido} disabled={carregando || !destino || !!erro} onChange={e => setRecebido(e.target.value)}><option value="">Criar cadastro do produto no destino</option>{recebidos.map(p => <option key={p.id} value={p.id}>{p.nome}{p.codigoBarras ? ` · ${p.codigoBarras}` : ""} · {p.quantidadeEstoque} {p.unidadeComercial}</option>)}</select><small>Selecione o mesmo produto, com unidade, lote e validade compatíveis.</small></div>
      <div className="col-md-4"><label htmlFor="transfer-qtd">Quantidade {selecionado ? `(${selecionado.unidadeComercial})` : ""}</label><input id="transfer-qtd" className="form-control" type="number" min="0.001" step="0.001" max={selecionado?.quantidadeEstoque || 1000000} value={quantidade} onChange={e => setQuantidade(e.target.value)} required /></div>
    </div>{carregando && <p role="status">Carregando estoque...</p>}{erro && <p role="alert">{erro} <button type="button" className="btn btn-outline-primary" onClick={() => carregar()}>Atualizar</button></p>}
    <button className="btn btn-primary mt-3" disabled={ocupado || carregando || !!erro || !produto || !destino}>{ocupado ? "Transferindo..." : "Confirmar transferência"}</button></fieldset>
  </form><section className="panel"><h2 className="h5">Histórico da unidade de origem</h2>{historico.length === 0 ? <p>Nenhuma transferência registrada.</p> : <div className="table-responsive"><table className="table"><thead><tr><th>Data</th><th>Produto</th><th>Movimento</th><th>Quantidade</th><th>Detalhes</th></tr></thead><tbody>{historico.map(h => <tr key={h.transferenciaId}><td>{new Date(h.data).toLocaleString("pt-BR")}</td><td>{h.produto}</td><td>{h.tipo === "SAIDA" ? "Saída" : "Entrada"}</td><td>{h.quantidade}</td><td>{h.observacao}</td></tr>)}</tbody></table></div>}</section></>;
}

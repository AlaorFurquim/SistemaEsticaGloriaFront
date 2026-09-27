import { useId, useRef, useState } from "react";
import { formatarMoeda } from "../utils/masks";
import { urlArquivo } from "../utils/urlArquivo";
import "./CatalogoPdv.css";

const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function CatalogoPdv({ produtos, servicos, onAdicionar, separarProdutosServicos = false }) {
  const id = useId();
  const input = useRef(null);
  const [tipo, setTipo] = useState("PRODUTO");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const catalogo = separarProdutosServicos
    ? (tipo === "PRODUTO" ? produtos : servicos).filter(x => x.ativo !== false)
    : [
        ...produtos.filter(x => x.ativo !== false).map(x => ({ ...x, _tipoCatalogo: "PRODUTO" })),
        ...servicos.filter(x => x.ativo !== false).map(x => ({ ...x, _tipoCatalogo: "SERVICO" }))
      ];
  const encontrados = catalogo.filter(x => normalizar(x.nome).includes(normalizar(busca)) ||
    ((x._tipoCatalogo || tipo) === "PRODUTO" && String(x.codigoBarras || "").includes(busca.trim())));
  const nome = separarProdutosServicos ? (tipo === "PRODUTO" ? "produto" : "serviço") : "item";

  function trocar(novo) { setTipo(novo); setBusca(""); setAtivo(-1); setAberto(false); }
  function adicionar(item) {
    setAberto(false); setBusca(""); setAtivo(-1);
    const tipoItem = item._tipoCatalogo || tipo;
    onAdicionar({ ...item, tipo: tipoItem, valor: tipoItem === "PRODUTO" ? item.precoVenda : item.valor, estoque: tipoItem === "PRODUTO" ? item.quantidadeEstoque : null });
  }
  function teclado(event) {
    if (event.key === "Escape") { setAberto(false); return; }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault(); setAberto(true);
      setAtivo(indice => Math.max(0, Math.min(encontrados.length - 1, indice + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter" && aberto && encontrados[ativo]) { event.preventDefault(); adicionar(encontrados[ativo]); }
  }

  return <div className="pdv-catalogo" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setAberto(false); }}>
    {separarProdutosServicos && <div className="pdv-catalogo-tabs" role="tablist" aria-label="Tipo de item">
      {[["PRODUTO", "Produtos", produtos], ["SERVICO", "Serviços", servicos]].map(([valor, titulo, itens]) =>
        <button key={valor} type="button" role="tab" aria-selected={tipo === valor} onClick={() => trocar(valor)}>
          {titulo}<span>{itens.filter(x => x.ativo !== false).length}</span>
        </button>)}
    </div>}
    <label htmlFor={`${id}-busca`}>Pesquisar {nome}</label>
    <div className="pdv-catalogo-control">
      <input ref={input} id={`${id}-busca`} className="form-control" role="combobox" aria-expanded={aberto}
        value={busca} autoComplete="off" placeholder={tipo === "PRODUTO" ? "Nome ou código de barras" : "Nome do serviço"}
        onFocus={() => setAberto(true)} onKeyDown={teclado}
        onChange={event => { setBusca(event.target.value); setAtivo(-1); setAberto(true); }} />
      <button type="button" className="pdv-catalogo-toggle" aria-label={`${aberto ? "Ocultar" : "Exibir"} ${nome}s`}
        aria-expanded={aberto} title={`${aberto ? "Ocultar" : "Exibir"} ${nome}s`}
        onClick={() => { setAberto(valor => !valor); input.current?.focus(); }}>
        <span className={aberto ? "aberto" : ""} aria-hidden="true" />
      </button>
    </div>
    {aberto && <div className="pdv-catalogo-lista" role="listbox">
      {encontrados.map((item, index) => <button type="button" role="option" key={item.id} aria-selected={ativo === index}
        className="pdv-product-item" onMouseDown={event => event.preventDefault()} onClick={() => adicionar(item)}>
        {(item._tipoCatalogo || tipo) === "PRODUTO" && (item.foto
          ? <img className="pdv-product-thumb" src={urlArquivo(item.foto)} alt="" />
          : <span className="pdv-product-thumb pdv-product-thumb-empty" aria-hidden="true">Foto</span>)}
        <div><strong>{item.nome}</strong><small>{(item._tipoCatalogo || tipo) === "PRODUTO" ? `Produto · Cód: ${item.codigoBarras || "-"} · Estoque: ${item.quantidadeEstoque}` : `Serviço · ${item.duracaoMinutos || 30} min`}</small></div>
        <span>{formatarMoeda((item._tipoCatalogo || tipo) === "PRODUTO" ? item.precoVenda : item.valor)}</span>
      </button>)}
      {!encontrados.length && <div className="pdv-empty">Nenhum {nome} encontrado.</div>}
    </div>}
  </div>;
}

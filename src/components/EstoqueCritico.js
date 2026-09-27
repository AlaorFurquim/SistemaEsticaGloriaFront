import { useEffect, useRef } from "react";
import "./EstoqueCritico.css";

const quantidade = (valor, unidade) => `${Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unidade || "UN"}`;
export default function EstoqueCritico({ produtos, onClose }) {
  const dialogo = useRef(null);
  useEffect(() => { dialogo.current.showModal(); }, []);
  return <dialog ref={dialogo} className="estoque-critico" aria-labelledby="estoque-critico-titulo" onClose={onClose}>
    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
      <div><h2 id="estoque-critico-titulo" className="h5">Estoque baixo e mínimo</h2><p className="text-muted mb-0">Produtos ativos com saldo igual ou inferior ao mínimo cadastrado.</p></div>
      <button type="button" className="btn btn-outline-secondary" onClick={() => dialogo.current.close()}>Fechar</button>
    </div>
    <div className="estoque-critico-lista">
      {produtos.map(produto => <article className="estoque-critico-item" key={produto.id}>
        <div><strong>{produto.nome}</strong><span className={`badge ${produto.situacao === "No mínimo" ? "bg-warning text-dark" : "bg-danger"}`}>{produto.situacao}</span></div>
        <dl><div><dt>Disponível</dt><dd>{quantidade(produto.quantidadeEstoque, produto.unidadeComercial)}</dd></div><div><dt>Mínimo</dt><dd>{quantidade(produto.estoqueMinimo, produto.unidadeComercial)}</dd></div></dl>
      </article>)}
      {!produtos.length && <p className="text-muted">Nenhum produto com estoque baixo ou no mínimo.</p>}
    </div>
  </dialog>;
}

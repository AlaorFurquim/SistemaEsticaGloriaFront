import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import "./Aniversariantes.css";

function useAniversariantes() {
  const [dados, setDados] = useState(null), [erro, setErro] = useState(false), [carregando, setCarregando] = useState(true);
  const requisicao = useRef(null);
  const carregar = useCallback(async () => {
    requisicao.current?.abort();
    const abort = new AbortController(); requisicao.current = abort;
    setCarregando(true);
    try {
      const { data } = await api.get("/clientes/aniversariantes", { signal: abort.signal });
      if (!abort.signal.aborted) { setDados(data); setErro(false); }
    } catch {
      if (!abort.signal.aborted) { setDados(null); setErro(true); }
    } finally { if (!abort.signal.aborted) setCarregando(false); }
  }, []);
  useEffect(() => {
    carregar();
    const atualizar = () => { if (!document.hidden) carregar(); };
    const timer = setInterval(atualizar, 60000);
    window.addEventListener("focus", atualizar); window.addEventListener("clientesAtualizados", atualizar);
    return () => { clearInterval(timer); requisicao.current?.abort(); window.removeEventListener("focus", atualizar); window.removeEventListener("clientesAtualizados", atualizar); };
  }, [carregar]);
  return { dados, erro, carregando, carregar };
}

function Conteudo({ dados, erro, carregando, carregar }) {
  const [periodo, setPeriodo] = useState("hoje");
  const lista = dados?.[periodo] || [];
  const referencia = dados?.dataReferencia?.split("-") || [];
  const mes = referencia.length === 3 ? new Date(Number(referencia[0]), Number(referencia[1]) - 1, 1).toLocaleDateString("pt-BR", { month: "long" }) : "mês atual";
  return <div className="aniversarios-conteudo">
    <p className="text-muted">Clientes ativos da sua unidade · {mes}</p>
    <div className="aniversarios-periodos" role="group" aria-label="Período dos aniversários">
      <button type="button" className={`btn ${periodo === "hoje" ? "btn-primary" : "btn-outline-primary"}`} aria-pressed={periodo === "hoje"} onClick={() => setPeriodo("hoje")}>Hoje ({dados?.hoje?.length ?? "—"})</button>
      <button type="button" className={`btn ${periodo === "mes" ? "btn-primary" : "btn-outline-primary"}`} aria-pressed={periodo === "mes"} onClick={() => setPeriodo("mes")}>Neste mês ({dados?.mes?.length ?? "—"})</button>
    </div>
    {erro ? <div role="alert"><p>Não foi possível consultar os aniversariantes.</p><button type="button" className="btn btn-outline-primary" onClick={carregar}>Tentar novamente</button></div>
      : !dados && carregando ? <p role="status">Carregando aniversariantes…</p>
      : !lista.length ? <p className="aniversarios-vazio">{periodo === "hoje" ? "Nenhum aniversário hoje." : "Nenhum aniversário cadastrado neste mês."}</p>
      : <ul className="aniversarios-lista">{lista.map(cliente => <li key={cliente.clienteId}>
        <span className="aniversarios-data">{String(cliente.dia).padStart(2, "0")}/{String(cliente.mes).padStart(2, "0")}</span>
        <strong>{cliente.nome}</strong>
        {cliente.dia === Number(referencia[2]) && <span className="badge bg-success">Hoje</span>}
      </li>)}</ul>}
    <small className="text-muted">Informe a data de nascimento no cadastro para receber os avisos.</small>
  </div>;
}

export default function Aniversariantes({ notificacao = false }) {
  const consulta = useAniversariantes();
  const dialogo = useRef(null);
  if (!notificacao) return <section className="panel"><h2 className="h5">Aniversariantes</h2><Conteudo {...consulta} /></section>;
  const total = consulta.dados?.hoje?.length || 0;
  return <>
    <button type="button" className="btn btn-outline-primary aniversarios-aviso" aria-label={`Aniversários: ${total} hoje`} onClick={() => { dialogo.current.showModal(); consulta.carregar(); }}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      <span>Aniversários</span>{total > 0 && <b className="aniversarios-contador">{total}</b>}
    </button>
    <dialog ref={dialogo} className="aniversarios-dialogo" aria-labelledby="titulo-aniversarios" onClick={e => { if (e.target === dialogo.current) dialogo.current.close(); }}>
      <div className="aniversarios-cabecalho"><h2 id="titulo-aniversarios" className="h5">Aniversariantes</h2><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => dialogo.current.close()} autoFocus>Fechar</button></div>
      <Conteudo {...consulta} />
    </dialog>
  </>;
}

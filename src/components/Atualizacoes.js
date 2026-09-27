import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import "./Atualizacoes.css";

export default function Atualizacoes() {
  const [dados, setDados] = useState(null), [erro, setErro] = useState(""), [salvando, setSalvando] = useState(false);
  const dialogo = useRef(null), consulta = useRef(null);
  const carregar = useCallback(async () => {
    consulta.current?.abort(); const controller = new AbortController(); consulta.current = controller;
    try { const { data } = await api.get("/atualizacoes", { signal: controller.signal }); if (!controller.signal.aborted && data?.atual?.versao) { setDados(data); setErro(""); } }
    catch { if (!controller.signal.aborted) setErro("Não foi possível carregar as novidades. Tente novamente."); }
  }, []);
  useEffect(() => {
    carregar(); const verificar = () => { if (!document.hidden) carregar(); };
    const timer = setInterval(verificar, 300000); window.addEventListener("focus", verificar);
    return () => { clearInterval(timer); window.removeEventListener("focus", verificar); consulta.current?.abort(); };
  }, [carregar]);
  async function confirmar() {
    if (salvando || !dados) return; setSalvando(true); const versao = dados.atual.versao;
    try { await api.put("/atualizacoes/lida", { versao }); setDados(atual => atual?.atual?.versao === versao ? { ...atual, pendente: false } : atual); setErro(""); }
    catch (e) { if (e.response?.status === 409) await carregar(); else setErro("Não foi possível salvar a leitura. Tente novamente."); }
    finally { setSalvando(false); }
  }
  function abrir() { dialogo.current.showModal(); carregar(); }
  return <div className="atualizacoes no-print">
    {dados?.pendente ? <section className="panel atualizacoes-aviso" aria-labelledby="novidades-titulo" role="status">
      <div><span className="atualizacoes-etiqueta">NOVA VERSÃO</span><h2 id="novidades-titulo">O sistema foi atualizado!</h2><p>Confira as melhorias que preparamos para você.</p><ul>{dados.atual.itens.map(item => <li key={item}>{item}</li>)}</ul>
      {erro && <p role="alert">{erro}</p>}</div>
      <div className="atualizacoes-acoes"><button type="button" className="btn btn-primary" disabled={salvando} onClick={confirmar}>{salvando ? "Salvando..." : "Entendi"}</button><button type="button" className="btn btn-outline-primary" onClick={abrir}>Ver atualizações</button></div>
    </section> : <div className="atualizacoes-atalho"><button type="button" className="btn btn-outline-primary btn-sm" onClick={abrir}>Novidades do sistema</button></div>}
    <dialog className="atualizacoes-dialogo panel" ref={dialogo} aria-labelledby="historico-novidades">
      <div className="atualizacoes-cabecalho"><h2 id="historico-novidades">Novidades do sistema</h2><button type="button" className="btn btn-outline-secondary" onClick={() => dialogo.current.close()} autoFocus>Fechar</button></div>
      {erro && <div role="alert"><p>{erro}</p><button type="button" className="btn btn-outline-primary" onClick={carregar}>Tentar novamente</button></div>}
      {!dados && !erro && <p role="status">Carregando novidades...</p>}
      {(dados?.historico || []).map(n => <article className="atualizacoes-versao" key={n.versao}><time dateTime={n.data}>{n.data.split("-").reverse().join("/")}</time><h3>{n.titulo}</h3><ul>{n.itens.map(item => <li key={item}>{item}</li>)}</ul></article>)}
    </dialog>
  </div>;
}

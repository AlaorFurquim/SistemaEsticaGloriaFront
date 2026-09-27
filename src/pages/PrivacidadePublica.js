import CampoComMascara from "../components/CampoComMascara";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { statusPrivacidade } from "../components/PrivacidadeClientes";
import { mascaraTelefone } from "../utils/masks";
import "./agendamento-online.css";
import "../components/privacidade.css";

export default function PrivacidadePublica() {
  const { codigo } = useParams();
  const [dados, setDados] = useState(null), [erro, setErro] = useState(""), [mensagem, setMensagem] = useState("");
  const [nome, setNome] = useState(""), [telefone, setTelefone] = useState("");
  const [escolhas, setEscolhas] = useState({ ciencia: false, marketing: false, imagem: false, dadosSensiveis: false });
  const [enviando, setEnviando] = useState(false), [tentativa, setTentativa] = useState(0);
  const enviandoRef = useRef(false);
  const avisoRef = useRef(null);
  function imprimirAviso() {
    const estavaAberto = avisoRef.current.open;
    avisoRef.current.open = true;
    window.print();
    avisoRef.current.open = estavaAberto;
  }
  useEffect(() => {
    const abort = new AbortController(); setErro("");
    api.get(`/publico/privacidade/${codigo}`, { signal: abort.signal }).then(({ data }) => setDados(data)).catch(e => {
      if (!abort.signal.aborted) setErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível carregar o aviso. Tente novamente.");
    });
    return () => abort.abort();
  }, [codigo, tentativa]);
  async function responder(e) {
    e.preventDefault(); if (enviandoRef.current) return;
    const acao = e.nativeEvent.submitter?.value;
    if (acao === "confirmar" && !escolhas.ciencia) { setErro("Confirme que leu o aviso antes de registrar suas escolhas. As demais autorizações são opcionais."); return; }
    enviandoRef.current = true; setEnviando(true); setErro("");
    try {
      const opcoes = acao === "confirmar" ? escolhas : { ciencia: false, marketing: false, imagem: false, dadosSensiveis: false };
      const { data } = await api.post(`/publico/privacidade/${codigo}/${acao === "revogar" ? "revogar" : "resposta"}`, { nome, telefone, ...opcoes });
      setDados(atual => ({ ...atual, status: data.status }));
      setMensagem(acao === "revogar" ? "Suas autorizações opcionais foram revogadas. A empresa foi atualizada automaticamente."
        : acao === "recusar" ? "Sua recusa foi registrada. Nenhuma autorização opcional foi concedida."
        : "Suas escolhas foram registradas. Guarde este link para consultar o aviso ou revogar autorizações.");
    } catch (err) {
      setErro(err.response?.status === 429 ? "Aguarde um minuto e tente novamente." : typeof err.response?.data === "string" ? err.response.data : "Não foi possível registrar. Seus dados foram mantidos; tente novamente.");
    } finally { enviandoRef.current = false; setEnviando(false); }
  }
  return <main className="booking-public privacy-public"><div className="booking-shell">
    <header className="booking-brand"><span className="booking-brand-mark" aria-hidden="true">✓</span><div><strong>{dados?.controlador || "Privacidade do cliente"}</strong><span>Informação clara. Escolhas suas.</span></div><span className="booking-brand-tag">PRIVACIDADE</span></header>
    <section className="booking-card"><span className="online-eyebrow">SEUS DADOS, SUAS ESCOLHAS</span><h1>Aviso de privacidade</h1>
      {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
      {!dados ? erro ? <button className="btn btn-primary" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button> : <p role="status">Carregando aviso…</p> : <>
        <p className="booking-muted">Versão {dados.versao} · {statusPrivacidade(dados.status)}. Leia como seus dados são utilizados e escolha o que deseja autorizar.</p>
        {mensagem && <div className="privacy-result" role="status">{mensagem}</div>}
        {["Expirado", "Substituido"].includes(dados.status) && <p className="alert alert-info">Solicite um novo link à empresa para responder à versão atual do aviso.</p>}
        <details ref={avisoRef} className="lgpd-record" open><summary>Leia o aviso completo</summary><pre className="lgpd-text">{dados.texto}</pre></details>
        <p className="lgpd-sources"><a className="btn btn-outline-secondary btn-sm" href={dados.leiUrl} target="_blank" rel="noreferrer">Consultar a LGPD ↗</a><a className="btn btn-outline-secondary btn-sm" href={dados.anpdUrl} target="_blank" rel="noreferrer">Direitos do titular na ANPD ↗</a><button type="button" className="btn btn-outline-secondary btn-sm" onClick={imprimirAviso}>Imprimir aviso</button></p>
        {["Pendente", "Aceito"].includes(dados.status) && <form onSubmit={responder}><fieldset disabled={enviando}><h2>{dados.status === "Aceito" ? "Retirar autorizações" : "Identifique-se para responder"}</h2><p className="booking-muted">Informe os dados que você tem cadastrados na empresa. Para atendimento de menor de idade ou representação de outra pessoa, fale com a empresa pelo contato abaixo.</p>
          <div className="lgpd-grid"><label className="lgpd-field">Nome completo<input autoComplete="name" className="form-control" required minLength={2} maxLength={100} value={nome} onChange={e => setNome(e.target.value)} /></label><label className="lgpd-field">WhatsApp com DDD<CampoComMascara mascara="telefone" autoComplete="tel" type="tel" inputMode="tel" className="form-control" required minLength={14} maxLength={25} placeholder="(65) 99999-9999" value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} /></label></div>
          {dados.status === "Pendente" ? <><label className="lgpd-choice"><input type="checkbox" checked={escolhas.ciencia} onChange={e => setEscolhas({ ...escolhas, ciencia: e.target.checked })} /><span><strong>Li o aviso de privacidade</strong><small>Estou ciente das informações apresentadas. Isso não autoriza automaticamente as finalidades abaixo.</small></span></label>
          <h2>Autorizações opcionais</h2><p className="booking-muted">Você pode deixar todas desmarcadas e continuar. Recusar promoções, divulgação de imagem ou dados de saúde não impede agendar.</p>
          {dados.oferecerMarketing && <label className="lgpd-choice"><input type="checkbox" checked={escolhas.marketing} onChange={e => setEscolhas({ ...escolhas, marketing: e.target.checked })} /><span>Quero receber promoções por WhatsApp ou e-mail<small>Autorizo usar meu nome e contato para ofertas e novidades da empresa.</small></span></label>}
          {dados.oferecerImagem && <label className="lgpd-choice"><input type="checkbox" checked={escolhas.imagem} onChange={e => setEscolhas({ ...escolhas, imagem: e.target.checked })} /><span>Autorizo divulgar minha imagem<small>Fotos ou vídeos do resultado do atendimento nos perfis oficiais da empresa e em seu site, conforme o aviso.</small></span></label>}
          {dados.oferecerDadosSensiveis && <label className="lgpd-choice"><input type="checkbox" checked={escolhas.dadosSensiveis} onChange={e => setEscolhas({ ...escolhas, dadosSensiveis: e.target.checked })} /><span>Autorizo registrar dados de saúde para meu atendimento<small>Alergias, restrições e informações que eu fornecer para avaliar cuidados e adequação dos procedimentos solicitados, conforme o aviso.</small></span></label>}
          <div className="lgpd-actions"><button className="btn btn-primary" type="submit" name="acao" value="confirmar">{enviando ? "Registrando…" : "Confirmar minhas escolhas"}</button><button className="btn btn-outline-secondary" type="submit" name="acao" value="recusar">Registrar recusa</button></div></>
          : <><p className="booking-muted">Você pode retirar as autorizações opcionais de promoções, imagem e dados de saúde. Isso não elimina automaticamente registros que precisem ser conservados por obrigação legal.</p><button className="btn btn-outline-danger" type="submit" name="acao" value="revogar">{enviando ? "Registrando…" : "Revogar autorizações opcionais"}</button></>}
        </fieldset></form>}
        <div className="booking-location"><strong>Contato para privacidade e exercício de direitos</strong><span>{dados.contato}</span></div>
      </>}
    </section><footer className="booking-footer">{dados?.controlador || ""} · Privacidade do cliente</footer>
  </div></main>;
}

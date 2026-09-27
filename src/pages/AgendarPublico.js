import CampoComMascara from "../components/CampoComMascara";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import ConsultaCadastroOnline from "../components/ConsultaCadastroOnline";
import { mascaraTelefone } from "../utils/masks";
import "./agendamento-online.css";

const moeda = valor => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBonita = dia => new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const erroMensagem = (e, padrao) => e.response?.status === 429 ? "Muitas tentativas. Aguarde um minuto e tente novamente." : typeof e.response?.data === "string" ? e.response.data : padrao;

export default function AgendarPublico() {
  const { codigo } = useParams();
  const [catalogo, setCatalogo] = useState(null);
  const [falhaCatalogo, setFalhaCatalogo] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [etapa, setEtapa] = useState(1);
  const [servicoIds, setServicoIds] = useState([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [dia, setDia] = useState("");
  const [horarios, setHorarios] = useState([]);
  const [horario, setHorario] = useState("");
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [atualizarHorarios, setAtualizarHorarios] = useState(0);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [aguardaConfirmacao, setAguardaConfirmacao] = useState(false);
  const [erro, setErro] = useState("");
  const chave = useRef(null);
  const enviandoRef = useRef(false);
  const concluidoRef = useRef(false);
  const horarioRef = useRef(horario);
  horarioRef.current = horario;
  const idsTexto = servicoIds.join(",");
  useEffect(() => {
    const abort = new AbortController();
    setFalhaCatalogo(""); setCatalogo(null);
    api.get(`/publico/agendamento/${codigo}`, { signal: abort.signal }).then(({ data }) => { setCatalogo(data); setDia(data.hoje); })
      .catch(e => { if (e.code !== "ERR_CANCELED") setFalhaCatalogo(erroMensagem(e, "Não foi possível abrir a agenda. Tente novamente.")); });
    return () => abort.abort();
  }, [codigo, tentativa]);
  useEffect(() => {
    if (concluido) return;
    setHorarios([]); setHorario(""); setCarregandoHorarios(false); chave.current = null;
    if (!profissionalId || !dia || !idsTexto) return;
    const abort = new AbortController();
    const query = new URLSearchParams({ profissionalId, dia });
    idsTexto.split(",").forEach(id => query.append("servicoIds", id));
    let consultando = false;
    async function consultar(inicial = false) {
      if (consultando || enviandoRef.current || concluidoRef.current || (!inicial && document.visibilityState !== "visible")) return;
      consultando = true;
      if (inicial) setCarregandoHorarios(true);
      try {
        const { data } = await api.get(`/publico/agendamento/${codigo}/horarios?${query}`, { signal: abort.signal });
        if (abort.signal.aborted || enviandoRef.current || concluidoRef.current) return;
        setHorarios(data);
        if (!inicial && horarioRef.current && !data.includes(horarioRef.current)) {
          setHorario(""); setEtapa(2);
          setErro("Esse horário não está mais disponível. Escolha outro horário. Seus dados foram mantidos.");
        }
      } catch (e) {
        if (!abort.signal.aborted && inicial) setErro(erroMensagem(e, "Não foi possível consultar os horários. Tente novamente."));
      } finally {
        consultando = false;
        if (!abort.signal.aborted && inicial) setCarregandoHorarios(false);
      }
    }
    consultar(true);
    const atualizar = () => consultar();
    const intervalo = window.setInterval(atualizar, 30000);
    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      abort.abort(); window.clearInterval(intervalo);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [codigo, profissionalId, dia, idsTexto, atualizarHorarios, concluido]);
  useEffect(() => { chave.current = null; }, [nome, telefone, horario]);

  const servicos = catalogo?.servicos.filter(s => servicoIds.includes(s.id)) || [];
  const equipe = catalogo?.profissionais.filter(p => servicoIds.every(id => p.servicoIds.includes(id))) || [];
  const profissional = catalogo?.profissionais.find(p => String(p.id) === profissionalId);
  const total = servicos.reduce((soma, s) => soma + s.valor, 0);
  const duracao = servicos.reduce((soma, s) => soma + s.duracaoMinutos, 0);
  function escolherServico(id) { setServicoIds(atual => atual.includes(id) ? atual.filter(i => i !== id) : [...atual, id]); setProfissionalId(""); }
  function avancar() { setErro(""); if (equipe.length === 1) setProfissionalId(String(equipe[0].id)); setEtapa(2); }
  async function reservar(e) {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true; setEnviando(true); setErro("");
    // Mantém a chave em tentativas após falha de rede, sem criar duas reservas.
    chave.current ||= crypto.randomUUID();
    try {
      const { data } = await api.post(`/publico/agendamento/${codigo}/reservas`, { chave: chave.current, servicoIds, profissionalId: Number(profissionalId), dataHora: `${dia}T${horario}:00`, nome, telefone, aceite });
      setAguardaConfirmacao(data.status === "Agendado");
      concluidoRef.current = true;
      setConcluido(true);
    } catch (e) {
      if (e.response?.status === 409) { setEtapa(2); setAtualizarHorarios(n => n + 1); }
      setErro(erroMensagem(e, "Não foi possível confirmar. Seus dados foram mantidos; tente novamente."));
    } finally { enviandoRef.current = false; setEnviando(false); }
  }
  const resumo = <div className="booking-summary"><span className="online-eyebrow">SEU ATENDIMENTO</span><strong>{servicos.map(s => s.nome).join(" + ")}</strong>{profissional && <span>Com {profissional.nome}</span>}{horario && <span>{dataBonita(dia)} · {horario}</span>}<div><span>{duracao} min</span><strong>{moeda(total)}</strong></div><small>Pagamento na clínica.</small></div>;

  return <main className="booking-public"><div className="booking-shell">
    <header className="booking-brand"><span className="booking-brand-mark" aria-hidden="true">✂</span><div><strong>{catalogo?.unidade.nome || "Agendamento online"}</strong><span>Seu próximo atendimento começa aqui</span></div><span className="booking-brand-tag">AGENDA ONLINE</span></header>
    {falhaCatalogo ? <section className="booking-card"><h1>Agenda indisponível</h1><p role="alert">{falhaCatalogo}</p><button className="btn btn-primary" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button></section> : !catalogo ? <section className="booking-card" role="status">Carregando a agenda…</section> : concluido ?
      <section className="booking-card booking-success"><div className="booking-check" aria-hidden="true">✓</div><span className="online-eyebrow">TUDO CERTO</span><h1>{aguardaConfirmacao ? "Seu horário está agendado!" : "Seu horário está confirmado!"}</h1><p>{nome.split(" ")[0]}, estamos esperando por você.</p>{aguardaConfirmacao && <p className="booking-muted">A clínica poderá entrar em contato para confirmar sua presença.</p>}{resumo}{catalogo.unidade.endereco && <p>{catalogo.unidade.endereco}</p>}<p className="booking-muted">Se precisar alterar ou cancelar, fale com a clínica{catalogo.unidade.telefone ? `: ${mascaraTelefone(catalogo.unidade.telefone)}` : "."}</p></section> : <>
      <div className="booking-intro"><span className="online-eyebrow">NO SEU TEMPO, DO SEU JEITO</span><h1>Reserve um momento<br />para cuidar de você.</h1><p>Escolha seus procedimentos, o profissional e o melhor horário.</p></div>
      <ol className="booking-steps" aria-label="Etapas do agendamento">{["Serviços", "Profissional e horário", "Seus dados"].map((texto, index) => <li key={texto} aria-current={etapa === index + 1 ? "step" : undefined} className={etapa >= index + 1 ? "active" : ""}><span>{etapa > index + 1 ? "✓" : index + 1}</span>{texto}</li>)}</ol>
      <div className="booking-layout"><section className="booking-card">
        {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
        {etapa === 1 && <><h2>O que vamos fazer hoje?</h2><p className="booking-muted">Você pode escolher mais de um serviço.</p><div className="booking-services">{catalogo.servicos.map(s => {
          const marcado = servicoIds.includes(s.id);
          const compativel = catalogo.profissionais.some(p => [...servicoIds, s.id].every(id => p.servicoIds.includes(id)));
          return <button type="button" className={`booking-service ${marcado ? "selected" : ""}`} aria-pressed={marcado} key={s.id} disabled={!marcado && (!compativel || servicoIds.length >= 10)} onClick={() => escolherServico(s.id)}><span className="booking-service-check" aria-hidden="true">{marcado ? "✓" : "+"}</span><span><strong>{s.nome}</strong><small>{s.duracaoMinutos} min{!marcado && !compativel ? " · Sem profissional para esta combinação" : ""}</small></span><b>{moeda(s.valor)}</b></button>;
        })}</div>{!catalogo.servicos.length && <p>A clínica está preparando os procedimentos para agendamento. Entre em contato para marcar seu horário.</p>}<button className="btn btn-primary booking-next" disabled={!servicoIds.length || !equipe.length || duracao > 720} onClick={avancar}>Escolher horário →</button></>}
        {etapa === 2 && <><h2>Com quem você quer agendar?</h2><div className="booking-professionals">{equipe.map(p => <button type="button" aria-pressed={profissionalId === String(p.id)} className={profissionalId === String(p.id) ? "selected" : ""} key={p.id} onClick={() => setProfissionalId(String(p.id))}><span className="booking-avatar">{p.foto ? <img src={p.foto} alt="" /> : p.nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("")}</span><strong>{p.nome}</strong></button>)}</div>
          <div className="booking-date"><label htmlFor="booking-dia">Escolha o dia</label><input id="booking-dia" className="form-control" type="date" min={catalogo.hoje} max={catalogo.ultimaData} value={dia} onChange={e => setDia(e.target.value)} /><small>Horários locais da clínica · {catalogo.fusoHorario.replace("America/", "").replaceAll("_", " ")}</small></div>
          <h3>Horários disponíveis</h3><div aria-live="polite">{!profissionalId ? <p className="booking-muted">Selecione um profissional para ver os horários.</p> : carregandoHorarios ? <p>Consultando a agenda…</p> : horarios.length ? <div className="booking-slots">{horarios.map(h => <button type="button" key={h} aria-pressed={horario === h} className={horario === h ? "selected" : ""} onClick={() => setHorario(h)}>{h}</button>)}</div> : <div className="booking-empty">Não há horários livres para este dia. Escolha outra data ou outro profissional.</div>}</div>
          <div className="booking-navigation"><button type="button" className="btn btn-outline-secondary" onClick={() => { setErro(""); setEtapa(1); }}>Voltar</button><button type="button" className="btn btn-primary" disabled={!horario || carregandoHorarios} onClick={() => { setErro(""); setEtapa(3); }}>Continuar →</button></div>
        </>}
        {etapa === 3 && <form onSubmit={reservar}><h2>Como podemos chamar você?</h2><p className="booking-muted">Preencha seus dados para conferir se você já tem cadastro.</p><fieldset disabled={enviando}><label className="booking-field">Seu nome completo<input className="form-control" autoComplete="name" required minLength="2" maxLength="100" value={nome} onChange={e => setNome(e.target.value)} /></label><label className="booking-field">WhatsApp com DDD<CampoComMascara mascara="telefone" className="form-control" type="tel" inputMode="tel" autoComplete="tel" required minLength="14" maxLength="25" placeholder="(65) 99999-9999" value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} /></label>
          <ConsultaCadastroOnline codigo={codigo} nome={nome} telefone={telefone} disabled={enviando} />
          <label className="booking-consent"><input type="checkbox" required checked={aceite} onChange={e => setAceite(e.target.checked)} /><span>Concordo em fornecer meu nome e telefone à {catalogo.unidade.nome} para registrar e entrar em contato sobre este agendamento.</span></label>
          <div className="booking-mobile-summary">{resumo}</div><div className="booking-navigation"><button type="button" className="btn btn-outline-secondary" onClick={() => setEtapa(2)}>Voltar</button><button className="btn btn-primary" disabled={!aceite || !horario}>{enviando ? "Confirmando…" : "Confirmar agendamento"}</button></div></fieldset></form>}
      </section><aside className="booking-aside">{servicos.length ? resumo : <div className="booking-summary"><span className="online-eyebrow">SIMPLES E RÁPIDO</span><h2>Seu horário.<br />Sua escolha.</h2><p>Agende sem precisar esperar por uma resposta.</p></div>}{catalogo.unidade.endereco && <div className="booking-location"><strong>Onde estamos</strong><span>{catalogo.unidade.endereco}</span></div>}</aside></div>
    </>}
    <footer className="booking-footer">{catalogo?.unidade.nome || "Clínica"} · Agendamento online</footer>
  </div></main>;
}

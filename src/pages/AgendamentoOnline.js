import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import "./agendamento-online.css";

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hora = minuto => `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
const minutos = texto => { const [h, m] = texto.split(":").map(Number); return h * 60 + m; };
const turnosIniciais = () => [1, 2, 3, 4, 5, 6].map(diaSemana => ({ diaSemana, inicioMinuto: 480, fimMinuto: 1080 }));

export default function AgendamentoOnline() {
  const [dados, setDados] = useState(null);
  const [form, setForm] = useState(null);
  const [codigo, setCodigo] = useState(null);
  const [ativoSalvo, setAtivoSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [alterado, setAlterado] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    api.get("/agendamento-online", { signal: abort.signal }).then(({ data }) => {
      setDados(data);
      setForm({ ...data.configuracao, profissionais: data.configuracao.profissionais.filter(p => data.profissionais.some(x => x.id === p.profissionalId)) });
      setCodigo(data.codigo); setAtivoSalvo(data.configuracao.ativo);
    }).catch(e => { if (e.code !== "ERR_CANCELED") setErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível carregar as configurações."); });
    return () => abort.abort();
  }, []);
  const link = codigo ? `${window.location.origin}/agendar/${codigo}` : "";
  function alterar(campo, valor) { setForm(atual => ({ ...atual, [campo]: valor })); setAlterado(true); setMensagem(""); }
  function alterarProfissional(id, mudar) { alterar("profissionais", form.profissionais.map(p => p.profissionalId === id ? mudar(p) : p)); }
  function selecionarProfissional(id, marcado) {
    alterar("profissionais", marcado ? [...form.profissionais, { profissionalId: id, horarios: turnosIniciais() }] : form.profissionais.filter(p => p.profissionalId !== id));
  }
  async function salvar(e) {
    e.preventDefault(); setErro(""); setMensagem(""); setSalvando(true);
    try {
      const { data } = await api.put("/agendamento-online", form);
      setCodigo(data.codigo); setAtivoSalvo(data.ativo); setAlterado(false);
      setMensagem(data.ativo ? "Link ativado. Você já pode copiar e compartilhar." : "Configuração salva. O link está desativado.");
    } catch (e) { setErro(typeof e.response?.data === "string" ? e.response.data : "Confira os horários e tente salvar novamente."); }
    finally { setSalvando(false); }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setMensagem("Link copiado!"); }
    catch { setMensagem("Selecione o endereço abaixo e copie o link."); }
  }
  return <div className="online-settings"><PageHeader title="Agendamento online" subtitle="Um link da sua clínica. O cliente escolhe e o horário entra na agenda." />
    {erro && <div className="alert alert-danger" role="alert">{erro}</div>}
    {mensagem && <div className="alert alert-success" role="status">{mensagem}</div>}
    {!form ? !erro && <p>Carregando configuração…</p> : <>
      <section className="panel online-link-panel"><div className="online-link-icon" aria-hidden="true">↗</div><div className="online-link-content"><span className="online-eyebrow">SEU LINK DE AGENDAMENTO</span><h2>{ativoSalvo ? "Sua agenda, a um clique." : "Prepare sua agenda para receber clientes."}</h2><p>{ativoSalvo ? "Compartilhe no WhatsApp, na bio ou nos destaques do Instagram." : "Selecione a equipe, confira os turnos e ative o link."}</p>
        {link && <><label className="visually-hidden" htmlFor="link-agendamento">Link de agendamento</label><input id="link-agendamento" className="form-control" readOnly value={link} onFocus={e => e.target.select()} /><div className="online-link-actions"><button type="button" className="btn btn-primary" disabled={!ativoSalvo} onClick={copiar}>Copiar link</button>{ativoSalvo && <a className="btn btn-outline-primary" href={link} target="_blank" rel="noreferrer">Ver página do cliente ↗</a>}<span className={`online-state ${ativoSalvo ? "on" : ""}`}>{ativoSalvo ? "● Link ativo" : "○ Link desativado"}</span></div></>}
      </div></section>
      <form onSubmit={salvar}><fieldset disabled={salvando}>
        <section className="panel online-section"><div className="online-section-heading"><div><span className="online-eyebrow">01 / PREFERÊNCIAS</span><h2>Como os clientes podem agendar</h2></div><label className="online-toggle"><input type="checkbox" checked={form.ativo} onChange={e => alterar("ativo", e.target.checked)} />Ativar agendamento online</label></div>
          <div className="online-preferences"><label>Fuso da clínica<select className="form-select" value={form.fusoHorario} onChange={e => alterar("fusoHorario", e.target.value)}><option value="America/Cuiaba">Cuiabá</option><option value="America/Sao_Paulo">Brasília / São Paulo</option><option value="America/Manaus">Manaus</option><option value="America/Rio_Branco">Rio Branco</option><option value="America/Noronha">Fernando de Noronha</option></select></label>
          <label>Antecedência mínima (minutos)<input className="form-control" type="number" min="0" max="10080" required value={form.antecedenciaMinutos} onChange={e => alterar("antecedenciaMinutos", Number(e.target.value))} /></label>
          <label>Agenda aberta para os próximos<input aria-label="Dias disponíveis para agendar" className="form-control" type="number" min="1" max="90" required value={form.diasDisponiveis} onChange={e => alterar("diasDisponiveis", Number(e.target.value))} /><small>dias</small></label></div>
        </section>
        <section className="panel online-section"><span className="online-eyebrow">02 / EQUIPE E DISPONIBILIDADE</span><h2>Quem atende e quando</h2><p className="text-muted">Marque os profissionais que aparecerão no link. Os horários ocupados e os bloqueios da agenda inteligente são respeitados automaticamente.</p>
          <div className="online-catalog-note"><strong>Serviços sempre atualizados</strong><p>Todos os serviços ativos da unidade ficam disponíveis para a equipe. Cadastrou um novo serviço? Ele já aparece no link. Ao desativar, ele sai do agendamento online.</p></div>
          {!dados.profissionais.length && <p>Cadastre os profissionais antes de ativar o link.</p>}
          {dados.profissionais.map(profissional => {
            const regra = form.profissionais.find(p => p.profissionalId === profissional.id);
            return <section className={`online-professional ${regra ? "selected" : ""}`} key={profissional.id}>
              <label className="online-professional-heading"><input type="checkbox" checked={!!regra} onChange={e => selecionarProfissional(profissional.id, e.target.checked)} /><strong>{profissional.nome}</strong><span>{regra ? "Disponível no link" : "Fora do link"}</span></label>
              {regra && <div className="online-professional-body">
              <h3>Turnos da semana</h3><p className="text-muted">Para ter intervalo, separe o dia em dois turnos, por exemplo 08:00–12:00 e 13:00–18:00.</p>
              <div className="online-shifts">{regra.horarios.map((h, index) => <div className="online-shift" key={index}>
                <select aria-label={`Dia do turno ${index + 1} de ${profissional.nome}`} className="form-select" value={h.diaSemana} onChange={e => alterarProfissional(profissional.id, p => ({ ...p, horarios: p.horarios.map((t, i) => i === index ? { ...t, diaSemana: Number(e.target.value) } : t) }))}>{dias.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
                <input aria-label={`Início do turno ${index + 1} de ${profissional.nome}`} type="time" step="900" required className="form-control" value={hora(h.inicioMinuto)} onChange={e => alterarProfissional(profissional.id, p => ({ ...p, horarios: p.horarios.map((t, i) => i === index ? { ...t, inicioMinuto: minutos(e.target.value) } : t) }))} /><span>até</span>
                <input aria-label={`Fim do turno ${index + 1} de ${profissional.nome}`} type="time" step="900" required className="form-control" value={hora(h.fimMinuto)} onChange={e => alterarProfissional(profissional.id, p => ({ ...p, horarios: p.horarios.map((t, i) => i === index ? { ...t, fimMinuto: minutos(e.target.value) } : t) }))} />
                <button type="button" className="btn btn-outline-danger btn-sm" aria-label={`Remover turno ${index + 1} de ${profissional.nome}`} onClick={() => alterarProfissional(profissional.id, p => ({ ...p, horarios: p.horarios.filter((_, i) => i !== index) }))}>Remover</button>
              </div>)}</div><button type="button" className="btn btn-outline-primary btn-sm mt-3" onClick={() => alterarProfissional(profissional.id, p => ({ ...p, horarios: [...p.horarios, { diaSemana: 1, inicioMinuto: 780, fimMinuto: 1080 }] }))}>+ Adicionar turno</button></div>}
            </section>;
          })}
        </section>
        <div className="online-save"><span>{alterado ? "Você tem alterações para salvar." : "O link mantém o mesmo endereço quando você altera os horários."}</span><button type="submit" className="btn btn-primary">{salvando ? "Salvando…" : codigo ? "Salvar configuração" : "Criar link"}</button></div>
      </fieldset></form>
    </>}
  </div>;
}

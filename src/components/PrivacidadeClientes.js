import { mascaraTelefone } from "../utils/masks";
import CampoComMascara from "./CampoComMascara";
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import ModuleTabs from "./ModuleTabs";
import "./privacidade.css";

export const dataPrivacidade = valor => valor ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(valor) ? valor : `${valor}Z`).toLocaleString("pt-BR") : "—";
export const statusPrivacidade = status => ({ Aceito: "Resposta registrada", Recusado: "Recusado", Revogado: "Autorizações revogadas", Substituido: "Substituído", Pendente: "Aguardando cliente", Expirado: "Link expirado" }[status] || status);
const mensagemErro = e => typeof e.response?.data === "string" ? e.response.data : "Não foi possível concluir. Tente novamente.";

export default function PrivacidadeClientes({ clientes, clienteInicial, onAtualizar }) {
  const [aba, setAba] = useState("clientes");
  const [config, setConfig] = useState(null), [form, setForm] = useState(null), [texto, setTexto] = useState("");
  const [clienteId, setClienteId] = useState(clienteInicial ? String(clienteInicial) : "");
  const [historico, setHistorico] = useState(null), [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(""), [mensagem, setMensagem] = useState("");
  const podeConfigurar = ["Administrador", "Gerente"].includes(localStorage.getItem("perfil"));
  const carregarConfig = useCallback(async () => {
    const { data } = await api.get("/privacidade/configuracao"); setConfig(data); setForm(data.configuracao); setTexto(data.texto);
  }, []);
  useEffect(() => { carregarConfig().catch(e => setErro(mensagemErro(e))); }, [carregarConfig]);
  const carregarHistorico = useCallback(async () => {
    if (!clienteId) return;
    const { data } = await api.get(`/privacidade/clientes/${clienteId}`); return data;
  }, [clienteId]);
  useEffect(() => {
    let ativo = true; setHistorico(null);
    const atualizar = () => { if (!clienteId || document.visibilityState !== "visible") return; carregarHistorico().then(data => { if (ativo) setHistorico(data); }).catch(e => { if (ativo) setErro(mensagemErro(e)); }); };
    atualizar(); const timer = setInterval(atualizar, 15000); window.addEventListener("focus", atualizar);
    return () => { ativo = false; clearInterval(timer); window.removeEventListener("focus", atualizar); };
  }, [clienteId, carregarHistorico]);
  const cliente = clientes.find(c => String(c.id) === clienteId);
  const pendente = historico?.pedidos.find(p => p.status === "Pendente");
  const link = pendente ? `${window.location.origin}/privacidade/${pendente.codigo}` : "";
  let telefone = (cliente?.telefone || "").replace(/\D/g, ""); if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
  const whats = `https://wa.me/${telefone}?text=${encodeURIComponent(`Olá, ${cliente?.nome || ""}! Leia o aviso de privacidade de ${form?.controlador || "nossa empresa"} e registre suas escolhas neste link: ${link}`)}`;
  async function executar(fn) { setErro(""); setMensagem(""); setOcupado(true); try { await fn(); } catch (e) { setErro(mensagemErro(e)); } finally { setOcupado(false); } }
  async function gerar() { await executar(async () => { await api.post(`/privacidade/clientes/${clienteId}/link`); setHistorico(await carregarHistorico()); await onAtualizar(); setMensagem("Link preparado. Copie ou abra o WhatsApp para enviar ao cliente."); }); }
  async function salvar(e) { e.preventDefault(); await executar(async () => { await api.put("/privacidade/configuracao", form); await carregarConfig(); if (clienteId) setHistorico(await carregarHistorico()); await onAtualizar(); setMensagem("Aviso salvo. Os próximos links usarão esta versão; respostas anteriores foram preservadas."); }); }
  function baixar(p) {
    const evidencia = `REGISTRO DE PRIVACIDADE\nCliente: ${cliente?.nome}\nVersão: ${p.versao}\nStatus: ${statusPrivacidade(p.status)}\nCriado em: ${dataPrivacidade(p.criadoEm)}\nResposta: ${dataPrivacidade(p.respondidoEm)}\nNome informado: ${p.nomeInformado || "—"}\nCiência: ${p.ciencia ? "Sim" : "Não"}\nPromoções: ${p.marketing ? "Autorizado na resposta" : "Não autorizado"}\nImagem: ${p.imagem ? "Autorizado na resposta" : "Não autorizado"}\nDados de saúde: ${p.dadosSensiveis ? "Autorizado na resposta" : "Não autorizado"}\nIP da resposta: ${p.ip || "—"}\nNavegador: ${p.userAgent || "—"}\nRevogação: ${dataPrivacidade(p.revogadoEm)}\nIP da revogação: ${p.revogacaoIp || "—"}\nNavegador da revogação: ${p.revogacaoUserAgent || "—"}\nHash SHA-256 do aviso: ${p.hash}\n\nTEXTO APRESENTADO\n\n${p.texto}`;
    const url = URL.createObjectURL(new Blob([evidencia], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `privacidade-cliente-${clienteId}-registro-${p.id}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="lgpd-module">
    <ModuleTabs active={aba} onChange={setAba} tabs={[{ id: "clientes", label: "Enviar e acompanhar" }, { id: "configuracao", label: "Configuração do aviso" }]} />
    {erro && <div role="alert" className="alert alert-danger">{erro}</div>}{mensagem && <div role="status" className="alert alert-success">{mensagem}</div>}
    {aba === "clientes" && <section className="panel"><h2>Privacidade do cliente</h2><p>Prepare o link para o cliente ler o aviso e escolher suas autorizações.</p>
      <label className="lgpd-field">Cliente<select className="form-select" value={clienteId} onChange={e => { setClienteId(e.target.value); setErro(""); setMensagem(""); }}><option value="">Selecione um cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome} {c.telefone ? `· ${mascaraTelefone(c.telefone)}` : ""}</option>)}</select></label>
      {config && !config.publicada && <p className="alert alert-info">{podeConfigurar ? "Revise os dados da empresa e salve o aviso em Configuração do aviso para começar." : "Peça ao administrador para configurar o aviso de privacidade."}</p>}
      {cliente && <><div className="lgpd-actions"><button className="btn btn-primary" type="button" disabled={ocupado || !config?.publicada} onClick={gerar}>{ocupado ? "Preparando…" : pendente ? "Atualizar link" : "Preparar link para o cliente"}</button><button type="button" className="btn btn-outline-secondary" onClick={() => executar(async () => { setHistorico(await carregarHistorico()); await onAtualizar(); })}>Atualizar respostas</button></div>
      {pendente && <div className="lgpd-link"><strong>Aguardando a resposta do cliente · versão {pendente.versao}</strong><label className="lgpd-field">Link individual<input className="form-control" value={link} readOnly onFocus={e => e.target.select()} /></label><small>Válido até {dataPrivacidade(pendente.expiraEm)}. Preparar ou enviar o link não registra aceite.</small><div className="lgpd-actions"><button type="button" className="btn btn-outline-primary" onClick={() => executar(async () => { await navigator.clipboard.writeText(link); setMensagem("Link copiado."); })}>Copiar link</button><a className="btn btn-success" href={whats} target="_blank" rel="noreferrer">Enviar pelo WhatsApp</a><a className="btn btn-outline-primary" href={link} target="_blank" rel="noreferrer">Ver página do cliente ↗</a></div></div>}
      {historico?.legado && <p className="alert alert-info">Há uma marcação anterior de LGPD. Envie o novo aviso para registrar a versão do texto e as escolhas do cliente.</p>}
      <h3 className="mt-4">Histórico de solicitações e respostas</h3>{historico?.pedidos.length === 0 && <p>Nenhum aviso enviado para este cliente.</p>}
      {historico?.pedidos.map(p => <details className="lgpd-record" key={p.id}><summary><span>Versão {p.versao} · {statusPrivacidade(p.status)}</span><small>{dataPrivacidade(p.respondidoEm || p.criadoEm)}</small></summary><p>{p.versao !== historico.versaoAtual ? "Este registro pertence a uma versão anterior do aviso. " : ""}{p.respondidoEm ? `Resposta informada por ${p.nomeInformado}.` : "O cliente ainda não respondeu a este pedido."}</p>{p.respondidoEm && <p>Na resposta: ciência {p.ciencia ? "registrada" : "recusada"}; promoções {p.marketing ? "sim" : "não"}; imagem {p.imagem ? "sim" : "não"}; dados de saúde {p.dadosSensiveis ? "sim" : "não"}.{p.revogadoEm && ` Autorizações retiradas em ${dataPrivacidade(p.revogadoEm)}.`}</p>}<button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => baixar(p)}>Baixar registro</button><pre className="lgpd-text">{p.texto}</pre></details>)}</>}
    </section>}
    {aba === "configuracao" && form && <form className="panel" onSubmit={salvar}><h2>Aviso de privacidade da empresa</h2><p>Modelo baseado na LGPD. Confira se os dados, finalidades, compartilhamentos e critérios de guarda refletem a operação da empresa antes de enviar.</p><fieldset disabled={ocupado || !podeConfigurar}>
      <div className="lgpd-grid"><label className="lgpd-field">Nome ou razão social<input className="form-control" required maxLength={180} value={form.controlador} onChange={e => setForm({ ...form, controlador: e.target.value })} /></label><label className="lgpd-field">CPF / CNPJ<CampoComMascara mascara="documento" className="form-control" maxLength={30} value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></label></div><label className="lgpd-field">Contato de privacidade (e-mail ou telefone)<input className="form-control" required maxLength={200} value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} /></label>
      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setForm({ ...form, controlador: config.dadosEmpresa.controlador, documento: config.dadosEmpresa.documento, contato: config.dadosEmpresa.contato })}>Usar dados da empresa</button>
      <label className="lgpd-field">Guarda e eliminação de dados<textarea className="form-control" rows={4} required maxLength={2000} value={form.retencao} onChange={e => setForm({ ...form, retencao: e.target.value })} /></label><label className="lgpd-field">Com quem os dados são compartilhados e por quê<textarea className="form-control" rows={4} required maxLength={2000} value={form.compartilhamento} onChange={e => setForm({ ...form, compartilhamento: e.target.value })} /></label>
      <h3>Autorizações que o cliente poderá escolher</h3><p>São opcionais e aparecerão desmarcadas para o cliente.</p>{[["oferecerMarketing", "Promoções por WhatsApp ou e-mail"], ["oferecerImagem", "Divulgação de imagem nos canais oficiais"], ["oferecerDadosSensiveis", "Dados de saúde para cuidados no procedimento"]].map(([campo, rotulo]) => <label className="lgpd-choice" key={campo}><input type="checkbox" checked={form[campo]} onChange={e => setForm({ ...form, [campo]: e.target.checked })} /><span>{rotulo}</span></label>)}
      <label className="lgpd-field">Informações adicionais da empresa<textarea className="form-control" rows={3} maxLength={3000} value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} /></label>
      <div className="lgpd-actions"><button type="button" className="btn btn-outline-primary" onClick={() => executar(async () => { const { data } = await api.post("/privacidade/previa", form); setTexto(data.texto); setMensagem("Prévia atualizada. Confira o texto antes de salvar."); })}>Visualizar aviso</button><button className="btn btn-primary">{ocupado ? "Salvando…" : "Salvar aviso"}</button><span>Versão salva: {form.versaoAtual || "nenhuma"}</span></div>
      </fieldset><details className="lgpd-record" open><summary>Texto do aviso</summary><pre className="lgpd-text">{texto}</pre></details><p className="lgpd-sources"><a className="btn btn-outline-secondary btn-sm" href={config.leiUrl} target="_blank" rel="noreferrer">Lei nº 13.709/2018 — LGPD ↗</a><a className="btn btn-outline-secondary btn-sm" href={config.anpdUrl} target="_blank" rel="noreferrer">Direitos do titular — ANPD ↗</a></p>
    </form>}
  </div>;
}

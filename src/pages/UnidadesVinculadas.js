import CampoComMascara from "../components/CampoComMascara";
import { useEffect, useState } from "react";
import api from "../api";
import { useSessao } from "../components/SessaoProvider";
import TransferenciasUnidades from "../components/TransferenciasUnidades";
import { formatarMoeda } from "../utils/masks";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const inicial = { nome: "", documento: "", telefone: "", endereco: "", email: "" };
export default function UnidadesVinculadas() {
  const { usuario, atualizar, verificar } = useSessao();
  const [aba, setAba] = useState("unidades"), [cobranca, setCobranca] = useState(null);
  const [unidades, setUnidades] = useState([]), [form, setForm] = useState(inicial);
  const [carregando, setCarregando] = useState(true), [erro, setErro] = useState(false), [ocupado, setOcupado] = useState(false);
  async function carregar() {
    setCarregando(true); setErro(false);
    try { const [u, c] = await Promise.all([api.get("/unidades-vinculadas"), api.get("/unidades-vinculadas/cobranca")]); setUnidades(u.data); setCobranca(c.data); } catch { setErro(true); } finally { setCarregando(false); }
  }
  useEffect(() => { if (usuario?.gerenciaUnidades) carregar(); }, [usuario?.gerenciaUnidades]);
  async function criar(e) {
    e.preventDefault(); if (ocupado) return; setOcupado(true);
    try { await api.post("/unidades-vinculadas", form); setForm(inicial); await verificar(); await carregar(); await alertaSucesso("Unidade criada. Acesse Gerenciar usuários para cadastrar os logins da equipe."); }
    catch (e) { await alertaErro(e.response?.data || "Não foi possível criar a unidade."); } finally { setOcupado(false); }
  }
  async function entrar(id, destino) {
    if (ocupado) return; setOcupado(true);
    try { const { data } = await api.post("/auth/unidade", { unidadeId: id }); await atualizar(data); window.location.assign(destino); }
    catch (e) { await alertaErro(e.response?.data || "Não foi possível acessar a unidade."); setOcupado(false); }
  }
  if (!usuario?.gerenciaUnidades) return <section className="panel">Somente o administrador da principal pode gerenciar unidades vinculadas.</section>;
  return <><PageHeader title="Unidades vinculadas" subtitle="Gerencie suas unidades mantendo a operação de cada uma separada." />
    <section className="panel mb-3"><strong>Unidade em uso: {usuario.unidade}</strong><p className="mb-0">Ao trocar, você acessa os clientes, agenda, PDV, estoque e configurações daquela unidade. Os logins da equipe acessam somente a unidade em que foram cadastrados.</p></section>
    <div className="d-flex gap-2 mb-3" role="tablist" aria-label="Gestão de unidades"><button role="tab" aria-selected={aba === "unidades"} className={`btn ${aba === "unidades" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setAba("unidades")}>Unidades e acessos</button>{unidades.length > 1 && <button role="tab" aria-selected={aba === "transferencias"} className={`btn ${aba === "transferencias" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setAba("transferencias")}>Transferências de produtos</button>}</div>
    {aba === "transferencias" && unidades.length > 1 ? <TransferenciasUnidades unidades={unidades} /> : <>
    {cobranca && <section className="panel mb-3"><h2 className="h5">Mensalidade das unidades</h2><p className="mb-1">Base: {formatarMoeda(cobranca.valorBase)} + {cobranca.quantidade} unidade(s) adicional(is) × {formatarMoeda(cobranca.valorUnitario)} = <strong>{formatarMoeda(cobranca.total)}/mês</strong></p><small>O adicional é cobrado na assinatura da principal. Cada nova unidade acrescenta {formatarMoeda(cobranca.valorUnitario)} por mês. Mensalidades pagas ou vencidas são preservadas.</small></section>}
    {carregando ? <div role="status" className="panel">Carregando unidades...</div> : erro ? <div role="alert" className="panel">Não foi possível carregar as unidades. <button className="btn btn-outline-primary" onClick={carregar}>Tentar novamente</button></div> : <div className="row g-3 mb-3">{unidades.map(u => <div className="col-md-6" key={u.id}><section className="panel h-100">
      <h2 className="h5">{u.nome}</h2><p className="text-muted">{u.principal ? "Principal" : u.independente ? "Unidade independente vinculada" : "Unidade anterior · configurações da empresa compartilhadas"}{u.id === usuario.unidadeId ? " · Em uso" : ""}</p>
      <div className="d-flex flex-wrap gap-2"><button disabled={ocupado} className="btn btn-primary" onClick={() => entrar(u.id, "/")}>Acessar unidade</button><button disabled={ocupado} className="btn btn-outline-primary" onClick={() => entrar(u.id, "/usuarios")}>Gerenciar usuários</button></div>
    </section></div>)}</div>}
    <form className="panel" onSubmit={criar}><h2 className="h5">Nova unidade</h2><p>Começa com cadastros e configurações próprios. Nenhum cliente, produto, serviço ou saldo da principal será copiado.</p><fieldset disabled={ocupado || carregando || erro || !cobranca}><div className="row g-3">
      {[["nome", "Nome da unidade", 120], ["documento", "CPF/CNPJ", 30], ["telefone", "Telefone", 30], ["email", "E-mail da unidade", 254], ["endereco", "Endereço", 300]].map(([campo, label, limite]) => <div className={campo === "endereco" ? "col-12" : "col-md-6"} key={campo}><label htmlFor={`unidade-${campo}`}>{label}</label><CampoComMascara mascara={campo === "telefone" ? "telefone" : campo === "documento" ? "documento" : undefined} id={`unidade-${campo}`} className="form-control" type={campo === "email" ? "email" : "text"} maxLength={limite} required={campo === "nome"} value={form[campo]} onChange={e => setForm(atual => ({ ...atual, [campo]: e.target.value }))} /></div>)}
    </div><p className="mt-3">Ao criar, o adicional mensal será de {formatarMoeda(cobranca?.valorUnitario ?? 100)}. A mensalidade prevista passará a {formatarMoeda((cobranca?.total ?? 0) + (cobranca?.valorUnitario ?? 100))}.</p><button type="submit" className="btn btn-primary mt-3">{ocupado ? "Aguarde..." : "Criar unidade"}</button></fieldset></form>
  </>}</>;
}

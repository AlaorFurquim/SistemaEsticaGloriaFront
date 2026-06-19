import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const inicial={clienteId:"",dataAgendada:"",tipo:"Retorno",canal:"WhatsApp",mensagem:""};
export default function CrmLembretes(){
 const [lista,setLista]=useState([]),[clientes,setClientes]=useState([]),[form,setForm]=useState(inicial);
 async function carregar(){try{const [l,c]=await Promise.all([api.get("/crm-lembretes"),api.get("/clientes")]);setLista(l.data||[]);setClientes(c.data||[]);}catch{alertaErro("Erro ao carregar CRM.");}}
 async function salvar(e){e.preventDefault();await api.post("/crm-lembretes",{...form,clienteId:Number(form.clienteId)});setForm(inicial);await carregar();alertaSucesso("Lembrete salvo.");}
 async function abrirWhats(c){const tel=(c.cliente?.telefone||"").replace(/\D/g,""); if(tel) window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(c.mensagem)}`,"_blank"); await api.post(`/crm-lembretes/${c.id}/enviado`); await carregar();}
 useEffect(()=>{carregar();},[]);
 return <div><PageHeader title="CRM" subtitle="Retornos, aniversários, pós-procedimento, cobrança e clientes inativos" /><form className="panel mb-3" onSubmit={salvar}><div className="row g-2"><div className="col-md-3"><label>Cliente</label><select className="form-select" value={form.clienteId} onChange={e=>setForm({...form,clienteId:e.target.value})}><option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div><div className="col-md-2"><label>Data</label><input type="date" className="form-control" value={form.dataAgendada} onChange={e=>setForm({...form,dataAgendada:e.target.value})}/></div><div className="col-md-2"><label>Tipo</label><select className="form-select" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option>Retorno</option><option>Aniversário</option><option>Pós-procedimento</option><option>Cobrança</option><option>Cliente inativo</option></select></div><div className="col-md-4"><label>Mensagem</label><input className="form-control" value={form.mensagem} onChange={e=>setForm({...form,mensagem:e.target.value})}/></div><div className="col-md-1 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div></div></form><div className="panel"><table className="table professional-table"><tbody>{lista.map(x=><tr key={x.id}><td>{formatarDataHora(x.dataAgendada)}</td><td>{x.cliente?.nome}</td><td>{x.tipo}</td><td>{x.status}</td><td><button className="btn btn-outline-success btn-sm" onClick={()=>abrirWhats(x)}>WhatsApp</button></td></tr>)}</tbody></table></div></div>
}

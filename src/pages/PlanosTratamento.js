import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";

const inicial = { clienteId:"", profissionalId:"", nome:"", objetivo:"", totalSessoes:1, sessoesRealizadas:0, proximaSessao:"", status:"Em andamento", resultadoEsperado:"", evolucao:"" };
export default function PlanosTratamento(){
  const [lista,setLista]=useState([]),[clientes,setClientes]=useState([]),[profissionais,setProfissionais]=useState([]),[form,setForm]=useState(inicial),[editando,setEditando]=useState(null);
  async function carregar(){try{const [p,c,pr]=await Promise.all([api.get("/planos-tratamento"),api.get("/clientes"),api.get("/profissionais")]);setLista(p.data||[]);setClientes(c.data||[]);setProfissionais(pr.data||[]);}catch(e){alertaErro(e.response?.data||"Não foi possível carregar planos.");}}
  async function salvar(e){e.preventDefault();try{loading();const payload={...form,clienteId:Number(form.clienteId),profissionalId:form.profissionalId?Number(form.profissionalId):null,totalSessoes:Number(form.totalSessoes),sessoesRealizadas:Number(form.sessoesRealizadas),proximaSessao:form.proximaSessao||null}; editando?await api.put(`/planos-tratamento/${editando}`,payload):await api.post("/planos-tratamento",payload);setForm(inicial);setEditando(null);await carregar();fecharLoading();alertaSucesso("Plano salvo.");}catch(e){fecharLoading();alertaErro(e.response?.data||"Erro ao salvar plano.");}}
  useEffect(()=>{carregar();},[]);
  return <div><PageHeader title="Planos de Tratamento" subtitle="Pacotes, sessões, evolução, retorno e resultado esperado" />
    <form className="panel mb-3" onSubmit={salvar}><div className="row g-2">
      <div className="col-md-3"><label>Cliente</label><select className="form-select" value={form.clienteId} onChange={e=>setForm({...form,clienteId:e.target.value})} required><option value="">Selecione...</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      <div className="col-md-3"><label>Profissional</label><select className="form-select" value={form.profissionalId} onChange={e=>setForm({...form,profissionalId:e.target.value})}><option value="">Selecione...</option>{profissionais.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      <div className="col-md-3"><label>Plano/Pacote</label><input className="form-control" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} required /></div>
      <div className="col-md-1"><label>Sessões</label><input type="number" className="form-control" value={form.totalSessoes} onChange={e=>setForm({...form,totalSessoes:e.target.value})}/></div>
      <div className="col-md-1"><label>Feitas</label><input type="number" className="form-control" value={form.sessoesRealizadas} onChange={e=>setForm({...form,sessoesRealizadas:e.target.value})}/></div>
      <div className="col-md-1"><label>Retorno</label><input type="date" className="form-control" value={form.proximaSessao} onChange={e=>setForm({...form,proximaSessao:e.target.value})}/></div>
      <div className="col-md-4"><label>Objetivo</label><input className="form-control" value={form.objetivo} onChange={e=>setForm({...form,objetivo:e.target.value})}/></div>
      <div className="col-md-3"><label>Status</label><select className="form-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Em andamento</option><option>Concluído</option><option>Pausado</option><option>Cancelado</option></select></div>
      <div className="col-md-5"><label>Resultado esperado</label><input className="form-control" value={form.resultadoEsperado} onChange={e=>setForm({...form,resultadoEsperado:e.target.value})}/></div>
      <div className="col-md-10"><label>Evolução</label><textarea className="form-control" rows="3" value={form.evolucao} onChange={e=>setForm({...form,evolucao:e.target.value})}/></div>
      <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
    </div></form>
    <div className="panel"><table className="table professional-table"><thead><tr><th>Cliente</th><th>Plano</th><th>Sessões</th><th>Status</th><th>Ações</th></tr></thead><tbody>{lista.map(x=><tr key={x.id}><td>{x.cliente?.nome}</td><td>{x.nome}</td><td>{x.sessoesRealizadas}/{x.totalSessoes}</td><td>{x.status}</td><td><button className="btn btn-outline-primary btn-sm" onClick={()=>{setEditando(x.id);setForm({...x,proximaSessao:x.proximaSessao?String(x.proximaSessao).substring(0,10):""});}}>Editar</button></td></tr>)}</tbody></table></div>
  </div>
}

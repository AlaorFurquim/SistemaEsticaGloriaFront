import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";

export default function ConfiguracaoClinica(){
  const [form,setForm]=useState({nome:"",cnpj:"",endereco:"",telefone:"",email:"",cidade:"",uf:""});
  useEffect(()=>{api.get("/configuracao-clinica").then(r=>setForm(r.data||{})).catch(()=>alertaErro("Não foi possível carregar a clínica."));},[]);
  async function salvar(e){e.preventDefault();try{await api.put("/configuracao-clinica",form);alertaSucesso("Configuração salva.");}catch(err){alertaErro(err.response?.data||"Não foi possível salvar.");}}
  return <div><PageHeader title="Clínica" subtitle="Dados usados em receitas, termos e documentos" /><form className="panel" onSubmit={salvar}><div className="row g-2">
    {["nome","cnpj","endereco","telefone","email","cidade","uf"].map(c=><div className={c==="endereco"?"col-md-6":"col-md-3"} key={c}><label>{c.toUpperCase()}</label><input className="form-control" value={form[c]||""} onChange={e=>setForm({...form,[c]:e.target.value})}/></div>)}
    <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
  </div></form></div>
}

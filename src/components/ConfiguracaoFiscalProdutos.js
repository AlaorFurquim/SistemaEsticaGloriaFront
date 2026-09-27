import { useEffect, useRef, useState } from "react";
import api from "../api";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";
import { mascaraCpfCnpj } from "../utils/masks";

export default function ConfiguracaoFiscalProdutos({ tipo }) {
  const [form, setForm] = useState({ ambiente: "homologacao", crt: "", serie: "", proximoNumero: "", idCsc: "", csc: "" });
  const [data, setData] = useState(null);
  const [ambientes, setAmbientes] = useState([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mostrarCsc, setMostrarCsc] = useState(false);
  const consulta = useRef(0);
  const titulo = tipo === "NFE" ? "NF-e" : "NFC-e";
  async function carregar(ambiente) {
    const n = ++consulta.current;
    setOcupado(true); setErro(""); setData(null);
    setForm(f => ({ ...f, ambiente, csc: "" }));
    try {
      const { data: d } = await api.get(`/notas-fiscais/configuracao-produtos/${tipo}`, { params: { ambiente } });
      if (n !== consulta.current) return;
      setData(d);
      setForm({ ambiente, crt: d.crt ?? "", serie: d.serie ?? "", proximoNumero: d.proximoNumero ?? "", idCsc: d.idCsc ?? "", csc: "" });
    } catch (e) { if (n === consulta.current) setErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível carregar a configuração."); }
    finally { if (n === consulta.current) setOcupado(false); }
  }
  useEffect(() => {
    let ativo = true;
    api.get("/notas-fiscais/ambientes").then(({ data: d }) => {
      if (ativo) { setAmbientes(d.ambientesDisponiveis); carregar(d.ambienteAtual); }
    }).catch(() => { if (ativo) { setErro("Não foi possível consultar os ambientes fiscais."); setOcupado(false); } });
    return () => { ativo = false; consulta.current++; };
  }, [tipo]);
  const alterar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  async function salvar(e) {
    e.preventDefault();
    if (salvando || ocupado || !data) return;
    if (form.ambiente === "producao" && data.ambienteAtual !== "producao"
      && !await confirmarAcao("Ativar produção?", "As próximas emissões da empresa terão valor fiscal. Deseja salvar em produção?")) return;
    setSalvando(true);
    try {
      await api.put(`/notas-fiscais/configuracao-produtos/${tipo}`, {
        ...form, crt: Number(form.crt), serie: Number(form.serie), proximoNumero: Number(form.proximoNumero),
        idCsc: form.idCsc ? Number(form.idCsc) : null
      });
      await carregar(form.ambiente);
      alertaSucesso(`Configuração de ${titulo} salva.`);
    } catch (e) { alertaErro(typeof e.response?.data === "string" ? e.response.data : "Não foi possível salvar a configuração."); }
    finally { setSalvando(false); }
  }
  return <form className="panel" onSubmit={salvar}>
    <h5>{titulo} · Produtos</h5>
    <p className="text-muted">{tipo === "NFE" ? "Nota fiscal de produtos com destinatário e endereço fiscal." : "Nota ao consumidor, com CSC fornecido pela SEFAZ."}</p>
    <label className="form-label" htmlFor="produto-ambiente">Ambiente de emissão</label>
    <select id="produto-ambiente" className="form-select mb-3" value={form.ambiente} disabled={salvando || !ambientes.length} onChange={e => carregar(e.target.value)}>
      {ambientes.map(a => <option key={a} value={a}>{a === "producao" ? "Produção — com valor fiscal" : "Homologação — testes sem valor fiscal"}</option>)}
    </select>
    {ocupado && <p role="status">Consultando configuração…</p>}
    {erro && <p role="alert" className="alert alert-warning">{erro} <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => carregar(form.ambiente)}>Tentar novamente</button></p>}
    {data && <>
      <p><strong>{data.emitente.nome}</strong> · {mascaraCpfCnpj(data.emitente.cnpj)}<br />Ambiente ativo da empresa: {data.ambienteAtual === "producao" ? "Produção" : "Homologação"}.</p>
      {!data.inscricaoEstadualCadastrada && <p role="alert" className="alert alert-warning">A empresa está sem inscrição estadual na ACBr. Confirme com sua contabilidade o cadastro e o credenciamento na SEFAZ para emitir NF-e/NFC-e. A configuração de NFS-e é independente.</p>}
      <fieldset disabled={salvando || ocupado}>
        <div className="row g-3">
          <div className="col-md-6"><label htmlFor="prod-crt">Regime tributário</label><select id="prod-crt" name="crt" className="form-select" required value={form.crt} onChange={alterar}>
            <option value="">Selecione conforme o cadastro fiscal</option><option value="1">Simples Nacional</option><option value="2">Simples Nacional — excesso de sublimite</option><option value="3">Regime normal</option><option value="4">MEI</option>
          </select></div>
          <div className="col-md-3"><label htmlFor="prod-serie">Série</label><input id="prod-serie" name="serie" type="number" min="1" max="889" required className="form-control" value={form.serie} onChange={alterar} readOnly={data.serie != null} /></div>
          <div className="col-md-3"><label htmlFor="prod-numero">Próximo número</label><input id="prod-numero" name="proximoNumero" type="number" min={data.proximoNumero || 1} max="999999999" required className="form-control" value={form.proximoNumero} onChange={alterar} /></div>
          {tipo === "NFCE" && <><div className="col-md-3"><label htmlFor="prod-id-csc">Identificador CSC</label><input id="prod-id-csc" name="idCsc" type="number" min="1" required value={form.idCsc} onChange={alterar} className="form-control" /></div>
            <div className="col-md-9"><label htmlFor="prod-csc">CSC deste ambiente</label><div className="input-group"><input id="prod-csc" name="csc" type={mostrarCsc ? "text" : "password"} autoComplete="off" required={!data.possuiCsc} value={form.csc} onChange={alterar} className="form-control" placeholder={data.possuiCsc ? "Já configurado. Deixe vazio para manter." : "Token fornecido pela SEFAZ"} /><button type="button" className="btn btn-outline-secondary" onClick={() => setMostrarCsc(!mostrarCsc)}>{mostrarCsc ? "Ocultar" : "Mostrar"}</button></div></div></>}
        </div>
        <p className="text-muted mt-3">Confira a série e o próximo número com sua contabilidade, incluindo notas emitidas em outros sistemas. O LAP Care reserva um número para cada tentativa e não reutiliza números já enviados.</p>
        <p className="alert alert-info">Emissão disponível para venda interna a consumidor final não contribuinte, Simples Nacional, CSOSN 102, sem destaque de ICMS/PIS/COFINS. Outras tributações são bloqueadas até receberem configuração específica.</p>
        <button className="btn btn-primary" type="submit">{salvando ? "Salvando…" : `Salvar configuração de ${titulo}`}</button>
      </fieldset>
    </>}
  </form>;
}

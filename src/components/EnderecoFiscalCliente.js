import EmpresaLocalidade from "./EmpresaLocalidade";

export default function EnderecoFiscalCliente({ value, onChange }) {
  const v = value || {};
  const atualizar = patch => onChange({ ...v, ...patch });
  return <details className="col-12 mt-3">
    <summary className="fw-semibold mb-3">Endereço fiscal · para emitir NF-e de produtos</summary>
    <p className="text-muted">Preencha o endereço do destinatário. O endereço livre do cadastro continua disponível.</p>
    <div className="row g-2">
      {[["cep", "CEP", 9], ["logradouro", "Rua / avenida", 60], ["numero", "Número", 60], ["complemento", "Complemento", 60], ["bairro", "Bairro", 60]].map(([key, label, max]) =>
        <div className={key === "logradouro" ? "col-md-6" : "col-md-3"} key={key}><label htmlFor={`fiscal-${key}`}>{label}</label><input id={`fiscal-${key}`} className="form-control" maxLength={max} value={v[key] || ""} inputMode={key === "cep" ? "numeric" : "text"}
          onChange={e => atualizar({ [key]: key === "cep" ? e.target.value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2") : e.target.value })} /></div>)}
      <EmpresaLocalidade titulo="Estado e cidade do cliente" value={v} onChange={atualizar} />
      <div className="col-md-6"><label htmlFor="fiscal-ie-ind">Tipo de contribuinte</label><select id="fiscal-ie-ind" className="form-select" value={v.indicadorIe ?? 9} onChange={e => atualizar({ indicadorIe: Number(e.target.value) })}>
        <option value={9}>Não contribuinte do ICMS</option><option value={1}>Contribuinte do ICMS</option><option value={2}>Contribuinte isento</option>
      </select></div>
      {Number(v.indicadorIe) === 1 && <div className="col-md-6"><label htmlFor="fiscal-ie">Inscrição estadual</label><input id="fiscal-ie" className="form-control" maxLength={14} value={v.inscricaoEstadual || ""} onChange={e => atualizar({ inscricaoEstadual: e.target.value })} /></div>}
    </div>
  </details>;
}

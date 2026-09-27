import React, { useEffect, useId, useState } from "react";
import api from "../api";

export default function EmpresaLocalidade({ value, onChange, titulo = "Localização da empresa" }) {
  const id = useId();
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erroEstados, setErroEstados] = useState("");
  const [erroCidades, setErroCidades] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const uf = value?.uf || "";
  const codigo = value?.codigoMunicipioIbge || "";

  useEffect(() => {
    let atual = true;
    setErroEstados("");
    api.get("/localidades/estados").then(({ data }) => {
      if (atual) setEstados(data);
    }).catch(() => { if (atual) setErroEstados("Não foi possível carregar os estados."); });
    return () => { atual = false; };
  }, [tentativa]);

  useEffect(() => {
    let atual = true;
    setCidades([]);
    setErroCidades("");
    setCarregando(!!uf);
    if (uf) api.get(`/localidades/estados/${uf}/municipios`).then(({ data }) => {
      if (atual) setCidades(data);
    }).catch(() => { if (atual) setErroCidades("Não foi possível carregar as cidades deste estado."); })
      .finally(() => { if (atual) setCarregando(false); });
    return () => { atual = false; };
  }, [uf, tentativa]);

  return <fieldset className="col-12 mt-3">
    <legend className="fs-6 fw-semibold">{titulo}</legend>
    <div className="row g-2">
      <div className="col-md-4">
        <label htmlFor={`${id}-uf`}>Estado</label>
        <select id={`${id}-uf`} className="form-select" value={uf} required={!!codigo}
          disabled={!estados.length} onChange={e => onChange({ uf: e.target.value, cidade: "", codigoMunicipioIbge: "" })}>
          <option value="">{estados.length ? "Selecione o estado" : "Carregando estados..."}</option>
          {uf && !estados.some(x => x.sigla === uf) && <option value={uf}>{uf}</option>}
          {estados.map(x => <option key={x.id} value={x.sigla}>{x.nome} ({x.sigla})</option>)}
        </select>
      </div>
      <div className="col-md-8">
        <label htmlFor={`${id}-cidade`}>Cidade</label>
        <select id={`${id}-cidade`} className="form-select" value={codigo} required={!!uf}
          disabled={!uf || carregando || !!erroCidades} aria-busy={carregando}
          onChange={e => {
            const cidade = cidades.find(x => String(x.id) === e.target.value);
            onChange({ codigoMunicipioIbge: cidade ? String(cidade.id) : "", cidade: cidade?.nome || "" });
          }}>
          <option value="">{!uf ? "Selecione o estado primeiro" : carregando ? "Carregando cidades..." : "Selecione a cidade"}</option>
          {codigo && !cidades.some(x => String(x.id) === codigo) && <option value={codigo}>{value.cidade || codigo}</option>}
          {cidades.map(x => <option key={x.id} value={String(x.id)}>{x.nome}</option>)}
        </select>
      </div>
    </div>
    <small className="text-muted d-block mt-2">Localização usada na emissão de notas fiscais.{codigo ? ` Código IBGE: ${codigo}.` : " O código IBGE é preenchido ao escolher a cidade."}</small>
    {(erroEstados || erroCidades) && <div role="alert" className="mt-2">
      <span>{erroEstados || erroCidades} </span>
      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setTentativa(x => x + 1)}>Tentar novamente</button>
    </div>}
  </fieldset>;
}

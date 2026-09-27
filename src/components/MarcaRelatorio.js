import { useEffect, useState } from "react";
import useBranding from "../hooks/useBranding";
import { iniciaisEmpresa } from "../utils/branding";
import "./MarcaRelatorio.css";

export default function MarcaRelatorio() {
  const branding = useBranding(), [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [branding.logoImagem]);
  const logo = /^data:image\/(jpeg|png|webp);base64,/.test(branding.logoImagem || "") && !falhou;
  return <div className="report-brand">
    <div className="report-brand-copy"><strong>{branding.nomeEmpresa}</strong>{branding.subtituloEmpresa && <span>{branding.subtituloEmpresa}</span>}</div>
    <div className={`report-brand-logo${logo ? " has-image" : ""}`}>{logo ? <img src={branding.logoImagem} alt={`Logo de ${branding.nomeEmpresa}`} onError={() => setFalhou(true)} /> : <span aria-label={`Iniciais de ${branding.nomeEmpresa}`}>{iniciaisEmpresa(branding.nomeEmpresa)}</span>}</div>
  </div>;
}

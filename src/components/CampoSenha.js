import { useEffect, useId, useRef, useState } from "react";
import { estimarForca, requisitosSenha, validarNovaSenha } from "../utils/passwordPolicy";
import "./CampoSenha.css";

const niveis = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];

export default function CampoSenha({ label = "Senha", modo = "atual", compararCom = "", value = "", required = false, className = "", id, ...props }) {
  const gerado = useId();
  const campoId = id || `senha-${gerado}`;
  const input = useRef(null);
  const [visivel, setVisivel] = useState(false);
  const [forca, setForca] = useState(null);
  const [falhaForca, setFalhaForca] = useState(false);
  const nova = modo === "nova";
  const avaliar = nova || modo === "pin";
  const regras = requisitosSenha(value);
  const erro = nova ? validarNovaSenha(value, !required)
    : modo === "confirmacao" && value !== compararCom ? "As senhas precisam ser iguais." : "";

  useEffect(() => { input.current?.setCustomValidity(erro); }, [erro]);
  useEffect(() => { if (!value) setVisivel(false); }, [value]);
  useEffect(() => {
    setForca(null); setFalhaForca(false);
    if (!avaliar || !value || !regras.limite) return;
    let ativo = true;
    const timer = setTimeout(() => {
      estimarForca(value).then(resultado => { if (ativo) setForca(resultado); })
        .catch(() => { if (ativo) setFalhaForca(true); });
    }, 200);
    return () => { ativo = false; clearTimeout(timer); };
  }, [avaliar, value, regras.limite]);

  return <div className={`credential-field ${className}`}>
    <label htmlFor={campoId}>{label}</label>
    <div className="credential-control">
      <input {...props} ref={input} id={campoId} className="form-control"
        type={visivel ? "text" : "password"} value={value} required={required}
        autoComplete={props.autoComplete || (modo === "pin" ? "off" : modo === "atual" ? "current-password" : "new-password")}
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        aria-invalid={Boolean(value && erro)} aria-describedby={`${campoId}-ajuda`} />
      <button type="button" className="credential-toggle" disabled={props.disabled}
        aria-label={`${visivel ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
        aria-controls={campoId} aria-pressed={visivel} onClick={() => setVisivel(atual => !atual)}>
        {visivel ? "Ocultar" : "Ver"}
      </button>
    </div>
    <div id={`${campoId}-ajuda`} className="credential-help">
      {nova && <>
        {!required && !value && <small>Deixe vazio para manter a senha atual.</small>}
        <ul className="credential-rules">
          <li data-valid={Boolean(value && regras.tamanho)}>{value && regras.tamanho ? "✓" : "○"} Pelo menos 12 caracteres</li>
        </ul>
        {!value && <small>Uma frase longa e exclusiva é uma boa opção.</small>}
      </>}
      {avaliar && value && regras.limite && <div className="credential-strength" aria-live="polite">
        {forca ? <>
          <meter min="0" max="4" low="2" high="3" optimum="4" value={forca.score} aria-label={`Força: ${niveis[forca.score]}`} />
          <strong>Força estimada: {niveis[forca.score]}</strong>
          <small>{forca.dica}</small>
        </> : <small>{falhaForca ? "Não foi possível estimar a força. A validação dos requisitos continua disponível." : "Analisando força…"}</small>}
      </div>}
      {modo === "pin" && <small>PIN de autorização. Evite sequências e repetições.{!required && " Vazio mantém o PIN existente."}</small>}
      {value && erro && <span className="credential-error" role="status">{erro}</span>}
      {modo === "confirmacao" && value && !erro && <span className="credential-match" role="status">✓ As senhas conferem.</span>}
    </div>
  </div>;
}

import { useEffect, useState } from "react";
import api from "../api";

export default function ConsultaCadastroOnline({ codigo, nome, telefone, disabled }) {
  const [resultado, setResultado] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  let digitos = telefone.replace(/[^0-9]/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) digitos = digitos.slice(2);
  const pronto = nome.trim().length >= 2 && /^[1-9][0-9]{9,10}$/.test(digitos) && !/[^0-9\s()+.\-]/.test(telefone);
  const chave = JSON.stringify([codigo, nome, telefone]);
  const estado = resultado?.chave === chave ? resultado.estado : "inicial";

  useEffect(() => {
    if (!pronto || disabled) return;
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      setResultado({ chave, estado: "buscando" });
      try {
        const { data } = await api.post(`/publico/agendamento/${codigo}/consultar-cliente`, { nome, telefone }, { signal: abort.signal });
        if (!abort.signal.aborted) setResultado({ chave, estado: data.encontrado ? "encontrado" : "novo" });
      } catch (e) {
        if (!abort.signal.aborted) setResultado({ chave, estado: "erro", mensagem: e.response?.status === 429
          ? "Aguarde um minuto para consultar novamente."
          : "Não foi possível consultar agora. Tente novamente ou continue com seus dados." });
      }
    }, 650);
    return () => { window.clearTimeout(timer); abort.abort(); };
  }, [codigo, nome, telefone, pronto, chave, tentativa, disabled]);

  const titulo = estado === "encontrado" ? "Cadastro encontrado" : estado === "novo" ? "Cadastro não encontrado" : estado === "buscando" ? "Buscando seu cadastro…" : "Já tem cadastro?";
  const mensagem = estado === "encontrado" ? "Seu agendamento será vinculado ao cadastro existente."
    : estado === "novo" ? "Confira o nome e o WhatsApp. Se for seu primeiro atendimento, seu cadastro será criado ao confirmar."
    : estado === "erro" ? resultado.mensagem : "Informe seu nome completo e WhatsApp para localizar seu cadastro.";
  return <div className={`booking-customer-check ${estado === "encontrado" ? "found" : ""}`}>
    <div role="status" aria-live="polite"><strong>{estado === "encontrado" && <span aria-hidden="true">✓ </span>}{titulo}</strong>{estado !== "buscando" && <p>{mensagem}</p>}</div>
    {estado !== "encontrado" && <button type="button" className="btn btn-outline-secondary" disabled={!pronto || estado === "buscando" || disabled} onClick={() => setTentativa(n => n + 1)}>{estado === "erro" ? "Tentar novamente" : "Verificar cadastro"}</button>}
  </div>;
}

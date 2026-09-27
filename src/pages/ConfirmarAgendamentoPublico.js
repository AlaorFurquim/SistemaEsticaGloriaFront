import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { formatarDataHora } from "../utils/masks";

function mensagemErro(error, padrao) {
  return typeof error.response?.data === "string" ? error.response.data : padrao;
}

export default function ConfirmarAgendamentoPublico() {
  const { token } = useParams();
  const [atendimento, setAtendimento] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    api.get(`/publico/confirmacao/${token}`, { signal: abort.signal })
      .then(({ data }) => setAtendimento(data))
      .catch((error) => {
        if (!abort.signal.aborted) setErro(mensagemErro(error, "Não foi possível abrir esta confirmação."));
      });
    return () => abort.abort();
  }, [token]);

  async function confirmar() {
    setEnviando(true);
    setErro("");
    try {
      const { data } = await api.post(`/publico/confirmacao/${token}`);
      setAtendimento((atual) => ({ ...atual, ...data }));
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível confirmar sua presença."));
    } finally {
      setEnviando(false);
    }
  }

  const confirmado = atendimento?.status === "Confirmado";

  return (
    <main className="appointment-confirm-page">
      <section className="appointment-confirm-card">
        <div className="appointment-confirm-mark" aria-hidden="true">LB</div>
        {erro ? (
          <><h1>Link indisponível</h1><p className="appointment-confirm-error">{erro}</p></>
        ) : !atendimento ? (
          <><h1>Carregando agendamento</h1><p>Aguarde um instante.</p></>
        ) : confirmado ? (
          <>
            <div className="appointment-confirm-success" aria-hidden="true">✓</div>
            <span className="appointment-confirm-eyebrow">Presença confirmada</span>
            <h1>Obrigada, {String(atendimento.cliente || "").split(" ")[0]}!</h1>
            <p>Seu horário está confirmado. Esperamos por você.</p>
            <div className="appointment-confirm-summary">
              <strong>{atendimento.servico}</strong>
              <span>{formatarDataHora(atendimento.dataHora)}</span>
              <span>{atendimento.clinica}</span>
            </div>
          </>
        ) : (
          <>
            <span className="appointment-confirm-eyebrow">Confirmação de agendamento</span>
            <h1>Olá, {String(atendimento.cliente || "").split(" ")[0]}!</h1>
            <p>Confirme sua presença para reservar este horário.</p>
            <div className="appointment-confirm-summary">
              <strong>{atendimento.servico}</strong>
              <span>{formatarDataHora(atendimento.dataHora)}</span>
              <span>{atendimento.clinica}</span>
            </div>
            <button type="button" className="btn btn-primary appointment-confirm-button" onClick={confirmar} disabled={enviando}>
              {enviando ? "Confirmando..." : "Confirmar minha presença"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

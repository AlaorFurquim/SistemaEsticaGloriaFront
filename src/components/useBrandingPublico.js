import { useEffect, useState } from "react";
import api from "../api";
import { aplicarTema, brandingPadrao } from "../utils/branding";

// Public pages require an explicit public code (link or verified remembered login).
export default function useBrandingPublico(codigo) {
  const [resposta, setResposta] = useState(null);
  const branding = resposta && resposta.codigo === codigo ? resposta.branding : brandingPadrao;
  useEffect(() => {
    setResposta(null);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo || "")) return;
    const abort = new AbortController();
    api.get(`/publico/aparencia/${codigo}`, { signal: abort.signal })
      .then(({ data }) => { if (!abort.signal.aborted) setResposta({ codigo, branding: { ...brandingPadrao, ...data } }); })
      .catch(() => { if (!abort.signal.aborted) setResposta(null); });
    return () => abort.abort();
  }, [codigo]);
  useEffect(() => {
    const atualizarTema = () => aplicarTema(branding.tema);
    atualizarTema(); window.addEventListener("brandingAtualizado", atualizarTema);
    return () => window.removeEventListener("brandingAtualizado", atualizarTema);
  }, [branding.tema]);
  return branding;
}

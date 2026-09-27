import { useEffect, useState } from "react";
import api from "../api";
import { useSessao } from "../components/SessaoProvider";

export default function useWorkflowAgenda() {
  const { usuario } = useSessao();
  const chave = `${usuario?.email}|${usuario?.unidadeId}`;
  const [estado, setEstado] = useState({ chave: "", habilitado: false, erro: false });
  useEffect(() => {
    const abort = new AbortController(); let revisao = 0;
    async function carregar() {
      if (document.visibilityState === "hidden") return;
      const atual = ++revisao;
      try {
        const { data } = await api.get("/workflow/agenda", { signal: abort.signal });
        if (!abort.signal.aborted && atual === revisao) setEstado({ chave, habilitado: data.confirmacaoAgendamento === true, erro: false });
      } catch {
        if (!abort.signal.aborted && atual === revisao) setEstado({ chave, habilitado: false, erro: true });
      }
    }
    carregar(); const timer = setInterval(carregar, 30000);
    window.addEventListener("focus", carregar); window.addEventListener("workflowAtualizado", carregar);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener("focus", carregar); window.removeEventListener("workflowAtualizado", carregar); };
  }, [chave]);
  return { habilitado: estado.chave === chave && estado.habilitado, erro: estado.chave === chave && estado.erro };
}

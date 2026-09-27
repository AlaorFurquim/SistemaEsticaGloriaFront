import { useEffect, useState } from "react";
import api from "../api";
import { useSessao } from "../components/SessaoProvider";

export default function useWorkflowPdv() {
  const { usuario } = useSessao();
  const chave = `${usuario?.email}|${usuario?.unidadeId}|${usuario?.perfil}`;
  const [estado, setEstado] = useState({ chave: "", separado: false, erro: false });
  useEffect(() => {
    const abort = new AbortController(); let revisao = 0;
    async function carregar() {
      const atual = ++revisao;
      try {
        const { data } = await api.get("/workflow/pdv", { signal: abort.signal });
        if (!abort.signal.aborted && atual === revisao) setEstado({ chave, separado: data.pdvSepararProdutosServicos === true, erro: false });
      } catch {
        if (!abort.signal.aborted && atual === revisao) setEstado({ chave, separado: false, erro: true });
      }
    }
    carregar();
    window.addEventListener("focus", carregar); window.addEventListener("workflowAtualizado", carregar);
    return () => { abort.abort(); window.removeEventListener("focus", carregar); window.removeEventListener("workflowAtualizado", carregar); };
  }, [chave]);
  return { separado: estado.chave === chave && estado.separado, erro: estado.chave === chave && estado.erro };
}

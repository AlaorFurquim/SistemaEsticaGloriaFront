import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useSessao } from "../components/SessaoProvider";

export default function useParametrosServicos() {
  const { usuario } = useSessao();
  const chave = `${usuario?.email}|${usuario?.unidadeId}`;
  const [estado, setEstado] = useState({ chave: "", predefinida: false, erro: false });
  const [tentativa, setTentativa] = useState(0);
  const recarregar = useCallback(() => setTentativa(n => n + 1), []);
  useEffect(() => {
    const abort = new AbortController(); let revisao = 0;
    async function carregar() {
      const atual = ++revisao;
      try {
        const { data } = await api.get("/parametros-sistema/servicos", { signal: abort.signal });
        if (!abort.signal.aborted && atual === revisao) setEstado({ chave, predefinida: data.servicosDuracaoPredefinida === true, erro: false });
      } catch { if (!abort.signal.aborted && atual === revisao) setEstado({ chave, predefinida: false, erro: true }); }
    }
    carregar(); window.addEventListener("focus", carregar); window.addEventListener("workflowAtualizado", carregar);
    return () => { abort.abort(); window.removeEventListener("focus", carregar); window.removeEventListener("workflowAtualizado", carregar); };
  }, [chave, tentativa]);
  return { predefinida: estado.chave === chave && estado.predefinida, carregando: estado.chave !== chave, erro: estado.chave === chave && estado.erro, recarregar };
}

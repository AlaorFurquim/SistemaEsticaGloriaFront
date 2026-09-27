import { useEffect, useState } from "react";
import api from "../api";

export default function useMinhasComissoes(dataReferencia) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let ativo = true;
    let consulta;
    setDados(null);
    async function carregar() {
      consulta?.abort();
      const atual = new AbortController();
      consulta = atual;
      setCarregando(true);
      setErro("");
      try {
        const res = await api.get("/minhas-comissoes", { params: dataReferencia ? { dataReferencia } : {}, signal: atual.signal });
        if (ativo && !atual.signal.aborted) setDados(res.data);
      } catch (error) {
        if (ativo && !atual.signal.aborted) setErro(typeof error.response?.data === "string" ? error.response.data : "Não foi possível carregar suas comissões.");
      } finally {
        if (ativo && !atual.signal.aborted) setCarregando(false);
      }
    }
    carregar();
    window.addEventListener("focus", carregar);
    window.addEventListener("comissoesAtualizadas", carregar);
    return () => { ativo = false; consulta?.abort(); window.removeEventListener("focus", carregar); window.removeEventListener("comissoesAtualizadas", carregar); };
  }, [dataReferencia, versao]);
  return { dados, erro, carregando, atualizar: () => setVersao(v => v + 1) };
}

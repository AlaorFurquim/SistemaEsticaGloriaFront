import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { definirUnidadeDaTela } from "../api";
import { limparSessaoPreservandoAparencia } from "../utils/branding";

const SessaoContext = createContext(null);

function lerToken() {
  const token = localStorage.getItem("token");
  if (!token) return {};
  try {
    const parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(parte).split("").map(c => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
  } catch {
    return {};
  }
}

function lerSessaoLocal() {
  if (!localStorage.getItem("token")) return null;
  const claims = lerToken();
  const unidadeId = Number(claims.unidadeId || localStorage.getItem("unidadeId")) || null;
  return {
    nome: localStorage.getItem("nome") || "",
    email: localStorage.getItem("email") || "",
    perfil: localStorage.getItem("perfil") || "",
    unidadeId,
    unidadeOrigemId: Number(claims.unidadeOrigemId) || unidadeId,
    unidade: localStorage.getItem("unidade") || "Unidade principal",
    gerenciaUnidades: claims.gerenciaUnidades === "1"
  };
}

export function SessaoProvider({ children }) {
  const [usuario, setUsuario] = useState(lerSessaoLocal);

  const atualizar = useCallback(async data => {
    if (!data) {
      definirUnidadeDaTela(undefined);
      setUsuario(null);
      return;
    }
    if (data.token) localStorage.setItem("token", data.token);
    for (const key of ["nome", "email", "perfil", "unidadeId", "unidade"]) {
      if (data[key] != null) localStorage.setItem(key, String(data[key]));
    }
    const sessao = { ...lerSessaoLocal(), ...data };
    definirUnidadeDaTela(sessao.unidadeId);
    setUsuario(sessao);
  }, []);

  const verificar = useCallback(async () => {
    const sessao = lerSessaoLocal();
    definirUnidadeDaTela(sessao?.unidadeId);
    setUsuario(sessao);
    return sessao;
  }, []);

  const sair = useCallback(async () => {
    limparSessaoPreservandoAparencia();
    definirUnidadeDaTela(undefined);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, carregando: false, erro: false, atualizar, verificar, sair }), [usuario, atualizar, verificar, sair]);
  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const sessao = useContext(SessaoContext);
  if (!sessao) throw new Error("useSessao deve ser usado dentro de SessaoProvider.");
  return sessao;
}

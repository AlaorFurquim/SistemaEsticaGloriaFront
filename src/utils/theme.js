import api from "../api";
import { useEffect, useState } from "react";

const TEMA_PADRAO = {
  id: null,
  nome: "Lap Beauty",
  corPrimaria: "#6b1836",
  corPrimariaEscura: "#3f1222",
  corMenu: "#4a1729",
  corBotoes: "#6b1836",
  corDestaque: "#c9a95d",
  logoUrl: null,
  imagemCapaUrl: null
};

let urlsTemporarias = [];

export function obterIniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
  return partes.slice(0, 2).map((parte) => parte[0].toUpperCase()).join("") || "LB";
}

function obterLogoLegado(tema) {
  return Number(tema?.id) === 1 ? "/logo-gloria.jpeg" : null;
}

export function obterTemaSalvo() {
  try {
    return { ...TEMA_PADRAO, ...JSON.parse(localStorage.getItem("tenantTema") || "{}") };
  } catch {
    return TEMA_PADRAO;
  }
}

export function aplicarTemaBase(temaRecebido, salvar = true) {
  const tema = { ...TEMA_PADRAO, ...(temaRecebido || {}) };
  const raiz = document.documentElement;
  raiz.style.setProperty("--primary", tema.corPrimaria);
  raiz.style.setProperty("--primary-dark", tema.corPrimariaEscura);
  raiz.style.setProperty("--sidebar", tema.corMenu);
  raiz.style.setProperty("--button", tema.corBotoes);
  raiz.style.setProperty("--accent", tema.corDestaque);
  document.title = tema.nome || "Plataforma de Gestao";
  if (salvar) localStorage.setItem("tenantTema", JSON.stringify(tema));
  return tema;
}

async function baixarImagem(url) {
  if (!url) return null;
  const resposta = await api.get(url, { responseType: "blob" });
  const objectUrl = URL.createObjectURL(resposta.data);
  urlsTemporarias.push(objectUrl);
  return objectUrl;
}

export async function aplicarTemaCompleto(temaRecebido) {
  const tema = aplicarTemaBase(temaRecebido);
  urlsTemporarias.forEach((url) => URL.revokeObjectURL(url));
  urlsTemporarias = [];

  const [logoExibicao, capaExibicao] = await Promise.all([
    baixarImagem(tema.logoUrl).catch(() => null),
    baixarImagem(tema.imagemCapaUrl).catch(() => null)
  ]);

  const temaCompleto = {
    ...tema,
    logoExibicao: logoExibicao || obterLogoLegado(tema),
    capaExibicao
  };

  if (capaExibicao) {
    document.documentElement.style.setProperty("--login-cover", `url("${capaExibicao}")`);
  } else {
    document.documentElement.style.removeProperty("--login-cover");
  }

  window.dispatchEvent(new CustomEvent("tenant-theme-changed", { detail: temaCompleto }));
  return temaCompleto;
}

export function limparTema() {
  urlsTemporarias.forEach((url) => URL.revokeObjectURL(url));
  urlsTemporarias = [];
  localStorage.removeItem("tenantTema");
  aplicarTemaBase(TEMA_PADRAO, false);
  document.documentElement.style.removeProperty("--login-cover");
}

export function useTenantTheme() {
  const temaSalvo = obterTemaSalvo();
  const [tema, setTema] = useState({ ...temaSalvo, logoExibicao: obterLogoLegado(temaSalvo) });

  useEffect(() => {
    const atualizar = (evento) => setTema(evento.detail);
    window.addEventListener("tenant-theme-changed", atualizar);
    return () => window.removeEventListener("tenant-theme-changed", atualizar);
  }, []);

  return tema;
}

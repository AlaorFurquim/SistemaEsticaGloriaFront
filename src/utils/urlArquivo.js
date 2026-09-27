import api from "../api";

export function urlArquivo(caminho) {
  if (!caminho) return "";
  if (/^(data:|blob:|https?:)/i.test(caminho)) return caminho;

  const base = String(api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return base + (caminho.startsWith("/") ? "" : "/") + caminho;
}

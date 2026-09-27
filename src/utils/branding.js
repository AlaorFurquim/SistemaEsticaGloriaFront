const CHAVES_AUTH = ["token", "nome", "email", "perfil", "unidadeId", "unidade"];
export const brandingPadrao = Object.freeze({
  nomeEmpresa: "Lap Care ERP", subtituloEmpresa: "Gestão para clínicas de estética e beleza",
  logoImagem: "", loginImagem: "", tema: "claro", empresaId: null, codigoPublico: null, configurada: false
});
// Company assets come from the authenticated API, never a shared browser cache.
let brandingAtual = { ...brandingPadrao };
export const obterBranding = () => ({ ...brandingAtual });
export function salvarBranding(configuracao) {
  const recebida = { ...configuracao };
  if (recebida.subtituloEmpresa === "Sistema para salões e barbearias") {
    recebida.subtituloEmpresa = brandingPadrao.subtituloEmpresa;
  }
  brandingAtual = { ...brandingPadrao, ...recebida };
  aplicarTema(brandingAtual.tema);
  window.dispatchEvent(new Event("brandingAtualizado"));
  return obterBranding();
}
// Legacy settings are offered for explicit review/import by an administrator.
export function obterBrandingLegado() {
  try {
    const salvo = JSON.parse(localStorage.getItem("lapBeautyBranding") || "null");
    return salvo && (salvo.logoImagem || salvo.loginImagem || salvo.nomeEmpresa && salvo.nomeEmpresa !== brandingPadrao.nomeEmpresa)
      ? { ...brandingPadrao, nomeEmpresa: salvo.nomeEmpresa || brandingPadrao.nomeEmpresa,
        subtituloEmpresa: salvo.subtituloEmpresa || brandingPadrao.subtituloEmpresa,
        logoImagem: salvo.logoImagem || "", loginImagem: salvo.loginImagem || "", tema: salvo.tema === "escuro" ? "escuro" : "claro" } : null;
  } catch { return null; }
}
export function aplicarTema(tema = brandingAtual.tema) {
  document.documentElement.setAttribute("data-theme", tema === "escuro" ? "escuro" : "claro");
}
export function limparSessaoPreservandoAparencia() {
  CHAVES_AUTH.forEach(chave => localStorage.removeItem(chave));
  salvarBranding(brandingPadrao);
}
export function iniciaisEmpresa(nomeEmpresa = brandingPadrao.nomeEmpresa) {
  const partes = String(nomeEmpresa || "")
    .replace(/ERP/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return partes.map(parte => parte[0]).join("").toUpperCase() || "LC";
}

export async function prepararImagemBranding(src) {
  if (!src) return "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(src) || src.length > 14_000_000)
    throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 10 MB.");
  const imagem = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível abrir a imagem.")); img.src = src;
  });
  if (imagem.width * imagem.height > 40_000_000) throw new Error("Escolha uma imagem de até 40 megapixels.");
  const escala = Math.min(1, 1024 / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagem.width * escala)); canvas.height = Math.max(1, Math.round(imagem.height * escala));
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  const foto = canvas.toDataURL("image/jpeg", .8);
  if (foto.length > 700000) throw new Error("A imagem ficou muito grande. Escolha uma imagem menor.");
  return foto;
}

import { iniciaisEmpresa } from "./branding";
export const escaparHtml = texto => String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function marcaImpressao(branding) {
  const nome = escaparHtml(branding.nomeEmpresa), subtitulo = escaparHtml(branding.subtituloEmpresa);
  const logo = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(branding.logoImagem || "") ? `<img src="${escaparHtml(branding.logoImagem)}" alt="Logo de ${nome}" style="max-width:100px;max-height:72px;object-fit:contain"/>` : `<strong style="padding:15px;background:#6f4cff;color:white;border-radius:8px">${escaparHtml(iniciaisEmpresa(branding.nomeEmpresa))}</strong>`;
  return `<div style="display:flex;align-items:center;gap:18px">${logo}<div><h1 style="overflow-wrap:anywhere">${nome}</h1>${subtitulo ? `<p>${subtitulo}</p>` : ""}</div></div>`;
}

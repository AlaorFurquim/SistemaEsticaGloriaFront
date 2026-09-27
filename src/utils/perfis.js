export const perfilIndividual = perfil => ["Barbeiro", "Profissional"].includes(perfil);

export function rotaInicial(perfil) {
  if (perfil === "Administrador") return "/";
  if (perfil === "Administrador Plataforma") return "/administracao";
  if (perfil === "Estoque") return "/produtos";
  if (perfil === "Operador PDV") return "/pdv";
  if (["Gerente", "Atendente", "Agenda", "Barbeiro", "Profissional"].includes(perfil)) return "/agenda";
  return "/sem-permissao";
}

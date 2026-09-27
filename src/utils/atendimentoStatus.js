// Etapas antigas continuam legíveis sem exigir confirmação, chegada ou início.
export function atendimentoEncerrado(status) {
  return ["Concluido", "Cancelado", "NoShow"].includes(status);
}

export function statusAtendimento(status, encaixe = false) {
  if (status === "Concluido") return { label: "Concluído", cor: "#16a34a", badge: "bg-success" };
  if (status === "Cancelado" || status === "NoShow") return { label: "Cancelado", cor: "#dc2626", badge: "bg-danger" };
  if (status === "Bloqueado" || status === "BLOQUEIO") return { label: "Bloqueado", cor: "#6b7280", badge: "bg-secondary" };
  if (encaixe) return { label: "Encaixe", cor: "#eab308", badge: "bg-warning text-dark" };
  return { label: "Agendado", cor: "#64748b", badge: "bg-secondary" };
}

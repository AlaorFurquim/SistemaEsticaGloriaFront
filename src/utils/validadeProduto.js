// Validade é uma data de calendário, sem conversão de fuso horário.
export function dataValidade(valor) {
  return typeof valor === "string" ? valor.slice(0, 10) : "";
}

export function situacaoValidade(valor, hoje = new Date()) {
  const data = dataValidade(valor);
  if (!data) return { data: "Não informada", dias: null, texto: "", classe: "" };
  const [ano, mes, dia] = data.split("-").map(Number);
  const dias = Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
  const formatada = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
  if (dias < 0) return { data: formatada, dias, texto: "Vencido", classe: "bg-danger" };
  if (dias === 0) return { data: formatada, dias, texto: "Vence hoje", classe: "bg-warning text-dark" };
  if (dias <= 30) return { data: formatada, dias, texto: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, classe: "bg-warning text-dark" };
  return { data: formatada, dias, texto: "No prazo", classe: "bg-success" };
}

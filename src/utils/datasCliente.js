// Birth dates are calendar dates, not UTC instants.
export const dataNascimentoCampo = valor => typeof valor === "string" ? valor.slice(0, 10) : "";
export const formatarNascimento = valor => valor ? dataNascimentoCampo(valor).split("-").reverse().join("/") : "—";
export function hojeCalendario() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}
export function aniversarioHoje(valor, hoje = hojeCalendario()) {
  return Boolean(valor) && dataNascimentoCampo(valor).slice(5) === hoje.slice(5);
}

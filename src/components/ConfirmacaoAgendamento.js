export function textoConfirmacao(origem) {
  return origem === "OPERADOR" ? "Confirmado pelo operador" : origem === "CLIENTE" ? "Confirmado pelo cliente" : "Confirmado";
}
export default function ConfirmacaoAgendamento({ status, origem }) {
  if (status !== "Confirmado") return null;
  return <span className="agenda-confirmacao" title={textoConfirmacao(origem)}>✓ {textoConfirmacao(origem)}</span>;
}

import { formatarMoeda, moedaParaNumero } from "../utils/masks";

export default function MoneyInput({ value, onChange, onValueChange, className = "form-control", ...props }) {
  const numero = moedaParaNumero(value);

  function alterar(e) {
    const novoValor = moedaParaNumero(e.target.value);
    if (onValueChange) onValueChange(novoValor);
    if (onChange) onChange(novoValor);
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={className}
      value={formatarMoeda(numero)}
      onChange={alterar}
    />
  );
}

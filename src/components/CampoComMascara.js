import { mascaraCpfCnpj, mascaraTelefone } from "../utils/masks";

// Formata também valores antigos vindos da API, sem exigir que o usuário os redigite.
export default function CampoComMascara({ mascara, value, onChange, onKeyDown, ...props }) {
  if (!mascara) return <input {...props} value={value} onChange={onChange} onKeyDown={onKeyDown} />;
  const telefone = mascara === "telefone";
  const formatar = telefone ? mascaraTelefone : mascaraCpfCnpj;
  return <input type={telefone ? "tel" : "text"} inputMode={telefone ? "tel" : "numeric"}
    autoComplete={telefone ? "tel" : "off"} placeholder={telefone ? "(00) 00000-0000" : "CPF ou CNPJ"}
    {...props} value={formatar(value)}
    onKeyDown={e => {
      onKeyDown?.(e);
      const el = e.currentTarget, pos = el.selectionStart;
      if (e.defaultPrevented || props.readOnly || pos == null || pos !== el.selectionEnd) return;
      // Apagar junto à pontuação remove o dígito adjacente, sem prender o cursor.
      if (e.key === "Backspace" && pos > 0 && /\D/.test(el.value[pos - 1])) {
        let inicio = pos - 1;
        while (inicio > 0 && /\D/.test(el.value[inicio])) inicio--;
        el.setSelectionRange(inicio, pos);
      } else if (e.key === "Delete" && pos < el.value.length && /\D/.test(el.value[pos])) {
        let fim = pos;
        while (fim < el.value.length && /\D/.test(el.value[fim])) fim++;
        el.setSelectionRange(pos, Math.min(fim + 1, el.value.length));
      }
    }}
    onChange={e => {
      const el = e.target, original = el.value, pos = el.selectionStart ?? original.length;
      let digitos = original.slice(0, pos).replace(/\D/g, "").length;
      const numeros = original.replace(/\D/g, "");
      if (telefone && [12, 13].includes(numeros.length) && numeros.startsWith("55")) digitos = Math.max(0, digitos - 2);
      const texto = formatar(original);
      let cursor = 0, contagem = 0;
      while (cursor < texto.length && contagem < digitos) { if (/\d/.test(texto[cursor])) contagem++; cursor++; }
      if (pos === original.length) cursor = texto.length;
      el.value = texto;
      onChange?.(e);
      requestAnimationFrame(() => {
        if (document.activeElement === el && el.value === texto) el.setSelectionRange(cursor, cursor);
      });
    }} />;
}

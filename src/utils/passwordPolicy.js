// Keep in sync with ProtecaoCredenciaisService.ValidarNovaSenha (UTF-8 / BCrypt).
export const requisitosSenha = (senha = "") => ({
  tamanho: senha.length >= 12,
  limite: new TextEncoder().encode(senha).length <= 72,
  conteudo: Boolean(senha.trim())
});

export function validarNovaSenha(senha, opcional = false) {
  if (opcional && senha === "") return "";
  const regras = requisitosSenha(senha);
  if (!regras.conteudo) return "Informe uma senha que não seja apenas espaços.";
  if (!regras.tamanho) return "Use pelo menos 12 caracteres.";
  if (!regras.limite) return "A senha está muito longa. Reduza um pouco o tamanho.";
  return "";
}

let avaliador;
export async function estimarForca(senha) {
  if (!avaliador) {
    avaliador = Promise.all([
      import('@zxcvbn-ts/core'), import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'), import('@zxcvbn-ts/language-pt-br')
    ]).then(([core, comum, ingles, portugues]) => new core.ZxcvbnFactory({
      graphs: comum.adjacencyGraphs,
      dictionary: { ...comum.dictionary, ...ingles.dictionary, ...portugues.dictionary },
      translations: portugues.translations
    })).catch(error => { avaliador = undefined; throw error; });
  }
  const resultado = (await avaliador).check(senha);
  // Return only feedback, never retain the password or matched substrings.
  return { score: resultado.score, dica: resultado.feedback.warning || resultado.feedback.suggestions[0] || "Use uma senha exclusiva, que você não utiliza em outros serviços." };
}

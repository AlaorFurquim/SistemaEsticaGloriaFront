export const SUPORTE_WHATSAPP = "5565981228680";

export function linkSuporteWhatsApp(mensagem = "Ola! Preciso de ajuda com a plataforma Lap Beauty.") {
  return `https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

export function linkLiberacaoWhatsApp(dados) {
  return linkSuporteWhatsApp([
    "Ola! Acabei de cadastrar uma empresa na plataforma Lap Beauty e gostaria de solicitar a liberacao do acesso.",
    "",
    `Empresa: ${dados.nomeEmpresa}`,
    `Responsavel: ${dados.nomeResponsavel}`,
    `E-mail: ${dados.email}`,
    `Telefone: ${dados.telefone}`
  ].join("\n"));
}

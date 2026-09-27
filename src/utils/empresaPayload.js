// Send editable values only. Detail responses also contain cyclic EF navigation graphs.
const camposEmpresa = [
  "nome", "documento", "telefone", "email", "responsavelNome", "responsavelEmail",
  "statusAssinatura", "testeGratisAte", "cobrancaAtiva", "valorMensalidade", "valorUnidadeAdicional",
  "valorMensalidadeTabela", "valorMensalidadePromocional", "valorMensalidadeOfertaRelampago",
  "ofertaRelampagoId", "ofertaRelampagoAceita", "ofertaRelampagoEmitidaEm", "ofertaRelampagoExpiraEm",
  "valorBeneficioComercial", "permanenciaMeses", "multaCancelamentoPercentual", "diaVencimento",
  "contratoNumero", "contratoAceitoEm", "contratoResponsavel", "contratoTexto", "contratoHash",
  "contratoVersao", "aceitouPermanenciaMulta", "contratoAceiteIp", "contratoAceiteUserAgent",
  "chavePix", "pixBeneficiario", "pixCidade", "uf", "cidade", "codigoMunicipioIbge", "bloqueadoPorInadimplencia", "ativo"
];

export function payloadEmpresa(dados, alteracoes = {}) {
  const valores = { ...dados, ...alteracoes };
  return Object.fromEntries(camposEmpresa.filter(campo => Object.hasOwn(valores, campo)).map(campo => [campo, valores[campo]]));
}

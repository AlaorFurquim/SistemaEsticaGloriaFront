import { formatarMoeda } from "./masks";

export function telefoneWhatsApp(telefone) {
  let numero = String(telefone || "").replace(/\D/g, "");
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  if (!/^55[1-9]\d(?:[2-9]\d{7}|9\d{8})$/.test(numero)) return null;
  return numero;
}

export function mensagemOrcamento(venda, empresa) {
  const itens = (venda.itens || []).map(item =>
    `• ${item.descricao || item.produto?.nome || item.servico?.nome || "Item"}\n  ${Number(item.quantidade || 0).toLocaleString("pt-BR")} × ${formatarMoeda(item.valorUnitario || 0)} = ${formatarMoeda(item.total || 0)}`);
  return [
    `Olá${venda.cliente?.nome ? `, ${venda.cliente.nome}` : ""}!`,
    `Segue seu orçamento da ${empresa || "nossa empresa"}.`,
    `Orçamento #${venda.id}`, "", ...itens, "",
    `Subtotal: ${formatarMoeda(venda.subtotal || 0)}`,
    `Desconto: ${formatarMoeda(venda.desconto || 0)}`,
    `Total: ${formatarMoeda(venda.total || 0)}`, "",
    "Orçamento sujeito à disponibilidade de agenda, produtos e condições comerciais no momento da aprovação."
  ].join("\n");
}

export function linkOrcamentoWhatsApp(telefone, mensagem) {
  const numero = telefoneWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}

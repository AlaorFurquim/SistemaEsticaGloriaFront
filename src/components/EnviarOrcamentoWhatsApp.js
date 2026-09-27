import CampoComMascara from "./CampoComMascara";
import { useEffect, useRef, useState } from "react";
import { mascaraTelefone } from "../utils/masks";
import { linkOrcamentoWhatsApp, mensagemOrcamento } from "../utils/orcamentoWhatsApp";
import { obterBranding } from "../utils/branding";
import "./EnviarOrcamentoWhatsApp.css";

export default function EnviarOrcamentoWhatsApp({ venda, onClose }) {
  const dialogo = useRef(null);
  const [telefone, setTelefone] = useState(() => mascaraTelefone(venda.cliente?.telefone || ""));
  const [mensagem, setMensagem] = useState(() => mensagemOrcamento(venda, obterBranding().nomeEmpresa));
  const url = linkOrcamentoWhatsApp(telefone, mensagem);
  useEffect(() => { dialogo.current.showModal(); }, []);
  return <dialog ref={dialogo} className="orcamento-whatsapp" aria-labelledby="orcamento-whatsapp-titulo" onClose={onClose}>
    <h2 id="orcamento-whatsapp-titulo" className="h5">Enviar orçamento #{venda.id} pelo WhatsApp</h2>
    <p className="text-muted">Confira o número e a mensagem. O envio será confirmado por você no WhatsApp.</p>
    <label htmlFor="orcamento-whatsapp-telefone">WhatsApp com DDD</label>
    <CampoComMascara mascara="telefone" id="orcamento-whatsapp-telefone" className="form-control mb-2" type="tel" value={telefone} onChange={e => setTelefone(mascaraTelefone(e.target.value))} placeholder="(65) 99999-9999" autoFocus />
    {!url && <p className="small text-danger" role="status">Informe um telefone válido com DDD.</p>}
    <label htmlFor="orcamento-whatsapp-mensagem">Mensagem do orçamento</label>
    <textarea id="orcamento-whatsapp-mensagem" className="form-control" rows="11" value={mensagem} onChange={e => setMensagem(e.target.value)} />
    <div className="d-flex justify-content-end flex-wrap gap-2 mt-3">
      <button type="button" className="btn btn-outline-secondary" onClick={() => dialogo.current.close()}>Fechar</button>
      <button type="button" className="btn btn-success" disabled={!url || !mensagem.trim()} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Abrir WhatsApp</button>
    </div>
  </dialog>;
}

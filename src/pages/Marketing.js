import { mascaraTelefone } from "../utils/masks";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { aniversarioHoje, formatarNascimento } from "../utils/datasCliente";
import { alertaErro, alertaSucesso } from "../utils/alerts";

function primeiroContato(cliente) {
  return mascaraTelefone(cliente.telefone) || cliente.email || "Sem contato";
}

export default function Marketing() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    try {
      const res = await api.get("/clientes");
      setClientes(res.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os dados de marketing.");
    }
  }

  function copiarMensagem(cliente, tipo) {
    const nome = cliente.nome?.split(" ")[0] || cliente.nome || "cliente";
    const mensagens = {
      aniversario: `Olá, ${nome}! Feliz aniversário 🎉 A equipe preparou um carinho especial para você. Quando quiser, fale conosco para agendar seu horário.`,
      retorno: `Olá, ${nome}! Passando para lembrar que já está na hora de cuidar de você novamente. Quer que eu veja um horário disponível?`,
      inativo: `Olá, ${nome}! Sentimos sua falta por aqui. Podemos te ajudar a marcar um novo atendimento?`
    };

    navigator.clipboard?.writeText(mensagens[tipo] || mensagens.retorno);
    alertaSucesso("Mensagem copiada. Agora é só enviar pelo WhatsApp, SMS ou e-mail.");
  }

  useEffect(() => {
    carregar();
  }, []);

  const clientesComComunicacao = useMemo(
    () => clientes.filter(x => x.permiteComunicacao && (x.telefone || x.email)),
    [clientes]
  );

  const aniversariantes = useMemo(
    () => clientesComComunicacao.filter(x => aniversarioHoje(x.dataNascimento)),
    [clientesComComunicacao]
  );

  const semLgpd = useMemo(
    () => clientes.filter(x => !x.consentimentoLgpd),
    [clientes]
  );

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientesComComunicacao;
    return clientesComComunicacao.filter(x =>
      String(x.nome || "").toLowerCase().includes(termo) ||
      String(x.telefone || "").toLowerCase().includes(termo) ||
      String(x.email || "").toLowerCase().includes(termo)
    );
  }, [busca, clientesComComunicacao]);

  return (
    <div className="marketing-page">
      <PageHeader
        title="Marketing e retornos"
        subtitle="Ações simples para aniversário, relacionamento, comunicação autorizada e retorno de clientes."
      >
        <button type="button" className="btn btn-outline-secondary" onClick={carregar}>
          Atualizar
        </button>
      </PageHeader>

      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="metric-card"><span>Clientes ativos</span><strong>{clientes.length}</strong></div></div>
        <div className="col-md-3"><div className="metric-card"><span>Podem receber contato</span><strong>{clientesComComunicacao.length}</strong></div></div>
        <div className="col-md-3"><div className="metric-card"><span>Aniversários hoje</span><strong>{aniversariantes.length}</strong></div></div>
        <div className="col-md-3"><div className="metric-card danger"><span>LGPD pendente</span><strong>{semLgpd.length}</strong></div></div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="section-title">
              <div>
                <h5>Aniversariantes de hoje</h5>
                <p>Clientes com comunicação autorizada e data de nascimento no dia atual.</p>
              </div>
            </div>

            {aniversariantes.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum aniversário hoje</strong>
                <span>Quando houver, o cliente aparece aqui para contato rápido.</span>
              </div>
            ) : aniversariantes.map(cliente => (
              <div className="indicator-line" key={cliente.id}>
                <div>
                  <strong>{cliente.nome}</strong>
                  <span>{primeiroContato(cliente)}</span>
                </div>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => copiarMensagem(cliente, "aniversario")}>
                  Copiar mensagem
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel h-100">
            <div className="section-title">
              <div>
                <h5>Pendências de comunicação</h5>
                <p>Clientes sem consentimento LGPD precisam regularizar antes de campanhas.</p>
              </div>
            </div>

            {semLgpd.slice(0, 6).map(cliente => (
              <div className="indicator-line" key={cliente.id}>
                <div>
                  <strong>{cliente.nome}</strong>
                  <span>{primeiroContato(cliente)}</span>
                </div>
                <span className="badge bg-warning text-dark">LGPD pendente</span>
              </div>
            ))}

            {!semLgpd.length && (
              <div className="empty-state">
                <strong>Tudo certo</strong>
                <span>Não há pendência de LGPD nos clientes ativos.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-title">
          <div>
            <h5>Base para campanhas e retornos</h5>
            <p>Clientes com permissão de comunicação. Use a mensagem rápida para WhatsApp, SMS ou e-mail.</p>
          </div>
          <div className="table-toolbar m-0">
            <input className="form-control" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>

        <div className="table-responsive">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Aniversário</th>
              <th>LGPD</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(cliente => (
              <tr key={cliente.id}>
                <td>{cliente.nome}</td>
                <td>{primeiroContato(cliente)}</td>
                <td>{formatarNascimento(cliente.dataNascimento)}</td>
                <td>{cliente.consentimentoLgpd ? <span className="badge bg-success">OK</span> : <span className="badge bg-warning text-dark">Pendente</span>}</td>
                <td className="actions">
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => copiarMensagem(cliente, "retorno")}>Retorno</button>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => copiarMensagem(cliente, "inativo")}>Inativo</button>
                </td>
              </tr>
            ))}
            {!clientesFiltrados.length && (
              <tr><td colSpan="5" className="text-center text-muted py-4">Nenhum cliente liberado para comunicação.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import MoneyInput from "../components/MoneyInput";
import { formatarMoeda, mascaraTelefone } from "../utils/masks";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";

const programaInicial = { nome: "", valorPorPonto: 1, percentualCashback: 0, ativo: true };
const voucherInicial = { clienteId: "", tipo: "VOUCHER", valor: 0, validade: "", observacao: "" };
const pacoteInicial = { nome: "", servicoId: "", quantidadeSessoes: 1, valor: 0, validadeDias: 90 };
const vendaPacoteInicial = { clienteId: "", pacoteServicoId: "", valorPago: "" };

export default function Fidelidade() {
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [solicitacoesPacotes, setSolicitacoesPacotes] = useState([]);
  const [pacotesClientesAtivos, setPacotesClientesAtivos] = useState([]);
  const [programa, setPrograma] = useState(programaInicial);
  const [voucher, setVoucher] = useState(voucherInicial);
  const [pacote, setPacote] = useState(pacoteInicial);
  const [vendaPacote, setVendaPacote] = useState(vendaPacoteInicial);
  const [clienteSaldoId, setClienteSaldoId] = useState("");
  const [saldo, setSaldo] = useState(null);
  const [aprovandoId, setAprovandoId] = useState(null);
  const aprovacaoEmCurso = useRef(false);

  async function aprovarPlano(solicitacao) {
    if (aprovacaoEmCurso.current) return;
    aprovacaoEmCurso.current = true; setAprovandoId(solicitacao.id);
    try {
      const confirmou = await confirmarAcao("Aprovar plano?", `Liberar ${solicitacao.pacote?.nome || "o plano"} para ${solicitacao.cliente?.nome || "o cliente"}? A validade começa hoje. Esta ação não registra pagamento no caixa.`);
      if (!confirmou) return;
      await api.post(`/fidelidade/pacotes/solicitacoes/${solicitacao.id}/aprovar`);
      await carregar();
      if (clienteSaldoId) {
        const { data } = await api.get(`/fidelidade/clientes/${clienteSaldoId}/saldo`); setSaldo(data);
      }
      await alertaSucesso("Plano aprovado e sessões liberadas para o cliente.");
    } catch (error) { alertaErro(error.response?.data || "Não foi possível aprovar o plano."); }
    finally { aprovacaoEmCurso.current = false; setAprovandoId(null); }
  }

  async function carregar() {
    try {
      const [clientesRes, servicosRes, programasRes, vouchersRes, pacotesRes, solicitacoesRes, ativosRes] = await Promise.all([
        api.get("/clientes"),
        api.get("/servicos"),
        api.get("/fidelidade/programas"),
        api.get("/fidelidade/vouchers"),
        api.get("/fidelidade/pacotes"),
        api.get("/fidelidade/pacotes/solicitacoes"),
        api.get("/fidelidade/pacotes/clientes-ativos")
      ]);
      setClientes(clientesRes.data);
      setServicos(servicosRes.data);
      setProgramas(programasRes.data);
      setVouchers(vouchersRes.data);
      setPacotes(pacotesRes.data);
      setSolicitacoesPacotes(solicitacoesRes.data || []);
      setPacotesClientesAtivos(ativosRes.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar fidelidade.");
    }
  }

  async function salvarPrograma(e) {
    e.preventDefault();
    try {
      await api.post("/fidelidade/programas", {
        ...programa,
        valorPorPonto: Number(programa.valorPorPonto || 1),
        percentualCashback: Number(programa.percentualCashback || 0)
      });
      setPrograma(programaInicial);
      await carregar();
      await alertaSucesso("Programa de fidelidade salvo.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível salvar o programa.");
    }
  }

  async function criarVoucher(e) {
    e.preventDefault();
    try {
      await api.post("/fidelidade/vouchers", {
        clienteId: voucher.clienteId ? Number(voucher.clienteId) : null,
        tipo: voucher.tipo,
        valor: Number(voucher.valor || 0),
        validade: voucher.validade || null,
        observacao: voucher.observacao
      });
      setVoucher(voucherInicial);
      await carregar();
      await alertaSucesso("Voucher/gift card criado.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível criar o voucher.");
    }
  }

  async function criarPacote(e) {
    e.preventDefault();
    try {
      await api.post("/fidelidade/pacotes", {
        ...pacote,
        servicoId: Number(pacote.servicoId),
        quantidadeSessoes: Number(pacote.quantidadeSessoes || 1),
        valor: Number(pacote.valor || 0),
        validadeDias: Number(pacote.validadeDias || 90)
      });
      setPacote(pacoteInicial);
      await carregar();
      await alertaSucesso("Pacote criado.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível criar o pacote.");
    }
  }

  async function venderPacote(e) {
    e.preventDefault();
    try {
      await api.post("/fidelidade/pacotes/vender", {
        clienteId: Number(vendaPacote.clienteId),
        pacoteServicoId: Number(vendaPacote.pacoteServicoId),
        valorPago: vendaPacote.valorPago ? Number(vendaPacote.valorPago) : null
      });
      setVendaPacote(vendaPacoteInicial);
      await alertaSucesso("Pacote vinculado ao cliente.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível vender o pacote.");
    }
  }

  async function buscarSaldo(e) {
    e.preventDefault();
    if (!clienteSaldoId) return;
    try {
      const res = await api.get(`/fidelidade/clientes/${clienteSaldoId}/saldo`);
      setSaldo(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível consultar o saldo.");
    }
  }

  useEffect(() => { carregar(); }, []);

  const programaAtivo = programas.find(x => x.ativo);
  const data = valor => valor ? new Date(valor).toLocaleDateString("pt-BR") : "-";

  return (
    <div>
      <PageHeader title="Fidelidade" subtitle="Pontos, cashback, vouchers, gift cards e pacotes">
        <button type="button" className="btn btn-outline-primary" onClick={() => document.getElementById("solicitacoes-planos")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Solicitações de planos ({solicitacoesPacotes.length})</button>
        <button type="button" className="btn btn-outline-secondary" onClick={carregar} disabled={aprovandoId !== null}>Atualizar</button>
      </PageHeader>

      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="metric-card"><span>Programa ativo</span><strong>{programaAtivo?.nome || "Nenhum"}</strong></div></div>
        <div className="col-md-4"><div className="metric-card"><span>Vouchers ativos</span><strong>{vouchers.filter(x => x.status === "ATIVO").length}</strong></div></div>
        <div className="col-md-4"><div className="metric-card"><span>Pacotes ativos</span><strong>{pacotes.length}</strong></div></div>
      </div>

      <div className="panel mb-3">
        <div className="section-title">
          <div>
            <h5>Aba pública de planos</h5>
            <p>Link para o cliente final escolher a empresa/unidade e solicitar um pacote.</p>
          </div>
          <a className="btn btn-outline-primary" href="/planos" target="_blank" rel="noreferrer">Abrir página pública</a>
        </div>
        <div className="operation-hint">
          Compartilhe o link <strong>{window.location.origin}/planos</strong>. As solicitações entram abaixo como pendentes para confirmação de pagamento/liberação.
        </div>
      </div>

      <div className="panel mb-3">
        <div className="section-title">
          <div>
            <h5>Planos/pacotes ativos da empresa</h5>
            <p>Esses são os planos que a empresa tem disponíveis para vender e exibir na página pública.</p>
          </div>
          <strong>{pacotes.length} ativo(s)</strong>
        </div>

        <div className="company-plans-grid">
          {pacotes.map(plano => (
            <article key={plano.id} className="company-plan-card">
              <span>{plano.servico?.nome || "Plano da empresa"}</span>
              <strong>{plano.nome}</strong>
              <b>{formatarMoeda(plano.valor)}</b>
              <small>{plano.quantidadeSessoes} sessão(ões) • validade {plano.validadeDias} dia(s)</small>
            </article>
          ))}
          {pacotes.length === 0 && (
            <div className="operation-hint">
              Nenhum plano ativo cadastrado. Crie um pacote no formulário “Pacote de serviço”.
            </div>
          )}
        </div>
      </div>

      <div className="panel mb-3">
        <div className="section-title">
          <div>
            <h5>Clientes com planos ativos</h5>
            <p>Controle de clientes que já possuem pacote/plano liberado para uso no PDV.</p>
          </div>
          <strong>{pacotesClientesAtivos.length} cliente(s)</strong>
        </div>

        <table className="table professional-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Plano</th>
              <th>Sessões</th>
              <th>Validade</th>
              <th>Valor pago</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pacotesClientesAtivos.map(x => (
              <tr key={x.id}>
                <td>{x.cliente?.nome || "-"}</td>
                <td>{mascaraTelefone(x.cliente?.telefone) || x.cliente?.email || "-"}</td>
                <td>{x.pacote?.nome || "-"} {x.pacote?.servico ? `• ${x.pacote.servico}` : ""}</td>
                <td>{x.sessoesDisponiveis} de {x.sessoesContratadas}</td>
                <td>{data(x.validade)}</td>
                <td>{formatarMoeda(x.valorPago || 0)}</td>
                <td><span className="badge bg-success">Ativo</span></td>
              </tr>
            ))}
            {pacotesClientesAtivos.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  Nenhum cliente com plano ativo no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={salvarPrograma}>
            <h5>Programa de pontos/cashback</h5>
            <div className="row g-2">
              <div className="col-md-5"><label>Nome</label><input className="form-control" value={programa.nome} onChange={e => setPrograma({ ...programa, nome: e.target.value })} required /></div>
              <div className="col-md-3"><label>R$ por ponto</label><MoneyInput value={programa.valorPorPonto} onValueChange={valorPorPonto => setPrograma({ ...programa, valorPorPonto })} /></div>
              <div className="col-md-2"><label>Cashback %</label><input type="number" step="0.01" min="0" className="form-control" value={programa.percentualCashback} onChange={e => setPrograma({ ...programa, percentualCashback: e.target.value })} /></div>
              <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
            </div>
          </form>
        </div>

        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={buscarSaldo}>
            <h5>Saldo do cliente</h5>
            <div className="row g-2">
              <div className="col-md-9"><label>Cliente</label><select className="form-select" value={clienteSaldoId} onChange={e => setClienteSaldoId(e.target.value)}><option value="">Selecione</option>{clientes.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
              <div className="col-md-3 d-flex align-items-end"><button className="btn btn-outline-primary w-100">Consultar</button></div>
            </div>
            {saldo && <div className="row g-2 mt-3"><div className="col-md-6"><div className="metric-card"><span>Pontos</span><strong>{saldo.pontosFidelidade}</strong></div></div><div className="col-md-6"><div className="metric-card"><span>Cashback</span><strong>{formatarMoeda(saldo.saldoCashback)}</strong></div></div></div>}
          </form>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={criarVoucher}>
            <h5>Voucher / Gift card</h5>
            <div className="row g-2">
              <div className="col-md-4"><label>Tipo</label><select className="form-select" value={voucher.tipo} onChange={e => setVoucher({ ...voucher, tipo: e.target.value })}><option>VOUCHER</option><option>GIFT_CARD</option><option>INDICACAO</option></select></div>
              <div className="col-md-4"><label>Cliente</label><select className="form-select" value={voucher.clienteId} onChange={e => setVoucher({ ...voucher, clienteId: e.target.value })}><option value="">Ao portador</option>{clientes.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
              <div className="col-md-2"><label>Valor</label><MoneyInput value={voucher.valor} onValueChange={valor => setVoucher({ ...voucher, valor })} /></div>
              <div className="col-md-2"><label>Validade</label><input type="date" className="form-control" value={voucher.validade} onChange={e => setVoucher({ ...voucher, validade: e.target.value })} /></div>
              <div className="col-md-9"><label>Observação</label><input className="form-control" value={voucher.observacao} onChange={e => setVoucher({ ...voucher, observacao: e.target.value })} /></div>
              <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100">Criar</button></div>
            </div>
          </form>
        </div>

        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={criarPacote}>
            <h5>Pacote de serviço</h5>
            <div className="row g-2">
              <div className="col-md-4"><label>Nome</label><input className="form-control" value={pacote.nome} onChange={e => setPacote({ ...pacote, nome: e.target.value })} required /></div>
              <div className="col-md-4"><label>Serviço</label><select className="form-select" value={pacote.servicoId} onChange={e => setPacote({ ...pacote, servicoId: e.target.value })} required><option value="">Selecione</option>{servicos.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
              <div className="col-md-2"><label>Sessões</label><input type="number" min="1" className="form-control" value={pacote.quantidadeSessoes} onChange={e => setPacote({ ...pacote, quantidadeSessoes: e.target.value })} /></div>
              <div className="col-md-2"><label>Validade</label><input type="number" min="1" className="form-control" value={pacote.validadeDias} onChange={e => setPacote({ ...pacote, validadeDias: e.target.value })} /></div>
              <div className="col-md-9"><label>Valor</label><MoneyInput value={pacote.valor} onValueChange={valor => setPacote({ ...pacote, valor })} /></div>
              <div className="col-md-3 d-flex align-items-end"><button className="btn btn-primary w-100">Criar pacote</button></div>
            </div>
          </form>
        </div>
      </div>

      <form className="panel mb-3" onSubmit={venderPacote}>
        <h5>Vender pacote ao cliente</h5>
        <div className="row g-2">
          <div className="col-md-4"><label>Cliente</label><select className="form-select" value={vendaPacote.clienteId} onChange={e => setVendaPacote({ ...vendaPacote, clienteId: e.target.value })} required><option value="">Selecione</option>{clientes.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          <div className="col-md-4"><label>Pacote</label><select className="form-select" value={vendaPacote.pacoteServicoId} onChange={e => setVendaPacote({ ...vendaPacote, pacoteServicoId: e.target.value })} required><option value="">Selecione</option>{pacotes.map(x => <option key={x.id} value={x.id}>{x.nome} - {formatarMoeda(x.valor)}</option>)}</select></div>
          <div className="col-md-2"><label>Valor pago</label><MoneyInput value={vendaPacote.valorPago} onValueChange={valorPago => setVendaPacote({ ...vendaPacote, valorPago })} placeholder="Padrão" /></div>
          <div className="col-md-2 d-flex align-items-end"><button className="btn btn-success w-100">Vincular</button></div>
        </div>
      </form>

      <div id="solicitacoes-planos" className="panel mb-3" style={{ scrollMarginTop: 90 }}>
        <h5>Solicitações públicas de planos</h5>
        <p className="text-muted">Aprove para liberar as sessões. A aprovação não registra pagamento no caixa.</p>
        <div className="table-responsive"><table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Plano solicitado</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {solicitacoesPacotes.map(x => (
              <tr key={x.id}>
                <td>{new Date(x.dataCompra).toLocaleString("pt-BR")}</td>
                <td>{x.cliente?.nome || "-"}</td>
                <td>{mascaraTelefone(x.cliente?.telefone) || x.cliente?.email || "-"}</td>
                <td>{x.pacote?.nome || "-"} {x.pacote?.servico ? `• ${x.pacote.servico}` : ""}</td>
                <td>{formatarMoeda(x.pacote?.valor || 0)}</td>
                <td><span className="badge bg-warning text-dark">Pendente</span></td>
                <td><button type="button" className="btn btn-success btn-sm text-nowrap" disabled={aprovandoId !== null} onClick={() => aprovarPlano(x)}>{aprovandoId === x.id ? "Aprovando…" : "Aprovar plano"}</button></td>
              </tr>
            ))}
            {solicitacoesPacotes.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">Nenhuma solicitação pública pendente.</td>
              </tr>
            )}
          </tbody>
        </table></div>
      </div>

      <div className="panel">
        <h5>Vouchers recentes</h5>
        <table className="table professional-table">
          <thead><tr><th>Código</th><th>Tipo</th><th>Cliente</th><th>Saldo</th><th>Validade</th><th>Status</th></tr></thead>
          <tbody>{vouchers.slice(0, 20).map(x => <tr key={x.id}><td>{x.codigo}</td><td>{x.tipo}</td><td>{x.cliente?.nome || "Ao portador"}</td><td>{formatarMoeda(x.saldo)}</td><td>{x.validade ? new Date(x.validade).toLocaleDateString("pt-BR") : "-"}</td><td>{x.status}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

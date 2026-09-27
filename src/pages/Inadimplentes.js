import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, selecionarFormaPagamento, solicitarMotivo } from "../utils/alerts";
import { formatarMoeda } from "../utils/masks";

function formatarData(valor) {
  if (!valor) return "-";
  return new Date(valor).toLocaleDateString("pt-BR");
}

function faixaAtraso(dias) {
  if (dias <= 7) return "Até 7 dias";
  if (dias <= 30) return "8 a 30 dias";
  return "Mais de 30 dias";
}

export default function Inadimplentes() {
  const [resumo, setResumo] = useState({});
  const [lancamentos, setLancamentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      setCarregando(true);
      const res = await api.get("/financeiro/inadimplentes");
      setResumo(res.data?.resumo || {});
      setLancamentos(res.data?.lancamentos || []);
    } catch (e) {
      alertaErro(e.response?.data || "Não foi possível carregar os inadimplentes.");
    } finally {
      setCarregando(false);
    }
  }

  async function baixar(id) {
    const formaPagamento = await selecionarFormaPagamento();
    if (!formaPagamento) return;

    try {
      await api.put(`/financeiro/lancamentos/${id}/baixar`, { formaPagamento });
      await carregar();
      await alertaSucesso("Recebimento baixado e removido da inadimplência.");
    } catch (e) {
      alertaErro(e.response?.data || "Não foi possível baixar o recebimento.");
    }
  }

  async function registrarCobranca(lancamento) {
    const observacao = await solicitarMotivo("Registrar cobrança", "Anotação do contato");
    if (!observacao) return;

    const textoAtual = lancamento.observacao?.trim();
    const data = new Date().toLocaleString("pt-BR");
    const novoTexto = `${textoAtual ? `${textoAtual}\n` : ""}${data} - ${observacao}`;

    try {
      await api.put(`/financeiro/lancamentos/${lancamento.id}/observacao`, { observacao: novoTexto });
      await carregar();
      await alertaSucesso("Cobrança registrada.");
    } catch (e) {
      alertaErro(e.response?.data || "Não foi possível registrar a cobrança.");
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lancamentos;
    return lancamentos.filter(x =>
      `${x.descricao} ${x.categoria?.nome || ""} ${x.observacao || ""}`.toLowerCase().includes(termo)
    );
  }, [busca, lancamentos]);

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Inadimplentes"
        subtitle="Contas a receber vencidas, cobrança e baixa de pagamento."
      />

      <div className="row g-3 mb-3">
        <div className="col-md">
          <div className="metric-card">
            <span>Vencidos</span>
            <strong>{resumo.quantidade || 0}</strong>
          </div>
        </div>
        <div className="col-md">
          <div className="metric-card">
            <span>Total em atraso</span>
            <strong>{formatarMoeda(resumo.totalVencido || 0)}</strong>
          </div>
        </div>
        <div className="col-md">
          <div className="metric-card">
            <span>Até 7 dias</span>
            <strong>{formatarMoeda(resumo.ate7Dias || 0)}</strong>
          </div>
        </div>
        <div className="col-md">
          <div className="metric-card">
            <span>8 a 30 dias</span>
            <strong>{formatarMoeda(resumo.de8A30Dias || 0)}</strong>
          </div>
        </div>
        <div className="col-md">
          <div className="metric-card danger">
            <span>+30 dias</span>
            <strong>{formatarMoeda(resumo.acimaDe30Dias || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="panel mb-3">
        <div className="d-flex gap-2 align-items-end flex-wrap">
          <div className="flex-grow-1">
            <label>Buscar cobrança</label>
            <input
              className="form-control"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Cliente, descrição, categoria ou observação"
            />
          </div>
          <button type="button" className="btn btn-outline-secondary" onClick={carregar}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Cobranças em atraso</h5>
          <small>{filtrados.length} registro(s)</small>
        </div>

        {carregando ? (
          <div className="operation-hint">Carregando inadimplentes...</div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum inadimplente encontrado</strong>
            <span>Quando uma conta a receber vencer sem pagamento, ela aparecerá aqui automaticamente.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table professional-table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Atraso</th>
                  <th className="text-end">Valor</th>
                  <th>Últimas anotações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(x => (
                  <tr key={x.id}>
                    <td>{formatarData(x.dataVencimento)}</td>
                    <td>
                      <strong>{x.descricao}</strong>
                      <small className="d-block text-muted">#{x.id}</small>
                    </td>
                    <td>{x.categoria?.nome || "-"}</td>
                    <td>
                      <span className={x.diasAtraso > 30 ? "badge bg-danger" : "badge bg-warning text-dark"}>
                        {x.diasAtraso} dia(s)
                      </span>
                      <small className="d-block text-muted">{faixaAtraso(x.diasAtraso)}</small>
                    </td>
                    <td className="text-end fw-bold">{formatarMoeda(x.valor)}</td>
                    <td className="finance-note">{x.observacao || "Sem contato registrado"}</td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-outline-primary" onClick={() => registrarCobranca(x)}>
                          Cobrar
                        </button>
                        <button type="button" className="btn btn-outline-success" onClick={() => baixar(x.id)}>
                          Baixar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

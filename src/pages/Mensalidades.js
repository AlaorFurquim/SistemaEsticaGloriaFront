import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarMoeda } from "../utils/masks";

function data(valor) {
  return valor ? new Date(valor).toLocaleDateString("pt-BR") : "-";
}

function dataHora(valor) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "-";
}

function badge(status) {
  if (status === "Paga") return "bg-success";
  if (status === "Vencida") return "bg-danger";
  if (status === "Cancelada") return "bg-secondary";
  return "bg-warning text-dark";
}

export default function Mensalidades() {
  const [dados, setDados] = useState(null);
  const [pixAberto, setPixAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      setCarregando(true);
      const res = await api.get("/administracao/minhas-mensalidades");
      setDados(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar suas mensalidades.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiarPix(codigo) {
    if (!codigo) return;
    await navigator.clipboard.writeText(codigo);
    await alertaSucesso("Pix copia e cola copiado.");
  }

  useEffect(() => { carregar(); }, []);

  const proxima = dados?.proxima;
  const diasVencimento = useMemo(() => {
    if (!proxima?.vencimento) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(proxima.vencimento);
    vencimento.setHours(0, 0, 0, 0);
    return Math.ceil((vencimento - hoje) / 86400000);
  }, [proxima]);

  return (
    <div>
      <PageHeader
        title="Mensalidades"
        subtitle="Acompanhe vencimento, status e Pix da assinatura do sistema."
      >
        <button type="button" className="btn btn-outline-secondary" onClick={carregar}>Atualizar</button>
      </PageHeader>

      {carregando ? (
        <div className="panel">Carregando mensalidades...</div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="metric-card">
                <span>Status da assinatura</span>
                <strong>{dados?.empresa?.statusAssinatura || "-"}</strong>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card">
                <span>Valor mensal</span>
                <strong>{formatarMoeda(dados?.empresa?.cobrancaUnidades?.total ?? dados?.empresa?.valorMensalidade ?? 0)}</strong>
              </div>
            </div>
            <div className="col-md-3">
              <div className="metric-card">
                <span>Próximo vencimento</span>
                <strong>{proxima ? data(proxima.vencimento) : "-"}</strong>
              </div>
            </div>
            <div className="col-md-3">
              <div className={`metric-card ${proxima?.status === "Vencida" ? "danger" : ""}`}>
                <span>Situação</span>
                <strong>{proxima ? proxima.status : "Sem pendência"}</strong>
              </div>
            </div>
          </div>

          {dados?.empresa?.cobrancaUnidades?.quantidade > 0 && <div className="panel mb-3">Mensalidade base: {formatarMoeda(dados.empresa.cobrancaUnidades.valorBase)} + {dados.empresa.cobrancaUnidades.quantidade} unidade(s) × {formatarMoeda(dados.empresa.cobrancaUnidades.valorUnitario)} por mês.</div>}
          {dados?.empresa?.empresaPrincipalId && <div className="panel mb-3">A assinatura desta unidade é cobrada na empresa principal.</div>}
          {dados?.empresa?.testeGratisAte && (
            <div className="panel mb-3">
              <strong>Teste grátis ativo até {data(dados.empresa.testeGratisAte)}</strong>
              <p className="mb-0 text-muted">Depois dessa data, a mensalidade será controlada nesta tela.</p>
            </div>
          )}

          {proxima && (
            <div className="panel mb-3 subscription-payment-card">
              <div className="section-title">
                <div>
                  <h5>{proxima.status === "Vencida" ? "Mensalidade vencida" : "Próxima mensalidade"}</h5>
                  <p>
                    Vence em {data(proxima.vencimento)}
                    {diasVencimento !== null && ` • ${diasVencimento < 0 ? `${Math.abs(diasVencimento)} dia(s) em atraso` : `${diasVencimento} dia(s)`}`}
                  </p>
                </div>
                <span className={`badge ${badge(proxima.status)}`}>{proxima.status}</span>
              </div>

              <div className="subscription-payment-grid">
                <div>
                  <span>Competência</span>
                  <strong>{data(proxima.competencia).slice(3)}</strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{formatarMoeda(proxima.valor)}</strong>
                </div>
                <div>
                  <span>Vencimento</span>
                  <strong>{data(proxima.vencimento)}</strong>
                </div>
              </div>

              {proxima.pixCopiaECola ? (
                <div className="subscription-pix-box">
                  <QRCodeSVG value={proxima.pixCopiaECola} size={190} level="M" />
                  <div>
                    <strong>Pagamento por Pix</strong>
                    <p>Escaneie o QR Code ou copie o código Pix. A baixa será confirmada pela administração da plataforma.</p>
                    <textarea className="form-control" readOnly value={proxima.pixCopiaECola} />
                    <button type="button" className="btn btn-primary mt-2" onClick={() => copiarPix(proxima.pixCopiaECola)}>
                      Copiar Pix
                    </button>
                  </div>
                </div>
              ) : (
                <div className="operation-hint">
                  Pix da plataforma ainda não configurado. Entre em contato com o suporte para regularizar a mensalidade.
                </div>
              )}
            </div>
          )}

          <div className="panel">
            <h5>Histórico de mensalidades</h5>
            <table className="table professional-table">
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {(dados?.mensalidades || []).map(item => (
                  <tr key={item.id}>
                    <td>{data(item.competencia).slice(3)}</td>
                    <td>{data(item.vencimento)}</td>
                    <td>{formatarMoeda(item.valor)}</td>
                    <td><span className={`badge ${badge(item.status)}`}>{item.status}</span></td>
                    <td>{item.pagoEm ? `${dataHora(item.pagoEm)} • ${formatarMoeda(item.valorPago || item.valor)}` : "-"}</td>
                    <td>{item.observacao || "-"}</td>
                  </tr>
                ))}
                {(dados?.mensalidades || []).length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">Nenhuma mensalidade gerada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

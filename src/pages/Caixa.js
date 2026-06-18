import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda, formatarDataHora } from "../utils/masks";

export default function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [pdvs, setPdvs] = useState([]);
  const [pdvId, setPdvId] = useState("");
  const [valorInicial, setValorInicial] = useState(0);
  const [movValor, setMovValor] = useState(0);
  const [tipo, setTipo] = useState("SANGRIA");
  const [descricao, setDescricao] = useState("");
  const [valorFinal, setValorFinal] = useState(0);

  async function carregarPdvs() {
    const res = await api.get("/pdvterminais");
    setPdvs(res.data || []);

    if ((res.data || []).length > 0 && !pdvId) {
      setPdvId(res.data[0].id);
    }
  }

  async function carregar(id = pdvId) {
    if (!id) return;

    try {
      const res = await api.get(`/caixa/atual?pdvId=${id}`);
      setCaixa(res.data);
    } catch {
      setCaixa(null);
    }
  }

  async function abrir() {
    await api.post("/caixa/abrir", {
      pdvId: Number(pdvId),
      valorInicial: Number(valorInicial),
      observacao: "Abertura pelo sistema"
    });

    await carregar();
  }

  async function movimento() {
    await api.post("/caixa/movimento", {
      caixaId: caixa.id,
      pdvId: Number(pdvId),
      tipo,
      formaPagamento: "Dinheiro",
      valor: Number(movValor),
      descricao
    });

    setMovValor(0);
    setDescricao("");
    await carregar();
  }

  async function fechar() {
    await api.post("/caixa/fechar", {
      caixaId: caixa.id,
      pdvId: Number(pdvId),
      valorFinalInformado: Number(valorFinal),
      observacao: "Fechamento pelo sistema"
    });

    setValorFinal(0);
    await carregar();
  }

  useEffect(() => {
    carregarPdvs();
  }, []);

  useEffect(() => {
    if (pdvId) carregar(pdvId);
  }, [pdvId]);

  const saldo = caixa
    ? Number(caixa.valorInicial || 0) +
      Number(caixa.totalVendas || 0) +
      Number(caixa.totalServicos || 0) +
      Number(caixa.totalSuprimentos || 0) -
      Number(caixa.totalSangrias || 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Caixa por PDV"
        subtitle="Abertura, sangria, suprimento e fechamento separado por terminal"
      />

      <div className="panel mb-3">
        <h5>Selecionar PDV</h5>

        <div className="row g-2">
          <div className="col-md-4">
            <label>PDV / Terminal</label>
            <select
              className="form-select"
              value={pdvId}
              onChange={(e) => setPdvId(e.target.value)}
            >
              <option value="">Selecione</option>
              {pdvs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero} - {p.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!caixa ? (
        <div className="panel">
          <h5>Abrir caixa</h5>

          <div className="row g-2">
            <div className="col-md-3">
              <label>Valor inicial</label>
              <input
                type="number"
                className="form-control"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-success w-100"
                onClick={abrir}
                disabled={!pdvId}
              >
                Abrir caixa
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="metric-card">
                <span>Caixa</span>
                <strong>{caixa.numeroCaixa}</strong>
              </div>
            </div>

            <div className="col-md-3">
              <div className="metric-card">
                <span>Status</span>
                <strong>{caixa.status}</strong>
              </div>
            </div>

            <div className="col-md-3">
              <div className="metric-card">
                <span>Vendas</span>
                <strong>{formatarMoeda(caixa.totalVendas)}</strong>
              </div>
            </div>

            <div className="col-md-3">
              <div className="metric-card">
                <span>Saldo esperado</span>
                <strong>{formatarMoeda(saldo)}</strong>
              </div>
            </div>
          </div>

          <div className="panel mt-3">
            <h5>Movimento manual</h5>

            <div className="row g-2">
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="SANGRIA">Sangria</option>
                  <option value="SUPRIMENTO">Suprimento</option>
                </select>
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  value={movValor}
                  onChange={(e) => setMovValor(e.target.value)}
                />
              </div>

              <div className="col-md-5">
                <input
                  className="form-control"
                  placeholder="Descrição"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <button className="btn btn-primary w-100" onClick={movimento}>
                  Lançar
                </button>
              </div>
            </div>
          </div>

          <div className="panel mt-3">
            <h5>Fechamento</h5>

            <div className="row g-2">
              <div className="col-md-3">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Valor final informado"
                  value={valorFinal}
                  onChange={(e) => setValorFinal(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <button className="btn btn-danger w-100" onClick={fechar}>
                  Fechar caixa
                </button>
              </div>
            </div>
          </div>

          <div className="panel mt-3">
            <h5>Movimentos</h5>

            <table className="table professional-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                  <th>Descrição</th>
                </tr>
              </thead>

              <tbody>
                {(caixa.movimentos || []).map((x) => (
                  <tr key={x.id}>
                    <td>{formatarDataHora(x.data)}</td>
                    <td>{x.tipo}</td>
                    <td>{x.formaPagamento}</td>
                    <td>{formatarMoeda(x.valor)}</td>
                    <td>{x.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { BarChart, Bar, CartesianGrid, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda } from "../utils/masks";

const hoje = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const [dados, setDados] = useState({
    vendasHoje: 0,
    vendasMes: 0,
    servicosMes: 0,
    faturamentoMes: 0,
    comissoesMes: 0,
    estoqueBaixo: 0,
    clientes: 0,
    agendadosHoje: 0,
    resumoProcedimentos: []
  });
  const [servicos, setServicos] = useState([]);
  const [servicoId, setServicoId] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState(hoje);

  async function carregar() {
    const params = {};
    if (servicoId) params.servicoId = servicoId;
    if (dataSelecionada) params.data = dataSelecionada;

    const res = await api.get("/relatorios/dashboard", { params });
    setDados(res.data);
  }

  async function carregarServicos() {
    const res = await api.get("/servicos");
    setServicos(res.data || []);
  }

  useEffect(() => {
    carregarServicos();
  }, []);

  useEffect(() => {
    carregar();
  }, [servicoId, dataSelecionada]);

  const chartData = [
    { nome: "Vendas", valor: dados.vendasMes, cor: "#5a1d32" },
    { nome: "Serviços", valor: dados.servicosMes, cor: "#c9a95d" },
    { nome: "Comissões", valor: dados.comissoesMes, cor: "#8f3d56" }
  ];

  const procedimentoSelecionado = servicos.find((servico) => String(servico.id) === String(servicoId));
  const dataLabel = dataSelecionada ? new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString("pt-BR") : "hoje";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={procedimentoSelecionado ? `Resumo de ${procedimentoSelecionado.nome} em ${dataLabel}` : `Resumo dos procedimentos em ${dataLabel}`}
      />

      <div className="panel mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label>Data do resumo</label>
            <input
              type="date"
              className="form-control"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
            />
          </div>

          <div className="col-md-5">
            <label>Filtrar procedimento</label>
            <select
              className="form-select"
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
            >
              <option value="">Todos os procedimentos</option>
              {servicos.map((servico) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <button type="button" className="btn btn-light w-100" onClick={() => setDataSelecionada(hoje)}>
              Hoje
            </button>
          </div>

          <div className="col-md-2">
            <button type="button" className="btn btn-light w-100" onClick={() => setServicoId("")}>
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="metric-card">
            <span>Vendas do dia</span>
            <strong>{formatarMoeda(dados.vendasHoje)}</strong>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card">
            <span>Faturamento mês</span>
            <strong>{formatarMoeda(dados.faturamentoMes)}</strong>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card">
            <span>Agendados no dia</span>
            <strong>{dados.agendadosHoje}</strong>
          </div>
        </div>
        <div className="col-md-3">
          <div className="metric-card danger">
            <span>Estoque baixo</span>
            <strong>{dados.estoqueBaixo}</strong>
          </div>
        </div>
      </div>

      <div className="panel mt-3">
        <h5>Procedimentos do dia</h5>
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Procedimento</th>
              <th>Total</th>
              <th>Agendados</th>
              <th>Concluídos</th>
              <th>Cancelados</th>
              <th className="text-end">Valor concluido</th>
              <th>Horários</th>
            </tr>
          </thead>
          <tbody>
            {(dados.resumoProcedimentos || []).map((item) => (
              <tr key={item.servicoId}>
                <td>{item.procedimento}</td>
                <td>{item.total}</td>
                <td>{item.agendados}</td>
                <td>{item.concluidos}</td>
                <td>{item.cancelados}</td>
                <td className="text-end fw-bold">{formatarMoeda(item.valor || 0)}</td>
                <td>
                  {(item.horarios || []).map((horario, index) => (
                    <span className="dashboard-schedule-pill" key={`${item.servicoId}-${index}`}>
                      {horario.horario} - {horario.cliente || "Cliente"} ({horario.status})
                    </span>
                  ))}
                </td>
              </tr>
            ))}

            {!(dados.resumoProcedimentos || []).length && (
              <tr>
                <td colSpan="7">
                  <div className="dashboard-empty-state">
                    Nenhum procedimento encontrado para esta data.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row g-3 mt-2">
        <div className="col-md-8">
          <div className="panel">
            <h5>Resumo financeiro do mês</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#ead8cf" vertical={false} />
                <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: "#5a1d32", fontSize: 13 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#7a5866", fontSize: 12 }}
                  tickFormatter={(value) => formatarMoeda(value).replace("R$ ", "")}
                />
                <Tooltip
                  formatter={(value) => formatarMoeda(value)}
                  cursor={{ fill: "rgba(201,169,93,.12)" }}
                  contentStyle={{
                    border: "1px solid #ead8cf",
                    borderRadius: 12,
                    boxShadow: "0 14px 32px rgba(90,29,50,.12)"
                  }}
                />
                <Bar dataKey="valor" radius={[10, 10, 0, 0]} maxBarSize={88}>
                  {chartData.map((entry) => (
                    <Cell key={entry.nome} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-md-4">
          <div className="panel">
            <h5>Indicadores</h5>
            <div className="indicator-line"><span>Clientes ativos</span><strong>{dados.clientes}</strong></div>
            <div className="indicator-line"><span>Vendas no mês</span><strong>{formatarMoeda(dados.vendasMes)}</strong></div>
            <div className="indicator-line"><span>Serviços no mês</span><strong>{formatarMoeda(dados.servicosMes)}</strong></div>
            <div className="indicator-line"><span>Comissões</span><strong>{formatarMoeda(dados.comissoesMes)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda } from "../utils/masks";

export default function Dashboard() {
  const [dados, setDados] = useState({
    vendasHoje: 0, vendasMes: 0, servicosMes: 0, faturamentoMes: 0,
    comissoesMes: 0, estoqueBaixo: 0, clientes: 0, agendadosHoje: 0
  });

  async function carregar() {
    const res = await api.get("/relatorios/dashboard");
    setDados(res.data);
  }

  useEffect(() => { carregar(); }, []);

  const chartData = [
    { nome: "Vendas", valor: dados.vendasMes },
    { nome: "Serviços", valor: dados.servicosMes },
    { nome: "Comissões", valor: dados.comissoesMes }
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão executiva do salão" />

      <div className="row g-3">
        <div className="col-md-3"><div className="metric-card"><span>Vendas hoje</span><strong>{formatarMoeda(dados.vendasHoje)}</strong></div></div>
        <div className="col-md-3"><div className="metric-card"><span>Faturamento mês</span><strong>{formatarMoeda(dados.faturamentoMes)}</strong></div></div>
        <div className="col-md-3"><div className="metric-card"><span>Agendados hoje</span><strong>{dados.agendadosHoje}</strong></div></div>
        <div className="col-md-3"><div className="metric-card danger"><span>Estoque baixo</span><strong>{dados.estoqueBaixo}</strong></div></div>
      </div>

      <div className="row g-3 mt-2">
        <div className="col-md-8">
          <div className="panel">
            <h5>Resumo financeiro do mês</h5>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Bar dataKey="valor" />
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

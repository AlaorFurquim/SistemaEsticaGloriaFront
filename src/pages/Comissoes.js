import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import MoneyInput from "../components/MoneyInput";
import { formatarMoeda } from "../utils/masks";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";

const hoje = new Date();
const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

const regraInicial = {
  nome: "",
  tipoItem: "SERVICO",
  profissionalId: "",
  servicoId: "",
  produtoId: "",
  tipoCalculo: "PERCENTUAL",
  percentual: 40,
  valorFixo: 0,
  faixaValorMinimo: 0,
  faixaValorMaximo: ""
};

export default function Comissoes() {
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [regras, setRegras] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [apuracao, setApuracao] = useState({ itens: [], totalBase: 0, totalComissao: 0, quantidade: 0 });
  const [filtro, setFiltro] = useState({ dataInicio: inicioMes, dataFim: fimMes, profissionalId: "" });
  const [regra, setRegra] = useState(regraInicial);

  async function carregarBase() {
    try {
      const [profRes, servRes, prodRes, regrasRes, fechamentosRes] = await Promise.all([
        api.get("/profissionais"),
        api.get("/servicos"),
        api.get("/produtos"),
        api.get("/comissoes/regras"),
        api.get("/comissoes/fechamentos")
      ]);

      setProfissionais(profRes.data);
      setServicos(servRes.data);
      setProdutos(prodRes.data);
      setRegras(regrasRes.data);
      setFechamentos(fechamentosRes.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar comissões.");
    }
  }

  async function apurar(e) {
    e?.preventDefault();
    try {
      const params = { dataInicio: filtro.dataInicio, dataFim: filtro.dataFim };
      if (filtro.profissionalId) params.profissionalId = filtro.profissionalId;
      const res = await api.get("/comissoes/apurar", { params });
      setApuracao(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível apurar comissões.");
    }
  }

  async function salvarRegra(e) {
    e.preventDefault();
    try {
      await api.post("/comissoes/regras", {
        ...regra,
        profissionalId: regra.profissionalId ? Number(regra.profissionalId) : null,
        servicoId: regra.servicoId ? Number(regra.servicoId) : null,
        produtoId: regra.produtoId ? Number(regra.produtoId) : null,
        percentual: Number(regra.percentual || 0),
        valorFixo: Number(regra.valorFixo || 0),
        faixaValorMinimo: Number(regra.faixaValorMinimo || 0),
        faixaValorMaximo: regra.faixaValorMaximo ? Number(regra.faixaValorMaximo) : null
      });

      setRegra(regraInicial);
      await carregarBase();
      await alertaSucesso("Regra de comissão criada.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível salvar a regra.");
    }
  }

  async function inativarRegra(id) {
    const ok = await confirmarAcao("Inativar regra?", "Novas apurações não usarão esta regra.");
    if (!ok) return;

    try {
      await api.put(`/comissoes/regras/${id}/inativar`);
      await carregarBase();
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível inativar a regra.");
    }
  }

  async function fechar() {
    if (!apuracao.quantidade) {
      alertaErro("Apure as comissões antes de fechar.");
      return;
    }

    const ok = await confirmarAcao("Fechar comissões?", `Será criada uma conta a pagar de ${formatarMoeda(apuracao.totalComissao)}.`);
    if (!ok) return;

    try {
      await api.post("/comissoes/fechar", {
        dataInicio: filtro.dataInicio,
        dataFim: filtro.dataFim,
        profissionalId: filtro.profissionalId ? Number(filtro.profissionalId) : null,
        dataVencimento: new Date().toISOString().slice(0, 10),
        observacao: "Fechamento gerado pela tela de comissões."
      });

      await carregarBase();
      await apurar();
      await alertaSucesso("Fechamento gerado e conta a pagar criada no financeiro.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível fechar as comissões.");
    }
  }

  useEffect(() => {
    carregarBase();
    apurar();
  }, []);

  return (
    <div>
      <PageHeader title="Comissões" subtitle="Regras, apuração por competência e fechamento financeiro" />

      <form className="panel mb-3" onSubmit={apurar}>
        <h5>Apuração</h5>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Início</label>
            <input type="date" className="form-control" value={filtro.dataInicio} onChange={e => setFiltro({ ...filtro, dataInicio: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <label>Fim</label>
            <input type="date" className="form-control" value={filtro.dataFim} onChange={e => setFiltro({ ...filtro, dataFim: e.target.value })} required />
          </div>
          <div className="col-md-3">
            <label>Profissional</label>
            <select className="form-select" value={filtro.profissionalId} onChange={e => setFiltro({ ...filtro, profissionalId: e.target.value })}>
              <option value="">Todos</option>
              {profissionais.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button className="btn btn-primary w-50">Apurar</button>
            <button type="button" className="btn btn-success w-50" onClick={fechar}>Fechar</button>
          </div>
        </div>
      </form>

      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="metric-card"><span>Base comissionável</span><strong>{formatarMoeda(apuracao.totalBase || 0)}</strong></div></div>
        <div className="col-md-4"><div className="metric-card"><span>Comissões pendentes</span><strong>{formatarMoeda(apuracao.totalComissao || 0)}</strong></div></div>
        <div className="col-md-4"><div className="metric-card"><span>Itens pendentes</span><strong>{apuracao.quantidade || 0}</strong></div></div>
      </div>

      <div className="panel mb-3">
        <h5>Itens apurados</h5>
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Profissional</th>
              <th>Origem</th>
              <th>Descrição</th>
              <th className="text-end">Base</th>
              <th className="text-end">%</th>
              <th className="text-end">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {apuracao.itens.map((x, i) => (
              <tr key={i}>
                <td>{new Date(x.dataReferencia).toLocaleDateString("pt-BR")}</td>
                <td>{x.profissional}</td>
                <td>{x.origem}</td>
                <td>{x.descricao}</td>
                <td className="text-end">{formatarMoeda(x.valorBase)}</td>
                <td className="text-end">{x.percentualAplicado}%</td>
                <td className="text-end fw-bold">{formatarMoeda(x.valorComissao)}</td>
              </tr>
            ))}
            {!apuracao.itens.length && <tr><td colSpan="7" className="text-center text-muted py-3">Nenhuma comissão pendente no período.</td></tr>}
          </tbody>
        </table>
      </div>

      <form className="panel mb-3" onSubmit={salvarRegra}>
        <h5>Nova regra</h5>
        <div className="row g-2">
          <div className="col-md-3"><label>Nome</label><input className="form-control" value={regra.nome} onChange={e => setRegra({ ...regra, nome: e.target.value })} required /></div>
          <div className="col-md-2"><label>Tipo</label><select className="form-select" value={regra.tipoItem} onChange={e => setRegra({ ...regra, tipoItem: e.target.value })}><option value="SERVICO">Serviço</option><option value="PRODUTO">Produto</option><option value="AMBOS">Ambos</option></select></div>
          <div className="col-md-2"><label>Cálculo</label><select className="form-select" value={regra.tipoCalculo} onChange={e => setRegra({ ...regra, tipoCalculo: e.target.value })}><option value="PERCENTUAL">Percentual</option><option value="VALOR_FIXO">Valor fixo</option><option value="FAIXA">Faixa</option></select></div>
          <div className="col-md-2"><label>Percentual</label><input type="number" step="0.01" className="form-control" value={regra.percentual} onChange={e => setRegra({ ...regra, percentual: e.target.value })} /></div>
          <div className="col-md-2"><label>Valor fixo</label><MoneyInput value={regra.valorFixo} onValueChange={valorFixo => setRegra({ ...regra, valorFixo })} /></div>
          <div className="col-md-1 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar</button></div>
          <div className="col-md-3"><label>Profissional específico</label><select className="form-select" value={regra.profissionalId} onChange={e => setRegra({ ...regra, profissionalId: e.target.value })}><option value="">Todos</option>{profissionais.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          <div className="col-md-3"><label>Serviço específico</label><select className="form-select" value={regra.servicoId} onChange={e => setRegra({ ...regra, servicoId: e.target.value })}><option value="">Todos</option>{servicos.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          <div className="col-md-3"><label>Produto específico</label><select className="form-select" value={regra.produtoId} onChange={e => setRegra({ ...regra, produtoId: e.target.value })}><option value="">Todos</option>{produtos.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div>
          <div className="col-md-3">
            <label>Faixa min./máx.</label>
            <div className="input-group">
              <MoneyInput value={regra.faixaValorMinimo} onValueChange={faixaValorMinimo => setRegra({ ...regra, faixaValorMinimo })} />
              <MoneyInput value={regra.faixaValorMaximo} onValueChange={faixaValorMaximo => setRegra({ ...regra, faixaValorMaximo })} />
            </div>
          </div>
        </div>
      </form>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="panel">
            <h5>Regras</h5>
            <table className="table professional-table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Cálculo</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {regras.map(x => <tr key={x.id}><td>{x.nome}</td><td>{x.tipoItem}</td><td>{x.tipoCalculo === "VALOR_FIXO" ? formatarMoeda(x.valorFixo) : `${x.percentual}%`}</td><td>{x.ativo ? "Ativa" : "Inativa"}</td><td>{x.ativo && <button className="btn btn-outline-danger btn-sm" onClick={() => inativarRegra(x.id)}>Inativar</button>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="panel">
            <h5>Fechamentos recentes</h5>
            <table className="table professional-table">
              <thead><tr><th>Data</th><th>Profissional</th><th className="text-end">Comissão</th><th>Financeiro</th></tr></thead>
              <tbody>
                {fechamentos.map(x => <tr key={x.id}><td>{new Date(x.dataFechamento).toLocaleDateString("pt-BR")}</td><td>{x.profissional?.nome || "Todos"}</td><td className="text-end fw-bold">{formatarMoeda(x.totalComissao)}</td><td>{x.lancamentoFinanceiro ? `#${x.lancamentoFinanceiro.id} ${x.lancamentoFinanceiro.status}` : "-"}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

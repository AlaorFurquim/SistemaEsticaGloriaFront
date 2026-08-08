import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import api from "../api";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const statusOpcoes = ["Ativo", "Teste", "Pendente", "EmAtraso", "Bloqueado", "Cancelado"];
const situacoes = [
  ["EmDia", "Em dia"],
  ["VenceEmBreve", "Vence em breve"],
  ["Atrasada", "Inadimplente"],
  ["SemCobranca", "Sem cobrança"]
];
const coresCarteira = ["#148653", "#d19a2a", "#c43d3d", "#7a8794"];
const planoFiscalInicial = {
  id: null,
  nome: "",
  descricao: "",
  creditosAcbr: 1000,
  valorRecargaAcbr: 0,
  limiteNotasMensal: 1000,
  valorMensal: 0,
  ativo: false,
  ordem: 1
};

const dataHora = (valor) => valor ? new Date(valor).toLocaleString("pt-BR") : "Sem registro";
const data = (valor) => valor ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-";
const dataHoraInput = (valor) => valor ? new Date(valor).toISOString().slice(0, 16) : "";
const dataInput = (valor) => valor ? new Date(valor).toISOString().slice(0, 10) : "";
const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = (valor) => Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const percentual = (valor) => `${Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const rotuloSituacao = (valor) => situacoes.find(([codigo]) => codigo === valor)?.[1] || valor;
const mensagemErro = (erro, padrao) => erro.response?.data?.mensagem || erro.response?.data || padrao;

export default function PlataformaAdmin() {
  const navigate = useNavigate();
  const [aba, setAba] = useState("visao");
  const [bi, setBi] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [situacao, setSituacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [edicao, setEdicao] = useState(null);
  const [cobrancaEdicao, setCobrancaEdicao] = useState(null);
  const [fiscalEdicao, setFiscalEdicao] = useState(null);
  const [configuracao, setConfiguracao] = useState(null);
  const [configAberta, setConfigAberta] = useState(false);
  const [planosFiscais, setPlanosFiscais] = useState([]);
  const [planoFiscalForm, setPlanoFiscalForm] = useState(planoFiscalInicial);
  const [planosAbertos, setPlanosAbertos] = useState(false);
  const [cotaAcbr, setCotaAcbr] = useState(null);
  const [erroCotaAcbr, setErroCotaAcbr] = useState("");
  const [carregandoCota, setCarregandoCota] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alternandoId, setAlternandoId] = useState(null);
  const [pixEmExibicao, setPixEmExibicao] = useState(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ usuarioId: "", novaSenha: "", confirmarSenha: "" });
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const carregarBi = useCallback(async () => {
    const resposta = await api.get("/plataforma/tenants/bi", { params: { meses: 12 } });
    setBi(resposta.data);
  }, []);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const resposta = await api.get("/plataforma/tenants", {
        params: { busca: busca || undefined, status: status || undefined, situacao: situacao || undefined }
      });
      setTenants(resposta.data || []);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível carregar as empresas."));
    } finally {
      setCarregando(false);
    }
  }, [busca, status, situacao]);

  const carregarConfiguracao = useCallback(async () => {
    try {
      const resposta = await api.get("/plataforma/tenants/cobranca/configuracao");
      setConfiguracao({
        pixChave: resposta.data.pixChave || "",
        pixBeneficiario: resposta.data.pixBeneficiario || "",
        pixCidade: resposta.data.pixCidade || "",
        valorMensalidadePadrao: resposta.data.valorMensalidadePadrao || 0,
        custoMensalEstimado: resposta.data.custoMensalEstimado || 0,
        diaVencimentoPadrao: resposta.data.diaVencimentoPadrao || 10,
        diasAvisoVencimento: resposta.data.diasAvisoVencimento || 5,
        diasTeste: resposta.data.diasTeste ?? 14
      });
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível carregar a configuração de cobrança."));
    }
  }, []);

  const carregarPlanosFiscais = useCallback(async () => {
    try {
      const resposta = await api.get("/plataforma/tenants/fiscal/planos");
      setPlanosFiscais(resposta.data || []);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível carregar os planos fiscais."));
    }
  }, []);

  const carregarCotaAcbr = useCallback(async () => {
    try {
      setCarregandoCota(true);
      setErroCotaAcbr("");
      const resposta = await api.get("/plataforma/tenants/fiscal/cota-acbr");
      setCotaAcbr(resposta.data);
    } catch (erro) {
      setCotaAcbr(null);
      setErroCotaAcbr(mensagemErro(erro, "Saldo ACBr indisponível."));
    } finally {
      setCarregandoCota(false);
    }
  }, []);

  const atualizarPainel = useCallback(async () => {
    try {
      await Promise.all([carregarBi(), carregar()]);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível atualizar os indicadores."));
    }
  }, [carregar, carregarBi]);

  useEffect(() => {
    const timer = setTimeout(atualizarPainel, 250);
    return () => clearTimeout(timer);
  }, [atualizarPainel]);

  useEffect(() => { carregarConfiguracao(); }, [carregarConfiguracao]);
  useEffect(() => { carregarPlanosFiscais(); }, [carregarPlanosFiscais]);

  const indicadores = bi?.indicadores || {};
  const totalCarteira = useMemo(() => (bi?.distribuicao || []).reduce((total, item) => total + Number(item.valor || 0), 0), [bi]);

  async function abrirDetalhe(tenant) {
    setSelecionado(tenant);
    setPixEmExibicao(null);
    setSenhaForm({ usuarioId: "", novaSenha: "", confirmarSenha: "" });
    setMostrarSenha(false);
    try {
      const resposta = await api.get(`/plataforma/tenants/${tenant.id}`);
      const dados = resposta.data;
      setDetalhe(dados);
      setEdicao({
        nome: dados.tenant.nome || "",
        responsavelNome: dados.tenant.responsavelNome || "",
        responsavelEmail: dados.tenant.responsavelEmail || "",
        telefone: dados.tenant.telefone || "",
        testeExpiraEm: dataHoraInput(dados.tenant.testeExpiraEm)
      });
      setCobrancaEdicao({
        cobrancaAtiva: !!dados.tenant.cobrancaAtiva,
        valorMensalidade: dados.tenant.valorMensalidade || 0,
        primeiroVencimentoEm: dataInput(dados.tenant.primeiroVencimentoEm)
      });
      setFiscalEdicao({
        habilitada: !!dados.tenant.emissaoFiscalHabilitada,
        planoFiscalSaasId: dados.tenant.planoFiscalSaasId || null,
        planoNome: dados.tenant.planoFiscalNome || "",
        limiteNotasMensal: dados.tenant.limiteNotasFiscaisMensal || 0,
        valorAdicionalMensal: dados.tenant.valorAdicionalFiscal || 0,
        custoMensalEstimado: dados.tenant.custoFiscalMensalEstimado || 0
      });
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível abrir a empresa."));
    }
  }

  async function atualizarTudo(tenant = selecionado) {
    await Promise.all([carregar(), carregarBi()]);
    if (tenant?.id) await abrirDetalhe(tenant);
  }

  async function salvarConfiguracao(e) {
    e.preventDefault();
    if (!configuracao || salvando) return;
    try {
      setSalvando(true);
      await api.put("/plataforma/tenants/cobranca/configuracao", {
        ...configuracao,
        valorMensalidadePadrao: Number(configuracao.valorMensalidadePadrao || 0),
        custoMensalEstimado: Number(configuracao.custoMensalEstimado || 0),
        diaVencimentoPadrao: Number(configuracao.diaVencimentoPadrao || 10),
        diasAvisoVencimento: Number(configuracao.diasAvisoVencimento || 5),
        diasTeste: Number(configuracao.diasTeste || 0)
      });
      alertaSucesso("Configuração financeira atualizada.");
      await Promise.all([carregarConfiguracao(), atualizarPainel()]);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível salvar a configuração."));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarCobranca(tenant) {
    if (alternandoId) return;
    if (tenant.cobrancaAtiva && !window.confirm(`Alterar ${tenant.nome} para sem cobrança e cancelar valores em aberto?`)) return;
    try {
      setAlternandoId(tenant.id);
      await api.put(`/plataforma/tenants/${tenant.id}/cobranca/alternar`);
      alertaSucesso(tenant.cobrancaAtiva ? "Empresa alterada para sem cobrança." : "Cobrança mensal ativada.");
      await atualizarTudo(selecionado?.id === tenant.id ? tenant : null);
    } catch (erro) {
      const mensagem = mensagemErro(erro, "Não foi possível alterar a cobrança.");
      if (String(mensagem).includes("mensalidade padrao")) setConfigAberta(true);
      alertaErro(mensagem);
    } finally {
      setAlternandoId(null);
    }
  }

  async function salvarEmpresa(e) {
    e.preventDefault();
    if (!selecionado || !edicao || salvando) return;
    try {
      setSalvando(true);
      await api.put(`/plataforma/tenants/${selecionado.id}`, { ...edicao, testeExpiraEm: edicao.testeExpiraEm || null });
      alertaSucesso("Dados da empresa atualizados.");
      await atualizarTudo({ ...selecionado, nome: edicao.nome });
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível atualizar a empresa."));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCobranca(e) {
    e.preventDefault();
    if (!selecionado || !cobrancaEdicao || salvando) return;
    try {
      setSalvando(true);
      await api.put(`/plataforma/tenants/${selecionado.id}/cobranca`, {
        cobrancaAtiva: cobrancaEdicao.cobrancaAtiva,
        valorMensalidade: Number(cobrancaEdicao.valorMensalidade || 0),
        primeiroVencimentoEm: cobrancaEdicao.primeiroVencimentoEm || null
      });
      alertaSucesso("Cobrança atualizada. Mensalidades em aberto foram recalculadas.");
      await atualizarTudo(selecionado);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível atualizar a cobrança."));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFiscal(e) {
    e.preventDefault();
    if (!selecionado || !fiscalEdicao || salvando) return;
    try {
      setSalvando(true);
      await api.put(`/plataforma/tenants/${selecionado.id}/fiscal`, {
        habilitada: fiscalEdicao.habilitada,
        planoFiscalSaasId: fiscalEdicao.planoFiscalSaasId || null,
        planoNome: fiscalEdicao.planoNome,
        limiteNotasMensal: Number(fiscalEdicao.limiteNotasMensal || 0),
        valorAdicionalMensal: Number(fiscalEdicao.valorAdicionalMensal || 0),
        custoMensalEstimado: Number(fiscalEdicao.custoMensalEstimado || 0)
      });
      alertaSucesso("Módulo fiscal atualizado. As mensalidades em aberto foram recalculadas.");
      await atualizarTudo(selecionado);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível atualizar o módulo fiscal."));
    } finally {
      setSalvando(false);
    }
  }

  function editarPlanoFiscal(plano) {
    setPlanoFiscalForm({
      id: plano.id,
      nome: plano.nome || "",
      descricao: plano.descricao || "",
      creditosAcbr: plano.creditosAcbr || 0,
      valorRecargaAcbr: plano.valorRecargaAcbr || 0,
      limiteNotasMensal: plano.limiteNotasMensal || 0,
      valorMensal: plano.valorMensal || 0,
      ativo: !!plano.ativo,
      ordem: plano.ordem || 0
    });
    setPlanosAbertos(true);
  }

  function selecionarPlanoCatalogo(valor) {
    const id = Number(valor || 0);
    const plano = planosFiscais.find((item) => item.id === id);
    if (!plano) {
      setFiscalEdicao((atual) => ({ ...atual, planoFiscalSaasId: null }));
      return;
    }
    setFiscalEdicao((atual) => ({
      ...atual,
      planoFiscalSaasId: plano.id,
      planoNome: plano.nome,
      limiteNotasMensal: plano.limiteNotasMensal,
      valorAdicionalMensal: plano.valorMensal,
      custoMensalEstimado: plano.custoMensalEstimado
    }));
  }

  async function salvarPlanoFiscal(e) {
    e.preventDefault();
    if (salvando) return;
    try {
      setSalvando(true);
      const payload = {
        nome: planoFiscalForm.nome,
        descricao: planoFiscalForm.descricao || null,
        creditosAcbr: Number(planoFiscalForm.creditosAcbr || 0),
        valorRecargaAcbr: Number(planoFiscalForm.valorRecargaAcbr || 0),
        limiteNotasMensal: Number(planoFiscalForm.limiteNotasMensal || 0),
        valorMensal: Number(planoFiscalForm.valorMensal || 0),
        ativo: !!planoFiscalForm.ativo,
        ordem: Number(planoFiscalForm.ordem || 0)
      };
      if (planoFiscalForm.id) {
        await api.put(`/plataforma/tenants/fiscal/planos/${planoFiscalForm.id}`, payload);
      } else {
        await api.post("/plataforma/tenants/fiscal/planos", payload);
      }
      alertaSucesso(planoFiscalForm.id ? "Plano fiscal atualizado." : "Plano fiscal criado.");
      setPlanoFiscalForm(planoFiscalInicial);
      await carregarPlanosFiscais();
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível salvar o plano fiscal."));
    } finally {
      setSalvando(false);
    }
  }

  async function registrarPagamento(mensalidade) {
    if (!window.confirm(`Confirmar o recebimento de ${moeda(mensalidade.valor)}?`)) return;
    try {
      await api.post(`/plataforma/tenants/${selecionado.id}/mensalidades/${mensalidade.id}/pagar`, {
        valorPago: mensalidade.valor,
        observacao: "Pagamento confirmado pelo painel da plataforma"
      });
      alertaSucesso("Pagamento registrado e acesso recalculado.");
      await atualizarTudo(selecionado);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível registrar o pagamento."));
    }
  }

  async function cancelarMensalidade(mensalidade) {
    if (!window.confirm("Cancelar esta mensalidade?")) return;
    try {
      await api.post(`/plataforma/tenants/${selecionado.id}/mensalidades/${mensalidade.id}/cancelar`, {
        observacao: "Mensalidade cancelada pelo painel da plataforma"
      });
      alertaSucesso("Mensalidade cancelada.");
      await atualizarTudo(selecionado);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível cancelar a mensalidade."));
    }
  }

  async function alterarStatus(tenant, novoStatus) {
    try {
      await api.put(`/plataforma/tenants/${tenant.id}/status`, { status: novoStatus, observacao: "Alterado pelo painel da plataforma" });
      alertaSucesso("Status atualizado.");
      await atualizarTudo(tenant);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível alterar o status."));
    }
  }

  async function alternarBloqueio(tenant) {
    const acao = tenant.bloqueado ? "desbloquear" : "bloquear";
    try {
      await api.put(`/plataforma/tenants/${tenant.id}/${acao}`, { observacao: `${acao} pelo painel da plataforma` });
      alertaSucesso(tenant.bloqueado ? "Empresa desbloqueada." : "Empresa bloqueada.");
      await atualizarTudo(tenant);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível alterar o acesso."));
    }
  }

  async function copiarPix(codigo) {
    await navigator.clipboard.writeText(codigo);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 1800);
  }

  async function redefinirSenha(e) {
    e.preventDefault();
    if (!selecionado || salvando) return;
    if (!senhaForm.usuarioId) return alertaErro("Selecione um usuario.");
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) return alertaErro("As senhas nao conferem.");
    if (!window.confirm("Confirmar a redefinicao da senha deste usuario?")) return;
    try {
      setSalvando(true);
      await api.put(`/plataforma/tenants/${selecionado.id}/usuarios/${senhaForm.usuarioId}/senha`, {
        novaSenha: senhaForm.novaSenha
      });
      setSenhaForm((atual) => ({ ...atual, novaSenha: "", confirmarSenha: "" }));
      setMostrarSenha(false);
      alertaSucesso("Senha redefinida com sucesso.");
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Nao foi possivel redefinir a senha."));
    } finally {
      setSalvando(false);
    }
  }

  function sair() {
    const email = localStorage.getItem("loginEmail");
    localStorage.clear();
    if (email) localStorage.setItem("loginEmail", email);
    navigate("/login");
  }

  const temMovimentoFinanceiro = (bi?.evolucao || []).some((item) =>
    Number(item.faturado) > 0 || Number(item.recebido) > 0 || Number(item.emAberto) > 0
  );

  return (
    <main className="platform-page platform-pro">
      <header className="platform-topbar">
        <div>
          <span>Administração da plataforma</span>
          <h1>Gestão SaaS</h1>
          <p>Visão financeira, saúde da carteira e controle dos acessos.</p>
        </div>
        <div className="platform-header-actions">
          <button className="btn btn-light" onClick={atualizarPainel} disabled={carregando}>{carregando ? "Atualizando..." : "Atualizar"}</button>
          <button className="btn btn-outline-dark" onClick={sair}>Sair</button>
        </div>
      </header>

      <nav className="platform-view-tabs" aria-label="Áreas do painel">
        <button className={aba === "visao" ? "active" : ""} onClick={() => setAba("visao")}>Visão geral</button>
        <button className={aba === "empresas" ? "active" : ""} onClick={() => setAba("empresas")}>Empresas <span>{indicadores.clientesSaas || 0}</span></button>
      </nav>

      {aba === "visao" && (
        <section className="platform-overview">
          <div className="platform-bi-kpis">
            <article className="bi-kpi bi-kpi-primary"><span>Receita recorrente</span><strong>{moeda(indicadores.receitaRecorrente)}</strong><small>{indicadores.pagantes || 0} clientes pagantes</small></article>
            <article className="bi-kpi bi-kpi-profit"><span>Lucro estimado</span><strong>{moeda(indicadores.lucroEstimado)}</strong><small>Margem de {percentual(indicadores.margemEstimada)}</small></article>
            <article className="bi-kpi"><span>Recebido no mês</span><strong>{moeda(indicadores.recebidoMes)}</strong><small>{moeda(indicadores.aReceberMes)} a receber</small></article>
            <article className="bi-kpi bi-kpi-danger"><span>Saldo vencido</span><strong>{moeda(indicadores.saldoVencido)}</strong><small>{indicadores.inadimplentes || 0} inadimplentes</small></article>
            <article className="bi-kpi"><span>Clientes SaaS</span><strong>{indicadores.clientesSaas || 0}</strong><small>{indicadores.semCobranca || 0} sem cobrança</small></article>
            <article className="bi-kpi"><span>Inadimplência</span><strong>{percentual(indicadores.taxaInadimplencia)}</strong><small>Ticket médio {moeda(indicadores.ticketMedio)}</small></article>
          </div>

          <div className="platform-bi-grid">
            <section className="platform-bi-panel platform-revenue-chart">
              <header><div><span>Desempenho financeiro</span><h2>Faturamento dos últimos 12 meses</h2></div><small>Valores por competência</small></header>
              <div className="platform-chart-body">
                {temMovimentoFinanceiro ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bi?.evolucao || []} margin={{ top: 10, right: 10, left: 6, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e9ed" />
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickFormatter={(valor) => moeda(valor).replace(",00", "")} tickLine={false} axisLine={false} fontSize={11} width={72} />
                      <Tooltip formatter={(valor, nome) => [moeda(valor), nome]} cursor={{ fill: "#f2f4f6" }} />
                      <Bar dataKey="faturado" name="Faturado" fill="#5d2440" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="recebido" name="Recebido" fill="#148653" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="emAberto" name="Em aberto" fill="#d2ad55" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="bi-chart-empty">Ainda não há faturamento registrado no período.</div>
                )}
              </div>
              {temMovimentoFinanceiro && <footer><span><i className="legend-billed" />Faturado</span><span><i className="legend-paid" />Recebido</span><span><i className="legend-open" />Em aberto</span></footer>}
            </section>

            <section className="platform-bi-panel platform-portfolio-chart">
              <header><div><span>Carteira</span><h2>Situação dos clientes</h2></div></header>
              <div className="platform-donut-wrap">
                <div className="platform-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bi?.distribuicao || []} dataKey="valor" nameKey="nome" innerRadius={64} outerRadius={91} paddingAngle={2} stroke="none">
                        {(bi?.distribuicao || []).map((item, index) => <Cell key={item.nome} fill={coresCarteira[index % coresCarteira.length]} />)}
                      </Pie>
                      <Tooltip formatter={(valor) => [valor, "Clientes"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div><strong>{totalCarteira}</strong><span>clientes</span></div>
                </div>
                <div className="platform-portfolio-legend">
                  {(bi?.distribuicao || []).map((item, index) => <div key={item.nome}><i style={{ background: coresCarteira[index] }} /><span>{item.nome}</span><strong>{item.valor}</strong></div>)}
                </div>
              </div>
            </section>
          </div>

          <div className="platform-health-strip">
            <div><span>Clientes em dia</span><strong>{indicadores.emDia || 0}</strong></div>
            <div><span>Vencem em breve</span><strong>{indicadores.vencendo || 0}</strong></div>
            <div><span>Em período de teste</span><strong>{indicadores.emTeste || 0}</strong></div>
            <div><span>Usuários ativos</span><strong>{indicadores.usuariosAtivos || 0}</strong></div>
            <div><span>Clientes atendidos</span><strong>{indicadores.clientesAtendidos || 0}</strong></div>
            <div><span>Atendimentos processados</span><strong>{indicadores.atendimentos || 0}</strong></div>
            <div><span>Empresas com fiscal</span><strong>{indicadores.empresasComFiscal || 0}</strong></div>
            <div><span>Receita fiscal mensal</span><strong>{moeda(indicadores.receitaFiscalRecorrente)}</strong></div>
          </div>

          <div className="platform-bi-lists">
            <section className="platform-bi-panel">
              <header><div><span>Ação necessária</span><h2>Inadimplentes</h2></div><strong className="bi-count-danger">{bi?.inadimplentes?.length || 0}</strong></header>
              <div className="bi-compact-list">
                {bi?.inadimplentes?.length === 0 && <p className="bi-empty">Nenhum cliente inadimplente.</p>}
                {bi?.inadimplentes?.map((item) => <button key={item.tenantId} onClick={() => { setAba("empresas"); const tenant = tenants.find((x) => x.id === item.tenantId); if (tenant) abrirDetalhe(tenant); }}><span><strong>{item.empresa}</strong><small>{item.diasEmAtraso} dias em atraso</small></span><strong>{moeda(item.saldo)}</strong></button>)}
              </div>
            </section>

            <section className="platform-bi-panel">
              <header><div><span>Agenda financeira</span><h2>Próximos vencimentos</h2></div></header>
              <div className="bi-compact-list">
                {bi?.proximosVencimentos?.length === 0 && <p className="bi-empty">Nenhum vencimento programado.</p>}
                {bi?.proximosVencimentos?.map((item) => <button key={`${item.tenantId}-${item.vencimento}`} onClick={() => { setAba("empresas"); const tenant = tenants.find((x) => x.id === item.tenantId); if (tenant) abrirDetalhe(tenant); }}><span><strong>{item.empresa}</strong><small>{data(item.vencimento)} · {item.diasParaVencer} dias</small></span><strong>{moeda(item.valor)}</strong></button>)}
              </div>
            </section>

            <section className="platform-bi-panel">
              <header><div><span>Caixa</span><h2>Pagamentos recentes</h2></div></header>
              <div className="bi-compact-list">
                {bi?.pagamentosRecentes?.length === 0 && <p className="bi-empty">Nenhum pagamento registrado.</p>}
                {bi?.pagamentosRecentes?.map((item) => <div key={`${item.tenantId}-${item.pagoEm}`}><span><strong>{item.empresa}</strong><small>{dataHora(item.pagoEm)}</small></span><strong className="bi-value-positive">+ {moeda(item.valor)}</strong></div>)}
              </div>
            </section>
          </div>
        </section>
      )}

      {aba === "empresas" && (
        <section className="platform-companies-view">
          {configuracao && (
            <details className="platform-billing-settings" open={configAberta} onToggle={(e) => setConfigAberta(e.currentTarget.open)}>
              <summary><span>Configuração financeira</span><small>PIX, mensalidade padrão, custos e vencimentos</small></summary>
              <form onSubmit={salvarConfiguracao}>
                <label>Chave PIX<input className="form-control" value={configuracao.pixChave} onChange={(e) => setConfiguracao((x) => ({ ...x, pixChave: e.target.value }))} placeholder="CNPJ, e-mail, telefone ou chave aleatória" /></label>
                <label>Beneficiário no PIX<input className="form-control" maxLength={25} value={configuracao.pixBeneficiario} onChange={(e) => setConfiguracao((x) => ({ ...x, pixBeneficiario: e.target.value }))} /></label>
                <label>Cidade do beneficiário<input className="form-control" maxLength={15} value={configuracao.pixCidade} onChange={(e) => setConfiguracao((x) => ({ ...x, pixCidade: e.target.value }))} /></label>
                <label>Mensalidade padrão<input type="number" min="0" step="0.01" className="form-control" value={configuracao.valorMensalidadePadrao} onChange={(e) => setConfiguracao((x) => ({ ...x, valorMensalidadePadrao: e.target.value }))} /></label>
                <label>Custo mensal estimado<input type="number" min="0" step="0.01" className="form-control" value={configuracao.custoMensalEstimado} onChange={(e) => setConfiguracao((x) => ({ ...x, custoMensalEstimado: e.target.value }))} /></label>
                <label>Dia padrão de vencimento<input type="number" min="1" max="28" className="form-control" value={configuracao.diaVencimentoPadrao} onChange={(e) => setConfiguracao((x) => ({ ...x, diaVencimentoPadrao: e.target.value }))} /></label>
                <label>Avisar antes do vencimento<input type="number" min="1" max="30" className="form-control" value={configuracao.diasAvisoVencimento} onChange={(e) => setConfiguracao((x) => ({ ...x, diasAvisoVencimento: e.target.value }))} /></label>
                <label>Dias de teste para novas contas<input type="number" min="0" max="90" className="form-control" value={configuracao.diasTeste} onChange={(e) => setConfiguracao((x) => ({ ...x, diasTeste: e.target.value }))} /></label>
                <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar configuração"}</button>
              </form>
            </details>
          )}

          <details className="platform-billing-settings platform-fiscal-catalog" open={planosAbertos} onToggle={(e) => {
            setPlanosAbertos(e.currentTarget.open);
            if (e.currentTarget.open && !cotaAcbr && !carregandoCota) carregarCotaAcbr();
          }}>
            <summary><span>Planos fiscais ACBr</span><small>Recargas, preços de venda e planos disponíveis para contratação</small></summary>
            <div className="platform-fiscal-catalog-body">
              <section className="platform-acbr-balance">
                <div>
                  <span>Saldo da conta ACBr</span>
                  <strong>{carregandoCota ? "Consultando..." : cotaAcbr?.disponiveis != null ? `${inteiro(cotaAcbr.disponiveis)} créditos` : "Indisponível"}</strong>
                  {cotaAcbr?.limite != null && <small>{inteiro(cotaAcbr.consumo)} consumidos de {inteiro(cotaAcbr.limite)}</small>}
                  {erroCotaAcbr && <small className="text-danger">{erroCotaAcbr}</small>}
                </div>
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={carregarCotaAcbr} disabled={carregandoCota}>Atualizar saldo</button>
              </section>

              <div className="platform-fiscal-catalog-actions">
                <div><strong>{planoFiscalForm.id ? `Editando ${planoFiscalForm.nome}` : "Novo plano fiscal"}</strong><span>O custo da recarga é interno; a clínica vê apenas limite e mensalidade.</span></div>
                {planoFiscalForm.id && <button type="button" className="btn btn-sm btn-light" onClick={() => setPlanoFiscalForm(planoFiscalInicial)}>Novo plano</button>}
              </div>

              <form className="platform-fiscal-plan-form" onSubmit={salvarPlanoFiscal}>
                <label>Nome do plano<input className="form-control" value={planoFiscalForm.nome} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, nome: e.target.value }))} placeholder="Ex.: Fiscal Essencial" required /></label>
                <label>Créditos da recarga ACBr<input type="number" min="1" step="1" list="faixas-acbr-catalogo" className="form-control" value={planoFiscalForm.creditosAcbr} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, creditosAcbr: e.target.value }))} required /></label>
                <datalist id="faixas-acbr-catalogo"><option value="1000" /><option value="2000" /><option value="5000" /><option value="10000" /><option value="20000" /><option value="50000" /></datalist>
                <label>Valor pago na recarga<input type="number" min="0" step="0.01" className="form-control" value={planoFiscalForm.valorRecargaAcbr} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, valorRecargaAcbr: e.target.value }))} required /></label>
                <label>Limite mensal da clínica<input type="number" min="1" step="1" className="form-control" value={planoFiscalForm.limiteNotasMensal} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, limiteNotasMensal: e.target.value }))} required /></label>
                <label>Mensalidade do plano<input type="number" min="0" step="0.01" className="form-control" value={planoFiscalForm.valorMensal} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, valorMensal: e.target.value }))} required /></label>
                <label>Ordem de exibição<input type="number" min="0" step="1" className="form-control" value={planoFiscalForm.ordem} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, ordem: e.target.value }))} /></label>
                <label className="platform-check"><input type="checkbox" checked={!!planoFiscalForm.ativo} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, ativo: e.target.checked }))} /><span>Disponível para contratação</span></label>
                <label className="platform-fiscal-plan-description">Descrição<textarea className="form-control" rows="2" value={planoFiscalForm.descricao} onChange={(e) => setPlanoFiscalForm((x) => ({ ...x, descricao: e.target.value }))} placeholder="Opcional" /></label>
                <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : planoFiscalForm.id ? "Salvar plano" : "Criar plano"}</button>
              </form>

              <div className="platform-fiscal-plan-list">
                {planosFiscais.map((plano) => (
                  <article key={plano.id}>
                    <div><strong>{plano.nome}</strong><span className={plano.ativo ? "fiscal-catalog-active" : "fiscal-catalog-draft"}>{plano.ativo ? "Publicado" : "Rascunho"}</span></div>
                    <div><span>Recarga ACBr</span><strong>{inteiro(plano.creditosAcbr)} · {moeda(plano.valorRecargaAcbr)}</strong></div>
                    <div><span>Oferta à clínica</span><strong>{inteiro(plano.limiteNotasMensal)} · {moeda(plano.valorMensal)}/mês</strong></div>
                    <div><span>Margem estimada</span><strong className={plano.margemMensalEstimada >= 0 ? "text-success" : "text-danger"}>{moeda(plano.margemMensalEstimada)}</strong></div>
                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => editarPlanoFiscal(plano)}>Editar</button>
                  </article>
                ))}
              </div>
            </div>
          </details>

          <section className="platform-workspace">
            <div className="platform-list-panel">
              <header className="platform-company-heading"><div><span>Carteira de clientes</span><h2>Empresas cadastradas</h2></div><strong>{tenants.length}</strong></header>
              <div className="platform-filters">
                <input className="form-control" placeholder="Buscar empresa, responsável ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <select className="form-select" value={situacao} onChange={(e) => setSituacao(e.target.value)}><option value="">Todas as situações</option>{situacoes.map(([codigo, rotulo]) => <option key={codigo} value={codigo}>{rotulo}</option>)}</select>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os acessos</option>{statusOpcoes.map((item) => <option key={item}>{item}</option>)}</select>
              </div>

              <div className="platform-company-columns"><span>Empresa</span><span>Mensalidade</span><span>Financeiro</span><span>Acesso</span><span /></div>
              <div className="platform-company-list">
                {carregando && <div className="platform-empty">Carregando empresas...</div>}
                {!carregando && tenants.length === 0 && <div className="platform-empty">Nenhuma empresa encontrada.</div>}
                {tenants.map((tenant) => (
                  <article className={`platform-company-row ${selecionado?.id === tenant.id ? "selected" : ""}`} key={tenant.id}>
                    <button className="platform-company-identity" onClick={() => abrirDetalhe(tenant)}>
                      <span className="platform-tenant-avatar">{tenant.nome?.slice(0, 2).toUpperCase()}</span>
                      <span><strong>{tenant.nome}</strong><small>{tenant.responsavelEmail}</small></span>
                    </button>
                    <div><strong>{tenant.cobrancaAtiva ? moeda(tenant.valorMensalTotal ?? tenant.valorMensalidade) : "-"}</strong><small>{tenant.emissaoFiscalHabilitada ? `Fiscal: ${tenant.emissoesFiscaisMes}/${tenant.limiteNotasFiscaisMensal}` : tenant.proximoVencimento ? `Vence ${data(tenant.proximoVencimento)}` : tenant.cobrancaAtiva ? "Aguardando geração" : "Não faturado"}</small></div>
                    <div><span className={`financial-status financial-${tenant.situacaoFinanceira?.toLowerCase()}`}>{rotuloSituacao(tenant.situacaoFinanceira)}</span>{tenant.saldoVencido > 0 && <small>{moeda(tenant.saldoVencido)} · {tenant.diasEmAtraso} dias</small>}</div>
                    <div><span className={`subscription-status status-${tenant.statusAssinatura?.toLowerCase()}`}>{tenant.statusAssinatura}</span></div>
                    <div className="platform-company-actions">
                      <button type="button" className={`billing-toggle ${tenant.cobrancaAtiva ? "active" : ""}`} aria-pressed={tenant.cobrancaAtiva} disabled={alternandoId === tenant.id} onClick={() => alternarCobranca(tenant)}><i />{alternandoId === tenant.id ? "Alterando..." : tenant.cobrancaAtiva ? "Cobrança" : "Sem cobrança"}</button>
                      <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => abrirDetalhe(tenant)}>Detalhes</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="platform-detail">
              {!detalhe && <div className="platform-empty"><strong>Detalhes da empresa</strong><span>Selecione um cliente para gerenciar cobrança, acesso e mensalidades.</span></div>}
              {detalhe && (
                <>
                  <header className="platform-detail-title"><span>Empresa #{detalhe.tenant.id}</span><h2>{detalhe.tenant.nome}</h2><p>{detalhe.tenant.responsavelNome}<br />{detalhe.tenant.responsavelEmail}</p></header>
                  <div className="platform-access-control">
                    <label>Status de acesso<select className="form-select" value={detalhe.tenant.statusAssinatura} onChange={(e) => alterarStatus(detalhe.tenant, e.target.value)}>{statusOpcoes.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <button className={`btn ${detalhe.tenant.bloqueado ? "btn-success" : "btn-outline-danger"}`} onClick={() => alternarBloqueio(detalhe.tenant)}>{detalhe.tenant.bloqueado ? "Desbloquear acesso" : "Bloquear acesso"}</button>
                  </div>
                  <dl><div><dt>Cadastro</dt><dd>{dataHora(detalhe.tenant.criadoEm)}</dd></div><div><dt>Último login</dt><dd>{dataHora(detalhe.tenant.ultimoLoginEm)}</dd></div><div><dt>Fim do teste</dt><dd>{dataHora(detalhe.tenant.testeExpiraEm)}</dd></div></dl>

                  <h3>Cobrança mensal</h3>
                  <form className="platform-edit-form platform-billing-form" onSubmit={salvarCobranca}>
                    <label className="platform-check"><input type="checkbox" checked={!!cobrancaEdicao?.cobrancaAtiva} onChange={(e) => setCobrancaEdicao((x) => ({ ...x, cobrancaAtiva: e.target.checked }))} /><span>Cliente pagante</span></label>
                    <label>Mensalidade base da empresa<input type="number" min="0" step="0.01" className="form-control" value={cobrancaEdicao?.valorMensalidade ?? 0} onChange={(e) => setCobrancaEdicao((x) => ({ ...x, valorMensalidade: e.target.value }))} /></label>
                    <label>Primeiro vencimento<input type="date" className="form-control" value={cobrancaEdicao?.primeiroVencimentoEm || ""} onChange={(e) => setCobrancaEdicao((x) => ({ ...x, primeiroVencimentoEm: e.target.value }))} /></label>
                    <div className="platform-custom-price">
                      <small>Valor padrão da plataforma: <strong>{moeda(configuracao?.valorMensalidadePadrao)}</strong>. Este campo pode ter um valor diferente para cada empresa.</small>
                      <button type="button" className="btn btn-sm btn-light" onClick={() => setCobrancaEdicao((x) => ({ ...x, valorMensalidade: configuracao?.valorMensalidadePadrao || 0 }))}>Usar valor padrão</button>
                    </div>
                    <small>As próximas mensalidades repetem o mesmo dia a cada mês. Ao mudar o valor, mensalidades pendentes ou vencidas também são atualizadas.</small>
                    <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar cobrança"}</button>
                  </form>

                  <h3>Módulo fiscal ACBr</h3>
                  <form className="platform-edit-form platform-fiscal-form" onSubmit={salvarFiscal}>
                    <label className="platform-check">
                      <input type="checkbox" checked={!!fiscalEdicao?.habilitada} onChange={(e) => setFiscalEdicao((x) => ({ ...x, habilitada: e.target.checked }))} />
                      <span>Emissão fiscal contratada</span>
                    </label>
                    <label>Plano do catálogo<select className="form-select" value={fiscalEdicao?.planoFiscalSaasId || ""} onChange={(e) => selecionarPlanoCatalogo(e.target.value)}><option value="">Plano personalizado</option>{planosFiscais.filter((plano) => plano.ativo || plano.id === fiscalEdicao?.planoFiscalSaasId).map((plano) => <option key={plano.id} value={plano.id}>{plano.nome} - {moeda(plano.valorMensal)}/mês</option>)}</select></label>
                    <label>Nome do plano<input className="form-control" value={fiscalEdicao?.planoNome || ""} disabled={!!fiscalEdicao?.planoFiscalSaasId} onChange={(e) => setFiscalEdicao((x) => ({ ...x, planoNome: e.target.value }))} placeholder="Ex.: Fiscal 1.000" /></label>
                    <label>Limite de emissões por mês<input type="number" min="0" step="1" list="faixas-acbr" className="form-control" value={fiscalEdicao?.limiteNotasMensal ?? 0} disabled={!!fiscalEdicao?.planoFiscalSaasId} onChange={(e) => setFiscalEdicao((x) => ({ ...x, limiteNotasMensal: e.target.value }))} /></label>
                    <datalist id="faixas-acbr"><option value="1000" /><option value="2000" /><option value="5000" /><option value="10000" /><option value="20000" /><option value="50000" /></datalist>
                    <label>Adicional mensal cobrado<input type="number" min="0" step="0.01" className="form-control" value={fiscalEdicao?.valorAdicionalMensal ?? 0} disabled={!!fiscalEdicao?.planoFiscalSaasId} onChange={(e) => setFiscalEdicao((x) => ({ ...x, valorAdicionalMensal: e.target.value }))} /></label>
                    <label>Custo ACBr estimado para esta empresa<input type="number" min="0" step="0.01" className="form-control" value={fiscalEdicao?.custoMensalEstimado ?? 0} disabled={!!fiscalEdicao?.planoFiscalSaasId} onChange={(e) => setFiscalEdicao((x) => ({ ...x, custoMensalEstimado: e.target.value }))} /></label>
                    <div className="platform-fiscal-summary">
                      <div><span>Uso no mês</span><strong>{detalhe.fiscal?.emissoesMes || 0} / {fiscalEdicao?.limiteNotasMensal || 0}</strong></div>
                      <div><span>Mensalidade total</span><strong>{moeda(Number(cobrancaEdicao?.valorMensalidade || 0) + (fiscalEdicao?.habilitada ? Number(fiscalEdicao?.valorAdicionalMensal || 0) : 0))}</strong></div>
                      <div><span>Configuração do CNPJ</span><strong>{detalhe.fiscal?.configuracaoConcluida ? "Concluída" : "Pendente"}</strong></div>
                    </div>
                    <small>Selecione um plano publicado ou use o modo personalizado para uma condição comercial específica desta empresa.</small>
                    <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar módulo fiscal"}</button>
                  </form>

                  <h3>Mensalidades</h3>
                  <div className="platform-invoices">
                    {detalhe.mensalidades?.length === 0 && <p>Nenhuma mensalidade gerada.</p>}
                    {detalhe.mensalidades?.map((mensalidade) => (
                      <article key={mensalidade.id} className={`platform-invoice invoice-${mensalidade.status.toLowerCase()}`}>
                        <div><strong>{data(mensalidade.competencia).slice(3)}</strong><span>Vence {data(mensalidade.vencimento)}</span></div><div><strong>{moeda(mensalidade.valor)}</strong><span>{mensalidade.status}</span></div>
                        {(mensalidade.status === "Pendente" || mensalidade.status === "Vencida") && <div className="platform-invoice-actions">{mensalidade.pixCopiaECola && <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setPixEmExibicao(pixEmExibicao === mensalidade.id ? null : mensalidade.id)}>PIX</button>}<button type="button" className="btn btn-sm btn-success" onClick={() => registrarPagamento(mensalidade)}>Dar baixa</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cancelarMensalidade(mensalidade)}>Cancelar</button></div>}
                        {mensalidade.status === "Paga" && <small>Pago em {dataHora(mensalidade.pagoEm)} · {moeda(mensalidade.valorPago)}</small>}
                        {pixEmExibicao === mensalidade.id && mensalidade.pixCopiaECola && <div className="platform-invoice-pix"><QRCodeSVG value={mensalidade.pixCopiaECola} size={176} level="M" /><button type="button" className="btn btn-primary btn-sm" onClick={() => copiarPix(mensalidade.pixCopiaECola)}>{pixCopiado ? "Copiado" : "Copiar PIX"}</button></div>}
                      </article>
                    ))}
                  </div>

                  <details className="platform-detail-section platform-users-section">
                    <summary>Usuarios e senhas</summary>
                    <div className="platform-users-list">
                      {detalhe.usuarios?.map((usuario) => (
                        <div key={usuario.id}>
                          <span><strong>{usuario.nome}</strong><small>{usuario.email} · {usuario.perfil}</small></span>
                          <span className={usuario.ativo ? "user-active" : "user-inactive"}>{usuario.ativo ? "Ativo" : "Inativo"}</span>
                        </div>
                      ))}
                    </div>
                    <form className="platform-edit-form platform-password-form" onSubmit={redefinirSenha}>
                      <label>Usuario<select className="form-select" value={senhaForm.usuarioId} onChange={(e) => setSenhaForm((x) => ({ ...x, usuarioId: e.target.value }))} required><option value="">Selecione o usuario</option>{detalhe.usuarios?.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome} - {usuario.email}</option>)}</select></label>
                      <label>Nova senha<input type={mostrarSenha ? "text" : "password"} className="form-control" minLength="8" value={senhaForm.novaSenha} onChange={(e) => setSenhaForm((x) => ({ ...x, novaSenha: e.target.value }))} autoComplete="new-password" required /></label>
                      <label>Confirmar nova senha<input type={mostrarSenha ? "text" : "password"} className="form-control" minLength="8" value={senhaForm.confirmarSenha} onChange={(e) => setSenhaForm((x) => ({ ...x, confirmarSenha: e.target.value }))} autoComplete="new-password" required /></label>
                      <label className="platform-check"><input type="checkbox" checked={mostrarSenha} onChange={(e) => setMostrarSenha(e.target.checked)} /><span>Mostrar senha digitada</span></label>
                      <small>A senha deve ter pelo menos 8 caracteres, com letras e numeros.</small>
                      <button className="btn btn-primary" disabled={salvando}>{salvando ? "Redefinindo..." : "Redefinir senha"}</button>
                    </form>
                  </details>

                  <details className="platform-detail-section"><summary>Dados cadastrais</summary><form className="platform-edit-form" onSubmit={salvarEmpresa}><label>Empresa<input className="form-control" value={edicao?.nome || ""} onChange={(e) => setEdicao((x) => ({ ...x, nome: e.target.value }))} required /></label><label>Responsável<input className="form-control" value={edicao?.responsavelNome || ""} onChange={(e) => setEdicao((x) => ({ ...x, responsavelNome: e.target.value }))} required /></label><label>E-mail<input type="email" className="form-control" value={edicao?.responsavelEmail || ""} onChange={(e) => setEdicao((x) => ({ ...x, responsavelEmail: e.target.value }))} required /></label><label>Telefone<input className="form-control" value={edicao?.telefone || ""} onChange={(e) => setEdicao((x) => ({ ...x, telefone: e.target.value }))} /></label><label>Fim do teste<input type="datetime-local" className="form-control" value={edicao?.testeExpiraEm || ""} onChange={(e) => setEdicao((x) => ({ ...x, testeExpiraEm: e.target.value }))} /></label><button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar dados"}</button></form></details>
                  <details className="platform-detail-section"><summary>Histórico de acesso</summary><div className="platform-history">{detalhe.historico?.length === 0 && <p>Nenhuma alteração registrada.</p>}{detalhe.historico?.map((item) => <article key={item.id}><strong>{item.statusAnterior} → {item.statusNovo}</strong><span>{dataHora(item.alteradoEm)}</span>{item.observacao && <p>{item.observacao}</p>}</article>)}</div></details>
                </>
              )}
            </aside>
          </section>
        </section>
      )}
    </main>
  );
}

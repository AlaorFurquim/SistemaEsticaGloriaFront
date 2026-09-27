import CampoComMascara from "../components/CampoComMascara";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api";
import EmpresaLocalidade from "../components/EmpresaLocalidade";
import Atualizacoes from "../components/Atualizacoes";
import CampoSenha from "../components/CampoSenha";
import { validarNovaSenha } from "../utils/passwordPolicy";
import { useSessao } from "../components/SessaoProvider";
import MoneyInput from "../components/MoneyInput";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarMoeda, mascaraCpfCnpj } from "../utils/masks";
import { payloadEmpresa } from "../utils/empresaPayload";

const statusOpcoes = ["Ativo", "Teste", "Pendente", "Bloqueado", "Cancelado"];
const situacoes = [["EmDia", "Em dia"], ["VenceEmBreve", "Vence em breve"], ["Atrasada", "Inadimplente"], ["SemCobranca", "Sem cobrança"]];
const coresCarteira = ["#6f4cff", "#f59e0b", "#ef4444", "#64748b"];

const data = valor => valor ? new Date(valor).toLocaleDateString("pt-BR") : "-";
const dataHora = valor => valor ? new Date(valor).toLocaleString("pt-BR") : "Sem registro";
const dataHoraInput = valor => valor ? new Date(valor).toISOString().slice(0, 16) : "";
const percentual = valor => `${Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const rotuloSituacao = valor => situacoes.find(([codigo]) => codigo === valor)?.[1] || valor || "-";
const mensagemErro = (erro, padrao) => {
  const dados = erro.response?.data;
  return typeof dados === "string" ? dados : dados?.mensagem || Object.values(dados?.errors || {}).flat().join(" ") || dados?.title || padrao;
};

function situacaoEmpresa(empresa) {
  if (!empresa.cobrancaAtiva) return "SemCobranca";
  const mensalidades = empresa.mensalidades || [];
  if (mensalidades.some(x => x.status === "Vencida")) return "Atrasada";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 7);

  if (mensalidades.some(x => x.status === "Pendente" && new Date(x.vencimento) <= limite)) return "VenceEmBreve";
  return "EmDia";
}

function diasAtraso(empresa) {
  const vencida = (empresa.mensalidades || [])
    .filter(x => x.status === "Vencida")
    .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))[0];
  if (!vencida) return 0;
  return Math.max(1, Math.floor((Date.now() - new Date(vencida.vencimento).getTime()) / 86400000));
}

function saldoVencido(empresa) {
  return (empresa.mensalidades || [])
    .filter(x => x.status === "Vencida")
    .reduce((total, item) => total + Number(item.valor || 0), 0);
}

export default function PlataformaAdminPanel() {
  const { sair: encerrarSessao } = useSessao();
  const navigate = useNavigate();
  const [aba, setAba] = useState("visao");
  const [empresas, setEmpresas] = useState([]);
  const [configuracao, setConfiguracao] = useState(null);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [situacao, setSituacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [edicao, setEdicao] = useState(null);
  const [cobrancaEdicao, setCobrancaEdicao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [alternandoId, setAlternandoId] = useState(null);
  const [pixEmExibicao, setPixEmExibicao] = useState(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [senhaForm, setSenhaForm] = useState({ usuarioId: "", novaSenha: "", confirmarSenha: "" });

  const empresasEnriquecidas = useMemo(() => empresas.map(empresa => {
    const situacaoFinanceira = situacaoEmpresa(empresa);
    const proxima = (empresa.mensalidades || [])
      .filter(x => ["Pendente", "Vencida"].includes(x.status))
      .sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento))[0];

    return {
      ...empresa,
      situacaoFinanceira,
      saldoVencido: saldoVencido(empresa),
      diasEmAtraso: diasAtraso(empresa),
      proximoVencimento: proxima?.vencimento || null,
      valorMensalTotal: Number(empresa.valorMensalTotal ?? empresa.valorMensalidade ?? 0),
      bloqueado: empresa.bloqueadoPorInadimplencia || empresa.statusAssinatura === "Bloqueado"
    };
  }), [empresas, configuracao]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return empresasEnriquecidas.filter(empresa => {
      const bateBusca = !termo || [empresa.nome, empresa.responsavelNome, empresa.responsavelEmail, empresa.email].some(valor => String(valor || "").toLowerCase().includes(termo));
      return bateBusca && (!status || empresa.statusAssinatura === status) && (!situacao || empresa.situacaoFinanceira === situacao);
    });
  }, [busca, empresasEnriquecidas, situacao, status]);

  const bi = useMemo(() => {
    const mensalidades = empresasEnriquecidas.flatMap(empresa => (empresa.mensalidades || []).map(mensalidade => ({ ...mensalidade, empresa: empresa.nome, empresaId: empresa.id })));
    const hoje = new Date();
    const recebidoMes = mensalidades.filter(x => x.pagoEm && new Date(x.pagoEm).getMonth() === hoje.getMonth() && new Date(x.pagoEm).getFullYear() === hoje.getFullYear()).reduce((total, item) => total + Number(item.valorPago || item.valor || 0), 0);
    const aReceberMes = mensalidades.filter(x => ["Pendente", "Vencida"].includes(x.status)).reduce((total, item) => total + Number(item.valor || 0), 0);
    const saldoVencidoTotal = empresasEnriquecidas.reduce((total, empresa) => total + empresa.saldoVencido, 0);
    const receitaRecorrente = empresasEnriquecidas.filter(x => x.ativo && x.cobrancaAtiva && x.statusAssinatura !== "Cancelado").reduce((total, empresa) => total + Number(empresa.valorMensalTotal || 0), 0);
    const pagantes = empresasEnriquecidas.filter(x => x.cobrancaAtiva && x.statusAssinatura !== "Cancelado").length;
    const inadimplentes = empresasEnriquecidas.filter(x => x.situacaoFinanceira === "Atrasada").length;
    const ticketMedio = pagantes ? receitaRecorrente / pagantes : 0;
    const custoEstimado = pagantes * 20;

    return {
      indicadores: {
        receitaRecorrente,
        lucroEstimado: receitaRecorrente - custoEstimado,
        margemEstimada: receitaRecorrente ? ((receitaRecorrente - custoEstimado) / receitaRecorrente) * 100 : 0,
        recebidoMes,
        aReceberMes,
        saldoVencido: saldoVencidoTotal,
        inadimplentes,
        clientesSaas: empresasEnriquecidas.length,
        semCobranca: empresasEnriquecidas.filter(x => !x.cobrancaAtiva).length,
        taxaInadimplencia: pagantes ? (inadimplentes / pagantes) * 100 : 0,
        ticketMedio,
        pagantes,
        emTeste: empresasEnriquecidas.filter(x => x.statusAssinatura === "Teste").length,
        bloqueados: empresasEnriquecidas.filter(x => x.bloqueado).length,
        ativos: empresasEnriquecidas.filter(x => x.statusAssinatura === "Ativo").length
      },
      distribuicao: situacoes.map(([codigo, nome]) => ({ name: nome, value: empresasEnriquecidas.filter(x => x.situacaoFinanceira === codigo).length })),
      evolucao: Array.from({ length: 6 }).map((_, index) => {
        const ref = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - index), 1);
        const pagas = mensalidades.filter(x => x.pagoEm && new Date(x.pagoEm).getMonth() === ref.getMonth() && new Date(x.pagoEm).getFullYear() === ref.getFullYear());
        return {
          mes: ref.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          faturado: receitaRecorrente,
          recebido: pagas.reduce((total, item) => total + Number(item.valorPago || item.valor || 0), 0),
          emAberto: index === 5 ? aReceberMes : 0
        };
      }),
      inadimplentes: empresasEnriquecidas.filter(x => x.situacaoFinanceira === "Atrasada").slice(0, 5).map(x => ({ tenantId: x.id, empresa: x.nome, diasEmAtraso: x.diasEmAtraso, saldo: x.saldoVencido })),
      proximosVencimentos: mensalidades.filter(x => x.status === "Pendente").sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento)).slice(0, 5).map(x => ({ tenantId: x.empresaId, empresa: x.empresa, vencimento: x.vencimento, valor: x.valor, diasParaVencer: Math.ceil((new Date(x.vencimento) - hoje) / 86400000) })),
      pagamentosRecentes: mensalidades.filter(x => x.pagoEm).sort((a, b) => new Date(b.pagoEm) - new Date(a.pagoEm)).slice(0, 5).map(x => ({ tenantId: x.empresaId, empresa: x.empresa, pagoEm: x.pagoEm, valor: x.valorPago || x.valor }))
    };
  }, [empresasEnriquecidas]);

  const indicadores = bi.indicadores;
  const totalCarteira = bi.distribuicao.reduce((total, item) => total + Number(item.value || 0), 0);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const [empresasRes, configRes] = await Promise.all([api.get("/administracao/empresas"), api.get("/administracao/plataforma/configuracao")]);
      setEmpresas(empresasRes.data || []);
      setConfiguracao(configRes.data || {});
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível carregar as empresas."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function vincularFiscal(empresa) {
    try {
      const { data } = await api.put(`/administracao/empresas/${empresa.id}/fiscal`);
      await alertaSucesso(`Emissão vinculada a ${data.nomeFiscal} — CNPJ ${mascaraCpfCnpj(data.cnpjFiscal)}.`);
    } catch (e) { alertaErro(e.response?.data || "Não foi possível vincular a empresa à ACBr."); }
  }

  async function abrirDetalhe(empresa) {
    setSelecionado(empresa);
    setPixEmExibicao(null);
    setSenhaForm({ usuarioId: "", novaSenha: "", confirmarSenha: "" });
    try {
      const resposta = await api.get(`/administracao/empresas/${empresa.id}`);
      const dados = resposta.data;
      setDetalhe(dados);
      setEdicao({
        nome: dados.nome || "",
        responsavelNome: dados.responsavelNome || "",
        responsavelEmail: dados.responsavelEmail || dados.email || "",
        telefone: dados.telefone || "",
        documento: dados.documento || "",
        testeGratisAte: dataHoraInput(dados.testeGratisAte),
        chavePix: dados.chavePix || "",
        pixBeneficiario: dados.pixBeneficiario || "",
        pixCidade: dados.pixCidade || "",
        uf: dados.uf || "",
        cidade: dados.cidade || "",
        codigoMunicipioIbge: dados.codigoMunicipioIbge || ""
      });
      setCobrancaEdicao({ valorUnidadeAdicional: dados.valorUnidadeAdicional ?? null, cobrancaAtiva: !!dados.cobrancaAtiva, valorMensalidade: dados.valorMensalidade || 0, diaVencimento: dados.diaVencimento || 10 });
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível abrir a empresa."));
    }
  }

  async function atualizarTudo(empresa = selecionado) {
    await carregar();
    if (empresa?.id) await abrirDetalhe(empresa);
  }

  function montarPayloadEmpresa(extra = {}) {
    return payloadEmpresa(detalhe, {
      nome: edicao?.nome ?? detalhe?.nome,
      documento: edicao?.documento ?? detalhe?.documento,
      telefone: edicao?.telefone ?? detalhe?.telefone,
      email: edicao?.responsavelEmail ?? detalhe?.email,
      responsavelNome: edicao?.responsavelNome ?? detalhe?.responsavelNome,
      responsavelEmail: edicao?.responsavelEmail ?? detalhe?.responsavelEmail,
      testeGratisAte: edicao?.testeGratisAte || null,
      chavePix: edicao?.chavePix ?? detalhe?.chavePix,
      pixBeneficiario: edicao?.pixBeneficiario ?? detalhe?.pixBeneficiario,
      pixCidade: edicao?.pixCidade ?? detalhe?.pixCidade,
      uf: edicao?.uf ?? detalhe?.uf,
      codigoMunicipioIbge: edicao?.codigoMunicipioIbge ?? detalhe?.codigoMunicipioIbge,
      cobrancaAtiva: cobrancaEdicao?.cobrancaAtiva ?? detalhe?.cobrancaAtiva,
      valorMensalidade: Number(cobrancaEdicao?.valorMensalidade ?? detalhe?.valorMensalidade ?? 0),
      valorUnidadeAdicional: cobrancaEdicao?.valorUnidadeAdicional ?? null,
      diaVencimento: Number(cobrancaEdicao?.diaVencimento ?? detalhe?.diaVencimento ?? 10),
      ...extra
    });
  }

  async function salvarConfiguracao(e) {
    e.preventDefault();
    if (!configuracao || salvando) return;
    try {
      setSalvando(true);
      await api.put("/administracao/plataforma/configuracao", {
        ...configuracao,
        valorMensalidadePadrao: Number(configuracao.valorMensalidadePadrao || 0),
        diaVencimentoPadrao: Number(configuracao.diaVencimentoPadrao || 10),
        diasTesteGratis: Number(configuracao.diasTesteGratis || 0),
        diasBloqueioAposVencimento: Number(configuracao.diasBloqueioAposVencimento || 0)
      });
      await carregar();
      await alertaSucesso("Configuração financeira atualizada.");
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível salvar a configuração."));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEmpresa(e) {
    e.preventDefault();
    if (!detalhe || salvando) return;
    try {
      setSalvando(true);
      await api.put(`/administracao/empresas/${detalhe.id}`, montarPayloadEmpresa());
      await alertaSucesso("Dados da empresa atualizados.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível atualizar a empresa."));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCobranca(e) {
    e.preventDefault();
    await salvarEmpresa(e);
  }

  async function alternarCobranca(empresa) {
    if (alternandoId) return;
    try {
      setAlternandoId(empresa.id);
      const detalheRes = await api.get(`/administracao/empresas/${empresa.id}`);
      await api.put(`/administracao/empresas/${empresa.id}`, payloadEmpresa(detalheRes.data, { cobrancaAtiva: !empresa.cobrancaAtiva }));
      await alertaSucesso(empresa.cobrancaAtiva ? "Empresa alterada para sem cobrança." : "Cobrança mensal ativada.");
      await atualizarTudo(selecionado?.id === empresa.id ? empresa : null);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível alterar a cobrança."));
    } finally {
      setAlternandoId(null);
    }
  }

  async function alterarStatus(novoStatus) {
    if (!detalhe) return;
    try {
      await api.put(`/administracao/empresas/${detalhe.id}`, montarPayloadEmpresa({ statusAssinatura: novoStatus }));
      await alertaSucesso("Status atualizado.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível alterar o status."));
    }
  }

  async function alternarBloqueio() {
    if (!detalhe) return;
    const bloqueado = detalhe.bloqueadoPorInadimplencia || detalhe.statusAssinatura === "Bloqueado";
    try {
      await api.put(`/administracao/empresas/${detalhe.id}`, montarPayloadEmpresa({ bloqueadoPorInadimplencia: !bloqueado, statusAssinatura: bloqueado ? "Ativo" : "Bloqueado", ativo: bloqueado }));
      await alertaSucesso(bloqueado ? "Empresa desbloqueada." : "Empresa bloqueada.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível alterar o acesso."));
    }
  }

  async function registrarPagamento(mensalidade) {
    try {
      await api.post(`/administracao/empresas/${detalhe.id}/mensalidades/${mensalidade.id}/pagar`, { valorPago: mensalidade.valor, formaPagamento: "Pix", observacao: "Pagamento confirmado pelo painel da plataforma" });
      await alertaSucesso("Pagamento registrado e acesso recalculado.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível registrar o pagamento."));
    }
  }

  async function cancelarMensalidade(mensalidade) {
    try {
      await api.post(`/administracao/empresas/${detalhe.id}/mensalidades/${mensalidade.id}/cancelar`, { observacao: "Mensalidade cancelada pelo painel da plataforma" });
      await alertaSucesso("Mensalidade cancelada.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível cancelar a mensalidade."));
    }
  }

  async function gerarMensalidade() {
    if (!detalhe) return;
    try {
      await api.post(`/administracao/empresas/${detalhe.id}/mensalidades/gerar`);
      await alertaSucesso("Mensalidade gerada.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível gerar mensalidade."));
    }
  }

  async function aceitarContrato() {
    if (!detalhe) return;
    try {
      await api.post(`/administracao/empresas/${detalhe.id}/contrato/aceitar`, { responsavel: edicao?.responsavelNome || detalhe.responsavelNome, contratoTexto: detalhe.contratoTexto });
      await alertaSucesso("Contrato marcado como aceito.");
      await atualizarTudo(detalhe);
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível aceitar o contrato."));
    }
  }

  async function copiarPix(codigo) {
    await navigator.clipboard.writeText(codigo);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 1800);
  }

  async function redefinirSenha(e) {
    e.preventDefault();
    if (!detalhe) return;
    if (!senhaForm.usuarioId) return alertaErro("Selecione um usuário.");
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) return alertaErro("As senhas não conferem.");
    const erroSenha = validarNovaSenha(senhaForm.novaSenha);
    if (erroSenha) return alertaErro(erroSenha);
    try {
      setSalvando(true);
      await api.put(`/administracao/empresas/${detalhe.id}/usuarios/${senhaForm.usuarioId}/senha`, { novaSenha: senhaForm.novaSenha });
      setSenhaForm(atual => ({ ...atual, novaSenha: "", confirmarSenha: "" }));
      await alertaSucesso("Senha redefinida com sucesso.");
    } catch (erro) {
      alertaErro(mensagemErro(erro, "Não foi possível redefinir a senha."));
    } finally {
      setSalvando(false);
    }
  }

  function abrirEmpresaPorId(id) {
    setAba("empresas");
    const empresa = empresasEnriquecidas.find(x => x.id === id);
    if (empresa) abrirDetalhe(empresa);
  }

  async function sair() {
    try { await encerrarSessao(); navigate("/login"); }
    catch { alertaErro("Não foi possível encerrar a sessão. Tente novamente."); }
  }

  const temMovimentoFinanceiro = bi.evolucao.some(item => Number(item.faturado) > 0 || Number(item.recebido) > 0 || Number(item.emAberto) > 0);

  return (
    <main className="platform-page platform-pro lapcare-platform-page">
      <header className="platform-topbar">
        <div><span>Administração da plataforma</span><h1>Gestão SaaS</h1><p>Visão financeira, saúde da carteira e controle dos acessos.</p></div>
        <div className="platform-header-actions"><button className="btn btn-light" onClick={carregar} disabled={carregando}>{carregando ? "Atualizando..." : "Atualizar"}</button><button className="btn btn-outline-dark" onClick={sair}>Sair</button></div>
      </header>

      <Atualizacoes />
      <nav className="platform-view-tabs" aria-label="Áreas do painel">
        <button className={aba === "visao" ? "active" : ""} onClick={() => setAba("visao")}>Visão geral</button>
        <button className={aba === "empresas" ? "active" : ""} onClick={() => setAba("empresas")}>Empresas <span>{indicadores.clientesSaas || 0}</span></button>
      </nav>

      {aba === "visao" && (
        <section className="platform-overview">
          <div className="platform-bi-kpis">
            <article className="bi-kpi bi-kpi-primary"><span>Receita recorrente</span><strong>{formatarMoeda(indicadores.receitaRecorrente)}</strong><small>{indicadores.pagantes || 0} clientes pagantes</small></article>
            <article className="bi-kpi bi-kpi-profit"><span>Lucro estimado</span><strong>{formatarMoeda(indicadores.lucroEstimado)}</strong><small>Margem de {percentual(indicadores.margemEstimada)}</small></article>
            <article className="bi-kpi"><span>Recebido no mês</span><strong>{formatarMoeda(indicadores.recebidoMes)}</strong><small>{formatarMoeda(indicadores.aReceberMes)} a receber</small></article>
            <article className="bi-kpi bi-kpi-danger"><span>Saldo vencido</span><strong>{formatarMoeda(indicadores.saldoVencido)}</strong><small>{indicadores.inadimplentes || 0} inadimplentes</small></article>
            <article className="bi-kpi"><span>Clientes SaaS</span><strong>{indicadores.clientesSaas || 0}</strong><small>{indicadores.semCobranca || 0} sem cobrança</small></article>
            <article className="bi-kpi"><span>Inadimplência</span><strong>{percentual(indicadores.taxaInadimplencia)}</strong><small>Ticket médio {formatarMoeda(indicadores.ticketMedio)}</small></article>
          </div>

          <div className="platform-bi-grid">
            <section className="platform-bi-panel platform-revenue-chart">
              <header><div><span>Evolução</span><h2>Financeiro da plataforma</h2></div><small>Últimos 6 meses</small></header>
              <div className="platform-chart-body">
                {temMovimentoFinanceiro ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bi.evolucao}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={valor => Number(valor).toLocaleString("pt-BR")} />
                      <Tooltip formatter={valor => formatarMoeda(valor)} />
                      <Bar dataKey="faturado" fill="#6f4cff" name="Faturado" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="recebido" fill="#16a34a" name="Recebido" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="emAberto" fill="#f59e0b" name="Em aberto" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="bi-chart-empty">Sem movimento financeiro suficiente para montar o gráfico.</div>}
              </div>
              <footer><span><i className="legend-billed" /> Faturado</span><span><i className="legend-paid" /> Recebido</span><span><i className="legend-open" /> Em aberto</span></footer>
            </section>

            <section className="platform-bi-panel">
              <header><div><span>Carteira</span><h2>Situação dos clientes</h2></div><small>{totalCarteira} empresas</small></header>
              <div className="platform-donut-wrap">
                <div className="platform-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={bi.distribuicao} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{bi.distribuicao.map((_, index) => <Cell key={index} fill={coresCarteira[index % coresCarteira.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                  <div><strong>{totalCarteira}</strong><span>clientes</span></div>
                </div>
                <div className="platform-portfolio-legend">{bi.distribuicao.map((item, index) => <div key={item.name}><i style={{ background: coresCarteira[index] }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div>
              </div>
            </section>
          </div>

          <div className="platform-health-strip">
            <div><span>Ativos</span><strong>{indicadores.ativos}</strong></div><div><span>Teste</span><strong>{indicadores.emTeste}</strong></div><div><span>Pagantes</span><strong>{indicadores.pagantes}</strong></div><div><span>Bloqueados</span><strong>{indicadores.bloqueados}</strong></div><div><span>Sem cobrança</span><strong>{indicadores.semCobranca}</strong></div><div><span>Ticket médio</span><strong>{formatarMoeda(indicadores.ticketMedio)}</strong></div><div><span>A receber</span><strong>{formatarMoeda(indicadores.aReceberMes)}</strong></div><div><span>Vencido</span><strong>{formatarMoeda(indicadores.saldoVencido)}</strong></div>
          </div>

          <div className="platform-bi-lists">
            <section className="platform-bi-panel"><header><div><span>Risco</span><h2>Inadimplentes</h2></div><strong className="bi-count-danger">{bi.inadimplentes.length}</strong></header><div className="bi-compact-list">{bi.inadimplentes.map(item => <button key={item.tenantId} onClick={() => abrirEmpresaPorId(item.tenantId)}><span><strong>{item.empresa}</strong><small>{item.diasEmAtraso} dias em atraso</small></span><strong>{formatarMoeda(item.saldo)}</strong></button>)}{!bi.inadimplentes.length && <p className="bi-empty">Nenhum cliente inadimplente.</p>}</div></section>
            <section className="platform-bi-panel"><header><div><span>Cobrança</span><h2>Próximos vencimentos</h2></div></header><div className="bi-compact-list">{bi.proximosVencimentos.map(item => <button key={`${item.tenantId}-${item.vencimento}`} onClick={() => abrirEmpresaPorId(item.tenantId)}><span><strong>{item.empresa}</strong><small>{data(item.vencimento)} · {item.diasParaVencer} dias</small></span><strong>{formatarMoeda(item.valor)}</strong></button>)}{!bi.proximosVencimentos.length && <p className="bi-empty">Nenhuma cobrança próxima.</p>}</div></section>
            <section className="platform-bi-panel"><header><div><span>Recebimentos</span><h2>Pagamentos recentes</h2></div></header><div className="bi-compact-list">{bi.pagamentosRecentes.map(item => <div key={`${item.tenantId}-${item.pagoEm}`}><span><strong>{item.empresa}</strong><small>{dataHora(item.pagoEm)}</small></span><strong className="bi-value-positive">+ {formatarMoeda(item.valor)}</strong></div>)}{!bi.pagamentosRecentes.length && <p className="bi-empty">Nenhum pagamento recente.</p>}</div></section>
          </div>
        </section>
      )}

      {aba === "empresas" && (
        <section className="platform-companies-view">
          <details className="platform-billing-settings">
            <summary><span>Configuração financeira</span><small>PIX, mensalidade padrão e vencimentos</small></summary>
            {configuracao && <form onSubmit={salvarConfiguracao}>
              <label>Chave PIX<input className="form-control" value={configuracao.pixChave || ""} onChange={e => setConfiguracao(x => ({ ...x, pixChave: e.target.value }))} /></label>
              <label>Beneficiário<input className="form-control" value={configuracao.pixBeneficiario || ""} onChange={e => setConfiguracao(x => ({ ...x, pixBeneficiario: e.target.value }))} /></label>
              <label>Cidade<input className="form-control" value={configuracao.pixCidade || ""} onChange={e => setConfiguracao(x => ({ ...x, pixCidade: e.target.value }))} /></label>
              <label>Mensalidade padrão<MoneyInput value={configuracao.valorMensalidadePadrao || 0} onValueChange={valor => setConfiguracao(x => ({ ...x, valorMensalidadePadrao: valor }))} /></label>
              <label>Valor mensal por unidade adicional<MoneyInput value={configuracao.valorUnidadeAdicionalPadrao ?? 100} onValueChange={valor => setConfiguracao(x => ({ ...x, valorUnidadeAdicionalPadrao: valor }))} /></label>
              <label>Dia de vencimento<input type="number" min="1" max="28" className="form-control" value={configuracao.diaVencimentoPadrao || 10} onChange={e => setConfiguracao(x => ({ ...x, diaVencimentoPadrao: e.target.value }))} /></label>
              <label>Dias de teste<input type="number" min="0" max="90" className="form-control" value={configuracao.diasTesteGratis || 0} onChange={e => setConfiguracao(x => ({ ...x, diasTesteGratis: e.target.value }))} /></label>
              <label>Bloquear após vencimento<input type="number" min="0" max="90" className="form-control" value={configuracao.diasBloqueioAposVencimento || 0} onChange={e => setConfiguracao(x => ({ ...x, diasBloqueioAposVencimento: e.target.value }))} /></label>
              <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar configuração"}</button>
            </form>}
          </details>

          <section className="platform-workspace">
            <div className="platform-list-panel">
              <header className="platform-company-heading"><div><span>Carteira de clientes</span><h2>Empresas cadastradas</h2></div><strong>{filtradas.length}</strong></header>
              <div className="platform-filters"><input className="form-control" placeholder="Buscar empresa, responsável ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /><select className="form-select" value={situacao} onChange={e => setSituacao(e.target.value)}><option value="">Todas as situações</option>{situacoes.map(([codigo, rotulo]) => <option key={codigo} value={codigo}>{rotulo}</option>)}</select><select className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os acessos</option>{statusOpcoes.map(item => <option key={item}>{item}</option>)}</select></div>
              <div className="platform-company-columns"><span>Empresa</span><span>Mensalidade</span><span>Financeiro</span><span>Acesso</span><span /></div>
              <div className="platform-company-list">
                {carregando && <div className="platform-empty">Carregando empresas...</div>}
                {!carregando && filtradas.length === 0 && <div className="platform-empty">Nenhuma empresa encontrada.</div>}
                {filtradas.map(empresa => <article className={`platform-company-row ${selecionado?.id === empresa.id ? "selected" : ""}`} key={empresa.id}>
                  <button className="platform-company-identity" onClick={() => abrirDetalhe(empresa)}><span className="platform-tenant-avatar">{empresa.nome?.slice(0, 2).toUpperCase()}</span><span><strong>{empresa.nome}</strong><small>{empresa.responsavelEmail || empresa.email}</small></span></button>
                  <div><strong>{empresa.cobrancaAtiva ? formatarMoeda(empresa.valorMensalTotal) : "-"}</strong><small>{empresa.proximoVencimento ? `Vence ${data(empresa.proximoVencimento)}` : empresa.cobrancaAtiva ? "Aguardando geração" : "Não faturado"}</small></div>
                  <div><span className={`financial-status financial-${empresa.situacaoFinanceira?.toLowerCase()}`}>{rotuloSituacao(empresa.situacaoFinanceira)}</span>{empresa.saldoVencido > 0 && <small>{formatarMoeda(empresa.saldoVencido)} · {empresa.diasEmAtraso} dias</small>}</div>
                  <div><span className={`subscription-status status-${String(empresa.statusAssinatura || "").toLowerCase()}`}>{empresa.statusAssinatura}</span></div>
                  <div className="platform-company-actions"><button type="button" className={`billing-toggle ${empresa.cobrancaAtiva ? "active" : ""}`} aria-pressed={empresa.cobrancaAtiva} disabled={alternandoId === empresa.id || !!empresa.empresaPrincipalId} onClick={() => alternarCobranca(empresa)}><i />{alternandoId === empresa.id ? "Alterando..." : empresa.empresaPrincipalId ? "Cobrança na principal" : empresa.cobrancaAtiva ? "Cobrança" : "Sem cobrança"}</button><button type="button" className="btn btn-sm btn-outline-dark" onClick={() => abrirDetalhe(empresa)}>Detalhes</button></div>
                </article>)}
              </div>
            </div>

            <aside className="platform-detail">
              {!detalhe && <div className="platform-empty"><strong>Detalhes da empresa</strong><span>Selecione um cliente para gerenciar cobrança, acesso e mensalidades.</span></div>}
              {detalhe && <>
                <header className="platform-detail-title"><span>Empresa #{detalhe.id}</span><h2>{detalhe.nome}</h2><p>{detalhe.responsavelNome}<br />{detalhe.responsavelEmail || detalhe.email}</p></header>
                <div className="platform-access-control"><label>Status de acesso<select className="form-select" value={detalhe.statusAssinatura} onChange={e => alterarStatus(e.target.value)}>{statusOpcoes.map(item => <option key={item}>{item}</option>)}</select></label><button className={`btn ${detalhe.bloqueadoPorInadimplencia || detalhe.statusAssinatura === "Bloqueado" ? "btn-success" : "btn-outline-danger"}`} onClick={alternarBloqueio}>{detalhe.bloqueadoPorInadimplencia || detalhe.statusAssinatura === "Bloqueado" ? "Desbloquear acesso" : "Bloquear acesso"}</button></div>
                <dl><div><dt>Cadastro</dt><dd>{dataHora(detalhe.dataCadastro)}</dd></div><div><dt>Contrato</dt><dd>{detalhe.contratoAceitoEm ? "Aceito" : "Pendente"}</dd></div><div><dt>Fim do teste</dt><dd>{dataHora(detalhe.testeGratisAte)}</dd></div></dl>

                <h3>Cobrança mensal</h3>
                {detalhe.empresaPrincipalId ? <p>Unidade vinculada. A cobrança é centralizada na empresa principal #{detalhe.empresaPrincipalId}.</p> : <>
                <p>{detalhe.cobrancaUnidades?.quantidade || 0} unidade(s) adicional(is) · Adicional: <strong>{formatarMoeda(detalhe.cobrancaUnidades?.adicional || 0)}</strong> · Total previsto: <strong>{formatarMoeda(detalhe.cobrancaUnidades?.total || detalhe.valorMensalidade)}</strong></p>
                <form className="platform-edit-form platform-billing-form" onSubmit={salvarCobranca}>
                  <label className="platform-check"><input type="checkbox" checked={!!cobrancaEdicao?.cobrancaAtiva} onChange={e => setCobrancaEdicao(x => ({ ...x, cobrancaAtiva: e.target.checked }))} /><span>Cliente pagante</span></label>
                  <label>Mensalidade base da empresa<MoneyInput value={cobrancaEdicao?.valorMensalidade ?? 0} onValueChange={valor => setCobrancaEdicao(x => ({ ...x, valorMensalidade: valor }))} /></label>
                  <label>Dia de vencimento<input type="number" min="1" max="28" className="form-control" value={cobrancaEdicao?.diaVencimento ?? 10} onChange={e => setCobrancaEdicao(x => ({ ...x, diaVencimento: e.target.value }))} /></label>
                  <div className="platform-custom-price"><small>Valor padrão da plataforma: <strong>{formatarMoeda(configuracao?.valorMensalidadePadrao)}</strong>. Este campo pode ter um valor diferente para cada empresa.</small><button type="button" className="btn btn-sm btn-light" onClick={() => setCobrancaEdicao(x => ({ ...x, valorMensalidade: configuracao?.valorMensalidadePadrao || 0 }))}>Usar valor padrão</button></div>
                  <label>Valor mensal por unidade adicional<MoneyInput value={cobrancaEdicao?.valorUnidadeAdicional ?? configuracao?.valorUnidadeAdicionalPadrao ?? 100} onValueChange={valor => setCobrancaEdicao(x => ({ ...x, valorUnidadeAdicional: valor }))} /></label>
                  <button type="button" className="btn btn-outline-primary" onClick={() => setCobrancaEdicao(x => ({ ...x, valorUnidadeAdicional: null }))}>Usar padrão da plataforma</button>
                  <small>{cobrancaEdicao?.valorUnidadeAdicional == null ? "Usando o padrão da plataforma." : "Preço específico para esta empresa. Zero isenta o adicional."} Mensalidades pendentes ainda não vencidas são atualizadas, incluindo o PIX. Pagas, vencidas e parcialmente pagas são preservadas.</small>
                  <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar cobrança"}</button>
                </form>

                </>}
                <h3>Mensalidades</h3>
                <div className="platform-invoices">
                  <button type="button" className="btn btn-primary btn-sm" disabled={!!detalhe.empresaPrincipalId} onClick={gerarMensalidade}>Gerar próxima mensalidade</button>
                  {detalhe.mensalidades?.length === 0 && <p>Nenhuma mensalidade gerada.</p>}
                  {detalhe.mensalidades?.map(mensalidade => <article key={mensalidade.id} className={`platform-invoice invoice-${String(mensalidade.status).toLowerCase()}`}><div><strong>{data(mensalidade.competencia).slice(3)}</strong><span>Vence {data(mensalidade.vencimento)}</span></div><div><strong>{formatarMoeda(mensalidade.valor)}</strong><span>{mensalidade.status}</span>{mensalidade.quantidadeUnidadesAdicionais > 0 && <small>Base {formatarMoeda(mensalidade.valorBase)} + {mensalidade.quantidadeUnidadesAdicionais} × {formatarMoeda(mensalidade.valorUnitarioAdicional)}</small>}</div>{["Pendente", "Vencida"].includes(mensalidade.status) && <div className="platform-invoice-actions">{mensalidade.pixCopiaECola && <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => setPixEmExibicao(pixEmExibicao === mensalidade.id ? null : mensalidade.id)}>PIX</button>}<button type="button" className="btn btn-sm btn-success" onClick={() => registrarPagamento(mensalidade)}>Dar baixa</button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => cancelarMensalidade(mensalidade)}>Cancelar</button></div>}{mensalidade.status === "Paga" && <small>Pago em {dataHora(mensalidade.pagoEm)} · {formatarMoeda(mensalidade.valorPago)}</small>}{pixEmExibicao === mensalidade.id && mensalidade.pixCopiaECola && <div className="platform-invoice-pix"><QRCodeSVG value={mensalidade.pixCopiaECola} size={176} level="M" /><button type="button" className="btn btn-primary btn-sm" onClick={() => copiarPix(mensalidade.pixCopiaECola)}>{pixCopiado ? "Copiado" : "Copiar PIX"}</button></div>}</article>)}
                </div>

                <details className="platform-detail-section platform-users-section"><summary>Usuários e senhas</summary><div className="platform-users-list">{(detalhe.usuarios || []).map(usuario => <div key={usuario.id}><span><strong>{usuario.nome}</strong><small>{usuario.email} · {usuario.perfil}</small></span><span className={usuario.ativo ? "user-active" : "user-inactive"}>{usuario.ativo ? "Ativo" : "Inativo"}</span></div>)}</div><form className="platform-edit-form platform-password-form" onSubmit={redefinirSenha}><label>Usuário<select className="form-select" value={senhaForm.usuarioId} onChange={e => setSenhaForm(x => ({ ...x, usuarioId: e.target.value, novaSenha: "", confirmarSenha: "" }))} required><option value="">Selecione o usuário</option>{(detalhe.usuarios || []).map(usuario => <option key={usuario.id} value={usuario.id}>{usuario.nome} - {usuario.email}</option>)}</select></label><CampoSenha key={`nova-${detalhe.id}-${senhaForm.usuarioId}`} label="Nova senha" modo="nova" value={senhaForm.novaSenha} onChange={e => setSenhaForm(x => ({ ...x, novaSenha: e.target.value }))} required /><CampoSenha key={`confirmacao-${detalhe.id}-${senhaForm.usuarioId}`} label="Confirmar nova senha" modo="confirmacao" compararCom={senhaForm.novaSenha} value={senhaForm.confirmarSenha} onChange={e => setSenhaForm(x => ({ ...x, confirmarSenha: e.target.value }))} required /><button className="btn btn-primary" disabled={salvando}>{salvando ? "Redefinindo..." : "Redefinir senha"}</button></form></details>

                <details className="platform-detail-section"><summary>Emissão fiscal ACBr</summary><p>Localiza o CNPJ salvo desta empresa na ACBr e protege o vínculo de emissão. Salve os dados cadastrais antes de vincular.</p><button type="button" className="btn btn-outline-primary" onClick={() => vincularFiscal(detalhe)}>Vincular cadastro fiscal da empresa</button></details>
                <details className="platform-detail-section"><summary>Dados cadastrais, Pix e contrato</summary><form className="platform-edit-form" onSubmit={salvarEmpresa}><label>Empresa<input className="form-control" value={edicao?.nome || ""} onChange={e => setEdicao(x => ({ ...x, nome: e.target.value }))} required /></label><label>Responsável<input className="form-control" value={edicao?.responsavelNome || ""} onChange={e => setEdicao(x => ({ ...x, responsavelNome: e.target.value }))} /></label><label>E-mail<input type="email" className="form-control" value={edicao?.responsavelEmail || ""} onChange={e => setEdicao(x => ({ ...x, responsavelEmail: e.target.value }))} /></label><label>Telefone<CampoComMascara mascara="telefone" className="form-control" value={edicao?.telefone || ""} onChange={e => setEdicao(x => ({ ...x, telefone: e.target.value }))} /></label><label>Documento<CampoComMascara mascara="documento" className="form-control" value={edicao?.documento || ""} onChange={e => setEdicao(x => ({ ...x, documento: e.target.value }))} /></label><label>Fim do teste<input type="datetime-local" className="form-control" value={edicao?.testeGratisAte || ""} onChange={e => setEdicao(x => ({ ...x, testeGratisAte: e.target.value }))} /></label><label>Chave Pix da clínica<input className="form-control" value={edicao?.chavePix || ""} onChange={e => setEdicao(x => ({ ...x, chavePix: e.target.value }))} /></label><label>Nome no Pix<input className="form-control" value={edicao?.pixBeneficiario || ""} onChange={e => setEdicao(x => ({ ...x, pixBeneficiario: e.target.value }))} /></label><label>Cidade Pix<input className="form-control" value={edicao?.pixCidade || ""} onChange={e => setEdicao(x => ({ ...x, pixCidade: e.target.value }))} /></label><div style={{ gridColumn: "1 / -1" }}><EmpresaLocalidade value={edicao} onChange={campos => setEdicao(atual => ({ ...atual, ...campos }))} /></div><button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar dados"}</button></form><div className="platform-contract-preview"><strong>Contrato</strong><small>Nº {detalhe.contratoNumero || "-"} · {detalhe.contratoAceitoEm ? `Aceito em ${dataHora(detalhe.contratoAceitoEm)}` : "Pendente"}</small><pre>{detalhe.contratoTexto || "Contrato não gerado."}</pre>{!detalhe.contratoAceitoEm && <button type="button" className="btn btn-outline-dark btn-sm" onClick={aceitarContrato}>Marcar contrato aceito</button>}</div></details>
              </>}
            </aside>
          </section>
        </section>
      )}
    </main>
  );
}

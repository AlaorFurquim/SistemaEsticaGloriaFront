import CampoComMascara from "../components/CampoComMascara";
import { useEffect, useRef, useState } from "react";
import api from "../api";
import EmpresaLocalidade from "../components/EmpresaLocalidade";
import PageHeader from "../components/PageHeader";
import { formatarDataHora } from "../utils/masks";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { brandingPadrao, obterBranding, salvarBranding, obterBrandingLegado, prepararImagemBranding } from "../utils/branding";
import PlataformaAdminPanel from "./PlataformaAdminPanel";
import { lembrarEmpresaLogin } from "../utils/empresaLogin";

const empresaInicial = {
  nome: "",
  documento: "",
  telefone: "",
  email: ""
};

const unidadeInicial = {
  empresaId: "",
  nome: "",
  documento: "",
  telefone: "",
  endereco: ""
};

export default function Administracao() {
  const inputLogoRef = useRef(null);
  const inputLoginRef = useRef(null);
  const [empresas, setEmpresas] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [empresa, setEmpresa] = useState(empresaInicial);
  const [unidade, setUnidade] = useState(unidadeInicial);
  const [aparencia, setAparencia] = useState(obterBranding);
  const [salvandoAparencia, setSalvandoAparencia] = useState(false);
  const [legado, setLegado] = useState(obterBrandingLegado);
  const [codigoAcesso, setCodigoAcesso] = useState(() => obterBranding().codigoPublico);
  const linkAcesso = codigoAcesso ? `${window.location.origin}/login?empresa=${codigoAcesso}` : "";
  const perfil = localStorage.getItem("perfil");
  const plataforma = perfil === "Administrador Plataforma";
  const [filtros, setFiltros] = useState({
    entidade: "",
    unidadeId: "",
    inicio: "",
    fim: ""
  });

  async function carregar() {
    try {
      const [empresasRes, auditoriaRes] = await Promise.all([
        api.get("/administracao/empresas"),
        api.get("/administracao/auditoria")
      ]);

      setEmpresas(empresasRes.data);
      setAuditoria(auditoriaRes.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar a administração.");
    }
  }

  async function buscarAuditoria(e) {
    e?.preventDefault();

    try {
      const params = {};
      if (filtros.entidade) params.entidade = filtros.entidade;
      if (filtros.unidadeId) params.unidadeId = filtros.unidadeId;
      if (filtros.inicio) params.inicio = filtros.inicio;
      if (filtros.fim) params.fim = filtros.fim;

      const res = await api.get("/administracao/auditoria", { params });
      setAuditoria(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível buscar a auditoria.");
    }
  }

  async function salvarEmpresa(e) {
    e.preventDefault();

    try {
      await api.post("/administracao/empresas", empresa);
      setEmpresa(empresaInicial);
      await carregar();
      await alertaSucesso("Empresa criada com sucesso.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível criar a empresa.");
    }
  }

  async function salvarUnidade(e) {
    e.preventDefault();

    try {
      await api.post("/administracao/unidades", {
        ...unidade,
        empresaId: Number(unidade.empresaId)
      });
      setUnidade(unidadeInicial);
      await carregar();
      await alertaSucesso("Unidade criada com sucesso.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível criar a unidade.");
    }
  }

  function arquivoParaBase64(arquivo, callback) {
    if (!arquivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 10 * 1024 * 1024) {
      alertaErro("Escolha uma imagem JPG, PNG ou WebP de até 10 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = evento => callback(evento.target?.result || "");
    reader.onerror = () => alertaErro("Não foi possível ler a imagem.");
    reader.readAsDataURL(arquivo);
  }

  async function salvarAparencia(e) {
    e.preventDefault();
    if (salvandoAparencia) return;
    setSalvandoAparencia(true);
    try {
      const [logoImagem, loginImagem] = await Promise.all([prepararImagemBranding(aparencia.logoImagem), prepararImagemBranding(aparencia.loginImagem)]);
      const { data } = await api.put("/empresa/aparencia", {
        nomeEmpresa: aparencia.nomeEmpresa, subtituloEmpresa: aparencia.subtituloEmpresa, tema: aparencia.tema, logoImagem, loginImagem
      });
      setAparencia(salvarBranding(data)); setCodigoAcesso(data.codigoPublico);
      lembrarEmpresaLogin(localStorage.getItem("email"), data);
      localStorage.removeItem("lapBeautyBranding"); setLegado(null);
      await alertaSucesso("Aparência salva para todos os usuários desta empresa.");
    } catch (error) { alertaErro(typeof error.response?.data === "string" ? error.response.data : error.message || "Não foi possível salvar a aparência."); }
    finally { setSalvandoAparencia(false); }
  }

  async function restaurarAparencia() {
    if (salvandoAparencia) return;
    setSalvandoAparencia(true);
    try {
      const { data } = await api.delete("/empresa/aparencia");
      setAparencia(salvarBranding(data)); setCodigoAcesso(null);
      lembrarEmpresaLogin(localStorage.getItem("email"), data);
      if (inputLogoRef.current) inputLogoRef.current.value = "";
      if (inputLoginRef.current) inputLoginRef.current.value = "";
      await alertaSucesso("Aparência padrão restaurada apenas para esta empresa.");
    } catch { alertaErro("Não foi possível restaurar a aparência."); }
    finally { setSalvandoAparencia(false); }
  }

  function removerLogo() {
    setAparencia({ ...aparencia, logoImagem: "" });
    if (inputLogoRef.current) inputLogoRef.current.value = "";
  }

  function removerImagemLogin() {
    setAparencia({ ...aparencia, loginImagem: "" });
    if (inputLoginRef.current) inputLoginRef.current.value = "";
  }

  const telasPorEntidade = {
    Atendimento: "Agenda / Atendimento",
    AtendimentoItem: "Agenda / Serviços do atendimento",
    BloqueioAgenda: "Agenda / Bloqueios",
    ListaEspera: "Agenda / Lista de espera",
    Caixa: "Caixa e fechamento",
    MovimentoCaixa: "Caixa / Movimentos",
    Venda: "PDV / Vendas",
    VendaItem: "PDV / Itens da venda",
    PagamentoVenda: "PDV / Pagamentos",
    Cliente: "Clientes e CRM",
    Profissional: "Profissionais",
    Servico: "Serviços",
    Produto: "Estoque / Produtos",
    MovimentacaoEstoque: "Estoque / Movimentações",
    CompraEstoque: "Estoque / Compras",
    CompraEstoqueItem: "Estoque / Itens da compra",
    LancamentoFinanceiro: "Financeiro",
    CategoriaFinanceira: "Financeiro / Categorias",
    FechamentoComissao: "Comissões / Fechamento",
    FechamentoComissaoItem: "Comissões / Itens",
    RegraComissao: "Comissões / Regras",
    ProgramaFidelidade: "Fidelidade / Programa",
    MovimentoFidelidade: "Fidelidade / Movimentos",
    ClientePacote: "Fidelidade / Pacotes do cliente",
    PacoteServico: "Fidelidade / Pacotes",
    Voucher: "Fidelidade / Vouchers",
    Usuario: "Administração / Usuários",
    Empresa: "Administração / Empresas",
    Unidade: "Administração / Unidades",
    RecursoAtendimento: "Atendimento / Recursos",
    ServicoInsumo: "Estoque / Insumos do serviço"
  };

  const nomesEntidade = {
    Atendimento: "Atendimento",
    AtendimentoItem: "Serviço do atendimento",
    BloqueioAgenda: "Bloqueio de agenda",
    ListaEspera: "Lista de espera",
    Caixa: "Caixa",
    MovimentoCaixa: "Movimento de caixa",
    Venda: "Venda",
    VendaItem: "Item da venda",
    PagamentoVenda: "Pagamento da venda",
    Cliente: "Cliente",
    Profissional: "Profissional",
    Servico: "Serviço",
    Produto: "Produto",
    MovimentacaoEstoque: "Movimentação de estoque",
    CompraEstoque: "Compra",
    CompraEstoqueItem: "Item da compra",
    LancamentoFinanceiro: "Lançamento financeiro",
    CategoriaFinanceira: "Categoria financeira",
    FechamentoComissao: "Fechamento de comissão",
    FechamentoComissaoItem: "Item de comissão",
    RegraComissao: "Regra de comissão",
    ProgramaFidelidade: "Programa de fidelidade",
    MovimentoFidelidade: "Movimento de fidelidade",
    ClientePacote: "Pacote do cliente",
    PacoteServico: "Pacote de serviço",
    Voucher: "Voucher",
    Usuario: "Usuário",
    Empresa: "Empresa",
    Unidade: "Unidade",
    RecursoAtendimento: "Recurso",
    ServicoInsumo: "Insumo do serviço"
  };

  const acoesAuditoria = {
    ADDED: "Criou",
    ADICIONADO: "Criou",
    ADICIONAR: "Criou",
    MODIFIED: "Alterou",
    ALTERADO: "Alterou",
    DELETED: "Excluiu",
    REMOVED: "Excluiu"
  };

  const camposAuditoria = {
    Id: "Código",
    Nome: "Nome",
    Email: "E-mail",
    Telefone: "Telefone",
    Documento: "Documento",
    Endereco: "Endereço",
    Ativo: "Ativo",
    Status: "Status",
    Data: "Data",
    DataHora: "Data/hora",
    DataAbertura: "Data de abertura",
    DataFechamento: "Data de fechamento",
    DataCheckIn: "Data do check-in",
    DataInicioAtendimento: "Início real",
    DataConclusao: "Conclusão",
    ClienteId: "Cliente",
    ProfissionalId: "Profissional",
    ServicoId: "Serviço",
    ProdutoId: "Produto",
    CaixaId: "Caixa",
    VendaId: "Venda",
    UsuarioAberturaId: "Usuário da abertura",
    UsuarioFechamentoId: "Usuário do fechamento",
    FormaPagamento: "Forma de pagamento",
    Parcelas: "Parcelas",
    Valor: "Valor",
    ValorFinal: "Valor final",
    ValorFinalInformado: "Valor conferido",
    ValorEsperado: "Valor esperado",
    DiferencaFechamento: "Diferença do fechamento",
    TotalVendas: "Total de vendas",
    TotalServicos: "Total de serviços",
    TotalSangrias: "Total de sangrias",
    TotalSuprimentos: "Total de suprimentos",
    TotalProdutos: "Total de produtos",
    ValorUnitario: "Valor unitário",
    DataNascimento: "Data de nascimento",
    DataCadastro: "Data de cadastro",
    PrecoUnitario: "Preço unitário",
    PrecoTotal: "Preço total",
    Desconto: "Desconto",
    Quantidade: "Quantidade",
    QuantidadeEstoque: "Estoque",
    EstoqueMinimo: "Estoque mínimo",
    Tipo: "Tipo",
    Origem: "Origem",
    Descricao: "Descrição",
    Observacao: "Observação",
    ObservacaoOperacional: "Observação operacional",
    MotivoCancelamento: "Motivo do cancelamento",
    MotivoNoShow: "Motivo do no-show",
    Encaixe: "Encaixe",
    Ncm: "NCM",
    Cfop: "CFOP",
    UnidadeComercial: "Unidade",
    PrecoCusto: "Preço de custo",
    PrecoVenda: "Preço de venda",
    PercentualComissao: "Comissão %",
    UnidadeId: "Unidade"
  };

  function telaAuditoria(entidade) {
    return telasPorEntidade[entidade] || entidade || "-";
  }

  function registroAuditoria(log) {
    const entidade = nomesEntidade[log.entidade] || log.entidade || "Registro";
    return `${entidade} #${log.chave || "-"}`;
  }

  function operacaoAuditoria(acao) {
    return acoesAuditoria[String(acao || "").toUpperCase()] || acao || "-";
  }

  function classeOperacao(acao) {
    const operacao = operacaoAuditoria(acao);
    if (operacao === "Criou") return "audit-badge success";
    if (operacao === "Excluiu") return "audit-badge danger";
    return "audit-badge warning";
  }

  function objetoJson(valor) {
    if (!valor) return null;
    try {
      return JSON.parse(valor);
    } catch {
      return null;
    }
  }

  function formatarValorAuditoria(valor) {
    if (valor === null || valor === undefined || valor === "") return "-";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return formatarDataHora(valor);
    return String(valor);
  }

  function nomeCampoAuditoria(campo) {
    if (camposAuditoria[campo]) return camposAuditoria[campo];
    return String(campo)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/Id$/, "")
      .trim();
  }

  function resumoAuditoria(valorAtual, valorComparacao = null) {
    const atual = objetoJson(valorAtual);
    const comparacao = objetoJson(valorComparacao);

    if (!atual) return valorAtual || "-";

    const itens = Object.entries(atual)
      .filter(([campo, valor]) => campo !== "ResumoFechamento" && campo !== "SenhaHash" && campo !== "PinOperadorHash")
      .filter(([campo, valor]) => {
        if (valor === null || valor === "") return false;
        if (!comparacao) return true;
        return JSON.stringify(valor) !== JSON.stringify(comparacao[campo]);
      })
      .slice(0, 7);

    if (!itens.length) return "Sem alteração nos campos principais.";

    return itens
      .map(([campo, valor]) => `${nomeCampoAuditoria(campo)}: ${formatarValorAuditoria(valor)}`)
      .join(" | ");
  }

  const unidades = empresas.flatMap(e =>
    (e.unidades || []).map(u => ({ ...u, empresa: e.nome }))
  );

  useEffect(() => {
    carregar();
  }, []);

  if (plataforma) {
    return <PlataformaAdminPanel />;
  }

  return (
    <div>
      <PageHeader
        title={plataforma ? "Painel da plataforma" : "Administração"}
        subtitle={plataforma ? "Empresas, mensalidades, contratos e auditoria da plataforma" : "Dados da empresa, aparência e auditoria de alterações"}
      />

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="metric-card">
            <span>Empresas</span>
            <strong>{empresas.length}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card">
            <span>Unidades</span>
            <strong>{unidades.length}</strong>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card">
            <span>Eventos auditados</span>
            <strong>{auditoria.length}</strong>
          </div>
        </div>
      </div>

      {plataforma && <PlataformaAdminPanel />}

      <form className="panel mb-3 admin-settings-panel" onSubmit={salvarAparencia}>
        <fieldset disabled={salvandoAparencia}>
        <div className="section-title">
          <div>
            <h5>Aparência do sistema</h5>
            <p>Nome, tema e imagens compartilhados por todos os usuários desta empresa.</p>
          </div>
          <button type="button" className="btn btn-light" onClick={restaurarAparencia}>
            Restaurar padrão
          </button>
        </div>

        {legado && <div className="alert alert-info"><p>Há uma aparência antiga salva somente neste navegador. Importe, confira se pertence a esta empresa e salve para compartilhá-la.</p><button type="button" className="btn btn-outline-primary" onClick={() => setAparencia({ ...aparencia, ...legado })}>Importar aparência deste navegador</button></div>}
        {linkAcesso && <div className="mb-3"><label htmlFor="empresa-link-acesso">Link de acesso com a marca da empresa</label><input id="empresa-link-acesso" className="form-control" value={linkAcesso} readOnly onFocus={e => e.target.select()} /><div className="d-flex flex-wrap gap-2 mt-2"><button type="button" className="btn btn-outline-primary" onClick={async () => { try { await navigator.clipboard.writeText(linkAcesso); await alertaSucesso("Link copiado."); } catch { alertaErro("Selecione e copie o link acima."); } }}>Copiar link de acesso</button><a className="btn btn-outline-primary" href={linkAcesso} target="_blank" rel="noreferrer">Ver login da empresa</a></div></div>}
        <div className="branding-settings">
          <div className="branding-preview">
            <div className="branding-preview-logo">
              {aparencia.logoImagem ? <img src={aparencia.logoImagem} alt="Logo atual" /> : "LB"}
            </div>
            <div>
              <strong>{aparencia.nomeEmpresa || "Nome da empresa"}</strong>
              <span>{aparencia.subtituloEmpresa || "Subtítulo do sistema"}</span>
            </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-section-heading">
              <strong>Identificação</strong>
              <span>Defina como a empresa será apresentada dentro do sistema.</span>
            </div>
          <div className="row g-3">
            <div className="col-md-4">
              <label>Nome da empresa no sistema</label>
              <input
                className="form-control"
                value={aparencia.nomeEmpresa}
                required maxLength={120}
                onChange={e => setAparencia({ ...aparencia, nomeEmpresa: e.target.value })}
                placeholder="Ex.: Glória Couto Beauty"
              />
            </div>
            <div className="col-md-4">
              <label>Subtítulo</label>
              <input
                className="form-control"
                value={aparencia.subtituloEmpresa}
                maxLength={180}
                onChange={e => setAparencia({ ...aparencia, subtituloEmpresa: e.target.value })}
                placeholder="Ex.: Clínica de estética e beleza"
              />
            </div>
            <div className="col-md-4">
              <label>Tema</label>
              <select
                className="form-select"
                value={aparencia.tema}
                onChange={e => setAparencia({ ...aparencia, tema: e.target.value })}
              >
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </div>

          </div>
          </div>

          <div className="admin-form-section">
            <div className="admin-form-section-heading">
              <strong>Imagens da marca</strong>
              <span>Escolha a logo e a imagem exibida na entrada do sistema.</span>
            </div>
            <div className="row g-3">
            <div className="col-lg-6">
              <label>Logo do sistema</label>
              <div className="branding-image-field">
                <div className="branding-image-preview branding-image-preview-logo">
                  {aparencia.logoImagem ? <img src={aparencia.logoImagem} alt="Prévia da logo" /> : <span>LB</span>}
                </div>
                <div className="branding-image-actions">
                <label className="file-upload-button">
                  Escolher imagem
                  <input
                    ref={inputLogoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => arquivoParaBase64(e.target.files?.[0], imagem => setAparencia(atual => ({ ...atual, logoImagem: imagem })))}
                  />
                </label>
                <span>{aparencia.logoImagem ? "Logo selecionada" : "Nenhuma imagem selecionada"}</span>
                {aparencia.logoImagem && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={removerLogo}>Remover</button>}
                </div>
              </div>
              <small className="text-muted">Aparece no menu lateral, topo mobile e login.</small>
            </div>

            <div className="col-lg-6">
              <label>Imagem da tela de login</label>
              <div className="branding-image-field">
                <div className="branding-image-preview branding-image-preview-cover">
                  {aparencia.loginImagem ? <img src={aparencia.loginImagem} alt="Prévia da tela de login" /> : <span>Prévia da capa</span>}
                </div>
                <div className="branding-image-actions">
                <label className="file-upload-button">
                  Escolher imagem
                  <input
                    ref={inputLoginRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => arquivoParaBase64(e.target.files?.[0], imagem => setAparencia(atual => ({ ...atual, loginImagem: imagem })))}
                  />
                </label>
                <span>{aparencia.loginImagem ? "Imagem selecionada" : "Nenhuma imagem selecionada"}</span>
                {aparencia.loginImagem && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={removerImagemLogin}>Remover</button>}
                </div>
              </div>
              <small className="text-muted">Use uma foto horizontal para preencher bem a tela.</small>
            </div>
            </div>
          </div>
            <div className="admin-form-actions">
              <button className="btn btn-primary">{salvandoAparencia ? "Salvando…" : "Salvar aparência"}</button>
            </div>
        </div>
        </fieldset>
      </form>

      {!plataforma && empresas[0] && (
        <form className="panel mb-3 admin-settings-panel" onSubmit={async e => {
          e.preventDefault();
          try {
            await api.put(`/administracao/empresas/${empresas[0].id}`, empresas[0]);
            await carregar();
            await alertaSucesso("Dados da empresa salvos.");
          } catch (error) {
            alertaErro(error.response?.data || "Não foi possível salvar a empresa.");
          }
        }}>
          <div className="section-title">
            <div>
              <h5>Dados da minha empresa e Pix do PDV</h5>
              <p>Esses dados pertencem à clínica. A chave Pix daqui é usada para gerar QR Code no PDV.</p>
            </div>
          </div>
          <div className="admin-form-section">
          <div className="row g-3">
            <div className="col-md-4"><label>Nome da empresa</label><input className="form-control" value={empresas[0].nome || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], nome: e.target.value }, ...atual.slice(1)])} /></div>
            <div className="col-md-4"><label>Documento</label><CampoComMascara mascara="documento" className="form-control" value={empresas[0].documento || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], documento: e.target.value }, ...atual.slice(1)])} /></div>
            <div className="col-md-4"><label>Telefone</label><CampoComMascara mascara="telefone" className="form-control" value={empresas[0].telefone || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], telefone: e.target.value }, ...atual.slice(1)])} /></div>
            <div className="col-md-4"><label>E-mail</label><input className="form-control" value={empresas[0].email || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], email: e.target.value }, ...atual.slice(1)])} /></div>
            <div className="col-md-4"><label>Chave Pix para receber no PDV</label><input className="form-control" value={empresas[0].chavePix || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], chavePix: e.target.value }, ...atual.slice(1)])} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" /></div>
            <div className="col-md-2"><label>Nome no Pix</label><input className="form-control" value={empresas[0].pixBeneficiario || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], pixBeneficiario: e.target.value }, ...atual.slice(1)])} /></div>
            <div className="col-md-2"><label>Cidade do Pix</label><input className="form-control" value={empresas[0].pixCidade || ""} onChange={e => setEmpresas(atual => [{ ...atual[0], pixCidade: e.target.value }, ...atual.slice(1)])} /></div>
            <EmpresaLocalidade value={empresas[0]} onChange={campos => setEmpresas(atual => [{ ...atual[0], ...campos }, ...atual.slice(1)])} />
          </div>
          </div>
          <div className="admin-form-actions">
            <button className="btn btn-primary">Salvar dados da empresa</button>
          </div>
        </form>
      )}

      {plataforma && <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={salvarEmpresa}>
            <h5>Nova empresa</h5>
            <div className="row g-2">
              <div className="col-md-6">
                <label>Nome</label>
                <input className="form-control" value={empresa.nome} onChange={e => setEmpresa({ ...empresa, nome: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label>Documento</label>
                <CampoComMascara mascara="documento" className="form-control" value={empresa.documento} onChange={e => setEmpresa({ ...empresa, documento: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label>Telefone</label>
                <CampoComMascara mascara="telefone" className="form-control" value={empresa.telefone} onChange={e => setEmpresa({ ...empresa, telefone: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label>E-mail</label>
                <input className="form-control" value={empresa.email} onChange={e => setEmpresa({ ...empresa, email: e.target.value })} />
              </div>
              <EmpresaLocalidade value={empresa} onChange={campos => setEmpresa(atual => ({ ...atual, ...campos }))} />
              <div className="col-md-12 d-flex justify-content-end">
                <button className="btn btn-primary">Salvar empresa</button>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-6">
          <form className="panel h-100" onSubmit={salvarUnidade}>
            <h5>Nova unidade / filial</h5>
            <div className="row g-2">
              <div className="col-md-6">
                <label>Empresa</label>
                <select className="form-select" value={unidade.empresaId} onChange={e => setUnidade({ ...unidade, empresaId: e.target.value })} required>
                  <option value="">Selecione</option>
                  {empresas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label>Nome da unidade</label>
                <input className="form-control" value={unidade.nome} onChange={e => setUnidade({ ...unidade, nome: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label>Documento</label>
                <CampoComMascara mascara="documento" className="form-control" value={unidade.documento} onChange={e => setUnidade({ ...unidade, documento: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label>Telefone</label>
                <CampoComMascara mascara="telefone" className="form-control" value={unidade.telefone} onChange={e => setUnidade({ ...unidade, telefone: e.target.value })} />
              </div>
              <div className="col-md-12">
                <label>Endereço</label>
                <input className="form-control" value={unidade.endereco} onChange={e => setUnidade({ ...unidade, endereco: e.target.value })} />
              </div>
              <div className="col-md-12 d-flex justify-content-end">
                <button className="btn btn-primary">Salvar unidade</button>
              </div>
            </div>
          </form>
        </div>
      </div>}

      <form className="panel mb-3" onSubmit={buscarAuditoria}>
        <h5>Filtros de auditoria</h5>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Entidade</label>
            <input className="form-control" placeholder="Ex: Venda, Cliente" value={filtros.entidade} onChange={e => setFiltros({ ...filtros, entidade: e.target.value })} />
          </div>
          <div className="col-md-3">
            <label>Unidade</label>
            <select className="form-select" value={filtros.unidadeId} onChange={e => setFiltros({ ...filtros, unidadeId: e.target.value })}>
              <option value="">Todas</option>
              {unidades.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label>Início</label>
            <input type="date" className="form-control" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
          </div>
          <div className="col-md-2">
            <label>Fim</label>
            <input type="date" className="form-control" value={filtros.fim} onChange={e => setFiltros({ ...filtros, fim: e.target.value })} />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-primary w-100">Buscar</button>
          </div>
        </div>
      </form>

      <div className="panel">
        <h5>Auditoria</h5>
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Tela</th>
              <th>Operação</th>
              <th>Quem fez</th>
              <th>Unidade</th>
              <th>Registro</th>
              <th>Antes</th>
              <th>Depois</th>
            </tr>
          </thead>
          <tbody>
            {auditoria.map(x => (
              <tr key={x.id}>
                <td>{formatarDataHora(x.data)}</td>
                <td>{telaAuditoria(x.entidade)}</td>
                <td><span className={classeOperacao(x.acao)}>{operacaoAuditoria(x.acao)}</span></td>
                <td>{x.usuario || "Sistema"}</td>
                <td>{x.unidade || "-"}</td>
                <td>{registroAuditoria(x)}</td>
                <td className="small audit-values">{resumoAuditoria(x.valoresAntes, x.valoresDepois)}</td>
                <td className="small audit-values">{resumoAuditoria(x.valoresDepois, x.valoresAntes)}</td>
              </tr>
            ))}
            {!auditoria.length && (
              <tr><td colSpan="8" className="text-center text-muted py-4">Nenhuma alteração auditada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

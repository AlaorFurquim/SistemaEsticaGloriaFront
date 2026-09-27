import CampoComMascara from "../components/CampoComMascara";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import useBrandingPublico from "../components/useBrandingPublico";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { formatarMoeda, mascaraCpfCnpj, mascaraTelefone } from "../utils/masks";
import { iniciaisEmpresa } from "../utils/branding";

const formularioInicial = {
  nome: "",
  telefone: "",
  email: "",
  documento: "",
  observacao: "",
  aceitouContato: false
};

export default function PlanosPublicos() {
  const branding = useBrandingPublico();
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [pacotes, setPacotes] = useState([]);
  const [pacoteId, setPacoteId] = useState("");
  const [form, setForm] = useState(formularioInicial);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);


  useEffect(() => {
    async function carregarEmpresas() {
      try {
        const res = await api.get("/publico/planos/empresas");
        const lista = res.data || [];
        setEmpresas(lista);
        if (lista.length) {
          setEmpresaId(String(lista[0].id));
          setUnidadeId(String(lista[0].unidades?.[0]?.id || ""));
        }
      } catch (error) {
        alertaErro(error.response?.data || "Não foi possível carregar empresas com planos disponíveis.");
      } finally {
        setCarregando(false);
      }
    }

    carregarEmpresas();
  }, []);

  useEffect(() => {
    async function carregarPacotes() {
      if (!unidadeId) {
        setPacotes([]);
        setPacoteId("");
        return;
      }

      try {
        const res = await api.get(`/publico/planos/unidades/${unidadeId}/pacotes`);
        setPacotes(res.data || []);
        setPacoteId(res.data?.[0]?.id ? String(res.data[0].id) : "");
      } catch (error) {
        setPacotes([]);
        setPacoteId("");
        alertaErro(error.response?.data || "Não foi possível carregar os planos dessa empresa.");
      }
    }

    carregarPacotes();
  }, [unidadeId]);

  const empresaSelecionada = useMemo(
    () => empresas.find(x => String(x.id) === String(empresaId)),
    [empresas, empresaId]
  );

  const pacoteSelecionado = useMemo(
    () => pacotes.find(x => String(x.id) === String(pacoteId)),
    [pacotes, pacoteId]
  );

  function alterarEmpresa(id) {
    const empresa = empresas.find(x => String(x.id) === String(id));
    setEmpresaId(id);
    setUnidadeId(String(empresa?.unidades?.[0]?.id || ""));
    setPacoteId("");
  }

  function alterar(campo, valor) {
    setForm(atual => ({ ...atual, [campo]: valor }));
  }

  async function solicitarPlano(e) {
    e.preventDefault();
    if (!unidadeId) return alertaErro("Escolha a empresa/unidade.");
    if (!pacoteId) return alertaErro("Escolha um plano disponível.");
    if (!form.aceitouContato) return alertaErro("Autorize o contato para a empresa confirmar sua solicitação.");

    try {
      setEnviando(true);
      const res = await api.post("/publico/planos/solicitar", {
        unidadeId: Number(unidadeId),
        pacoteServicoId: Number(pacoteId),
        ...form
      });

      await alertaSucesso(res.data?.mensagem || "Solicitação enviada com sucesso.");
      setForm(formularioInicial);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível enviar sua solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="public-plans-page">
      <section className="public-plans-hero">
        <Link className="signup-brand" to="/login">
          <span className="signup-brand-mark">
            {branding.logoImagem ? <img src={branding.logoImagem} alt="Logo" /> : iniciaisEmpresa(branding.nomeEmpresa)}
          </span>
          <span>
            <strong>Planos da clínica</strong>
            <small>Escolha empresa, pacote e solicite contato</small>
          </span>
        </Link>

        <div>
          <span className="signup-kicker">Pacotes e planos</span>
          <h1>Escolha o plano disponível na clínica.</h1>
          <p>
            Selecione a empresa, veja os pacotes ativos e envie seus dados. A equipe entra em contato para confirmar pagamento e liberar o plano.
          </p>
        </div>
      </section>

      <section className="public-plans-panel">
        <form className="public-plans-card" onSubmit={solicitarPlano}>
          <header>
            <span className="signup-kicker">Solicitação do cliente</span>
            <h2>Quero contratar um plano</h2>
            <p>Essa área é para o cliente da clínica escolher um pacote disponível.</p>
          </header>

          {carregando ? (
            <div className="operation-hint">Carregando planos disponíveis...</div>
          ) : empresas.length === 0 ? (
            <div className="operation-hint">Nenhuma empresa com pacote ativo disponível no momento.</div>
          ) : (
            <>
              <div className="signup-grid">
                <label>
                  Empresa
                  <select className="form-control" value={empresaId} onChange={e => alterarEmpresa(e.target.value)} required>
                    {empresas.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
                  </select>
                </label>

                <label>
                  Unidade
                  <select className="form-control" value={unidadeId} onChange={e => setUnidadeId(e.target.value)} required>
                    {(empresaSelecionada?.unidades || []).map(unidade => (
                      <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="public-package-grid">
                {pacotes.map(pacote => (
                  <button
                    type="button"
                    key={pacote.id}
                    className={String(pacoteId) === String(pacote.id) ? "active" : ""}
                    onClick={() => setPacoteId(String(pacote.id))}
                  >
                    <span>{pacote.servico || "Plano da clínica"}</span>
                    <strong>{pacote.nome}</strong>
                    <b>{formatarMoeda(pacote.valor)}</b>
                    <small>{pacote.quantidadeSessoes} sessão(ões) • validade {pacote.validadeDias} dia(s)</small>
                  </button>
                ))}
              </div>

              {pacoteSelecionado && (
                <div className="public-plan-summary">
                  <span>Plano selecionado</span>
                  <strong>{pacoteSelecionado.nome} — {formatarMoeda(pacoteSelecionado.valor)}</strong>
                </div>
              )}

              <div className="signup-grid">
                <label className="signup-wide">
                  Nome completo
                  <input className="form-control" value={form.nome} onChange={e => alterar("nome", e.target.value)} required />
                </label>

                <label>
                  WhatsApp
                  <CampoComMascara mascara="telefone" className="form-control" value={form.telefone} onChange={e => alterar("telefone", mascaraTelefone(e.target.value))} placeholder="(00) 00000-0000" />
                </label>

                <label>
                  E-mail
                  <input className="form-control" type="email" value={form.email} onChange={e => alterar("email", e.target.value)} placeholder="cliente@email.com" />
                </label>

                <label className="signup-wide">
                  CPF/CNPJ
                  <CampoComMascara mascara="documento" className="form-control" value={form.documento} onChange={e => alterar("documento", mascaraCpfCnpj(e.target.value))} placeholder="Opcional" />
                </label>

                <label className="signup-wide">
                  Observação
                  <textarea className="form-control" rows="3" value={form.observacao} onChange={e => alterar("observacao", e.target.value)} placeholder="Ex.: melhor horário para contato, dúvida sobre pagamento..." />
                </label>
              </div>

              <label className="signup-contract-accept">
                <input type="checkbox" checked={form.aceitouContato} onChange={e => alterar("aceitouContato", e.target.checked)} required />
                <span>Autorizo a empresa escolhida a entrar em contato comigo para confirmar a contratação, pagamento e liberação do plano.</span>
              </label>

              <button className="btn btn-primary signup-submit" disabled={enviando || !pacoteId}>
                {enviando ? "Enviando..." : "Enviar solicitação"}
              </button>
            </>
          )}

          <Link className="btn btn-outline-primary signup-back" to="/login">Voltar para o login</Link>
        </form>
      </section>
    </main>
  );
}

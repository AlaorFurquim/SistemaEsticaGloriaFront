import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, confirmarAcao } from "../utils/alerts";

const inicial = {
  cnpj: "",
  acbrEmpresaId: "",
  ambiente: "homologacao",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  codigoUf: "",
  codigoMunicipio: "",
  lote: 1,
  serie: "1",
  numero: 1,
  opSimpNac: 3,
  regApTribSN: 1,
  regEspTrib: 0,
  incentivoFiscal: false
};

const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numero = (valor) => Number(valor || 0).toLocaleString("pt-BR");

const mensagemErro = (error, padrao) =>
  error.response?.data?.mensagem || error.response?.data || padrao;

export default function ConfiguracaoNfse() {
  const [form, setForm] = useState(inicial);
  const [status, setStatus] = useState(null);
  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [contratandoId, setContratandoId] = useState(null);

  async function carregar() {
    try {
      setCarregando(true);
      const resposta = await api.get("/tenant/fiscal");
      setStatus(resposta.data.status);
      setPlanos(resposta.data.planos || []);
      setForm({ ...inicial, ...(resposta.data.configuracao || {}) });
    } catch (error) {
      alertaErro(mensagemErro(error, "Não foi possível carregar a configuração fiscal."));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterar(e) {
    const { name, value, type, checked } = e.target;
    setForm((atual) => ({
      ...atual,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function montarPayload() {
    return {
      ...form,
      lote: Number(form.lote),
      numero: Number(form.numero),
      opSimpNac: Number(form.opSimpNac),
      regApTribSN: Number(form.regApTribSN),
      regEspTrib: Number(form.regEspTrib)
    };
  }

  async function contratar(plano) {
    if (contratandoId || plano.id === status?.planoFiscalSaasId) return;
    const total = Number(status?.mensalidadeBase || 0) + Number(plano.valorMensal || 0);
    const confirmado = await confirmarAcao(
      status?.habilitada ? "Trocar plano fiscal?" : "Contratar emissão fiscal?",
      `${plano.nome}: ${numero(plano.limiteNotasMensal)} emissões por mês por ${moeda(plano.valorMensal)} adicionais. Sua mensalidade total será ${moeda(total)}.`
    );
    if (!confirmado) return;

    try {
      setContratandoId(plano.id);
      const resposta = await api.post("/tenant/fiscal/contratar", {
        planoFiscalSaasId: plano.id,
        confirmarCobranca: true
      });
      await carregar();
      alertaSucesso(resposta.data?.mensagem || "Plano fiscal contratado com sucesso.");
    } catch (error) {
      alertaErro(mensagemErro(error, "Não foi possível contratar o plano fiscal."));
    } finally {
      setContratandoId(null);
    }
  }

  async function salvarConfiguracao() {
    await api.put("/tenant/fiscal/configuracao", montarPayload());
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      setSalvando(true);
      await salvarConfiguracao();
      await carregar();
      alertaSucesso("Configuração fiscal da empresa salva com sucesso.");
    } catch (error) {
      alertaErro(mensagemErro(error, "Não foi possível salvar a configuração fiscal."));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarParaAcbr() {
    try {
      setSalvando(true);
      const payload = montarPayload();
      await api.put("/tenant/fiscal/configuracao", payload);
      await api.put("/notas-fiscais/configurar-nfse-sistema", {
        ambiente: payload.ambiente,
        lote: payload.lote,
        serie: payload.serie,
        numero: payload.numero,
        opSimpNac: payload.opSimpNac,
        regApTribSN: payload.regApTribSN,
        regEspTrib: payload.regEspTrib,
        incentivoFiscal: payload.incentivoFiscal
      });
      await carregar();
      alertaSucesso("Configuração salva e enviada para a ACBr.");
    } catch (error) {
      alertaErro(mensagemErro(error, "Não foi possível enviar a configuração para a ACBr."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Configuração fiscal ACBr"
        subtitle="Plano de emissão e dados fiscais da empresa"
      />

      {carregando && <div className="panel fiscal-state-panel">Carregando configuração fiscal...</div>}

      {!carregando && status && (
        <div className="fiscal-contract-strip">
          <div>
            <span>Módulo fiscal</span>
            <strong className={status.habilitada ? "fiscal-enabled" : "fiscal-disabled"}>
              {status.habilitada ? "Ativo" : "Não contratado"}
            </strong>
          </div>
          <div><span>Plano</span><strong>{status.planoNome || "Sem plano"}</strong></div>
          <div><span>Emissões no mês</span><strong>{status.emitidasNoMes} / {status.limiteMensal}</strong></div>
          <div><span>Disponíveis</span><strong>{status.restantes}</strong></div>
          <div><span>Adicional mensal</span><strong>{moeda(status.valorAdicionalMensal)}</strong></div>
        </div>
      )}

      {!carregando && status && (
        <section className="panel fiscal-plans-section">
          <header>
            <div>
              <span>Emissão fiscal</span>
              <h2>{status.habilitada ? "Seu plano e outras opções" : "Escolha seu plano"}</h2>
            </div>
            {status.habilitada && <strong className="fiscal-current-total">Total mensal: {moeda(status.mensalidadeTotal)}</strong>}
          </header>

          {!status.plataformaAcbrConfigurada && (
            <div className="alert alert-warning mb-0">
              Novas contratações estão temporariamente indisponíveis.
            </div>
          )}

          {planos.length === 0 && (
            <div className="fiscal-plans-empty">
              Nenhum plano fiscal está disponível no momento.
            </div>
          )}

          <div className="fiscal-plan-grid">
            {planos.map((plano) => {
              const atual = plano.id === status.planoFiscalSaasId;
              return (
                <article className={`fiscal-plan-option ${atual ? "selected" : ""}`} key={plano.id}>
                  <div className="fiscal-plan-title">
                    <span>{atual ? "Plano atual" : "Plano disponível"}</span>
                    <h3>{plano.nome}</h3>
                  </div>
                  {plano.descricao && <p>{plano.descricao}</p>}
                  <div className="fiscal-plan-limit">
                    <strong>{numero(plano.limiteNotasMensal)}</strong>
                    <span>emissões por mês</span>
                  </div>
                  <div className="fiscal-plan-price">
                    <strong>{moeda(plano.valorMensal)}</strong>
                    <span>adicionais por mês</span>
                  </div>
                  <button
                    type="button"
                    className={`btn ${atual ? "btn-light" : "btn-primary"}`}
                    disabled={atual || contratandoId !== null || !status.plataformaAcbrConfigurada}
                    onClick={() => contratar(plano)}
                  >
                    {atual ? "Plano contratado" : contratandoId === plano.id ? "Contratando..." : status.habilitada ? "Trocar para este plano" : "Contratar plano"}
                  </button>
                </article>
              );
            })}
          </div>
          <small className="fiscal-plan-note">A contratação entra na cobrança mensal da empresa. Operações fiscais consomem créditos da franquia.</small>
        </section>
      )}

      {!carregando && status?.habilitada && (
        <form onSubmit={salvar} className="panel fiscal-settings-form">
          {!status.plataformaAcbrConfigurada && (
            <div className="alert alert-danger mb-0">
              A conta técnica da ACBr ainda não foi configurada pela administração da plataforma.
            </div>
          )}

          <fieldset>
            <legend>Emitente</legend>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">CNPJ emitente</label>
                <input name="cnpj" className="form-control" value={form.cnpj} onChange={alterar} inputMode="numeric" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Identificador da empresa na ACBr</label>
                <input name="acbrEmpresaId" className="form-control" value={form.acbrEmpresaId || ""} onChange={alterar} placeholder="Opcional" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Ambiente</label>
                <select name="ambiente" className="form-select" value={form.ambiente} onChange={alterar}>
                  <option value="homologacao">Homologação</option>
                  <option value="producao">Produção</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Inscrição estadual</label>
                <input name="inscricaoEstadual" className="form-control" value={form.inscricaoEstadual || ""} onChange={alterar} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Inscrição municipal</label>
                <input name="inscricaoMunicipal" className="form-control" value={form.inscricaoMunicipal || ""} onChange={alterar} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Código da UF</label>
                <input name="codigoUf" className="form-control" value={form.codigoUf || ""} onChange={alterar} maxLength={2} inputMode="numeric" required />
              </div>
              <div className="col-md-3">
                <label className="form-label">Código IBGE do município</label>
                <input name="codigoMunicipio" className="form-control" value={form.codigoMunicipio || ""} onChange={alterar} maxLength={7} inputMode="numeric" required />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>NFS-e e RPS</legend>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Lote</label>
                <input type="number" name="lote" className="form-control" value={form.lote} onChange={alterar} min="1" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Série</label>
                <input name="serie" className="form-control" value={form.serie} onChange={alterar} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Número inicial</label>
                <input type="number" name="numero" className="form-control" value={form.numero} onChange={alterar} min="1" required />
              </div>
              <div className="col-md-4">
                <label className="form-label">Simples Nacional</label>
                <select name="opSimpNac" className="form-select" value={form.opSimpNac} onChange={alterar}>
                  <option value={1}>Não optante</option>
                  <option value={2}>Optante MEI</option>
                  <option value={3}>Optante ME/EPP</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Regime de apuração</label>
                <select name="regApTribSN" className="form-select" value={form.regApTribSN} onChange={alterar}>
                  <option value={1}>Simples Nacional normal</option>
                  <option value={2}>Simples federal / ISS fora</option>
                  <option value={3}>Tributos fora do Simples</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Regime especial</label>
                <select name="regEspTrib" className="form-select" value={form.regEspTrib} onChange={alterar}>
                  <option value={0}>Nenhum</option>
                  <option value={1}>Cooperativa</option>
                  <option value={2}>Estimativa</option>
                  <option value={3}>Microempresa municipal</option>
                  <option value={4}>Notário ou registrador</option>
                  <option value={5}>Profissional autônomo</option>
                  <option value={6}>Sociedade de profissionais</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-check fiscal-checkbox">
                  <input type="checkbox" name="incentivoFiscal" className="form-check-input" checked={!!form.incentivoFiscal} onChange={alterar} />
                  <span className="form-check-label">Possui incentivo fiscal</span>
                </label>
              </div>
            </div>
          </fieldset>

          <footer className="fiscal-settings-actions">
            <button type="submit" className="btn btn-outline-primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar dados"}
            </button>
            <button type="button" className="btn btn-primary" onClick={enviarParaAcbr} disabled={salvando || !status.plataformaAcbrConfigurada}>
              Salvar e enviar para ACBr
            </button>
          </footer>
        </form>
      )}
    </div>
  );
}

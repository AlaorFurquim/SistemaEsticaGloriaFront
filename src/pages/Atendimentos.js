import { useEffect, useMemo, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarDataHora, formatarMoeda } from "../utils/masks";
import { alertaErro } from "../utils/alerts";

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [registroAberto, setRegistroAberto] = useState(false);
  const [registro, setRegistro] = useState(null);
  const [registroFotos, setRegistroFotos] = useState({ anamnese: [], evolucao: [] });
  const [clinica, setClinica] = useState(null);
  const [termoImpressao, setTermoImpressao] = useState(null);

  async function carregar() {
    try {
      const [atendimentosRes, clientesRes] = await Promise.all([
        api.get("/atendimentos"),
        api.get("/clientes")
      ]);

      setAtendimentos(atendimentosRes.data || []);
      setClientes(clientesRes.data || []);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "N\u00e3o foi poss\u00edvel carregar o hist\u00f3rico de atendimentos."
      );
    }
  }

  function textoTipoConsulta(atendimento) {
    if (atendimento.retorno || atendimento.tipoConsulta === "Retorno") {
      return "Retorno";
    }

    return "Atendimento";
  }

  function badgeStatus(valor) {
    if (valor === "Concluido") {
      return <span className="badge bg-success">Conclu&iacute;do</span>;
    }

    if (valor === "Cancelado") {
      return <span className="badge bg-danger">Cancelado</span>;
    }

    return <span className="badge bg-warning text-dark">{valor || "Agendado"}</span>;
  }

  function parseJson(valor, fallback) {
    if (!valor) return fallback;
    try {
      return JSON.parse(valor);
    } catch {
      return fallback;
    }
  }

  async function abrirRegistro(item) {
    try {
      const [res, fotosRes, prontuariosRes] = await Promise.all([
        api.get(`/atendimentos/${item.id}/fluxo`),
        api.get(`/fotos-evolucao?clienteId=${item.clienteId}`),
        api.get(`/prontuarios/cliente/${item.clienteId}`)
      ]);

      const fotosEvolucao = await carregarFotosEvolucao(item, fotosRes.data || []);
      const fotosAnamnese = await carregarFotosAnamnese(item, prontuariosRes.data || []);

      setRegistro({
        atendimento: item,
        fluxo: res.data,
        form: parseJson(res.data?.formJson, {})
      });
      setRegistroFotos({ anamnese: fotosAnamnese, evolucao: fotosEvolucao });
      setRegistroAberto(true);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível abrir o registro do atendimento.");
    }
  }

  async function imprimirTermoRegistro() {
    const termoId = registro?.fluxo?.termoConsentimentoId;
    if (!termoId) return;

    try {
      const [termoRes, clinicaRes] = await Promise.all([
        api.post(`/termos-consentimento/${termoId}/registrar-impressao`),
        api.get("/configuracao-clinica")
      ]);

      setClinica(clinicaRes.data || null);
      setTermoImpressao(termoRes.data);
      setTimeout(() => window.print(), 150);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível imprimir o termo.");
    }
  }

  function enviarTermoWhatsApp(cliente, linkTermo) {
    const telefone = String(cliente?.telefone || "").replace(/\D/g, "");

    if (!telefone) {
      alertaErro("Cliente sem telefone cadastrado.");
      return;
    }

    if (!linkTermo) {
      alertaErro("Termo sem link de aceite.");
      return;
    }

    const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
    const texto = `Olá ${cliente?.nome || ""}, segue o termo de consentimento para leitura e aceite: ${linkTermo}`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  function normalizarUrlApi(url) {
    if (!url) return "";
    return String(url).replace(/^\/api\//, "/");
  }

  async function criarUrlImagem(url) {
    try {
      const res = await api.get(normalizarUrlApi(url), { responseType: "blob" });
      if (!String(res.data?.type || "").startsWith("image/")) return null;
      return URL.createObjectURL(res.data);
    } catch {
      return null;
    }
  }

  async function carregarFotosEvolucao(item, fotos) {
    const marcador = `atendimento-${item.id}`;
    const relacionadas = fotos.filter((foto) => String(foto.tags || "").includes(marcador));
    const imagens = [];

    for (const foto of relacionadas) {
      const antes = foto.urlAntes ? await criarUrlImagem(foto.urlAntes) : null;
      const depois = foto.urlDepois ? await criarUrlImagem(foto.urlDepois) : null;

      if (antes) imagens.push({ titulo: "Antes", nome: foto.nomeArquivoAntes, url: antes });
      if (depois) imagens.push({ titulo: "Depois", nome: foto.nomeArquivoDepois, url: depois });
    }

    return imagens;
  }

  async function carregarFotosAnamnese(item, prontuarios) {
    const relacionadas = prontuarios.filter((prontuario) =>
      String(prontuario.observacoes || "").toLowerCase().includes(`atendimento #${item.id}`)
    );

    const imagens = [];

    for (const prontuario of relacionadas) {
      for (const anexo of prontuario.anexos || []) {
        if (!String(anexo.tipoArquivo || "").startsWith("image/")) continue;
        const url = await criarUrlImagem(`/prontuarios/anexos/${anexo.id}`);
        if (url) imagens.push({ titulo: "Anamnese", nome: anexo.nomeArquivo, url });
      }
    }

    return imagens;
  }

  function fecharRegistro() {
    [...registroFotos.anamnese, ...registroFotos.evolucao].forEach((foto) => {
      if (foto.url) URL.revokeObjectURL(foto.url);
    });

    setRegistroAberto(false);
    setRegistro(null);
    setRegistroFotos({ anamnese: [], evolucao: [] });
  }

  function subtotalOrcamento(form) {
    return (form.orcamentoItens || []).reduce((soma, item) => soma + Number(item.total || 0), 0);
  }

  function totalOrcamento(form) {
    return subtotalOrcamento(form) - Number(form.desconto || 0);
  }

  function temValor(valor) {
    if (valor === null || valor === undefined) return false;
    if (Array.isArray(valor)) return valor.length > 0;
    return String(valor).trim() !== "";
  }

  function detalhe(label, valor, extraClass = "") {
    if (!temValor(valor)) return null;

    return (
      <div>
        <span>{label}</span>
        <strong className={extraClass}>{valor}</strong>
      </div>
    );
  }

  const clienteSelecionado = clientes.find((x) => String(x.id) === String(clienteId));

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return atendimentos
      .filter((item) => !clienteId || String(item.clienteId) === String(clienteId))
      .filter((item) => status === "TODOS" || item.status === status)
      .filter((item) => {
        if (!termo) return true;

        const texto = [
          item.cliente?.nome,
          item.servico?.nome,
          item.profissional?.nome,
          item.status,
          textoTipoConsulta(item)
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return texto.includes(termo);
      })
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }, [atendimentos, busca, clienteId, status]);

  const totalAtendimentos = filtrados.length;
  const totalConcluidos = filtrados.filter((x) => x.status === "Concluido").length;
  const totalValor = filtrados.reduce(
    (soma, item) => soma + Number(item.valorFinal || item.valor || 0),
    0
  );

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        subtitle={"Hist\u00f3rico de servi\u00e7os por cliente"}
      />

      <div className="panel mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label>Cliente</label>
            <select
              className="form-select"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label>Status</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="Agendado">Agendado</option>
              <option value="Concluido">Conclu&iacute;do</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="col-md-4">
            <label>Pesquisar</label>
            <input
              className="form-control"
              placeholder={"Servi\u00e7o, profissional ou status"}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="col-md-1 d-flex">
            <button
              type="button"
              className="btn btn-light w-100"
              onClick={() => {
                setClienteId("");
                setStatus("TODOS");
                setBusca("");
              }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <div className="metric-card">
            <span>{clienteSelecionado ? "Cliente selecionado" : "Pesquisa geral"}</span>
            <strong>{clienteSelecionado?.nome || "Todos os clientes"}</strong>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <span>Atendimentos encontrados</span>
            <strong>{totalAtendimentos}</strong>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <span>Conclu&iacute;dos / Total</span>
            <strong>
              {totalConcluidos} / {formatarMoeda(totalValor)}
            </strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Servi&ccedil;o</th>
              <th>Profissional</th>
              <th>Tipo</th>
              <th>Status</th>
              <th className="text-end">Valor</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map((item) => (
              <tr key={item.id}>
                <td>{formatarDataHora(item.dataHora)}</td>
                <td>{item.cliente?.nome || "-"}</td>
                <td>{item.servico?.nome || "-"}</td>
                <td>{item.profissional?.nome || "-"}</td>
                <td>
                  <span className="badge bg-primary">
                    {textoTipoConsulta(item)}
                  </span>
                </td>
                <td>{badgeStatus(item.status)}</td>
                <td className="text-end fw-bold">
                  {formatarMoeda(item.valorFinal || item.valor || 0)}
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-light btn-sm" onClick={() => abrirRegistro(item)}>
                    Registro
                  </button>
                </td>
              </tr>
            ))}

            {!filtrados.length && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  Nenhum atendimento encontrado para a pesquisa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {registroAberto && registro && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,.55)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Registro do atendimento</h5>
                  <small>{registro.atendimento.cliente?.nome || "-"} • {formatarDataHora(registro.atendimento.dataHora)}</small>
                </div>
                <button type="button" className="btn-close" onClick={fecharRegistro} />
              </div>

              <div className="modal-body">
                <div className="attendance-record">
                  <section>
                    <h6>Cadastro e atendimento</h6>
                    <div className="agenda-detail-list">
                      {detalhe("Paciente", registro.atendimento.cliente?.nome)}
                      {detalhe("Telefone", registro.atendimento.cliente?.telefone)}
                      {detalhe("Documento", registro.atendimento.cliente?.documento)}
                      {detalhe("Email", registro.atendimento.cliente?.email)}
                      {detalhe("Serviço", registro.atendimento.servico?.nome)}
                      {detalhe("Profissional", registro.atendimento.profissional?.nome)}
                      {detalhe("Data", registro.atendimento.dataHora ? formatarDataHora(registro.atendimento.dataHora) : "")}
                      {detalhe("Status", registro.atendimento.status)}
                      {registro.atendimento.retorno ? detalhe("Retorno de", registro.atendimento.atendimentoOrigemId ? `Atendimento #${registro.atendimento.atendimentoOrigemId}` : "Atendimento anterior") : null}
                      {registro.form.temRetorno === "sim" ? detalhe("Retorno agendado", `${registro.form.dataRetorno || ""} ${registro.form.horarioRetorno || ""}`.trim()) : null}
                    </div>
                  </section>

                  {(temValor(registro.form.queixas) || temValor(registro.form.anamnese)) && <section>
                    <h6>Queixas e anamnese</h6>
                    <div className="agenda-detail-list">
                      {detalhe("Queixas", registro.form.queixas)}
                      {detalhe("Anamnese", registro.form.anamnese)}
                    </div>
                  </section>}

                  <section>
                    <h6>Orçamento</h6>
                    <div className="agenda-detail-list">
                      {detalhe("Status", registro.form.orcamentoStatus)}
                      {Number(registro.form.desconto || 0) > 0 ? detalhe("Desconto", formatarMoeda(registro.form.desconto || 0)) : null}
                      <div><span>Subtotal</span><strong>{formatarMoeda(subtotalOrcamento(registro.form))}</strong></div>
                      <div><span>Total</span><strong>{formatarMoeda(totalOrcamento(registro.form))}</strong></div>
                      {detalhe("Justificativa", registro.form.justificativaOrcamentoNegado)}
                      {detalhe("Observações", registro.form.orcamentoObservacoes)}
                    </div>

                    <table className="table professional-table mt-3">
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Descrição</th>
                          <th>Qtd.</th>
                          <th>Valor unit.</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(registro.form.orcamentoItens || []).map((item, index) => (
                          <tr key={index}>
                            <td>{item.tipo === "PRODUTO" ? "Produto" : "Serviço"}</td>
                            <td>{item.descricao || "-"}</td>
                            <td>{item.quantidade || 0}</td>
                            <td>{formatarMoeda(item.valorUnitario || 0)}</td>
                            <td>{formatarMoeda(item.total || 0)}</td>
                          </tr>
                        ))}
                        {!(registro.form.orcamentoItens || []).length && <tr><td colSpan="5" className="text-muted">Nenhum item salvo.</td></tr>}
                      </tbody>
                    </table>
                  </section>

                  {(registro.fluxo?.termoAceito || temValor(registro.form.linkTermo) || temValor(registro.fluxo?.contratoTexto) || temValor(registro.form.contratoObservacoes)) && <section>
                    <h6>Termo, LGPD e contrato</h6>
                    <div className="agenda-detail-list">
                      {registro.fluxo?.termoAceito ? detalhe("Aceite LGPD", `Aceito em ${formatarDataHora(registro.fluxo.dataAceiteTermo)}`) : null}
                      {registro.fluxo?.termoConsentimentoId ? detalhe("Termo", `Termo #${registro.fluxo.termoConsentimentoId}`) : null}
                      {detalhe("Link do termo", registro.form.linkTermo)}
                      {detalhe("Contrato", registro.fluxo?.contratoTexto || registro.form.contratoObservacoes, "attendance-preline")}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {registro.fluxo?.termoConsentimentoId ? (
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={imprimirTermoRegistro}>
                          Imprimir termo
                        </button>
                      ) : null}
                      {registro.form.linkTermo ? (
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          onClick={() => enviarTermoWhatsApp(registro.atendimento.cliente, registro.form.linkTermo)}
                        >
                          Enviar WhatsApp
                        </button>
                      ) : null}
                    </div>
                  </section>}

                  {(registro.form.precisaReceita === "sim" || registro.fluxo?.receitaId) && <section>
                    <h6>Receita</h6>
                    <div className="agenda-detail-list">
                      {detalhe("Precisa receita?", registro.form.precisaReceita === "sim" ? "Sim" : "")}
                      {detalhe("Receita vinculada", registro.fluxo?.receitaId ? `Receita #${registro.fluxo.receitaId}` : "")}
                      {detalhe("Tipo", registro.form.receitaTipo)}
                      {detalhe("Validade", registro.form.receitaValidade)}
                      {detalhe("Vias", registro.form.receitaNumeroVias)}
                      {detalhe("Orientações", registro.form.receitaOrientacoes)}
                      {detalhe("Observações", registro.form.receitaObservacoes)}
                    </div>

                    {registro.form.precisaReceita === "sim" ? (
                      <table className="table professional-table mt-3">
                        <thead><tr><th>Medicamento</th><th>Concentração</th><th>Quantidade</th><th>Posologia</th></tr></thead>
                        <tbody>
                          {(registro.form.receitaItens || []).map((item, index) => (
                            <tr key={index}>
                              <td>{item.medicamentoSubstancia || "-"}</td>
                              <td>{item.concentracao || "-"}</td>
                              <td>{item.quantidade || "-"}</td>
                              <td>{item.posologia || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </section>}

                  {(temValor(registro.form.formaPagamento) || temValor(registro.form.vencimento) || registro.form.marcarComoPago || temValor(registro.form.observacoesFinanceiro)) && <section>
                    <h6>Pagamento</h6>
                    <div className="agenda-detail-list">
                      {detalhe("Forma", registro.form.formaPagamento)}
                      {detalhe("Vencimento", registro.form.vencimento)}
                      {registro.form.marcarComoPago ? detalhe("Status", "Pago") : null}
                      {detalhe("Observações", registro.form.observacoesFinanceiro)}
                      {registro.form.temRetorno === "sim" ? detalhe("Retorno", `${registro.form.dataRetorno || ""} ${registro.form.horarioRetorno || ""}`.trim()) : null}
                    </div>
                  </section>}
                </div>

                {registroFotos.anamnese.length ? <div className="attendance-photo-section">
                  <h6>Fotos da anamnese</h6>
                  <div className="attendance-photo-grid">
                    {registroFotos.anamnese.map((foto, index) => (
                      <figure key={`${foto.titulo}-${index}`}>
                        <img src={foto.url} alt={foto.nome || foto.titulo} />
                        <figcaption>{foto.nome || foto.titulo}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div> : null}

                {(registroFotos.evolucao.length || (registro.form.fotosAntes || []).length || (registro.form.fotosDepois || []).length) ? <div className="attendance-photo-section">
                  <h6>Fotos antes/depois</h6>
                  {registroFotos.evolucao.length ? (
                    <div className="attendance-photo-grid">
                      {registroFotos.evolucao.map((foto, index) => (
                        <figure key={`${foto.titulo}-${index}`}>
                          <img src={foto.url} alt={foto.nome || foto.titulo} />
                          <figcaption>{foto.titulo}{foto.nome ? ` - ${foto.nome}` : ""}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <div className="attendance-photo-empty">
                      <p className="text-muted mb-1">Nenhuma prévia disponível para este atendimento.</p>
                      {((registro.form.fotosAntes || []).length || (registro.form.fotosDepois || []).length) ? (
                        <small>
                          Antes: {(registro.form.fotosAntes || []).join(", ") || "-"}
                          <br />
                          Depois: {(registro.form.fotosDepois || []).join(", ") || "-"}
                        </small>
                      ) : null}
                    </div>
                  )}
                </div> : null}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={fecharRegistro}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {termoImpressao && (
        <div className="termo-print-area">
          <div className="termo-print-header">
            <img src="/logo-gloria.jpeg" alt="Glória Couto" />
            <div>
              <h1>{termoImpressao.titulo}</h1>
              <p>{clinica?.nome || "Glória Couto"} {clinica?.cnpj ? `- CNPJ ${clinica.cnpj}` : ""}</p>
              <small>{[clinica?.endereco, clinica?.cidade, clinica?.uf].filter(Boolean).join(" - ")}</small>
            </div>
          </div>
          <div className="termo-print-info">
            <div><strong>Cliente</strong><span>{termoImpressao.cliente?.nome}</span></div>
            <div><strong>Documento</strong><span>{termoImpressao.cliente?.documento || "Não informado"}</span></div>
            <div><strong>Procedimento</strong><span>{termoImpressao.procedimento}</span></div>
            <div><strong>Data</strong><span>{formatarDataHora(termoImpressao.data)}</span></div>
          </div>
          <section><p>{termoImpressao.texto}</p></section>
          {termoImpressao.riscosBeneficios && <section><strong>Riscos e benefícios</strong><p>{termoImpressao.riscosBeneficios}</p></section>}
          {termoImpressao.cuidadosPosProcedimento && <section><strong>Cuidados pós-procedimento</strong><p>{termoImpressao.cuidadosPosProcedimento}</p></section>}
          <div className="termo-validation">Código de validação: <strong>{termoImpressao.codigoValidacao}</strong></div>
          <div className="termo-assinaturas">
            <div><span>{termoImpressao.nomeAssinaturaCliente || termoImpressao.cliente?.nome}</span><small>Assinatura do cliente</small></div>
            <div><span>{termoImpressao.profissional?.nome || ""}</span><small>Profissional responsável</small></div>
          </div>
        </div>
      )}
    </div>
  );
}

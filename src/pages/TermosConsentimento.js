import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, confirmarAcao, loading, fecharLoading } from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const textoPadrao = `Declaro que recebi informações claras sobre o procedimento, seus objetivos, possíveis riscos, cuidados necessários e alternativas. Autorizo a realização do procedimento descrito e comprometo-me a seguir as orientações recebidas.

LGPD e uso de imagem:
Autorizo o registro de fotografias e imagens estritamente necessárias para prontuário, acompanhamento da evolução, comparação de antes e depois, documentação técnica do atendimento e proteção dos direitos da paciente e da profissional.
Estou ciente de que dados pessoais, dados de saúde/estética e imagens serão tratados com finalidade específica, segurança, acesso restrito e pelo tempo necessário ao atendimento, podendo solicitar informações, correção, revogação do consentimento aplicável e demais direitos previstos na LGPD.
O uso de imagem para divulgação externa, redes sociais, portfólio, materiais comerciais ou publicidade somente poderá ocorrer mediante autorização específica e destacada da paciente.`;

const inicial = {
  clienteId: "",
  profissionalId: "",
  procedimento: "",
  titulo: "Termo de Consentimento para Procedimento Estético",
  texto: textoPadrao,
  riscosBeneficios: "",
  cuidadosPosProcedimento: "",
  clienteDeclarouCiencia: false,
  nomeAssinaturaCliente: ""
};

export default function TermosConsentimento() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clinica, setClinica] = useState(null);
  const [form, setForm] = useState(inicial);
  const [termoImpressao, setTermoImpressao] = useState(null);
  const [arquivos, setArquivos] = useState({});

  async function carregar() {
    try {
      const [termos, clientesRes, profissionaisRes, clinicaRes] = await Promise.all([
        api.get("/termos-consentimento"),
        api.get("/clientes"),
        api.get("/profissionais"),
        api.get("/configuracao-clinica")
      ]);
      setLista(termos.data || []);
      setClientes(clientesRes.data || []);
      setProfissionais(profissionaisRes.data || []);
      setClinica(clinicaRes.data || null);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os termos.");
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.clienteId) return alertaErro("Selecione o cliente.");
    if (!form.procedimento.trim()) return alertaErro("Informe o procedimento.");
    if (!form.clienteDeclarouCiencia) return alertaErro("Marque a declaração de ciência do cliente.");

    const payload = {
      ...form,
      clienteId: Number(form.clienteId),
      profissionalId: form.profissionalId ? Number(form.profissionalId) : null
    };

    try {
      loading();
      const res = await api.post("/termos-consentimento", payload);
      setForm(inicial);
      await carregar();
      fecharLoading();
      alertaSucesso("Termo salvo com sucesso.");
      setTermoImpressao(res.data);
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar o termo.");
    }
  }

  async function imprimir(termo) {
    try {
      const res = await api.post(`/termos-consentimento/${termo.id}/registrar-impressao`);
      setTermoImpressao(res.data);
      setTimeout(() => window.print(), 150);
      await carregar();
    } catch {
      setTermoImpressao(termo);
      setTimeout(() => window.print(), 150);
    }
  }

  async function cancelar(termo) {
    const motivo = window.prompt("Informe o motivo do cancelamento:");
    if (!motivo) return;
    const ok = await confirmarAcao("Cancelar termo?", "O termo ficará no histórico como cancelado.");
    if (!ok) return;

    try {
      loading();
      await api.post(`/termos-consentimento/${termo.id}/cancelar`, { motivo });
      await carregar();
      fecharLoading();
      alertaSucesso("Termo cancelado com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível cancelar o termo.");
    }
  }

  async function anexar(termo) {
    const arquivo = arquivos[termo.id];
    if (!arquivo) return alertaErro("Selecione um arquivo para anexar.");

    const data = new FormData();
    data.append("arquivo", arquivo);

    try {
      loading();
      await api.post(`/termos-consentimento/${termo.id}/anexos`, data, { headers: { "Content-Type": "multipart/form-data" } });
      setArquivos(atual => ({ ...atual, [termo.id]: null }));
      await carregar();
      fecharLoading();
      alertaSucesso("Anexo salvo no termo.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível anexar o arquivo.");
    }
  }

  async function baixarAnexos(termo) {
    try {
      const anexos = await api.get(`/termos-consentimento/${termo.id}/anexos`);
      if (!anexos.data?.length) return alertaErro("Este termo ainda não possui anexos.");

      for (const anexo of anexos.data) {
        const res = await api.get(`/termos-consentimento/anexos/${anexo.id}/download`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", anexo.nomeArquivo);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível baixar os anexos.");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Termos" subtitle="Consentimentos por procedimento com aceite, impressão e código de validação" />

        <form className="panel mb-3" onSubmit={salvar}>
          <div className="row g-2">
            <div className="col-md-3">
              <label>Cliente</label>
              <select className="form-select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}>
                <option value="">Selecione...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label>Profissional</label>
              <select className="form-select" value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })}>
                <option value="">Selecione...</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="col-md-3"><label>Procedimento</label><input className="form-control" value={form.procedimento} onChange={e => setForm({ ...form, procedimento: e.target.value })} /></div>
            <div className="col-md-3"><label>Título</label><input className="form-control" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="col-md-12"><label>Texto do termo</label><textarea className="form-control" rows="5" value={form.texto} onChange={e => setForm({ ...form, texto: e.target.value })} /></div>
            <div className="col-md-6"><label>Riscos e benefícios</label><textarea className="form-control" rows="3" value={form.riscosBeneficios} onChange={e => setForm({ ...form, riscosBeneficios: e.target.value })} /></div>
            <div className="col-md-6"><label>Cuidados pós-procedimento</label><textarea className="form-control" rows="3" value={form.cuidadosPosProcedimento} onChange={e => setForm({ ...form, cuidadosPosProcedimento: e.target.value })} /></div>
            <div className="col-md-4"><label>Nome para assinatura</label><input className="form-control" value={form.nomeAssinaturaCliente} onChange={e => setForm({ ...form, nomeAssinaturaCliente: e.target.value })} /></div>
            <div className="col-md-5 d-flex align-items-end">
              <label className="form-check">
                <input className="form-check-input" type="checkbox" checked={form.clienteDeclarouCiencia} onChange={e => setForm({ ...form, clienteDeclarouCiencia: e.target.checked })} />
                <span className="form-check-label">Cliente declarou ciência e consentimento</span>
              </label>
            </div>
            <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary w-100">Salvar termo</button></div>
          </div>
        </form>

        <div className="panel">
          <table className="table professional-table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Procedimento</th><th>Status</th><th>Validação</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map(t => (
                <tr key={t.id}>
                  <td>{formatarDataHora(t.data)}</td>
                  <td>{t.cliente?.nome}</td>
                  <td>{t.procedimento}</td>
                  <td>{t.status}</td>
                  <td>{t.codigoValidacao}</td>
                  <td className="actions">
                    <button className="btn btn-outline-primary btn-sm" onClick={() => imprimir(t)}>Imprimir</button>
                    <input className="form-control form-control-sm termo-anexo-input" type="file" onChange={e => setArquivos({ ...arquivos, [t.id]: e.target.files?.[0] })} />
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => anexar(t)}>Anexar</button>
                    <button className="btn btn-outline-dark btn-sm" onClick={() => baixarAnexos(t)}>Baixar anexos</button>
                    {t.status !== "Cancelado" && <button className="btn btn-outline-danger btn-sm" onClick={() => cancelar(t)}>Cancelar</button>}
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan="6" className="text-center text-muted py-4">Nenhum termo cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

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

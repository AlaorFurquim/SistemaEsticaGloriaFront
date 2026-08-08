import { useEffect, useState } from "react";
import api from "../api";
import AnamneseClinicaForm from "../components/AnamneseClinicaForm";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso, loading, fecharLoading } from "../utils/alerts";
import {
  criarAnamneseInicial,
  normalizarAnamnese,
  obterIndicadoresAnamnese,
  prepararPayloadAnamnese
} from "../utils/anamneseClinica";
import { formatarDataHora } from "../utils/masks";

export default function Anamneses() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState(() => criarAnamneseInicial());
  const [editandoId, setEditandoId] = useState(null);

  function limparFormulario() {
    setForm(criarAnamneseInicial());
    setEditandoId(null);
  }

  async function carregar() {
    try {
      const [anamneses, clientesRes, profissionaisRes] = await Promise.all([
        api.get("/anamneses"),
        api.get("/clientes"),
        api.get("/profissionais")
      ]);
      setLista(anamneses.data || []);
      setClientes(clientesRes.data || []);
      setProfissionais(profissionaisRes.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as anamneses.");
    }
  }

  async function salvar(event) {
    event.preventDefault();
    if (!form.clienteId) return alertaErro("Selecione o cliente.");
    if (!form.queixaPrincipal.trim()) return alertaErro("Informe a queixa principal.");

    const payload = prepararPayloadAnamnese({
      ...form,
      clienteId: Number(form.clienteId),
      profissionalId: form.profissionalId ? Number(form.profissionalId) : null
    });

    try {
      loading();
      if (editandoId) await api.put(`/anamneses/${editandoId}`, payload);
      else await api.post("/anamneses", payload);
      limparFormulario();
      await carregar();
      fecharLoading();
      alertaSucesso(editandoId ? "Anamnese atualizada com sucesso." : "Anamnese salva com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar a anamnese.");
    }
  }

  function editar(item) {
    setEditandoId(item.id);
    setForm(normalizarAnamnese(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader title="Anamnese" subtitle="Histórico de saúde, segurança do procedimento e avaliação profissional" />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label>Cliente</label>
            <select className="form-select" value={form.clienteId} onChange={(event) => setForm({ ...form, clienteId: event.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label>Profissional responsável</label>
            <select className="form-select" value={form.profissionalId} onChange={(event) => setForm({ ...form, profissionalId: event.target.value })}>
              <option value="">Selecione...</option>
              {profissionais.map((profissional) => <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>)}
            </select>
          </div>
        </div>

        <AnamneseClinicaForm value={form} onChange={setForm} />

        <div className="clinical-form-actions mt-3">
          <button className="btn btn-primary" type="submit">{editandoId ? "Atualizar anamnese" : "Salvar anamnese"}</button>
          {editandoId && <button type="button" className="btn btn-light" onClick={limparFormulario}>Cancelar edição</button>}
        </div>
      </form>

      <div className="panel">
        <div className="table-responsive">
          <table className="table professional-table clinical-history-table">
            <thead>
              <tr><th>Data</th><th>Cliente</th><th>Queixa</th><th>Avaliação</th><th>Atenções</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lista.map((item) => {
                const ficha = normalizarAnamnese(item);
                const indicadores = obterIndicadoresAnamnese(ficha);
                const classificacao = ficha.dadosClinicos?.classificacaoRisco || "nao_avaliado";
                const classificacoes = {
                  nao_avaliado: "Não avaliado",
                  sem_alertas: "Sem alertas",
                  atencao: "Exige atenção",
                  adiar: "Adiar",
                  encaminhar: "Encaminhar"
                };
                return (
                  <tr key={item.id}>
                    <td>{formatarDataHora(item.data)}</td>
                    <td>{item.cliente?.nome}</td>
                    <td>{item.queixaPrincipal}</td>
                    <td>{classificacoes[classificacao] || classificacao}</td>
                    <td>
                      {indicadores.alertas.length ? (
                        <div className="clinical-alert-list">
                          {indicadores.alertas.slice(0, 3).map(([campo, rotulo]) => <span className="clinical-alert-badge" key={campo}>{rotulo.replace("?", "")}</span>)}
                          {indicadores.alertas.length > 3 && <span className="clinical-alert-badge">+{indicadores.alertas.length - 3}</span>}
                        </div>
                      ) : "-"}
                    </td>
                    <td><button className="btn btn-outline-primary btn-sm" type="button" onClick={() => editar(item)}>Editar</button></td>
                  </tr>
                );
              })}
              {!lista.length && <tr><td colSpan="6" className="text-center text-muted py-4">Nenhuma anamnese cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import "./ParametrosSistema.css";

const modulos = [
  { id: "agenda", nome: "Agenda", detalhe: "Confirmação de agendamentos" },
  { id: "pdv", nome: "PDV", detalhe: "Pesquisa de produtos e serviços" },
  { id: "servicos", nome: "Serviços", detalhe: "Duração dos procedimentos" }
];
const inicial = { confirmacaoAgendamento: false, pdvSepararProdutosServicos: false, servicosDuracaoPredefinida: false };
export default function ParametrosSistema() {
  const [form, setForm] = useState(inicial), [salvo, setSalvo] = useState(inicial);
  const [aba, setAba] = useState("agenda"), [carregando, setCarregando] = useState(true), [salvando, setSalvando] = useState(false), [erro, setErro] = useState(false);
  const alterar = (campo, valor) => setForm(atual => ({ ...atual, [campo]: valor }));
  const alterado = Object.keys(inicial).some(key => form[key] !== salvo[key]);
  async function carregar() {
    setCarregando(true); setErro(false);
    try { const { data } = await api.get("/parametros-sistema"); const config = Object.fromEntries(Object.keys(inicial).map(key => [key, data[key] === true])); setForm(config); setSalvo(config); }
    catch { setErro(true); } finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);
  async function salvar(e) {
    e.preventDefault(); if (salvando) return; setSalvando(true);
    try {
      await api.put("/parametros-sistema", form); setSalvo({ ...form });
      window.dispatchEvent(new Event("workflowAtualizado")); await alertaSucesso("Parâmetros salvos para sua empresa.");
    } catch (e) { await alertaErro(e.response?.data || "Não foi possível salvar os parâmetros."); }
    finally { setSalvando(false); }
  }
  function navegar(e, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? modulos.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + modulos.length) % modulos.length;
    setAba(modulos[next].id); document.getElementById(`param-tab-${modulos[next].id}`)?.focus();
  }
  return <div className="parametros-sistema"><PageHeader title="Parâmetros do sistema" subtitle="Personalize cada módulo para a rotina da sua empresa." />
    <p className="parametros-escopo">As preferências valem para todas as unidades da sua empresa. Somente o administrador pode alterá-las.</p>
    {carregando ? <section className="panel" role="status">Carregando parâmetros...</section> : erro ? <section className="panel" role="alert"><p>Não foi possível carregar os parâmetros.</p><button className="btn btn-outline-primary" onClick={carregar}>Tentar novamente</button></section> : <>
      <div role="tablist" aria-label="Módulos do sistema" className="parametros-tabs">
        {modulos.map((modulo, index) => <button type="button" role="tab" key={modulo.id} id={`param-tab-${modulo.id}`} aria-controls={`param-painel-${modulo.id}`} aria-selected={aba === modulo.id} tabIndex={aba === modulo.id ? 0 : -1} onClick={() => setAba(modulo.id)} onKeyDown={e => navegar(e, index)}>
          <strong>{modulo.nome}</strong><span>{modulo.detalhe}</span>
        </button>)}
      </div>
      <form className="panel parametros-panel" onSubmit={salvar}>
        <fieldset disabled={salvando}>
          <section role="tabpanel" id="param-painel-agenda" aria-labelledby="param-tab-agenda" hidden={aba !== "agenda"}>
            <h2>Confirmação de agendamento</h2><p className="text-muted">Escolha se a equipe e os clientes poderão confirmar a presença antes do atendimento.</p>
            <div className="parametros-opcao form-check form-switch"><input className="form-check-input" type="checkbox" role="switch" id="workflow-confirmacao" checked={form.confirmacaoAgendamento} onChange={e => alterar("confirmacaoAgendamento", e.target.checked)} /><label className="form-check-label fw-bold" htmlFor="workflow-confirmacao">Habilitar confirmação de agendamento</label></div>
            <p>{form.confirmacaoAgendamento ? "Na agenda, a equipe poderá confirmar pelo operador ou enviar o link de confirmação pelo WhatsApp." : "As opções de confirmação ficam ocultas na agenda. Os agendamentos continuam funcionando normalmente."}</p>
            <p className="text-muted small">Aplica-se aos agendamentos feitos pelo cliente ou pelo operador. Enviar a mensagem não confirma a presença. Confirmações anteriores são preservadas.</p>
          </section>
          <section role="tabpanel" id="param-painel-pdv" aria-labelledby="param-tab-pdv" hidden={aba !== "pdv"}>
            <h2>Pesquisa de itens no PDV</h2><p className="text-muted">Escolha como a equipe encontra os itens para a venda.</p>
            <label className="parametros-choice"><input type="radio" name="pdv-pesquisa" checked={!form.pdvSepararProdutosServicos} onChange={() => alterar("pdvSepararProdutosServicos", false)} /><span><strong>Busca única (atual)</strong><small>Produtos e serviços no mesmo campo de pesquisa.</small></span></label>
            <label className="parametros-choice"><input type="radio" name="pdv-pesquisa" checked={form.pdvSepararProdutosServicos} onChange={() => alterar("pdvSepararProdutosServicos", true)} /><span><strong>Abas Produtos e Serviços</strong><small>Cada aba tem uma lista pesquisável com os itens cadastrados.</small></span></label>
          </section>
          <section role="tabpanel" id="param-painel-servicos" aria-labelledby="param-tab-servicos" hidden={aba !== "servicos"}>
            <h2>Duração dos serviços</h2><p className="text-muted">Defina como a duração será informada no cadastro de serviços.</p>
            <label className="parametros-choice"><input type="radio" name="servico-duracao" checked={!form.servicosDuracaoPredefinida} onChange={() => alterar("servicosDuracaoPredefinida", false)} /><span><strong>Duração livre</strong><small>Digite a quantidade de minutos, como no cadastro atual.</small></span></label>
            <label className="parametros-choice"><input type="radio" name="servico-duracao" checked={form.servicosDuracaoPredefinida} onChange={() => alterar("servicosDuracaoPredefinida", true)} /><span><strong>Valores predefinidos de 10 em 10 minutos</strong><small>Selecione 10, 20, 30, 40 minutos e assim por diante, até 720 minutos (12 horas).</small></span></label>
            <p className="text-muted small mt-3">Durações já cadastradas são preservadas. Ao editar um serviço antigo, você pode manter a duração atual ou escolher um novo valor da lista.</p>
          </section>
        </fieldset>
        <div className="parametros-footer"><span role="status">{alterado ? "Você tem alterações não salvas." : "Parâmetros atualizados."}</span><button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Salvar parâmetros"}</button></div>
      </form>
    </>}
  </div>;
}

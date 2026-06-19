import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import {
  alertaErro,
  alertaSucesso,
  confirmarAcao,
  loading,
  fecharLoading
} from "../utils/alerts";
import { formatarDataHora } from "../utils/masks";

const tiposReceita = ["Simples", "Manipulada", "Antimicrobiano", "Controle Especial"];

const itemInicial = {
  medicamentoSubstancia: "",
  concentracao: "",
  formaFarmaceutica: "",
  quantidade: "",
  posologia: "",
  duracao: "",
  observacoes: ""
};

const inicial = {
  clienteId: "",
  profissionalId: "",
  tipoReceita: "Simples",
  numeroVias: 1,
  validade: "",
  orientacoes: "",
  observacoes: "",
  itens: [{ ...itemInicial }]
};

export default function Receitas() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clinica, setClinica] = useState(null);
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);
  const [receitaImpressao, setReceitaImpressao] = useState(null);

  async function carregar() {
    try {
      const [receitas, clientesRes, profissionaisRes, clinicaRes] = await Promise.all([
        api.get("/receitas"),
        api.get("/clientes"),
        api.get("/profissionais"),
        api.get("/configuracao-clinica")
      ]);

      setLista(receitas.data || []);
      setClientes(clientesRes.data || []);
      setProfissionais(profissionaisRes.data || []);
      setClinica(clinicaRes.data || null);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as receitas.");
    }
  }

  function atualizarItem(index, campo, valor) {
    const itens = [...form.itens];
    itens[index] = { ...itens[index], [campo]: valor };
    setForm({ ...form, itens });
  }

  function adicionarItem() {
    setForm({ ...form, itens: [...form.itens, { ...itemInicial }] });
  }

  function removerItem(index) {
    const itens = form.itens.filter((_, i) => i !== index);
    setForm({ ...form, itens: itens.length ? itens : [{ ...itemInicial }] });
  }

  async function salvar(e) {
    e.preventDefault();

    const itensValidos = form.itens.filter(x => x.medicamentoSubstancia.trim() && x.posologia.trim());

    if (!form.clienteId) return alertaErro("Selecione o cliente.");
    if (!form.profissionalId) return alertaErro("Selecione a profissional.");
    if (!itensValidos.length) return alertaErro("Informe pelo menos um item com medicamento/substância e posologia.");

    const payload = {
      clienteId: Number(form.clienteId),
      profissionalId: Number(form.profissionalId),
      tipoReceita: form.tipoReceita,
      numeroVias: Number(form.numeroVias || 1),
      validade: form.validade || null,
      orientacoes: form.orientacoes,
      observacoes: form.observacoes,
      itens: itensValidos
    };

    try {
      loading();

      const res = editandoId
        ? await api.put(`/receitas/${editandoId}`, payload)
        : await api.post("/receitas", payload);

      setForm(inicial);
      setEditandoId(null);
      await carregar();

      fecharLoading();
      alertaSucesso(editandoId ? "Receita atualizada com sucesso." : "Receita emitida com sucesso.");

      if (!editandoId) setReceitaImpressao(res.data);
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível salvar a receita.");
    }
  }

  function editar(receita) {
    setEditandoId(receita.id);
    setForm({
      clienteId: receita.clienteId || "",
      profissionalId: receita.profissionalId || "",
      tipoReceita: receita.tipoReceita || "Simples",
      numeroVias: receita.numeroVias || 1,
      validade: receita.validade ? String(receita.validade).substring(0, 10) : "",
      orientacoes: receita.orientacoes || "",
      observacoes: receita.observacoes || "",
      itens: receita.itens?.length ? receita.itens.map(x => ({
        medicamentoSubstancia: x.medicamentoSubstancia || "",
        concentracao: x.concentracao || "",
        formaFarmaceutica: x.formaFarmaceutica || "",
        quantidade: x.quantidade || "",
        posologia: x.posologia || "",
        duracao: x.duracao || "",
        observacoes: x.observacoes || ""
      })) : [{ ...itemInicial }]
    });
  }

  async function imprimir(receita) {
    try {
      const res = await api.post(`/receitas/${receita.id}/registrar-impressao`);
      setReceitaImpressao(res.data);
      setTimeout(() => window.print(), 150);
      await carregar();
    } catch {
      setReceitaImpressao(receita);
      setTimeout(() => window.print(), 150);
    }
  }

  async function cancelarReceita(receita) {
    const motivo = window.prompt("Informe o motivo do cancelamento da receita:");
    if (!motivo) return;

    const ok = await confirmarAcao("Cancelar receita?", "A receita ficará no histórico como cancelada.");
    if (!ok) return;

    try {
      loading();
      await api.post(`/receitas/${receita.id}/cancelar`, { motivo });
      await carregar();
      fecharLoading();
      alertaSucesso("Receita cancelada com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível cancelar a receita.");
    }
  }

  function cancelarEdicao() {
    setForm(inicial);
    setEditandoId(null);
  }

  function textoConselho(profissional) {
    return [profissional?.conselhoProfissional, profissional?.numeroConselho, profissional?.ufConselho]
      .filter(Boolean)
      .join(" / ");
  }

  function viasParaImpressao(receita) {
    return Array.from({ length: receita?.numeroVias === 2 ? 2 : 1 }, (_, i) => i + 1);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Receitas"
          subtitle="Receitas com itens estruturados, validação, vias e histórico de impressão"
        />

        <form className="panel mb-3" onSubmit={salvar}>
          <div className="row g-2">
            <div className="col-md-3">
              <label>Cliente</label>
              <select className="form-select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} required>
                <option value="">Selecione...</option>
                {clientes.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
              </select>
            </div>

            <div className="col-md-3">
              <label>Profissional</label>
              <select className="form-select" value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })} required>
                <option value="">Selecione...</option>
                {profissionais.map(profissional => <option key={profissional.id} value={profissional.id}>{profissional.nome}</option>)}
              </select>
            </div>

            <div className="col-md-2">
              <label>Tipo de receita</label>
              <select className="form-select" value={form.tipoReceita} onChange={e => setForm({ ...form, tipoReceita: e.target.value })}>
                {tiposReceita.map(tipo => <option key={tipo}>{tipo}</option>)}
              </select>
            </div>

            <div className="col-md-2">
              <label>Vias</label>
              <select className="form-select" value={form.numeroVias} onChange={e => setForm({ ...form, numeroVias: e.target.value })}>
                <option value="1">1 via</option>
                <option value="2">2 vias</option>
              </select>
            </div>

            <div className="col-md-2">
              <label>Validade</label>
              <input type="date" className="form-control" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
            </div>
          </div>

          <div className="receita-itens-editor">
            {form.itens.map((item, index) => (
              <div className="receita-item-editor" key={index}>
                <div className="receita-item-title">
                  <strong>Item {index + 1}</strong>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removerItem(index)}>Remover</button>
                </div>

                <div className="row g-2">
                  <div className="col-md-4">
                    <label>Medicamento / substância</label>
                    <input className="form-control" value={item.medicamentoSubstancia} onChange={e => atualizarItem(index, "medicamentoSubstancia", e.target.value)} required />
                  </div>
                  <div className="col-md-2">
                    <label>Concentração</label>
                    <input className="form-control" value={item.concentracao} onChange={e => atualizarItem(index, "concentracao", e.target.value)} />
                  </div>
                  <div className="col-md-2">
                    <label>Forma</label>
                    <input className="form-control" placeholder="Creme, cápsula..." value={item.formaFarmaceutica} onChange={e => atualizarItem(index, "formaFarmaceutica", e.target.value)} />
                  </div>
                  <div className="col-md-2">
                    <label>Quantidade</label>
                    <input className="form-control" value={item.quantidade} onChange={e => atualizarItem(index, "quantidade", e.target.value)} />
                  </div>
                  <div className="col-md-2">
                    <label>Duração</label>
                    <input className="form-control" value={item.duracao} onChange={e => atualizarItem(index, "duracao", e.target.value)} />
                  </div>
                  <div className="col-md-8">
                    <label>Modo de uso / posologia</label>
                    <input className="form-control" value={item.posologia} onChange={e => atualizarItem(index, "posologia", e.target.value)} required />
                  </div>
                  <div className="col-md-4">
                    <label>Observações</label>
                    <input className="form-control" value={item.observacoes} onChange={e => atualizarItem(index, "observacoes", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-outline-primary btn-sm" onClick={adicionarItem}>Adicionar item</button>
          </div>

          <div className="row g-2 mt-1">
            <div className="col-md-6">
              <label>Orientações ao cliente</label>
              <textarea className="form-control" rows="3" value={form.orientacoes} onChange={e => setForm({ ...form, orientacoes: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label>Observações internas</label>
              <textarea className="form-control" rows="3" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100">{editandoId ? "Atualizar" : "Emitir receita"}</button>
            </div>
            {editandoId && (
              <div className="col-md-2">
                <button type="button" className="btn btn-light w-100" onClick={cancelarEdicao}>Cancelar</button>
              </div>
            )}
          </div>
        </form>

        <div className="panel">
          <table className="table professional-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Validação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(receita => (
                <tr key={receita.id}>
                  <td>{formatarDataHora(receita.data)}</td>
                  <td>{receita.cliente?.nome}</td>
                  <td>{receita.tipoReceita}</td>
                  <td>{receita.status}</td>
                  <td>{receita.codigoValidacao}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => imprimir(receita)}>Imprimir</button>
                    {receita.status !== "Cancelada" && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => editar(receita)}>Editar</button>}
                    {receita.status !== "Cancelada" && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => cancelarReceita(receita)}>Cancelar</button>}
                  </td>
                </tr>
              ))}

              {!lista.length && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">Nenhuma receita emitida.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receitaImpressao && viasParaImpressao(receitaImpressao).map(via => (
        <div className="receita-print-area" key={via}>
          <div className="receita-print-header">
            <div className="receita-print-brand">
              <img src="/logo-gloria.jpeg" alt="Glória Couto" />
              <div>
                <strong>{clinica?.nome || "Glória Couto"}</strong>
                <span>{clinica?.cnpj ? `CNPJ ${clinica.cnpj}` : "Estética Avançada"}</span>
                <small>{[clinica?.endereco, clinica?.cidade, clinica?.uf].filter(Boolean).join(" - ")}</small>
                <small>{clinica?.telefone}</small>
              </div>
            </div>
            <div className="receita-print-title">
              <h1>Receita</h1>
              <p>{receitaImpressao.tipoReceita} - via {via}/{receitaImpressao.numeroVias || 1}</p>
            </div>
          </div>

          <div className="receita-validation-box">
            <strong>Código de validação</strong>
            <span>{receitaImpressao.codigoValidacao}</span>
            <small>Status: {receitaImpressao.status}</small>
          </div>

          <div className="receita-print-info">
            <div><strong>Paciente</strong><span>{receitaImpressao.cliente?.nome}</span></div>
            <div><strong>CPF/documento</strong><span>{receitaImpressao.cliente?.documento || "Não informado"}</span></div>
            <div><strong>Nascimento</strong><span>{receitaImpressao.cliente?.dataNascimento ? new Date(receitaImpressao.cliente.dataNascimento).toLocaleDateString("pt-BR") : "Não informado"}</span></div>
            <div><strong>Telefone</strong><span>{receitaImpressao.cliente?.telefone || "Não informado"}</span></div>
            <div><strong>Emissão</strong><span>{formatarDataHora(receitaImpressao.data)}</span></div>
            <div><strong>Validade</strong><span>{receitaImpressao.validade ? new Date(receitaImpressao.validade).toLocaleDateString("pt-BR") : "Não informada"}</span></div>
          </div>

          <section className="receita-print-section">
            <strong>Prescrição</strong>
            {(receitaImpressao.itens || []).map((item, index) => (
              <div className="receita-print-item" key={item.id || index}>
                <h4>{index + 1}. {item.medicamentoSubstancia}</h4>
                <p>
                  {[item.concentracao, item.formaFarmaceutica, item.quantidade].filter(Boolean).join(" | ")}
                </p>
                <p><b>Uso:</b> {item.posologia}</p>
                {item.duracao && <p><b>Duração:</b> {item.duracao}</p>}
                {item.observacoes && <p><b>Obs.:</b> {item.observacoes}</p>}
              </div>
            ))}
          </section>

          {receitaImpressao.orientacoes && (
            <section className="receita-print-section receita-print-orientacoes">
              <strong>Orientações</strong>
              <p>{receitaImpressao.orientacoes}</p>
            </section>
          )}

          <div className="receita-print-assinatura">
            <span>{receitaImpressao.profissional?.nome}</span>
            <small>{textoConselho(receitaImpressao.profissional) || "Profissional responsável"}</small>
            <small>{receitaImpressao.profissional?.especialidade}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

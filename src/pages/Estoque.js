import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarDataHora } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarAcao,
  loading,
  fecharLoading
} from "../utils/alerts";

const inicial = {
  produtoId: "",
  tipo: "ENTRADA",
  origem: "COMPRA",
  quantidade: 1,
  observacao: ""
};

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [form, setForm] = useState(inicial);

  async function carregar() {
    try {
      const produtosRes = await api.get("/produtos");
      const movsRes = await api.get("/estoque/movimentacoes");

      setProdutos(produtosRes.data);
      setMovs(movsRes.data);
    } catch (error) {
      alertaErro(
        error.response?.data ||
          "Não foi possível carregar os dados do estoque."
      );
    }
  }

  async function salvar(e) {
    e.preventDefault();

    const produto = produtos.find(x => x.id === Number(form.produtoId));

    const confirmou = await confirmarAcao(
      "Confirmar movimentação?",
      `Deseja registrar ${form.tipo} de ${form.quantidade} unidade(s) para o produto ${produto?.nome || ""}?`
    );

    if (!confirmou) return;

    try {
      loading();

      await api.post("/estoque/movimentar", {
        ...form,
        produtoId: Number(form.produtoId),
        quantidade: Number(form.quantidade)
      });

      setForm(inicial);

      await carregar();

      fecharLoading();

      await alertaSucesso("Movimentação de estoque registrada com sucesso.");
    } catch (error) {
      fecharLoading();

      alertaErro(
        error.response?.data ||
          "Não foi possível registrar a movimentação de estoque."
      );
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Entrada, saída, ajuste e histórico"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <div className="row g-2">
          <div className="col-md-3">
            <label>Produto</label>
            <select
              className="form-select"
              value={form.produtoId}
              onChange={e =>
                setForm({ ...form, produtoId: e.target.value })
              }
              required
            >
              <option value="">Selecione</option>
              {produtos.map(x => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-2">
            <label>Tipo</label>
            <select
              className="form-select"
              value={form.tipo}
              onChange={e =>
                setForm({ ...form, tipo: e.target.value })
              }
            >
              <option>ENTRADA</option>
              <option>SAIDA</option>
              <option>AJUSTE</option>
            </select>
          </div>

          <div className="col-md-2">
            <label>Origem</label>
            <input
              className="form-control"
              value={form.origem}
              onChange={e =>
                setForm({ ...form, origem: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Qtd</label>
            <input
              type="number"
              className="form-control"
              value={form.quantidade}
              onChange={e =>
                setForm({ ...form, quantidade: e.target.value })
              }
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100">
              Movimentar
            </button>
          </div>
        </div>
      </form>

      <div className="panel">
        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Qtd</th>
            </tr>
          </thead>

          <tbody>
            {movs.map(x => (
              <tr key={x.id}>
                <td>{formatarDataHora(x.data)}</td>
                <td>{x.produto?.nome}</td>
                <td>
                  <span
                    className={
                      x.tipo === "ENTRADA"
                        ? "badge bg-success"
                        : x.tipo === "SAIDA"
                        ? "badge bg-danger"
                        : "badge bg-warning text-dark"
                    }
                  >
                    {x.tipo}
                  </span>
                </td>
                <td>{x.origem}</td>
                <td>{x.quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
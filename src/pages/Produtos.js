import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarMoeda } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  confirmarExclusao
} from "../utils/alerts";

const inicial = {
  nome: "",
  codigoBarras: "",
  precoCusto: 0,
  precoVenda: 0,
  quantidadeEstoque: 0,
  estoqueMinimo: 0,
  ncm: "",
  cfop: "5102",
  unidadeComercial: "UN",
  cest: "",
  origem: "0",
  csosn: "102",
  cstIcms: "",
  cstPis: "49",
  cstCofins: "49",
  aliquotaIcms: 0,
  aliquotaPis: 0,
  aliquotaCofins: 0,
  ativo: true
};

export default function Produtos() {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState("TODOS");
  const [form, setForm] = useState(inicial);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    try {
      const res = await api.get("/produtos");
      setLista(res.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar os produtos.");
    }
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        precoCusto: Number(form.precoCusto || 0),
        precoVenda: Number(form.precoVenda || 0),
        quantidadeEstoque: Number(form.quantidadeEstoque || 0),
        estoqueMinimo: Number(form.estoqueMinimo || 0),
        aliquotaIcms: Number(form.aliquotaIcms || 0),
        aliquotaPis: Number(form.aliquotaPis || 0),
        aliquotaCofins: Number(form.aliquotaCofins || 0)
      };

      if (editandoId) {
        await api.put(`/produtos/${editandoId}`, payload);
        await alertaSucesso("Produto atualizado com sucesso.");
      } else {
        await api.post("/produtos", payload);
        await alertaSucesso("Produto cadastrado com sucesso.");
      }

      setForm(inicial);
      setEditandoId(null);
      await carregar();
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível salvar o produto.");
    }
  }

  async function excluir(id) {
    const confirmou = await confirmarExclusao();
    if (!confirmou) return;

    try {
      await api.delete(`/produtos/${id}`);
      await carregar();
      await alertaSucesso("Produto excluído com sucesso.");
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível excluir o produto.");
    }
  }

  function editar(produto) {
    setEditandoId(produto.id);
    setForm({
      ...inicial,
      ...produto,
      ncm: produto.ncm || "",
      cfop: produto.cfop || "5102",
      unidadeComercial: produto.unidadeComercial || "UN",
      cest: produto.cest || "",
      origem: produto.origem || "0",
      csosn: produto.csosn || "102",
      cstIcms: produto.cstIcms || "",
      cstPis: produto.cstPis || "49",
      cstCofins: produto.cstCofins || "49",
      aliquotaIcms: produto.aliquotaIcms || 0,
      aliquotaPis: produto.aliquotaPis || 0,
      aliquotaCofins: produto.aliquotaCofins || 0
    });
  }

  function cancelarEdicao() {
    setForm(inicial);
    setEditandoId(null);
  }

  const produtosFiltrados = lista.filter((x) => {
    const texto = busca.toLowerCase();

    const encontrou =
      x.nome?.toLowerCase().includes(texto) ||
      String(x.codigoBarras || "").includes(busca) ||
      String(x.ncm || "").includes(busca);

    if (!encontrou) return false;

    switch (filtroEstoque) {
      case "BAIXO":
        return Number(x.quantidadeEstoque) <= Number(x.estoqueMinimo);

      case "ZERADO":
        return Number(x.quantidadeEstoque) <= 0;

      case "POSITIVO":
        return Number(x.quantidadeEstoque) > 0;

      default:
        return true;
    }
  });

  const valorEstoqueFiltrado = produtosFiltrados.reduce(
    (soma, p) =>
      soma + Number(p.precoCusto || 0) * Number(p.quantidadeEstoque || 0),
    0
  );

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Cadastro de produtos, estoque e dados tributários"
      />

      <form className="panel mb-3" onSubmit={salvar}>
        <h5>Dados do produto</h5>

        <div className="row g-2">
          <div className="col-md-3">
            <label>Produto</label>
            <input
              className="form-control"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div className="col-md-2">
            <label>Cód. barras</label>
            <input
              className="form-control"
              value={form.codigoBarras || ""}
              onChange={(e) =>
                setForm({ ...form, codigoBarras: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Custo</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.precoCusto}
              onChange={(e) =>
                setForm({ ...form, precoCusto: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Venda</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.precoVenda}
              onChange={(e) =>
                setForm({ ...form, precoVenda: e.target.value })
              }
            />
          </div>

          <div className="col-md-1">
            <label>Estoque</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.quantidadeEstoque}
              onChange={(e) =>
                setForm({ ...form, quantidadeEstoque: e.target.value })
              }
            />
          </div>

          <div className="col-md-1">
            <label>Mín.</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.estoqueMinimo}
              onChange={(e) =>
                setForm({ ...form, estoqueMinimo: e.target.value })
              }
            />
          </div>

          <div className="col-md-1">
            <label>Ativo</label>
            <select
              className="form-select"
              value={form.ativo ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, ativo: e.target.value === "true" })
              }
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
        </div>

        <hr />

        <h5>Dados tributários</h5>

        <div className="row g-2">
          <div className="col-md-2">
            <label>NCM</label>
            <input
              className="form-control"
              value={form.ncm}
              onChange={(e) => setForm({ ...form, ncm: e.target.value })}
              placeholder="Ex: 33051000"
              required
            />
          </div>

          <div className="col-md-2">
            <label>CFOP</label>
            <input
              className="form-control"
              value={form.cfop}
              onChange={(e) => setForm({ ...form, cfop: e.target.value })}
              required
            />
          </div>

          <div className="col-md-2">
            <label>Unidade</label>
            <input
              className="form-control"
              value={form.unidadeComercial}
              onChange={(e) =>
                setForm({ ...form, unidadeComercial: e.target.value })
              }
              placeholder="UN"
              required
            />
          </div>

          <div className="col-md-2">
            <label>CEST</label>
            <input
              className="form-control"
              value={form.cest}
              onChange={(e) => setForm({ ...form, cest: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="col-md-2">
            <label>Origem</label>
            <select
              className="form-select"
              value={form.origem}
              onChange={(e) => setForm({ ...form, origem: e.target.value })}
            >
              <option value="0">0 - Nacional</option>
              <option value="1">1 - Estrangeira importação direta</option>
              <option value="2">2 - Estrangeira mercado interno</option>
              <option value="3">3 - Nacional + 40% importado</option>
              <option value="4">4 - Nacional PPB</option>
              <option value="5">5 - Nacional até 40% importado</option>
              <option value="6">6 - Estrangeira sem similar</option>
              <option value="7">7 - Estrangeira mercado interno sem similar</option>
              <option value="8">8 - Nacional acima 70% importado</option>
            </select>
          </div>

          <div className="col-md-2">
            <label>CSOSN</label>
            <input
              className="form-control"
              value={form.csosn}
              onChange={(e) => setForm({ ...form, csosn: e.target.value })}
              placeholder="102"
            />
          </div>

          <div className="col-md-2">
            <label>CST ICMS</label>
            <input
              className="form-control"
              value={form.cstIcms}
              onChange={(e) => setForm({ ...form, cstIcms: e.target.value })}
              placeholder="Regime normal"
            />
          </div>

          <div className="col-md-2">
            <label>CST PIS</label>
            <input
              className="form-control"
              value={form.cstPis}
              onChange={(e) => setForm({ ...form, cstPis: e.target.value })}
            />
          </div>

          <div className="col-md-2">
            <label>CST COFINS</label>
            <input
              className="form-control"
              value={form.cstCofins}
              onChange={(e) => setForm({ ...form, cstCofins: e.target.value })}
            />
          </div>

          <div className="col-md-2">
            <label>Alíquota ICMS %</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.aliquotaIcms}
              onChange={(e) =>
                setForm({ ...form, aliquotaIcms: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Alíquota PIS %</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.aliquotaPis}
              onChange={(e) =>
                setForm({ ...form, aliquotaPis: e.target.value })
              }
            />
          </div>

          <div className="col-md-2">
            <label>Alíquota COFINS %</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={form.aliquotaCofins}
              onChange={(e) =>
                setForm({ ...form, aliquotaCofins: e.target.value })
              }
            />
          </div>

          <div className="col-md-12 d-flex justify-content-end gap-2 mt-3">
            {editandoId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={cancelarEdicao}
              >
                Cancelar edição
              </button>
            )}

            <button className="btn btn-primary">
              {editandoId ? "Atualizar produto" : "Salvar produto"}
            </button>
          </div>
        </div>
      </form>

      <div className="panel">
        <div className="row g-2 mb-3">
          <div className="col-md-5">
            <label>Pesquisar produto</label>
            <input
              className="form-control"
              placeholder="Nome, código de barras ou NCM"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <label>Filtro de estoque</label>
            <select
              className="form-select"
              value={filtroEstoque}
              onChange={(e) => setFiltroEstoque(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="BAIXO">Estoque baixo</option>
              <option value="ZERADO">Sem estoque</option>
              <option value="POSITIVO">Com estoque</option>
            </select>
          </div>

          <div className="col-md-2">
            <label>Total encontrado</label>
            <input
              className="form-control"
              value={`${produtosFiltrados.length} produto(s)`}
              disabled
            />
          </div>

          <div className="col-md-2">
            <label>Valor estoque</label>
            <input
              className="form-control"
              value={formatarMoeda(valorEstoqueFiltrado)}
              disabled
            />
          </div>
        </div>

        <div
          style={{
            maxHeight: "420px",
            overflowY: "auto"
          }}
        >
          <table className="table professional-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Cód.</th>
                <th>NCM</th>
                <th>CFOP</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th>Mín.</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtosFiltrados.map((x) => (
                <tr key={x.id}>
                  <td>{x.nome}</td>
                  <td>{x.codigoBarras || "-"}</td>
                  <td>{x.ncm || "-"}</td>
                  <td>{x.cfop || "-"}</td>
                  <td>{formatarMoeda(x.precoVenda)}</td>
                  <td>
                    <strong>{x.quantidadeEstoque}</strong>
                  </td>
                  <td>{x.estoqueMinimo}</td>
                  <td>
                    {Number(x.quantidadeEstoque) <= 0 ? (
                      <span className="badge bg-dark">Sem estoque</span>
                    ) : Number(x.quantidadeEstoque) <= Number(x.estoqueMinimo) ? (
                      <span className="badge bg-danger">Estoque baixo</span>
                    ) : (
                      <span className="badge bg-success">Normal</span>
                    )}
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => editar(x)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => excluir(x.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}

              {!produtosFiltrados.length && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { formatarDataHora, formatarMoeda } from "../utils/masks";
import {
  alertaErro,
  alertaSucesso,
  alertaInfo,
  loading,
  fecharLoading
} from "../utils/alerts";

const inicialEntrada = {
  cnpj: "",
  ultimoNsu: "",
  payload: ""
};

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [filtroVendas, setFiltroVendas] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(true);
  const [entrada, setEntrada] = useState(inicialEntrada);

  async function carregar() {
    try {
      const [notasRes, vendasRes] = await Promise.all([
        api.get("/notas-fiscais"),
        api.get("/notas-fiscais/vendas-para-emissao", {
          params: { filtro: filtroVendas || null, somentePendentes }
        })
      ]);

      setNotas(notasRes.data || []);
      setVendas(vendasRes.data || []);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as notas fiscais.");
    }
  }

  async function emitirVendaCompleta(venda) {
    try {
      loading();
      await api.post(`/notas-fiscais/emitir-venda-completa/${venda.id}`);
      await carregar();
      fecharLoading();
      await alertaSucesso("Nota fiscal enviada para emissão com sucesso.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível emitir a nota fiscal da venda.");
    }
  }

  async function sincronizarEntradas(e) {
    e.preventDefault();

    try {
      loading();

      const dto = {
        cnpj: entrada.cnpj,
        ultimoNsu: entrada.ultimoNsu || null
      };

      if (entrada.payload?.trim()) {
        dto.payload = JSON.parse(entrada.payload);
      }

      await api.post("/notas-fiscais/sincronizar-entradas", dto);

      setEntrada(inicialEntrada);
      await carregar();

      fecharLoading();
      await alertaSucesso("Consulta de notas de entrada enviada para a ACBr.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || error.message || "Não foi possível sincronizar as notas de entrada.");
    }
  }

  async function consultarStatus(nota) {
    try {
      loading();
      await api.post(`/notas-fiscais/sincronizar-status/${nota.id}`);
      await carregar();
      fecharLoading();
      await alertaSucesso("Status da nota atualizado.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível consultar o status da nota.");
    }
  }

  async function consultarCancelamento(nota) {
    try {
      loading();
      await api.get(`/notas-fiscais/${nota.id}/cancelamento`);
      await carregar();
      fecharLoading();
      await alertaSucesso("Status do cancelamento atualizado.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível consultar o cancelamento.");
    }
  }

  async function cancelarNota(nota) {
    const justificativa = window.prompt("Informe a justificativa do cancelamento com pelo menos 15 caracteres:");
    if (!justificativa) return;

    if (justificativa.length < 15) {
      alertaErro("A justificativa deve ter pelo menos 15 caracteres.");
      return;
    }

    try {
      loading();
      await api.post(`/notas-fiscais/${nota.id}/cancelar`, { justificativa });
      await carregar();
      fecharLoading();
      await alertaSucesso("Cancelamento enviado para a ACBr.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível cancelar a nota.");
    }
  }

  async function baixarPdf(nota) {
  try {
    const response = await api.get(`/notas-fiscais/${nota.id}/pdf`, {
      responseType: "blob"
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    window.open(url, "_blank");
  } catch (error) {
    alertaErro("Não foi possível abrir o PDF.");
  }
}

async function baixarXml(nota) {
  try {
    const response = await api.get(`/notas-fiscais/${nota.id}/xml`, {
      responseType: "blob"
    });

    const blob = new Blob([response.data], { type: "application/xml" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `nota-${nota.id}.xml`;
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    alertaErro("Não foi possível baixar o XML.");
  }
}

  function abrirInformacaoFiscal() {
    alertaInfo(
      "Integração ACBr",
      `
        <div style="text-align:left">
          <p><b>Emissão por venda:</b> selecione a venda na lista e clique em emitir.</p>
          <p><b>Produto:</b> gera NFC-e.</p>
          <p><b>Serviço:</b> gera NFS-e.</p>
          <p><b>Venda mista:</b> gera uma NFC-e para produtos e uma NFS-e para serviços.</p>
          <p><b>Duplicidade:</b> vendas já emitidas ficam bloqueadas; vendas parciais emitem apenas o que falta.</p>
          <p><b>Emitente:</b> vem do appsettings do backend em AcbrApi:CnpjEmitente.</p>
        </div>
      `
    );
  }

  function classeStatus(status) {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("autoriz") || texto.includes("emitida") || texto === "emitida")
      return "badge bg-success";

    if (texto.includes("cancel"))
      return "badge bg-danger";

    if (texto.includes("rejeit") || texto.includes("erro") || texto.includes("parcial"))
      return "badge bg-warning text-dark";

    if (texto.includes("pendente") || texto.includes("process"))
      return "badge bg-secondary";

    return "badge bg-info";
  }

  useEffect(() => {
    carregar();
  }, [somentePendentes]);

  return (
    <div>
      <PageHeader title="Notas Fiscais" subtitle="Emissão fiscal por venda, sem procurar ID manualmente">
        <button type="button" className="btn btn-outline-primary" onClick={abrirInformacaoFiscal}>
          Sobre integração fiscal
        </button>
      </PageHeader>

      <div className="panel mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
          <div>
            <h5 className="mb-1">Vendas para emissão</h5>
            <small className="text-muted">Escolha a venda e emita NFC-e, NFS-e ou ambas automaticamente.</small>
          </div>

          <div className="d-flex gap-2 flex-wrap align-items-center">
            <input
              className="form-control fiscal-search"
              value={filtroVendas}
              onChange={e => setFiltroVendas(e.target.value)}
              placeholder="Buscar cliente, CPF/CNPJ ou venda"
            />
            <button type="button" className="btn btn-outline-secondary" onClick={carregar}>Buscar</button>
            <label className="form-check d-flex align-items-center gap-2 m-0">
              <input className="form-check-input" type="checkbox" checked={somentePendentes} onChange={e => setSomentePendentes(e.target.checked)} />
              <span className="form-check-label">Somente pendentes</span>
            </label>
          </div>
        </div>

        <table className="table professional-table">
          <thead>
            <tr>
              <th>Venda</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Pagamento</th>
              <th>Total</th>
              <th>Status fiscal</th>
              <th>Notas</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {vendas.map(venda => (
              <tr key={venda.id}>
                <td>#{venda.id}</td>
                <td>{formatarDataHora(venda.data)}</td>
                <td>{venda.cliente?.nome || "Consumidor final"}</td>
                <td>{venda.tipoVenda}</td>
                <td>{venda.formaPagamento}</td>
                <td>{formatarMoeda(venda.total)}</td>
                <td><span className={classeStatus(venda.statusFiscal)}>{venda.statusFiscal}</span></td>
                <td>
                  {(venda.notas || []).length
                    ? venda.notas.map(n => `${n.tipo} ${n.status || ""}`).join(" | ")
                    : "-"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => emitirVendaCompleta(venda)}
                    disabled={venda.statusFiscal === "Emitida"}
                  >
                    {venda.statusFiscal === "Parcial" ? "Emitir faltante" : "Emitir"}
                  </button>
                </td>
              </tr>
            ))}

            {!vendas.length && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
                  Nenhuma venda pendente para emissão.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="panel mb-3" onSubmit={sincronizarEntradas}>
        <h5>Sincronizar notas de entrada</h5>

        <div className="row g-2">
          <div className="col-md-3">
            <label>CNPJ da empresa</label>
            <input
              className="form-control"
              value={entrada.cnpj}
              onChange={e => setEntrada({ ...entrada, cnpj: e.target.value })}
              required
            />
          </div>

          <div className="col-md-3">
            <label>Último NSU</label>
            <input
              className="form-control"
              value={entrada.ultimoNsu}
              onChange={e => setEntrada({ ...entrada, ultimoNsu: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="col-md-12">
            <label>Payload JSON alternativo</label>
            <textarea
              className="form-control"
              rows="3"
              value={entrada.payload}
              onChange={e => setEntrada({ ...entrada, payload: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="col-md-12 d-flex justify-content-end">
            <button className="btn btn-primary">
              Buscar entradas
            </button>
          </div>
        </div>
      </form>

      <div className="panel">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Notas fiscais</h5>

          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={carregar}>
            Atualizar
          </button>
        </div>

        <table className="table professional-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Operação</th>
              <th>Tipo</th>
              <th>Número</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Venda</th>
              <th>Referência</th>
              <th>Chave/Código</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {notas.map(x => (
              <tr key={x.id}>
                <td>{formatarDataHora(x.data)}</td>
                <td>{x.operacao}</td>
                <td>{x.tipo}</td>
                <td>{x.numero || "-"}</td>
                <td><span className={classeStatus(x.status)}>{x.status || "Pendente"}</span></td>
                <td>{formatarMoeda(x.valorTotal || 0)}</td>
                <td>{x.vendaId ? `#${x.vendaId}` : "-"}</td>
                <td>{x.referenciaNuvemFiscal || "-"}</td>
                <td>{x.chaveOuCodigo || "-"}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => consultarStatus(x)} disabled={!x.referenciaNuvemFiscal}>Status</button>
                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => baixarPdf(x)} disabled={!x.referenciaNuvemFiscal}>PDF</button>
                    <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => baixarXml(x)} disabled={!x.referenciaNuvemFiscal}>XML</button>
                    <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => consultarCancelamento(x)} disabled={!x.referenciaNuvemFiscal}>Canc. status</button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => cancelarNota(x)} disabled={!x.referenciaNuvemFiscal}>Cancelar</button>
                  </div>
                </td>
              </tr>
            ))}

            {!notas.length && (
              <tr>
                <td colSpan="10" className="text-center text-muted py-4">
                  Nenhuma nota fiscal registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

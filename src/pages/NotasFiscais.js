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

const inicialEmissao = {
  vendaId: ""
};

const inicialEntrada = {
  cnpj: "",
  ultimoNsu: "",
  payload: ""
};

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [emissao, setEmissao] = useState(inicialEmissao);
  const [entrada, setEntrada] = useState(inicialEntrada);

  async function carregar() {
    try {
      const res = await api.get("/notas-fiscais");
      setNotas(res.data);
    } catch (error) {
      alertaErro(error.response?.data || "Não foi possível carregar as notas fiscais.");
    }
  }

  async function emitirVendaCompleta(e) {
    e.preventDefault();

    if (!emissao.vendaId) {
      alertaErro("Informe o ID da venda.");
      return;
    }

    try {
      loading();

      await api.post(`/notas-fiscais/emitir-venda-completa/${emissao.vendaId}`);

      setEmissao(inicialEmissao);
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
      await alertaSucesso("Consulta de notas de entrada enviada para a Nuvem Fiscal.");
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
    const justificativa = window.prompt(
      "Informe a justificativa do cancelamento com pelo menos 15 caracteres:"
    );

    if (!justificativa) return;

    if (justificativa.length < 15) {
      alertaErro("A justificativa deve ter pelo menos 15 caracteres.");
      return;
    }

    try {
      loading();

      await api.post(`/notas-fiscais/${nota.id}/cancelar`, {
        justificativa
      });

      await carregar();

      fecharLoading();
      await alertaSucesso("Cancelamento enviado para a Nuvem Fiscal.");
    } catch (error) {
      fecharLoading();
      alertaErro(error.response?.data || "Não foi possível cancelar a nota.");
    }
  }

  function baixarPdf(nota) {
    window.open(`${api.defaults.baseURL}/notas-fiscais/${nota.id}/pdf`, "_blank");
  }

  function baixarXml(nota) {
    window.open(`${api.defaults.baseURL}/notas-fiscais/${nota.id}/xml`, "_blank");
  }

  function abrirInformacaoFiscal() {
    alertaInfo(
      "Integração Nuvem Fiscal",
      `
        <div style="text-align:left">
          <p><b>Emissão pelo PDV:</b> ao finalizar a venda, o sistema chama a emissão automática.</p>
          <p><b>Produto:</b> gera NFC-e.</p>
          <p><b>Serviço:</b> gera NFS-e.</p>
          <p><b>Venda mista:</b> gera uma NFC-e para produtos e uma NFS-e para serviços.</p>
          <p><b>Emitente:</b> vem do appsettings do backend em NuvemFiscal:CnpjEmitente.</p>
          <p><b>Cliente:</b> vem do cadastro da venda. Se tiver CPF/CNPJ, vai identificado; se não tiver, consumidor final.</p>
        </div>
      `
    );
  }

  function classeStatus(status) {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("autoriz") || texto.includes("emitida"))
      return "badge bg-success";

    if (texto.includes("cancel"))
      return "badge bg-danger";

    if (texto.includes("rejeit") || texto.includes("erro"))
      return "badge bg-warning text-dark";

    if (texto.includes("pendente") || texto.includes("process"))
      return "badge bg-secondary";

    return "badge bg-info";
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <PageHeader title="Notas Fiscais" subtitle="Integração fiscal com Nuvem Fiscal">
        <button type="button" className="btn btn-outline-primary" onClick={abrirInformacaoFiscal}>
          Sobre integração fiscal
        </button>
      </PageHeader>

      <form className="panel mb-3" onSubmit={emitirVendaCompleta}>
        <h5>Emitir nota de venda</h5>

        <div className="row g-2">
          <div className="col-md-3">
            <label>Venda ID</label>
            <input
              className="form-control"
              value={emissao.vendaId}
              onChange={e => setEmissao({ ...emissao, vendaId: e.target.value })}
              placeholder="Ex: 1"
              required
            />
          </div>

          <div className="col-md-9 d-flex align-items-end justify-content-end">
            <button className="btn btn-success">
              Emitir venda completa
            </button>
          </div>
        </div>

        <small className="text-muted">
          O sistema identifica automaticamente se a venda possui produto, serviço ou ambos.
        </small>
      </form>

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
                <td>
                  <span className={classeStatus(x.status)}>
                    {x.status || "Pendente"}
                  </span>
                </td>
                <td>{formatarMoeda(x.valorTotal || 0)}</td>
                <td>{x.referenciaNuvemFiscal || "-"}</td>
                <td>{x.chaveOuCodigo || "-"}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => consultarStatus(x)}
                      disabled={!x.referenciaNuvemFiscal}
                    >
                      Status
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => baixarPdf(x)}
                      disabled={!x.referenciaNuvemFiscal}
                    >
                      PDF
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => baixarXml(x)}
                      disabled={!x.referenciaNuvemFiscal}
                    >
                      XML
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => consultarCancelamento(x)}
                      disabled={!x.referenciaNuvemFiscal}
                    >
                      Canc. status
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => cancelarNota(x)}
                      disabled={!x.referenciaNuvemFiscal}
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!notas.length && (
              <tr>
                <td colSpan="9" className="text-center text-muted py-4">
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
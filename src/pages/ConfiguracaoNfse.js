import { useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const inicial = {
  ambiente: "homologacao",
  lote: 1,
  serie: "1",
  numero: 1,
  opSimpNac: 3,
  regApTribSN: 1,
  regEspTrib: 0,
  incentivoFiscal: false
};

export default function ConfiguracaoNfse() {
  const [form, setForm] = useState(inicial);
  const [salvando, setSalvando] = useState(false);

  function alterar(e) {
    const { name, value, type, checked } = e.target;

    setForm((atual) => ({
      ...atual,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      setSalvando(true);

      const payload = {
        ...form,
        lote: Number(form.lote),
        numero: Number(form.numero),
        opSimpNac: Number(form.opSimpNac),
        regApTribSN: Number(form.regApTribSN),
        regEspTrib: Number(form.regEspTrib)
      };

      await api.put("/notas-fiscais/configurar-nfse-sistema", payload);

      alertaSucesso("Configuração de NFS-e salva com sucesso.");
    } catch (error) {
      alertaErro(
        error.response?.data?.message ||
          error.response?.data ||
          "Não foi possível salvar a configuração de NFS-e."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Configuração de NFS-e"
        subtitulo="Configure a emissão de nota fiscal de serviço pela Nuvem Fiscal"
      />

      <form onSubmit={salvar} className="card shadow-sm border-0">
        <div className="card-body">
          <h5 className="mb-3">Ambiente</h5>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Ambiente</label>
              <select
                name="ambiente"
                className="form-select"
                value={form.ambiente}
                onChange={alterar}
              >
                <option value="homologacao">Homologação</option>
                <option value="producao">Produção</option>
              </select>
            </div>
          </div>

          <hr />

          <h5 className="mb-3">RPS</h5>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Lote</label>
              <input
                type="number"
                name="lote"
                className="form-control"
                value={form.lote}
                onChange={alterar}
                min="1"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Série</label>
              <input
                type="text"
                name="serie"
                className="form-control"
                value={form.serie}
                onChange={alterar}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Número inicial</label>
              <input
                type="number"
                name="numero"
                className="form-control"
                value={form.numero}
                onChange={alterar}
                min="1"
              />
            </div>
          </div>

          <hr />

          <h5 className="mb-3">Regime Tributário</h5>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Simples Nacional</label>
              <select
                name="opSimpNac"
                className="form-select"
                value={form.opSimpNac}
                onChange={alterar}
              >
                <option value={1}>Não optante</option>
                <option value={2}>Optante MEI</option>
                <option value={3}>Optante ME/EPP</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Regime Apuração SN</label>
              <select
                name="regApTribSN"
                className="form-select"
                value={form.regApTribSN}
                onChange={alterar}
              >
                <option value={1}>SN normal</option>
                <option value={2}>SN federal / ISS fora</option>
                <option value={3}>Tributos fora do SN</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label">Regime Especial</label>
              <select
                name="regEspTrib"
                className="form-select"
                value={form.regEspTrib}
                onChange={alterar}
              >
                <option value={0}>Nenhum</option>
                <option value={1}>Cooperativa</option>
                <option value={2}>Estimativa</option>
                <option value={3}>Microempresa Municipal</option>
                <option value={4}>Notário/Registrador</option>
                <option value={5}>Profissional Autônomo</option>
                <option value={6}>Sociedade de Profissionais</option>
              </select>
            </div>

            <div className="col-md-12">
              <div className="form-check mt-2">
                <input
                  type="checkbox"
                  name="incentivoFiscal"
                  className="form-check-input"
                  checked={form.incentivoFiscal}
                  onChange={alterar}
                  id="incentivoFiscal"
                />
                <label className="form-check-label" htmlFor="incentivoFiscal">
                  Possui incentivo fiscal
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="card-footer bg-white d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setForm(inicial)}
            disabled={salvando}
          >
            Limpar
          </button>

          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </div>
      </form>
    </div>
  );
}
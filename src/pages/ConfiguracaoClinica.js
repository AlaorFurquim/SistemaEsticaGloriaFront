import { useEffect, useState } from "react";
import api from "../api";
import PageHeader from "../components/PageHeader";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { aplicarTemaCompleto, obterIniciais, useTenantTheme } from "../utils/theme";

const configuracaoInicial = {
  nomeEmpresa: "",
  nomeResponsavel: "",
  emailResponsavel: "",
  telefone: "",
  cnpj: "",
  endereco: "",
  emailClinica: "",
  cidade: "",
  uf: ""
};

const temaInicial = {
  corPrimaria: "#6b1836",
  corPrimariaEscura: "#3f1222",
  corMenu: "#4a1729",
  corBotoes: "#6b1836",
  corDestaque: "#c9a95d"
};

const cores = [
  ["corPrimaria", "Cor principal"],
  ["corPrimariaEscura", "Cor principal escura"],
  ["corMenu", "Menu lateral"],
  ["corBotoes", "Botoes"],
  ["corDestaque", "Destaque"]
];

export default function ConfiguracaoClinica() {
  const temaAtivo = useTenantTheme();
  const [configuracao, setConfiguracao] = useState(configuracaoInicial);
  const [tema, setTema] = useState(temaInicial);
  const [logo, setLogo] = useState(null);
  const [capa, setCapa] = useState(null);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoTema, setSalvandoTema] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/tenant/configuracao"), api.get("/tenant/tema")])
      .then(([dados, visual]) => {
        setConfiguracao({ ...configuracaoInicial, ...(dados.data || {}) });
        setTema({ ...temaInicial, ...(visual.data || {}) });
      })
      .catch(() => alertaErro("Nao foi possivel carregar as configuracoes da empresa."));
  }, []);

  const alterarConfiguracao = (campo, valor) => setConfiguracao((atual) => ({ ...atual, [campo]: valor }));
  const alterarTema = (campo, valor) => setTema((atual) => ({ ...atual, [campo]: valor }));

  async function salvarDados(e) {
    e.preventDefault();
    try {
      setSalvandoDados(true);
      await api.put("/tenant/configuracao", configuracao);
      const temaAtualizado = { ...temaAtivo, nome: configuracao.nomeEmpresa };
      await aplicarTemaCompleto(temaAtualizado);
      alertaSucesso("Dados da empresa salvos.");
    } catch (erro) {
      alertaErro(erro.response?.data || "Nao foi possivel salvar os dados.");
    } finally {
      setSalvandoDados(false);
    }
  }

  async function salvarTema(e) {
    e.preventDefault();
    try {
      setSalvandoTema(true);
      const dados = new FormData();
      cores.forEach(([campo]) => dados.append(campo, tema[campo]));
      if (logo) dados.append("logo", logo);
      if (capa) dados.append("imagemCapa", capa);
      const resposta = await api.put("/tenant/tema", dados, { headers: { "Content-Type": "multipart/form-data" } });
      await aplicarTemaCompleto(resposta.data);
      setLogo(null);
      setCapa(null);
      alertaSucesso("Identidade visual aplicada.");
    } catch (erro) {
      alertaErro(erro.response?.data || "Nao foi possivel salvar a identidade visual.");
    } finally {
      setSalvandoTema(false);
    }
  }

  return (
    <div>
      <PageHeader title="Empresa e personalizacao" subtitle="Dados institucionais, cores, logo e imagem de capa" />

      <div className="tenant-settings-layout">
        <form className="panel tenant-company-form" onSubmit={salvarDados}>
          <div className="tenant-settings-heading">
            <span>Dados institucionais</span>
            <h2>Informacoes da empresa</h2>
            <p>Esses dados aparecem em receitas, termos, contratos, orcamentos e relatorios.</p>
          </div>

          <div className="tenant-form-grid">
            <label className="tenant-wide">Nome da empresa
              <input className="form-control" value={configuracao.nomeEmpresa} onChange={(e) => alterarConfiguracao("nomeEmpresa", e.target.value)} required />
            </label>
            <label>Responsavel
              <input className="form-control" value={configuracao.nomeResponsavel} onChange={(e) => alterarConfiguracao("nomeResponsavel", e.target.value)} required />
            </label>
            <label>E-mail do responsavel
              <input type="email" className="form-control" value={configuracao.emailResponsavel} onChange={(e) => alterarConfiguracao("emailResponsavel", e.target.value)} />
            </label>
            <label>Telefone
              <input className="form-control" value={configuracao.telefone || ""} onChange={(e) => alterarConfiguracao("telefone", e.target.value)} />
            </label>
            <label>CNPJ
              <input className="form-control" value={configuracao.cnpj || ""} onChange={(e) => alterarConfiguracao("cnpj", e.target.value)} />
            </label>
            <label className="tenant-wide">Endereco
              <input className="form-control" value={configuracao.endereco || ""} onChange={(e) => alterarConfiguracao("endereco", e.target.value)} />
            </label>
            <label>E-mail da clinica
              <input type="email" className="form-control" value={configuracao.emailClinica || ""} onChange={(e) => alterarConfiguracao("emailClinica", e.target.value)} />
            </label>
            <label>Cidade
              <input className="form-control" value={configuracao.cidade || ""} onChange={(e) => alterarConfiguracao("cidade", e.target.value)} />
            </label>
            <label>UF
              <input className="form-control" maxLength={2} value={configuracao.uf || ""} onChange={(e) => alterarConfiguracao("uf", e.target.value.toUpperCase())} />
            </label>
          </div>

          <button className="btn btn-primary tenant-save" disabled={salvandoDados}>
            {salvandoDados ? "Salvando..." : "Salvar dados"}
          </button>
        </form>

        <form className="panel tenant-theme-form" onSubmit={salvarTema}>
          <div className="tenant-settings-heading">
            <span>Identidade visual</span>
            <h2>Aparencia do sistema</h2>
            <p>As alteracoes sao aplicadas para todos os usuarios desta empresa.</p>
          </div>

          <div className="tenant-theme-preview" style={{ background: tema.corMenu }}>
            {temaAtivo.logoExibicao
              ? <img src={temaAtivo.logoExibicao} alt="Logo atual" />
              : <span className="tenant-preview-monogram">{obterIniciais(configuracao.nomeEmpresa || temaAtivo.nome)}</span>}
            <div><strong>{configuracao.nomeEmpresa || temaAtivo.nome}</strong><span>Previa do menu</span></div>
            <i style={{ background: tema.corDestaque }} />
          </div>

          <div className="tenant-color-grid">
            {cores.map(([campo, label]) => (
              <label key={campo}>{label}
                <span className="tenant-color-control">
                  <input type="color" value={tema[campo]} onChange={(e) => alterarTema(campo, e.target.value)} />
                  <input className="form-control" value={tema[campo]} onChange={(e) => alterarTema(campo, e.target.value)} pattern="^#[0-9a-fA-F]{6}$" required />
                </span>
              </label>
            ))}
          </div>

          <div className="tenant-upload-grid">
            <label>Nova logo
              <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
              <small>PNG, JPG ou WebP, ate 5 MB.</small>
            </label>
            <label>Imagem da capa do login
              <input type="file" className="form-control" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCapa(e.target.files?.[0] || null)} />
              <small>Imagem horizontal, ate 10 MB.</small>
            </label>
          </div>

          <button className="btn btn-primary tenant-save" disabled={salvandoTema}>
            {salvandoTema ? "Aplicando..." : "Aplicar identidade visual"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { alertaErro, alertaSucesso } from "../utils/alerts";

const inicial = {
  nomeEmpresa: "",
  nomeResponsavel: "",
  email: "",
  telefone: "",
  senha: "",
  cnpj: "",
  endereco: "",
  cidade: "",
  uf: ""
};

export default function Inscricao() {
  const navigate = useNavigate();
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [plano, setPlano] = useState({ valorMensalidade: 150, diasTeste: 14 });

  useEffect(() => {
    api.get("/publico/configuracao-inscricao")
      .then((resposta) => setPlano({
        valorMensalidade: Number(resposta.data?.valorMensalidade || 150),
        diasTeste: Number(resposta.data?.diasTeste ?? 14)
      }))
      .catch(() => {});
  }, []);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  async function cadastrar(e) {
    e.preventDefault();
    if (enviando) return;
    try {
      setEnviando(true);
      const resposta = await api.post("/publico/inscricao", form);
      localStorage.setItem("loginEmail", form.email.trim().toLowerCase());
      alertaSucesso(resposta.data?.mensagem || "Empresa cadastrada.");
      navigate("/login");
    } catch (erro) {
      alertaErro(erro.response?.data || "Nao foi possivel concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-intro">
        <div className="signup-brand">
          <span className="signup-brand-mark">LB</span>
          <strong>Lap Beauty</strong>
        </div>
        <div>
          <span className="signup-kicker">Comece seu teste</span>
          <h1>Sua empresa pronta para atender, organizar e crescer.</h1>
          <p>Cadastre a clinica e crie o primeiro acesso administrativo em poucos minutos.</p>
        </div>
      </section>

      <form className="signup-form" onSubmit={cadastrar}>
        <header>
          <h2>Cadastrar empresa</h2>
          <p>Os dados institucionais poderao ser completados depois.</p>
        </header>

        <div className="signup-plan-summary">
          <div>
            <span>Mensalidade padrão</span>
            <strong>{plano.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}<small>/mês</small></strong>
          </div>
          <p>{plano.diasTeste > 0 ? `${plano.diasTeste} dias de teste antes da primeira cobrança.` : "Cobrança iniciada após a contratação."}</p>
        </div>

        <div className="signup-grid">
          <label className="signup-wide">Nome da empresa
            <input className="form-control" value={form.nomeEmpresa} onChange={(e) => alterar("nomeEmpresa", e.target.value)} required />
          </label>
          <label>Responsavel
            <input className="form-control" value={form.nomeResponsavel} onChange={(e) => alterar("nomeResponsavel", e.target.value)} required />
          </label>
          <label>Telefone
            <input className="form-control" value={form.telefone} onChange={(e) => alterar("telefone", e.target.value)} required />
          </label>
          <label>E-mail de acesso
            <input type="email" className="form-control" value={form.email} onChange={(e) => alterar("email", e.target.value)} required />
          </label>
          <label>Senha
            <div className="password-field">
              <input type={mostrarSenha ? "text" : "password"} className="form-control" value={form.senha} onChange={(e) => alterar("senha", e.target.value)} minLength={8} required />
              <button type="button" className="password-toggle" onClick={() => setMostrarSenha((valor) => !valor)} aria-label="Mostrar ou ocultar senha">
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </label>
          <label>CNPJ
            <input className="form-control" value={form.cnpj} onChange={(e) => alterar("cnpj", e.target.value)} />
          </label>
          <label className="signup-wide">Endereco
            <input className="form-control" value={form.endereco} onChange={(e) => alterar("endereco", e.target.value)} />
          </label>
          <label>Cidade
            <input className="form-control" value={form.cidade} onChange={(e) => alterar("cidade", e.target.value)} />
          </label>
          <label>UF
            <input className="form-control" maxLength={2} value={form.uf} onChange={(e) => alterar("uf", e.target.value.toUpperCase())} />
          </label>
        </div>

        <button className="btn btn-primary signup-submit" disabled={enviando}>
          {enviando ? "Criando sua empresa..." : "Criar minha conta"}
        </button>
        <Link className="signup-back" to="/login">Voltar para o login</Link>
      </form>
    </main>
  );
}

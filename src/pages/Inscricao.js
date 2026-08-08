import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { alertaErro, alertaSucesso } from "../utils/alerts";
import { linkLiberacaoWhatsApp, linkSuporteWhatsApp } from "../utils/whatsappSupport";

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

const criteriosSenha = (senha) => ({
  tamanho: senha.length >= 8,
  maiuscula: /[A-Z]/.test(senha),
  minuscula: /[a-z]/.test(senha),
  numero: /\d/.test(senha),
  especial: /[^A-Za-z0-9]/.test(senha)
});

const mascararCnpj = (valor) => valor.replace(/\D/g, "").slice(0, 14)
  .replace(/^(\d{2})(\d)/, "$1.$2")
  .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
  .replace(/\.(\d{3})(\d)/, ".$1/$2")
  .replace(/(\d{4})(\d)/, "$1-$2");

export default function Inscricao() {
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [plano, setPlano] = useState({ valorMensalidade: 150, diasTeste: 14 });
  const [cadastroConcluido, setCadastroConcluido] = useState(null);

  useEffect(() => {
    api.get("/publico/configuracao-inscricao")
      .then((resposta) => setPlano({
        valorMensalidade: Number(resposta.data?.valorMensalidade || 150),
        diasTeste: Number(resposta.data?.diasTeste ?? 14)
      }))
      .catch(() => {});
  }, []);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));
  const senhaValida = Object.values(criteriosSenha(form.senha)).every(Boolean);

  async function cadastrar(e) {
    e.preventDefault();
    if (enviando) return;
    if (!senhaValida) return alertaErro("Crie uma senha forte atendendo a todos os requisitos.");
    try {
      setEnviando(true);
      const resposta = await api.post("/publico/inscricao", form);
      localStorage.setItem("loginEmail", form.email.trim().toLowerCase());
      alertaSucesso(resposta.data?.mensagem || "Empresa cadastrada.");
      setCadastroConcluido({ dados: { ...form }, cobranca: resposta.data?.cobranca || null });
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

      {cadastroConcluido ? (
        <section className="signup-form signup-success" aria-live="polite">
          <span className="signup-success-icon">✓</span>
          <span className="signup-kicker">Cadastro recebido</span>
          <h2>Agora solicite a liberacao do acesso</h2>
          <p>Sua empresa foi cadastrada. Envie a mensagem pronta ao suporte para avisar nossa equipe e concluir a liberacao.</p>
          <div className="signup-success-company"><span>Empresa</span><strong>{cadastroConcluido.dados.nomeEmpresa}</strong><small>{cadastroConcluido.dados.email}</small></div>
          {cadastroConcluido.cobranca?.pixConfigurado && cadastroConcluido.cobranca?.pixCopiaECola ? (
            <div className="signup-payment">
              <QRCodeSVG value={cadastroConcluido.cobranca.pixCopiaECola} size={210} level="M" />
              <div><span>Primeira mensalidade</span><strong>{Number(cadastroConcluido.cobranca.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong><small>Vencimento em {new Date(cadastroConcluido.cobranca.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</small><textarea value={cadastroConcluido.cobranca.pixCopiaECola} readOnly /><button type="button" className="btn btn-outline-dark" onClick={() => navigator.clipboard.writeText(cadastroConcluido.cobranca.pixCopiaECola)}>Copiar codigo PIX</button></div>
            </div>
          ) : <p className="signup-payment-warning">O PIX ainda nao esta disponivel. Fale com o suporte para concluir a liberacao.</p>}
          <p className="signup-payment-note">Depois do pagamento, avise nossa equipe. O acesso sera liberado assim que confirmarmos o recebimento.</p>
          <a className="btn btn-success signup-whatsapp" href={linkLiberacaoWhatsApp(cadastroConcluido.dados)} target="_blank" rel="noreferrer">Avisar pagamento pelo WhatsApp</a>
          <Link className="btn btn-primary signup-paid-button" to="/login">Ja paguei</Link>
        </section>
      ) : <form className="signup-form" onSubmit={cadastrar}>
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
            <ul className="password-requirements">
              {Object.entries({ tamanho: "8 ou mais caracteres", maiuscula: "Uma letra maiuscula", minuscula: "Uma letra minuscula", numero: "Um numero", especial: "Um caractere especial" }).map(([chave, texto]) => <li className={criteriosSenha(form.senha)[chave] ? "valid" : ""} key={chave}>{texto}</li>)}
            </ul>
          </label>
          <label>CNPJ
            <input className="form-control" inputMode="numeric" placeholder="00.000.000/0000-00" maxLength={18} value={form.cnpj} onChange={(e) => alterar("cnpj", mascararCnpj(e.target.value))} />
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
        <a className="signup-support-link" href={linkSuporteWhatsApp("Ola! Preciso de ajuda para cadastrar minha empresa na plataforma Lap Beauty.")} target="_blank" rel="noreferrer">Precisa de ajuda? Fale com o suporte</a>
      </form>}
    </main>
  );
}

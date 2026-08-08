import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { alertaErro } from "../utils/alerts";
import { aplicarTemaBase, aplicarTemaCompleto, obterIniciais, useTenantTheme } from "../utils/theme";

export default function Login() {
  const navigate = useNavigate();
  const tema = useTenantTheme();
  const emailLembrado = localStorage.getItem("loginEmail") || "";
  const [email, setEmail] = useState(emailLembrado);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(!!emailLembrado);
  const [entrando, setEntrando] = useState(false);
  const [cobranca, setCobranca] = useState(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  useEffect(() => {
    const mensagem = sessionStorage.getItem("mensagemAcesso");
    if (mensagem) {
      sessionStorage.removeItem("mensagemAcesso");
      alertaErro(mensagem);
    }
  }, []);

  useEffect(() => {
    if (!email.includes("@") || entrando) return undefined;
    const timer = setTimeout(() => {
      api.get("/publico/tema", { params: { email } })
        .then((res) => aplicarTemaCompleto(res.data))
        .catch(() => null);
    }, 400);
    return () => clearTimeout(timer);
  }, [email, entrando]);

  function limparSessaoPreservandoEmail() {
    const emailSalvo = localStorage.getItem("loginEmail");
    localStorage.clear();

    if (emailSalvo) {
      localStorage.setItem("loginEmail", emailSalvo);
    }
  }

  async function entrar(e) {
    e.preventDefault();
    if (entrando) return;

    try {
      setEntrando(true);
      setCobranca(null);
      limparSessaoPreservandoEmail();

      const response = await api.post("/auth/login", {
        email,
        senha
      });

      const perfil = response.data.perfil;

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("nome", response.data.nome);
      localStorage.setItem("email", response.data.email);
      localStorage.setItem("perfil", perfil);
      if (response.data.tenantId) localStorage.setItem("tenantId", response.data.tenantId);
      if (response.data.tema) aplicarTemaBase(response.data.tema);

      if (lembrarAcesso) {
        localStorage.setItem("loginEmail", email);
      } else {
        localStorage.removeItem("loginEmail");
      }

      if (perfil === "PlataformaAdmin") {
        navigate("/plataforma");
      } else if (perfil === "Administrador" || perfil === "Gerente") {
        navigate("/");
      } else if (perfil === "Atendente") {
        navigate("/agenda");
      } else if (perfil === "Profissional") {
        navigate("/agenda");
      } else if (perfil === "Estoque") {
        navigate("/produtos");
      } else {
        navigate("/");
      }
    } catch (error) {
      const dados = error.response?.data;
      if (dados?.codigo === "MENSALIDADE_VENCIDA" && dados.cobranca) {
        setCobranca(dados.cobranca);
      } else {
        alertaErro(
          typeof dados === "string" ? dados : dados?.mensagem ||
            "E-mail ou senha inválidos. Verifique seus dados e tente novamente."
        );
      }
    } finally {
      setEntrando(false);
    }
  }

  async function copiarPix() {
    if (!cobranca?.pixCopiaECola) return;
    await navigator.clipboard.writeText(cobranca.pixCopiaECola);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2000);
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-overlay">
          <span>{tema.nome}</span>

          <h1>Gest&atilde;o completa para o seu neg&oacute;cio.</h1>

          <p>
            Controle agenda, atendimentos, estoque, comiss&otilde;es,
            clientes e relat&oacute;rios em uma &uacute;nica plataforma profissional.
          </p>
        </div>
      </div>

      <form className="login-card" onSubmit={entrar}>
        {tema.logoExibicao
          ? <img className="login-logo-img" src={tema.logoExibicao} alt={tema.nome} />
          : <span className="login-logo-img brand-monogram login-logo-monogram">{obterIniciais(tema.nome)}</span>}

        <h2>Acesse sua conta</h2>

        <p>Entre com seu e-mail e senha para gerenciar a cl&iacute;nica.</p>

        <label>E-mail</label>
        <input
          type="email"
          className="form-control mb-3"
          placeholder="seuemail@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={entrando}
          required
        />

        <label>Senha</label>
        <div className="password-field mb-3">
          <input
            type={mostrarSenha ? "text" : "password"}
            className="form-control"
            placeholder="Digite sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={entrando}
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() => setMostrarSenha((valor) => !valor)}
            disabled={entrando}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? "\uD83D\uDE48" : "\uD83D\uDC41\uFE0F"}
          </button>
        </div>

        <label className="remember-login">
          <input
            type="checkbox"
            checked={lembrarAcesso}
            onChange={(e) => setLembrarAcesso(e.target.checked)}
            disabled={entrando}
          />
          <span>Lembrar de mim</span>
        </label>

        <button className="btn btn-primary w-100 login-submit" disabled={entrando}>
          {entrando && <span className="login-spinner" aria-hidden="true" />}
          {entrando ? "Entrando..." : "Entrar"}
        </button>

        <div className="login-signup-link">
          <span>Ainda nao possui uma conta?</span>
          <Link to="/inscricao">Cadastrar minha empresa</Link>
        </div>

        <div className="login-footer">
          <small>&copy; {new Date().getFullYear()} Lap Beauty</small>
        </div>
      </form>

      {cobranca && (
        <div className="billing-login-backdrop" role="dialog" aria-modal="true" aria-labelledby="billing-login-title">
          <section className="billing-login-modal">
            <header>
              <div>
                <span>Mensalidade vencida</span>
                <h2 id="billing-login-title">Regularize para liberar o acesso</h2>
              </div>
              <button type="button" className="billing-modal-close" onClick={() => setCobranca(null)} aria-label="Fechar">×</button>
            </header>

            <div className="billing-login-summary">
              <div><span>Empresa</span><strong>{cobranca.empresa}</strong></div>
              <div><span>Vencimento</span><strong>{new Date(cobranca.vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong></div>
              <div><span>Valor</span><strong>{Number(cobranca.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
            </div>

            {cobranca.pixConfigurado && cobranca.pixCopiaECola ? (
              <div className="billing-login-pix">
                <QRCodeSVG value={cobranca.pixCopiaECola} size={210} level="M" />
                <div>
                  <h3>Pague com PIX</h3>
                  <p>Leia o QR Code pelo aplicativo do banco ou use o código copia e cola.</p>
                  <textarea value={cobranca.pixCopiaECola} readOnly aria-label="Código PIX copia e cola" />
                  <button type="button" className="btn btn-primary" onClick={copiarPix}>{pixCopiado ? "Código copiado" : "Copiar código PIX"}</button>
                </div>
              </div>
            ) : (
              <p className="billing-pix-unavailable">O PIX ainda não foi configurado. Entre em contato com o suporte para regularizar a mensalidade.</p>
            )}
            <p className="billing-login-note">Após o pagamento, a plataforma precisa registrar a baixa para liberar o sistema.</p>
          </section>
        </div>
      )}
    </div>
  );
}

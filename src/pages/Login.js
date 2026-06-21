import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { alertaErro } from "../utils/alerts";

export default function Login() {
  const navigate = useNavigate();
  const emailLembrado = localStorage.getItem("loginEmail") || "";
  const [email, setEmail] = useState(emailLembrado);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(!!emailLembrado);
  const [entrando, setEntrando] = useState(false);

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

      if (lembrarAcesso) {
        localStorage.setItem("loginEmail", email);
      } else {
        localStorage.removeItem("loginEmail");
      }

      if (perfil === "Administrador" || perfil === "Gerente") {
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
      alertaErro(
        error.response?.data ||
          "E-mail ou senha inv\u00e1lidos. Verifique seus dados e tente novamente."
      );
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-overlay">
          <span>Gl&oacute;ria Couto</span>

          <h1>Gest&atilde;o completa para o seu neg&oacute;cio.</h1>

          <p>
            Controle agenda, atendimentos, PDV, estoque, caixa, comiss&otilde;es,
            clientes e relat&oacute;rios em uma &uacute;nica plataforma profissional.
          </p>
        </div>
      </div>

      <form className="login-card" onSubmit={entrar}>
        <img className="login-logo-img" src="/logo-gloria.jpeg" alt="Gloria Couto" />

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

        <div className="login-footer">
          <small>&copy; {new Date().getFullYear()} Lap Beauty</small>
        </div>
      </form>
    </div>
  );
}

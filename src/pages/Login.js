import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  alertaErro,
  alertaSucesso,
  loading,
  fecharLoading
} from "../utils/alerts";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function entrar(e) {
    e.preventDefault();

    try {
    

      localStorage.clear();

      const response = await api.post("/auth/login", {
        email,
        senha
      });

      const perfil = response.data.perfil;

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("nome", response.data.nome);
      localStorage.setItem("email", response.data.email);
      localStorage.setItem("perfil", perfil);

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
          "E-mail ou senha inválidos. Verifique seus dados e tente novamente."
      );
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-overlay">
          <span>Glória Couto</span>

          <h1>
            Gestão completa para o seu negócio.
          </h1>

          <p>
            Controle agenda, atendimentos, PDV, estoque, caixa, comissões,
            clientes e relatórios em uma única plataforma profissional.
          </p>
        </div>
      </div>

      <form className="login-card" onSubmit={entrar}>
        <img className="login-logo-img" src="/logo-gloria.jpeg" alt="Glória Couto" />

        <h2>Acesse sua conta</h2>

        <p>
          Entre com seu e-mail e senha para gerenciar a clínica.
        </p>

        <label>E-mail</label>
        <input
          type="email"
          className="form-control mb-3"
          placeholder="seuemail@empresa.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <label>Senha</label>
        <input
          type="password"
          className="form-control mb-3"
          placeholder="Digite sua senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
        />

        <button className="btn btn-primary w-100">
          Entrar
        </button>

        <div className="login-footer">
          <small>
            © {new Date().getFullYear()} Lap Beauty
          </small>
        </div>
      </form>
    </div>
  );
}
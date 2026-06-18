import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Pdv from "./pages/Pdv";
import Caixa from "./pages/Caixa";
import Clientes from "./pages/Clientes";
import Profissionais from "./pages/Profissionais";
import Servicos from "./pages/Servicos";
import Atendimentos from "./pages/Atendimentos";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import NotasFiscais from "./pages/NotasFiscais";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import ProtectedRoute from "./components/ProtectedRoute";
import ConfiguracaoNfse from "./pages/ConfiguracaoNfse";
import Prontuarios from "./pages/Prontuarios";
import Orcamentos from "./pages/Orcamentos";
import Aniversariantes from "./pages/Aniversariantes";
import PdvTerminais from "./pages/PdvTerminais";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function SemPermissao() {
  return (
    <div className="panel">
      <h2>Acesso negado</h2>
      <p>Você não tem permissão para acessar esta tela.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="agenda"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Agenda />
              </ProtectedRoute>
            }
          />

          <Route
            path="pdv"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Pdv />
              </ProtectedRoute>
            }
          />

          <Route
            path="caixa"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Caixa />
              </ProtectedRoute>
            }
          />

          <Route
            path="clientes"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Clientes />
              </ProtectedRoute>
            }
          />

          <Route
            path="profissionais"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Profissionais />
              </ProtectedRoute>
            }
          />

          <Route
            path="servicos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Servicos />
              </ProtectedRoute>
            }
          />

          <Route
            path="prontuarios"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Prontuarios />
              </ProtectedRoute>
            }
          />

          <Route
            path="orcamentos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Orcamentos />
              </ProtectedRoute>
            }
          />

          <Route
            path="aniversariantes"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Aniversariantes />
              </ProtectedRoute>
            }
          />

          <Route
            path="atendimentos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Atendimentos />
              </ProtectedRoute>
            }
          />

          <Route
            path="produtos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Estoque"]}>
                <Produtos />
              </ProtectedRoute>
            }
          />

          <Route
            path="estoque"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Estoque"]}>
                <Estoque />
              </ProtectedRoute>
            }
          />

          <Route
            path="notas-fiscais"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <NotasFiscais />
              </ProtectedRoute>
            }
          />

          <Route
            path="relatorios"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Relatorios />
              </ProtectedRoute>
            }
          />

          <Route
            path="usuarios"
            element={
              <ProtectedRoute roles={["Administrador"]}>
                <Usuarios />
              </ProtectedRoute>
            }
          />

          <Route path="/pdvs" element={<ProtectedRoute roles={["Administrador"]}><PdvTerminais /></ProtectedRoute>} />
          <Route path="/configuracao-nfse" element={<ProtectedRoute><ConfiguracaoNfse /></ProtectedRoute>} />

          <Route path="sem-permissao" element={<SemPermissao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

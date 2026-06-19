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
import Receitas from "./pages/Receitas";
import Anamneses from "./pages/Anamneses";
import TermosConsentimento from "./pages/TermosConsentimento";
import FotosEvolucao from "./pages/FotosEvolucao";
import PlanosTratamento from "./pages/PlanosTratamento";
import ConfiguracaoClinica from "./pages/ConfiguracaoClinica";
import FinanceiroCompleto from "./pages/FinanceiroCompleto";
import CrmLembretes from "./pages/CrmLembretes";
import EstoqueLotes from "./pages/EstoqueLotes";
import LgpdLogs from "./pages/LgpdLogs";
import AlertasOperacionais from "./pages/AlertasOperacionais";

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

function componenteValido(Componente) {
  return typeof Componente === "function" || (typeof Componente === "object" && Componente !== null);
}

function paginaSegura(Componente, nome) {
  if (componenteValido(Componente)) return Componente;

  return function PaginaIndisponivel() {
    return (
      <div className="panel">
        <h2>Tela indisponível</h2>
        <p>O componente {nome} não foi carregado corretamente. Reinicie o frontend e tente novamente.</p>
      </div>
    );
  };
}

const Pages = {
  Login: paginaSegura(Login, "Login"),
  Layout: paginaSegura(Layout, "Layout"),
  Dashboard: paginaSegura(Dashboard, "Dashboard"),
  Agenda: paginaSegura(Agenda, "Agenda"),
  Pdv: paginaSegura(Pdv, "Pdv"),
  Caixa: paginaSegura(Caixa, "Caixa"),
  Clientes: paginaSegura(Clientes, "Clientes"),
  Profissionais: paginaSegura(Profissionais, "Profissionais"),
  Servicos: paginaSegura(Servicos, "Servicos"),
  Atendimentos: paginaSegura(Atendimentos, "Atendimentos"),
  Produtos: paginaSegura(Produtos, "Produtos"),
  Estoque: paginaSegura(Estoque, "Estoque"),
  NotasFiscais: paginaSegura(NotasFiscais, "NotasFiscais"),
  Relatorios: paginaSegura(Relatorios, "Relatorios"),
  Usuarios: paginaSegura(Usuarios, "Usuarios"),
  ConfiguracaoNfse: paginaSegura(ConfiguracaoNfse, "ConfiguracaoNfse"),
  Prontuarios: paginaSegura(Prontuarios, "Prontuarios"),
  Orcamentos: paginaSegura(Orcamentos, "Orcamentos"),
  Aniversariantes: paginaSegura(Aniversariantes, "Aniversariantes"),
  PdvTerminais: paginaSegura(PdvTerminais, "PdvTerminais"),
  Receitas: paginaSegura(Receitas, "Receitas"),
  Anamneses: paginaSegura(Anamneses, "Anamneses"),
  TermosConsentimento: paginaSegura(TermosConsentimento, "TermosConsentimento"),
  FotosEvolucao: paginaSegura(FotosEvolucao, "FotosEvolucao"),
  PlanosTratamento: paginaSegura(PlanosTratamento, "PlanosTratamento"),
  ConfiguracaoClinica: paginaSegura(ConfiguracaoClinica, "ConfiguracaoClinica"),
  FinanceiroCompleto: paginaSegura(FinanceiroCompleto, "FinanceiroCompleto"),
  CrmLembretes: paginaSegura(CrmLembretes, "CrmLembretes"),
  EstoqueLotes: paginaSegura(EstoqueLotes, "EstoqueLotes"),
  LgpdLogs: paginaSegura(LgpdLogs, "LgpdLogs"),
  AlertasOperacionais: paginaSegura(AlertasOperacionais, "AlertasOperacionais")
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Pages.Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Pages.Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Pages.Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="agenda"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Agenda />
              </ProtectedRoute>
            }
          />

          <Route
            path="pdv"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Pages.Pdv />
              </ProtectedRoute>
            }
          />

          <Route
            path="caixa"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Pages.Caixa />
              </ProtectedRoute>
            }
          />

          <Route
            path="clientes"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Pages.Clientes />
              </ProtectedRoute>
            }
          />

          <Route
            path="profissionais"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Pages.Profissionais />
              </ProtectedRoute>
            }
          />

          <Route
            path="servicos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Pages.Servicos />
              </ProtectedRoute>
            }
          />

          <Route
            path="prontuarios"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Prontuarios />
              </ProtectedRoute>
            }
          />

          <Route
            path="orcamentos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Orcamentos />
              </ProtectedRoute>
            }
          />

          <Route
            path="receitas"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Receitas />
              </ProtectedRoute>
            }
          />

          <Route
            path="anamneses"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Anamneses />
              </ProtectedRoute>
            }
          />

          <Route
            path="termos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.TermosConsentimento />
              </ProtectedRoute>
            }
          />

          <Route path="fotos-evolucao" element={<ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}><Pages.FotosEvolucao /></ProtectedRoute>} />
          <Route path="planos-tratamento" element={<ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}><Pages.PlanosTratamento /></ProtectedRoute>} />
          <Route path="crm" element={<ProtectedRoute roles={["Administrador", "Gerente"]}><Pages.CrmLembretes /></ProtectedRoute>} />
          <Route path="financeiro-completo" element={<ProtectedRoute roles={["Administrador", "Gerente"]}><Pages.FinanceiroCompleto /></ProtectedRoute>} />
          <Route path="estoque-lotes" element={<ProtectedRoute roles={["Administrador", "Gerente", "Estoque"]}><Pages.EstoqueLotes /></ProtectedRoute>} />
          <Route path="configuracao-clinica" element={<ProtectedRoute roles={["Administrador", "Gerente"]}><Pages.ConfiguracaoClinica /></ProtectedRoute>} />
          <Route path="lgpd" element={<ProtectedRoute roles={["Administrador"]}><Pages.LgpdLogs /></ProtectedRoute>} />
          <Route path="alertas" element={<ProtectedRoute roles={["Administrador", "Gerente"]}><Pages.AlertasOperacionais /></ProtectedRoute>} />

          <Route
            path="aniversariantes"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente"]}>
                <Pages.Aniversariantes />
              </ProtectedRoute>
            }
          />

          <Route
            path="atendimentos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Atendente", "Profissional"]}>
                <Pages.Atendimentos />
              </ProtectedRoute>
            }
          />

          <Route
            path="produtos"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Estoque"]}>
                <Pages.Produtos />
              </ProtectedRoute>
            }
          />

          <Route
            path="estoque"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente", "Estoque"]}>
                <Pages.Estoque />
              </ProtectedRoute>
            }
          />

          <Route
            path="notas-fiscais"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Pages.NotasFiscais />
              </ProtectedRoute>
            }
          />

          <Route
            path="relatorios"
            element={
              <ProtectedRoute roles={["Administrador", "Gerente"]}>
                <Pages.Relatorios />
              </ProtectedRoute>
            }
          />

          <Route
            path="usuarios"
            element={
              <ProtectedRoute roles={["Administrador"]}>
                <Pages.Usuarios />
              </ProtectedRoute>
            }
          />

          <Route path="/pdvs" element={<ProtectedRoute roles={["Administrador"]}><Pages.PdvTerminais /></ProtectedRoute>} />
          <Route path="/configuracao-nfse" element={<ProtectedRoute><Pages.ConfiguracaoNfse /></ProtectedRoute>} />

          <Route path="sem-permissao" element={<SemPermissao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

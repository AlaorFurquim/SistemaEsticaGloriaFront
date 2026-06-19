import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";

function MenuLink({ to, icon, children }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link className={`submenu-link ${active ? "active" : ""}`} to={to}>
      <span className="menu-icon">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

function MenuGroup({ id, title, icon, aberto, onToggle, children }) {
  return (
    <div className="menu-group">
      <button
        type="button"
        className={`menu-group-button ${aberto ? "open" : ""}`}
        onClick={() => onToggle(id)}
      >
        <span className="menu-group-left">
          <span className="menu-icon">{icon}</span>
          <span>{title}</span>
        </span>

        <span className="menu-arrow">{aberto ? "▾" : "▸"}</span>
      </button>

      {aberto && (
        <div className="submenu">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();

  const nome = localStorage.getItem("nome");
  const perfil = localStorage.getItem("perfil");

  const [menusAbertos, setMenusAbertos] = useState({
    atendimento: true,
    clientes: false,
    vendas: false,
    estoque: false,
    cadastros: false,
    fiscal: false,
    administracao: false
  });

  function toggleMenu(menu) {
    setMenusAbertos(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  }

  function sair() {
    localStorage.clear();
    navigate("/login");
  }

  const isAdmin = perfil === "Administrador";
  const isGerente = perfil === "Gerente";
  const isAtendente = perfil === "Atendente";
  const isProfissional = perfil === "Profissional";
  const isEstoque = perfil === "Estoque";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/logo-gloria.jpeg" alt="Glória Couto" />
          <div>
            <h4>Glória Couto</h4>
            <small>Estética Avançada</small>
          </div>
        </div>

        <div className="user-box">
          <strong>{nome}</strong>
          <span>{perfil}</span>
        </div>

        <nav className="main-menu">
          {(isAdmin || isGerente) && (
            <MenuLink to="/" icon="📊">
              Dashboard
            </MenuLink>
          )}

          {(isAdmin || isGerente || isAtendente || isProfissional) && (
            <MenuGroup
              id="atendimento"
              title="Atendimento"
              icon="💆"
              aberto={menusAbertos.atendimento}
              onToggle={toggleMenu}
            >
              <MenuLink to="/agenda" icon="📅">Agenda</MenuLink>
              <MenuLink to="/atendimentos" icon="📝">Atendimentos</MenuLink>
              <MenuLink to="/anamneses" icon="📋">Anamnese</MenuLink>
              <MenuLink to="/prontuarios" icon="📋">Prontuários</MenuLink>
              <MenuLink to="/termos" icon="📄">Termos</MenuLink>
              <MenuLink to="/fotos-evolucao" icon="🖼️">Fotos</MenuLink>
              <MenuLink to="/planos-tratamento" icon="🗂️">Planos</MenuLink>
              <MenuLink to="/receitas" icon="🧾">Receitas</MenuLink>
              <MenuLink to="/orcamentos" icon="💰">Orçamentos</MenuLink>
            </MenuGroup>
          )}

          {(isAdmin || isGerente || isAtendente) && (
            <MenuGroup
              id="clientes"
              title="Clientes"
              icon="👥"
              aberto={menusAbertos.clientes}
              onToggle={toggleMenu}
            >
              <MenuLink to="/clientes" icon="👤">Cadastro de Clientes</MenuLink>
              <MenuLink to="/aniversariantes" icon="🎂">Aniversariantes</MenuLink>
            </MenuGroup>
          )}

          {(isAdmin || isGerente || isAtendente) && (
            <MenuGroup
              id="vendas"
              title="Vendas e Caixa"
              icon="🛒"
              aberto={menusAbertos.vendas}
              onToggle={toggleMenu}
            >
              <MenuLink to="/pdv" icon="🧾">PDV</MenuLink>
              <MenuLink to="/caixa" icon="💵">Caixa</MenuLink>
            </MenuGroup>
          )}

          {(isAdmin || isGerente || isEstoque) && (
            <MenuGroup
              id="estoque"
              title="Estoque"
              icon="📦"
              aberto={menusAbertos.estoque}
              onToggle={toggleMenu}
            >
              <MenuLink to="/produtos" icon="🧴">Produtos</MenuLink>
              <MenuLink to="/estoque" icon="📦">Movimentações</MenuLink>
              <MenuLink to="/estoque-lotes" icon="🏷️">Lotes / Validade</MenuLink>
            </MenuGroup>
          )}

          {(isAdmin || isGerente) && (
            <MenuGroup
              id="cadastros"
              title="Cadastros"
              icon="⚙️"
              aberto={menusAbertos.cadastros}
              onToggle={toggleMenu}
            >
              <MenuLink to="/profissionais" icon="💇">Profissionais</MenuLink>
              <MenuLink to="/servicos" icon="✨">Serviços</MenuLink>
              <MenuLink to="/pdvs" icon="🧾">
                PDVs / Terminais
              </MenuLink>
              <MenuLink to="/configuracao-clinica" icon="🏥">Clínica</MenuLink>
            </MenuGroup>
          )}

          {(isAdmin || isGerente) && (
            <MenuGroup
              id="fiscal"
              title="Fiscal e Relatórios"
              icon="📑"
              aberto={menusAbertos.fiscal}
              onToggle={toggleMenu}
            >
              <MenuLink to="/notas-fiscais" icon="🧾">Notas Fiscais</MenuLink>
              <MenuLink to="/relatorios" icon="📈">Relatórios</MenuLink>
              <MenuLink to="/alertas" icon="⚠️">Alertas</MenuLink>
              <MenuLink to="/financeiro-completo" icon="💳">Financeiro</MenuLink>
              <MenuLink to="/crm" icon="💬">CRM</MenuLink>
              <MenuLink to="/configuracao-nfse" icon="🔧">Configuração NFS-e</MenuLink>
            </MenuGroup>
          )}

          {isAdmin && (
            <MenuGroup
              id="administracao"
              title="Administração"
              icon="🔐"
              aberto={menusAbertos.administracao}
              onToggle={toggleMenu}
            >
              <MenuLink to="/usuarios" icon="👨‍💻">Usuários</MenuLink>
              <MenuLink to="/lgpd" icon="🛡️">LGPD</MenuLink>
            </MenuGroup>
          )}
        </nav>

        <button
          className="btn btn-light btn-sm logout-button"
          onClick={sair}
        >
          Sair do sistema
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

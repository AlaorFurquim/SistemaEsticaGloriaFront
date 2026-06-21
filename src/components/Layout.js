import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

function MenuLink({ to, icon, children, onNavigate }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Link className={`submenu-link ${active ? "active" : ""}`} to={to} onClick={onNavigate}>
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

      {aberto && <div className="submenu">{children}</div>}
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const nome = localStorage.getItem("nome");
  const perfil = localStorage.getItem("perfil");
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);

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
    setMenusAbertos((prev) => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  }

  function sair() {
    const emailLembrado = localStorage.getItem("loginEmail");
    localStorage.clear();
    if (emailLembrado) {
      localStorage.setItem("loginEmail", emailLembrado);
    }
    navigate("/login");
  }

  useEffect(() => {
    setMenuMobileAberto(false);
  }, [location.pathname]);

  const fecharMenuMobile = () => setMenuMobileAberto(false);
  const isAdmin = perfil === "Administrador";
  const isGerente = perfil === "Gerente";
  const isAtendente = perfil === "Atendente";
  const isProfissional = perfil === "Profissional";
  const isEstoque = perfil === "Estoque";

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuMobileAberto(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <div className="mobile-brand">
          <img className="mobile-brand-logo" src="/logo-gloria.jpeg" alt="Glória Couto" />
          <div>
            <strong>Glória Couto</strong>
            <span>Estética Avançada</span>
          </div>
        </div>
      </div>

      {menuMobileAberto && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={fecharMenuMobile}
        />
      )}

      <aside className={`sidebar ${menuMobileAberto ? "open" : ""}`}>
        <button
          type="button"
          className="sidebar-close"
          onClick={fecharMenuMobile}
          aria-label="Fechar menu"
        >
          ×
        </button>

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
            <MenuLink to="/" icon="📊" onNavigate={fecharMenuMobile}>
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
              <MenuLink to="/agenda" icon="📅" onNavigate={fecharMenuMobile}>Agenda</MenuLink>
              <MenuLink to="/atendimentos" icon="📝" onNavigate={fecharMenuMobile}>Atendimentos</MenuLink>
              <MenuLink to="/anamneses" icon="📋" onNavigate={fecharMenuMobile}>Anamnese</MenuLink>
              <MenuLink to="/prontuarios" icon="📋" onNavigate={fecharMenuMobile}>Prontuários</MenuLink>
              <MenuLink to="/termos" icon="📄" onNavigate={fecharMenuMobile}>Termos</MenuLink>
              <MenuLink to="/fotos-evolucao" icon="🖼️" onNavigate={fecharMenuMobile}>Fotos</MenuLink>
              <MenuLink to="/planos-tratamento" icon="🗂️" onNavigate={fecharMenuMobile}>Planos</MenuLink>
              <MenuLink to="/receitas" icon="🧾" onNavigate={fecharMenuMobile}>Receitas</MenuLink>
              <MenuLink to="/orcamentos" icon="💰" onNavigate={fecharMenuMobile}>Orçamentos</MenuLink>
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
              <MenuLink to="/clientes" icon="👤" onNavigate={fecharMenuMobile}>Cadastro de Clientes</MenuLink>
              <MenuLink to="/aniversariantes" icon="🎂" onNavigate={fecharMenuMobile}>Aniversariantes</MenuLink>
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
              <MenuLink to="/pdv" icon="🧾" onNavigate={fecharMenuMobile}>PDV</MenuLink>
              <MenuLink to="/caixa" icon="💵" onNavigate={fecharMenuMobile}>Caixa</MenuLink>
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
              <MenuLink to="/produtos" icon="🧴" onNavigate={fecharMenuMobile}>Produtos</MenuLink>
              <MenuLink to="/estoque" icon="📦" onNavigate={fecharMenuMobile}>Movimentações</MenuLink>
              <MenuLink to="/estoque-lotes" icon="🏷️" onNavigate={fecharMenuMobile}>Lotes / Validade</MenuLink>
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
              <MenuLink to="/profissionais" icon="💇" onNavigate={fecharMenuMobile}>Profissionais</MenuLink>
              <MenuLink to="/servicos" icon="✨" onNavigate={fecharMenuMobile}>Serviços</MenuLink>
              <MenuLink to="/pdvs" icon="🧾" onNavigate={fecharMenuMobile}>PDVs / Terminais</MenuLink>
              <MenuLink to="/configuracao-clinica" icon="🏥" onNavigate={fecharMenuMobile}>Clínica</MenuLink>
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
              <MenuLink to="/notas-fiscais" icon="🧾" onNavigate={fecharMenuMobile}>Notas Fiscais</MenuLink>
              <MenuLink to="/relatorios" icon="📈" onNavigate={fecharMenuMobile}>Relatórios</MenuLink>
              <MenuLink to="/alertas" icon="⚠️" onNavigate={fecharMenuMobile}>Alertas</MenuLink>
              <MenuLink to="/financeiro-completo" icon="💳" onNavigate={fecharMenuMobile}>Financeiro</MenuLink>
              <MenuLink to="/crm" icon="💬" onNavigate={fecharMenuMobile}>CRM</MenuLink>
              <MenuLink to="/configuracao-nfse" icon="🔧" onNavigate={fecharMenuMobile}>Configuração NFS-e</MenuLink>
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
              <MenuLink to="/usuarios" icon="👨‍💻" onNavigate={fecharMenuMobile}>Usuários</MenuLink>
              <MenuLink to="/lgpd" icon="🛡️" onNavigate={fecharMenuMobile}>LGPD</MenuLink>
            </MenuGroup>
          )}
        </nav>

        <button className="btn btn-light btn-sm logout-button" onClick={sair}>
          Sair do sistema
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

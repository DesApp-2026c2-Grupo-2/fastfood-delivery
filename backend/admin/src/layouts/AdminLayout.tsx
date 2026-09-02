import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { clearSession, getUser, isAdmin } from '../auth/session';
import { SvgIcon } from '../icons/SvgIcon';

const SIDEBAR_KEY = 'mordi-admin-sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

const links = [
  { to: '/admin', label: 'Inicio', icon: 'home' as const, end: true },
  { to: '/admin/categories', label: 'Categorías', icon: 'tag' as const },
  { to: '/admin/products', label: 'Productos', icon: 'bag' as const },
  { to: '/admin/branches', label: 'Sucursales', icon: 'store' as const },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  if (!isAdmin()) {
    return <Navigate to="/admin/login" replace />;
  }

  const user = getUser();

  function logout() {
    clearSession();
    navigate('/admin/login');
  }

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }

  return (
    <div className={`app-shell app-shell--admin${collapsed ? ' app-shell--admin-collapsed' : ''}`}>
      <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
        <Link className="brand admin-sidebar-brand" to="/admin" title={collapsed ? 'Mordi admin' : undefined}>
          <BrandLogo size={40} />
          <span className="admin-sidebar-label">
            Mordi
            <small>admin</small>
          </span>
        </Link>

        <button
          type="button"
          className="admin-sidebar-toggle"
          data-label={collapsed ? 'Agrandar menú' : 'Reducir menú'}
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="admin-main"
          title={collapsed ? 'Agrandar menú' : 'Reducir menú'}
          aria-label={collapsed ? 'Agrandar menú' : 'Reducir menú'}
        >
          <SvgIcon name={collapsed ? 'chevron-right' : 'chevron-left'} className="admin-sidebar-icon" />
        </button>

        <nav className="admin-sidebar-nav" aria-label="Administración">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="admin-sidebar-link"
              data-label={link.label}
              title={collapsed ? link.label : undefined}
            >
              <SvgIcon name={link.icon} className="admin-sidebar-icon" />
              <span className="admin-sidebar-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {user ? (
            <p className="admin-sidebar-user" title={user.email}>
              {user.email}
            </p>
          ) : null}
          <button
            type="button"
            className="admin-sidebar-link"
            data-label="Salir"
            title={collapsed ? 'Salir' : undefined}
            onClick={logout}
          >
            <SvgIcon name="logout" className="admin-sidebar-icon" />
            <span className="admin-sidebar-label">Salir</span>
          </button>
        </div>
      </aside>

      <div className="admin-body">
        <main id="admin-main" className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

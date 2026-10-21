import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { clearSession, getUser, isAdmin, SESSION_EXPIRED_EVENT } from '../auth/session';
import { SvgIcon } from '../icons/SvgIcon';

const SIDEBAR_KEY = 'mordi-admin-sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

const groups = [
  {
    label: '',
    links: [{ to: '/admin', label: 'Inicio', short: 'Inicio', icon: 'home' as const, end: true }],
  },
  {
    label: 'Operación',
    links: [
      { to: '/admin/orders', label: 'Pedidos', short: 'Pedidos', icon: 'receipt' as const },
      { to: '/admin/stock', label: 'Stock', short: 'Stock', icon: 'boxes' as const },
      { to: '/admin/reports', label: 'Reportes', short: 'Reportes', icon: 'receipt' as const },
    ],
  },
  {
    label: 'Carta',
    links: [
      { to: '/admin/products', label: 'Productos', short: 'Productos', icon: 'bag' as const },
      { to: '/admin/categories', label: 'Categorías', short: 'Categorías', icon: 'tag' as const },
      { to: '/admin/promotions', label: 'Promociones', short: 'Promos', icon: 'percent' as const },
    ],
  },
  {
    label: 'Local',
    links: [{ to: '/admin/branches', label: 'Sucursales', short: 'Sucursales', icon: 'store' as const }],
  },
  {
    label: 'Configuración',
    links: [
      { to: '/admin/parameters', label: 'Parámetros', short: 'Parámetros', icon: 'sliders' as const },
      { to: '/admin/admins', label: 'Administradores', short: 'Admins', icon: 'users' as const },
    ],
  },
];

const links = groups.flatMap((group) => group.links);
const primaryTos = ['/admin', '/admin/orders', '/admin/products', '/admin/branches'];
const primaryLinks = primaryTos
  .map((to) => links.find((link) => link.to === to))
  .filter((link): link is (typeof links)[number] => Boolean(link));
const moreGroups = groups
  .map((group) => ({
    ...group,
    links: group.links.filter((link) => !primaryTos.includes(link.to)),
  }))
  .filter((group) => group.links.length > 0);

export function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [sessionTick, setSessionTick] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useLayoutEffect(() => {
    function onExpired() {
      setSessionTick((tick) => tick + 1);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  if (!isAdmin()) {
    void sessionTick;
    return <Navigate to="/admin/login" replace />;
  }

  const user = getUser();
  const helloName = user?.name?.trim().split(/\s+/)[0] ?? 'admin';

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
          {groups.map((group) => (
            <div key={group.label || 'inicio'} className="admin-nav-group">
              {group.label ? <p className="admin-nav-label">{group.label}</p> : null}
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={'end' in link ? link.end : undefined}
                  className="admin-sidebar-link"
                  data-label={link.label}
                  title={collapsed ? link.label : undefined}
                >
                  <SvgIcon name={link.icon} className="admin-sidebar-icon" />
                  <span className="admin-sidebar-label">{link.label}</span>
                </NavLink>
              ))}
            </div>
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

      <header className="admin-mobile-top">
        <Link className="brand" to="/admin">
          <BrandLogo size={36} />
          <span>
            Mordi
            <small>admin</small>
          </span>
        </Link>
        <p className="admin-mobile-hello">Hola {helloName}</p>
        <button type="button" className="link-button" onClick={logout}>
          Salir
        </button>
      </header>

      <div className="admin-body">
        <main id="admin-main" className="main">
          <Outlet />
        </main>
      </div>

      <div className="admin-bottom-nav">
        {moreOpen ? (
          <button type="button" className="admin-more-backdrop" aria-label="Cerrar menú" onClick={() => setMoreOpen(false)} />
        ) : null}
        {moreOpen ? (
          <div id="admin-more-panel" className="admin-more-panel">
            {moreGroups.map((group) => (
              <div key={group.label} className="admin-more-group">
                <p className="admin-more-label">{group.label}</p>
                <div className="admin-more-links">
                  {group.links.map((link) => (
                    <NavLink key={link.to} to={link.to} className="admin-more-link">
                      <SvgIcon name={link.icon} className="admin-bottom-icon" />
                      <span>{link.short}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <nav className="admin-bottom-bar" aria-label="Administración">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : undefined}
              className="admin-bottom-link"
            >
              <SvgIcon name={link.icon} className="admin-bottom-icon" />
              <span>{link.short}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={
              moreOpen || moreGroups.some((group) => group.links.some((link) => pathname === link.to || pathname.startsWith(`${link.to}/`)))
                ? 'admin-bottom-link active'
                : 'admin-bottom-link'
            }
            aria-expanded={moreOpen}
            aria-controls="admin-more-panel"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="admin-more-glyph" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

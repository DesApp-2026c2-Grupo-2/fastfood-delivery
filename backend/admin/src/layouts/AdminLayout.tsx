import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { User } from '../api/types';
import { BrandLogo } from '../components/BrandLogo';
import {
  clearSession,
  getToken,
  getUser,
  isAdmin,
  isOrdersViewer,
  ORDERS_ONLY_EVENT,
  saveUser,
  SESSION_EXPIRED_EVENT,
} from '../auth/session';
import { SvgIcon } from '../icons/SvgIcon';

type NavLinkItem = {
  to: string;
  label: string;
  short: string;
  icon: 'home' | 'receipt' | 'boxes' | 'bag' | 'tag' | 'percent' | 'flag' | 'ticket' | 'chart' | 'store' | 'sliders' | 'users';
  end?: boolean;
};

const SIDEBAR_KEY = 'mordi-admin-sidebar';

function readCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

const groups: { label: string; links: NavLinkItem[] }[] = [
  {
    label: '',
    links: [{ to: '/admin', label: 'Inicio', short: 'Inicio', icon: 'home' as const, end: true }],
  },
  {
    label: 'Operación',
    links: [
      { to: '/admin/orders', label: 'Pedidos', short: 'Pedidos', icon: 'receipt' as const },
      { to: '/admin/customers', label: 'Clientes', short: 'Clientes', icon: 'users' as const },
      { to: '/admin/stock', label: 'Stock', short: 'Stock', icon: 'boxes' as const },
      { to: '/admin/reports', label: 'Reportes', short: 'Reportes', icon: 'chart' as const },
    ],
  },
  {
    label: 'Reclamos',
    links: [
      { to: '/admin/incidents', label: 'Reclamos', short: 'Reclamos', icon: 'flag' as const },
      { to: '/admin/incident-coupons', label: 'Cupones de reclamos', short: 'Cupones', icon: 'ticket' as const },
    ],
  },
  {
    label: 'Carta',
    links: [
      { to: '/admin/products', label: 'Productos', short: 'Productos', icon: 'bag' as const },
      { to: '/admin/categories', label: 'Categorías', short: 'Categorías', icon: 'tag' as const },
      { to: '/admin/promotions', label: 'Promociones', short: 'Promos', icon: 'percent' as const },
      { to: '/admin/campaigns', label: 'Campañas', short: 'Campañas', icon: 'flag' as const },
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

const allLinks = groups.flatMap((group) => group.links);
const ordersLink = allLinks.find((link) => link.to === '/admin/orders');
const incidentsLink = allLinks.find((link) => link.to === '/admin/incidents');
const couponsLink = allLinks.find((link) => link.to === '/admin/incident-coupons');

function visibleNav(viewer: boolean) {
  const homeLink = groups[0]?.links[0];
  if (viewer && homeLink && ordersLink && incidentsLink && couponsLink) {
    return [
      { label: '', links: [homeLink] },
      { label: 'Operación', links: [ordersLink, incidentsLink, couponsLink] },
    ];
  }
  return groups;
}

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
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  useEffect(() => {
    function onOrdersOnly() {
      setSessionTick((tick) => tick + 1);
    }
    window.addEventListener(ORDERS_ONLY_EVENT, onOrdersOnly);
    return () => window.removeEventListener(ORDERS_ONLY_EVENT, onOrdersOnly);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    void api<User>('/auth/me', { token })
      .then((me) => {
        if (cancelled || me.role !== 'admin') return;
        const current = getUser();
        if (!current || current.adminRole === me.adminRole) return;
        saveUser({ ...current, name: me.name, email: me.email, adminRole: me.adminRole });
        setSessionTick((tick) => tick + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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

  const viewer = isOrdersViewer();
  const onOrders = pathname === '/admin/orders' || pathname.startsWith('/admin/orders/');
  const onIncidents = pathname === '/admin/incidents' || pathname.startsWith('/admin/incidents/');
  const onCoupons = pathname === '/admin/incident-coupons';
  const onHome = pathname === '/admin';
  if (viewer && !onOrders && !onIncidents && !onCoupons && !onHome) {
    return <Navigate to="/admin/orders" replace />;
  }

  const user = getUser();
  const helloName = user?.name?.trim().split(/\s+/)[0] ?? 'admin';
  const navGroups = visibleNav(viewer);
  const links = navGroups.flatMap((group) => group.links);
  const primaryTos = viewer
    ? ['/admin', '/admin/orders', '/admin/incidents', '/admin/incident-coupons']
    : ['/admin', '/admin/orders', '/admin/products', '/admin/branches'];
  const primaryLinks = primaryTos
    .map((to) => links.find((link) => link.to === to))
    .filter((link): link is NavLinkItem => link != null);
  const moreGroups = navGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => !primaryTos.includes(link.to)),
    }))
    .filter((group) => group.links.length > 0);
  const homeTo = '/admin';
  const bottomCount = primaryLinks.length + (moreGroups.length > 0 ? 1 : 0);

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
        <Link className="brand admin-sidebar-brand" to={homeTo} title={collapsed ? 'Mordi admin' : undefined}>
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
          {navGroups.map((group) => (
            <div key={group.label || 'inicio'} className="admin-nav-group">
              {group.label ? <p className="admin-nav-label">{group.label}</p> : null}
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className="admin-sidebar-link"
                  data-label={link.label}
                  title={collapsed ? link.label : undefined}
                  onClick={() => window.scrollTo(0, 0)}
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
        <Link className="brand" to={homeTo}>
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
                    <NavLink key={link.to} to={link.to} className="admin-more-link" onClick={() => window.scrollTo(0, 0)}>
                      <SvgIcon name={link.icon} className="admin-bottom-icon" />
                      <span>{link.short}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <nav
          className="admin-bottom-bar"
          aria-label="Administración"
          style={bottomCount === 5 ? undefined : { gridTemplateColumns: `repeat(${bottomCount}, minmax(0, 1fr))` }}
        >
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="admin-bottom-link"
              onClick={() => window.scrollTo(0, 0)}
            >
              <SvgIcon name={link.icon} className="admin-bottom-icon" />
              <span>{link.short}</span>
            </NavLink>
          ))}
          {moreGroups.length > 0 ? (
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
          ) : null}
        </nav>
      </div>
    </div>
  );
}

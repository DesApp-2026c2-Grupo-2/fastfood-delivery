import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { clearSession, getUser, isAdmin } from '../auth/session';

export function AdminLayout() {
  const navigate = useNavigate();
  if (!isAdmin()) {
    return <Navigate to="/admin/login" replace />;
  }

  const user = getUser();

  function logout() {
    clearSession();
    navigate('/admin/login');
  }

  return (
    <div className="app-shell app-shell--admin">
      <header className="topbar">
        <Link className="brand" to="/admin">
          <BrandLogo size={48} />
          <span>
            Mordi
            <small>admin</small>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/admin/categories">Categorías</NavLink>
          <NavLink to="/admin/products">Productos</NavLink>
          <button type="button" className="link-button" onClick={logout}>
            Salir
          </button>
        </nav>
      </header>
      <main className="main">
        {user ? <p className="muted">Hola, {user.email}</p> : null}
        <Outlet />
      </main>
    </div>
  );
}

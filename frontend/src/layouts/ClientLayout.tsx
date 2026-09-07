import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../auth/session';
import { BrandLogo } from '../components/BrandLogo';

export function ClientLayout() {
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/products">
          <BrandLogo size={48} />
          <span>
            Mordi
            <small>un mordisco y listo</small>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/products">Catálogo</NavLink>
          <NavLink to="/cart">Carrito</NavLink>
          <NavLink to="/account/addresses">Direcciones</NavLink>
          {user ? <span className="nav-user">{user.name}</span> : null}
          <button type="button" className="link-button" onClick={logout}>
            Salir
          </button>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

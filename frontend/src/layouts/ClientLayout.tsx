import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, isCustomer } from '../auth/session';
import { BrandLogo } from '../components/BrandLogo';

export function ClientLayout() {
  const navigate = useNavigate();
  const customer = isCustomer();

  function logout() {
    clearSession();
    navigate('/products');
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
          {customer ? <NavLink to="/account/addresses">Direcciones</NavLink> : null}
          {customer ? (
            <button type="button" className="link-button" onClick={logout}>
              Salir
            </button>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/register">Registrarse</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

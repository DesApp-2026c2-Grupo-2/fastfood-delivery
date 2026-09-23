import { useCart } from '../cart/CartContext';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser, isCustomer } from '../auth/session';
import { BrandLogo } from '../components/BrandLogo';

export function ClientLayout() {
  const navigate = useNavigate();
  const customer = isCustomer();
  const user = customer ? getUser() : null;
  const { count } = useCart();

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
          <NavLink to="/cart" className="cart-link">
            Carrito
            {count > 0 ? <span className="cart-badge">{count}</span> : null}
          </NavLink>
          {customer ? <NavLink to="/account/addresses">Direcciones</NavLink> : null}
          {customer ? (
            <span className="session-info">
              ¡Hola, {user?.name}!
              <button type="button" className="link-button" onClick={logout}>
                Salir
              </button>
            </span>

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

import { useCart } from '../cart/CartContext';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser, isCustomer } from '../auth/session';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNav } from '../components/BottomNav';

export function ClientLayout() {
  const navigate = useNavigate();
  const customer = isCustomer();
  const user = customer ? getUser() : null;
  const { count } = useCart();
  const [hideTopbar, setHideTopbar] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      if (window.innerWidth > 719) {
        setHideTopbar(false);
        return;
      }


      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      if (Math.abs(delta) < 8) return;

      if (current < 40) {
        setHideTopbar(false);
      } else if (delta > 0) {
        setHideTopbar(true); // bajando → ocultar
      } else {
        setHideTopbar(false); // subiendo → mostrar
      }

      lastScrollY.current = current;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  function logout() {
    clearSession();
    navigate('/products');
  }

  return (
    <div className="app-shell">
      <header className={hideTopbar ? 'topbar topbar--hidden' : 'topbar'}>
        <Link className="brand" to="/products">
          <BrandLogo size={48} />
          <span>
            Mordi
            <small>un mordisco y listo</small>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/products" className="nav-primary">
            Catálogo
          </NavLink>
          <NavLink to="/cart" className="cart-link nav-primary">
            Carrito
            {count > 0 ? <span className="cart-badge">{count}</span> : null}
          </NavLink>
          {customer ? (
            <NavLink to="/account/addresses" className="nav-primary">
              Direcciones
            </NavLink>
          ) : null}
          {customer ? (
            <span className="session-info">
              Hola {user?.name}
              <button type="button" className="link-button" onClick={logout}>
                Salir
              </button>
            </span>
          ) : (
            <>
               <NavLink to="/login" className="nav-guest">
                 Entrar
               </NavLink>
               <NavLink to="/register" className="nav-guest">
                 Registrarse
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <BottomNav count={count} customer={customer} />
    </div>
  );
}
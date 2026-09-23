import { NavLink } from 'react-router-dom';

type BottomNavProps = {
  count: number;
  customer: boolean;
};

export function BottomNav({ count, customer }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <NavLink to="/products" className="bottom-nav-item" end>
        <MenuIcon />
        <span>Catálogo</span>
      </NavLink>
      <NavLink to="/cart" className="bottom-nav-item">
        <span className="bottom-nav-icon-wrap">
          <CartIcon />
          {count > 0 ? <span className="cart-badge bottom-nav-badge">{count}</span> : null}
        </span>
        <span>Carrito</span>
      </NavLink>
      <NavLink to={customer ? '/account/addresses' : '/login'} className="bottom-nav-item">
        <AccountIcon />
        <span>{customer ? 'Mis direcciones' : 'Entrar'}</span>
      </NavLink>
      {customer ? (
        <NavLink to="/orders" className="bottom-nav-item">
          <OrdersIcon />
          <span>Pedidos</span>
        </NavLink>
      ) : null}

    </nav>
  );
}

function OrdersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
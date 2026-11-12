import { NavLink } from 'react-router-dom';

type BottomNavProps = {
  count: number;
  customer: boolean;
  userName?: string;
  hasOpenClaims?: boolean;
  claimsCount?: number;
  highlightClaims?: boolean;
};

export function BottomNav({
  count,
  customer,
  userName,
  hasOpenClaims = false,
  claimsCount = 0,
  highlightClaims = false,
}: BottomNavProps) {
  const accountClass = hasOpenClaims ? 'bottom-nav bottom-nav--account bottom-nav--claims' : 'bottom-nav bottom-nav--account';
  return (
    <nav className={customer ? accountClass : 'bottom-nav'} aria-label="Navegación principal">
      <div className="bottom-nav-shop">
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
        <NavLink to="/branches" className="bottom-nav-item">
          <StoreIcon />
          <span>Sucursales</span>
        </NavLink>
      </div>
      {customer ? (
        <div className="bottom-nav-account">
          <NavLink to="/account/addresses" className="bottom-nav-item">
            <PinIcon />
            <span>Direcciones</span>
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) => `bottom-nav-item${isActive && !highlightClaims ? ' active' : ''}`}
          >
            <OrdersIcon />
            <span>Pedidos</span>
          </NavLink>
          {hasOpenClaims ? (
            <NavLink
              to="/claims"
              className={({ isActive }) => `bottom-nav-item${isActive || highlightClaims ? ' active' : ''}`}
            >
              <span className="bottom-nav-icon-wrap">
                <ClaimsIcon />
                {claimsCount > 0 ? <span className="cart-badge bottom-nav-badge">{claimsCount}</span> : null}
              </span>
              <span>Reclamos</span>
            </NavLink>
          ) : null}
          <NavLink to="/account" className="bottom-nav-item" end>
            <span className="session-avatar bottom-nav-avatar" aria-hidden="true">
              {userName?.charAt(0).toUpperCase()}
            </span>
            <span>Mi cuenta</span>
          </NavLink>
        </div>
      ) : (
        <NavLink to="/login" className="bottom-nav-item">
          <AccountIcon />
          <span>Entrar</span>
        </NavLink>
      )}
    </nav>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" />
    </svg>
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

function ClaimsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 5h12a1 1 0 0 1 1 1v9l-3.2-2H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M8 17.5 5 20v-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
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
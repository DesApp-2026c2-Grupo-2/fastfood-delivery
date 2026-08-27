import { Link, NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';

export function ClientLayout() {
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
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

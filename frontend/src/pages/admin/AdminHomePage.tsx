import { Link } from 'react-router-dom';

export function AdminHomePage() {
  return (
    <section>
      <h1>Cocina Mordi</h1>
      <p className="muted">Acá se arma el menú: categorías y productos.</p>
      <div className="admin-home-links">
        <Link className="card-link" to="/admin/categories">
          Categorías 🍓
        </Link>
        <Link className="card-link" to="/admin/products">
          Productos 🍡
        </Link>
      </div>
    </section>
  );
}

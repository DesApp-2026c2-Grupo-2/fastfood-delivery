import { Link } from 'react-router-dom';

/** Placeholder hasta que Lucas implemente login de cliente. */
export function LoginPlaceholderPage() {
  return (
    <section className="stack">
      <header className="page-head">
        <h1>Iniciar sesión</h1>
        <p className="muted">
          El login de cliente lo implementa Lucas. Cuando esté listo, vas a poder acceder a tus direcciones.
        </p>
      </header>
      <p className="card">
        Si llegaste desde “Mis direcciones”, volvé después de iniciar sesión con una cuenta de cliente.
      </p>
      <p>
        <Link to="/products">Volver al catálogo</Link>
      </p>
    </section>
  );
}

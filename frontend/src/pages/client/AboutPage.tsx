import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Nosotros</h1>
          <p className="muted">Quiénes somos y cómo trabajamos.</p>
        </div>
      </header>

      <div className="card legal-card">
        <h2>Misión</h2>
        <p>
          Llevar comida rápida rica y bien hecha a la mesa de cada cliente, con un pedido simple,
          precios claros y una entrega en el tiempo que prometemos.
        </p>

        <h2>Visión</h2>
        <p>
          Ser la cadena de comida rápida que el barrio elige primero: cerca, confiable y con una
          experiencia de pedido que no hace falta explicar.
        </p>

        <h2>Valores</h2>
        <ul>
          <li>
            <strong>Calidad:</strong> ingredientes frescos y recetas que no cambian de una sucursal a
            otra.
          </li>
          <li>
            <strong>Transparencia:</strong> antes de confirmar ves el precio, el descuento y el envío.
            Sin sorpresas.
          </li>
          <li>
            <strong>Cumplimiento:</strong> si decimos que llega en 30 minutos, trabajamos para que
            llegue en 30 minutos.
          </li>
          <li>
            <strong>Cercanía:</strong> sucursales en tu zona y un equipo al que podés escribirle.
          </li>
        </ul>
        <p>
          ¿Querés saber dónde estamos? Mirá las <Link to="/branches">sucursales</Link> o escribinos
          desde <Link to="/contacto">contacto</Link>.
        </p>
      </div>
    </section>
  );
}

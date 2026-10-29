export function TermsPage() {
  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Términos y condiciones</h1>
          <p className="muted">Última actualización: octubre de 2026</p>
        </div>
      </header>

      <div className="card legal-card">
        <h2>1. Sobre Mordi</h2>
        <p>
          Mordi es una aplicación de pedidos para una cadena de comida rápida, desarrollada como
          proyecto de la cursada de Desarrollo de Aplicaciones.
        </p>

        <h2>2. Uso del servicio</h2>
        <p>
          Podés armar un pedido con o sin cuenta. Si te registrás, tu carrito, tus direcciones y tu
          historial quedan guardados en tu cuenta.
        </p>

        <h2>3. Pedidos, retiro y entrega</h2>
        <p>
          Elegís si retirás el pedido o si te lo llevan, y desde qué sucursal. La disponibilidad
          depende del stock de la sucursal elegida. La hora de entrega que se muestra es una
          estimación y puede variar.
        </p>

        <h2>4. Precios y promociones</h2>
        <p>
          Antes de confirmar vas a ver el subtotal, el descuento y el total. Se aplica una sola
          promoción por pedido.
        </p>

        <h2>5. Cancelaciones</h2>
        <p>
          Podés cancelar un pedido mientras todavía no empezó a prepararse. Después de ese punto ya
          no es posible.
        </p>

        <h2>6. Tus datos</h2>
        <p>
          Usamos tu nombre, tu email y tus direcciones solo para gestionar tus pedidos.
        </p>
      </div>
    </section>
  );
}
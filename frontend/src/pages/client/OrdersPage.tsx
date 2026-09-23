import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Order } from '../../api/types';
import { getToken, isCustomer } from '../../auth/session';
import { formatPrice } from '../../lib/money';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// TODO: mocks temporales mientras Nicolas termina GET /api/orders — reemplazar por fetch real
const MOCK_ORDERS: Order[] = [
  {
    id: 'mock-1',
    status: 'delivered',
    totalAmount: 8200,
    createdAt: '2026-09-18T20:14:00.000Z',
    branch: { id: 'b1', name: 'Mordi Caballito', address: 'Av. Rivadavia 5200' },
    address: { id: 'a1', street: 'Av. Rivadavia 5000' },
    items: [
      { id: 'i1', productId: 'p1', quantity: 2, notes: '', unitPrice: 3200, subtotal: 6400, product: { id: 'p1', name: 'Mordi Clásica', imageUrl: '' } },
      { id: 'i2', productId: 'p2', quantity: 1, notes: 'sin cebolla', unitPrice: 1800, subtotal: 1800, product: { id: 'p2', name: 'Papas fritas', imageUrl: '' } },
    ],
  },
  {
    id: 'mock-2',
    status: 'pending',
    totalAmount: 3200,
    createdAt: '2026-09-22T13:40:00.000Z',
    branch: { id: 'b2', name: 'Mordi Palermo', address: 'Av. Santa Fe 3400' },
    address: { id: 'a1', street: 'Av. Rivadavia 5000' },
    items: [
      { id: 'i3', productId: 'p1', quantity: 1, notes: '', unitPrice: 3200, subtotal: 3200, product: { id: 'p1', name: 'Mordi Clásica', imageUrl: '' } },
    ],
  },
];

export function OrdersPage() {
  const token = getToken();

  if (!isCustomer() || !token) {
    return <Navigate to="/login" replace state={{ from: '/orders' }} />;
  }

  return <OrdersContent token={token} />;
}

function OrdersContent({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      // TODO: reemplazar por `await api<Order[]>('/orders', { token })` cuando esté el endpoint
      await new Promise((resolve) => setTimeout(resolve, 300));
      setOrders(MOCK_ORDERS);
      void token;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function repeatOrder(order: Order) {
    setRepeatingId(order.id);
    setError('');
    try {
      // TODO: reemplazar por `await api(`/orders/${order.id}/repeat`, { method: 'POST', token })`
      // y luego `navigate('/cart')` cuando esté el endpoint
      await new Promise((resolve) => setTimeout(resolve, 300));
      setError('Repetir pedido todavía no está disponible (falta el endpoint).');
    } finally {
      setRepeatingId('');
    }
  }

  return (
    <section className="stack orders-page">
      <header className="page-head">
        <div>
          <h1>Mis pedidos</h1>
          <p className="muted">Acá vas a ver el historial de tus pedidos anteriores.</p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}

      {!loading && orders.length === 0 ? (
        <div className="empty">
          <p>Todavía no hiciste ningún pedido.</p>
          <Link to="/products">Ver el menú</Link>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id} className="card order-card">
              <div className="order-card-body">
                <div className="order-card-title">
                  <strong>{formatDate(order.createdAt)}</strong>
                  <span className={`badge badge--${order.status}`}>{statusLabel(order.status)}</span>
                </div>
                <p className="muted">{order.branch.name}</p>
                <p className="order-card-total">{formatPrice(order.totalAmount)}</p>
              </div>
              <div className="row order-card-actions">
                <Link className="secondary" to={`/orders/${order.id}`}>
                  Ver detalle
                </Link>
                <button
                  type="button"
                  disabled={repeatingId === order.id}
                  onClick={() => void repeatOrder(order)}
                >
                  {repeatingId === order.id ? 'Repitiendo…' : 'Repetir pedido'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
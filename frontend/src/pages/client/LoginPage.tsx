import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { isCustomer, saveSession } from '../../auth/session';
import { mergeGuestCartIntoAccount } from '../../cart/guestCart';
import { BrandLogo } from '../../components/BrandLogo';

type LocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isCustomer()) {
    return <Navigate to="/products" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.user.role !== 'customer') {
        setError('Este usuario no es cliente. El admin entra por la app de administración.');
        return;
      }
      saveSession(data.accessToken, data.user, remember);
      try {
        await mergeGuestCartIntoAccount(data.accessToken);
      } catch {
        /* el pedido se puede seguir armando desde la cuenta */
      }
      navigate(from && from !== '/login' ? from : '/products', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <form className="card form login-card" onSubmit={onSubmit}>
          <BrandLogo size={120} />
          <h1>Mordi</h1>
          <p className="muted">Iniciá sesión para armar tu pedido.</p>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Mantenerme logueado
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="auth-switch">
            ¿No tenés cuenta? <Link to="/register">Registrate</Link>
          </p>
          <p className="auth-switch">
            <Link to="/products">Volver al menú sin cuenta</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

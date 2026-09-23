import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { isCustomer, saveSession } from '../../auth/session';
import { mergeGuestCartIntoAccount } from '../../cart/guestCart';
import { BrandLogo } from '../../components/BrandLogo';

type LocationState = { from?: string };

type FormErrors = {
  email?: string;
  password?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isCustomer()) {
    return <Navigate to="/products" replace />;
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Ingresá tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'El formato del correo no es válido.';
    }

    if (!password) {
      nextErrors.password = 'Ingresá tu contraseña.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (data.user.role !== 'customer') {
        setApiError('Este usuario no es cliente. El admin entra por la app de administración.');
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
      setApiError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <form className="card form login-card" onSubmit={onSubmit} noValidate>
          <BrandLogo size={120} />
          <h1>Mordi</h1>
          <p className="muted">Iniciá sesión para armar tu pedido.</p>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              autoComplete="username"
            />
            {errors.email ? (
              <small className="error" role="alert">
                {errors.email}
              </small>
            ) : null}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              autoComplete="current-password"
            />
            {errors.password ? (
              <small className="error" role="alert">
                {errors.password}
              </small>
            ) : null}
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Mantenerme logueado
          </label>

          {apiError ? (
            <p className="error" role="alert">
              {apiError}
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
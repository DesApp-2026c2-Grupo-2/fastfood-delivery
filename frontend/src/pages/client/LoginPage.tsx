import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { useSession } from '../../auth/SessionContext';
import { isCustomer, saveSession } from '../../auth/session';
import { mergeGuestCartIntoAccount } from '../../cart/guestCart';
import { BrandLogo } from '../../components/BrandLogo';

const eyeIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const eyeOffIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M9.9 5.6C10.6 5.4 11.3 5.5 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.3 3.6M6.6 7.2A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.9 9.9A3.2 3.2 0 0 0 12 15.2c.6 0 1.1-.2 1.6-.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

type LocationState = { from?: string; message?: string };

type FormErrors = {
  email?: string;
  password?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh: refreshSession } = useSession();
  const locationState = location.state as LocationState | null;
  const from = locationState?.from;
  const successMessage = locationState?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      refreshSession();
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

          {/* Mensaje de éxito si viene redirigido desde el reset de contraseña */}
          {successMessage ? (
            <p className="success-banner" style={{ color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.6rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
              {successMessage}
            </p>
          ) : null}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Contraseña</span>
              {/* HU-15: Link hacia la recuperación de contraseña */}
              <Link
                to="/forgot-password"
                state={{ email: email.trim() }}
                style={{ fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? eyeOffIcon : eyeIcon}
              </button>
            </span>
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
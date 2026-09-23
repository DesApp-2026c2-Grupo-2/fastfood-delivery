import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { isCustomer, saveSession } from '../../auth/session';
import { mergeGuestCartIntoAccount } from '../../cart/guestCart';
import { BrandLogo } from '../../components/BrandLogo';

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = 'Ingresá tu nombre.';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'El nombre debe tener al menos 2 caracteres.';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Ingresá tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'El formato del correo no es válido.';
    }

    if (!password) {
      nextErrors.password = 'Ingresá una contraseña.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
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
      const data = await api<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      saveSession(data.accessToken, data.user, remember);
      try {
        await mergeGuestCartIntoAccount(data.accessToken);
      } catch {
        /* el pedido se puede seguir armando desde la cuenta */
      }
      navigate('/products', { replace: true });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <form className="card form login-card" onSubmit={onSubmit} noValidate>
          <BrandLogo size={120} />
          <h1>Crear cuenta</h1>
          <p className="muted">Registrate para pedir en Mordi.</p>

          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              autoComplete="name"
              maxLength={80}
            />
            {errors.name ? (
              <small className="error" role="alert">
                {errors.name}
              </small>
            ) : null}
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              autoComplete="email"
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
              autoComplete="new-password"
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
            {loading ? 'Creando…' : 'Registrarme'}
          </button>

          <p className="auth-switch">
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </p>
          <p className="auth-switch">
            <Link to="/products">Volver al menú sin cuenta</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
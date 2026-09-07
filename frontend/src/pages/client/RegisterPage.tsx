import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { isCustomer, saveSession } from '../../auth/session';
import { BrandLogo } from '../../components/BrandLogo';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
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
      const data = await api<LoginResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      saveSession(data.accessToken, data.user, remember);
      navigate('/products', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <form className="card form login-card" onSubmit={onSubmit}>
          <BrandLogo size={120} />
          <h1>Crear cuenta</h1>
          <p className="muted">Registrate para pedir en Mordi.</p>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
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
            {loading ? 'Creando…' : 'Registrarme'}
          </button>
          <p className="auth-switch">
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { LoginResponse } from '../../api/types';
import { isAdmin, saveSession } from '../../auth/session';
import { BrandLogo } from '../../components/BrandLogo';
import { SvgIcon } from '../../icons/SvgIcon';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@rapido.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
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
      if (data.user.role !== 'admin') {
        setError('Este usuario no es administrador');
        return;
      }
      saveSession(data.accessToken, data.user, remember);
      navigate('/admin');
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
          <p className="muted">Entrá a administrar el menú.</p>
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
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                <SvgIcon name={showPassword ? 'eye-off' : 'eye'} />
              </button>
            </span>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Mantenerme logueado
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Entrando…' : '¡Entrar!'}
          </button>
        </form>
      </main>
    </div>
  );
}

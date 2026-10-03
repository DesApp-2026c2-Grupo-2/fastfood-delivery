import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { BrandLogo } from '../../components/BrandLogo';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function validate(): boolean {
    if (!token.trim()) {
      setError('El token de restablecimiento es requerido.');
      return false;
    }
    if (!password) {
      setError('Ingresá una contraseña nueva.');
      return false;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          password,
        }),
      });

      // Redirige al login con banner de confirmación
      navigate('/login', {
        replace: true,
        state: { message: '¡Contraseña actualizada con éxito! Ya podés iniciar sesión.' },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <form className="card form login-card" onSubmit={handleSubmit} noValidate>
          <BrandLogo size={100} />
          <h1>Nueva contraseña</h1>
          <p className="muted">Ingresá el token recibido y definí tu nueva clave de acceso.</p>

          <label>
            Token de recuperación
            <input
              type="text"
              value={token}
              placeholder="Pegá tu código acá"
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError('');
              }}
            />
          </label>

          <label>
            Nueva contraseña
            <input
              type="password"
              value={password}
              placeholder="Mínimo 6 caracteres"
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
            />
          </label>

          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirmPassword}
              placeholder="Repetí la contraseña"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
            />
          </label>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} style={{ marginTop: '0.75rem' }}>
            {loading ? 'Actualizando clave…' : 'Restablecer contraseña'}
          </button>

          <p className="auth-switch" style={{ marginTop: '1.25rem' }}>
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
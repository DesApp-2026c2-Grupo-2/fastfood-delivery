import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { BrandLogo } from '../../components/BrandLogo';

type ForgotPasswordResponse = {
  message?: string;
  resetToken?: string;
  token?: string;
  demo?: {
    resetToken: string;
    expiresAt: string;
  };
};

export function ForgotPasswordPage() {
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Ingresá tu correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      const response = await api<ForgotPasswordResponse>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });

      setSubmitted(true);
      // Lee demo.resetToken que devuelve el backend
      const receivedToken =
        response?.demo?.resetToken || response?.resetToken || response?.token;

      if (receivedToken) {
        setDemoToken(receivedToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="main login-wrap">
        <div className="card form login-card">
          <BrandLogo size={100} />
          <h1>Recuperar clave</h1>
          <p className="muted">
            Ingresá tu correo y te facilitaremos las instrucciones para restablecer tu contraseña.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  placeholder="ejemplo@correo.com"
                  autoFocus
                  onChange={(e) => {
                    setEmail(e.target.value);
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
                {loading ? 'Enviando…' : 'Continuar'}
              </button>
            </form>
          ) : (
            <div className="stack" style={{ gap: '1rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '1rem',
                  color: '#166534',
                  fontSize: '0.9rem',
                }}
              >
                <strong>¡Solicitud procesada!</strong>
                <p style={{ marginTop: '0.35rem' }}>
                  Si el correo está registrado, se generaron las credenciales para restablecer el acceso.
                </p>
              </div>

              {/* HU-15: Token demostrable para la review docente */}
              {demoToken ? (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#b45309',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    🛠️ Modo demostración (Sprint 3)
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0.35rem 0' }}>
                    Token generado por el backend:
                  </p>
                  <code
                    style={{
                      display: 'block',
                      background: '#ffffff',
                      border: '1px solid #fcd34d',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      wordBreak: 'break-all',
                      color: '#b45309',
                    }}
                  >
                    {demoToken}
                  </code>
                </div>
              ) : null}

              <Link
                to={demoToken ? `/reset-password?token=${demoToken}` : '/reset-password'}
                className="checkout-button"
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Ir a restablecer contraseña →
              </Link>
            </div>
          )}

          <p className="auth-switch" style={{ marginTop: '1.25rem' }}>
            ¿Te acordaste? <Link to="/login">Volver al inicio de sesión</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
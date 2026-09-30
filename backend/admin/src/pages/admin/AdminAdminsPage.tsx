import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { AdminAccount } from '../../api/types';
import { getToken } from '../../auth/session';
import { SvgIcon } from '../../icons/SvgIcon';

const NAME_MAX = 80;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminAdminsPage() {
  const token = getToken() ?? '';
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setAdmins(await api<AdminAccount[]>('/admin/admins', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los administradores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): string | null {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) return 'El nombre es obligatorio.';
    if (trimmedName.length > NAME_MAX) return `El nombre no puede superar los ${NAME_MAX} caracteres.`;
    if (!isEmail(trimmedEmail)) return 'El email no es válido.';
    if (password.length < PASSWORD_MIN) return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`;
    if (password.length > PASSWORD_MAX) return `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`;
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setOk('');
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    try {
      const created = await api<AdminAccount>('/admin/admins', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      setAdmins((current) => [...current, created]);
      setName('');
      setEmail('');
      setPassword('');
      setOk(`${created.name} ya puede entrar con ${created.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el administrador');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Administradores</h1>
          <p className="muted">Alta de otro usuario del backoffice. La contraseña inicial se cambia desde el perfil.</p>
        </div>
      </header>

      <div className="admin-split">
        <form className="form" onSubmit={onSubmit}>
          <h2>Nuevo administrador</h2>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={NAME_MAX}
              autoComplete="name"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label>
            Contraseña inicial
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
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
            <p className="field-hint">Mínimo {PASSWORD_MIN} caracteres.</p>
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="success" role="status">
              {ok}
            </p>
          ) : null}
          <button type="submit" disabled={saving}>
            {saving ? 'Creando…' : 'Crear administrador'}
          </button>
        </form>

        <div className="stack">
          {loading ? <p className="muted">Cargando administradores…</p> : null}
          {!loading && admins.length === 0 && !error ? <p className="empty">Todavía no hay administradores.</p> : null}
          {!loading && admins.length > 0 ? (
            <ul className="list">
              {admins.map((admin) => (
                <li key={admin.id} className="list-item">
                  <div>
                    <strong>{admin.name}</strong>
                    <p className="muted">{admin.email}</p>
                    <p className="table-slug muted">Desde {formatWhen(admin.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

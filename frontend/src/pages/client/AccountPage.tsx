import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../auth/SessionContext';
import type { UpdateMeRequest, User } from '../../api/types';
import { clearSession, getToken, isCustomer, updateStoredUser } from '../../auth/session';

export function AccountPage() {
  const token = getToken();

  if (!isCustomer() || !token) {
    return <Navigate to="/login" replace state={{ from: '/account' }} />;
  }

  return <AccountContent token={token} />;
}


function AccountContent({ token }: { token: string }) {
  const navigate = useNavigate();
  const { refresh: refreshSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api<User>('/me', { token });
      setUser(data);
      setName(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setOk('');

    const payload: UpdateMeRequest = {};
    if (user && name.trim() && name.trim() !== user.name) {
      payload.name = name.trim();
    }
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        setError('Para cambiar la contraseña completá la actual y la nueva.');
        return;
      }
      if (newPassword.length < 6) {
        setError('La contraseña nueva debe tener al menos 6 caracteres.');
        return;
      }

      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setOk('No hay cambios para guardar.');
      return;
    }

    setSaving(true);
    try {
      const updated = await api<User>('/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });
      setUser(updated);
      setName(updated.name);
      updateStoredUser(updated);
      refreshSession();
      setCurrentPassword('');
      setNewPassword('');
      setOk('Datos actualizados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearSession();
    refreshSession();
    navigate('/products');
  }

  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Mi cuenta</h1>
          <p className="muted">Consultá y actualizá tus datos personales.</p>
        </div>
      </header>

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

      <form className="card form" onSubmit={onSubmit}>
        <h2>Datos personales</h2>
        <label>
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label>
          Email
          <input value={user.email} disabled />
        </label>

        <h2>Cambiar contraseña</h2>
        <p className="field-hint">Dejá estos campos vacíos si no querés cambiarla.</p>
        <label>
          Contraseña actual
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          Contraseña nueva
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className="secondary" onClick={logout}>
          Salir
        </button>
      </form>
    </section>
  );
}
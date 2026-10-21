import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { AdminAccount } from '../../api/types';
import { getToken } from '../../auth/session';
import { SvgIcon } from '../../icons/SvgIcon';
import { useTimedNotice } from '../../lib/success-notice';

type FormState = { name: string; email: string; password: string; deletable: boolean };

const NAME_MAX = 80;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const emptyForm: FormState = { name: '', email: '', password: '', deletable: true };

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminAdminFormPage() {
  const token = getToken() ?? '';
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useTimedNotice();
  const [loading, setLoading] = useState(editing);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editingInitial = editing && !form.deletable;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setMissing(false);
    setError('');
    void api<AdminAccount>(`/admin/admins/${id}`, { token })
      .then((admin) => {
        if (cancelled) return;
        setForm({
          name: admin.name,
          email: admin.email,
          password: '',
          deletable: admin.deletable,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMissing(true);
        setError(err instanceof Error ? err.message : 'No se pudo cargar el administrador');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validate(): string | null {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName) return 'El nombre es obligatorio.';
    if (trimmedName.length > NAME_MAX) return `El nombre no puede superar los ${NAME_MAX} caracteres.`;
    if (!isEmail(trimmedEmail)) return 'El email no es válido.';
    if (!editing && form.password.length < PASSWORD_MIN) {
      return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`;
    }
    if (form.password && form.password.length < PASSWORD_MIN) {
      return `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`;
    }
    if (form.password.length > PASSWORD_MAX) {
      return `La contraseña no puede superar los ${PASSWORD_MAX} caracteres.`;
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    const name = form.name.trim();
    const email = form.email.trim();
    try {
      if (id) {
        const body: { name: string; email?: string; password?: string } = { name };
        if (!editingInitial) body.email = email;
        if (form.password) body.password = form.password;
        await api(`/admin/admins/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(body),
        });
        navigate('/admin/admins', { state: { notice: `Administrador “${name}” actualizado.` } });
      } else {
        await api('/admin/admins', {
          method: 'POST',
          token,
          body: JSON.stringify({ name, email, password: form.password }),
        });
        navigate('/admin/admins', { state: { notice: `${name} ya puede entrar con ${email}.` } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="stack">
        <p className="muted">Cargando administrador…</p>
      </section>
    );
  }

  if (missing) {
    return (
      <section className="stack">
        <p className="error" role="alert">
          {error || 'Administrador no encontrado.'}
        </p>
        <Link className="btn-back" to="/admin/admins">
          ← Volver al listado
        </Link>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>{editing ? 'Editar administrador' : 'Crear administrador'}</h1>
          <p className="muted">
            {editing
              ? 'Cambiá los datos y guardá. La contraseña se cambia solo si escribís una nueva.'
              : 'Completá los datos y después volvés al listado.'}
          </p>
        </div>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="card form product-form" onSubmit={onSubmit} noValidate>
        <label>
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={NAME_MAX}
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input
            type="text"
            inputMode="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="off"
            disabled={editingInitial}
          />
        </label>
        {editingInitial ? (
          <p className="field-hint">El administrador inicial no se puede borrar ni cambiar de email.</p>
        ) : null}
        <label>
          {editing ? 'Nueva contraseña' : 'Contraseña inicial'}
          <span className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
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
          <p className="field-hint">
            {editing
              ? `Opcional. Si la completás, mínimo ${PASSWORD_MIN} caracteres.`
              : `Mínimo ${PASSWORD_MIN} caracteres. Después la puede cambiar desde el perfil.`}
          </p>
        </label>
        <div className="row">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear administrador'}
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/admin/admins')}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

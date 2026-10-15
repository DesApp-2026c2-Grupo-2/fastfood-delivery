import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { AdminAccount } from '../../api/types';
import { getToken, getUser } from '../../auth/session';
import { SvgIcon } from '../../icons/SvgIcon';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

type FormState = { id?: string; name: string; email: string; password: string; deletable: boolean };
type Screen = 'list' | 'form';

const NAME_MAX = 80;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;
const PAGE_SIZE = 20;
const INITIAL_ADMIN_EMAIL = 'admin@rapido.local';

const emptyForm: FormState = { name: '', email: '', password: '', deletable: true };

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isInitialAdmin(admin: { email: string; deletable?: boolean }) {
  return admin.deletable === false || admin.email.toLowerCase() === INITIAL_ADMIN_EMAIL;
}

export function AdminAdminsPage() {
  const token = getToken() ?? '';
  const [screen, setScreen] = useState<Screen>('list');
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const currentUserId = getUser()?.id ?? '';

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

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!pendingDelete) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) setPendingDelete(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingDelete, deleting]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return admins;
    return admins.filter(
      (admin) => admin.name.toLowerCase().includes(needle) || admin.email.toLowerCase().includes(needle),
    );
  }, [admins, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);
  const editingInitial = Boolean(form.id) && !form.deletable;

  function resetForm() {
    setForm(emptyForm);
    setShowPassword(false);
  }

  function goToList() {
    resetForm();
    setScreen('list');
  }

  function startCreate() {
    resetForm();
    setError('');
    setOk('');
    setScreen('form');
  }

  function startEdit(admin: AdminAccount) {
    setForm({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      password: '',
      deletable: !isInitialAdmin(admin),
    });
    setShowPassword(false);
    setError('');
    setOk('');
    setScreen('form');
  }

  function validate(): string | null {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName) return 'El nombre es obligatorio.';
    if (trimmedName.length > NAME_MAX) return `El nombre no puede superar los ${NAME_MAX} caracteres.`;
    if (!isEmail(trimmedEmail)) return 'El email no es válido.';
    if (!form.id && form.password.length < PASSWORD_MIN) {
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
      setOk('');
      setError(message);
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    const name = form.name.trim();
    const email = form.email.trim();
    try {
      if (form.id) {
        const body: { name: string; email?: string; password?: string } = { name };
        if (!editingInitial) body.email = email;
        if (form.password) body.password = form.password;
        await api(`/admin/admins/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(body),
        });
        setOk(`Administrador “${name}” actualizado.`);
      } else {
        await api('/admin/admins', {
          method: 'POST',
          token,
          body: JSON.stringify({ name, email, password: form.password }),
        });
        setOk(`${name} ya puede entrar con ${email}.`);
      }
      resetForm();
      setScreen('list');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  function deleteBlockReason(admin: AdminAccount) {
    if (isInitialAdmin(admin)) return 'El administrador inicial no se puede borrar';
    if (admin.id === currentUserId) return 'No podés borrar tu propio usuario';
    return '';
  }

  function askRemove(admin: AdminAccount) {
    if (deleteBlockReason(admin)) return;
    setError('');
    setPendingDelete(admin);
  }

  async function confirmRemove() {
    if (!pendingDelete || deleting) return;
    const admin = pendingDelete;
    setDeleting(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/admins/${admin.id}`, { method: 'DELETE', token });
      setPendingDelete(null);
      setOk(`Se borró “${admin.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setDeleting(false);
    }
  }

  if (screen === 'form') {
    return (
      <section className="stack">
        <header className="page-head">
          <div>
            <h1>{form.id ? 'Editar administrador' : 'Crear administrador'}</h1>
            <p className="muted">
              {form.id
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
            {form.id ? 'Nueva contraseña' : 'Contraseña inicial'}
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
              {form.id
                ? `Opcional. Si la completás, mínimo ${PASSWORD_MIN} caracteres.`
                : `Mínimo ${PASSWORD_MIN} caracteres. Después la puede cambiar desde el perfil.`}
            </p>
          </label>
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear administrador'}
            </button>
            <button type="button" className="secondary" onClick={goToList}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Administradores</h1>
          <p className="muted">
            {admins.length} con acceso al backoffice. {INITIAL_ADMIN_EMAIL} es el administrador inicial y no se puede
            borrar.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={startCreate}>
          Crear administrador
        </button>
      </header>

      {error && !pendingDelete ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="success" role="status">
          {ok}
        </p>
      ) : null}

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o email"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {admins.length === 0 ? 'Todavía no hay administradores.' : 'Ningún administrador coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Desde</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((admin) => {
                const initial = isInitialAdmin(admin);
                const blocked = deleteBlockReason(admin);
                const self = admin.id === currentUserId;
                return (
                  <tr key={admin.id}>
                    <td>
                      <strong>{admin.name}</strong>
                      {initial || self ? (
                        <p className="table-slug admin-marks">
                          {initial ? <span className="badge">Inicial</span> : null}
                          {self ? <span className="badge">Vos</span> : null}
                        </p>
                      ) : null}
                    </td>
                    <td>{admin.email}</td>
                    <td className="muted">{formatWhen(admin.createdAt)}</td>
                    <td className="data-table-actions">
                      <div className="row">
                        <button type="button" className="secondary" onClick={() => startEdit(admin)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => askRemove(admin)}
                          disabled={Boolean(blocked)}
                          title={blocked || 'Borrar'}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <nav className="pagination" aria-label="Paginación de administradores">
          <button
            type="button"
            className="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Anterior
          </button>
          <p className="pagination-status">
            {from}–{to} de {visible.length} · Página {currentPage} de {pageCount}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          >
            Siguiente
          </button>
        </nav>
      ) : null}

      {pendingDelete ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <div
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-admin-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-admin-title">Borrar administrador</h2>
            <p>
              ¿Estás seguro de borrar al administrador {pendingDelete.name} ({pendingDelete.email})? Esta acción no se
              puede deshacer.
            </p>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="row modal-actions">
              <button type="button" className="danger" disabled={deleting} onClick={() => void confirmRemove()}>
                {deleting ? 'Borrando…' : 'Borrar'}
              </button>
              <button type="button" className="secondary" disabled={deleting} autoFocus onClick={() => setPendingDelete(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

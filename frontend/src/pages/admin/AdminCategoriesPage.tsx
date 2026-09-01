import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Category } from '../../api/types';
import { getToken } from '../../auth/session';

type FormState = { id?: string; name: string };

const emptyForm: FormState = { name: '' };

export function AdminCategoriesPage() {
  const token = getToken() ?? '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setCategories(await api<Category[]>('/admin/categories', { token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, query]);

  function startEdit(category: Category) {
    setForm({ id: category.id, name: category.name });
    setError('');
    setOk('');
    document.getElementById('category-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      setError('El nombre tiene que tener al menos 2 caracteres.');
      setOk('');
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    try {
      if (form.id) {
        await api(`/admin/categories/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ name }),
        });
        setOk(`Categoría “${name}” actualizada.`);
      } else {
        await api('/admin/categories', {
          method: 'POST',
          token,
          body: JSON.stringify({ name }),
        });
        setOk(`Categoría “${name}” creada. Ahora podés cargar productos.`);
      }
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: Category) {
    const count = category._count?.products ?? 0;
    if (count > 0) {
      setError('No se puede borrar una categoría que tiene productos.');
      setOk('');
      return;
    }
    if (!confirm(`¿Borrar la categoría “${category.name}”?`)) return;
    setError('');
    setOk('');
    try {
      await api(`/admin/categories/${category.id}`, { method: 'DELETE', token });
      if (form.id === category.id) setForm(emptyForm);
      setOk(`Se borró “${category.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Categorías</h1>
          <p className="muted">{categories.length} en el menú. El cliente las usa para filtrar productos.</p>
        </div>
      </header>

      {error ? <p className="error" role="alert">{error}</p> : null}
      {ok ? <p className="success" role="status">{ok}</p> : null}

      <div className="admin-split">
        <form id="category-form" className="card form" onSubmit={onSubmit}>
          <h2>{form.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              minLength={2}
              maxLength={80}
              placeholder="Hamburguesas"
              autoComplete="off"
            />
          </label>
          <p className="field-hint">Ejemplos: Hamburguesas, Papas, Bebidas.</p>
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear'}
            </button>
            {form.id ? (
              <button type="button" className="secondary" onClick={() => setForm(emptyForm)}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="stack">
          <label className="search-label">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nombre"
              type="search"
            />
          </label>
          {loading ? <p className="muted">Cargando…</p> : null}
          {!loading && visible.length === 0 ? (
            <p className="empty">
              {categories.length === 0
                ? 'Todavía no hay categorías. Creá la primera para armar el menú.'
                : 'Ninguna categoría coincide con la búsqueda.'}
            </p>
          ) : null}
          <ul className="list">
            {visible.map((category) => {
              const count = category._count?.products ?? 0;
              return (
                <li key={category.id} className="list-item">
                  <div>
                    <strong>{category.name}</strong>
                    <p className="muted">
                      {count === 1 ? '1 producto' : `${count} productos`}
                    </p>
                  </div>
                  <div className="row list-actions">
                    <button type="button" className="secondary" onClick={() => startEdit(category)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void remove(category)}
                      disabled={count > 0}
                      title={count > 0 ? 'Pasá los productos a otra categoría antes de borrar' : 'Borrar'}
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

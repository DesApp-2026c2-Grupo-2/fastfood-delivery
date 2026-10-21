import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import type { Category } from '../../api/types';
import { getToken } from '../../auth/session';
import { slugify } from '../../lib/slug';

type FormState = { id?: string; name: string; slug: string };
type Screen = 'list' | 'form';

const emptyForm: FormState = { name: '', slug: '' };
const PAGE_SIZE = 20;

export function AdminCategoriesPage() {
  const token = getToken() ?? '';
  const [screen, setScreen] = useState<Screen>('list');
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugLocked, setSlugLocked] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [query]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(needle) || category.slug.toLowerCase().includes(needle),
    );
  }, [categories, query]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  function resetForm() {
    setForm(emptyForm);
    setSlugLocked(false);
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

  function startEdit(category: Category) {
    setForm({ id: category.id, name: category.name, slug: category.slug });
    setSlugLocked(true);
    setError('');
    setOk('');
    setScreen('form');
  }

  function onNameChange(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: current.id || slugLocked ? current.slug : slugify(name),
    }));
  }

  function onSlugChange(slug: string) {
    setSlugLocked(true);
    setForm((current) => ({ ...current, slug: slugify(slug) }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (name.length < 2) {
      setError('El nombre tiene que tener al menos 2 caracteres.');
      setOk('');
      return;
    }
    if (!slug) {
      setError('El slug no puede quedar vacío.');
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
          body: JSON.stringify({ name, slug }),
        });
        setOk(`Categoría “${name}” actualizada.`);
      } else {
        await api('/admin/categories', {
          method: 'POST',
          token,
          body: JSON.stringify({ name, slug }),
        });
        setOk(`Categoría “${name}” creada. Ahora podés cargar productos.`);
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
      setOk(`Se borró “${category.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  if (screen === 'form') {
    return (
      <section className="stack">
        <header className="page-head">
          <div>
            <h1>{form.id ? 'Editar categoría' : 'Crear categoría'}</h1>
            <p className="muted">
              {form.id ? 'Cambiá los datos y guardá.' : 'Completá la categoría y después volvés al listado.'}
            </p>
          </div>
        </header>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <form id="category-form" className="card form product-form" onSubmit={onSubmit}>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              placeholder="Hamburguesas"
              autoComplete="off"
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(event) => onSlugChange(event.target.value)}
              maxLength={80}
              placeholder="hamburguesas"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="field-hint">
            URL amigable: minúsculas, números y guiones. Se arma solo a partir del nombre, y lo podés editar.
          </p>
          {form.id ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setForm((current) => ({ ...current, slug: slugify(current.name) }));
                setSlugLocked(false);
              }}
            >
              Generar slug desde el nombre
            </button>
          ) : null}
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear categoría'}
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
          <h1>Categorías</h1>
          <p className="muted">{categories.length} en el menú. El cliente las usa para filtrar productos.</p>
        </div>
        <button type="button" disabled={loading} onClick={startCreate}>
          Crear categoría
        </button>
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

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nombre o slug"
            type="search"
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="empty">
          {categories.length === 0
            ? 'Todavía no hay categorías. Creá la primera para armar el menú.'
            : 'Ninguna categoría coincide con la búsqueda.'}
        </p>
      ) : null}

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Productos</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((category) => {
                const count = category._count?.products ?? 0;
                return (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td>
                      <span className="muted">{category.slug}</span>
                    </td>
                    <td>{count === 1 ? '1 producto' : `${count} productos`}</td>
                    <td className="data-table-actions">
                      <div className="row">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <nav className="pagination" aria-label="Paginación de categorías">
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
    </section>
  );
}

import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Category } from '../../api/types';
import { getToken } from '../../auth/session';

type FormState = { id?: string; name: string };

const emptyForm: FormState = { name: '' };

export function AdminCategoriesPage() {
  const token = getToken() ?? '';
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (form.id) {
        await api(`/admin/categories/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ name: form.name }),
        });
      } else {
        await api('/admin/categories', {
          method: 'POST',
          token,
          body: JSON.stringify({ name: form.name }),
        });
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
    if (!confirm(`¿Borrar la categoría “${category.name}”?`)) return;
    setError('');
    try {
      await api(`/admin/categories/${category.id}`, { method: 'DELETE', token });
      if (form.id === category.id) setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  return (
    <section className="stack">
      <h1>Categorías</h1>
      {error ? <p className="error">{error}</p> : null}

      <form className="card form" onSubmit={onSubmit}>
        <h2>{form.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <label>
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            maxLength={80}
            placeholder="Hamburguesas"
          />
        </label>
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

      {loading ? <p>Cargando…</p> : null}
      <ul className="list">
        {categories.map((category) => (
          <li key={category.id} className="list-item">
            <div>
              <strong>{category.name}</strong>
              <p className="muted">{category._count?.products ?? 0} productos</p>
            </div>
            <div className="row">
              <button type="button" className="secondary" onClick={() => setForm({ id: category.id, name: category.name })}>
                Editar
              </button>
              <button type="button" className="danger" onClick={() => void remove(category)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Category, Product } from '../../api/types';
import { getToken } from '../../auth/session';

type FormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  available: boolean;
  categoryId: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  available: true,
  categoryId: '',
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

export function AdminProductsPage() {
  const token = getToken() ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [productList, categoryList] = await Promise.all([
        api<Product[]>('/admin/products', { token }),
        api<Category[]>('/admin/categories', { token }),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categoryList[0]?.id || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      available: product.available,
      categoryId: product.categoryId,
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      imageUrl: form.imageUrl,
      available: form.available,
      categoryId: form.categoryId,
    };
    try {
      if (form.id) {
        await api(`/admin/products/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await api('/admin/products', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
      }
      const keepCategory = form.categoryId;
      setForm({ ...emptyForm, categoryId: keepCategory });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(product: Product) {
    if (!confirm(`¿Borrar el producto “${product.name}”?`)) return;
    setError('');
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE', token });
      if (form.id === product.id) setForm({ ...emptyForm, categoryId: form.categoryId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  return (
    <section className="stack">
      <h1>Productos</h1>
      {error ? <p className="error">{error}</p> : null}
      {categories.length === 0 && !loading ? (
        <p className="empty">Primero creá una categoría, después llega el menú para morder.</p>
      ) : null}

      <form className="card form" onSubmit={onSubmit}>
        <h2>{form.id ? 'Editar producto' : 'Nuevo producto'}</h2>
        <label>
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            maxLength={120}
            placeholder="Hamburguesa clásica"
          />
        </label>
        <label>
          Descripción
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            required
            maxLength={2000}
            rows={3}
          />
        </label>
        <label>
          Categoría
          <select
            value={form.categoryId}
            onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            required
          >
            <option value="" disabled>
              Elegí una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Precio (ARS)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            required
          />
        </label>
        <label>
          Imagen (URL)
          <input
            type="url"
            value={form.imageUrl}
            onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
            required
            placeholder="https://picsum.photos/seed/burger/800/500"
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(event) => setForm({ ...form, available: event.target.checked })}
          />
          Disponible (si no, no se muestra en el catálogo del cliente)
        </label>
        <div className="row">
          <button type="submit" disabled={saving || categories.length === 0}>
            {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear'}
          </button>
          {form.id ? (
            <button
              type="button"
              className="secondary"
              onClick={() => setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' })}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      {loading ? <p>Cargando…</p> : null}
      <ul className="list">
        {products.map((product) => (
          <li key={product.id} className="list-item">
            <div>
              <strong>{product.name}</strong>
              <p className="muted">
                {product.category?.name} · {formatPrice(product.price)} ·{' '}
                {product.available ? 'disponible' : 'no disponible'}
              </p>
            </div>
            <div className="row">
              <button type="button" className="secondary" onClick={() => startEdit(product)}>
                Editar
              </button>
              <button type="button" className="danger" onClick={() => void remove(product)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

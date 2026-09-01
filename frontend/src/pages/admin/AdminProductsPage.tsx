import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

type AvailabilityFilter = 'all' | 'available' | 'hidden';

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
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);

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

  useEffect(() => {
    setPreviewBroken(false);
  }, [form.imageUrl]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (filterCategory && product.categoryId !== filterCategory) return false;
      if (availability === 'available' && !product.available) return false;
      if (availability === 'hidden' && product.available) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        (product.category?.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [products, query, filterCategory, availability]);

  function resetForm(categoryId = categories[0]?.id ?? '') {
    setForm({ ...emptyForm, categoryId });
  }

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
    setError('');
    setOk('');
    document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validate(): string | null {
    if (form.name.trim().length < 2) return 'El nombre tiene que tener al menos 2 caracteres.';
    if (form.description.trim().length < 4) return 'La descripción es muy corta.';
    if (!form.categoryId) return 'Elegí una categoría.';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return 'El precio tiene que ser un número mayor o igual a 0.';
    try {
      const parsed = new URL(form.imageUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'La imagen tiene que ser una URL http o https.';
      }
    } catch {
      return 'La imagen tiene que ser una URL válida.';
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      setOk('');
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      imageUrl: form.imageUrl.trim(),
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
        setOk(
          payload.available
            ? `Producto “${payload.name}” actualizado.`
            : `Producto “${payload.name}” actualizado. No se muestra en el catálogo del cliente.`,
        );
      } else {
        await api('/admin/products', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        setOk(
          payload.available
            ? `Producto “${payload.name}” creado.`
            : `Producto “${payload.name}” creado. Como no está disponible, el cliente no lo ve.`,
        );
      }
      resetForm(form.categoryId);
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
    setOk('');
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE', token });
      if (form.id === product.id) resetForm(form.categoryId);
      setOk(`Se borró “${product.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    }
  }

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Productos</h1>
          <p className="muted">
            {products.length} cargados. Si “disponible” está apagado, no aparece en el catálogo del cliente.
          </p>
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

      {categories.length === 0 && !loading ? (
        <p className="empty">
          Primero creá una <Link to="/admin/categories">categoría</Link>, después llega el menú para morder.
        </p>
      ) : null}

      <div className="admin-split">
        <form id="product-form" className="card form" onSubmit={onSubmit}>
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
          {form.imageUrl && !previewBroken ? (
            <img
              className="image-preview"
              src={form.imageUrl}
              alt="Vista previa"
              onError={() => setPreviewBroken(true)}
            />
          ) : null}
          {form.imageUrl && previewBroken ? (
            <p className="field-hint">No se pudo cargar la vista previa. Revisá la URL.</p>
          ) : null}
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
              <button type="button" className="secondary" onClick={() => resetForm(form.categoryId)}>
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="stack">
          <div className="admin-toolbar">
            <label className="search-label">
              Buscar
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre o categoría"
                type="search"
              />
            </label>
            <label className="search-label">
              Categoría
              <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="filters">
              <button
                type="button"
                className={availability === 'all' ? 'chip chip-active' : 'chip'}
                onClick={() => setAvailability('all')}
              >
                Todas
              </button>
              <button
                type="button"
                className={availability === 'available' ? 'chip chip-active' : 'chip'}
                onClick={() => setAvailability('available')}
              >
                Visibles
              </button>
              <button
                type="button"
                className={availability === 'hidden' ? 'chip chip-active' : 'chip'}
                onClick={() => setAvailability('hidden')}
              >
                Ocultas
              </button>
            </div>
          </div>

          {loading ? <p className="muted">Cargando…</p> : null}
          {!loading && visible.length === 0 ? (
            <p className="empty">No hay productos con esos filtros.</p>
          ) : null}

          <ul className="list">
            {visible.map((product) => (
              <li key={product.id} className="list-item list-item--product">
                <img
                  className="list-thumb"
                  src={product.imageUrl}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23FFEDD5"/></svg>';
                  }}
                />
                <div>
                  <strong>{product.name}</strong>
                  <p className="muted">
                    {product.category?.name} · {formatPrice(product.price)}
                  </p>
                  <span className={product.available ? 'badge' : 'badge badge--off'}>
                    {product.available ? 'disponible' : 'no disponible'}
                  </span>
                </div>
                <div className="row list-actions">
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
        </div>
      </div>
    </section>
  );
}

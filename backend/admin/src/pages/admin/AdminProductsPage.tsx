import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadImages } from '../../api/client';
import type { Category, Product, ProductExtraOption } from '../../api/types';
import { getToken } from '../../auth/session';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ProductTags, productCategories } from '../../components/ProductTags';
import { SvgIcon } from '../../icons/SvgIcon';
import { mediaUrl } from '../../lib/media';
import { slugify } from '../../lib/slug';
import { useSuccessNotice, useTimedNotice } from '../../lib/success-notice';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  available: boolean;
  categoryIds: string[];
  existingImageUrls: string[];
  // Adicionales que ofrece el producto (HU-30).
  extraIds: string[];
};

type AvailabilityFilter = 'all' | 'available' | 'hidden';
type Screen = 'list' | 'form';

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  price: '',
  available: true,
  categoryIds: [],
  existingImageUrls: [],
  extraIds: [],
};

const MAX_IMAGES = 8;
// Los adicionales son los productos de esta categoría. Se busca por slug, como en el backend.
const EXTRAS_CATEGORY_SLUG = 'adicional';
const PAGE_SIZE = 20;

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(price);
}

function categoryNames(product: Product) {
  return productCategories(product)
    .map((category) => category.name)
    .join(' · ');
}

function coverUrl(product: Product) {
  return mediaUrl(product.images?.[0]?.url || product.imageUrl);
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function AdminProductsPage() {
  const token = getToken() ?? '';
  const [screen, setScreen] = useState<Screen>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [slugLocked, setSlugLocked] = useState(false);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useTimedNotice();
  const [ok, setOk] = useSuccessNotice();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Los adicionales que el producto ofrecía al abrir la edición. null mientras cargan o si no se pudieron leer.
  const [savedExtraIds, setSavedExtraIds] = useState<string[] | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(false);

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
    const urls = newFiles.map((file) => URL.createObjectURL(file));
    setFilePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFiles]);

  useEffect(() => {
    setPage(1);
  }, [query, filterCategory, availability]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const ids = product.categories?.map((category) => category.id) ?? (product.categoryId ? [product.categoryId] : []);
      if (filterCategory && !ids.includes(filterCategory)) return false;
      if (availability === 'available' && !product.available) return false;
      if (availability === 'hidden' && product.available) return false;
      if (!needle) return true;
      return (
        product.name.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle) ||
        categoryNames(product).toLowerCase().includes(needle)
      );
    });
  }, [products, query, filterCategory, availability]);

  const extrasCategoryId = categories.find((category) => category.slug === EXTRAS_CATEGORY_SLUG)?.id;
  const extraCandidates = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.id !== form.id &&
            productCategories(product).some((category) => category.slug === EXTRAS_CATEGORY_SLUG),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [products, form.id],
  );
  // Un adicional no ofrece adicionales: la sección no se muestra.
  const formIsExtra = Boolean(extrasCategoryId && form.categoryIds.includes(extrasCategoryId));

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetForm() {
    setForm(emptyForm);
    setNewFiles([]);
    setSlugLocked(false);
    setSavedExtraIds(null);
  }

  async function loadExtras(productId: string) {
    setExtrasLoading(true);
    try {
      const options = await api<ProductExtraOption[]>(`/admin/products/${productId}/extras`, { token });
      const offered = options.filter((option) => option.offered).map((option) => option.id);
      setSavedExtraIds(offered);
      setForm((current) => (current.id === productId ? { ...current, extraIds: offered } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los adicionales');
    } finally {
      setExtrasLoading(false);
    }
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

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: String(product.price),
      available: product.available,
      categoryIds:
        product.categories?.map((category) => category.id) ??
        (product.categoryId ? [product.categoryId] : []),
      existingImageUrls: product.images?.length
        ? product.images.map((image) => image.url)
        : product.imageUrl
          ? [product.imageUrl]
          : [],
      extraIds: [],
    });
    setNewFiles([]);
    setSlugLocked(true);
    setSavedExtraIds(null);
    setError('');
    setOk('');
    setScreen('form');
    void loadExtras(product.id);
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

  function toggleCategory(categoryId: string) {
    setForm((current) => {
      const selected = current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId];
      return { ...current, categoryIds: selected };
    });
  }

  function toggleExtra(extraId: string) {
    setForm((current) => ({
      ...current,
      extraIds: current.extraIds.includes(extraId)
        ? current.extraIds.filter((id) => id !== extraId)
        : [...current.extraIds, extraId],
    }));
  }

  /**
   * Guarda los adicionales después del producto. En la edición solo si cambiaron, y nunca si no se
   * pudieron leer (no pisa lo que había). Si el producto pasó a ser un adicional, se vacían.
   */
  async function saveExtras(productId: string) {
    const candidateIds = extraCandidates.map((extra) => extra.id);
    const wanted = formIsExtra ? [] : form.extraIds.filter((id) => candidateIds.includes(id));
    const before = form.id ? savedExtraIds : [];
    if (before === null || sameIds(wanted, before)) return;
    await api(`/admin/products/${productId}/extras`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ extraIds: wanted }),
    });
  }

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!picked.length) return;
    setNewFiles((current) => {
      const remaining = MAX_IMAGES - form.existingImageUrls.length - current.length;
      return [...current, ...picked.slice(0, Math.max(0, remaining))];
    });
  }

  function removeExistingImage(url: string) {
    setForm((current) => ({
      ...current,
      existingImageUrls: current.existingImageUrls.filter((item) => item !== url),
    }));
  }

  function removeNewFile(index: number) {
    setNewFiles((current) => current.filter((_, i) => i !== index));
  }

  function validate(slug: string): string | null {
    if (form.name.trim().length < 2) return 'El nombre tiene que tener al menos 2 caracteres.';
    if (!slug) return 'El slug no puede quedar vacío.';
    if (form.description.trim().length < 4) return 'La descripción es muy corta.';
    if (form.categoryIds.length === 0) return 'Elegí al menos una categoría.';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return 'El precio tiene que ser un número mayor o igual a 0.';
    if (form.existingImageUrls.length + newFiles.length === 0) return 'Subí al menos una imagen.';
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const slug = slugify(form.slug || form.name);
    const problem = validate(slug);
    if (problem) {
      setError(problem);
      setOk('');
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    try {
      const uploaded = newFiles.length ? await uploadImages(newFiles, token) : [];
      const payload = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        price: Number(form.price),
        available: form.available,
        categoryIds: form.categoryIds,
        imageUrls: [...form.existingImageUrls, ...uploaded],
      };
      let productId: string;
      if (form.id) {
        await api(`/admin/products/${form.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
        productId = form.id;
        setOk(
          payload.available
            ? `Producto “${payload.name}” actualizado.`
            : `Producto “${payload.name}” actualizado. No se muestra en el catálogo del cliente.`,
        );
      } else {
        const created = await api<Product>('/admin/products', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
        productId = created.id;
        setOk(
          payload.available
            ? `Producto “${payload.name}” creado.`
            : `Producto “${payload.name}” creado. Como no está disponible, el cliente no lo ve.`,
        );
      }
      try {
        await saveExtras(productId);
      } catch (err) {
        // El producto ya quedó guardado: se vuelve al listado igual, con el aviso.
        setOk('');
        setError(
          `“${payload.name}” se guardó, pero no sus adicionales: ${err instanceof Error ? err.message : 'error'}`,
        );
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

  async function remove(product: Product) {
    setDeleting(true);
    setError('');
    setOk('');
    try {
      await api(`/admin/products/${product.id}`, { method: 'DELETE', token });
      setOk(`Se borró “${product.name}”.`);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setDeleting(false);
    }
  }

  const totalImages = form.existingImageUrls.length + newFiles.length;
  const canAddMoreImages = totalImages < MAX_IMAGES;
  const from = visible.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, visible.length);

  if (screen === 'form') {
    return (
      <section className="stack">
        <header className="page-head">
          <div>
            <h1>{form.id ? 'Editar producto' : 'Crear producto'}</h1>
            <p className="muted">
              {form.id ? 'Cambiá los datos y guardá.' : 'Completá el producto y después volvés al listado.'}
            </p>
          </div>
        </header>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {categories.length === 0 ? (
          <p className="empty">
            Primero creá una <Link to="/admin/categories">categoría</Link>, después llega el menú para morder.
          </p>
        ) : null}

        <form id="product-form" className="card form product-form" onSubmit={onSubmit} noValidate>
          <label>
            Nombre
            <input
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              maxLength={120}
              placeholder="Hamburguesa clásica"
              autoComplete="off"
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(event) => onSlugChange(event.target.value)}
              maxLength={80}
              placeholder="hamburguesa-clasica"
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
          <label>
            Descripción
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={2000}
              rows={3}
            />
          </label>
          <fieldset className="tag-fieldset">
            <legend>Categorías</legend>
            <div className="tag-picker" role="group" aria-label="Categorías">
              {categories.map((category) => {
                const selected = form.categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={selected ? 'tag-choice is-on' : 'tag-choice'}
                    aria-pressed={selected}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <SvgIcon name={selected ? 'check' : 'tag'} className="tag-choice-icon" />
                    {category.name}
                  </button>
                );
              })}
            </div>
            <p className="field-hint">Tocá una o más. Quedan como tags del producto.</p>
          </fieldset>
          {formIsExtra ? null : (
            <fieldset className="tag-fieldset">
              <legend>Adicionales que se ofrecen</legend>
              {extrasLoading ? (
                <p className="muted">Cargando adicionales…</p>
              ) : extraCandidates.length === 0 ? (
                <p className="field-hint">
                  Todavía no hay adicionales. Son los productos con la categoría Adicional.
                </p>
              ) : (
                <>
                  <div className="tag-picker" role="group" aria-label="Adicionales que se ofrecen">
                    {extraCandidates.map((extra) => {
                      const selected = form.extraIds.includes(extra.id);
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          className={selected ? 'tag-choice is-on' : 'tag-choice'}
                          aria-pressed={selected}
                          onClick={() => toggleExtra(extra.id)}
                        >
                          <SvgIcon name={selected ? 'check' : 'tag'} className="tag-choice-icon" />
                          {extra.name} · {formatPrice(extra.price)}
                          {extra.available ? null : <span className="tag-choice-note">no disponible</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setForm((current) => ({ ...current, extraIds: extraCandidates.map((extra) => extra.id) }))}
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setForm((current) => ({ ...current, extraIds: [] }))}
                    >
                      Ninguno
                    </button>
                  </div>
                  <p className="field-hint">
                    El cliente elige entre los marcados que estén disponibles. Sin ninguno marcado, el producto no ofrece
                    adicionales.
                  </p>
                </>
              )}
            </fieldset>
          )}
          <label>
            Precio (ARS)
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>
          <div className="file-field">
            <span>Imágenes</span>
            <label className="file-button">
              <SvgIcon name="upload" className="file-button-icon" />
              <span>{canAddMoreImages ? 'Subir fotos' : 'Llegaste al máximo'}</span>
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={!canAddMoreImages}
                onChange={onFilesSelected}
              />
            </label>
          </div>
          <p className="field-hint">
            Podés subir hasta {MAX_IMAGES} fotos (JPG, PNG, WEBP o GIF). {totalImages}/{MAX_IMAGES}.
          </p>
          {totalImages > 0 ? (
            <div className="image-preview-grid">
              {form.existingImageUrls.map((url) => (
                <div key={url} className="image-preview-item">
                  <img src={mediaUrl(url)} alt="" />
                  <button type="button" className="image-remove" onClick={() => removeExistingImage(url)} aria-label="Quitar imagen">
                    <SvgIcon name="close" />
                  </button>
                </div>
              ))}
              {filePreviews.map((url, index) => (
                <div key={`${url}-${index}`} className="image-preview-item">
                  <img src={url} alt="" />
                  <button type="button" className="image-remove" onClick={() => removeNewFile(index)} aria-label="Quitar imagen">
                    <SvgIcon name="close" />
                  </button>
                </div>
              ))}
            </div>
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
              {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear producto'}
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
          <h1>Productos</h1>
          <p className="muted">
            {products.length} cargados. Si “disponible” está apagado, no aparece en el catálogo del cliente.
          </p>
        </div>
        <button type="button" disabled={categories.length === 0 || loading} onClick={startCreate}>
          Crear producto
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

      {categories.length === 0 && !loading ? (
        <p className="empty">
          Primero creá una <Link to="/admin/categories">categoría</Link>, después llega el menú para morder.
        </p>
      ) : null}

      <div className="admin-toolbar">
        <label className="search-label">
          Buscar
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, slug o categoría"
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

      {!loading && pageItems.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="data-table-photo">Foto</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Tags</th>
                <th>Estado</th>
                <th className="data-table-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((product) => (
                <tr key={product.id}>
                  <td className="data-table-photo">
                    <img
                      className="table-thumb"
                      src={coverUrl(product)}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23FFEDD5"/></svg>';
                      }}
                    />
                  </td>
                  <td>
                    <strong>{product.name}</strong>
                    <p className="muted table-slug">{product.slug}</p>
                  </td>
                  <td className="data-table-price">{formatPrice(product.price)}</td>
                  <td>
                    <ProductTags product={product} />
                  </td>
                  <td>
                    <span className={product.available ? 'badge' : 'badge badge--off'}>
                      {product.available ? 'disponible' : 'no disponible'}
                    </span>
                  </td>
                  <td className="data-table-actions">
                    <div className="row">
                      <button type="button" className="secondary" onClick={() => startEdit(product)}>
                        Editar
                      </button>
                      <button type="button" className="danger" onClick={() => setPendingDelete(product)}>
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && pageCount > 1 ? (
        <nav className="pagination" aria-label="Paginación de productos">
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
        <ConfirmModal
          title="Borrar producto"
          message={`¿Borrar “${pendingDelete.name}”? No se puede deshacer.`}
          confirmLabel="Borrar"
          busyLabel="Borrando…"
          busy={deleting}
          error={error}
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />
      ) : null}
    </section>
  );
}

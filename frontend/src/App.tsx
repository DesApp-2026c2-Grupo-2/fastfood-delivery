import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { ClientLayout } from './layouts/ClientLayout';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { ProductDetailPage } from './pages/client/ProductDetailPage';
import { ProductListPage } from './pages/client/ProductListPage';

export default function App() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
      </Route>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="products" element={<AdminProductsPage />} />
      </Route>
    </Routes>
  );
}

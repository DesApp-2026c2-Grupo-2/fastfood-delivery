import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage';
import { AdminBranchesPage } from './pages/admin/AdminBranchesPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminParametersPage } from './pages/admin/AdminParametersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminStockPage } from './pages/admin/AdminStockPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="stock" element={<AdminStockPage />} />
        <Route path="parameters" element={<AdminParametersPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="branches" element={<AdminBranchesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

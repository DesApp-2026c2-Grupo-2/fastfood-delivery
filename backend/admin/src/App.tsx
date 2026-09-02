import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminBranchesPage } from './pages/admin/AdminBranchesPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="branches" element={<AdminBranchesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

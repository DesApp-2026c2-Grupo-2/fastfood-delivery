import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminAdminFormPage } from './pages/admin/AdminAdminFormPage';
import { AdminAdminsPage } from './pages/admin/AdminAdminsPage';
import { AdminBranchesPage } from './pages/admin/AdminBranchesPage';
import { AdminBranchFormPage } from './pages/admin/AdminBranchFormPage';
import { AdminCampaignsPage } from './pages/admin/AdminCampaignsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminCustomerFormPage, AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminParametersPage } from './pages/admin/AdminParametersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminPromotionFormPage, AdminPromotionsPage } from './pages/admin/AdminPromotionsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
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
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/nuevo" element={<AdminCustomerFormPage />} />
        <Route path="customers/:id" element={<AdminCustomerFormPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="admins/nueva" element={<AdminAdminFormPage />} />
        <Route path="admins/:id" element={<AdminAdminFormPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="branches" element={<AdminBranchesPage />} />
        <Route path="branches/nueva" element={<AdminBranchFormPage />} />
        <Route path="branches/:id" element={<AdminBranchFormPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="promotions" element={<AdminPromotionsPage />} />
        <Route path="promotions/nueva" element={<AdminPromotionFormPage />} />
        <Route path="promotions/:id" element={<AdminPromotionFormPage />} />
        <Route path="campaigns" element={<AdminCampaignsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
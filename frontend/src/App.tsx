import { Navigate, Route, Routes } from 'react-router-dom';
import { ClientLayout } from './layouts/ClientLayout';
import { ProductDetailPage } from './pages/client/ProductDetailPage';
import { ProductListPage } from './pages/client/ProductListPage';

export default function App() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Route>
    </Routes>
  );
}

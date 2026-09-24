import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireCustomer } from './auth/RequireCustomer';
import { CartProvider } from './cart/CartContext';
import { ClientLayout } from './layouts/ClientLayout';
import { AddressesPage } from './pages/client/AddressesPage';
import { CartPage } from './pages/client/CartPage';
import { CheckoutPage } from './pages/client/CheckoutPage';
import { LoginPage } from './pages/client/LoginPage';
import { OrderDetailPage } from './pages/client/OrderDetailPage';
import { OrdersPage } from './pages/client/OrdersPage';
import { ProductDetailPage } from './pages/client/ProductDetailPage';
import { ProductListPage } from './pages/client/ProductListPage';
import { RegisterPage } from './pages/client/RegisterPage';

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ClientLayout />}>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route element={<RequireCustomer />}>
            <Route path="/account/addresses" element={<AddressesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Route>
      </Routes>
    </CartProvider>
  );
}
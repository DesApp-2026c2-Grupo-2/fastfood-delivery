import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isCustomer } from './session';

export function RequireCustomer() {
  const location = useLocation();

  if (!isCustomer()) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}

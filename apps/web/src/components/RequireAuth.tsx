import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/auth";

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

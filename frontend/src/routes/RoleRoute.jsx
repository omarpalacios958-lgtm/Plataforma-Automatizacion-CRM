import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/useAuth";

function RoleRoute({ rolesPermitidos }) {
  const { usuario } = useAuth();

  const tienePermiso = rolesPermitidos.includes(usuario.role);

  if (!tienePermiso) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
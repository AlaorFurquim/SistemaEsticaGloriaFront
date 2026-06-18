import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  const perfil = localStorage.getItem("perfil");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(perfil)) {
    return <Navigate to="/sem-permissao" replace />;
  }

  return children;
}
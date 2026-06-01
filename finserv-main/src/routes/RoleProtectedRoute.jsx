import React from "react";
import { Navigate } from "react-router-dom";

const RoleProtectedRoute = ({ children, allowedRole }) => {
  const role = localStorage.getItem("role");
  return role === allowedRole ? children : <Navigate to="/unauthorized" replace />;
};

export default RoleProtectedRoute;

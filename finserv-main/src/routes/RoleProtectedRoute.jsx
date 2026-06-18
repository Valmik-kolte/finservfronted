import React from "react";
import { Navigate } from "react-router-dom";

const RoleProtectedRoute = ({ children, allowedRole }) => {
  let role = null;
  if (localStorage.getItem("adminData")) {
    role = "ADMIN";
  } else if (localStorage.getItem("dealerData")) {
    role = "DEALER";
  } else if (localStorage.getItem("userData")) {
    role = "USER";
  }

  return role === allowedRole ? children : <Navigate to="/unauthorized" replace />;
};

export default RoleProtectedRoute;

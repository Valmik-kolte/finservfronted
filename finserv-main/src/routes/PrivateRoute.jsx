import React from "react";
import { Navigate } from "react-router-dom";
import { getAuthToken } from "../utils/authSession";

const PrivateRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/" replace />;
};

export default PrivateRoute;

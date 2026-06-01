// src/services/authService.js
import api from "./api";

// LOGIN
export const loginUser = async (data) => {
  // data = { email, password }
  const response = await api.post("/auth/login", data);
  return response.data;
};

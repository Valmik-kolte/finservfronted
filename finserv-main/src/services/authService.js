// src/services/authService.js
import api from "./api";

// LOGIN - tries dealer-specific endpoint first, falls back to common auth
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const loginDealer = async (data) => {
  // Try dealer-specific login endpoint
  const response = await api.post("/dealer/login", data);
  return response.data;
};

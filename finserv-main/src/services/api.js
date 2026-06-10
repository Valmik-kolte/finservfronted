// src/services/api.js

import axios from "axios";

const api = axios.create({
  // baseURL: "https://v1.vahanfinserv.com/api",
  baseURL: "http://localhost:8081/api",
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  if (config.skipAuth) {
    delete config.skipAuth;
    if (config.headers) delete config.headers.Authorization;
    return config;
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

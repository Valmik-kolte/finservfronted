// src/services/api.js

import axios from "axios";
import { getAuthToken, clearAuthSession } from "../utils/authSession";
import { API_BASE_URL } from "../config/appConfig";

const api = axios.create({
  baseURL: API_BASE_URL
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  if (config.skipAuth) {
    delete config.skipAuth;
    if (config.headers) delete config.headers.Authorization;
    return config;
  } 

  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Redirect to login on 401 response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthSession();
      localStorage.setItem("session_expired_toast", "true");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

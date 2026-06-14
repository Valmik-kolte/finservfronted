// src/services/api.js

import axios from "axios";
import { getAuthToken } from "../utils/authSession";

const api = axios.create({
  baseURL: "https://v1.vahanfinserv.com/api"
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

export default api;

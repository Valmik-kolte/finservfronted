import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data ?? null;

export const getDealerProfile = async () => {
  const response = await api.get("/dealer/me");
  return unwrap(response);
};

export const getDealerUsers = async () => {
  const response = await api.get("/dealer/me/users");
  return unwrap(response) || [];
};

export const getDealerUserDocuments = async (userId) => {
  const response = await api.get(`/dealer/me/users/${userId}/documents`);
  return unwrap(response) || [];
};

export const getDealerDashboardSummary = async () => {
  const response = await api.get("/dealer/me/dashboard");
  return unwrap(response);
};

export const getDealerUserTracking = async (userId) => {
  const response = await api.get(`/dealer/me/users/${userId}/tracking`);
  return unwrap(response);
};

export const getDealerNotifications = async (params = {}) => {
  const response = await api.get("/dealer/me/notifications", { params });
  return unwrap(response) || [];
};

export const markDealerNotificationRead = async (notificationId) => {
  const response = await api.put(`/dealer/me/notifications/${notificationId}/read`);
  return unwrap(response);
};

export const markAllDealerNotificationsRead = async () => {
  const response = await api.put("/dealer/me/notifications/read-all");
  return unwrap(response);
};

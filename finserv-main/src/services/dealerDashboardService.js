import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data ?? null;

export const getDealerUsers = async () => {
  const response = await api.get("/chatbot/dealer/users");
  const list = unwrap(response) || [];
  return list.map((user) => ({
    ...user,
    fullName: user.fullName || user.name,
  }));
};

export const getDealerUserDocuments = async (userId) => {
  const response = await api.get(`/documents/user/${userId}`);
  return unwrap(response) || [];
};

export const getDealerNotifications = async ({ dealerId } = {}) => {
  if (!dealerId) return [];
  const response = await api.get(`/notifications/${dealerId}`);
  return unwrap(response) || [];
};

export const markDealerNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/read/${notificationId}`);
  return unwrap(response);
};

export const getDealerDashboardSummary = async () => {
  try {
    const response = await api.get("/chatbot/dealer/document-summary");
    const unwrapResponse = unwrap(response);
    const summary = unwrapResponse?.summary || {};
    return {
      usersCount: unwrapResponse?.usersCount,
      documentsCount: summary.totalDocuments,
      pendingDocsCount: summary.pending,
      approvedDocsCount: summary.approved,
      rejectedDocsCount: summary.rejected,
      bankAssignedCount: unwrapResponse?.bankAssignedCount,
    };
  } catch (e) {
    return null;
  }
};

import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data ?? null;

export const getDealerUsers = async () => {
  const session = JSON.parse(localStorage.getItem("dealerData") || "{}");
  const resolvedDealerId = session.dealerId || session.id;
  const resolvedCode = session.dealerCode || localStorage.getItem("dealerCode") || "";
  
  let apiUsers = [];
  if (resolvedCode) {
    try {
      const response = await api.get(`/user/dealer/${resolvedCode}`);
      const data = response.data?.users || response.data?.data?.users || response.data || [];
      if (Array.isArray(data)) {
        apiUsers = data;
      } else if (data && Array.isArray(data.users)) {
        apiUsers = data.users;
      }
    } catch (err) {
      console.warn("Failed to fetch dealer users from database:", err);
      if (err?.response?.status === 403) {
        throw err;
      }
    }
  }

  const localList = JSON.parse(localStorage.getItem("dealer_registered_users") || "[]");
  const list = localList.filter(
    (user) =>
      (resolvedDealerId && (String(user.dealerId) === String(resolvedDealerId) || String(user.assignedDealerId) === String(resolvedDealerId))) ||
      (resolvedCode && String(user.dealerCode).toLowerCase() === String(resolvedCode).toLowerCase())
  );
  
  const map = new Map();
  [...apiUsers, ...list].forEach((user) => {
    const id = user.userId || user.id;
    if (!id) return;
    const existing = map.get(String(id)) || {};
    const merged = { ...existing, ...user, userId: id };
    
    // Preserve valid dealerCode
    if (existing.dealerCode && (!user.dealerCode || String(user.dealerCode).trim() === "" || String(user.dealerCode).toUpperCase() === "N/A")) {
      merged.dealerCode = existing.dealerCode;
    }
    
    const fallbackDate = user.createdAt || existing.createdAt || user.paymentDate || existing.paymentDate || user.paymentUploadedAt || existing.paymentUploadedAt;
    if (fallbackDate) {
      merged.createdAt = fallbackDate;
    }
    
    if (user.fullName || user.name) {
      merged.fullName = user.fullName || user.name;
    }
    map.set(String(id), merged);
  });

  return Array.from(map.values());
};

export const getDealerUserDocuments = async (userId) => {
  const response = await api.get(`/documents/user/${userId}`);
  return unwrap(response) || [];
};

export const getDealerNotifications = async ({ dealerId } = {}) => {
  if (!dealerId) return [];
  try {
    const response = await api.get(`/notifications/${dealerId}`);
    const list = unwrap(response) || [];
    return list.filter((notif) => {
      const role = notif.receiverRole || notif.role;
      if (role && role !== "DEALER") return false;
      const msg = notif.message;
      if (msg) {
        const lower = msg.toLowerCase();
        if (
          lower.startsWith("admin approved") ||
          lower.startsWith("admin verified") ||
          lower.startsWith("admin rejected") ||
          lower.startsWith("admin added remark") ||
          lower.startsWith("admin added a remark")
        ) {
          return false;
        }
      }
      return true;
    });
  } catch (err) {
    if (err?.response?.status === 403) {
      throw err;
    }
    return [];
  }
};

export const markDealerNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/read/${notificationId}`);
  return unwrap(response);
};

export const getDealerDashboardSummary = async () => {
  try {
    const users = await getDealerUsers();
    
    // Fetch documents for each user
    const results = await Promise.allSettled(
      users.map((user) => api.get(`/documents/user/${user.userId || user.id}`))
    );
    const documents = results.flatMap((result) => {
      if (result.status === "fulfilled") {
        const val = result.value?.data?.data ?? result.value?.data ?? [];
        return Array.isArray(val) ? val : [];
      }
      return [];
    });
    
    const total = documents.length;
    const pending = documents.filter(d => String(d.status).toUpperCase() === "PENDING").length;
    const approved = documents.filter(d => String(d.status).toUpperCase() === "APPROVED" || String(d.status).toUpperCase() === "VERIFIED").length;
    const rejected = documents.filter(d => String(d.status).toUpperCase() === "REJECTED").length;
    
    const bankAssignedCount = users.filter(user => user.assignedBankId || user.bankId || user.bankName || user.assignedBankName).length;

    return {
      usersCount: users.length,
      documentsCount: total,
      pendingDocsCount: pending,
      approvedDocsCount: approved,
      rejectedDocsCount: rejected,
      bankAssignedCount: bankAssignedCount,
    };
  } catch (e) {
    return null;
  }
};

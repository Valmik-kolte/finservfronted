import api from "./api";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const safeParse = (key, fallback = null) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
};

const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return [
    value.data,
    value.content,
    value.items,
    value.records,
    value.results,
    value.users,
    value.dealers,
    value.documents,
  ].find(Array.isArray) || [];
};

const sessionFor = (role) =>
  safeParse(role === "ADMIN" ? "adminData" : role === "DEALER" ? "dealerData" : "userData", {});

const DEALER_REGISTERED_USERS_KEY = "dealer_registered_users";
const PAYMENT_REQUESTS_KEY = "customer_payment_requests";

const readLocalDealerUsers = () => safeParse(DEALER_REGISTERED_USERS_KEY, []);
const readPaymentRequests = () => safeParse(PAYMENT_REQUESTS_KEY, []);
const readPaymentStatus = (userId) =>
  localStorage.getItem(`customer_payment_status_${userId || "guest"}`) ||
  readPaymentRequests().find((request) => String(request.userId) === String(userId))?.status ||
  "";

const formatPaymentStatus = (status, user = {}) => {
  if (user.bankId || user.assignedBankId || user.assignedBankName || user.bankName) return "Sent To Bank";
  if (status === "PAYMENT_APPROVED" || user.paymentDone) return "Admin Review Active";
  if (status === "PAYMENT_VERIFICATION_PENDING") return "Payment Verification Pending";
  if (status === "PAYMENT_REJECTED") return "Payment Rejected";
  return "Ready2Drive Payment Pending";
};

const mergeUsersById = (...lists) => {
  const map = new Map();
  lists.flat().filter(Boolean).forEach((user) => {
    const id = user.userId || user.id;
    if (!id) return;
    map.set(String(id), { ...(map.get(String(id)) || {}), ...user, userId: id });
  });
  return Array.from(map.values());
};

const getUserId = () => {
  const session = sessionFor("USER");
  return session.userId || session.id;
};

const getDealerSession = () => {
  const session = sessionFor("DEALER");
  return {
    ...session,
    dealerId: session.dealerId || session.id,
    dealerCode: session.dealerCode || localStorage.getItem("dealerCode") || "",
  };
};

const countByStatus = (documents = []) =>
  documents.reduce(
    (acc, doc) => {
      const status = doc?.status || "PENDING";
      acc.total += 1;
      acc[status.toLowerCase()] = (acc[status.toLowerCase()] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, verified: 0, approved: 0, rejected: 0 }
  );

const safeDocument = (doc = {}) => ({
  documentId: doc.documentId || doc.id,
  userId: doc.userId || doc.user?.userId || doc.customer?.userId,
  documentType: doc.documentType || doc.type,
  fileName: doc.fileName || doc.originalFileName || doc.name,
  status: doc.status || "PENDING",
  remarks: doc.remarks || doc.remark || "",
  uploadedAt: doc.uploadedAt || doc.createdAt || doc.updatedAt || "",
});

const normalizeChatbotResponse = ({ role, intent, message, data, suggestions = [] }) => ({
  success: true,
  role,
  intent,
  message,
  data,
  suggestions,
});

const shouldUseFallback = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || error?.response?.data || error?.message || "");
  return status === 404 || status === 500 || message.toLowerCase().includes("no static resource");
};

// Tries the dedicated chatbot backend first, then gracefully falls back to existing dashboard APIs.
const getWithFallback = async (endpoint, fallback) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    return fallback();
  }
};

const readPersonalInfoDraft = (userId) => safeParse(`personal_info_draft_${userId}`, {});

const getUserDocuments = async (userId) => {
  const response = await api.get(`/documents/user/${userId}`);
  return asList(unwrap(response)).map(safeDocument);
};

const getUserProfile = async (userId) => {
  try {
    const response = await api.get(`/user/${userId}`);
    return unwrap(response) || {};
  } catch {
    return sessionFor("USER");
  }
};

const fallbackUserApplicationSummary = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "APPLICATION_SUMMARY",
      message: "Your session is not available. Please login again.",
      data: {},
    });
  }

  const [user, documents] = await Promise.all([
    getUserProfile(userId),
    getUserDocuments(userId).catch(() => []),
  ]);
  const draft = readPersonalInfoDraft(userId);
  const counts = countByStatus(documents);
  const rejected = counts.rejected > 0;
  const pending = counts.pending > 0 || counts.total === 0;
  const applicationStatus = rejected
    ? "DOCUMENTS_REJECTED"
    : pending
      ? "DOCUMENTS_PENDING"
      : user.paymentDone
        ? "READY_FOR_BANK"
        : "PAYMENT_PENDING";

  return normalizeChatbotResponse({
    role: "USER",
    intent: "APPLICATION_SUMMARY",
    message: `Your application status is ${applicationStatus.replaceAll("_", " ").toLowerCase()}.`,
    data: {
      name: user.fullName || user.name || sessionFor("USER").name,
      applicationId: user.applicationId || draft.applicationId || "N/A",
      paymentDone: Boolean(user.paymentDone),
      applicationStatus,
      loanAmount: user.loanAmount || draft.loanAmount || "N/A",
      documents: counts,
    },
  });
};

const fallbackUserDocumentStatus = async () => {
  const userId = getUserId();
  const documents = userId ? await getUserDocuments(userId).catch(() => []) : [];
  return normalizeChatbotResponse({
    role: "USER",
    intent: "DOCUMENT_STATUS",
    message:
      documents.length === 0
        ? "No document records were found yet."
        : `I found ${documents.length} document record(s) for your application.`,
    data: documents,
  });
};

const fallbackUserPendingDocuments = async () => {
  const userId = getUserId();
  const documents = userId ? await getUserDocuments(userId).catch(() => []) : [];
  const pending = documents.filter((doc) => doc.status === "PENDING");
  return normalizeChatbotResponse({
    role: "USER",
    intent: "PENDING_DOCUMENTS",
    message:
      pending.length === 0
        ? "No pending documents found."
        : `${pending.length} document(s) are currently pending.`,
    data: pending,
  });
};

const fallbackUserLoanAmount = async () => {
  const userId = getUserId();
  const user = userId ? await getUserProfile(userId) : {};
  const draft = readPersonalInfoDraft(userId);
  const loanAmount = user.loanAmount || draft.loanAmount || "N/A";
  return normalizeChatbotResponse({
    role: "USER",
    intent: "LOAN_AMOUNT",
    message: loanAmount === "N/A" ? "Loan amount is not available yet." : "Here is your loan amount.",
    data: {
      applicationId: user.applicationId || draft.applicationId || "N/A",
      loanAmount,
    },
  });
};

const getDealerUsersFallbackList = async () => {
  const dealer = getDealerSession();
  const localUsers = readLocalDealerUsers().filter(
    (user) =>
      String(user.dealerCode || "").toLowerCase() === String(dealer.dealerCode || "").toLowerCase() ||
      String(user.dealerId || user.assignedDealerId || "") === String(dealer.dealerId || "")
  );
  let apiUsers = [];
  try {
    const response = await api.get("/dealer/me/users");
    apiUsers = asList(unwrap(response));
  } catch {
    try {
      const response = await api.get("/user/all");
      apiUsers = asList(unwrap(response)).filter(
        (user) =>
          String(user.dealerCode || "").toLowerCase() === String(dealer.dealerCode || "").toLowerCase() ||
          String(user.dealerId || user.assignedDealerId || "") === String(dealer.dealerId || "")
      );
    } catch {
      apiUsers = [];
    }
  }
  return mergeUsersById(apiUsers, localUsers);
};

const getDocumentsForUsers = async (users) => {
  const results = await Promise.allSettled(
    users.map((user) => api.get(`/documents/user/${user.userId || user.id}`))
  );
  return results.flatMap((result) =>
    result.status === "fulfilled" ? asList(unwrap(result.value)).map(safeDocument) : []
  );
};

const fallbackDealerMyId = async () => {
  const dealer = getDealerSession();
  let profile = dealer;
  try {
    profile = unwrap(await api.get("/dealer/me")) || dealer;
  } catch {
    try {
      const response = await api.get("/dealer/all");
      const dealers = asList(unwrap(response));
      profile =
        dealers.find(
          (item) =>
            String(item.dealerCode || "").toLowerCase() === String(dealer.dealerCode || "").toLowerCase() ||
            String(item.email || "").toLowerCase() === String(dealer.email || "").toLowerCase() ||
            String(item.dealerId || item.id || "") === String(dealer.dealerId || "")
        ) || dealer;
    } catch {
      profile = dealer;
    }
  }
  return normalizeChatbotResponse({
    role: "DEALER",
    intent: "MY_DEALER_ID",
    message: `Dealer details found for ${profile.fullName || profile.name || dealer.name || "your account"}.`,
    data: {
      dealerId: profile.dealerId || profile.id || dealer.dealerId || "N/A",
      dealerCode: profile.dealerCode || dealer.dealerCode || "N/A",
      dealerName: profile.fullName || profile.name || dealer.name || "N/A",
      email: profile.email || dealer.email || "N/A",
    },
  });
};

const fallbackDealerUsers = async () => {
  const users = await getDealerUsersFallbackList().catch(() => []);
  return normalizeChatbotResponse({
    role: "DEALER",
    intent: "MY_USERS",
    message: users.length === 0 ? "No users found for your dealer code." : `You have ${users.length} user(s).`,
    data: users.map((user, index) => ({
      number: index + 1,
      fullName: user.fullName || user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      status: formatPaymentStatus(readPaymentStatus(user.userId || user.id), user),
      applicationId: user.applicationId,
    })),
  });
};

const fallbackDealerPendingDocuments = async () => {
  const users = await getDealerUsersFallbackList().catch(() => []);
  const userNameById = new Map(
    users.map((user) => [
      String(user.userId || user.id),
      user.fullName || user.name || user.email || "Customer",
    ])
  );
  const documents = await getDocumentsForUsers(users);
  const pending = documents.filter((doc) => doc.status === "PENDING");
  return normalizeChatbotResponse({
    role: "DEALER",
    intent: "PENDING_DOCUMENTS",
    message:
      pending.length === 0
        ? "No pending documents found for your users."
        : `${pending.length} pending document(s) found for your users.`,
    data: pending.map((doc) => ({
      customerName: userNameById.get(String(doc.userId)) || "Customer",
      documentType: doc.documentType,
      fileName: doc.fileName,
      status: doc.status,
      remarks: doc.remarks || "N/A",
      uploadedAt: doc.uploadedAt,
    })),
  });
};

const fallbackDealerMonthlySummary = async () => {
  const users = await getDealerUsersFallbackList().catch(() => []);
  const documents = await getDocumentsForUsers(users);
  return normalizeChatbotResponse({
    role: "DEALER",
    intent: "MONTHLY_SUMMARY",
    message: "Here is the current dealer document summary.",
    data: {
      users: users.length,
      documents: countByStatus(documents),
    },
  });
};

const fallbackAdminUsers = async () => {
  const response = await api.get("/user/all");
  const users = asList(unwrap(response));
  return normalizeChatbotResponse({
    role: "ADMIN",
    intent: "ALL_USERS",
    message: users.length === 0 ? "No users found." : `There are ${users.length} user(s).`,
    data: users.map((user) => ({
      userId: user.userId || user.id,
      fullName: user.fullName || user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      dealerCode: user.dealerCode,
      applicationId: user.applicationId,
    })),
  });
};

const fallbackAdminDealerSummary = async () => {
  const [dealersRes, usersRes] = await Promise.allSettled([
    api.get("/dealer/all"),
    api.get("/user/all"),
  ]);
  const dealers = dealersRes.status === "fulfilled" ? asList(unwrap(dealersRes.value)) : [];
  const users = usersRes.status === "fulfilled" ? asList(unwrap(usersRes.value)) : [];
  const summary = dealers.map((dealer) => {
    const dealerCode = dealer.dealerCode || "";
    const dealerUsers = users.filter(
      (user) => String(user.dealerCode || "").toLowerCase() === String(dealerCode).toLowerCase()
    );
    return {
      dealerId: dealer.dealerId || dealer.id,
      dealerCode,
      dealerName: dealer.fullName || dealer.name,
      email: dealer.email,
      users: dealerUsers.length,
    };
  });
  return normalizeChatbotResponse({
    role: "ADMIN",
    intent: "DEALER_SUMMARY",
    message: summary.length === 0 ? "No dealer summary found." : `Summary ready for ${summary.length} dealer(s).`,
    data: summary,
  });
};

const fallbackAdminDocumentSummary = async () => {
  const [pendingRes, verifiedRes, usersRes] = await Promise.allSettled([
    api.get("/documents/pending"),
    api.get("/documents/verified"),
    api.get("/user/all"),
  ]);
  const pending = pendingRes.status === "fulfilled" ? asList(unwrap(pendingRes.value)).map(safeDocument) : [];
  const verified = verifiedRes.status === "fulfilled" ? asList(unwrap(verifiedRes.value)).map(safeDocument) : [];
  let userDocuments = [];
  if (usersRes.status === "fulfilled") {
    userDocuments = await getDocumentsForUsers(asList(unwrap(usersRes.value)));
  }
  const map = new Map();
  [...pending, ...verified, ...userDocuments].forEach((doc) => {
    const key = doc.documentId || `${doc.userId}-${doc.documentType}-${doc.fileName}`;
    map.set(key, { ...(map.get(key) || {}), ...doc });
  });
  const documents = Array.from(map.values());
  return normalizeChatbotResponse({
    role: "ADMIN",
    intent: "DOCUMENT_SUMMARY",
    message: "Here is the current document summary.",
    data: countByStatus(documents),
  });
};

const fallbackAdminPendingDocuments = async () => {
  const response = await api.get("/documents/pending");
  const pending = asList(unwrap(response)).map(safeDocument);
  return normalizeChatbotResponse({
    role: "ADMIN",
    intent: "PENDING_DOCUMENTS",
    message:
      pending.length === 0
        ? "No pending documents found."
        : `${pending.length} pending document(s) need review.`,
    data: pending,
  });
};

export const getUserApplicationSummary = () =>
  getWithFallback("/chatbot/user/application-summary", fallbackUserApplicationSummary);

export const getUserDocumentStatus = () =>
  getWithFallback("/chatbot/user/document-status", fallbackUserDocumentStatus);

export const getUserPendingDocuments = () =>
  getWithFallback("/chatbot/user/pending-documents", fallbackUserPendingDocuments);

export const getUserLoanAmount = () =>
  getWithFallback("/chatbot/user/loan-amount", fallbackUserLoanAmount);

export const getDealerMyId = () =>
  fallbackDealerMyId();

export const getDealerUsers = () =>
  fallbackDealerUsers();

export const getDealerPendingDocuments = () =>
  fallbackDealerPendingDocuments();

export const getDealerMonthlySummary = () =>
  fallbackDealerMonthlySummary();

export const getAdminUsers = () =>
  getWithFallback("/chatbot/admin/users", fallbackAdminUsers);

export const getAdminDealerSummary = () =>
  getWithFallback("/chatbot/admin/dealer-wise-summary", fallbackAdminDealerSummary);

export const getAdminDocumentSummary = () =>
  getWithFallback("/chatbot/admin/document-summary?month=last", fallbackAdminDocumentSummary);

export const getAdminPendingDocuments = () =>
  getWithFallback("/chatbot/admin/pending-documents", fallbackAdminPendingDocuments);

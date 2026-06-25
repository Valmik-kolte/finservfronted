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
    map.set(String(id), merged);
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
  return [403, 404, 500].includes(status) || message.toLowerCase().includes("no static resource");
};

// Tries the dedicated chatbot backend first, then gracefully falls back to existing dashboard APIs.
const getWithFallback = async (endpoint, fallback) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    if (!shouldUseFallback(error)) throw error;
    try {
      return await fallback();
    } catch (fallbackError) {
      return normalizeChatbotResponse({
        role: "SYSTEM",
        intent: "FALLBACK_ERROR",
        message:
          fallbackError?.response?.data?.message ||
          fallbackError?.response?.data ||
          "I could not fetch live data right now, but the assistant is connected. Please try again.",
        data: [],
      });
    }
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
  const { bankAssigned } = await resolveUserAssignedBank(userId, user);
  const counts = countByStatus(documents);
  const rejected = counts.rejected > 0;
  const pending = counts.pending > 0 || counts.total === 0;
  const applicationStatus = rejected
    ? "DOCUMENTS_REJECTED"
    : pending
      ? "DOCUMENTS_PENDING"
      : bankAssigned
        ? "BANK_ASSIGNED"
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
  const resolvedDealerId = dealer.dealerId;
  const resolvedCode = dealer.dealerCode;

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
      console.warn("Failed to fetch dealer users from database for chatbot:", err);
    }
  }

  const list = readLocalDealerUsers().filter(
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
  let users = [];
  try {
    const response = await api.get("/user/all");
    users = asList(unwrap(response));
  } catch {
    users = readLocalDealerUsers();
  }
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
  let pending = [];
  try {
    const response = await api.get("/documents/pending");
    pending = asList(unwrap(response)).map(safeDocument);
  } catch {
    pending = [];
  }
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

const fetchPaymentStatus = async (userId, userProfile = {}, historyData = {}) => {
  let statusVal = null;
  
  // 1. Check user profile directly
  if (userProfile?.paymentDone) {
    statusVal = "PAYMENT_APPROVED";
  }

  // 2. Check history data
  if (!statusVal && historyData) {
    if (historyData.paymentStatus === "APPROVED" || historyData.paymentStatus === "PAYMENT_APPROVED") {
      statusVal = "PAYMENT_APPROVED";
    } else if (historyData.paymentStatus === "VERIFICATION_PENDING" || historyData.paymentStatus === "PAYMENT_VERIFICATION_PENDING") {
      statusVal = "PAYMENT_VERIFICATION_PENDING";
    } else if (historyData.paymentStatus) {
      statusVal = historyData.paymentStatus;
    }
  }

  // 3. Check notifications from backend
  if (!statusVal || statusVal === "PENDING" || statusVal === "DRAFT" || statusVal === "PAYMENT_PENDING") {
    try {
      const res = await api.get(`/notifications/${userId}`).catch(() => null);
      if (res) {
        const notifList = unwrap(res) || [];
        const rawNotifs = Array.isArray(notifList) ? notifList : 
          [
            notifList.notifications,
            notifList.content,
            notifList.items,
            notifList.records,
            notifList.result,
            notifList.results,
            notifList.data,
          ].find(Array.isArray) || [];
        
        const statusNotifications = rawNotifs
          .filter(
            (notif) =>
              String(notif.receiverId) === String(userId) &&
              notif.message &&
              notif.message.startsWith("PAYMENT_STATUS:")
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (statusNotifications.length > 0) {
          const extractedStatus = statusNotifications[0].message.replace("PAYMENT_STATUS:", "");
          if (extractedStatus) {
            statusVal = extractedStatus;
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse payment status from chatbot service notifications check:", err);
    }
  }

  // 4. Fallback to localStorage or local payment status
  if (!statusVal || statusVal === "PENDING" || statusVal === "DRAFT" || statusVal === "PAYMENT_PENDING") {
    const localStatus = readPaymentStatus(userId);
    if (localStatus) {
      statusVal = localStatus;
    }
  }

  // Normalize return value
  const isApproved = statusVal === "APPROVED" || statusVal === "PAYMENT_APPROVED";
  const isPendingVerification = statusVal === "VERIFICATION_PENDING" || statusVal === "PAYMENT_VERIFICATION_PENDING";
  
  return {
    paymentCompleted: isApproved,
    paymentVerificationPending: isPendingVerification,
    paymentMade: isApproved || isPendingVerification,
    statusString: statusVal || "PAYMENT_PENDING"
  };
};

const resolveUserAssignedBank = async (userId, userProfile) => {
  // 1. Check user profile fields directly
  let bankId = userProfile?.assignedBankId || userProfile?.bankId || null;
  let bankName = userProfile?.assignedBankName || userProfile?.bankName || null;

  // 2. Check notifications from database
  if (!bankId || !bankName || bankName === "N/A") {
    try {
      const res = await api.get(`/notifications/${userId}`).catch(() => null);
      if (res) {
        const notifList = unwrap(res) || [];
        const rawNotifs = Array.isArray(notifList) ? notifList : 
          [
            notifList.notifications,
            notifList.content,
            notifList.items,
            notifList.records,
            notifList.result,
            notifList.results,
            notifList.data,
          ].find(Array.isArray) || [];

        const bankNotifications = rawNotifs
          .filter(
            (notif) =>
              String(notif.receiverId) === String(userId) &&
              notif.message &&
              notif.message.startsWith("BANK_ASSIGNED:")
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (bankNotifications.length > 0) {
          const parts = bankNotifications[0].message.split(":");
          const nBankId = parts[1];
          const nBankName = parts.slice(2).join(":");
          if (nBankId) bankId = nBankId;
          if (nBankName && nBankName !== "N/A") bankName = nBankName;
        }
      }
    } catch (err) {
      console.error("Failed to parse bank assignment from notifications in chatbot service:", err);
    }
  }

  // 3. Check local storage
  if (!bankId || !bankName || bankName === "N/A") {
    try {
      const localDetail = localStorage.getItem(`user_bank_assignment_detail_${userId}`);
      if (localDetail) {
        const parts = localDetail.split(":");
        const lBankId = parts[1];
        const lBankName = parts.slice(2).join(":");
        if (lBankId) bankId = lBankId;
        if (lBankName && lBankName !== "N/A") bankName = lBankName;
      }
    } catch {}
  }

  // 4. Fetch bank list from backend if bankId exists but bankName is missing
  if (bankId && (!bankName || bankName === "N/A")) {
    try {
      const banksRes = await api.get("/admin/banks").catch(() => null);
      if (banksRes) {
        const bankList = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.data || [];
        const bank = bankList.find((b) => String(b.bankId) === String(bankId));
        if (bank) {
          bankName = bank.bankName || bank.name;
        }
      }
    } catch {}
  }

  return {
    bankAssigned: !!(bankId || (bankName && bankName !== "N/A")),
    bankId: bankId || null,
    bankName: bankName || "N/A"
  };
};

const fallbackUserTimeline = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_TIMELINE",
      message: "Your session is not available. Please login again.",
      data: [],
    });
  }

  const [user, documents, historyRes, personalRes] = await Promise.all([
    getUserProfile(userId),
    getUserDocuments(userId).catch(() => []),
    api.get(`/user/history/${userId}`).catch(() => null),
    api.put(`/personal-info/update/${userId}`, {}).catch(() => null)
  ]);
  const draft = readPersonalInfoDraft(userId);
  const personalInfoDb = personalRes?.data?.data || personalRes?.data || null;

  // Check personal info completeness
  const personalInfoSubmitted = !!(draft.address || user.address || personalInfoDb?.address);

  const docsByType = new Set(documents.map((doc) => doc.documentType));
  const missingKYC = !docsByType.has("PAN") || !docsByType.has("AADHAAR");
  const hasResidential = docsByType.has("LIGHT_BILL") || docsByType.has("RENTAL_AGREEMENT");
  let employmentType = user.employmentType || draft.employmentType;
  if (!employmentType) {
    const hasSalariedDocs = docsByType.has("SALARY_SLIP") || docsByType.has("APPOINTMENT_LETTER");
    const hasSelfEmployedDocs = docsByType.has("ITR_RETURN");
    if (hasSelfEmployedDocs && !hasSalariedDocs) {
      employmentType = "Self Employed";
    } else {
      employmentType = "Salaried";
    }
  }
  const requiredIncome = employmentType === "Salaried"
    ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
    : ["ITR_RETURN", "BANK_STATEMENT"];
  const missingIncome = requiredIncome.some(type => !docsByType.has(type));
  const requiredVehicle = ["RC", "INSURANCE", "CAR_FRONT_SIDE_PHOTO", "CAR_BACK_SIDE_PHOTO", "CHASSIS_NUMBER", "ODOMETER_READING"];
  const missingVehicle = requiredVehicle.some(type => !docsByType.has(type));

  const allDocsUploaded = !missingKYC && hasResidential && !missingIncome && !missingVehicle;

  const docsUploaded = documents.length > 0;
  const hasRejectedDocs = documents.some((doc) => doc.status === "REJECTED");
  const hasPendingDocs = documents.some((doc) => doc.status === "PENDING");

  const { bankAssigned, bankName: resolvedBankName } = await resolveUserAssignedBank(userId, user);
  
  const historyData = historyRes ? (unwrap(historyRes) || {}) : {};
  const { paymentCompleted, paymentVerificationPending, paymentMade } = await fetchPaymentStatus(userId, user, historyData);

  const steps = [
    {
      name: "Registration Completed",
      status: "completed",
    },
    {
      name: "Personal Information Submitted",
      status: personalInfoSubmitted ? "completed" : "pending",
    },
    {
      name: "Documents Uploaded",
      status: allDocsUploaded ? "completed" : "pending",
    },
    {
      name: "Payment Pending",
      status: paymentMade ? "completed" : (allDocsUploaded ? "current" : "pending"),
    },
    {
      name: "Payment Done",
      status: paymentCompleted ? "completed" : (paymentVerificationPending ? "current" : "pending"),
    },
    {
      name: "Document Under Review by Admin",
      status: !paymentCompleted
        ? "pending"
        : hasRejectedDocs
        ? "failed"
        : hasPendingDocs
        ? "current"
        : "completed",
    },
    {
      name: bankAssigned ? `Bank Assigned (${resolvedBankName})` : "Bank Assigned",
      status: bankAssigned ? "completed" : "pending",
    },
    {
      name: "Application Completed",
      status:
        personalInfoSubmitted &&
        allDocsUploaded &&
        paymentCompleted &&
        !hasRejectedDocs &&
        !hasPendingDocs &&
        bankAssigned
          ? "completed"
          : "pending",
    },
  ];

  // Set 'current' status for the active step
  let activeIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].status === "pending" || steps[i].status === "failed" || steps[i].status === "current") {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex !== -1) {
    if (steps[activeIndex].status === "pending") {
      steps[activeIndex].status = "current";
    }
  }

  return normalizeChatbotResponse({
    role: "USER",
    intent: "USER_TIMELINE",
    message: "Here is your application timeline.",
    data: steps,
  });
};

const fallbackUserPaymentStatus = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_PAYMENT_STATUS",
      message: "Your session is not available. Please login again.",
      data: {},
    });
  }

  const [user, historyRes] = await Promise.all([
    getUserProfile(userId),
    api.get(`/user/history/${userId}`).catch(() => null)
  ]);

  const historyData = historyRes ? (unwrap(historyRes) || {}) : {};
  const { paymentCompleted, paymentVerificationPending, paymentMade, statusString } = await fetchPaymentStatus(userId, user, historyData);

  let statusLabel = "Ready2Drive Payment Pending";
  if (paymentCompleted) {
    statusLabel = "Payment Completed";
  } else if (paymentVerificationPending) {
    statusLabel = "Payment Verification Pending";
  } else if (statusString === "REJECTED" || statusString === "PAYMENT_REJECTED") {
    statusLabel = "Payment Rejected";
  }

  const rawDate = historyData.paymentDate || historyData.createdAt || user.paymentDate;
  let paymentDateFormatted = "N/A";
  if (rawDate) {
    const dateObj = new Date(rawDate);
    if (!Number.isNaN(dateObj.getTime())) {
      paymentDateFormatted = dateObj.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  return normalizeChatbotResponse({
    role: "USER",
    intent: "USER_PAYMENT_STATUS",
    message: paymentCompleted 
      ? `Your payment was successfully completed on ${paymentDateFormatted}.` 
      : paymentVerificationPending
      ? "Your payment is under verification by the admin."
      : "Your Ready2Drive payment is pending.",
    data: {
      status: statusLabel,
      amount: "₹116.82",
      feeName: "Ready2Drive Processing Fee",
      paymentCompleted: paymentCompleted ? "Yes" : "No",
      paymentCompletedDate: paymentCompleted ? paymentDateFormatted : "N/A",
      showPaymentButton: !paymentMade
    }
  });
};

const fallbackUserAssignedBank = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_ASSIGNED_BANK",
      message: "Your session is not available. Please login again.",
      data: {},
    });
  }

  const user = await getUserProfile(userId);
  const { bankAssigned, bankName } = await resolveUserAssignedBank(userId, user);

  if (!bankAssigned) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_ASSIGNED_BANK",
      message: "No bank has been assigned to your application yet.",
      data: {
        assignmentStatus: "Pending Bank Assignment",
      }
    });
  }

  return normalizeChatbotResponse({
    role: "USER",
    intent: "USER_ASSIGNED_BANK",
    message: `Your application has been assigned to ${bankName}.`,
    data: {
      bankName: bankName,
      branchName: "Corporate Office",
      branchManagerName: "Mr. Sanjay Sharma",
      branchManagerMobile: "+91 98111-22233",
      branchManagerEmail: `contact@${bankName.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      assignmentStatus: "Bank Assigned"
    }
  });
};

const fallbackUserNextAction = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Your session is not available. Please login again.",
      data: {},
    });
  }

  const [user, documents, historyRes, personalRes] = await Promise.all([
    getUserProfile(userId),
    getUserDocuments(userId).catch(() => []),
    api.get(`/user/history/${userId}`).catch(() => null),
    api.put(`/personal-info/update/${userId}`, {}).catch(() => null)
  ]);
  
  const historyData = historyRes ? (unwrap(historyRes) || {}) : {};
  const { paymentCompleted, paymentVerificationPending, paymentMade } = await fetchPaymentStatus(userId, user, historyData);
  const { bankAssigned, bankName: resolvedBankName } = await resolveUserAssignedBank(userId, user);

  if (bankAssigned) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Your loan application is fully completed and processed. No further action is required.",
      data: {
        nextAction: "Application Completed",
        description: `Everything is verified and your application has been forwarded to ${resolvedBankName}.`,
      }
    });
  }

  const draft = readPersonalInfoDraft(userId);
  const personalInfoDb = personalRes?.data?.data || personalRes?.data || null;

  // Check personal info completeness
  const personalInfoSubmitted = !!(draft.address || user.address || personalInfoDb?.address);
  if (!personalInfoSubmitted) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Please complete your Personal Information first.",
      data: {
        nextAction: "Complete Personal Information",
        description: "Your address, pin code, or contact details are incomplete in your application.",
      }
    });
  }

  // Check documents status
  const counts = countByStatus(documents);
  const rejectedDocs = documents.filter((doc) => doc.status === "REJECTED");
  const pendingDocsCount = counts.pending;

  if (rejectedDocs.length > 0) {
    const listStr = rejectedDocs.map((doc) => `${doc.documentType} (Reason: ${doc.remarks || "No remark"})`).join(", ");
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: `Some of your uploaded documents were rejected. Please reupload: ${listStr}`,
      data: {
        nextAction: "Reupload Rejected Documents",
        details: listStr,
        description: "One or more documents were rejected by the admin. Check the remarks and reupload them.",
      }
    });
  }

  const docsByType = new Set(documents.map((doc) => doc.documentType));
  
  // 1. Check KYC Documents
  const missingKYC = [];
  if (!docsByType.has("PAN")) missingKYC.push("PAN");
  if (!docsByType.has("AADHAAR")) missingKYC.push("AADHAAR");
  if (missingKYC.length > 0) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: `Please upload missing KYC documents: ${missingKYC.join(", ")}`,
      data: {
        nextAction: "Upload KYC Documents",
        details: missingKYC.join(", "),
        description: "KYC documents (PAN, Aadhaar) are required to proceed with verification.",
      }
    });
  }

  // 2. Check Residential Proof
  const hasResidential = docsByType.has("LIGHT_BILL") || docsByType.has("RENTAL_AGREEMENT");
  if (!hasResidential) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Please upload Residential Proof (either Light Bill or Rental Agreement).",
      data: {
        nextAction: "Upload Residential Proof",
        details: "Light Bill or Rental Agreement",
        description: "A valid residential proof is required to verify your address.",
      }
    });
  }

  // 3. Check Income Proof
  let employmentType = user.employmentType || draft.employmentType;
  if (!employmentType) {
    const hasSalariedDocs = docsByType.has("SALARY_SLIP") || docsByType.has("APPOINTMENT_LETTER");
    const hasSelfEmployedDocs = docsByType.has("ITR_RETURN");
    if (hasSelfEmployedDocs && !hasSalariedDocs) {
      employmentType = "Self Employed";
    } else {
      employmentType = "Salaried";
    }
  }
  const requiredIncome = employmentType === "Salaried"
    ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
    : ["ITR_RETURN", "BANK_STATEMENT"];
  const missingIncome = requiredIncome.filter(type => !docsByType.has(type));
  if (missingIncome.length > 0) {
    const listStr = missingIncome.map(t => t.replaceAll("_", " ")).join(", ");
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: `Please upload missing Income Documents: ${listStr}`,
      data: {
        nextAction: "Upload Income Documents",
        details: missingIncome.join(", "),
        description: `Income proofs are required. Please upload: ${listStr}.`,
      }
    });
  }

  // 4. Check Vehicle Documents
  const requiredVehicle = [
    "RC",
    "INSURANCE",
    "CAR_FRONT_SIDE_PHOTO",
    "CAR_BACK_SIDE_PHOTO",
    "CHASSIS_NUMBER",
    "ODOMETER_READING"
  ];
  const missingVehicle = requiredVehicle.filter(type => !docsByType.has(type));
  if (missingVehicle.length > 0) {
    const listStr = missingVehicle.map(t => t.replaceAll("_", " ")).join(", ");
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: `Please upload missing Vehicle Documents: ${listStr}`,
      data: {
        nextAction: "Upload Vehicle Documents",
        details: missingVehicle.join(", "),
        description: `Vehicle validation files are required. Please upload: ${listStr}.`,
      }
    });
  }

  // Check payment
  if (!paymentCompleted) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Please complete your Ready2Drive processing fee payment to activate your application.",
      data: {
        nextAction: "Payment Pending",
        description: "Pay the processing fee of ₹116.82 via the payment section on your dashboard.",
        showPaymentButton: true,
      }
    });
  }

  if (pendingDocsCount > 0) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_NEXT_ACTION",
      message: "Your uploaded documents are currently under review. No action needed from you at the moment.",
      data: {
        nextAction: "Wait for Document Review",
        description: "The admin is currently auditing your uploaded documents.",
      }
    });
  }

  return normalizeChatbotResponse({
    role: "USER",
    intent: "USER_NEXT_ACTION",
    message: "Your loan application is fully completed and processed. No further action is required.",
    data: {
      nextAction: "Application Completed",
      description: "Everything is verified and bank has been assigned.",
    }
  });
};

const fallbackUserActionNeeded = async () => {
  const userId = getUserId();
  if (!userId) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_ACTION_NEEDED",
      message: "Your session is not available. Please login again.",
      data: {},
    });
  }

  const documents = await getUserDocuments(userId).catch(() => []);
  const rejectedDocs = documents.filter((doc) => doc.status === "REJECTED");

  if (rejectedDocs.length === 0) {
    return normalizeChatbotResponse({
      role: "USER",
      intent: "USER_ACTION_NEEDED",
      message: "No documents are rejected yet, it seems.",
      data: {
        hasRejected: false,
        message: "No documents are rejected yet, it seems."
      }
    });
  }

  const formattedRejected = rejectedDocs.map((doc) => ({
    documentId: doc.documentId || doc.id,
    documentType: doc.documentType,
    fileName: doc.fileName,
    remarks: doc.remarks || "No reason specified by admin",
  }));

  return normalizeChatbotResponse({
    role: "USER",
    intent: "USER_ACTION_NEEDED",
    message: `You have ${rejectedDocs.length} rejected document(s) that need correction.`,
    data: {
      hasRejected: true,
      rejectedDocuments: formattedRejected
    }
  });
};
export const getUserApplicationSummary = () => getWithFallback("/chatbot/user/summary", fallbackUserApplicationSummary);
export const getUserTimeline = () => getWithFallback("/chatbot/user/timeline", fallbackUserTimeline);
export const getUserDocumentStatus = () => getWithFallback("/chatbot/user/documents", fallbackUserDocumentStatus);
export const getUserPendingDocuments = () => getWithFallback("/chatbot/user/pending-documents", fallbackUserPendingDocuments);
export const getUserLoanAmount = () => getWithFallback("/chatbot/user/loan", fallbackUserLoanAmount);
export const getUserPaymentStatus = () => getWithFallback("/chatbot/user/payment", fallbackUserPaymentStatus);
export const getUserAssignedBank = () => getWithFallback("/chatbot/user/bank", fallbackUserAssignedBank);
export const getUserNextAction = () => getWithFallback("/chatbot/user/next-action", fallbackUserNextAction);
export const getUserActionNeeded = () => getWithFallback("/chatbot/user/action-needed", fallbackUserActionNeeded);

export const getDealerMyId = () => getWithFallback("/chatbot/dealer/me", fallbackDealerMyId);
export const getDealerUsers = () => getWithFallback("/chatbot/dealer/users", fallbackDealerUsers);
export const getDealerPendingDocuments = () => getWithFallback("/chatbot/dealer/pending-documents", fallbackDealerPendingDocuments);
export const getDealerMonthlySummary = () => getWithFallback("/chatbot/dealer/monthly-summary", fallbackDealerMonthlySummary);

export const getAdminUsers = () => getWithFallback("/chatbot/admin/users", fallbackAdminUsers);
export const getAdminDealerSummary = () => getWithFallback("/chatbot/admin/dealers", fallbackAdminDealerSummary);
export const getAdminDocumentSummary = () => getWithFallback("/chatbot/admin/documents", fallbackAdminDocumentSummary);
export const getAdminPendingDocuments = () => getWithFallback("/chatbot/admin/pending-documents", fallbackAdminPendingDocuments);

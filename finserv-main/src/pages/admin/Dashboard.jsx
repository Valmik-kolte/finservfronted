import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaBars,
  FaCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaRupeeSign,
  FaUniversity,
  FaUsers,
  FaUserTie,
  FaTrash,
} from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import api from "../../services/api";
import Users from "./Users";
import Dealers from "./Dealers";
import Documents from "./Documents";
import Bank from "./Bank";
import Reports from "./Reports";
import Settings from "./Settings";
import Footer from "../landing/Footer";
import {
  approvePayment as approvePaymentRequest,
  getPaymentVerificationRequests,
  rejectPayment as rejectPaymentRequest,
} from "../../services/paymentService";
import { clearAuthSession, getAuthToken } from "../../utils/authSession";
import {
  READY2DRIVE_BASE_AMOUNT,
  READY2DRIVE_FEE_LABEL,
  READY2DRIVE_GST_AMOUNT,
  READY2DRIVE_GST_LABEL,
  READY2DRIVE_TOTAL_AMOUNT,
  formatINR,
} from "../../constants/payment";
import {
  DataTable,
  formatDate,
  formatDateTime,
  getAdminSession,
  ListOverlay,
  PreviewModal,
  StatCard,
  unwrap,
} from "./adminShared";
import Chatbot from "../../components/chatbot/Chatbot";

const emptyBank = {
  bankName: "",
  representativeName: "",
  contactNumber: "",
  email: "",
};

const asList = (response) => {
  if (Array.isArray(response)) return response;

  const data = response?.data !== undefined ? unwrap(response) : response;
  if (Array.isArray(data)) return data;

  const nestedList = [
    data?.data,
    data?.content,
    data?.users,
    data?.dealers,
    data?.documents,
    data?.personalInfos,
    data?.banks,
    data?.notifications,
    data?.items,
    data?.records,
    data?.result,
    data?.results,
  ].find(Array.isArray);

  if (nestedList) return nestedList;
  if (data && typeof data === "object") {
    const objectValues = Object.values(data);
    if (objectValues.every((item) => item && typeof item === "object")) return objectValues;
  }

  return [];
};

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";

const getDocumentOwnerId = (doc) =>
  firstPresent(
    doc?.userId,
    doc?.user?.userId,
    doc?.customer?.userId,
    doc?.customerId,
    doc?.user?.id,
    doc?.customer?.id,
    doc?.uploadedByUserId,
    doc?.uploadedBy
  );

const mergeDocumentRecords = (current, next) => {
  const currentOwnerId = getDocumentOwnerId(current);
  const nextOwnerId = getDocumentOwnerId(next);
  return {
    ...(current || {}),
    ...(next || {}),
    user: next?.user || current?.user,
    customer: next?.customer || current?.customer,
    userId: nextOwnerId || currentOwnerId,
  };
};

const getDocumentKey = (doc) => {
  if (!doc) return "";
  if (doc.documentId) return `id:${doc.documentId}`;
  const ownerId = getDocumentOwnerId(doc);
  const type = doc.documentType || doc.type || "";
  const fileName = doc.fileName || doc.originalFileName || doc.name || "";
  const createdAt = doc.createdAt || doc.uploadedAt || "";
  return `fallback:${ownerId}:${type}:${fileName}:${createdAt}`;
};

const uniqueDocuments = (documents) => {
  const map = new Map();
  documents.filter(Boolean).forEach((doc) => {
    const key = getDocumentKey(doc);
    if (!key) return;
    const normalized = mergeDocumentRecords(null, doc);
    map.set(key, mergeDocumentRecords(map.get(key), normalized));
  });
  return Array.from(map.values());
};

const isForbiddenResult = (result) =>
  result?.status === "rejected" && result.reason?.response?.status === 403;

const getFailureStatus = (result) =>
  result?.status === "rejected" ? result.reason?.response?.status || "network" : null;

const getApiFailureSummary = (entries) =>
  entries
    .filter((entry) => entry.status)
    .map((entry) => `${entry.label} (${entry.status})`);

const readAssignedBankId = (userId) => "";
const getAssignedBankDetailKey = (userId) => `user_bank_assignment_detail_${userId}`;
const isUserAssignedToBank = (user) =>
  !!(
    user?.bankId ||
    user?.assignedBankId ||
    user?.assignedBankName ||
    user?.bankName ||
    user?.bankStatus === "BANK_ASSIGNED" ||
    user?.bankStatus === "SENT_TO_BANK"
  );

const DEALER_NOTIFICATIONS_KEY = "dealer_assignment_notifications";
const ADMIN_NOTIFICATIONS_KEY = "admin_activity_notifications";
const CUSTOMER_NOTIFICATIONS_KEY = "customer_activity_notifications";

const PAYMENT_STATUS = {
  DRAFT: "DRAFT",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_VERIFICATION_PENDING: "PAYMENT_VERIFICATION_PENDING",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
};

const approveDocuments = async (documents) => {
  const docsToApprove = documents.filter((doc) => doc.documentId);
  if (docsToApprove.length === 0) return { approved: 0, failed: 0 };

  const results = await Promise.allSettled(
    docsToApprove.map(async (doc) => {
      try {
        await api.put(`/documents/status/${doc.documentId}?status=VERIFIED`);
      } catch (err) {
        console.error(`Failed to verify document ${doc.documentId} before approval:`, err);
      }
      return api.put(`/documents/status/${doc.documentId}?status=APPROVED`);
    })
  );

  return {
    approved: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
};

const fetchDocumentsForUsersInBatches = async (userList) => {
  const batchSize = 5;
  const mergedDocs = [];

  for (let i = 0; i < userList.length; i += batchSize) {
    const batch = userList.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((user) => api.get(`/documents/user/${user.userId}`))
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        mergedDocs.push(...asList(result.value));
      }
    });
  }

  return uniqueDocuments(mergedDocs);
};

const assignBankToUser = async (userId, bankId) => {
  try {
    return await api.put(`/user/assign-bank/${userId}`, { bankId: Number(bankId) });
  } catch (error) {
    if (![400, 404, 405, 415].includes(error?.response?.status)) throw error;
  }

  return api.put(`/user/assign-bank/${userId}?bankId=${encodeURIComponent(bankId)}`);
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data ||
  error?.message ||
  fallback;

const formatDocumentType = (type) =>
  String(type || "Document")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeAdminProfile = (profile = {}) => ({
  ...profile,
  id: firstPresent(profile.id, profile.adminId),
  adminId: firstPresent(profile.adminId, profile.id),
  name: firstPresent(profile.fullName, profile.name, profile.adminName, profile.username),
  fullName: firstPresent(profile.fullName, profile.name, profile.adminName, profile.username),
  email: firstPresent(profile.email, profile.username, profile.sub),
  mobileNumber: firstPresent(
    profile.mobileNumber,
    profile.mobile,
    profile.phoneNumber,
    profile.phone,
    profile.contactNumber,
    String(profile.email || "").toLowerCase().trim() === "admin@gmail.com" ? "9823357421" : "",
    profile.role === "ADMIN" ? "9823357421" : ""
  ),
  role: firstPresent(profile.role, "ADMIN"),
});

const getProfileData = (response) => {
  const data = unwrap(response);
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return data.profile || data.admin || data.user || data.data || data;
};

const readLocalDealerNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_NOTIFICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const addLocalDealerNotification = async ({ dealerId, dealerCode, message }) => {
  if (!dealerId && !dealerCode) return;
  try {
    const adminSession = getAdminSession();
    const adminId = adminSession?.id || 1;
    await api.post("/notifications/send", {
      receiverId: dealerId ? Number(dealerId) : null,
      message,
      senderId: Number(adminId),
      receiverRole: "DEALER",
      role: "DEALER"
    });
  } catch (err) {
    console.error("Failed to send dealer database notification:", err);
  }
};

const addLocalCustomerNotification = async ({ userId, message }) => {
  if (!userId || !message) return;
  try {
    const adminSession = getAdminSession();
    const adminId = adminSession?.id || 1;
    await api.post("/notifications/send", {
      receiverId: Number(userId),
      message,
      senderId: Number(adminId),
      receiverRole: "USER",
      role: "USER"
    });
  } catch (err) {
    console.error("Failed to send customer database notification:", err);
  }
};

const removeUserFromLocalCaches = (userId) => {
  localStorage.removeItem(`user_bank_assignment_${userId}`);
  localStorage.removeItem(getAssignedBankDetailKey(userId));
};

const isDealerAddedUser = (user) => {
  if (!user) return false;
  return (
    user.registrationType === "DEALER" ||
    (user.dealerCode !== undefined && user.dealerCode !== null && String(user.dealerCode).trim() !== "")
  );
};

const adjustDocumentStatusesForBankAssignedUsers = (docs, usersList) => {
  const userMap = new Map(usersList.map((u) => [String(u.userId || u.id), u]));
  return docs.map((doc) => {
    const ownerId = getDocumentOwnerId(doc);
    const user = userMap.get(String(ownerId));
    if (user && isUserAssignedToBank(user)) {
      return {
        ...doc,
        status: "APPROVED",
        remarks: "",
      };
    }
    return doc;
  });
};

const mergeUsersById = (...lists) => {
  const map = new Map();
  lists.flat().filter(Boolean).forEach((user) => {
    const id = user.userId || user.id;
    if (!id) return;
    const existing = map.get(String(id)) || {};
    const merged = { ...existing, ...user, userId: id };
    if (user.name && !merged.fullName) {
      merged.fullName = user.name;
    }
    if (!merged.registrationType) {
      merged.registrationType = merged.dealerCode ? "DEALER" : "INDIVIDUAL";
    }
    map.set(String(id), merged);
  });
  return Array.from(map.values());
};

const readLocalAdminNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_NOTIFICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const isBackendGeneratedNotification = (msg) => {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.startsWith("admin approved") ||
    lower.startsWith("admin verified") ||
    lower.startsWith("admin rejected") ||
    lower.startsWith("admin added remark") ||
    lower.startsWith("admin added a remark")
  );
};

const mergeNotifications = (adminId, ...lists) => {
  const flat = lists.flat().filter(Boolean);
  const seen = new Set();
  const deduped = [];
  flat.forEach((item) => {
    const id = String(item.id || item.message);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(item);
    }
  });

  const filtered = deduped.filter((item) => {
    const role = item.receiverRole || item.role;
    if (role && role !== "ADMIN") {
      return false;
    }
    if (isBackendGeneratedNotification(item.message)) {
      return false;
    }
    if (
      item.senderRole === "ADMIN" ||
      (item.senderRole !== "USER" && item.senderRole !== "DEALER" && (Number(item.senderId) === Number(adminId) || item.senderId === 1))
    ) {
      return false;
    }
    const msg = String(item.message || "").toLowerCase();
    if (
      msg.startsWith("admin ") ||
      msg.includes("approved by admin") ||
      msg.includes("rejected by admin") ||
      msg.startsWith("your ") ||
      msg.includes("marked approved") ||
      msg.includes("marked rejected") ||
      msg.includes("marked verified") ||
      msg.includes("is approved") ||
      msg.includes("is rejected") ||
      msg.includes("document remark") ||
      msg.includes("received a remark")
    ) {
      return false;
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const seenKeys = new Set();
  const consolidated = [];

  sorted.forEach((item) => {
    const msg = String(item.message || "").trim();

    // 1. Reupload consolidated per customer
    const reuploadMatch = msg.match(/^(.+?)\s+(?:reuploaded|replaced)\s+(.+?)\.?$/i);
    if (reuploadMatch) {
      const name = reuploadMatch[1].trim();
      const key = `reupload:${name.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        consolidated.push({
          ...item,
          message: `${name} reuploaded documents.`
        });
      }
      return;
    }

    // 2. Customer submission consolidated
    const submitCustomerMatch = msg.match(/^(.+?)\s+has submitted documents for payment verification\.?$/i);
    if (submitCustomerMatch) {
      const name = submitCustomerMatch[1].trim();
      const key = `submission:${name.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        consolidated.push({
          ...item,
          message: `${name} submitted documents for payment verification.`
        });
      }
      return;
    }

    // 3. Dealer submission/update consolidated
    const submitDealerMatch = msg.match(/^(.+?)\s+(?:submitted|updated)\s+documents for\s+(.+?)\.?$/i);
    if (submitDealerMatch) {
      const dealerName = submitDealerMatch[1].trim();
      const customerName = submitDealerMatch[2].trim();
      const key = `submission:${customerName.toLowerCase()}`;
      const action = msg.toLowerCase().includes("updated") ? "updated" : "submitted";
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        consolidated.push({
          ...item,
          message: `${dealerName} ${action} documents for ${customerName}.`
        });
      }
      return;
    }

    consolidated.push(item);
  });

  return consolidated;
};

const getPaymentUserId = (request) =>
  firstPresent(
    request?.userId,
    request?.customerId,
    request?.user?.userId,
    request?.customer?.userId,
    request?.user?.id,
    request?.customer?.id,
    request?.id
  );

const normalizePaymentRequest = (request = {}, { users = [], personalInfos = [], documents = [] } = {}) => {
  const userId = getPaymentUserId(request);
  const existingUser = users.find(
    (user) => String(user.userId || user.id) === String(userId)
  );
  const requestUser = request.user || request.customer || {};
  const user = {
    ...(existingUser || {}),
    ...requestUser,
    userId: userId || requestUser.userId || requestUser.id,
    fullName: firstPresent(
      requestUser.fullName,
      requestUser.name,
      existingUser?.fullName,
      existingUser?.name,
      request.fullName,
      request.name
    ),
    email: firstPresent(requestUser.email, existingUser?.email, request.email),
    mobileNumber: firstPresent(
      requestUser.mobileNumber,
      requestUser.mobile,
      existingUser?.mobileNumber,
      existingUser?.mobile,
      request.mobileNumber,
      request.mobile
    ),
  };
  const personalInfo =
    request.personalInfo ||
    personalInfos.find((info) => String(info.userId) === String(user.userId)) ||
    {};
  const documentCount =
    Number(request.documentCount) ||
    request.documents?.length ||
    documents.filter((doc) => String(getDocumentOwnerId(doc)) === String(user.userId)).length ||
    0;

  return {
    ...request,
    user,
    status: request.status || request.paymentStatus || PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING,
    personalInfo,
    documents: request.documents || [],
    documentCount,
    feeName: request.feeName || READY2DRIVE_FEE_LABEL,
    feeBaseAmount: Number(request.feeBaseAmount) || READY2DRIVE_BASE_AMOUNT,
    gstAmount: Number(request.gstAmount) || READY2DRIVE_GST_AMOUNT,
    payableAmount: Number(request.payableAmount) || READY2DRIVE_TOTAL_AMOUNT,
    updatedAt: request.updatedAt || request.paymentUpdatedAt || request.requestedAt || request.createdAt || "",
  };
};

const markLocalAdminNotificationRead = (notificationId) => {
  const notifications = readLocalAdminNotifications();
  localStorage.setItem(
    ADMIN_NOTIFICATIONS_KEY,
    JSON.stringify(
      notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      )
    )
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => normalizeAdminProfile(getAdminSession()));
  const adminId = admin?.id || 1;

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [apiWarnings, setApiWarnings] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [dealers, setDealers] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [verifiedDocs, setVerifiedDocs] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [personalInfos, setPersonalInfos] = useState([]);
  const [banks, setBanks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [fadingNotifications, setFadingNotifications] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDocs, setSelectedUserDocs] = useState([]);
  const [selectedUserCounts, setSelectedUserCounts] = useState(null);
  const [assignBankId, setAssignBankId] = useState("");
  const [assigningBank, setAssigningBank] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [dealerMode, setDealerMode] = useState("view");
  const [dealerForm, setDealerForm] = useState(null);
  const [documentTab, setDocumentTab] = useState("Pending");
  const [remarks, setRemarks] = useState({});
  const [bankModal, setBankModal] = useState(null);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [preview, setPreview] = useState(null);
  const [rawPaymentRequests, setRawPaymentRequests] = useState([]);
  const [deleteConfirmationUser, setDeleteConfirmationUser] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const allKnownDocs = useMemo(
    () => uniqueDocuments([...allDocuments, ...pendingDocs, ...verifiedDocs]),
    [allDocuments, pendingDocs, verifiedDocs]
  );
  const paymentRequests = useMemo(
    () =>
      rawPaymentRequests
        .map((request) =>
          normalizePaymentRequest(request, {
            users,
            personalInfos,
            documents: allKnownDocs,
          })
        )
        .filter((request) =>
          !isDealerAddedUser(request.user) &&
          [
            PAYMENT_STATUS.PAYMENT_PENDING,
            PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING,
            PAYMENT_STATUS.PAYMENT_APPROVED,
            PAYMENT_STATUS.PAYMENT_REJECTED,
          ].includes(request.status)
        ),
    [allKnownDocs, personalInfos, rawPaymentRequests, users]
  );
  const paymentRequestByUserId = useMemo(
    () =>
      new Map(
        paymentRequests
          .filter((request) => request.user?.userId)
          .map((request) => [String(request.user.userId), request.status])
      ),
    [paymentRequests]
  );
  const adminVisibleDocs = useMemo(
    () =>
      allKnownDocs.filter((doc) => {
        const ownerId = getDocumentOwnerId(doc);
        const user = users.find((u) => String(u.userId || u.id) === String(ownerId));
        if (isDealerAddedUser(user)) {
          return true;
        }
        const paymentStatus = paymentRequestByUserId.get(String(ownerId));
        return paymentStatus === PAYMENT_STATUS.PAYMENT_APPROVED;
      }),
    [allKnownDocs, paymentRequestByUserId, users]
  );
  const effectiveApprovedDocs = adminVisibleDocs.filter((doc) => doc.status === "APPROVED");
  const approvedDocsCount = effectiveApprovedDocs.length;
  const rejectedDocsCount = adminVisibleDocs.filter((doc) => doc.status === "REJECTED").length;
  const effectivePendingDocs = adminVisibleDocs.filter((doc) => doc.status === "PENDING");
  const effectiveVerifiedDocs = adminVisibleDocs.filter((doc) => doc.status === "VERIFIED");
  const unreadCount = notifications.filter((item) => !item.read).length;
  const paidPaymentRequests = paymentRequests.filter(
    (request) => request.status === PAYMENT_STATUS.PAYMENT_APPROVED
  );

  const fetchAdminData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        setPermissionError("");
        setApiWarnings([]);
        const [
          usersRes,
          chatbotUsersRes,
          userHistoryRes,
          dealersRes,
          pendingRes,
          verifiedRes,
          personalRes,
          banksRes,
          notificationsRes,
          paymentRequestsRes,
        ] =
          await Promise.allSettled([
            api.get("/user/all"),
            api.get("/chatbot/admin/users"),
            api.get("/user/history"),
            api.get("/dealer/all"),
            api.get("/documents/pending"),
            api.get("/documents/verified"),
            api.get("/personal-info/all"),
            api.get("/admin/banks"),
            api.get(`/notifications/${adminId}`),
            getPaymentVerificationRequests(),
          ]);

        const failedApis = getApiFailureSummary([
          { label: "/user/all", status: getFailureStatus(usersRes) },
          { label: "/chatbot/admin/users", status: getFailureStatus(chatbotUsersRes) },
          { label: "/user/history", status: getFailureStatus(userHistoryRes) },
          { label: "/dealer/all", status: getFailureStatus(dealersRes) },
          { label: "/documents/pending", status: getFailureStatus(pendingRes) },
          { label: "/documents/verified", status: getFailureStatus(verifiedRes) },
          { label: "/personal-info/all", status: getFailureStatus(personalRes) },
          { label: "/admin/banks", status: getFailureStatus(banksRes) },
          { label: `/notifications/${adminId}`, status: getFailureStatus(notificationsRes) },
          { label: "/payments/admin/verification-requests", status: getFailureStatus(paymentRequestsRes) },
        ]);

        let loadedUsers = [];
        const usersList = usersRes.status === "fulfilled" ? asList(usersRes.value) : [];
        const chatbotUsersList = chatbotUsersRes.status === "fulfilled" ? asList(chatbotUsersRes.value) : [];
        const userHistoryList = userHistoryRes.status === "fulfilled" ? asList(userHistoryRes.value) : [];

        loadedUsers = mergeUsersById(usersList, chatbotUsersList, userHistoryList);

        const currentAdminSession = getAdminSession();
        const currentAdminId = currentAdminSession?.id || adminId;
        const currentAdminEmail = currentAdminSession?.email || "admin@gmail.com";
        let dbAdmin = usersList.find(
          (u) =>
            (String(u.email || "").toLowerCase().trim() === String(currentAdminEmail).toLowerCase().trim() ||
             String(u.userId || u.id) === String(currentAdminId)) &&
            (u.role === "ADMIN" || String(u.email || "").toLowerCase().includes("admin"))
        );
        if (!dbAdmin && currentAdminId && currentAdminSession?.role !== "ADMIN" && String(currentAdminSession?.role).toUpperCase() !== "ADMIN") {
          try {
            const adminDetailRes = await api.get(`/user/${currentAdminId}`);
            const detailData = adminDetailRes?.data?.data || adminDetailRes?.data;
            if (detailData && (detailData.role === "ADMIN" || String(detailData.email || "").toLowerCase().includes("admin"))) {
              dbAdmin = detailData;
            }
          } catch (e) {
            console.warn("Failed to fetch admin details directly:", e);
          }
        }
        if (dbAdmin) {
          const updatedAdmin = normalizeAdminProfile({ ...currentAdminSession, ...dbAdmin });
          if (updatedAdmin.role === "ADMIN") {
            if (updatedAdmin.mobileNumber !== admin.mobileNumber || updatedAdmin.fullName !== admin.fullName) {
              setAdmin(updatedAdmin);
            }
          }
        }

        let loadedBanks = [];
        if (banksRes.status === "fulfilled") {
          loadedBanks = asList(banksRes.value);
          setBanks(loadedBanks);
        }

        if (loadedBanks.length > 0 && loadedUsers.length > 0) {
          try {
            const bankUsersResults = await Promise.allSettled(
              loadedBanks.map((bank) =>
                api.get(`/user/search-by-bank?bankName=${encodeURIComponent(bank.bankName)}`)
              )
            );

            const userBankMap = new Map();
            bankUsersResults.forEach((res, index) => {
              if (res.status === "fulfilled") {
                const bank = loadedBanks[index];
                const list = asList(res.value);
                list.forEach((u) => {
                  const uid = u.userId || u.id;
                  if (uid) {
                    userBankMap.set(String(uid), {
                      bankId: bank.bankId,
                      assignedBankId: bank.bankId,
                      bankName: bank.bankName,
                      assignedBankName: bank.bankName,
                      representativeName: bank.representativeName,
                      bankEmail: bank.email,
                      bankContactNumber: bank.contactNumber,
                    });
                  }
                });
              }
            });

            loadedUsers = loadedUsers.map((user) => {
              const userId = user.userId || user.id;
              const bankDetails = userBankMap.get(String(userId));
              if (bankDetails) {
                return { ...user, ...bankDetails };
              }
              return user;
            });
          } catch (err) {
            console.error("Failed to query bank assignments from database:", err);
          }
        }

        if (loadedUsers.length > 0) {
          setUsers(loadedUsers);
          setAllUsers(loadedUsers);
        } else {
          const is403 = [usersRes, chatbotUsersRes, userHistoryRes].some(
            (res) => res.status === "rejected" && res.reason?.response?.status === 403
          );
          if (is403) {
            setUsers([]);
            setAllUsers([]);
            setPermissionError("Your current token is not authorized for admin data. Please login again with an ADMIN account.");
            return;
          }
        }
        if (dealersRes.status === "fulfilled") setDealers(asList(dealersRes.value));
        if (dealersRes.reason?.response?.status === 403 && [usersRes, chatbotUsersRes, userHistoryRes].every((res) => res.status === "rejected")) {
          setPermissionError("Admin API access is forbidden for this token. Please login again as ADMIN, or check backend role permissions for admin endpoints.");
          return;
        }
        if (pendingRes.status === "fulfilled") setPendingDocs(asList(pendingRes.value));
        if (verifiedRes.status === "fulfilled") setVerifiedDocs(asList(verifiedRes.value));
        if (personalRes.status === "fulfilled") {
          setPersonalInfos(asList(personalRes.value));
        }
        if (notificationsRes.status === "fulfilled") {
          setNotifications(mergeNotifications(adminId, readLocalAdminNotifications(), asList(notificationsRes.value)));
        }
        if (paymentRequestsRes.status === "fulfilled") {
          setRawPaymentRequests(
            Array.isArray(paymentRequestsRes.value)
              ? paymentRequestsRes.value
              : asList(paymentRequestsRes.value)
          );
        } else {
          setRawPaymentRequests([]);
        }

        setApiWarnings(failedApis);

        if (loadedUsers.length > 0) {
          const docs = await fetchDocumentsForUsersInBatches(loadedUsers);
          const adjustedDocs = adjustDocumentStatusesForBankAssignedUsers(docs, loadedUsers);
          setAllDocuments(adjustedDocs);
          setPendingDocs(adjustedDocs.filter((doc) => doc.status === "PENDING"));
          setVerifiedDocs(adjustedDocs.filter((doc) => doc.status === "VERIFIED"));
          try {
            const personalInfoResponses = await Promise.all(
              loadedUsers.map((user) => {
                const uid = user.userId || user.id;
                return api.put(`/personal-info/update/${uid}`, {})
                  .then((res) => res.data?.data || res.data)
                  .catch(() => null);
              })
            );
            const apiPersonalInfos = personalInfoResponses.filter(Boolean);
            setPersonalInfos((prev) => {
              const infoMap = {};
              prev.forEach((info) => {
                if (info && info.userId) infoMap[info.userId] = info;
              });
              apiPersonalInfos.forEach((info) => {
                if (info && info.userId) {
                  infoMap[info.userId] = {
                    ...infoMap[info.userId],
                    ...info,
                  };
                }
              });
              return Object.values(infoMap);
            });
          } catch (err) {
            console.warn("Failed to sync all user personal info on load:", err);
          }
        } else {
          setAllDocuments([]);
          setPendingDocs([]);
          setVerifiedDocs([]);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [adminId]
  );



  const fetchDocumentLists = useCallback(async () => {
    try {
      if (users.length > 0) {
        const docs = await fetchDocumentsForUsersInBatches(users);
        const adjustedDocs = adjustDocumentStatusesForBankAssignedUsers(docs, users);
        setAllDocuments(adjustedDocs);
        setPendingDocs(adjustedDocs.filter((doc) => doc.status === "PENDING"));
        setVerifiedDocs(adjustedDocs.filter((doc) => doc.status === "VERIFIED"));
      } else {
        setAllDocuments([]);
        setPendingDocs([]);
        setVerifiedDocs([]);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to refresh documents.");
    }
  }, [users]);

  const fetchDocumentListsRef = React.useRef(fetchDocumentLists);
  useEffect(() => {
    fetchDocumentListsRef.current = fetchDocumentLists;
  }, [fetchDocumentLists]);

  useEffect(() => {
    fetchAdminData(true);
  }, [fetchAdminData]);


  const handleLogout = () => {
    clearAuthSession();
    navigate("/", { replace: true });
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    setAssigningBank(false);
    setAssignBankId(String(user.bankId || user.assignedBankId || readAssignedBankId(user.userId) || ""));

    // Fetch user personal info (address, city, state, pincode) dynamically from database
    try {
      const personalRes = await api.put(`/personal-info/update/${user.userId}`, {});
      const personalData = unwrap(personalRes);
      if (personalData) {
        setPersonalInfos((prev) => {
          const filtered = prev.filter((info) => String(info.userId) !== String(user.userId));
          return [...filtered, personalData];
        });
      }
    } catch (err) {
      console.warn("Failed to fetch personal info for user:", err);
    }

    const paymentStatus = paymentRequestByUserId.get(String(user.userId));
    if (!isDealerAddedUser(user) && paymentStatus !== PAYMENT_STATUS.PAYMENT_APPROVED) {
      toast.info("Payment is not approved yet. Documents are locked.");
      setSelectedUserDocs([]);
      setSelectedUserCounts(null);
      return;
    }

    try {
      const docsRes = await api.get(`/documents/user/${user.userId}`);
      const userDocs = unwrap(docsRes) || [];
      setSelectedUserDocs(userDocs);
      setSelectedUserCounts({
        pendingCount: userDocs.filter((d) => d.status === "PENDING").length,
        verifiedCount: userDocs.filter((d) => d.status === "VERIFIED").length,
        approvedCount: userDocs.filter((d) => d.status === "APPROVED").length,
        rejectedCount: userDocs.filter((d) => d.status === "REJECTED").length,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load user details.");
    }
  };

  const searchUsers = async () => {
    if (!searchName.trim()) {
      fetchAdminData(false);
      return;
    }
    const q = searchName.trim().toLowerCase();
    const cachedMatches = allUsers.filter(
      (user) =>
        String(user.fullName || user.name || "").toLowerCase().includes(q) ||
        String(user.email || "").toLowerCase().includes(q) ||
        String(user.mobileNumber || user.mobile || "").includes(q)
    );

    try {
      const res = await api.get(`/user/search?name=${encodeURIComponent(searchName.trim())}`);
      setUsers(mergeUsersById(asList(res), cachedMatches));
    } catch (error) {
      const fallbackMatches = mergeUsersById(cachedMatches);
      if (fallbackMatches.length > 0) {
        setUsers(fallbackMatches);
      } else {
        toast.error(error?.response?.data?.message || "User search failed.");
      }
    }
  };

  const deleteUserFromDb = async (userId) => {
    const attempts = [
      () => api.delete(`/user/delete/${userId}`),
      () => api.delete(`/delete/${userId}`),
      () => api.delete(`/user/${userId}`),
      () => api.delete(`/user/delete?userId=${encodeURIComponent(userId)}`),
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
        if (![404, 405].includes(error?.response?.status)) throw error;
      }
    }
    throw lastError;
  };

  const deleteUser = (user) => {
    const userId = user?.userId || user?.id;
    if (!userId) {
      toast.error("Unable to delete user: missing user id.");
      return;
    }
    setDeleteConfirmationUser(user);
  };

  const executeDeleteUser = async (user) => {
    const userId = user?.userId || user?.id;
    if (!userId) return;

    try {
      setDeleteConfirmationUser(null);
      await deleteUserFromDb(userId);
      removeUserFromLocalCaches(userId);
      setUsers((prev) => prev.filter((item) => String(item.userId || item.id) !== String(userId)));
      setPersonalInfos((prev) => prev.filter((info) => String(info.userId) !== String(userId)));
      setAllDocuments((prev) => prev.filter((doc) => String(doc.userId) !== String(userId)));
      setPendingDocs((prev) => prev.filter((doc) => String(doc.userId) !== String(userId)));
      setVerifiedDocs((prev) => prev.filter((doc) => String(doc.userId) !== String(userId)));
      if (String(selectedUser?.userId || selectedUser?.id) === String(userId)) {
        setSelectedUser(null);
        setSelectedUserDocs([]);
        setSelectedUserCounts(null);
      }
      toast.success("User deleted successfully.");
      await fetchAdminData(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete user from database."));
    }
  };

  const assignBank = async () => {
    if (!selectedUser || !assignBankId) {
      toast.error("Please select a bank.");
      return;
    }
    const assignedBank = banks.find((bank) => String(bank.bankId) === String(assignBankId));
    const selectedPersonalInfo = personalInfos.find(
      (info) => String(info.userId) === String(selectedUser.userId)
    ) || (selectedUser.loanAmount ? {
      userId: selectedUser.userId,
      loanAmount: selectedUser.loanAmount,
      address: "N/A",
      city: "N/A",
      state: "N/A",
      pincode: "N/A",
    } : null);
    const selectedDealer = dealers.find(
      (dealer) =>
        String(dealer.dealerCode || "").toLowerCase() ===
          String(selectedUser.dealerCode || "").toLowerCase() ||
        String(dealer.dealerId || dealer.id || "") ===
          String(selectedUser.dealerId || selectedUser.assignedDealerId || "")
    );

    if (!selectedPersonalInfo) {
      toast.error("Personal info is missing for this user. Add required details or ask the dealer/customer to complete them before assigning a bank.");
      return;
    }

    try {
      setAssigningBank(true);
      await assignBankToUser(selectedUser.userId, assignBankId);
      let docsToApprove = selectedUserDocs;
      if (docsToApprove.length === 0) {
        const docsRes = await api.get(`/documents/user/${selectedUser.userId}`);
        docsToApprove = asList(docsRes);
      }
      await approveDocuments(docsToApprove);
      const approvedDocs = docsToApprove.map((doc) => ({ ...doc, status: "APPROVED", remarks: "" }));
      const totalApprovedDocuments = docsToApprove.length;

      const dealer = dealers.find(
        (item) =>
          String(item.dealerCode || "").toLowerCase() === String(selectedUser.dealerCode || "").toLowerCase() ||
          String(item.dealerId || item.id || "") === String(selectedUser.dealerId || selectedUser.assignedDealerId || "")
      );
      addLocalDealerNotification({
        dealerId: dealer?.dealerId || dealer?.id || selectedUser.dealerId || selectedUser.assignedDealerId || selectedDealer?.dealerId || selectedDealer?.id,
        dealerCode: dealer?.dealerCode || selectedUser.dealerCode || selectedDealer?.dealerCode,
        message: `${selectedUser.fullName || "Customer"} has been assigned to ${
          assignedBank?.bankName || "a bank"
        }. ${totalApprovedDocuments || "All"} document(s) were approved by admin.`,
      });
      addLocalCustomerNotification({
        userId: selectedUser.userId,
        message: `BANK_ASSIGNED:${assignBankId}:${assignedBank?.bankName || "a bank"}`,
      });
      toast.success("Bank assigned successfully and documents approved.");
      const bankFields = {
        bankId: Number(assignBankId),
        assignedBankId: Number(assignBankId),
        assignedBankName: assignedBank?.bankName || "",
        bankName: assignedBank?.bankName || "",
      };
      setSelectedUserDocs((prev) =>
        prev.map((doc) => (doc.documentId ? { ...doc, status: "APPROVED", remarks: "" } : doc))
      );
      if (docsToApprove.length > 0) {
        setSelectedUserDocs(approvedDocs);
      }
      setSelectedUser((prev) => (prev ? { ...prev, ...bankFields } : prev));
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === selectedUser.userId ? { ...user, ...bankFields } : user
        )
      );
      const approvedDocIds = new Set(approvedDocs.map((doc) => String(doc.documentId)));
      setPendingDocs((prev) => prev.filter((doc) => !approvedDocIds.has(String(doc.documentId))));
      setVerifiedDocs((prev) => uniqueDocuments([...prev, ...approvedDocs]));
      setAllDocuments((prev) =>
        uniqueDocuments(
          prev.map((doc) =>
            String(getDocumentOwnerId(doc)) === String(selectedUser.userId)
              ? { ...doc, status: "APPROVED", remarks: "" }
              : doc
          )
        )
      );
      setAssignBankId("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to assign bank."));
    } finally {
      setAssigningBank(false);
    }
  };

  const openDealer = (dealer, mode = "view") => {
    setDealerMode(mode);
    setSelectedDealer(dealer);
    setDealerForm({
      fullName: dealer.fullName || "",
      email: dealer.email || "",
      mobileNumber: dealer.mobileNumber || "",
    });
  };

  const updateDealer = async () => {
    try {
      await api.put(`/dealer/update/${selectedDealer.dealerId}`, dealerForm);
      toast.success("Dealer updated.");
      setSelectedDealer(null);
      await fetchAdminData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update dealer.");
    }
  };

  const updateDocumentStatus = async (doc, status) => {
    try {
      if (status === "APPROVED" && doc.status !== "VERIFIED") {
        await api.put(`/documents/status/${doc.documentId}?status=VERIFIED`);
      }
      await api.put(`/documents/status/${doc.documentId}?status=${status}`);
      const userId = getDocumentOwnerId(doc);
      const user = users.find((item) => String(item.userId) === String(userId));
      const documentName = formatDocumentType(doc.documentType);
      
      const customerMsg =
        status === "APPROVED"
          ? `${user?.fullName || "Customer"} - ${documentName} is approved by admin.`
          : `${user?.fullName || "Customer"} - ${documentName} is rejected by admin.`;
          
      addLocalCustomerNotification({ userId, message: customerMsg });
      
      if (user) {
        const dealer = dealers.find(
          (item) =>
            String(item.dealerCode || "").toLowerCase() === String(user.dealerCode || "").toLowerCase() ||
            String(item.dealerId || item.id || "") === String(user.dealerId || user.assignedDealerId || "")
        );
        const dealerMsg =
          status === "APPROVED"
            ? `${user.fullName} - ${documentName} is approved by admin.`
            : `${user.fullName} - ${documentName} is rejected by admin.`;
            
        addLocalDealerNotification({
          dealerId: dealer?.dealerId || dealer?.id || user.dealerId || user.assignedDealerId,
          dealerCode: dealer?.dealerCode || user.dealerCode,
          message: dealerMsg,
          type: "DOCUMENT_STATUS",
          documentStatus: status,
          documentId: doc.documentId,
          documentType: doc.documentType,
          userId,
        });
      }
      toast.success(`Document marked ${status}.`);
      await fetchDocumentLists();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update document status.");
    }
  };

  const saveRemark = async (documentId) => {
    try {
      const remark = remarks[documentId] || "";
      await api.put(`/documents/${documentId}/remarks`, {
        remarks: remark,
      });
      const doc = allKnownDocs.find((item) => String(item.documentId) === String(documentId));
      const userId = getDocumentOwnerId(doc);
      const user = users.find((item) => String(item.userId) === String(userId));
      const documentStatus = doc?.status || "";
      const isRejectedDocument = String(documentStatus).toUpperCase() === "REJECTED";
      // The remark is stored in the database and displayed directly on the document card.
      // We do not dispatch any extra notification to keep notifications consolidated.
      toast.success("Remark saved.");
      await fetchDocumentLists();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save remark.");
    }
  };

  const openPreview = async (documentId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:8082/api/documents/preview/${documentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Preview failed");
      const blob = await response.blob();
      setPreview({ url: URL.createObjectURL(blob), type: blob.type });
    } catch {
      toast.error("Unable to preview document.");
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const updatePaymentRequest = async (userId, status) => {
    try {
      if (status === PAYMENT_STATUS.PAYMENT_APPROVED) {
        await approvePaymentRequest(userId);
      } else if (status === PAYMENT_STATUS.PAYMENT_REJECTED) {
        await rejectPaymentRequest(userId);
      }
      addLocalCustomerNotification({
        userId,
        message:
          status === PAYMENT_STATUS.PAYMENT_APPROVED
            ? "Payment verified successfully. Your documents have been submitted for admin review."
            : "Payment request rejected. Please check your payment details.",
      });
      const user = users.find((item) => String(item.userId) === String(userId));
      if (user) {
        const dealer = dealers.find(
          (item) =>
            String(item.dealerCode || "").toLowerCase() === String(user.dealerCode || "").toLowerCase() ||
            String(item.dealerId || item.id || "") === String(user.dealerId || user.assignedDealerId || "")
        );
        addLocalDealerNotification({
          dealerId: dealer?.dealerId || dealer?.id || user.dealerId || user.assignedDealerId,
          dealerCode: dealer?.dealerCode || user.dealerCode,
          message:
            status === PAYMENT_STATUS.PAYMENT_APPROVED
              ? `${user.fullName || "Customer"} payment was approved. Documents are ready for admin review.`
              : `${user.fullName || "Customer"} payment was rejected.`,
        });
      }
      toast.success(
        status === PAYMENT_STATUS.PAYMENT_APPROVED
          ? "Payment approved. Customer documents can proceed to admin review."
          : "Payment request rejected."
      );
      await fetchAdminData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data || "Failed to update payment request.");
    }
  };

  const saveBank = async () => {
    if (!bankForm.contactNumber) {
      toast.error("Contact number is required.");
      return;
    }
    if (bankForm.contactNumber.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.");
      return;
    }
    try {
      if (bankModal?.mode === "edit") {
        await api.put(`/admin/banks/${bankModal.bank.bankId}`, bankForm);
        toast.success("Bank updated.");
      } else {
        await api.post("/admin/banks", bankForm);
        toast.success("Bank added.");
      }
      setBankModal(null);
      setBankForm(emptyBank);
      await fetchAdminData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data || "Failed to save bank.");
    }
  };

  const deleteBank = async (bankId) => {
    try {
      await api.delete(`/admin/banks/${bankId}`);
      toast.success("Bank deleted.");
      await fetchAdminData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete bank.");
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (String(notificationId).startsWith("local-admin-")) {
      markLocalAdminNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );
      return;
    }
    try {
      await api.put(`/notifications/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );
    } catch {
      toast.error("Failed to mark notification as read.");
    }
  };

  const clearAllNotifications = async () => {
    const unread = notifications.filter((item) => !item.read);
    if (unread.length === 0) return;
    setFadingNotifications(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    for (const item of unread) {
      if (String(item.id).startsWith("local-admin-")) {
        markLocalAdminNotificationRead(item.id);
      } else {
        try {
          await api.put(`/notifications/read/${item.id}`);
        } catch (e) {
          // ignore
        }
      }
    }
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );
    setFadingNotifications(false);
    setShowNotifications(false);
  };


  const changePassword = async () => {
    if (!passwordForm.newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      await api.post("/user/reset-password", {
        email: admin?.email,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed.");
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password.");
    }
  };

  const renderActivePage = () => {
    if (activeMenu === "Users") {
      return (
        <Users
          users={users}
          banks={banks}
          userApiWarning={apiWarnings.find((warning) => warning.startsWith("/user/all"))}
          searchName={searchName}
          setSearchName={setSearchName}
          searchUsers={searchUsers}
          openUser={openUser}
          selectedUser={selectedUser}
          selectedUserDocs={selectedUserDocs}
          selectedUserCounts={selectedUserCounts}
          assignBankId={assignBankId}
          setAssignBankId={setAssignBankId}
          assignBank={assignBank}
          assigningBank={assigningBank}
          personalInfo={personalInfos.find((info) => String(info.userId) === String(selectedUser?.userId)) || {
            userId: selectedUser?.userId,
            loanAmount: selectedUser?.loanAmount || 0,
            address: "N/A",
            city: "N/A",
            state: "N/A",
            pincode: "N/A",
          }}
          closeUser={() => setSelectedUser(null)}
          openPreview={openPreview}
          deleteUser={deleteUser}
        />
      );
    }

    if (activeMenu === "Dealers") {
      return (
        <Dealers
          dealers={dealers}
          openDealer={openDealer}
          dealerMode={dealerMode}
          selectedDealer={selectedDealer}
          dealerForm={dealerForm}
          setDealerForm={setDealerForm}
          updateDealer={updateDealer}
          closeDealer={() => setSelectedDealer(null)}
        />
      );
    }

    if (activeMenu === "Documents") {
      return (
        <Documents
          documentTab={documentTab}
          setDocumentTab={setDocumentTab}
          docs={documentTab === "Pending" ? effectivePendingDocs : effectiveVerifiedDocs}
          allDocs={adminVisibleDocs}
          users={users}
          remarks={remarks}
          setRemarks={setRemarks}
          updateDocumentStatus={updateDocumentStatus}
          saveRemark={saveRemark}
          openPreview={openPreview}
        />
      );
    }

    if (activeMenu === "Payments") {
      return (
        <PaymentsPanel
          paymentRequests={paymentRequests}
          updatePaymentRequest={updatePaymentRequest}
        />
      );
    }

    if (activeMenu === "Banks") {
      return (
        <Bank
          banks={banks}
          setBankModal={setBankModal}
          setBankForm={setBankForm}
          bankModal={bankModal}
          bankForm={bankForm}
          saveBank={saveBank}
          deleteBank={deleteBank}
          closeBankModal={() => setBankModal(null)}
        />
      );
    }

    if (activeMenu === "Reports") {
      return (
        <Reports
          users={users}
          dealers={dealers}
          personalInfos={personalInfos}
          pendingDocs={effectivePendingDocs}
          verifiedDocs={effectiveVerifiedDocs}
          approvedDocsCount={approvedDocsCount}
          rejectedDocsCount={rejectedDocsCount}
        />
      );
    }

    if (activeMenu === "Settings") {
      return (
        <Settings
          admin={admin}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          changePassword={changePassword}
        />
      );
    }

    return (
      <DashboardOverview
        users={users}
        dealers={dealers}
        pendingDocs={effectivePendingDocs}
        approvedDocs={effectiveApprovedDocs}
        personalInfos={personalInfos}
        paidPaymentRequests={paidPaymentRequests}
        setActiveMenu={setActiveMenu}
      />
    );
  };

  return (
    <div className="min-h-dvh bg-[#F4F6F9] text-slate-800">
      <div className="flex min-h-dvh">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          handleLogout={handleLogout}
        />
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
        )}

        <main className="min-w-0 flex-1 overflow-y-visible md:overflow-y-auto">
          <div className="bg-white px-4 md:px-8 py-4 md:py-5 shadow-sm flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4F6F9] text-[#0B2A4A] md:hidden"
                aria-label="Open navigation"
              >
                <FaBars />
              </button>
              <div className="min-w-0">
              <h1 className="truncate text-2xl md:text-3xl font-bold text-[#0B2A4A]">{activeMenu}</h1>
              <p className="text-sm text-slate-500 mt-1">Welcome back, {admin?.name || "Admin"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchAdminData(true)}
                className="bg-[#F4F6F9] hover:bg-slate-200 px-4 h-11 rounded-2xl text-sm font-semibold text-[#0B2A4A] transition-colors"
              >
                Refresh
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative w-11 h-11 rounded-2xl bg-[#F4F6F9] text-[#0B2A4A] flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                 {showNotifications && (
                  <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-3xl shadow-xl border border-slate-100 z-30 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-[#0B2A4A]">Notifications</h3>
                      {notifications.filter((item) => !item.read).length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {notifications.filter((item) => !item.read).length === 0 ? (
                      <p className="text-sm text-slate-500">No notifications.</p>
                    ) : (
                      <div className={`space-y-2 max-h-80 overflow-y-auto transition-all duration-300 ${fadingNotifications ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
                        {notifications.filter((item) => !item.read).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => markNotificationRead(item.id)}
                            className="w-full text-left rounded-2xl p-3 text-sm bg-[#EAFBF8]"
                          >
                            <p className="font-semibold text-[#0B2A4A]">{item.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{formatDate(item.createdAt)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 md:p-8">
            {permissionError ? (
              <PermissionWarning message={permissionError} onLogout={handleLogout} />
            ) : loading ? (
              <div className="bg-white rounded-3xl p-5 sm:p-8 font-bold text-[#0B2A4A]">Loading admin data...</div>
            ) : (
              <>
                {apiWarnings.length > 0 && <ApiWarning failedApis={apiWarnings} />}
                {renderActivePage()}
              </>
            )}
          </div>
        </main>
      </div>
      <Footer logoutOnNavigate />

      {preview && <PreviewModal preview={preview} closePreview={closePreview} />}
      {deleteConfirmationUser && (
        <ConfirmDeleteModal
          user={deleteConfirmationUser}
          onClose={() => setDeleteConfirmationUser(null)}
          onConfirm={() => executeDeleteUser(deleteConfirmationUser)}
        />
      )}

      {/* Chatbot mount only; dashboard logic remains unchanged. */}
      <Chatbot roleOverride="ADMIN" onNavigateSection={setActiveMenu} />
    </div>
  );
};

const PermissionWarning = ({ message, onLogout }) => (
  <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm max-w-3xl">
    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-5">
      <FaExclamationTriangle />
    </div>
    <h2 className="text-2xl font-bold text-[#0B2A4A]">Admin access denied</h2>
    <p className="text-sm text-slate-600 mt-3 leading-6">{message}</p>
    <p className="text-sm text-slate-500 mt-3">
      A 403 response is returned by the backend, so the frontend cannot load those resources until the token or backend role rules are fixed.
    </p>
    <button
      onClick={onLogout}
      className="mt-6 bg-[#0B2A4A] text-white rounded-2xl px-6 py-3 font-bold"
    >
      Login Again
    </button>
  </div>
);

const ApiWarning = ({ failedApis }) => (
  <div className="mb-5 bg-amber-50 border border-amber-200 rounded-3xl p-5 text-sm text-amber-800">
    <div className="font-bold text-amber-900">Some admin APIs did not respond.</div>
    <p className="mt-1">
      Loaded data is still shown below. Failed calls: {failedApis.join(", ")}.
    </p>
  </div>
);

const PAYMENT_BADGE_STYLES = {
  PAYMENT_PENDING: "bg-amber-100 text-amber-700",
  PAYMENT_VERIFICATION_PENDING: "bg-sky-100 text-sky-700",
  PAYMENT_APPROVED: "bg-emerald-100 text-emerald-700",
  PAYMENT_REJECTED: "bg-red-100 text-red-700",
};

const getPaymentBreakdown = (request = {}) => ({
  feeName: request.feeName || READY2DRIVE_FEE_LABEL,
  feeBaseAmount: Number(request.feeBaseAmount) || READY2DRIVE_BASE_AMOUNT,
  gstAmount: Number(request.gstAmount) || READY2DRIVE_GST_AMOUNT,
  payableAmount: Number(request.payableAmount) || READY2DRIVE_TOTAL_AMOUNT,
});

const formatPaymentStatus = (status) =>
  (status || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PaymentStatusBadge = ({ status }) => (
  <span
    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
      PAYMENT_BADGE_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {formatPaymentStatus(status)}
  </span>
);

const PaymentsPanel = ({ paymentRequests, updatePaymentRequest }) => {
  const pendingRequests = paymentRequests.filter(
    (req) => req.status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING
  );
  const paidRequests = paymentRequests.filter(
    (req) => req.status === PAYMENT_STATUS.PAYMENT_APPROVED
  );

  return (
    <div className="space-y-6">
      {/* Pending Approvals Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#0B2A4A]">Pending Payment Approvals</h2>
            <p className="text-sm text-slate-500 mt-1">
              List of users who made payment and are waiting for approval.
            </p>
          </div>
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-2xl text-sm font-bold">
            {pendingRequests.length} Pending
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="bg-[#F4F6F9] rounded-2xl p-4 sm:p-6 text-sm text-slate-500">
            No pending payment verification requests.
          </div>
        ) : (
          <DataTable
            headers={["User Name", "Mobile Number", "Requested Amount", "Requested Date & Time", "Action"]}
            rows={pendingRequests.map((req) => [
              req.fullName || req.user?.fullName || `User ${req.userId}`,
              req.mobileNumber || req.user?.mobileNumber || "—",
              formatINR(req.payableAmount || req.paymentAmount || 116.82),
              formatDateTime(req.updatedAt || req.createdAt),
              <button
                key={`approve-${req.userId}`}
                onClick={() => updatePaymentRequest(req.userId, PAYMENT_STATUS.PAYMENT_APPROVED)}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors duration-200"
              >
                Approve
              </button>,
            ])}
          />
        )}
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-x-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#0B2A4A]">Payment History</h2>
            <p className="text-sm text-slate-500 mt-1">
              List of completed Ready2Drive payments.
            </p>
          </div>
          <div className="bg-[#EAFBF8] text-[#0B2A4A] px-4 py-3 rounded-2xl text-sm font-bold">
            {paidRequests.length} Payments
          </div>
        </div>

        {paidRequests.length === 0 ? (
          <div className="bg-[#F4F6F9] rounded-2xl p-4 sm:p-6 text-sm text-slate-500">
            No completed payments found.
          </div>
        ) : (
          <DataTable
            headers={["User Name", "Mobile Number", "Payment Amount", "Payment Date & Time"]}
            rows={paidRequests.map((req) => [
              req.fullName || req.user?.fullName || `User ${req.userId}`,
              req.mobileNumber || req.user?.mobileNumber || "—",
              formatINR(req.paymentAmount || 116.82),
              formatDateTime(req.createdAt || req.updatedAt),
            ])}
          />
        )}
      </div>
    </div>
  );
};

const DashboardOverview = ({
  users,
  dealers,
  pendingDocs,
  approvedDocs,
  personalInfos,
  paidPaymentRequests,
  setActiveMenu,
}) => {
  const [statOverlay, setStatOverlay] = useState(null);
  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: <FaUsers />,
      items: users.map((user) => ({ title: user.fullName || `User #${user.userId}` })),
    },
    {
      label: "Total Dealers",
      value: dealers.length,
      icon: <FaUserTie />,
      items: dealers.map((dealer) => ({ title: dealer.fullName || `Dealer #${dealer.dealerId || dealer.id}` })),
    },
    {
      label: "Completed Payments",
      value: paidPaymentRequests.length,
      icon: <FaRupeeSign />,
      items: paidPaymentRequests.map((req) => ({
        title: req.fullName || req.user?.fullName || `User #${req.userId}`,
        subtitle: `Amount: ${formatINR(req.paymentAmount || 116.82)}`,
      })),
    },
    {
      label: "Pending Documents",
      value: pendingDocs.length,
      icon: <FaFileAlt />,
      items: pendingDocs.map((doc) => ({
        title: doc.fileName || doc.documentType || `Document #${doc.documentId}`,
        subtitle: doc.documentType || "Pending",
      })),
    },
    {
      label: "Approved Documents",
      value: approvedDocs.length,
      icon: <FaCheck />,
      items: approvedDocs.map((doc) => ({
        title: doc.fileName || doc.documentType || `Document #${doc.documentId}`,
        subtitle: doc.documentType || "Approved",
      })),
    },
    {
      label: "Total Loan Applications",
      value: personalInfos.length,
      icon: <FaUniversity />,
      items: personalInfos.map((info) => {
        const user = users.find((item) => String(item.userId) === String(info.userId));
        return {
          title: user?.fullName || info.fullName || `User #${info.userId}`,
          subtitle: info.loanAmount ? `Loan Amount: Rs ${Number(info.loanAmount).toLocaleString("en-IN")}` : "Loan amount not set",
        };
      }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} onClick={() => setStatOverlay(stat)} />
        ))}
      </div>
      {statOverlay && (
        <ListOverlay
          title={statOverlay.label}
          items={statOverlay.items}
          onClose={() => setStatOverlay(null)}
        />
      )}



      {pendingDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-amber-800">Pending documents need review</h2>
            <p className="text-sm text-amber-700 mt-1">{pendingDocs.length} document(s) waiting.</p>
          </div>
          <button
            onClick={() => setActiveMenu("Documents")}
            className="bg-[#0B2A4A] text-white rounded-2xl px-5 py-3 font-bold"
          >
            Go to Documents
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-x-auto">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Recent Users</h2>
        <DataTable
          headers={["Name", "Email", "Mobile", "Dealer Code", "Registered Date"]}
          rows={users.slice(-5).reverse().map((user) => [
            user.fullName,
            user.email,
            user.mobileNumber,
            user.dealerCode,
            formatDate(user.createdAt),
          ])}
        />
      </div>
    </div>
  );
};

const ConfirmDeleteModal = ({ user, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-500 mb-4">
          <FaTrash className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-extrabold text-[#0B2A4A] mb-2">Confirm Delete</h3>
        <p className="text-sm text-slate-500 mb-6">
          Do you want to delete <span className="font-bold text-[#0B2A4A]">{user.fullName || "this user"}</span> completely?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-[#0B2A4A] font-bold py-3 px-4 rounded-2xl transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-2xl transition"
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;

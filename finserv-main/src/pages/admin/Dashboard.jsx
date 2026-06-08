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
} from "react-icons/fa";
import Sidebar from "../../components/admin/Sidebar";
import api from "../../services/api";
import Users from "./Users";
import Dealers from "./Dealers";
import Documents from "./Documents";
import Bank from "./Bank";
import Reports from "./Reports";
import Settings from "./Settings";
import { markPaymentSuccess } from "../../services/paymentService";
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
  const data = unwrap(response);
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

const readAssignedBankId = (userId) => localStorage.getItem(`user_bank_assignment_${userId}`) || "";
const getAssignedBankDetailKey = (userId) => `user_bank_assignment_detail_${userId}`;

const DEALER_NOTIFICATIONS_KEY = "dealer_assignment_notifications";
const DEALER_REGISTERED_USERS_KEY = "dealer_registered_users";
const DEALER_REGISTERED_PERSONAL_INFO_KEY = "dealer_registered_personal_info";
const ADMIN_NOTIFICATIONS_KEY = "admin_activity_notifications";
const CUSTOMER_NOTIFICATIONS_KEY = "customer_activity_notifications";

const PAYMENT_STATUS = {
  DRAFT: "DRAFT",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_VERIFICATION_PENDING: "PAYMENT_VERIFICATION_PENDING",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
};

const PAYMENT_REQUESTS_KEY = "customer_payment_requests";

const getPaymentStorageKey = (userId) => `customer_payment_status_${userId || "guest"}`;

const readPaymentStatus = (userId) =>
  localStorage.getItem(getPaymentStorageKey(userId)) || PAYMENT_STATUS.DRAFT;

const writePaymentStatus = (userId, status) => {
  localStorage.setItem(getPaymentStorageKey(userId), status);
};

const readPaymentRequests = () => {
  try {
    return JSON.parse(localStorage.getItem(PAYMENT_REQUESTS_KEY) || "[]");
  } catch {
    return [];
  }
};

const writePaymentRequest = (userId, status, documents = null) => {
  const requests = readPaymentRequests();
  const nextRequests = requests.map((request) =>
    String(request.userId) === String(userId)
      ? {
          ...request,
          status,
          documents: documents || request.documents || [],
          documentCount: documents?.length ?? request.documentCount ?? 0,
          updatedAt: new Date().toISOString(),
        }
      : request
  );
  localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(nextRequests));
};

const approveDocuments = async (documents) => {
  const docsToApprove = documents.filter((doc) => doc.documentId && doc.status !== "APPROVED");
  if (docsToApprove.length === 0) return { approved: 0, failed: 0 };

  const results = await Promise.allSettled(
    docsToApprove.map((doc) => api.put(`/documents/status/${doc.documentId}?status=APPROVED`))
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
    profile.contactNumber
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

const addLocalDealerNotification = ({ dealerId, dealerCode, message }) => {
  if (!dealerId && !dealerCode) return;
  const notifications = readLocalDealerNotifications();
  const notification = {
    id: `local-bank-${Date.now()}`,
    dealerId: dealerId || "",
    dealerCode: dealerCode || "",
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(DEALER_NOTIFICATIONS_KEY, JSON.stringify([notification, ...notifications]));
};

const readLocalCustomerNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const addLocalCustomerNotification = ({ userId, message }) => {
  if (!userId || !message) return;
  const notifications = readLocalCustomerNotifications();
  const notification = {
    id: `local-customer-${Date.now()}-${userId}`,
    userId,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify([notification, ...notifications]));
};

const readLocalDealerUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_REGISTERED_USERS_KEY) || "[]");
  } catch {
    return [];
  }
};

const removeUserFromLocalCaches = (userId) => {
  const id = String(userId);
  localStorage.removeItem(getPaymentStorageKey(userId));
  localStorage.removeItem(`user_bank_assignment_${userId}`);
  localStorage.removeItem(getAssignedBankDetailKey(userId));

  const paymentRequests = readPaymentRequests().filter((request) => String(request.userId) !== id);
  localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(paymentRequests));

  const localUsers = readLocalDealerUsers().filter((user) => String(user.userId || user.id) !== id);
  localStorage.setItem(DEALER_REGISTERED_USERS_KEY, JSON.stringify(localUsers));

  const localInfos = readLocalDealerPersonalInfos().filter((info) => String(info.userId) !== id);
  localStorage.setItem(DEALER_REGISTERED_PERSONAL_INFO_KEY, JSON.stringify(localInfos));
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

const readLocalDealerPersonalInfos = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_REGISTERED_PERSONAL_INFO_KEY) || "[]");
  } catch {
    return [];
  }
};

const readLocalAdminNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_NOTIFICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const mergeNotifications = (...lists) =>
  lists
    .flat()
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
  const [paymentVersion, setPaymentVersion] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const allKnownDocs = useMemo(
    () => uniqueDocuments([...allDocuments, ...pendingDocs, ...verifiedDocs]),
    [allDocuments, pendingDocs, verifiedDocs]
  );
  const paymentRequestByUserId = useMemo(
    () =>
      new Map(
        readPaymentRequests().map((request) => [
          String(request.userId),
          request.status || readPaymentStatus(request.userId),
        ])
      ),
    [paymentVersion]
  );
  const adminVisibleDocs = useMemo(
    () =>
      allKnownDocs.filter((doc) => {
        const ownerId = getDocumentOwnerId(doc);
        const paymentStatus = paymentRequestByUserId.get(String(ownerId));
        return !paymentStatus || paymentStatus === PAYMENT_STATUS.PAYMENT_APPROVED;
      }),
    [allKnownDocs, paymentRequestByUserId]
  );
  const approvedDocsCount = adminVisibleDocs.filter((doc) => doc.status === "APPROVED").length;
  const rejectedDocsCount = adminVisibleDocs.filter((doc) => doc.status === "REJECTED").length;
  const effectivePendingDocs = adminVisibleDocs.filter((doc) => doc.status === "PENDING");
  const effectiveVerifiedDocs = adminVisibleDocs.filter((doc) => doc.status === "VERIFIED");
  const unreadCount = notifications.filter((item) => !item.read).length;
  const paymentRequests = useMemo(
    () => {
      const localRequests = readPaymentRequests();
      const userMap = new Map(users.map((user) => [String(user.userId), user]));
      const localUserIds = new Set(localRequests.map((request) => String(request.userId)));
      const userRequests = users
        .filter((user) => !localUserIds.has(String(user.userId)))
        .map((user) => ({
          user,
          status: readPaymentStatus(user.userId),
          personalInfo: personalInfos.find((info) => info.userId === user.userId),
          documentCount: allKnownDocs.filter((doc) => doc.userId === user.userId).length,
          feeName: READY2DRIVE_FEE_LABEL,
          feeBaseAmount: READY2DRIVE_BASE_AMOUNT,
          gstAmount: READY2DRIVE_GST_AMOUNT,
          payableAmount: READY2DRIVE_TOTAL_AMOUNT,
          updatedAt: "",
        }));

      const storedRequests = localRequests.map((request) => {
        const user =
          userMap.get(String(request.userId)) || {
            userId: request.userId,
            fullName: request.fullName,
            email: request.email,
            mobileNumber: request.mobileNumber,
          };
        return {
          user,
          status: request.status || readPaymentStatus(request.userId),
          personalInfo:
            personalInfos.find((info) => String(info.userId) === String(request.userId)) || {
              loanAmount: request.loanAmount,
            },
          documentCount:
            allKnownDocs.filter((doc) => String(doc.userId) === String(request.userId)).length ||
            request.documentCount ||
            0,
          feeName: request.feeName || READY2DRIVE_FEE_LABEL,
          feeBaseAmount: Number(request.feeBaseAmount) || READY2DRIVE_BASE_AMOUNT,
          gstAmount: Number(request.gstAmount) || READY2DRIVE_GST_AMOUNT,
          payableAmount: Number(request.payableAmount) || READY2DRIVE_TOTAL_AMOUNT,
          updatedAt: request.updatedAt || "",
        };
      });

      return [...storedRequests, ...userRequests].filter(({ status }) =>
        [
          PAYMENT_STATUS.PAYMENT_PENDING,
          PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING,
          PAYMENT_STATUS.PAYMENT_APPROVED,
          PAYMENT_STATUS.PAYMENT_REJECTED,
        ].includes(status)
      );
    },
    [allKnownDocs, paymentVersion, personalInfos, users]
  );
  const pendingPaymentRequests = paymentRequests.filter(
    (request) => request.status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING
  );

  const fetchAdminData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        setPermissionError("");
        setApiWarnings([]);
        const [usersRes, dealersRes, pendingRes, verifiedRes, personalRes, banksRes, notificationsRes] =
          await Promise.allSettled([
            api.get("/user/all"),
            api.get("/dealer/all"),
            api.get("/documents/pending"),
            api.get("/documents/verified"),
            api.get("/personal-info/all"),
            api.get("/admin/banks"),
            api.get(`/notifications/${adminId}`),
          ]);

        const failedApis = getApiFailureSummary([
          { label: "/user/all", status: getFailureStatus(usersRes) },
          { label: "/dealer/all", status: getFailureStatus(dealersRes) },
          { label: "/documents/pending", status: getFailureStatus(pendingRes) },
          { label: "/documents/verified", status: getFailureStatus(verifiedRes) },
          { label: "/personal-info/all", status: getFailureStatus(personalRes) },
          { label: "/admin/banks", status: getFailureStatus(banksRes) },
          { label: `/notifications/${adminId}`, status: getFailureStatus(notificationsRes) },
        ]);

        let loadedUsers = [];
        if (usersRes.status === "fulfilled") {
          loadedUsers = mergeUsersById(asList(usersRes.value), readLocalDealerUsers());
          setUsers(loadedUsers);
          setAllUsers(loadedUsers);
        } else if (usersRes.reason?.response?.status === 403) {
          setUsers([]);
          setAllUsers([]);
          setPermissionError("Your current token is not authorized for admin data. Please login again with an ADMIN account.");
          return;
        }
        if (dealersRes.status === "fulfilled") setDealers(asList(dealersRes.value));
        if (dealersRes.reason?.response?.status === 403 && usersRes.status === "rejected") {
          setPermissionError("Admin API access is forbidden for this token. Please login again as ADMIN, or check backend role permissions for admin endpoints.");
          return;
        }
        if (pendingRes.status === "fulfilled") setPendingDocs(asList(pendingRes.value));
        if (verifiedRes.status === "fulfilled") setVerifiedDocs(asList(verifiedRes.value));
        if (personalRes.status === "fulfilled") {
          setPersonalInfos([...asList(personalRes.value), ...readLocalDealerPersonalInfos()]);
        }
        if (banksRes.status === "fulfilled") {
          setBanks(asList(banksRes.value));
        }
        if (notificationsRes.status === "fulfilled") {
          setNotifications(mergeNotifications(readLocalAdminNotifications(), asList(notificationsRes.value)));
        }

        setApiWarnings(failedApis);

        if (loadedUsers.length > 0) {
          setAllDocuments(await fetchDocumentsForUsersInBatches(loadedUsers));
        } else {
          setAllDocuments([]);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [adminId]
  );

  const fetchAdminProfile = useCallback(async () => {
    const endpoints = ["/admin/me", "/admin/profile", "/auth/me", "/admin/current"];
    const results = await Promise.allSettled(endpoints.map((endpoint) => api.get(endpoint)));
    const fulfilled = results.find((result) => {
      if (result.status !== "fulfilled") return false;
      const profile = getProfileData(result.value);
      return Object.keys(profile).length > 0;
    });

    if (!fulfilled) return;

    const profile = normalizeAdminProfile(getProfileData(fulfilled.value));
    setAdmin((prev) => {
      const next = normalizeAdminProfile({ ...prev, ...profile });
      localStorage.setItem("adminData", JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchDocumentLists = useCallback(async () => {
    try {
      const [pendingRes, verifiedRes] = await Promise.allSettled([
        api.get("/documents/pending"),
        api.get("/documents/verified"),
      ]);
      if (isForbiddenResult(pendingRes) || isForbiddenResult(verifiedRes)) {
        setPendingDocs([]);
        setVerifiedDocs([]);
        setApiWarnings((prev) =>
          Array.from(
            new Set([
              ...prev,
              ...getApiFailureSummary([
                { label: "/documents/pending", status: getFailureStatus(pendingRes) },
                { label: "/documents/verified", status: getFailureStatus(verifiedRes) },
              ]),
            ])
          )
        );
        if (users.length > 0) {
          setAllDocuments(await fetchDocumentsForUsersInBatches(users));
        }
        return;
      }
      if (pendingRes.status === "fulfilled") setPendingDocs(asList(pendingRes.value));
      if (verifiedRes.status === "fulfilled") setVerifiedDocs(asList(verifiedRes.value));
      setAllDocuments(await fetchDocumentsForUsersInBatches(users));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to refresh documents.");
    }
  }, [users]);

  useEffect(() => {
    fetchAdminData(true);
  }, [fetchAdminData]);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (permissionError) return;
      fetchDocumentLists();
      api
        .get(`/notifications/${adminId}`)
        .then((res) => setNotifications(mergeNotifications(readLocalAdminNotifications(), asList(res))))
        .catch((error) => {
          if (error?.response?.status === 403) {
            setNotifications(readLocalAdminNotifications());
          }
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [adminId, fetchDocumentLists, permissionError]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("adminData");
    navigate("/", { replace: true });
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    setAssigningBank(false);
    setAssignBankId(String(user.bankId || user.assignedBankId || readAssignedBankId(user.userId) || ""));
    try {
      const [docsRes, countsRes] = await Promise.all([
        api.get(`/documents/user/${user.userId}`),
        api.get(`/documents/count/${user.userId}`),
      ]);
      setSelectedUserDocs(unwrap(docsRes) || []);
      setSelectedUserCounts(unwrap(countsRes) || null);
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
    const localMatches = readLocalDealerUsers().filter(
      (user) =>
        String(user.fullName || user.name || "").toLowerCase().includes(q) ||
        String(user.email || "").toLowerCase().includes(q) ||
        String(user.mobileNumber || user.mobile || "").includes(q)
    );
    const cachedMatches = allUsers.filter(
      (user) =>
        String(user.fullName || user.name || "").toLowerCase().includes(q) ||
        String(user.email || "").toLowerCase().includes(q) ||
        String(user.mobileNumber || user.mobile || "").includes(q)
    );

    try {
      const res = await api.get(`/user/search?name=${encodeURIComponent(searchName.trim())}`);
      setUsers(mergeUsersById(asList(res), cachedMatches, localMatches));
    } catch (error) {
      const fallbackMatches = mergeUsersById(cachedMatches, localMatches);
      if (fallbackMatches.length > 0) {
        setUsers(fallbackMatches);
      } else {
        toast.error(error?.response?.data?.message || "User search failed.");
      }
    }
  };

  const deleteUserFromDb = async (userId) => {
    const attempts = [
      () => api.delete(`/user/${userId}`),
      () => api.delete(`/user/delete/${userId}`),
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

  const deleteUser = async (user) => {
    const userId = user?.userId || user?.id;
    if (!userId) {
      toast.error("Unable to delete user: missing user id.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.fullName || "this user"} and all related data permanently?`
    );
    if (!confirmed) return;

    try {
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
      setPaymentVersion((prev) => prev + 1);
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
    );
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
      const approvalResult = await approveDocuments(docsToApprove);
      localStorage.setItem(`user_bank_assignment_${selectedUser.userId}`, String(assignBankId));
      localStorage.setItem(
        getAssignedBankDetailKey(selectedUser.userId),
        JSON.stringify({
          bankId: Number(assignBankId),
          assignedBankId: Number(assignBankId),
          bankName: assignedBank?.bankName || "Assigned",
          assignedBankName: assignedBank?.bankName || "Assigned",
          representativeName: assignedBank?.representativeName || "",
          email: assignedBank?.email || "",
          contactNumber: assignedBank?.contactNumber || "",
        })
      );
      const approvedCount = approvalResult.approved || docsToApprove.filter((doc) => doc.status !== "APPROVED").length;
      addLocalDealerNotification({
        dealerId: selectedDealer?.dealerId || selectedDealer?.id || selectedUser.dealerId || selectedUser.assignedDealerId,
        dealerCode: selectedDealer?.dealerCode || selectedUser.dealerCode,
        message: `${selectedUser.fullName || "Customer"} has been assigned to ${
          assignedBank?.bankName || "a bank"
        }. ${approvedCount || "All"} document(s) were approved by admin.`,
      });
      addLocalCustomerNotification({
        userId: selectedUser.userId,
        message:
          approvedCount > 1
            ? `All documents approved by admin. Your application has been forwarded to ${assignedBank?.bankName || "a bank"}.`
            : `Your ${formatDocumentType(docsToApprove[0]?.documentType)} was approved by admin. Your application has been forwarded to ${assignedBank?.bankName || "a bank"}.`,
      });
      if (approvalResult.failed > 0) {
        toast.warning(`Bank assigned, but ${approvalResult.failed} document(s) could not be auto-approved.`);
      } else if (approvalResult.approved > 0) {
        toast.success(`Bank assigned, dealer notified, and ${approvalResult.approved} document(s) approved.`);
      } else {
        toast.success("Bank assigned and dealer notified.");
      }
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
        setSelectedUserDocs(docsToApprove.map((doc) => ({ ...doc, status: "APPROVED", remarks: "" })));
      }
      setSelectedUser((prev) => (prev ? { ...prev, ...bankFields } : prev));
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === selectedUser.userId ? { ...user, ...bankFields } : user
        )
      );
      const approvedDocs = docsToApprove.map((doc) => ({ ...doc, status: "APPROVED", remarks: "" }));
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
      await api.put(`/documents/status/${doc.documentId}?status=${status}`);
      const userId = getDocumentOwnerId(doc);
      const user = users.find((item) => String(item.userId) === String(userId));
      const documentName = formatDocumentType(doc.documentType);
      const message =
        status === "APPROVED"
          ? `Your ${documentName} was approved by admin.`
          : `${documentName} marked ${status}.`;
      addLocalCustomerNotification({ userId, message });
      if (user) {
        const dealer = dealers.find(
          (item) =>
            String(item.dealerCode || "").toLowerCase() === String(user.dealerCode || "").toLowerCase() ||
            String(item.dealerId || item.id || "") === String(user.dealerId || user.assignedDealerId || "")
        );
        addLocalDealerNotification({
          dealerId: dealer?.dealerId || dealer?.id || user.dealerId || user.assignedDealerId,
          dealerCode: dealer?.dealerCode || user.dealerCode,
          message: `${user.fullName || "Customer"}: ${message}`,
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
      const message = `Admin added a remark on ${doc?.documentType || "your document"}${remark ? `: ${remark}` : "."}`;
      addLocalCustomerNotification({ userId, message });
      if (user) {
        const dealer = dealers.find(
          (item) =>
            String(item.dealerCode || "").toLowerCase() === String(user.dealerCode || "").toLowerCase() ||
            String(item.dealerId || item.id || "") === String(user.dealerId || user.assignedDealerId || "")
        );
        addLocalDealerNotification({
          dealerId: dealer?.dealerId || dealer?.id || user.dealerId || user.assignedDealerId,
          dealerCode: dealer?.dealerCode || user.dealerCode,
          message: `${user.fullName || "Customer"} received a document remark.`,
        });
      }
      toast.success("Remark saved.");
      await fetchDocumentLists();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save remark.");
    }
  };

  const openPreview = async (documentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8081/api/documents/preview/${documentId}`, {
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
        await markPaymentSuccess(userId);
      }
      writePaymentStatus(userId, status);
      writePaymentRequest(userId, status);
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
      setPaymentVersion((prev) => prev + 1);
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
          personalInfo={personalInfos.find((info) => String(info.userId) === String(selectedUser?.userId))}
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
          approvePayment={(userId) => updatePaymentRequest(userId, PAYMENT_STATUS.PAYMENT_APPROVED)}
          rejectPayment={(userId) => updatePaymentRequest(userId, PAYMENT_STATUS.PAYMENT_REJECTED)}
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
        verifiedDocs={effectiveVerifiedDocs}
        personalInfos={personalInfos}
        pendingPaymentRequests={pendingPaymentRequests}
        setActiveMenu={setActiveMenu}
      />
    );
  };

  return (
    <div className="flex min-h-dvh bg-[#F4F6F9] text-slate-800">
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
                <h3 className="font-bold text-[#0B2A4A] mb-3">Notifications</h3>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No notifications.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => markNotificationRead(item.id)}
                        className={`w-full text-left rounded-2xl p-3 text-sm ${
                          item.read ? "bg-slate-50" : "bg-[#EAFBF8]"
                        }`}
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

      {preview && <PreviewModal preview={preview} closePreview={closePreview} />}

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

const PaymentsPanel = ({ paymentRequests, approvePayment, rejectPayment }) => {
  const [detailRequest, setDetailRequest] = useState(null);

  return (
  <div className="space-y-6">
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Payment Requests</h2>
          <p className="text-sm text-slate-500 mt-1">
            Verify Ready2Drive payments submitted by customers.
          </p>
        </div>
        <div className="bg-[#EAFBF8] text-[#0B2A4A] px-4 py-3 rounded-2xl text-sm font-bold">
          {paymentRequests.filter((request) => request.status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING).length} pending verification
        </div>
      </div>

      {paymentRequests.length === 0 ? (
        <div className="bg-[#F4F6F9] rounded-2xl p-4 sm:p-6 text-sm text-slate-500">
          No payment requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {paymentRequests.map((request) => {
            const { user, status, personalInfo, documentCount, updatedAt } = request;
            const paymentBreakdown = getPaymentBreakdown(request);
            const canReview =
              status === PAYMENT_STATUS.PAYMENT_PENDING ||
              status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING ||
              status === PAYMENT_STATUS.PAYMENT_APPROVED;
            return (
              <div
                key={user.userId}
                className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-left text-lg font-bold text-[#0B2A4A]">
                      {user.fullName || `User ${user.userId}`}
                    </p>
                    <PaymentStatusBadge status={status} />
                  </div>
                  <p className="text-sm text-slate-500 mt-1 break-all">{user.email}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-[#F4F6F9] rounded-2xl p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Ready2Drive Amount</p>
                      <p className="font-bold text-[#0B2A4A]">
                        {formatINR(paymentBreakdown.payableAmount)}
                      </p>
                    </div>
                    <div className="bg-[#F4F6F9] rounded-2xl p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Documents</p>
                      <p className="font-bold text-[#0B2A4A]">{documentCount}</p>
                    </div>
                    <div className="bg-[#F4F6F9] rounded-2xl p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">User ID</p>
                      <p className="font-bold text-[#0B2A4A]">{user.userId}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setDetailRequest(request)}
                    className="bg-[#F4F6F9] text-[#0B2A4A] px-4 py-3 rounded-2xl font-bold"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => approvePayment(user.userId)}
                    disabled={!canReview}
                    className="bg-emerald-600 text-white px-4 py-3 rounded-2xl font-bold disabled:opacity-50"
                  >
                    {status === PAYMENT_STATUS.PAYMENT_APPROVED ? "Sync Documents" : "Approve Payment"}
                  </button>
                  {status !== PAYMENT_STATUS.PAYMENT_APPROVED && (
                    <button
                      onClick={() => rejectPayment(user.userId)}
                      disabled={!canReview}
                      className="bg-red-600 text-white px-4 py-3 rounded-2xl font-bold disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    {detailRequest && (
      <PaymentDetailsModal request={detailRequest} onClose={() => setDetailRequest(null)} />
    )}
  </div>
  );
};

const PaymentDetailsModal = ({ request, onClose }) => {
  const { user, status, personalInfo, documentCount, updatedAt } = request;
  const approvedAt = status === PAYMENT_STATUS.PAYMENT_APPROVED ? updatedAt : "";
  const paymentBreakdown = getPaymentBreakdown(request);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-[#0B2A4A]">Payment Details</h2>
            <p className="text-sm text-slate-500 mt-1">{user.fullName || `User ${user.userId}`}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-600 font-bold">Close</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Name", user.fullName || "N/A"],
            ["Email", user.email || "N/A"],
            ["Mobile", user.mobileNumber || "N/A"],
            ["Payment Status", formatPaymentStatus(status)],
            ["Plan", paymentBreakdown.feeName],
            ["Base Amount", formatINR(paymentBreakdown.feeBaseAmount)],
            [READY2DRIVE_GST_LABEL, formatINR(paymentBreakdown.gstAmount)],
            ["Total Amount", formatINR(paymentBreakdown.payableAmount)],
            ["Documents", documentCount || 0],
            ["Payment Requested", formatDate(updatedAt)],
            ["Payment Approved", approvedAt ? formatDate(approvedAt) : "Not approved yet"],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#F4F6F9] rounded-2xl p-4">
              <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
              <p className="mt-1 font-bold text-[#0B2A4A] break-words">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardOverview = ({
  users,
  dealers,
  pendingDocs,
  verifiedDocs,
  personalInfos,
  pendingPaymentRequests,
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
      label: "Payment Requests",
      value: pendingPaymentRequests.length,
      icon: <FaRupeeSign />,
      items: pendingPaymentRequests.map(({ user, status }) => ({
        title: user.fullName || `User #${user.userId}`,
        subtitle: status,
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
      label: "Verified Documents",
      value: verifiedDocs.length,
      icon: <FaCheck />,
      items: verifiedDocs.map((doc) => ({
        title: doc.fileName || doc.documentType || `Document #${doc.documentId}`,
        subtitle: doc.documentType || "Verified",
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

      {pendingPaymentRequests.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-sky-800">Payment requests need verification</h2>
            <p className="text-sm text-sky-700 mt-1">
              {pendingPaymentRequests.length} customer payment request(s) waiting.
            </p>
          </div>
          <button
            onClick={() => setActiveMenu("Payments")}
            className="bg-[#0B2A4A] text-white rounded-2xl px-5 py-3 font-bold"
          >
            Go to Payments
          </button>
        </div>
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

export default Dashboard;

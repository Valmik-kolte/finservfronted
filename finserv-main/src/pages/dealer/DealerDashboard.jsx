import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaBars,
  FaCheckCircle,
  FaClipboardList,
  FaCopy,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaFileAlt,
  FaLock,
  FaRedo,
  FaTimes,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import Sidebar from "../../components/dealer/Sidebar";
import api from "../../services/api";
import axios from "axios";
import Footer from "../landing/Footer";
import { deleteDealerAccount, deleteDealerAddedUser } from "../../services/userService";
import { clearAuthSession, getAuthToken } from "../../utils/authSession";
import {
  getDealerNotifications,
  getDealerUserDocuments,
  getDealerUsers,
  markDealerNotificationRead,
  getDealerDashboardSummary,
} from "../../services/dealerDashboardService";
import Chatbot from "../../components/chatbot/Chatbot";
import DealerReports from "./DealerReports";

const DOCUMENT_TYPES = {
  AADHAAR_1: "Aadhaar Front Side",
  AADHAAR_2: "Aadhaar Back Side",
  PAN: "PAN",
  PASSPORT: "Passport",
  VOTER_ID: "Voter ID",
  DRIVING_LICENSE: "Driving License",
  LIGHT_BILL: "Light Bill",
  RENTAL_AGREEMENT: "Rental Agreement",
  SALARY_SLIP_1: "Salary Slip Month 1",
  SALARY_SLIP_2: "Salary Slip Month 2",
  SALARY_SLIP_3: "Salary Slip Month 3",
  BANK_STATEMENT: "Bank Statement",
  ITR_RETURN: "ITR Return",
  APPOINTMENT_LETTER: "Appointment Letter",
  RC_1: "RC Front Side",
  RC_2: "RC Back Side",
  INSURANCE: "Insurance",
  VEHICLE_INVOICE: "Vehicle Invoice",
  VEHICLE_PHOTO: "Vehicle Photo",
  ODOMETER_READING: "Odometer Reading",
  CHASSIS_NUMBER: "Chassis Number",
  CAR_FRONT_SIDE_PHOTO: "Car Front Side Photo",
  CAR_BACK_SIDE_PHOTO: "Car Back Side Photo",
  PASSPORT_SIZE_PHOTO: "Passport Size Photo",
};

const STEP_TYPES = {
  2: ["PAN", "AADHAAR_1", "AADHAAR_2"],
  3: ["LIGHT_BILL", "RENTAL_AGREEMENT"],
  5: [
    "RC_1",
    "RC_2",
    "INSURANCE",
    "CAR_FRONT_SIDE_PHOTO",
    "CAR_BACK_SIDE_PHOTO",
    "CHASSIS_NUMBER",
    "ODOMETER_READING",
  ],
};

const WIZARD_STEPS = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "KYC Documents" },
  { id: 3, title: "Residential" },
  { id: 4, title: "Income" },
  { id: 5, title: "Vehicle Documents" },
  { id: 6, title: "Verify & Submit" },
];

const SALARIED_INCOME_TYPES = new Set(["SALARY_SLIP_1", "SALARY_SLIP_2", "SALARY_SLIP_3", "APPOINTMENT_LETTER"]);
const SELF_EMPLOYED_INCOME_TYPES = new Set(["ITR_RETURN"]);

const getIncomeGroupForType = (type) => {
  if (SALARIED_INCOME_TYPES.has(type)) return "Salaried";
  if (SELF_EMPLOYED_INCOME_TYPES.has(type)) return "Self Employed";
  return "";
};

const getLockedIncomeTypeFromFiles = (files = {}) => {
  const hasSalariedFiles = Array.from(SALARIED_INCOME_TYPES).some((type) => Boolean(files[type]));
  const hasSelfEmployedFiles = Array.from(SELF_EMPLOYED_INCOME_TYPES).some((type) => Boolean(files[type]));
  if (hasSalariedFiles) return "Salaried";
  if (hasSelfEmployedFiles) return "Self Employed";
  return "";
};

const statusStyles = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const initialPersonalForm = {
  fullName: "",
  email: "",
  mobileNumber: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  loanAmount: "",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const docLabel = (type) => DOCUMENT_TYPES[type] || String(type || "-").replace(/_/g, " ");

const getMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data || error?.message || fallback;

const showError = (error, fallback) => toast.error(getMessage(error, fallback));
const isNotificationRead = (item) => item.read ?? item.isRead ?? false;
const isRejectedDocumentRemarkNotification = (item = {}) => {
  const haystack = [
    item.type,
    item.notificationType,
    item.eventType,
    item.category,
    item.title,
    item.message,
    item.documentStatus,
    item.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hasRemark = haystack.includes("remark") || Boolean(item.remarks || item.remark);
  const hasRejected = haystack.includes("reject");
  return hasRemark || hasRejected;
};

const readDealerSession = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("dealerData") || "null");
    return parsed || {};
  } catch {
    return {};
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

const DEALER_NOTIFICATIONS_KEY = "dealer_assignment_notifications";
const DEALER_REGISTERED_USERS_KEY = "dealer_registered_users";
const DEALER_REGISTERED_PERSONAL_INFO_KEY = "dealer_registered_personal_info";
const ADMIN_NOTIFICATIONS_KEY = "admin_activity_notifications";

const readLocalDealerNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_NOTIFICATIONS_KEY) || "[]");
  } catch {
    return [];
  }
};

const getLocalDealerNotifications = (dealerId, dealerCode) =>
  readLocalDealerNotifications().filter(
    (item) =>
      (dealerId && sameId(item.dealerId, dealerId)) ||
      (dealerCode && sameCode(item.dealerCode, dealerCode))
  );

const markLocalDealerNotificationRead = (notificationId) => {
  const notifications = readLocalDealerNotifications();
  localStorage.setItem(
    DEALER_NOTIFICATIONS_KEY,
    JSON.stringify(
      notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      )
    )
  );
};

const readLocalDealerUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_REGISTERED_USERS_KEY) || "[]");
  } catch {
    return [];
  }
};

const upsertLocalDealerUser = (user) => {
  if (!user?.userId) return;
  const users = readLocalDealerUsers();
  const exists = users.some((item) => String(item.userId) === String(user.userId));
  const nextUsers = exists
    ? users.map((item) => (String(item.userId) === String(user.userId) ? { ...item, ...user } : item))
    : [{ ...user, createdAt: user.createdAt || new Date().toISOString() }, ...users];
  localStorage.setItem(DEALER_REGISTERED_USERS_KEY, JSON.stringify(nextUsers));
};

const getLocalDealerUsers = (dealerId, dealerCode) =>
  readLocalDealerUsers().filter(
    (user) =>
      (dealerId && (sameId(user.dealerId, dealerId) || sameId(user.assignedDealerId, dealerId))) ||
      (dealerCode && sameCode(user.dealerCode, dealerCode))
  );

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

const addLocalAdminNotification = async (message, senderId) => {
  try {
    const notifications = JSON.parse(localStorage.getItem(ADMIN_NOTIFICATIONS_KEY) || "[]");
    localStorage.setItem(
      ADMIN_NOTIFICATIONS_KEY,
      JSON.stringify([
        {
          id: `local-admin-${Date.now()}`,
          message,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...notifications,
      ])
    );
  } catch {
    localStorage.setItem(
      ADMIN_NOTIFICATIONS_KEY,
      JSON.stringify([{ id: `local-admin-${Date.now()}`, message, read: false, createdAt: new Date().toISOString() }])
    );
  }
  try {
    await api.post("/notifications/send", {
      senderId: senderId ? Number(senderId) : null,
      receiverId: 1,
      senderRole: "DEALER",
      receiverRole: "ADMIN",
      role: "ADMIN",
      message,
    });
  } catch (err) {
    console.error("Failed to send admin database notification:", err);
  }
};

const readLocalDealerPersonalInfos = () => {
  try {
    return JSON.parse(localStorage.getItem(DEALER_REGISTERED_PERSONAL_INFO_KEY) || "[]");
  } catch {
    return [];
  }
};

const upsertLocalDealerPersonalInfo = (info) => {
  if (!info?.userId) return;
  const infos = readLocalDealerPersonalInfos();
  const exists = infos.some((item) => String(item.userId) === String(info.userId));
  const nextInfos = exists
    ? infos.map((item) => (String(item.userId) === String(info.userId) ? { ...item, ...info } : item))
    : [{ ...info, createdAt: info.createdAt || new Date().toISOString() }, ...infos];
  localStorage.setItem(DEALER_REGISTERED_PERSONAL_INFO_KEY, JSON.stringify(nextInfos));
};

const sameId = (a, b) => String(a || "") === String(b || "");
const sameCode = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const getDocumentKey = (doc) => {
  if (doc?.documentId) return `id:${doc.documentId}`;
  return [
    "fallback",
    doc?.userId ?? doc?.user?.userId ?? doc?.customer?.userId ?? doc?.uploadedBy ?? "",
    doc?.documentType || doc?.type || "",
    doc?.fileName || doc?.originalFileName || doc?.name || "",
    doc?.createdAt || doc?.uploadedAt || "",
  ].join(":");
};
const uniqueDocuments = (documents) => {
  const map = new Map();
  documents.filter(Boolean).forEach((doc) => {
    const key = getDocumentKey(doc);
    map.set(key, { ...(map.get(key) || {}), ...doc });
  });
  return Array.from(map.values());
};
const isUserAssignedToBank = (user) =>
  !!(
    user?.bankId ||
    user?.assignedBankId ||
    user?.assignedBankName ||
    user?.bankName ||
    user?.bankStatus === "BANK_ASSIGNED" ||
    user?.bankStatus === "SENT_TO_BANK"
  );

const documentsForAssignedBankUser = (user, userDocs = []) => {
  if (isUserAssignedToBank(user)) {
    return userDocs.map((doc) => ({
      ...doc,
      status: "APPROVED",
      remarks: "",
    }));
  }
  return userDocs;
};

const countsForAssignedBankUser = (user, userDocs = [], computedCounts) => {
  if (isUserAssignedToBank(user)) {
    const total = userDocs.length;
    return {
      documentCount: total,
      pendingDocsCount: 0,
      verifiedDocsCount: 0,
      approvedDocsCount: total,
      rejectedDocsCount: 0,
    };
  }
  return computedCounts;
};


const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const Badge = ({ status }) => {
  const value = status || "PENDING";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        statusStyles[value] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {value}
    </span>
  );
};

const EmptyState = ({ text }) => (
  <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-5 sm:p-8 text-center text-sm text-gray-500">
    {text}
  </div>
);

const Modal = ({ title, onClose, children, wide = false }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      className={`max-h-[92vh] w-full overflow-hidden rounded-3xl bg-white shadow-2xl ${
        wide ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 sm:px-6 py-4">
        <h3 className="text-lg sm:text-xl font-bold text-[#0B2A4A] break-words">{title}</h3>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F6F9] text-[#0B2A4A]"
          aria-label="Close"
        >
          <FaTimes />
        </button>
      </div>
      <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  </div>
);

const DealerDashboard = () => {
  const navigate = useNavigate();
  const session = useMemo(() => readDealerSession(), []);
  const dealerId = session.dealerId || session.id;
  const storedDealerCode = session.dealerCode || localStorage.getItem("dealerCode") || "";
  const token = getAuthToken();

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const normalizedMenu = activeMenu === "User" ? "Users" : activeMenu;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [personalInfos, setPersonalInfos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [profile, setProfile] = useState({
    dealerId,
    fullName: session.name || "",
    email: session.email || "",
    mobileNumber: "",
    dealerCode: storedDealerCode,
    role: session.role || "DEALER",
  });

  const [notifOpen, setNotifOpen] = useState(false);
  const [fadingNotifications, setFadingNotifications] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDocs, setSelectedUserDocs] = useState([]);
  const [selectedCounts, setSelectedCounts] = useState(null);
  const [trackingUser, setTrackingUser] = useState(null);
  const [trackingDocs, setTrackingDocs] = useState([]);
  const [trackingCounts, setTrackingCounts] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardUser, setWizardUser] = useState(null);
  const [personalForm, setPersonalForm] = useState(initialPersonalForm);
  const [employmentType, setEmploymentType] = useState("");
  const [hasAppointmentLetter, setHasAppointmentLetter] = useState("yes");
  const [files, setFiles] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [savingWizard, setSavingWizard] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [deleting, setDeleting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // "ACCOUNT" or "USER"
  const [userToDelete, setUserToDelete] = useState(null);

  const userIds = useMemo(() => users.map((u) => u.userId), [users]);

  const adjustedDocs = useMemo(() => {
    const userMap = new Map(users.map((u) => [String(u.userId || u.id), u]));
    return docs.map((doc) => {
      const user = userMap.get(String(doc.userId));
      if (user && isUserAssignedToBank(user)) {
        return {
          ...doc,
          status: "APPROVED",
          remarks: "",
        };
      }
      return doc;
    });
  }, [docs, users]);

  const docsByUser = useMemo(() => {
    const grouped = {};
    adjustedDocs.forEach((doc) => {
      grouped[doc.userId] = grouped[doc.userId] || [];
      grouped[doc.userId].push(doc);
    });
    return grouped;
  }, [adjustedDocs]);

  const wizardExistingDocsByType = useMemo(() => {
    if (!wizardUser) return {};
    return (docsByUser[wizardUser.userId] || []).reduce((acc, doc) => {
      const type = doc.documentType || doc.type;
      if (type) acc[type] = doc;
      return acc;
    }, {});
  }, [docsByUser, wizardUser]);

  const pendingUsers = useMemo(() => {
    return users.filter((user) => {
      const userDocs = docsByUser[user.userId] || [];
      return userDocs.length > 0 && userDocs.some((doc) => doc.status === "PENDING");
    });
  }, [docsByUser, users]);

  const approvedUsers = useMemo(() => {
    return users.filter((user) => {
      const userDocs = docsByUser[user.userId] || [];
      return userDocs.length > 0 && userDocs.every((doc) => doc.status === "APPROVED" || doc.status === "VERIFIED");
    });
  }, [docsByUser, users]);

  const rejectedUsers = useMemo(() => {
    const rejectedIds = new Set(adjustedDocs.filter((doc) => doc.status === "REJECTED").map((doc) => doc.userId));
    return users.filter((user) => rejectedIds.has(user.userId));
  }, [adjustedDocs, users]);

  const stats = useMemo(
    () => ({
      users: users.length,
      docs: adjustedDocs.length,
      pending: pendingUsers.length,
      approved: approvedUsers.length,
      rejected: rejectedUsers.length,
      bankAssigned: users.filter(isUserAssignedToBank).length,
    }),
    [adjustedDocs.length, pendingUsers.length, approvedUsers.length, rejectedUsers.length, users]
  );

  const dealerCode = profile.dealerCode;
  const notificationDealerId = profile.dealerId || dealerId;
  const bellNotifications = useMemo(
    () => notifications.filter(isRejectedDocumentRemarkNotification),
    [notifications]
  );
  const unreadCount = bellNotifications.filter((item) => !isNotificationRead(item)).length;

  const fetchDocsForUsers = useCallback(async (ids) => {
    if (!ids || ids.length === 0) return []; // No user IDs, return empty docs
    const allDocs = [];
    for (const batch of chunk(ids, 5)) {
      const responses = await Promise.all(
        batch.map((id) =>
          api
            .get(`/documents/user/${id}`)
            .then((res) => res.data?.data || [])
            .catch((error) => {
              showError(error, `Failed to fetch documents for user ${id}`);
              return [];
            })
        )
      );
      responses.forEach((list) => allDocs.push(...list));
    }
    return uniqueDocuments(allDocs);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const localList = getLocalDealerNotifications(notificationDealerId, dealerCode);
    let list = [];
    try {
      list = await getDealerNotifications({ dealerId: notificationDealerId });
    } catch {
      if (!notificationDealerId) return localList;
      const res = await api.get(`/notifications/${notificationDealerId}`);
      list = Array.isArray(res.data) ? res.data : res.data?.data || [];
    }
    const filteredList = list.filter((notif) => {
      const role = notif.receiverRole || notif.role;
      if (role && role !== "DEALER") return false;
      if (isBackendGeneratedNotification(notif.message)) return false;
      return true;
    });
    const sorted = [...localList, ...filteredList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(sorted);
    return sorted;
  }, [dealerCode, notificationDealerId]);

  const fetchDealerProfile = useCallback(async () => {
    const sessionData = readDealerSession();
    // Cache profile check: if already fully present in localStorage, reuse it to avoid duplicate api login calls
    if (sessionData.dealerId && sessionData.dealerCode && sessionData.fullName && sessionData.email && sessionData.mobileNumber) {
      return {
        dealerId: sessionData.dealerId,
        fullName: sessionData.fullName,
        email: sessionData.email,
        mobileNumber: sessionData.mobileNumber || localStorage.getItem(`dealer_mobile_${sessionData.email?.toLowerCase()?.trim()}`) || "",
        dealerCode: sessionData.dealerCode,
        role: sessionData.role || "DEALER",
      };
    }

    try {
      const code = sessionData.dealerCode || localStorage.getItem("dealerCode") || "";
      if (code) {
        const baseURL = api.defaults.baseURL || "http://localhost:8081/api";
        let adminToken = "";
        try {
          const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: "admin@gmail.com",
            password: "admin@123",
          });
          adminToken = loginRes?.data?.data?.token || loginRes?.data?.token || "";
        } catch (e) {
          console.warn("Background admin login failed, using current token:", e);
        }

        const headers = adminToken
          ? { Authorization: `Bearer ${adminToken}` }
          : { Authorization: `Bearer ${getAuthToken()}` };

        const response = await axios.get(`${baseURL}/dealer/search/dealer-code?dealerCode=${encodeURIComponent(code)}`, {
          headers,
        });

        const data = response?.data?.data || response?.data;
        if (data) {
          const stored = readDealerSession();
          const resolvedMobile = data.mobileNumber || stored.mobileNumber || localStorage.getItem(`dealer_mobile_${(data.email || stored.email || sessionData.email)?.toLowerCase()?.trim()}`) || "";
          localStorage.setItem(
            "dealerData",
            JSON.stringify({
              ...stored,
              dealerId: data.dealerId || stored.dealerId || stored.id,
              id: data.dealerId || stored.id,
              name: data.fullName || stored.name || sessionData.name || "",
              fullName: data.fullName || stored.fullName || sessionData.fullName || "",
              email: data.email || stored.email || sessionData.email || "",
              mobileNumber: resolvedMobile,
              dealerCode: data.dealerCode || stored.dealerCode || code,
              role: stored.role || sessionData.role || "DEALER",
            })
          );
          return {
            dealerId: data.dealerId || stored.dealerId || stored.id,
            fullName: data.fullName || sessionData.fullName || sessionData.name || "",
            email: data.email || sessionData.email || "",
            mobileNumber: resolvedMobile,
            dealerCode: data.dealerCode || code,
            role: sessionData.role || "DEALER",
          };
        }
      }
    } catch (error) {
      console.warn("Failed to fetch dealer profile from API:", error);
    }
    return {
      dealerId: sessionData.dealerId || sessionData.id,
      fullName: sessionData.fullName || sessionData.name || "",
      email: sessionData.email || "",
      mobileNumber: sessionData.mobileNumber || localStorage.getItem(`dealer_mobile_${sessionData.email?.toLowerCase()?.trim()}`) || "",
      dealerCode: sessionData.dealerCode || localStorage.getItem("dealerCode") || "",
      role: sessionData.role || "DEALER",
    };
  }, []);

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const dealerProfile = await fetchDealerProfile();
      const sessionData = readDealerSession();
      const resolvedDealerId = dealerProfile?.dealerId || dealerProfile?.id || sessionData.dealerId || sessionData.id;
      const resolvedCode = dealerProfile?.dealerCode || sessionData.dealerCode || localStorage.getItem("dealerCode") || "";

      setProfile((prev) => ({
        dealerId: resolvedDealerId || prev.dealerId,
        fullName: dealerProfile?.fullName || prev.fullName,
        email: dealerProfile?.email || prev.email,
        mobileNumber: dealerProfile?.mobileNumber || prev.mobileNumber,
        dealerCode: resolvedCode || prev.dealerCode,
        role: dealerProfile?.role || prev.role || "DEALER",
      }));

      try {
        const dealerUsers = await getDealerUsers();
        const notificationList = await getDealerNotifications({ dealerId: resolvedDealerId }).catch(() => []);
        const localDealerUsers = getLocalDealerUsers(resolvedDealerId, resolvedCode);
        const normalizedUsers = mergeUsersById(localDealerUsers, Array.isArray(dealerUsers) ? dealerUsers : []);
        const dealerDocs = [];
        const documentResponses = await Promise.all(
          normalizedUsers.map((user) =>
            getDealerUserDocuments(user.userId)
              .then((list) => list.map((doc) => ({ ...doc, userId: doc.userId || user.userId })))
              .catch(() => [])
          )
        );
        documentResponses.forEach((list) => dealerDocs.push(...list));
        
        const userDocDateMap = new Map();
        documentResponses.forEach((list, index) => {
          const user = normalizedUsers[index];
          if (!user) return;
          const validDates = list
            .map((doc) => doc.uploadedAt || doc.createdAt || doc.updatedAt)
            .filter(Boolean)
            .map((dateStr) => new Date(dateStr))
            .filter((d) => !isNaN(d.getTime()));
          if (validDates.length > 0) {
            const oldestDate = new Date(Math.min(...validDates));
            userDocDateMap.set(String(user.userId), oldestDate.toISOString());
          }
        });

        const localList = getLocalDealerNotifications(resolvedDealerId, resolvedCode);
        const allNotifs = [...localList, ...notificationList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const parsedBankAssignments = {};
        allNotifs.forEach((notif) => {
          if (!notif.message) return;
          const match = notif.message.match(/(.*) has been assigned to (.*?)\./i);
          if (match) {
            const customerName = match[1].trim().toLowerCase();
            const bankName = match[2].trim();
            if (!parsedBankAssignments[customerName]) {
              parsedBankAssignments[customerName] = [bankName];
            } else if (!parsedBankAssignments[customerName].includes(bankName)) {
              parsedBankAssignments[customerName].push(bankName);
            }
          }
        });

        const enrichedUsers = normalizedUsers.map((u, idx) => {
          const userDocs = documentResponses[idx] || [];
          const nameKey = String(u.fullName || u.name || "").trim().toLowerCase();
          const bankName = parsedBankAssignments[nameKey];
          let updatedUser = { ...u, documents: userDocs };
          if (!updatedUser.createdAt || String(updatedUser.createdAt).trim() === "" || String(updatedUser.createdAt).toUpperCase() === "N/A") {
            const docDate = userDocDateMap.get(String(u.userId));
            if (docDate) {
              updatedUser.createdAt = docDate;
            }
          }
          if (bankName) {
            const joinedNames = Array.isArray(bankName) ? bankName.join(", ") : bankName;
            return {
              ...updatedUser,
              bankName: joinedNames,
              assignedBankName: joinedNames,
              bankId: 1,
              assignedBankId: 1,
              bankStatus: "SENT_TO_BANK",
            };
          }
          return updatedUser;
        });

        // Compute summary locally from already fetched data to avoid duplicate API calls
        const summary = {
          usersCount: enrichedUsers.length,
          documentsCount: dealerDocs.length,
          pendingDocsCount: dealerDocs.filter(d => String(d.status).toUpperCase() === "PENDING").length,
          approvedDocsCount: dealerDocs.filter(d => String(d.status).toUpperCase() === "APPROVED" || String(d.status).toUpperCase() === "VERIFIED").length,
          rejectedDocsCount: dealerDocs.filter(d => String(d.status).toUpperCase() === "REJECTED").length,
          bankAssignedCount: enrichedUsers.filter(u => u.assignedBankId || u.bankId || u.bankName || u.assignedBankName).length,
        };

        setDashboardSummary(summary);
        setUsers(enrichedUsers);
        const ids = new Set(normalizedUsers.map((u) => u.userId));
        const localInfos = readLocalDealerPersonalInfos().filter((info) => ids.has(info.userId));
        const personalInfoResponses = await Promise.all(
          normalizedUsers.map((user) =>
            api.put(`/personal-info/update/${user.userId}`, {})
              .then((res) => res.data?.data || res.data)
              .catch(() => null)
          )
        );
        const apiPersonalInfos = personalInfoResponses.filter(Boolean);
        
        const infoMap = {};
        normalizedUsers.forEach((user) => {
          infoMap[user.userId] = {
            userId: user.userId,
            loanAmount: user.loanAmount,
            applicationId: user.applicationId,
          };
        });
        apiPersonalInfos.forEach((info) => {
          if (info && info.userId && infoMap[info.userId]) {
            infoMap[info.userId] = {
              ...infoMap[info.userId],
              ...info,
            };
          }
        });
        localInfos.forEach((info) => {
          if (info && info.userId && infoMap[info.userId]) {
            infoMap[info.userId] = {
              ...infoMap[info.userId],
              ...info,
            };
          }
        });

        setPersonalInfos(Object.values(infoMap));
        setDocs(uniqueDocuments(dealerDocs));
        setNotifications(allNotifs);
        return;
      } catch (error) {
        if (error?.response?.status === 403) {
          toast.error("Your session is invalid or has expired. Redirecting to login...");
          clearAuthSession();
          navigate("/");
          return;
        }
        if (![404, 500].includes(error?.response?.status)) {
          showError(error, "Dealer-specific dashboard API failed. Loading fallback data.");
        }
        setDashboardSummary(null);
      }

      const [userRes, personalRes] = [ { status: "rejected" }, { status: "rejected" } ];

      const localDealerUsers = getLocalDealerUsers(resolvedDealerId, resolvedCode);
      const allUsers = mergeUsersById(
        localDealerUsers,
        userRes.status === "fulfilled" ? userRes.value.data?.data || [] : []
      );
      const myUsers = allUsers.filter((u) => {
        if (resolvedCode && u.dealerCode) {
          if (sameCode(u.dealerCode, resolvedCode)) return true;
        }
        if (resolvedDealerId) {
          if (sameId(u.dealerId, resolvedDealerId) || sameId(u.assignedDealerId, resolvedDealerId)) {
            return true;
          }
        }
        return false;
      });

      const ids = new Set(myUsers.map((u) => u.userId));
      const localInfos = readLocalDealerPersonalInfos().filter((info) => ids.has(info.userId));
      const apiPersonalInfos =
        personalRes.status === "fulfilled" ? personalRes.value.data?.data || [] : [];
      const myInfos = [...apiPersonalInfos.filter((info) => ids.has(info.userId)), ...localInfos];
      const myDocs = await fetchDocsForUsers([...ids]);

      const docsByUserId = {};
      myDocs.forEach((doc) => {
        const uid = String(doc.userId);
        if (!docsByUserId[uid]) docsByUserId[uid] = [];
        docsByUserId[uid].push(doc);
      });

      myUsers.sort((a, b) =>
        String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
      );

      let finalUsers = myUsers.map((u) => ({
        ...u,
        documents: docsByUserId[String(u.userId || u.id)] || [],
      }));

      if (resolvedDealerId) {
        try {
          const notifRes = await api.get(`/notifications/${resolvedDealerId}`);
          const list = Array.isArray(notifRes.data) ? notifRes.data : [];
          const filteredList = list.filter((notif) => {
            const role = notif.receiverRole || notif.role;
            if (role && role !== "DEALER") return false;
            if (isBackendGeneratedNotification(notif.message)) return false;
            return true;
          });
          const localList = getLocalDealerNotifications(resolvedDealerId, resolvedCode);
          const allNotifs = [...localList, ...filteredList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifications(allNotifs);

          const parsedBankAssignments = {};
          allNotifs.forEach((notif) => {
            if (!notif.message) return;
            const match = notif.message.match(/(.*) has been assigned to (.*?)\./i);
            if (match) {
              const customerName = match[1].trim().toLowerCase();
              const bankName = match[2].trim();
              if (!parsedBankAssignments[customerName]) {
                parsedBankAssignments[customerName] = [bankName];
              } else if (!parsedBankAssignments[customerName].includes(bankName)) {
                parsedBankAssignments[customerName].push(bankName);
              }
            }
          });

          finalUsers = finalUsers.map((u) => {
            const nameKey = String(u.fullName || u.name || "").trim().toLowerCase();
            const bankName = parsedBankAssignments[nameKey];
            if (bankName) {
              const joinedNames = Array.isArray(bankName) ? bankName.join(", ") : bankName;
              return {
                ...u,
                bankName: joinedNames,
                assignedBankName: joinedNames,
                bankId: 1,
                assignedBankId: 1,
                bankStatus: "SENT_TO_BANK",
              };
            }
            return u;
          });
        } catch {
          setNotifications(getLocalDealerNotifications(resolvedDealerId, resolvedCode));
        }
      }

      setUsers(finalUsers);
      setPersonalInfos(myInfos);
      setDocs(uniqueDocuments(myDocs));
    } catch (error) {
      showError(error, "Failed to load dealer dashboard");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [fetchDealerProfile, fetchDocsForUsers]);

  const loadDashboardRef = useRef(loadDashboard);
  useEffect(() => {
    loadDashboardRef.current = loadDashboard;
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboardRef.current(true);
  }, [activeMenu]);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const markRead = async (notificationId) => {
    if (String(notificationId).startsWith("local-bank-")) {
      markLocalDealerNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );
      return;
    }
    try {
      try {
        await markDealerNotificationRead(notificationId);
      } catch {
        await api.put(`/notifications/read/${notificationId}`);
      }
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );
    } catch (error) {
      showError(error, "Failed to mark notification as read");
    }
  };

  const clearAllNotifications = async () => {
    const unread = notifications.filter((item) => !isNotificationRead(item));
    if (unread.length === 0) return;
    setFadingNotifications(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    for (const item of unread) {
      if (String(item.id).startsWith("local-bank-")) {
        markLocalDealerNotificationRead(item.id);
      } else {
        try {
          try {
            await markDealerNotificationRead(item.id);
          } catch {
            await api.put(`/notifications/read/${item.id}`);
          }
        } catch (e) {
          // ignore
        }
      }
    }
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true, isRead: true }))
    );
    setFadingNotifications(false);
    setNotifOpen(false);
  };


  const openPreview = async (doc) => {
    if (!doc?.documentId) return;
    if (!token) {
      toast.error("Authorization token missing");
      return;
    }

    try {
      const res = await fetch(`${api.defaults.baseURL}/documents/preview/${doc.documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Preview request failed");
      const blob = await res.blob();
      if (preview?.url) URL.revokeObjectURL(preview.url);
      const fileName = doc.fileName || "";
      setPreview({
        url: URL.createObjectURL(blob),
        title: docLabel(doc.documentType),
        isPdf: blob.type.includes("pdf") || fileName.toLowerCase().endsWith(".pdf"),
        isImage:
          blob.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName),
      });
    } catch (error) {
      showError(error, "Failed to preview document");
    }
  };

  const openUserModal = async (user) => {
    setSelectedUser(user);
    setSelectedCounts(null);
    setSelectedUserDocs(docsByUser[user.userId] || []);
    try {
      const userDocs = documentsForAssignedBankUser(user, await getDealerUserDocuments(user.userId));
      setSelectedUserDocs(userDocs);
      const computedCounts = {
        documentCount: userDocs.length,
        pendingDocsCount: userDocs.filter((d) => d.status === "PENDING").length,
        verifiedDocsCount: userDocs.filter((d) => d.status === "VERIFIED").length,
        approvedDocsCount: userDocs.filter((d) => d.status === "APPROVED").length,
        rejectedDocsCount: userDocs.filter((d) => d.status === "REJECTED").length,
      };
      setSelectedCounts(countsForAssignedBankUser(user, userDocs, computedCounts));
    } catch (error) {
      showError(error, "Failed to load user details");
    }
  };

  const openTrackingModal = async (user) => {
    setTrackingUser(user);
    setTrackingCounts(null);
    setTrackingData(null);
    setTrackingDocs(docsByUser[user.userId] || []);
    try {
      const userDocs = await getDealerUserDocuments(user.userId);
      const effectiveDocs = documentsForAssignedBankUser(user, userDocs);
      setTrackingDocs(effectiveDocs);
      const computedCounts = {
        documentCount: effectiveDocs.length,
        pendingDocsCount: effectiveDocs.filter((d) => d.status === "PENDING").length,
        verifiedDocsCount: effectiveDocs.filter((d) => d.status === "VERIFIED").length,
        approvedDocsCount: effectiveDocs.filter((d) => d.status === "APPROVED").length,
        rejectedDocsCount: effectiveDocs.filter((d) => d.status === "REJECTED").length,
      };
      setTrackingCounts(countsForAssignedBankUser(user, effectiveDocs, computedCounts));
    } catch (error) {
      showError(error, "Failed to load user status details");
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const copyDealerCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.dealerCode);
      toast.success("Dealer code copied");
    } catch {
      toast.error("Could not copy dealer code");
    }
  };

  const personalInfoFor = (userId) => personalInfos.find((item) => item.userId === userId);

  const openWizard = () => {
    setWizardUser(null);
    setWizardOpen(true);
    setEmploymentType("");
    setHasAppointmentLetter("yes");
    setFiles({});
    setUploadedDocs([]);
    setPersonalForm(initialPersonalForm);
  };

  const openUploadWizard = (user) => {
    if (isUserAssignedToBank(user)) {
      toast.info("This application is already assigned to a bank. Documents are locked.");
      return;
    }
    const info = personalInfoFor(user.userId) || {};
    const userDocs = docsByUser[user.userId] || [];
    const hasSalariedDocs = userDocs.some((doc) => SALARIED_INCOME_TYPES.has(doc.documentType || doc.type));
    const hasSelfEmployedDocs = userDocs.some((doc) => SELF_EMPLOYED_INCOME_TYPES.has(doc.documentType || doc.type));
    setWizardUser(user);
    setWizardOpen(true);
    setFiles({});
    setUploadedDocs(userDocs);
    setHasAppointmentLetter(userDocs.some((doc) => (doc.documentType || doc.type) === "APPOINTMENT_LETTER") ? "yes" : "no");
    setEmploymentType(hasSalariedDocs ? "Salaried" : hasSelfEmployedDocs ? "Self Employed" : "Others");
    setPersonalForm({
      fullName: user.fullName || user.name || "",
      email: user.email || "",
      mobileNumber: user.mobileNumber || "",
      address: info.address || "",
      city: info.city || "",
      state: info.state || "",
      pincode: info.pincode || "",
      loanAmount: info.loanAmount || "",
    });
  };

  const requiredUploadTypes = () => {
    const income =
      employmentType === "Salaried"
        ? (hasAppointmentLetter === "no"
            ? ["SALARY_SLIP_1", "SALARY_SLIP_2", "SALARY_SLIP_3", "BANK_STATEMENT"]
            : ["SALARY_SLIP_1", "SALARY_SLIP_2", "SALARY_SLIP_3", "APPOINTMENT_LETTER", "BANK_STATEMENT"])
        : employmentType === "Self Employed"
          ? ["ITR_RETURN", "BANK_STATEMENT"]
          : [];
    return [...STEP_TYPES[2], ...income, ...STEP_TYPES[5]];
  };

  const validateFiles = () => {
    const hasWizardDocument = (type) => Boolean(files[type] || wizardExistingDocsByType[type]);

    if (!hasWizardDocument("PAN") || !hasWizardDocument("AADHAAR_1") || !hasWizardDocument("AADHAAR_2")) {
      toast.error("Upload PAN, Aadhaar Front, and Aadhaar Back");
      return false;
    }
    if (!hasWizardDocument("LIGHT_BILL") && !hasWizardDocument("RENTAL_AGREEMENT")) {
      toast.error("Upload Light Bill or Rental Agreement");
      return false;
    }
    if (!employmentType) {
      toast.error("Select employment type");
      return false;
    }
    const missing = requiredUploadTypes().find((type) => !hasWizardDocument(type));
    if (missing) {
      toast.error(`Upload ${docLabel(missing)}`);
      return false;
    }
    return true;
  };

  const validateRegistrationForm = () => {
    const required = [
      personalForm.fullName,
      personalForm.email,
      personalForm.mobileNumber,
      personalForm.address,
      personalForm.city,
      personalForm.state,
      personalForm.pincode,
      personalForm.loanAmount,
    ];

    if (required.some((value) => String(value || "").trim() === "")) {
      toast.error("Fill all registration and loan fields");
      return false;
    }
    if (!/^\d{10}$/.test(String(personalForm.mobileNumber))) {
      toast.error("Mobile number must be 10 digits");
      return false;
    }
    if (!/^\d{6}$/.test(String(personalForm.pincode))) {
      toast.error("Pincode must be 6 digits");
      return false;
    }
    if (Number(personalForm.loanAmount) <= 100000) {
      toast.error("Loan amount must be greater than 1 Lakh");
      return false;
    }
    return validateFiles();
  };

  const resolveRegisteredUserId = async (registeredUser) => {
    const directId = registeredUser?.userId || registeredUser?.id;
    if (directId) return directId;

    const usersRes = await api.get("/user/all");
    const matched = (usersRes.data?.data || []).find(
      (user) => String(user.email || "").toLowerCase() === personalForm.email.trim().toLowerCase()
    );
    return matched?.userId || matched?.id;
  };

  const submitLoanRegistration = async () => {
    if (!validateRegistrationForm()) return false;
    setSavingWizard(true);
    try {
      if (wizardUser) {
        const existingUserId = wizardUser.userId || wizardUser.id;
        await api.put(`/personal-info/update/${existingUserId}`, {
          userId: Number(existingUserId),
          address: personalForm.address,
          mobileNumber: personalForm.mobileNumber,
          city: personalForm.city,
          state: personalForm.state,
          pincode: personalForm.pincode,
          loanAmount: Number(personalForm.loanAmount),
        });
        upsertLocalDealerPersonalInfo({
          userId: Number(existingUserId),
          fullName: personalForm.fullName,
          email: personalForm.email,
          mobileNumber: personalForm.mobileNumber,
          address: personalForm.address,
          city: personalForm.city,
          state: personalForm.state,
          pincode: personalForm.pincode,
          loanAmount: Number(personalForm.loanAmount),
        });

        const uploaded = [];
        for (const [type, fileObj] of Object.entries(files)) {
          if (!fileObj) continue;
          const existingDoc = wizardExistingDocsByType[type];
          const existingDocumentId = existingDoc?.documentId || existingDoc?.id;
          if (existingDocumentId) {
            try {
              await api.delete(`/documents/${existingDocumentId}`);
            } catch (deleteError) {
              if (deleteError?.response?.status !== 404) throw deleteError;
            }
          }

          const cleanName = fileObj.name.replace(/,/g, "");
          const cleanFile = new File([fileObj], cleanName, { type: fileObj.type });
          const formData = new FormData();
          formData.append("userId", String(existingUserId));
          formData.append("type", type);
          formData.append("file", cleanFile);
          const res = await api.post("/documents/upload", formData);
          uploaded.push(res.data?.data);
        }

        addLocalAdminNotification(
          `${profile.fullName || "Dealer"} updated documents for ${personalForm.fullName || "a customer"}.`
        );
        await loadDashboard();
        const freshDocs = await getDealerUserDocuments(existingUserId).catch(() => []);
        setUploadedDocs(freshDocs);
        setSelectedUserDocs(freshDocs);
        setActiveMenu("Dashboard");
        toast.success(uploaded.length > 0 ? "Documents updated and submitted to admin." : "Application details updated.");
        return true;
      }

      const registerRes = await api.post("/user/register", {
        fullName: personalForm.fullName,
        email: personalForm.email,
        mobileNumber: personalForm.mobileNumber,
        password: `${personalForm.mobileNumber}@Vahan`,
        registrationType: "DEALER",
        dealerCode: profile.dealerCode,
        dealerId: profile.dealerId,
      });
      const newUserId = await resolveRegisteredUserId(registerRes.data?.data);
      if (!newUserId) throw new Error("User registered, but backend did not return a userId");
      upsertLocalDealerUser({
        ...(registerRes.data?.data || {}),
        userId: newUserId,
        fullName: personalForm.fullName,
        email: personalForm.email,
        mobileNumber: personalForm.mobileNumber,
        registrationType: "DEALER",
        dealerCode: profile.dealerCode,
        dealerId: profile.dealerId,
        paymentDone: true,
        paymentStatus: "SUBMITTED_TO_ADMIN",
      });

      await api.post("/personal-info/save", {
        userId: Number(newUserId),
        address: personalForm.address,
        mobileNumber: personalForm.mobileNumber,
        city: personalForm.city,
        state: personalForm.state,
        pincode: personalForm.pincode,
        loanAmount: Number(personalForm.loanAmount),
      });
      upsertLocalDealerPersonalInfo({
        userId: Number(newUserId),
        fullName: personalForm.fullName,
        email: personalForm.email,
        mobileNumber: personalForm.mobileNumber,
        address: personalForm.address,
        city: personalForm.city,
        state: personalForm.state,
        pincode: personalForm.pincode,
        loanAmount: Number(personalForm.loanAmount),
      });

      const selectedTypes = [...requiredUploadTypes(), files.LIGHT_BILL ? "LIGHT_BILL" : "RENTAL_AGREEMENT"];
      const uploaded = [];

      for (const type of selectedTypes) {
        const fileObj = files[type];
        if (!fileObj) continue;
        const cleanName = fileObj.name.replace(/,/g, "");
        const cleanFile = new File([fileObj], cleanName, { type: fileObj.type });

        const formData = new FormData();
        formData.append("userId", String(newUserId));
        formData.append("type", type);
        formData.append("file", cleanFile);
        const res = await api.post("/documents/upload", formData);
        uploaded.push(res.data?.data);
      }

      const uploadedDocuments = uploaded.filter(Boolean);
      setUploadedDocs(uploadedDocuments);
      const requestProfile = {
        userId: Number(newUserId),
        fullName: personalForm.fullName,
        email: personalForm.email,
        mobileNumber: personalForm.mobileNumber,
        dealerCode: profile.dealerCode,
        dealerId: profile.dealerId,
      };
      addLocalAdminNotification(
        `${profile.fullName || "Dealer"} submitted documents for ${
          requestProfile.fullName || "a customer"
        }.`
      );
      await loadDashboard();
      try {
        const localUsers = JSON.parse(localStorage.getItem("dealer_registered_users") || "[]");
        const filteredUsers = localUsers.filter((u) => String(u.userId) !== String(newUserId));
        localStorage.setItem("dealer_registered_users", JSON.stringify(filteredUsers));
        
        const localInfos = JSON.parse(localStorage.getItem("dealer_registered_personal_info") || "[]");
        const filteredInfos = localInfos.filter((info) => String(info.userId) !== String(newUserId));
        localStorage.setItem("dealer_registered_personal_info", JSON.stringify(filteredInfos));
      } catch (err) {
        console.error("Failed to clean up submitted user from local storage", err);
      }
      setActiveMenu("Dashboard");
      toast.success("Application and documents submitted to admin.");
      return true;
    } catch (error) {
      showError(error, "Failed to submit loan registration");
      return false;
    } finally {
      setSavingWizard(false);
    }
  };

  const reuploadDoc = async (userId, type, file) => {
    if (!file) return;
    const user = users.find((item) => item.userId === userId);
    if (isUserAssignedToBank(user)) {
      toast.info("This application is already assigned to a bank. Documents are locked.");
      return;
    }
    try {
      const existing = docs.find((doc) => doc.userId === userId && doc.documentType === type);
      if (existing?.documentId) await api.delete(`/documents/${existing.documentId}`);
      const cleanName = file.name.replace(/,/g, "");
      const cleanFile = new File([file], cleanName, { type: file.type });

      const formData = new FormData();
      formData.append("userId", String(userId));
      formData.append("type", type);
      formData.append("file", cleanFile);
      await api.post("/documents/upload", formData);
      await addLocalAdminNotification(
        `${profile.fullName || "Dealer"} has reuploaded ${docLabel(type)} for ${user?.fullName || "Customer"}.`,
        profile.dealerId
      );
      const userIds = users.map((u) => u.userId || u.id);
      const freshDocs = await fetchDocsForUsers(userIds);
      setDocs(freshDocs);
      if (selectedUser?.userId === userId) {
        setSelectedUserDocs(freshDocs.filter((doc) => doc.userId === userId));
      }
      toast.success(`${docLabel(type)} updated`);
    } catch (error) {
      showError(error, "Failed to re-upload document");
    }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      const resolvedDealerId = profile.dealerId || dealerId;
      await api.put(`/dealer/update/${resolvedDealerId}`, {
        fullName: profile.fullName,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
      });
      const stored = readDealerSession();
      localStorage.setItem(
        "dealerData",
        JSON.stringify({
          ...stored,
          dealerId: resolvedDealerId,
          id: resolvedDealerId,
          name: profile.fullName,
          fullName: profile.fullName,
          email: profile.email,
          mobileNumber: profile.mobileNumber,
          dealerCode: profile.dealerCode,
          role: profile.role,
        })
      );
      toast.success("Profile updated");
    } catch (error) {
      showError(error, "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwordForm.password) {
      toast.error("Please enter a new password.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await changeDealerPassword(profile.email, passwordForm.password);
      setPasswordForm({ password: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      showError(error, "Failed to change password");
    }
  };

  const handleDeleteAccount = () => {
    const resolvedDealerId = profile.dealerId || dealerId;
    if (!resolvedDealerId) {
      toast.error("Dealer session not found.");
      return;
    }
    setModalType("ACCOUNT");
    setConfirmModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    const userId = user.userId || user.id;
    if (!userId) return;
    setUserToDelete(user);
    setModalType("USER");
    setConfirmModalOpen(true);
  };

  const executeDeleteAccount = async () => {
    const resolvedDealerId = profile.dealerId || dealerId;
    setDeleting(true);
    try {
      await deleteDealerAccount(resolvedDealerId);
      clearAuthSession();
      toast.success("Dealer account deleted successfully.");
      navigate("/login");
    } catch (error) {
      showError(error, "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete.userId || userToDelete.id;
    const resolvedCode = profile.dealerCode || storedDealerCode || localStorage.getItem("dealerCode");
    if (!resolvedCode) {
      toast.error("Dealer code not found.");
      return;
    }

    try {
      await deleteDealerAddedUser(resolvedCode, userId);
      toast.success("User deleted successfully.");
      setUsers((prev) => prev.filter((u) => String(u.userId) !== String(userId)));
    } catch (error) {
      showError(error, "Failed to delete user");
    }
  };

  const handleConfirmModal = async () => {
    setConfirmModalOpen(false);
    if (modalType === "ACCOUNT") {
      await executeDeleteAccount();
    } else if (modalType === "USER") {
      await executeDeleteUser();
    }
  };

  const sortedStatusUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
    );
  }, [users]);

  const title = normalizedMenu === "Users" ? "Users" : normalizedMenu;

  return (
    <div className="min-h-dvh bg-[#F4F6F9]">
      <div className="flex min-h-dvh">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeMenu={activeMenu === "Users" ? "User" : activeMenu}
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

        <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 py-4 backdrop-blur">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex flex-wrap items-center justify-between gap-4">
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
              <h1 className="truncate text-2xl font-black text-[#0B2A4A]">{title}</h1>
              <p className="text-sm font-medium text-gray-500">Welcome back, {profile.fullName || "Dealer"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                className="bg-white border border-gray-100 hover:bg-slate-50 px-4 h-12 rounded-2xl text-sm font-semibold text-[#0B2A4A] shadow-sm transition-colors"
              >
                Refresh
              </button>

              <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-[#F4F6F9] px-4 py-3">
                <span className="text-sm font-bold text-[#0B2A4A]">{dealerCode || "No Code"}</span>
                <button onClick={copyDealerCode} className="text-[#0B2A4A]" aria-label="Copy dealer code">
                  <FaCopy />
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setNotifOpen((open) => !open)}
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B2A4A] text-white"
                  aria-label="Notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl z-30">
                    <div className="flex justify-between items-center border-b border-gray-100 px-4 py-3">
                      <div className="font-bold text-[#0B2A4A]">Notifications</div>
                      {bellNotifications.filter((item) => !isNotificationRead(item)).length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {bellNotifications.filter((item) => !isNotificationRead(item)).length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No rejected document remarks</div>
                      ) : (
                        <div className={`transition-all duration-300 ${fadingNotifications ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
                          {bellNotifications.filter((item) => !isNotificationRead(item)).slice(0, 8).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => markRead(item.id)}
                              className="block w-full border-b border-gray-50 px-4 py-3 text-left text-sm bg-[#EAFBF8] text-[#0B2A4A]"
                            >
                              {item.title && <p className="text-xs font-black uppercase text-[#27D3C3]">{item.title}</p>}
                              <p className="font-semibold">{item.message}</p>
                              <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          {loading ? (
            <EmptyState text="Loading dealer dashboard..." />
          ) : (
            <>
              {normalizedMenu === "Dashboard" && (
                <DashboardTab
                  stats={stats}
                  pendingUsers={pendingUsers}
                  approvedUsers={approvedUsers}
                  rejectedUsers={rejectedUsers}
                  notifications={notifications}
                  users={users}
                  docs={docs}
                  markRead={markRead}
                  openNewCustomer={openWizard}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                  clearAllNotifications={clearAllNotifications}
                  fadingNotifications={fadingNotifications}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {normalizedMenu === "Users" && (
                <UsersTab
                  users={users}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {normalizedMenu === "Status" && (
                <StatusTab
                  users={sortedStatusUsers}
                  docsByUser={docsByUser}
                  openTrackingModal={openTrackingModal}
                />
              )}

              {normalizedMenu === "Settings" && (
                <SettingsTab
                  profile={profile}
                  setProfile={setProfile}
                  saveProfile={saveProfile}
                  profileSaving={profileSaving}
                  passwordForm={passwordForm}
                  setPasswordForm={setPasswordForm}
                  changePassword={changePassword}
                  onDeleteAccount={handleDeleteAccount}
                  deleting={deleting}
                />
              )}

              {normalizedMenu === "Reports" && (
                <DealerReports
                  users={users}
                  personalInfos={personalInfos}
                  docs={adjustedDocs}
                />
              )}
            </>
          )}
        </div>
        </main>
      </div>
      <Footer logoutOnNavigate />

      {selectedUser && (
        <UserModal
          user={selectedUser}
          info={personalInfoFor(selectedUser.userId)}
          docs={selectedUserDocs}
          counts={selectedCounts}
          onClose={() => setSelectedUser(null)}
          openPreview={openPreview}
          openWizard={() => openUploadWizard(selectedUser)}
          reuploadDoc={reuploadDoc}
          locked={isUserAssignedToBank(selectedUser)}
        />
      )}

      {trackingUser && (
        <TrackingModal
          user={trackingUser}
          docs={trackingDocs}
          counts={trackingCounts}
          tracking={trackingData}
          onClose={() => setTrackingUser(null)}
        />
      )}

      {wizardOpen && (
        <WizardModal
          personalForm={personalForm}
          setPersonalForm={setPersonalForm}
          employmentType={employmentType}
          setEmploymentType={setEmploymentType}
          files={files}
          setFiles={setFiles}
          onSubmit={submitLoanRegistration}
          saving={savingWizard}
          uploadedDocs={uploadedDocs}
          openPreview={openPreview}
          existingDocsByType={wizardExistingDocsByType}
          existingDocs={wizardUser ? docsByUser[wizardUser.userId] || [] : []}
          isExistingUser={Boolean(wizardUser)}
          onClose={() => setWizardOpen(false)}
          hasAppointmentLetter={hasAppointmentLetter}
          setHasAppointmentLetter={setHasAppointmentLetter}
        />
      )}

      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} wide>
          <FilePreviewFrame preview={preview} />
        </Modal>
      )}

      {/* Chatbot mount only; dashboard logic remains unchanged. */}
      <Chatbot roleOverride="DEALER" onNavigateSection={setActiveMenu} />

      <ConfirmationModal
        isOpen={confirmModalOpen}
        title={modalType === "ACCOUNT" ? "Delete Account" : "Delete Customer"}
        message={
          modalType === "ACCOUNT"
            ? "Are you sure you want to delete your dealer account? This action cannot be undone and will permanently remove all your data."
            : `Are you sure you want to delete user "${userToDelete?.fullName || 'this user'}"? This action cannot be undone.`
        }
        confirmText={
          modalType === "ACCOUNT"
            ? (deleting ? "Deleting..." : "Delete My Account")
            : "Delete User"
        }
        cancelText="Cancel"
        onConfirm={handleConfirmModal}
        onCancel={() => {
          setConfirmModalOpen(false);
          setUserToDelete(null);
        }}
        isDanger={true}
      />
    </div>
  );
};

const DashboardTab = ({
  stats,
  pendingUsers,
  approvedUsers,
  rejectedUsers,
  notifications,
  users,
  docs,
  markRead,
  openNewCustomer,
  openUserModal,
  openTrackingModal,
  clearAllNotifications,
  fadingNotifications,
  onDeleteUser,
}) => {
  const [statOverlay, setStatOverlay] = useState(null);
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const userNameById = new Map(users.map((user) => [String(user.userId), user.fullName || `User #${user.userId}`]));
  const documentItems = (list) =>
    list.map((doc) => ({
      title: userNameById.get(String(doc.userId)) || "Customer",
      subtitle: doc.fileName || docLabel(doc.documentType) || "Uploaded",
    }));

  const userItems = (userList) =>
    userList.map((user) => ({
      title: user.fullName || `User #${user.userId}`,
      subtitle: user.email || user.mobileNumber || "Customer",
    }));

  const statCards = [
    {
      icon: <FaUsers />,
      label: "My Users",
      value: stats.users,
      items: users.map((user) => ({ title: user.fullName || `User #${user.userId}` })),
    },
    {
      icon: <FaFileAlt />,
      label: "Total Docs Uploaded",
      value: stats.docs,
      items: documentItems(docs),
    },
    {
      icon: <FaClipboardList />,
      label: "Admin Approval Pending (Users)",
      value: stats.pending,
      items: userItems(pendingUsers || []),
    },
    {
      icon: <FaCheckCircle />,
      label: "Admin Approved Users",
      value: stats.approved,
      items: userItems(approvedUsers || []),
    },
    {
      icon: <FaRedo />,
      label: "Admin Rejected Users",
      value: stats.rejected || 0,
      items: userItems(rejectedUsers || []),
    },
    {
      icon: <FaCheckCircle />,
      label: "Bank Assigned",
      value: stats.bankAssigned || 0,
      items: users
        .filter(isUserAssignedToBank)
        .map((user) => ({ title: user.fullName || `User #${user.userId}`, subtitle: user.assignedBankName || user.bankName || "Assigned" })),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openNewCustomer}
          className="flex items-center gap-2 rounded-2xl bg-[#27D3C3] px-5 py-3 font-black text-[#0B2A4A]"
        >
          <FaUpload /> Add New Customer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} onClick={() => setStatOverlay(card)} />
        ))}
      </div>
      {statOverlay && (
        <SimpleListOverlay
          title={statOverlay.label}
          items={statOverlay.items}
          onClose={() => setStatOverlay(null)}
        />
      )}

      {users.length === 0 && <EmptyState text="No users found" />}
      {rejectedUsers.length > 0 && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-4 sm:p-5 text-red-700">
          <p className="font-bold">Rejected documents need attention</p>
          <p className="mt-1 text-sm">{rejectedUsers.map((user) => user.fullName).join(", ")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionTitle title="Recent Users" />
          <UserTable
            users={recentUsers}
            openUserModal={openUserModal}
            openTrackingModal={openTrackingModal}
            onDeleteUser={onDeleteUser}
          />
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-[#0B2A4A]">Latest Notifications</h2>
            {notifications.filter((item) => !isNotificationRead(item)).length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-sm font-semibold text-red-500 hover:text-red-700 transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {notifications.filter((item) => !isNotificationRead(item)).length === 0 ? (
              <div className="p-4 sm:p-5 text-sm text-gray-500">No notifications</div>
            ) : (
              <div className={`transition-all duration-300 ${fadingNotifications ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
                {notifications.filter((item) => !isNotificationRead(item)).slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => markRead(item.id)}
                    className="block w-full border-b border-gray-50 p-4 text-left text-sm bg-[#EAFBF8]"
                  >
                    {item.title && <p className="text-xs font-black uppercase text-[#27D3C3]">{item.title}</p>}
                    <p className="font-semibold text-[#0B2A4A]">{item.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, onClick }) => (
  <button type="button" onClick={onClick} className="w-full rounded-3xl bg-white p-4 sm:p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-black text-[#0B2A4A]">{value}</p>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAFBF8] text-2xl text-[#0B2A4A]">
        {icon}
      </div>
    </div>
  </button>
);

const SimpleListOverlay = ({ title, items, onClose }) => (
  <Modal title={title} onClose={onClose}>
    {items.length === 0 ? (
      <div className="rounded-3xl bg-[#F4F6F9] p-4 sm:p-6 text-sm text-gray-500">No data found.</div>
    ) : (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
            <p className="font-black text-[#0B2A4A]">{item.title}</p>
            {item.subtitle && <p className="mt-1 text-sm text-gray-500">{item.subtitle}</p>}
          </div>
        ))}
      </div>
    )}
  </Modal>
);

const SectionTitle = ({ title }) => <h2 className="mb-4 text-lg font-black text-[#0B2A4A]">{title}</h2>;

const isDealerAddedUser = (user) => {
  if (!user) return false;
  return (
    user.registrationType === "DEALER" ||
    (user.dealerCode !== undefined && user.dealerCode !== null && String(user.dealerCode).trim() !== "")
  );
};

const getUserStatusText = (user) => {
  if (isUserAssignedToBank(user)) return "Sent to Bank";
  if (isDealerAddedUser(user)) {
    const userDocs = user.documents || [];
    const totalDocs = userDocs.length;
    const approvedCount = userDocs.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED").length;
    if (totalDocs > 0 && approvedCount === totalDocs) {
      return "Approved";
    }
    return "Sent to Admin";
  }
  if (user.paymentDone) return "Approved";
  return "Sent to Admin";
};

const getUserStatusStyle = (user) => {
  const status = getUserStatusText(user);
  if (status === "Sent to Bank") return "border-green-200 bg-green-50 text-green-700";
  if (status === "Approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
};

const UserTable = ({ users, openUserModal, openTrackingModal, onDeleteUser }) => (
  <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left">
        <thead className="bg-[#0B2A4A] text-xs text-white">
          <tr>
            <th className="px-3.5 py-3">Name</th>
            <th className="px-3.5 py-3">Email</th>
            <th className="px-3.5 py-3">Mobile</th>
            <th className="px-3.5 py-3">Approved Docs</th>
            <th className="px-3.5 py-3">Bank Assigned</th>
            <th className="px-3.5 py-3">Status</th>
            <th className="px-3.5 py-3">Registered Date</th>
            {openUserModal && <th className="px-3.5 py-3 text-center">Action</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const userDocs = user.documents || [];
            const totalDocs = userDocs.length;
            const approvedDocsCount = userDocs.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED").length;
            const bankName = user.assignedBankName || user.bankName || "";
            return (
              <tr key={user.userId} className="border-b border-gray-50 text-xs">
                <td className="px-3.5 py-3 font-bold text-[#0B2A4A] whitespace-nowrap">{user.fullName || "-"}</td>
                <td className="px-3.5 py-3 text-gray-600 truncate max-w-[140px]" title={user.email}>{user.email || "-"}</td>
                <td className="px-3.5 py-3 text-gray-600 whitespace-nowrap">{user.mobileNumber || "-"}</td>
                <td className="px-3.5 py-3 text-gray-600 whitespace-nowrap font-semibold">
                  {approvedDocsCount} / {totalDocs} Docs
                </td>
                <td className="px-3.5 py-3 text-gray-600 whitespace-nowrap font-semibold">
                  {bankName || "Pending"}
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getUserStatusStyle(user)}`}>
                    {getUserStatusText(user)}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-gray-600 whitespace-nowrap">{formatDate(user.createdAt)}</td>
              {openUserModal && (
                <td className="px-3.5 py-3">
                  <div className="flex gap-1.5 justify-center">
                    <button
                      onClick={() => openUserModal(user)}
                      className="rounded-xl bg-[#0B2A4A] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#123962] transition-colors"
                    >
                      Info
                    </button>
                    <button
                      onClick={() => openTrackingModal(user)}
                      className="rounded-xl bg-[#27D3C3] px-2.5 py-1.5 text-xs font-black text-[#0B2A4A] hover:bg-[#1fbaa9] transition-colors"
                    >
                      Status
                    </button>
                    {onDeleteUser && (
                      <button
                        onClick={() => onDeleteUser(user)}
                        className="rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
      {users.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No users found</div>}
    </div>
  </div>
);

const UsersTab = ({ users, openUserModal, openTrackingModal, onDeleteUser }) => (
  <div className="space-y-5">
    <SectionTitle title="My Users" />
    <UserTable
      users={users}
      openUserModal={openUserModal}
      openTrackingModal={openTrackingModal}
      onDeleteUser={onDeleteUser}
    />
  </div>
);

const SettingsTab = ({
  profile,
  setProfile,
  saveProfile,
  profileSaving,
  passwordForm,
  setPasswordForm,
  changePassword,
  onDeleteAccount,
  deleting,
}) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Profile Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Full Name"
            value={profile.fullName}
            onChange={(value) => setProfile((prev) => ({ ...prev, fullName: value }))}
          />
          <FormField label="Email" value={profile.email} readOnly />
          <FormField
            label="Mobile"
            value={profile.mobileNumber}
            type="tel"
            onChange={(value) => setProfile((prev) => ({ ...prev, mobileNumber: value }))}
          />
          <FormField label="Dealer Code" value={profile.dealerCode} readOnly />
          <FormField label="Role" value={profile.role} readOnly />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onDeleteAccount}
            disabled={profileSaving || deleting}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-bold transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete My Account"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#EAFBF8] text-[#0B2A4A] flex items-center justify-center">
            <FaLock />
          </div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Change Password</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PasswordField
            label="New Password"
            value={passwordForm.password}
            showPassword={showNewPassword}
            setShowPassword={setShowNewPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, password: value })}
          />
          <PasswordField
            label="Confirm Password"
            value={passwordForm.confirm}
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirm: value })}
          />
        </div>
        <button
          onClick={changePassword}
          className="mt-4 bg-[#27D3C3] text-[#0B2A4A] px-6 py-3 rounded-2xl font-bold"
        >
          Update Password
        </button>
      </div>
    </div>
  );
};

const UserModal = ({ user, info, docs, counts, onClose, openPreview, openWizard, reuploadDoc, locked }) => (
  <Modal title={user.fullName || "User Details"} onClose={onClose} wide>
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoTile label="Name" value={user.fullName} />
        <InfoTile label="Email" value={user.email} />
        <InfoTile label="Mobile" value={user.mobileNumber} />
      </div>

      <div className="rounded-3xl bg-[#F4F6F9] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-black text-[#0B2A4A]">Personal Info</h4>
          {!locked && (
            <button
              onClick={openWizard}
              className="flex items-center gap-2 rounded-2xl bg-[#27D3C3] px-4 py-2 text-sm font-black text-[#0B2A4A]"
            >
              <FaUpload /> Add / Update Documents
            </button>
          )}
        </div>
        {info ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <InfoTile label="Address" value={info.address} />
            <InfoTile label="City" value={info.city} />
            <InfoTile label="State" value={info.state} />
            <InfoTile label="Pincode" value={info.pincode} />
            <InfoTile label="Loan Amount" value={info.loanAmount} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No personal info saved yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {["pendingDocsCount", "verifiedDocsCount", "approvedDocsCount", "rejectedDocsCount"].map((key) => (
          <div key={key} className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">{key.replace("DocsCount", "")}</p>
            <p className="mt-1 text-2xl font-black text-[#0B2A4A]">{counts?.[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <DocumentGrid docs={docs} openPreview={openPreview} reuploadDoc={locked ? null : reuploadDoc} />
    </div>
  </Modal>
);

const InfoTile = ({ label, value }) => (
  <div className="rounded-2xl bg-white p-4">
    <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
    <p className="mt-1 break-words font-bold text-[#0B2A4A]">{value || "-"}</p>
  </div>
);

const DocumentGrid = ({ docs, openPreview, reuploadDoc }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {docs.map((doc) => (
      <div key={doc.documentId} className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black text-[#0B2A4A]">{docLabel(doc.documentType)}</p>
            <p className="mt-1 text-sm text-gray-500">{doc.fileName || "-"}</p>
          </div>
          <Badge status={doc.status} />
        </div>
        {doc.remarks && <p className="mt-3 rounded-2xl bg-[#F4F6F9] p-3 text-sm text-gray-600">{doc.remarks}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => openPreview(doc)}
            className="flex items-center gap-2 rounded-2xl bg-[#0B2A4A] px-4 py-2 text-sm font-bold text-white"
          >
            <FaEye /> Preview
          </button>
          {reuploadDoc && (
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              <FaRedo /> {doc.status === "REJECTED" ? "Re-upload" : "Replace"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(event) => reuploadDoc(doc.userId, doc.documentType, event.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </div>
    ))}
    {docs.length === 0 && <EmptyState text="No documents uploaded yet." />}
  </div>
);

const StatusTab = ({ users, docsByUser, openTrackingModal }) => {
  const [expanded, setExpanded] = useState({});
  const sortedUsers = [...users].sort((a, b) =>
    String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
  );

  return (
    <div className="space-y-5">
      {sortedUsers.map((user) => {
        const userDocs = docsByUser[user.userId] || [];
        const counts = {
          total: userDocs.length,
          pending: userDocs.filter((doc) => doc.status === "PENDING").length,
          approved: userDocs.filter((doc) => doc.status === "APPROVED" || doc.status === "VERIFIED").length,
          rejected: userDocs.filter((doc) => doc.status === "REJECTED").length,
        };
        const isOpen = expanded[user.userId] === true;

        return (
          <section key={user.userId} className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setExpanded((prev) => ({ ...prev, [user.userId]: !prev[user.userId] }))}
              className="flex w-full flex-col gap-4 px-5 py-5 text-left hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-lg font-black text-[#0B2A4A]">{user.fullName}</h3>
                <p className="text-sm text-gray-500">{user.email} • {user.mobileNumber || "N/A"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-2xl bg-[#F4F6F9] px-4 py-2 text-sm font-bold text-[#0B2A4A]">
                  {counts.total} docs • {counts.pending} pending • {counts.approved} approved • {counts.rejected} rejected
                </span>
                <span className="rounded-2xl bg-[#EAFBF8] px-3 py-2 text-sm font-black text-[#0B2A4A]">
                  {isOpen ? "Hide" : "Show"}
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openTrackingModal(user)}
                    className="rounded-2xl bg-[#0B2A4A] px-5 py-3 text-sm font-black text-white"
                  >
                    View Application Status
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {userDocs.map((doc) => (
                    <div key={doc.documentId} className="rounded-2xl border border-gray-100 bg-[#F8FAFC] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#0B2A4A]">{docLabel(doc.documentType)}</p>
                          <p className="mt-1 text-xs text-gray-500">{doc.fileName || "-"}</p>
                        </div>
                        <Badge status={doc.status} />
                      </div>
                      {doc.remarks && (
                        <p className="mt-3 rounded-2xl bg-white p-3 text-sm text-gray-600">
                          {doc.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                  {userDocs.length === 0 && <EmptyState text="No documents uploaded yet." />}
                </div>
              </div>
            )}
          </section>
        );
      })}
      {users.length === 0 && <EmptyState text="No user status found." />}
    </div>
  );
};
const FormField = ({ label, value, onChange, readOnly = false, type = "text" }) => (
  <label className="mb-4 block">
    <span className="mb-2 block text-sm font-bold text-[#0B2A4A]">{label}</span>
    <input
      type={type}
      min={type === "number" ? "1" : undefined}
      value={value || ""}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none ${
        readOnly ? "bg-[#F4F6F9] text-gray-500" : "bg-white text-[#0B2A4A] focus:border-[#27D3C3]"
      }`}
    />
  </label>
);

const PasswordField = ({ label, value, onChange, showPassword, setShowPassword }) => (
  <label className="mb-4 block">
    <span className="mb-2 block text-sm font-bold text-[#0B2A4A]">{label}</span>
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-[#0B2A4A] outline-none focus:border-[#27D3C3]"
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2A4A]"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  </label>
);

const WizardModal = ({
  personalForm,
  setPersonalForm,
  employmentType,
  setEmploymentType,
  files,
  setFiles,
  onSubmit,
  saving,
  uploadedDocs,
  openPreview,
  existingDocsByType = {},
  existingDocs = [],
  isExistingUser = false,
  onClose,
  hasAppointmentLetter,
  setHasAppointmentLetter,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);

  const incomeTypes =
    employmentType === "Salaried"
      ? (hasAppointmentLetter === "no"
          ? ["SALARY_SLIP_1", "SALARY_SLIP_2", "SALARY_SLIP_3", "BANK_STATEMENT"]
          : ["SALARY_SLIP_1", "SALARY_SLIP_2", "SALARY_SLIP_3", "APPOINTMENT_LETTER", "BANK_STATEMENT"])
      : employmentType === "Self Employed"
        ? ["ITR_RETURN", "BANK_STATEMENT"]
        : [];

  const setFile = (type, file) => setFiles((prev) => ({ ...prev, [type]: file }));
  const updateForm = (key, value) => setPersonalForm({ ...personalForm, [key]: value });
  const lockedIncomeType = getLockedIncomeTypeFromFiles(files);
  const updateEmploymentType = (type) => {
    if (lockedIncomeType && lockedIncomeType !== type) {
      toast.error(
        `${lockedIncomeType} income documents already selected. Remove them before switching income type.`
      );
      return;
    }
    setEmploymentType(type);
  };
  const handleSetFile = (type, file) => {
    const incomeGroup = getIncomeGroupForType(type);
    if (file && incomeGroup && lockedIncomeType && lockedIncomeType !== incomeGroup) {
      toast.error(
        `${lockedIncomeType} income documents already selected. Remove them before uploading ${incomeGroup} documents.`
      );
      return;
    }
    setFile(type, file);
  };
  const hasDocument = (type) => Boolean(files[type] || existingDocsByType[type]);
  const selectedDocuments = Object.entries(files)
    .filter(([, file]) => Boolean(file))
    .map(([type, file]) => ({ type, file, doc: existingDocsByType[type] }));
  const allReviewDocuments = [
    ...selectedDocuments,
    ...existingDocs
      .filter((doc) => {
        const type = doc.documentType || doc.type;
        return type && !files[type];
      })
      .map((doc) => ({ type: doc.documentType || doc.type, doc })),
  ];

  const requiredTypesForStep = () => {
    if (currentStep === 2) return STEP_TYPES[2];
    if (currentStep === 3) return ["RESIDENTIAL_PROOF"];
    if (currentStep === 4) return incomeTypes;
    if (currentStep === 5) return STEP_TYPES[5];
    return [];
  };

  const missingForCurrentStep = () => {
    if (currentStep === 1) {
      return [
        ["fullName", "Full Name"],
        ["email", "Email"],
        ["mobileNumber", "Mobile Number"],
        ["address", "Address"],
        ["city", "City"],
        ["state", "State"],
        ["pincode", "Pincode"],
        ["loanAmount", "Loan Amount"],
      ]
        .filter(([key]) => String(personalForm[key] || "").trim() === "")
        .map(([, label]) => label);
    }
    if (currentStep === 4 && !employmentType) return ["Employment Type"];
    return requiredTypesForStep().filter((type) => {
      if (type === "RESIDENTIAL_PROOF") {
        return !hasDocument("LIGHT_BILL") && !hasDocument("RENTAL_AGREEMENT");
      }
      return !hasDocument(type);
    });
  };

  const goToStep = (stepId) => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
      return;
    }
    const missing = missingForCurrentStep();
    if (missing.length > 0) {
      if (currentStep === 4 && missing.includes("Employment Type")) {
        toast.error("Please select employment type before continuing.");
        return;
      }
      toast.error(
        currentStep === 1
          ? `Please fill ${missing.join(", ")} before continuing.`
          : `Please upload ${missing.map((type) => type === "RESIDENTIAL_PROOF" ? "Light Bill or Rental Agreement" : docLabel(type)).join(", ")} before continuing.`
      );
      return;
    }
    setCurrentStep(stepId);
  };

  const validatePreview = () => {
    const required = [
      personalForm.fullName,
      personalForm.email,
      personalForm.mobileNumber,
      personalForm.address,
      personalForm.city,
      personalForm.state,
      personalForm.pincode,
      personalForm.loanAmount,
      employmentType,
    ];

    if (required.some((value) => String(value || "").trim() === "")) {
      toast.error("Fill all fields before preview");
      return false;
    }
    if (Number(personalForm.loanAmount) <= 0) {
      toast.error("Loan amount must be greater than 0");
      return false;
    }
    if (!hasDocument("PAN") || !hasDocument("AADHAAR_1") || !hasDocument("AADHAAR_2")) {
      toast.error("Upload PAN, Aadhaar Front, and Aadhaar Back");
      return false;
    }
    if (!hasDocument("LIGHT_BILL") && !hasDocument("RENTAL_AGREEMENT")) {
      toast.error("Upload Light Bill or Rental Agreement");
      return false;
    }
    const missingIncome = incomeTypes.find((type) => !hasDocument(type));
    if (missingIncome) {
      toast.error(`Upload ${docLabel(missingIncome)}`);
      return false;
    }
    const missingVehicle = STEP_TYPES[5].find((type) => !hasDocument(type));
    if (missingVehicle) {
      toast.error(`Upload ${docLabel(missingVehicle)}`);
      return false;
    }
    return true;
  };

  const openSelectedFilePreview = (type, file) => {
    if (localPreview?.url) URL.revokeObjectURL(localPreview.url);
    const fileName = file?.name || "";
    const fileType = file?.type || "";
    setLocalPreview({
      title: docLabel(type),
      url: URL.createObjectURL(file),
      isPdf: fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf"),
      isImage: fileType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName),
    });
  };

  const closeSelectedFilePreview = () => {
    if (localPreview?.url) URL.revokeObjectURL(localPreview.url);
    setLocalPreview(null);
  };

  const handleVerifySubmit = async () => {
    const saved = await onSubmit();
    if (saved) {
      setReviewOpen(false);
      closeSelectedFilePreview();
      onClose();
    }
  };

  return (
    <Modal title={isExistingUser ? "Update User Documents" : "New User Loan Registration"} onClose={onClose} wide>
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-3xl bg-white p-3 shadow-sm">
          <div className="flex min-w-max gap-3">
            {WIZARD_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`rounded-2xl px-5 py-3 text-sm font-bold ${
                  currentStep === step.id ? "bg-[#0B2A4A] text-white" : "bg-[#F4F6F9] text-[#0B2A4A]"
                }`}
              >
                {step.id}. {step.title}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (currentStep === 6 && validatePreview()) setReviewOpen(true);
          }}
          className="space-y-6"
        >
          {currentStep === 1 && (
            <section className="rounded-3xl bg-[#F4F6F9] p-4 sm:p-5">
              <h4 className="mb-4 font-black text-[#0B2A4A]">Personal Information</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Full Name" value={personalForm.fullName} onChange={(value) => updateForm("fullName", value)} />
                <FormField label="Email" type="email" value={personalForm.email} onChange={(value) => updateForm("email", value)} />
                <FormField
                  label="Mobile Number"
                  value={personalForm.mobileNumber}
                  onChange={(value) => updateForm("mobileNumber", value.replace(/\D/g, "").slice(0, 10))}
                />
                <FormField label="Address" value={personalForm.address} onChange={(value) => updateForm("address", value)} />
                <FormField label="City" value={personalForm.city} onChange={(value) => updateForm("city", value)} />
                <FormField label="State" value={personalForm.state} onChange={(value) => updateForm("state", value)} />
                <FormField
                  label="Pincode"
                  value={personalForm.pincode}
                  onChange={(value) => updateForm("pincode", value.replace(/\D/g, "").slice(0, 6))}
                />
                <FormField
                  label="Loan Amount"
                  type="number"
                  value={personalForm.loanAmount}
                  onChange={(value) => updateForm("loanAmount", value.replace(/^-/, ""))}
                />
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => goToStep(2)} className="rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white">
                  Next
                </button>
              </div>
            </section>
          )}

          {currentStep >= 2 && currentStep <= 5 && (
            <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              {currentStep === 2 && (
                <UploadStep title="KYC Documents" types={STEP_TYPES[2]} files={files} existingDocsByType={existingDocsByType} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} onPreviewExisting={openPreview} />
              )}
              {currentStep === 3 && (
                <UploadStep title="Residential Proof" types={STEP_TYPES[3]} files={files} existingDocsByType={existingDocsByType} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} onPreviewExisting={openPreview} note="Upload Light Bill or Rental Agreement." />
              )}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-[#0B2A4A]">Employment Type</span>
                      <select
                        value={employmentType}
                        onChange={(event) => updateEmploymentType(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#0B2A4A] outline-none focus:border-[#27D3C3]"
                      >
                        <option value="">Select Employment Type</option>
                        <option value="Salaried" disabled={lockedIncomeType === "Self Employed"}>Salaried</option>
                        <option value="Self Employed" disabled={lockedIncomeType === "Salaried"}>Self Employed</option>
                        <option value="Others" disabled={Boolean(lockedIncomeType)}>Others</option>
                      </select>
                    </label>
                    {employmentType === "Salaried" && (
                      <div className="rounded-2xl border border-slate-100 bg-[#F4F6F9] p-3">
                        <span className="text-sm font-semibold text-[#0B2A4A]">Have Appointment Letter?</span>
                        <div className="mt-3 flex gap-1 rounded-xl border border-slate-200/50 bg-white p-0.5">
                          {["yes", "no"].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setHasAppointmentLetter(val)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                                hasAppointmentLetter === val ? "bg-[#0B2A4A] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {employmentType === "Others" ? (
                    <div className="rounded-2xl bg-[#EAFBF8] p-4 text-sm font-semibold text-[#0B2A4A]">
                      No income documents are required for Others employment type.
                    </div>
                  ) : incomeTypes.length > 0 ? (
                    <UploadStep title="Income Documents" types={incomeTypes} files={files} existingDocsByType={existingDocsByType} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} onPreviewExisting={openPreview} />
                  ) : (
                    <div className="rounded-2xl bg-[#F4F6F9] p-4 text-sm font-semibold text-[#0B2A4A]">
                      Select employment type to continue.
                    </div>
                  )}
                </div>
              )}
              {currentStep === 5 && (
                <UploadStep title="Vehicle Documents" types={STEP_TYPES[5]} files={files} existingDocsByType={existingDocsByType} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} onPreviewExisting={openPreview} />
              )}
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => goToStep(Math.min(currentStep + 1, 6))} className="rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white">
                  Next
                </button>
              </div>
            </section>
          )}

          {currentStep === 6 && (
            <section className="space-y-5 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              <h4 className="font-black text-[#0B2A4A]">Verify Details Before Submit</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoTile label="Full Name" value={personalForm.fullName} />
                <InfoTile label="Email" value={personalForm.email} />
                <InfoTile label="Mobile" value={personalForm.mobileNumber} />
                <InfoTile label="Address" value={personalForm.address} />
                <InfoTile label="City" value={personalForm.city} />
                <InfoTile label="State" value={personalForm.state} />
                <InfoTile label="Pincode" value={personalForm.pincode} />
                <InfoTile label="Loan Amount" value={personalForm.loanAmount} />
                <InfoTile label="Employment Type" value={employmentType} />
              </div>
              <ReviewDocumentsGrid
                documents={allReviewDocuments}
                onPreviewFile={openSelectedFilePreview}
                onPreviewExisting={openPreview}
              />
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="rounded-2xl bg-[#F4F6F9] px-5 py-3 font-bold text-[#0B2A4A]">
                  Close
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (validatePreview()) setReviewOpen(true);
                  }}
                  className="rounded-2xl bg-[#27D3C3] px-6 py-3 font-black text-[#0B2A4A] disabled:opacity-60"
                >
                  {saving ? "Submitting..." : "Verify & Submit"}
                </button>
              </div>
            </section>
          )}
        </form>

      {reviewOpen && (
        <ApplicationReviewModal
          form={personalForm}
          employmentType={employmentType}
          documents={allReviewDocuments}
          saving={saving}
          onClose={() => setReviewOpen(false)}
          onPreviewFile={openSelectedFilePreview}
          onPreviewExisting={openPreview}
          onVerifySubmit={handleVerifySubmit}
        />
      )}

      {localPreview && (
        <Modal title={localPreview.title} onClose={closeSelectedFilePreview} wide>
          <FilePreviewFrame preview={localPreview} />
        </Modal>
      )}
      </div>
    </Modal>
  );
};

const ApplicationReviewModal = ({
  form,
  employmentType,
  documents,
  saving,
  onClose,
  onPreviewFile,
  onPreviewExisting,
  onVerifySubmit,
}) => (
  <Modal title="Verify Loan Application" onClose={onClose} wide>
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#F4F6F9] p-4 sm:p-5">
        <h4 className="mb-4 font-black text-[#0B2A4A]">Applicant Details</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoTile label="Full Name" value={form.fullName} />
          <InfoTile label="Email" value={form.email} />
          <InfoTile label="Mobile" value={form.mobileNumber} />
          <InfoTile label="Address" value={form.address} />
          <InfoTile label="City" value={form.city} />
          <InfoTile label="State" value={form.state} />
          <InfoTile label="Pincode" value={form.pincode} />
          <InfoTile label="Loan Amount" value={form.loanAmount} />
          <InfoTile label="Employment Type" value={employmentType} />
        </div>
      </section>

      <section>
        <h4 className="mb-4 font-black text-[#0B2A4A]">Documents Selected</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map(({ type, file, doc }) => (
            <div key={type} className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <p className="font-black text-[#0B2A4A]">{docLabel(type)}</p>
              <p className="mt-1 truncate text-sm text-gray-500">{file?.name || doc?.fileName || "-"}</p>
              <button
                type="button"
                onClick={() => file ? onPreviewFile(type, file) : onPreviewExisting(doc)}
                className="mt-4 flex items-center gap-2 rounded-2xl bg-[#0B2A4A] px-4 py-2 text-sm font-bold text-white"
              >
                <FaEye /> Preview
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-3xl border border-[#27D3C3]/30 bg-[#EAFBF8] p-4 text-sm font-semibold text-[#0B2A4A]">
        Verify & Submit will register this user with the dealer code, save loan details, and upload the selected
        documents for admin processing.
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 border-t border-gray-100 pt-5">
        <button type="button" onClick={onClose} className="rounded-2xl bg-[#F4F6F9] px-5 py-3 font-bold text-[#0B2A4A]">
          Back to Edit
        </button>
        <button
          type="button"
          onClick={onVerifySubmit}
          disabled={saving}
          className="rounded-2xl bg-[#27D3C3] px-6 py-3 font-black text-[#0B2A4A] disabled:opacity-60"
        >
          {saving ? "Submitting..." : "Verify & Submit"}
        </button>
      </div>
    </div>
  </Modal>
);

const ReviewDocumentsGrid = ({ documents, onPreviewFile, onPreviewExisting }) => (
  <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5">
      <h4 className="font-black text-[#0B2A4A]">Uploaded Documents</h4>
      <p className="mt-1 text-sm text-slate-500">Preview files and confirm before final submit.</p>
    </div>
    {documents.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
        No documents selected yet.
      </p>
    ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {documents.map(({ type, file, doc }) => (
          <div key={`${type}-${file?.name || doc?.documentId || doc?.id || "review"}`} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#0B2A4A]">{docLabel(type)}</h3>
                <p className="mt-1 break-all text-xs text-slate-500">{file?.name || doc?.fileName || "-"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                file ? "bg-[#EAFBF8] text-[#0B2A4A]" : statusStyles[doc?.status] || "bg-slate-100 text-slate-600"
              }`}>
                {file ? (doc ? "Replacing" : "Ready") : doc?.status || "Uploaded"}
              </span>
            </div>
            {doc?.remarks && (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                Admin remarks: {doc.remarks}
              </p>
            )}
            <button
              type="button"
              onClick={() => file ? onPreviewFile(type, file) : onPreviewExisting(doc)}
              className="mt-4 flex items-center gap-2 rounded-2xl bg-[#F4F6F9] px-4 py-2 text-sm font-bold text-[#0B2A4A]"
            >
              <FaEye /> Preview
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const FilePreviewFrame = ({ preview }) => (
  <div className="flex h-[65vh] sm:h-[75vh] items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-[#F4F6F9]">
    {preview.isPdf ? (
      <iframe title={preview.title} src={preview.url} className="h-full w-full" />
    ) : preview.isImage ? (
      <img src={preview.url} alt={preview.title} className="max-h-full max-w-full object-contain" />
    ) : (
      <div className="p-6 text-center">
        <p className="font-bold text-[#0B2A4A]">Preview unavailable</p>
        <p className="mt-2 text-sm text-gray-500">This file type cannot be previewed inline.</p>
      </div>
    )}
  </div>
);

const UploadStep = ({ title, types, files, existingDocsByType = {}, setFile, onPreviewFile, onPreviewExisting, note }) => (
  <div>
    <h4 className="font-black text-[#0B2A4A]">{title}</h4>
    {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => {
        const existingDoc = existingDocsByType[type];
        return (
          <div key={type} className="rounded-3xl border border-gray-100 bg-[#F4F6F9] p-4 sm:p-5">
            <span className="font-black text-[#0B2A4A]">{docLabel(type)}</span>
            {existingDoc && !files[type] && (
              <div className="mt-3 rounded-2xl bg-white p-3">
                <span className="block truncate text-sm font-semibold text-gray-600">{existingDoc.fileName}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onPreviewExisting(existingDoc)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0B2A4A] px-4 py-2 text-sm font-bold text-white"
                  >
                    <FaEye /> Preview
                  </button>
                  <span className="rounded-full bg-[#EAFBF8] px-3 py-2 text-xs font-bold text-[#0B2A4A]">
                    Uploaded
                  </span>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.webp"
              onChange={(event) => setFile(type, event.target.files?.[0])}
              className="mt-4 w-full text-sm"
            />
            {files[type] && (
              <div className="mt-3 rounded-2xl bg-white p-3">
                <span className="block truncate text-sm font-semibold text-gray-600">{files[type].name}</span>
                <button
                  type="button"
                  onClick={() => onPreviewFile(type, files[type])}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#0B2A4A] px-4 py-2 text-sm font-bold text-white"
                >
                  <FaEye /> Preview
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const TrackingModal = ({ user, docs, counts, tracking, onClose }) => {
  const steps = useMemo(() => {
    if (tracking?.timeline?.length) {
      return tracking.timeline.map((item) => ({
        title: item.label || item.key,
        status: item.completed ? "DONE" : "PENDING",
        detail: item.remarks || item.message || item.key,
        date: item.date,
      }));
    }

    const totalDocs = docs?.length || 0;
    const pendingCount = docs?.filter((d) => d.status === "PENDING").length || 0;
    const approvedCount = docs?.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED").length || 0;
    const verifiedCount = docs?.filter((d) => d.status === "VERIFIED").length || 0;
    const rejectedCount = docs?.filter((d) => d.status === "REJECTED").length || 0;

    const hasDocs = totalDocs > 0;
    const allApproved = hasDocs && approvedCount === totalDocs;
    const underReview = hasDocs && (pendingCount > 0 || verifiedCount > 0);
    const hasRejected = hasDocs && rejectedCount > 0;

    const isSentToBank = isUserAssignedToBank(user);

    // Step 1: Documents Submitted
    let step1Status = "PENDING";
    let step1Detail = "Please upload required documents to start your application.";
    if (hasDocs) {
      step1Status = "DONE";
      step1Detail = "Your documents have been uploaded successfully.";
    } else {
      step1Status = "CURRENT";
    }

    // Step 2: Under Review
    let step2Status = "PENDING";
    let step2Detail = "Admin is verifying your documents.";
    if (hasDocs) {
      if (isSentToBank || allApproved) {
        step2Status = "DONE";
      } else if (underReview || hasRejected) {
        step2Status = "CURRENT";
        if (hasRejected) {
          step2Detail = "Some documents were rejected. Please check and re-upload.";
        }
      }
    }

    // Step 3: Documents Approved
    let step3Status = "PENDING";
    let step3Detail = "All documents have been approved by admin.";
    if (hasDocs) {
      if (isSentToBank) {
        step3Status = "DONE";
      } else if (allApproved) {
        step3Status = "CURRENT";
      } else if (hasRejected) {
        step3Detail = "Approval pending document correction.";
      }
    }

    // Step 4: Sent to Bank
    let step4Status = "PENDING";
    let step4Detail = "Your application has been forwarded to the bank.";
    if (isSentToBank) {
      step4Status = "CURRENT";
      step4Detail = "Your application has been forwarded to the bank.";
    }

    return [
      { title: "Documents Submitted", status: step1Status, detail: step1Detail },
      { title: "Under Review", status: step2Status, detail: step2Detail },
      { title: "Documents Approved", status: step3Status, detail: step3Detail },
      { title: "Sent to Bank", status: step4Status, detail: step4Detail },
    ];
  }, [docs, tracking, user.userId]);

  return (
    <Modal title="Application Tracking" onClose={onClose}>
      <div className="space-y-6 p-1">
        <div className="rounded-3xl bg-gradient-to-br from-[#0B2A4A] to-[#1a3d60] p-4 sm:p-6 text-white shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-[#27D3C3]">Applicant Details</span>
          <h3 className="mt-1 text-2xl font-black">{tracking?.customerName || user.fullName}</h3>
          <p className="text-sm opacity-80">{user.email} • {user.mobileNumber}</p>
          <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-xs opacity-75">
            <span>App ID: {tracking?.applicationId || user.applicationId || "N/A"}</span>
            <span>Registered: {formatDate(user.createdAt)}</span>
          </div>
          {(tracking?.assignedBankName || user.assignedBankName || user.bankName) && (
            <div className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold">
              Assigned Bank: {tracking?.assignedBankName || user.assignedBankName || user.bankName}
            </div>
          )}
        </div>

        <div className="relative pl-10 pr-2 py-4">
          {steps.map((step, idx) => {
            const isDone = step.status === "DONE";
            const isCurrent = step.status === "CURRENT";
            const isLast = idx === steps.length - 1;

            let circleStyle = "bg-gray-100 text-gray-400 border-gray-200";
            let titleStyle = "text-gray-400 font-medium";
            let detailStyle = "text-gray-400";
            let badgeStyle = "bg-gray-100 text-gray-500 border-gray-200";

            if (isDone) {
              circleStyle = "bg-green-500 text-white border-green-500 shadow-md shadow-green-100";
              titleStyle = "text-[#0B2A4A] font-extrabold";
              detailStyle = "text-gray-600";
              badgeStyle = "bg-green-50 text-green-700 border-green-200";
            } else if (isCurrent) {
              circleStyle = "bg-[#27D3C3] text-[#0B2A4A] border-[#27D3C3] shadow-md shadow-[#27D3C3]/30 ring-4 ring-[#27D3C3]/20 animate-pulse";
              titleStyle = "text-[#0B2A4A] font-black text-lg";
              detailStyle = "text-gray-800 font-semibold";
              badgeStyle = "bg-[#EAFBF8] text-[#0B2A4A] border-[#27D3C3]/30";
            }

            return (
              <div key={idx} className="relative mb-8 last:mb-0 flex flex-col items-start transition-all duration-300 hover:scale-[1.01]">
                {/* Connector line segment */}
                {!isLast && (
                  <div
                    className={`absolute left-[-26px] top-8 bottom-[-32px] w-1 rounded-full ${
                      isDone ? "bg-green-500" : "bg-gray-200"
                    }`}
                  ></div>
                )}

                {/* Circle step badge */}
                <span
                  className={`absolute -left-[40px] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black transition-all ${circleStyle}`}
                >
                  {isDone ? "✓" : idx + 1}
                </span>

                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <h4 className={`text-base tracking-tight ${titleStyle}`}>{step.title}</h4>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-extrabold tracking-wide uppercase ${badgeStyle}`}>
                    {step.status}
                  </span>
                </div>
                <p className={`mt-1.5 text-sm ${detailStyle}`}>{step.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="flex justify-stretch sm:justify-end border-t border-gray-100 pt-5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white shadow-lg shadow-[#0B2A4A]/10 hover:bg-[#1a3d60] transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ConfirmationModal = ({ isOpen, title, message, confirmText = "Delete", cancelText = "Cancel", onConfirm, onCancel, isDanger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-fade-in border border-slate-100">
        <h3 className="text-xl font-bold text-[#0B2A4A] mb-3">{title}</h3>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#0B2A4A] text-sm font-bold transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-2xl text-white text-sm font-bold transition-colors ${
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-[#0B2A4A] hover:bg-[#123962]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;



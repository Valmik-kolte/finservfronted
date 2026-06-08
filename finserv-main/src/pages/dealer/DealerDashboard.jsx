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
  FaRupeeSign,
  FaTimes,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import Sidebar from "../../components/dealer/Sidebar";
import api from "../../services/api";
import qrCode from "../../assets/upi_1780494820795.png";
import {
  getDealerDashboardSummary,
  getDealerNotifications,
  getDealerProfile,
  getDealerUserDocuments,
  getDealerUserTracking,
  getDealerUsers,
  markDealerNotificationRead,
} from "../../services/dealerDashboardService";
import Chatbot from "../../components/chatbot/Chatbot";
import {
  READY2DRIVE_BASE_AMOUNT,
  READY2DRIVE_FEE_LABEL,
  READY2DRIVE_GST_AMOUNT,
  READY2DRIVE_GST_LABEL,
  READY2DRIVE_GST_PERCENT,
  READY2DRIVE_TOTAL_AMOUNT,
  formatINR,
} from "../../constants/payment";

const DOCUMENT_TYPES = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  PASSPORT: "Passport",
  VOTER_ID: "Voter ID",
  DRIVING_LICENSE: "Driving License",
  LIGHT_BILL: "Light Bill",
  RENTAL_AGREEMENT: "Rental Agreement",
  SALARY_SLIP: "Salary Slip",
  BANK_STATEMENT: "Bank Statement",
  ITR_RETURN: "ITR Return",
  APPOINTMENT_LETTER: "Appointment Letter",
  RC: "RC",
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
  2: ["PAN", "AADHAAR"],
  3: ["LIGHT_BILL", "RENTAL_AGREEMENT"],
  5: [
    "RC",
    "INSURANCE",
    "CAR_FRONT_SIDE_PHOTO",
    "CAR_BACK_SIDE_PHOTO",
    "CHASSIS_NUMBER",
    "ODOMETER_READING",
  ],
};

const SALARIED_INCOME_TYPES = new Set(["SALARY_SLIP", "APPOINTMENT_LETTER"]);
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
  password: "",
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

const readDealerSession = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("dealerData") || "null");
    return parsed || {};
  } catch {
    return {};
  }
};

const DEALER_NOTIFICATIONS_KEY = "dealer_assignment_notifications";
const DEALER_REGISTERED_USERS_KEY = "dealer_registered_users";
const DEALER_REGISTERED_PERSONAL_INFO_KEY = "dealer_registered_personal_info";
const ADMIN_NOTIFICATIONS_KEY = "admin_activity_notifications";
const PAYMENT_REQUESTS_KEY = "customer_payment_requests";

const PAYMENT_STATUS = {
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_VERIFICATION_PENDING: "PAYMENT_VERIFICATION_PENDING",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
};

const getPaymentStorageKey = (userId) => `customer_payment_status_${userId || "guest"}`;

const writePaymentStatus = (userId, status) => {
  if (!userId) return;
  localStorage.setItem(getPaymentStorageKey(userId), status);
};

const readPaymentStatus = (userId) =>
  localStorage.getItem(getPaymentStorageKey(userId)) || PAYMENT_STATUS.PAYMENT_PENDING;

const readPaymentRequests = () => {
  try {
    return JSON.parse(localStorage.getItem(PAYMENT_REQUESTS_KEY) || "[]");
  } catch {
    return [];
  }
};

const upsertDealerPaymentRequest = ({ userId, status, profile, dealerProfile, personalInfo, documents }) => {
  if (!userId) return;
  const requests = readPaymentRequests();
  const nextRequest = {
    userId,
    status,
    source: "DEALER",
    dealerId: dealerProfile?.dealerId || dealerProfile?.id || "",
    dealerCode: dealerProfile?.dealerCode || "",
    fullName: profile?.fullName || "Customer",
    email: profile?.email || "",
    mobileNumber: profile?.mobileNumber || "",
    loanAmount: personalInfo?.loanAmount || "",
    feeName: READY2DRIVE_FEE_LABEL,
    feeBaseAmount: READY2DRIVE_BASE_AMOUNT,
    gstRatePercent: READY2DRIVE_GST_PERCENT,
    gstAmount: READY2DRIVE_GST_AMOUNT,
    payableAmount: READY2DRIVE_TOTAL_AMOUNT,
    documentCount: documents?.length || 0,
    documents: documents || [],
    updatedAt: new Date().toISOString(),
  };
  const exists = requests.some((request) => String(request.userId) === String(userId));
  const nextRequests = exists
    ? requests.map((request) =>
        String(request.userId) === String(userId) ? { ...request, ...nextRequest } : request
      )
    : [nextRequest, ...requests];
  localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(nextRequests));
};

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
    map.set(String(id), { ...(map.get(String(id)) || {}), ...user, userId: id });
  });
  return Array.from(map.values());
};

const addLocalAdminNotification = (message) => {
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
    user?.bankStatus === "SENT_TO_BANK" ||
    localStorage.getItem(`user_bank_assignment_${user?.userId}`)
  );

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
  const token = localStorage.getItem("token");

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
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDocs, setSelectedUserDocs] = useState([]);
  const [selectedCounts, setSelectedCounts] = useState(null);
  const [trackingUser, setTrackingUser] = useState(null);
  const [trackingDocs, setTrackingDocs] = useState([]);
  const [trackingCounts, setTrackingCounts] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [personalForm, setPersonalForm] = useState(initialPersonalForm);
  const [employmentType, setEmploymentType] = useState("");
  const [files, setFiles] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [savingWizard, setSavingWizard] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [paymentPromptUser, setPaymentPromptUser] = useState(null);
  const [qrPaymentUser, setQrPaymentUser] = useState(null);
  const [qrImageError, setQrImageError] = useState(false);
  const pollRef = useRef(null);

  const userIds = useMemo(() => users.map((u) => u.userId), [users]);
  const docsByUser = useMemo(() => {
    const grouped = {};
    docs.forEach((doc) => {
      grouped[doc.userId] = grouped[doc.userId] || [];
      grouped[doc.userId].push(doc);
    });
    return grouped;
  }, [docs]);

  const stats = useMemo(
    () => ({
      users: dashboardSummary?.usersCount ?? users.length,
      docs: dashboardSummary?.documentsCount ?? docs.length,
      pending: dashboardSummary?.pendingDocsCount ?? docs.filter((doc) => doc.status === "PENDING").length,
      approved: dashboardSummary?.approvedDocsCount ?? docs.filter((doc) => doc.status === "APPROVED").length,
      rejected: dashboardSummary?.rejectedDocsCount ?? docs.filter((doc) => doc.status === "REJECTED").length,
      bankAssigned: dashboardSummary?.bankAssignedCount ?? users.filter(isUserAssignedToBank).length,
    }),
    [dashboardSummary, docs, users]
  );

  const rejectedUsers = useMemo(() => {
    const rejectedIds = new Set(docs.filter((doc) => doc.status === "REJECTED").map((doc) => doc.userId));
    return users.filter((user) => rejectedIds.has(user.userId));
  }, [docs, users]);

  const dealerCode = profile.dealerCode;
  const notificationDealerId = profile.dealerId || dealerId;
  const unreadCount = notifications.filter((item) => !isNotificationRead(item)).length;

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
      list = await getDealerNotifications();
    } catch {
      if (!notificationDealerId) return localList;
      const res = await api.get(`/notifications/${notificationDealerId}`);
      list = Array.isArray(res.data) ? res.data : res.data?.data || [];
    }
    const sorted = [...localList, ...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(sorted);
    return sorted;
  }, [dealerCode, notificationDealerId]);

  const fetchDealerProfile = useCallback(async () => {
    try {
      return await getDealerProfile();
    } catch {
      // Fall back to the older admin-style endpoint until /dealer/me is available.
    }
    try {
      const res = await api.get("/dealer/all");
      const dealers = res.data?.data || [];
      const found = dealers.find((d) => {
        const candidateId = d.dealerId || d.id;
        return (
          sameId(candidateId, dealerId) ||
          sameCode(d.dealerCode, storedDealerCode) ||
          sameCode(d.email, session.email)
        );
      });
      return found || null;
    } catch {
      return null;
    }
  }, [dealerId, session.email, storedDealerCode]);

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const dealerProfile = await fetchDealerProfile();
      const resolvedDealerId = dealerProfile?.dealerId || dealerProfile?.id || dealerId;
      const resolvedCode = dealerProfile?.dealerCode || storedDealerCode;

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
        const [summary, notificationList] = await Promise.all([
          getDealerDashboardSummary().catch(() => null),
          getDealerNotifications().catch(() => []),
        ]);
        const localDealerUsers = getLocalDealerUsers(resolvedDealerId, resolvedCode);
        const normalizedUsers = mergeUsersById(Array.isArray(dealerUsers) ? dealerUsers : [], localDealerUsers);
        const dealerDocs = [];
        const documentResponses = await Promise.all(
          normalizedUsers.map((user) =>
            getDealerUserDocuments(user.userId)
              .then((list) => list.map((doc) => ({ ...doc, userId: doc.userId || user.userId })))
              .catch(() => [])
          )
        );
        documentResponses.forEach((list) => dealerDocs.push(...list));
        const localList = getLocalDealerNotifications(resolvedDealerId, resolvedCode);
        setDashboardSummary(summary);
        setUsers(normalizedUsers);
        setPersonalInfos(
          normalizedUsers.map((user) => ({
            userId: user.userId,
            loanAmount: user.loanAmount,
            applicationId: user.applicationId,
          }))
        );
        setDocs(uniqueDocuments(dealerDocs));
        setNotifications(
          [...localList, ...notificationList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
        return;
      } catch (error) {
        if (![403, 404, 500].includes(error?.response?.status)) {
          showError(error, "Dealer-specific dashboard API failed. Loading fallback data.");
        }
        setDashboardSummary(null);
      }

      const [userRes, personalRes] = await Promise.allSettled([
        api.get("/user/all"),
        api.get("/personal-info/all"),
      ]);

      const localDealerUsers = getLocalDealerUsers(resolvedDealerId, resolvedCode);
      const allUsers = mergeUsersById(
        userRes.status === "fulfilled" ? userRes.value.data?.data || [] : [],
        localDealerUsers
      );
        // Build filtered list of users belonging to the logged-in dealer.
        const myUsers = allUsers.filter((u) => {
          // Prefer dealerCode match when we have it
          if (resolvedCode && u.dealerCode) {
            if (sameCode(u.dealerCode, resolvedCode)) return true;
          }
          // Fallback to dealerId matching (direct or assigned)
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

      myUsers.sort((a, b) =>
        String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
      );
      setUsers(myUsers);
      setPersonalInfos(myInfos);
      setDocs(uniqueDocuments(myDocs));

      if (resolvedDealerId) {
        try {
          const notifRes = await api.get(`/notifications/${resolvedDealerId}`);
          const list = Array.isArray(notifRes.data) ? notifRes.data : [];
          const localList = getLocalDealerNotifications(resolvedDealerId, resolvedCode);
          setNotifications([...localList, ...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch {
          setNotifications(getLocalDealerNotifications(resolvedDealerId, resolvedCode));
        }
      }
    } catch (error) {
      showError(error, "Failed to load dealer dashboard");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [dealerId, storedDealerCode, fetchDealerProfile, fetchDocsForUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      loadDashboard(false);
    }, 30000);
    return () => window.clearInterval(pollRef.current);
  }, [loadDashboard]);

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

  const openPreview = async (doc) => {
    if (!doc?.documentId) return;
    if (!token) {
      toast.error("Authorization token missing");
      return;
    }

    try {
      const res = await fetch(`http://localhost:8081/api/documents/preview/${doc.documentId}`, {
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
      try {
        setSelectedUserDocs(await getDealerUserDocuments(user.userId));
        setSelectedCounts({
          documentCount: user.documentCount || 0,
          pendingDocsCount: user.pendingDocsCount || 0,
          verifiedDocsCount: user.verifiedDocsCount || 0,
          approvedDocsCount: user.approvedDocsCount || 0,
          rejectedDocsCount: user.rejectedDocsCount || 0,
        });
      } catch {
        const [docsRes, countRes] = await Promise.all([
          api.get(`/documents/user/${user.userId}`),
          api.get(`/documents/count/${user.userId}`),
        ]);
        setSelectedUserDocs(docsRes.data?.data || []);
        setSelectedCounts(countRes.data?.data || null);
      }
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
      try {
        const [tracking, userDocs] = await Promise.all([
          getDealerUserTracking(user.userId),
          getDealerUserDocuments(user.userId),
        ]);
        setTrackingData(tracking);
        setTrackingDocs(userDocs);
        setTrackingCounts({
          documentCount: user.documentCount || userDocs.length,
          pendingDocsCount: user.pendingDocsCount || userDocs.filter((doc) => doc.status === "PENDING").length,
          verifiedDocsCount: user.verifiedDocsCount || userDocs.filter((doc) => doc.status === "VERIFIED").length,
          approvedDocsCount: user.approvedDocsCount || userDocs.filter((doc) => doc.status === "APPROVED").length,
          rejectedDocsCount: user.rejectedDocsCount || userDocs.filter((doc) => doc.status === "REJECTED").length,
        });
      } catch {
        const [docsRes, countRes] = await Promise.all([
          api.get(`/documents/user/${user.userId}`),
          api.get(`/documents/count/${user.userId}`),
        ]);
        setTrackingDocs(docsRes.data?.data || []);
        setTrackingCounts(countRes.data?.data || null);
      }
    } catch (error) {
      showError(error, "Failed to load user status details");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("dealerData");
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
    setWizardOpen(true);
    setEmploymentType("");
    setFiles({});
    setUploadedDocs([]);
    setPersonalForm(initialPersonalForm);
  };

  const openUploadWizard = (user) => {
    if (isUserAssignedToBank(user)) {
      toast.info("This application is already assigned to a bank. Documents are locked.");
      return;
    }
    toast.info("Document upload wizard is being updated. Please use Status re-upload for rejected documents for now.");
  };

  const requiredUploadTypes = () => {
    const income =
      employmentType === "Salaried"
        ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
        : employmentType === "Self Employed"
          ? ["ITR_RETURN", "BANK_STATEMENT"]
          : [];
    return [...STEP_TYPES[2], ...income, ...STEP_TYPES[5]];
  };

  const validateFiles = () => {
    if (!files.PAN || !files.AADHAAR) {
      toast.error("Upload PAN and Aadhaar");
      return false;
    }
    if (!files.LIGHT_BILL && !files.RENTAL_AGREEMENT) {
      toast.error("Upload Light Bill or Rental Agreement");
      return false;
    }
    if (!employmentType) {
      toast.error("Select employment type");
      return false;
    }
    const missing = requiredUploadTypes().find((type) => !files[type]);
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
      personalForm.password,
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
      const registerRes = await api.post("/user/register", {
        fullName: personalForm.fullName,
        email: personalForm.email,
        mobileNumber: personalForm.mobileNumber,
        password: personalForm.password,
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
        paymentDone: false,
        paymentStatus: "PAYMENT_PENDING",
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
        const formData = new FormData();
        formData.append("userId", String(newUserId));
        formData.append("type", type);
        formData.append("file", files[type]);
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
      const requestPersonalInfo = {
        loanAmount: Number(personalForm.loanAmount),
      };
      writePaymentStatus(newUserId, PAYMENT_STATUS.PAYMENT_PENDING);
      upsertDealerPaymentRequest({
        userId: Number(newUserId),
        status: PAYMENT_STATUS.PAYMENT_PENDING,
        profile: requestProfile,
        dealerProfile: profile,
        personalInfo: requestPersonalInfo,
        documents: uploadedDocuments.map((doc) => ({
          ...doc,
          userId: doc?.userId || Number(newUserId),
          status: doc?.status || "PENDING",
        })),
      });
      await loadDashboard();
      setActiveMenu("Dashboard");
      setPaymentPromptUser({
        ...requestProfile,
        loanAmount: requestPersonalInfo.loanAmount,
        documents: uploadedDocuments,
      });
      toast.success("Application saved. Complete Ready2Drive payment to send it to admin.");
      return true;
    } catch (error) {
      showError(error, "Failed to submit loan registration");
      return false;
    } finally {
      setSavingWizard(false);
    }
  };

  const openDealerQrPayment = () => {
    setQrImageError(false);
    setQrPaymentUser(paymentPromptUser);
    setPaymentPromptUser(null);
  };

  const verifyDealerPayment = () => {
    if (!qrPaymentUser?.userId) return;
    writePaymentStatus(qrPaymentUser.userId, PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING);
    upsertDealerPaymentRequest({
      userId: qrPaymentUser.userId,
      status: PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING,
      profile: qrPaymentUser,
      dealerProfile: profile,
      personalInfo: { loanAmount: qrPaymentUser.loanAmount },
      documents: qrPaymentUser.documents || [],
    });
    addLocalAdminNotification(
      `${profile.fullName || "Dealer"} submitted Ready2Drive payment verification for ${
        qrPaymentUser.fullName || "a customer"
      }.`
    );
    setQrPaymentUser(null);
    toast.success("Payment verification request sent to admin.");
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
      const formData = new FormData();
      formData.append("userId", String(userId));
      formData.append("type", type);
      formData.append("file", file);
      await api.post("/documents/upload", formData);
      if (readPaymentStatus(userId) === PAYMENT_STATUS.PAYMENT_APPROVED) {
        addLocalAdminNotification(
          `${user?.fullName || "Dealer customer"} reuploaded ${docLabel(type)}.`
        );
      }
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
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await api.post("/dealer/reset-password", {
        email: profile.email,
        newPassword: passwordForm.password,
      });
      setPasswordForm({ password: "", confirm: "" });
      toast.success("Password changed");
    } catch (error) {
      showError(error, "Failed to change password");
    }
  };

  const openPaymentForUser = (user) => {
    const userId = user?.userId || user?.id;
    if (!userId) return;
    const request = readPaymentRequests().find((item) => String(item.userId) === String(userId));
    const info = personalInfoFor(userId) || {};
    const userDocs = docs.filter((doc) => String(doc.userId) === String(userId));
    setPaymentPromptUser({
      userId,
      fullName: user.fullName || request?.fullName || "Customer",
      email: user.email || request?.email || "",
      mobileNumber: user.mobileNumber || request?.mobileNumber || "",
      loanAmount: info.loanAmount || request?.loanAmount || "",
      documents: request?.documents || userDocs,
    });
  };

  const sortedStatusUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
    );
  }, [users]);

  const title = normalizedMenu === "Users" ? "Users" : normalizedMenu;

  return (
    <div className="flex min-h-dvh bg-[#F4F6F9]">
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
        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 md:px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
              <p className="text-sm font-medium text-gray-500">Dealer Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                  <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
                    <div className="border-b border-gray-100 px-4 py-3 font-bold text-[#0B2A4A]">Notifications</div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No notifications</div>
                      ) : (
                        notifications.slice(0, 8).map((item) => (
                          <button
                            key={item.id}
                            onClick={() => markRead(item.id)}
                            className={`block w-full border-b border-gray-50 px-4 py-3 text-left text-sm ${
                              isNotificationRead(item) ? "bg-white text-gray-600" : "bg-[#EAFBF8] text-[#0B2A4A]"
                            }`}
                          >
                            {item.title && <p className="text-xs font-black uppercase text-[#27D3C3]">{item.title}</p>}
                            <p className="font-semibold">{item.message}</p>
                            <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {loading ? (
            <EmptyState text="Loading dealer dashboard..." />
          ) : (
            <>
              {normalizedMenu === "Dashboard" && (
                <DashboardTab
                  stats={stats}
                  rejectedUsers={rejectedUsers}
                  notifications={notifications}
                  users={users}
                  docs={docs}
                  markRead={markRead}
                  openNewCustomer={openWizard}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                  openPaymentForUser={openPaymentForUser}
                />
              )}

              {normalizedMenu === "Users" && (
                <UsersTab
                  users={users}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                  openPaymentForUser={openPaymentForUser}
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
                />
              )}

              {normalizedMenu === "Reports" && (
                <EmptyState text="Reports are not part of the current dealer API surface." />
              )}
            </>
          )}
        </div>
      </main>

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
          onClose={() => setWizardOpen(false)}
        />
      )}

      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} wide>
          <FilePreviewFrame preview={preview} />
        </Modal>
      )}

      {paymentPromptUser && (
        <DealerPaymentPromptModal
          customer={paymentPromptUser}
          onClose={() => setPaymentPromptUser(null)}
          onPayNow={openDealerQrPayment}
        />
      )}

      {qrPaymentUser && (
        <DealerQrPaymentModal
          customer={qrPaymentUser}
          qrImageError={qrImageError}
          setQrImageError={setQrImageError}
          onClose={() => setQrPaymentUser(null)}
          onVerifyPayment={verifyDealerPayment}
        />
      )}

      {/* Chatbot mount only; dashboard logic remains unchanged. */}
      <Chatbot roleOverride="DEALER" onNavigateSection={setActiveMenu} />
    </div>
  );
};

const DealerPaymentPromptModal = ({ customer, onClose, onPayNow }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B2A4A]">Ready2Drive Payment</h2>
          <p className="mt-2 text-sm font-semibold text-amber-700">
            Pay for {customer?.fullName || "this customer"} to send documents for admin review.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F6F9] text-[#0B2A4A]"
          aria-label="Close payment prompt"
        >
          <FaTimes />
        </button>
      </div>

      <PaymentBreakdown />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onPayNow}
          className="flex-1 rounded-2xl bg-[#0B2A4A] px-5 py-3 font-bold text-white"
        >
          Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl bg-[#F4F6F9] px-5 py-3 font-bold text-[#0B2A4A]"
        >
          Later
        </button>
      </div>
    </div>
  </div>
);

const DealerQrPaymentModal = ({
  customer,
  qrImageError,
  setQrImageError,
  onClose,
  onVerifyPayment,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B2A4A]">Ready2Drive Payment</h2>
          <p className="mt-1 text-sm text-slate-500">{customer?.fullName || "Customer"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4F6F9] text-[#0B2A4A]"
          aria-label="Close QR payment"
        >
          <FaTimes />
        </button>
      </div>

      <PaymentBreakdown compact />

      <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-100 bg-[#F4F6F9] p-4 sm:min-h-[260px] sm:p-5">
        {qrImageError ? (
          <div className="text-center">
            <p className="text-sm font-bold text-[#0B2A4A]">QR image placeholder</p>
            <p className="mt-2 text-xs text-slate-500">Add your QR image in src/assets.</p>
          </div>
        ) : (
          <img
            src={qrCode}
            alt="Ready2Drive payment QR code"
            onError={() => setQrImageError(true)}
            className="max-h-60 w-full object-contain"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onVerifyPayment}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#27D3C3] px-5 py-3 font-black text-[#0B2A4A]"
      >
        <FaRupeeSign />
        Verify Payment of {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
      </button>
    </div>
  </div>
);

const PaymentBreakdown = () => (
  <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-amber-800">Ready2Drive fee</span>
      <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_BASE_AMOUNT)}</span>
    </div>
    <div className="mt-2 flex items-center justify-between text-sm">
      <span className="font-semibold text-amber-800">{READY2DRIVE_GST_LABEL}</span>
      <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_GST_AMOUNT)}</span>
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3">
      <span className="text-sm font-bold text-[#0B2A4A]">Total payable</span>
      <span className="text-xl font-black text-[#0B2A4A]">
        {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
      </span>
    </div>
  </div>
);

const DashboardTab = ({
  stats,
  rejectedUsers,
  notifications,
  users,
  docs,
  markRead,
  openNewCustomer,
  openUserModal,
  openTrackingModal,
  openPaymentForUser,
}) => {
  const [statOverlay, setStatOverlay] = useState(null);
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const userNameById = new Map(users.map((user) => [String(user.userId), user.fullName || `User #${user.userId}`]));
  const documentItems = (list) =>
    list.map((doc) => ({
      title: docLabel(doc.documentType),
      subtitle: userNameById.get(String(doc.userId)) || doc.fileName || "Customer",
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
      label: "Admin Approval Pending",
      value: stats.pending,
      items: documentItems(docs.filter((doc) => doc.status === "PENDING")),
    },
    {
      icon: <FaCheckCircle />,
      label: "Admin Approved Docs",
      value: stats.approved,
      items: documentItems(docs.filter((doc) => doc.status === "APPROVED")),
    },
    {
      icon: <FaRedo />,
      label: "Admin Rejected Docs",
      value: stats.rejected || 0,
      items: documentItems(docs.filter((doc) => doc.status === "REJECTED")),
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
            openPaymentForUser={openPaymentForUser}
          />
        </section>

        <section>
          <SectionTitle title="Latest Notifications" />
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {notifications.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`block w-full border-b border-gray-50 p-4 text-left text-sm ${
                  isNotificationRead(item) ? "bg-white" : "bg-[#EAFBF8]"
                }`}
              >
                {item.title && <p className="text-xs font-black uppercase text-[#27D3C3]">{item.title}</p>}
                <p className="font-semibold text-[#0B2A4A]">{item.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
              </button>
            ))}
            {notifications.length === 0 && <div className="p-4 sm:p-5 text-sm text-gray-500">No notifications</div>}
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

const paymentStatusLabel = (status) => {
  if (status === PAYMENT_STATUS.PAYMENT_APPROVED) return "Admin Review Active";
  if (status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING) return "Payment Verification Pending";
  return "Ready2Drive Payment Pending";
};

const paymentStatusStyle = (status) => {
  if (status === PAYMENT_STATUS.PAYMENT_APPROVED) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING) return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const PaymentStatusPill = ({ userId }) => {
  const status = readPaymentStatus(userId);
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${paymentStatusStyle(status)}`}>
      {paymentStatusLabel(status)}
    </span>
  );
};

const UserTable = ({ users, openUserModal, openTrackingModal, openPaymentForUser }) => (
  <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left">
        <thead className="bg-[#0B2A4A] text-sm text-white">
          <tr>
            <th className="px-5 py-4">Name</th>
            <th className="px-5 py-4">Email</th>
            <th className="px-5 py-4">Mobile</th>
            <th className="px-5 py-4">Ready2Drive Status</th>
            <th className="px-5 py-4">Registered Date</th>
            {openUserModal && <th className="px-5 py-4">Action</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} className="border-b border-gray-50 text-sm">
              <td className="px-5 py-4 font-bold text-[#0B2A4A]">{user.fullName || "-"}</td>
              <td className="px-5 py-4 text-gray-600">{user.email || "-"}</td>
              <td className="px-5 py-4 text-gray-600">{user.mobileNumber || "-"}</td>
              <td className="px-5 py-4"><PaymentStatusPill userId={user.userId} /></td>
              <td className="px-5 py-4 text-gray-600">{formatDate(user.createdAt)}</td>
              {openUserModal && (
                <td className="px-5 py-4 flex gap-2">
                  {readPaymentStatus(user.userId) === PAYMENT_STATUS.PAYMENT_PENDING && openPaymentForUser && (
                    <button
                      onClick={() => openPaymentForUser(user)}
                      className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white"
                    >
                      Pay
                    </button>
                  )}
                  <button
                    onClick={() => openUserModal(user)}
                    className="rounded-2xl bg-[#0B2A4A] px-4 py-2 text-sm font-bold text-white"
                  >
                    View Info
                  </button>
                  <button
                    onClick={() => openTrackingModal(user)}
                    className="rounded-2xl bg-[#27D3C3] px-4 py-2 text-sm font-black text-[#0B2A4A]"
                  >
                    View Status
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No users found</div>}
    </div>
  </div>
);

const UsersTab = ({ users, openUserModal, openTrackingModal, openPaymentForUser }) => (
  <div className="space-y-5">
    <SectionTitle title="My Users" />
    <UserTable
      users={users}
      openUserModal={openUserModal}
      openTrackingModal={openTrackingModal}
      openPaymentForUser={openPaymentForUser}
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
}) => {
  const [editing, setEditing] = useState({});
  const updateProfile = (key, value) => setProfile((prev) => ({ ...prev, [key]: value }));

  const editableFields = [
    ["fullName", "Dealer Name", "text"],
    ["email", "Email", "email"],
    ["mobileNumber", "Mobile Number", "tel"],
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0B2A4A]">Dealer Profile</h2>
            <p className="mt-1 text-sm text-gray-500">Manage dealer contact details.</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="rounded-2xl bg-[#0B2A4A] px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {editableFields.map(([key, label, type]) => (
            <div key={key} className="rounded-2xl bg-[#F4F6F9] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase text-gray-400">{label}</p>
                <button
                  onClick={() => setEditing((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#0B2A4A]"
                  aria-label={`Edit ${label}`}
                  title={`Edit ${label}`}
                >
                  <FaEdit />
                </button>
              </div>
              {editing[key] ? (
                <input
                  type={type}
                  value={profile[key] || ""}
                  onChange={(event) => updateProfile(key, event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-semibold text-[#0B2A4A] outline-none focus:border-[#27D3C3]"
                />
              ) : (
                <p className="break-words text-base font-bold text-[#0B2A4A]">
                  {profile[key] || "Not available"}
                </p>
              )}
            </div>
          ))}
          <InfoTile label="Dealer Code" value={profile.dealerCode || "Not available"} />
          <InfoTile label="Role" value={profile.role || "DEALER"} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAFBF8] text-[#0B2A4A]">
            <FaLock />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0B2A4A]">Update Password</h2>
            <p className="mt-1 text-sm text-gray-500">Set a new dealer account password.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="New Password"
            type="password"
            value={passwordForm.password}
            onChange={(value) => setPasswordForm({ ...passwordForm, password: value })}
          />
          <FormField
            label="Confirm Password"
            type="password"
            value={passwordForm.confirm}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirm: value })}
          />
        </div>
        <button
          onClick={changePassword}
          className="mt-2 rounded-2xl bg-[#27D3C3] px-5 py-3 font-black text-[#0B2A4A]"
        >
          Update Password
        </button>
      </section>
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
        {["pendingCount", "verifiedCount", "approvedCount", "rejectedCount"].map((key) => (
          <div key={key} className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">{key.replace("Count", "")}</p>
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
          approved: userDocs.filter((doc) => doc.status === "APPROVED").length,
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
  onClose,
}) => {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const incomeTypes =
    employmentType === "Salaried"
      ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
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
  const selectedDocuments = Object.entries(files)
    .filter(([, file]) => Boolean(file))
    .map(([type, file]) => ({ type, file }));

  const validatePreview = () => {
    const required = [
      personalForm.fullName,
      personalForm.email,
      personalForm.mobileNumber,
      personalForm.password,
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
    if (!files.PAN || !files.AADHAAR) {
      toast.error("Upload PAN and Aadhaar");
      return false;
    }
    if (!files.LIGHT_BILL && !files.RENTAL_AGREEMENT) {
      toast.error("Upload Light Bill or Rental Agreement");
      return false;
    }
    const missingIncome = incomeTypes.find((type) => !files[type]);
    if (missingIncome) {
      toast.error(`Upload ${docLabel(missingIncome)}`);
      return false;
    }
    const missingVehicle = STEP_TYPES[5].find((type) => !files[type]);
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
    <Modal title="New User Loan Registration" onClose={onClose} wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validatePreview()) setReviewOpen(true);
        }}
        className="space-y-6"
      >
        <section className="rounded-3xl bg-[#F4F6F9] p-4 sm:p-5">
          <h4 className="mb-4 font-black text-[#0B2A4A]">User Details</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Full Name" value={personalForm.fullName} onChange={(value) => updateForm("fullName", value)} />
            <FormField label="Email" type="email" value={personalForm.email} onChange={(value) => updateForm("email", value)} />
            <FormField
              label="Mobile Number"
              value={personalForm.mobileNumber}
              onChange={(value) => updateForm("mobileNumber", value.replace(/\D/g, "").slice(0, 10))}
            />
            <PasswordField
              label="Password"
              value={personalForm.password}
              onChange={(value) => updateForm("password", value)}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm">
          <h4 className="mb-4 font-black text-[#0B2A4A]">Loan & Address Details</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              onChange={(value) => updateForm("loanAmount", value)}
            />
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-bold text-[#0B2A4A]">Employment Type</span>
              <select
                value={employmentType}
                onChange={(event) => updateEmploymentType(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#0B2A4A] outline-none focus:border-[#27D3C3]"
              >
                <option value="">Select Employment Type</option>
                <option value="Salaried" disabled={lockedIncomeType === "Self Employed"}>Salaried</option>
                <option value="Self Employed" disabled={lockedIncomeType === "Salaried"}>Self Employed</option>
              </select>
              {lockedIncomeType && (
                <span className="mt-2 block text-xs font-semibold text-amber-700">
                  {lockedIncomeType} income documents selected. Other income type is locked.
                </span>
              )}
            </label>
          </div>
        </section>

        <UploadStep title="KYC Documents" types={STEP_TYPES[2]} files={files} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} />
        <UploadStep title="Residential Proof" types={STEP_TYPES[3]} files={files} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} note="Upload Light Bill or Rental Agreement." />
        {incomeTypes.length > 0 && <UploadStep title="Income Documents" types={incomeTypes} files={files} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} />}
        <UploadStep title="Vehicle Documents" types={STEP_TYPES[5]} files={files} setFile={handleSetFile} onPreviewFile={openSelectedFilePreview} />

        {uploadedDocs.length > 0 && (
          <section className="space-y-4 rounded-3xl bg-[#F4F6F9] p-4 sm:p-5">
            <h4 className="font-black text-[#0B2A4A]">Uploaded Documents</h4>
            <DocumentGrid docs={uploadedDocs} openPreview={openPreview} />
          </section>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 border-t border-gray-100 pt-5">
          <button type="button" onClick={onClose} className="rounded-2xl bg-[#F4F6F9] px-5 py-3 font-bold text-[#0B2A4A]">
            Close
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (validatePreview()) setReviewOpen(true);
            }}
            className="rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white disabled:opacity-60"
          >
            Preview Application
          </button>
        </div>
      </form>

      {reviewOpen && (
        <ApplicationReviewModal
          form={personalForm}
          employmentType={employmentType}
          documents={selectedDocuments}
          saving={saving}
          onClose={() => setReviewOpen(false)}
          onPreviewFile={openSelectedFilePreview}
          onVerifySubmit={handleVerifySubmit}
        />
      )}

      {localPreview && (
        <Modal title={localPreview.title} onClose={closeSelectedFilePreview} wide>
          <FilePreviewFrame preview={localPreview} />
        </Modal>
      )}
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
          {documents.map(({ type, file }) => (
            <div key={type} className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <p className="font-black text-[#0B2A4A]">{docLabel(type)}</p>
              <p className="mt-1 truncate text-sm text-gray-500">{file.name}</p>
              <button
                type="button"
                onClick={() => onPreviewFile(type, file)}
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

const UploadStep = ({ title, types, files, setFile, onPreviewFile, note }) => (
  <div>
    <h4 className="font-black text-[#0B2A4A]">{title}</h4>
    {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => (
        <div key={type} className="rounded-3xl border border-gray-100 bg-[#F4F6F9] p-4 sm:p-5">
          <span className="font-black text-[#0B2A4A]">{docLabel(type)}</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
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
      ))}
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
    const approvedCount = docs?.filter((d) => d.status === "APPROVED").length || 0;
    const verifiedCount = docs?.filter((d) => d.status === "VERIFIED").length || 0;
    const rejectedCount = docs?.filter((d) => d.status === "REJECTED").length || 0;

    const hasDocs = totalDocs > 0;
    const allApproved = hasDocs && approvedCount === totalDocs;
    const underReview = hasDocs && (pendingCount > 0 || verifiedCount > 0);
    const hasRejected = hasDocs && rejectedCount > 0;

    const isSentToBank = !!localStorage.getItem(`user_bank_assignment_${user.userId}`);

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
      { title: "Application Tracking", status: "DONE", detail: "Loan application created." },
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
          <p className="text-sm opacity-80">{user.email} â€¢ {user.mobileNumber}</p>
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
                  {isDone ? "âœ“" : idx + 1}
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

export default DealerDashboard;



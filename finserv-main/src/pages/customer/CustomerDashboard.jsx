import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaBars,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaEye,
  FaEyeSlash,
  FaFileAlt,
  FaLock,
  FaPaperPlane,
  FaRedo,
  FaRupeeSign,
  FaTimes,
  FaUniversity,
} from "react-icons/fa";
import Sidebar from "../../components/customer/Sidebar";
import api from "../../services/api";
import qrCode from "../../assets/upi_1780494820795.png";
import Footer from "../landing/Footer";
import { clearAuthSession } from "../../utils/authSession";
import {
  READY2DRIVE_BASE_AMOUNT,
  READY2DRIVE_FEE_LABEL,
  READY2DRIVE_GST_AMOUNT,
  READY2DRIVE_GST_LABEL,
  READY2DRIVE_GST_PERCENT,
  READY2DRIVE_TOTAL_AMOUNT,
  formatINR,
} from "../../constants/payment";
import Chatbot from "../../components/chatbot/Chatbot";

const DOCUMENT_LABELS = {
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

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  VERIFIED: "bg-sky-100 text-sky-700",
  REJECTED: "bg-red-100 text-red-700",
};

const OPTIONAL_DOCUMENT_TYPES = new Set();
const VEHICLE_REQUIRED_TYPES = [
  "RC",
  "INSURANCE",
  "CAR_FRONT_SIDE_PHOTO",
  "CAR_BACK_SIDE_PHOTO",
  "CHASSIS_NUMBER",
  "ODOMETER_READING",
];

const SALARIED_INCOME_TYPES = new Set(["SALARY_SLIP", "APPOINTMENT_LETTER"]);
const SELF_EMPLOYED_INCOME_TYPES = new Set(["ITR_RETURN"]);

const getIncomeGroupForType = (type) => {
  if (SALARIED_INCOME_TYPES.has(type)) return "Salaried";
  if (SELF_EMPLOYED_INCOME_TYPES.has(type)) return "Self Employed";
  return "";
};

const getLockedIncomeTypeFromDocs = (docsByType) => {
  const hasSalariedDocs = Array.from(SALARIED_INCOME_TYPES).some((type) =>
    hasUsableDocument(docsByType, type)
  );
  const hasSelfEmployedDocs = Array.from(SELF_EMPLOYED_INCOME_TYPES).some((type) =>
    hasUsableDocument(docsByType, type)
  );
  if (hasSalariedDocs) return "Salaried";
  if (hasSelfEmployedDocs) return "Self Employed";
  return "";
};

const STEPS = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "KYC Documents", types: ["PAN", "AADHAAR"] },
  { id: 3, title: "Residential", types: ["LIGHT_BILL", "RENTAL_AGREEMENT"] },
  { id: 4, title: "Income", types: [] },
  {
    id: 5,
    title: "Vehicle Documents",
    types: [
      "RC",
      "INSURANCE",
      "CAR_FRONT_SIDE_PHOTO",
      "CAR_BACK_SIDE_PHOTO",
      "CHASSIS_NUMBER",
      "ODOMETER_READING",
    ],
  },
  { id: 6, title: "Verify & Submit" },
];

const getUserSession = () => {
  try {
    return JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    return {};
  }
};

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const emptyProfile = {
  userId: "",
  fullName: "",
  email: "",
  mobileNumber: "",
  registrationType: "INDIVIDUAL",
  dealerCode: "",
  role: "USER",
};

const emptyPersonalInfo = {
  fullName: "",
  email: "",
  mobileNumber: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  loanAmount: "",
};

const PERSONAL_INFO_REQUIRED_FIELDS = [
  ["fullName", "Full Name"],
  ["email", "Email"],
  ["mobileNumber", "Mobile Number"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["loanAmount", "Loan Amount"],
];

const getMissingPersonalInfoFields = (personalInfo) =>
  PERSONAL_INFO_REQUIRED_FIELDS.filter(
    ([key]) => String(personalInfo?.[key] || "").trim() === ""
  ).map(([, label]) => label);

const getPersonalInfoDraft = (userId, session) => {
  try {
    const draft = JSON.parse(localStorage.getItem(`personal_info_draft_${userId}`) || "{}");
    return {
      ...emptyPersonalInfo,
      fullName: session?.name || "",
      email: session?.email || "",
      ...draft,
    };
  } catch {
    return {
      ...emptyPersonalInfo,
      fullName: session?.name || "",
      email: session?.email || "",
    };
  }
};

const hasSavedPersonalInfoDraft = (userId) => {
  try {
    if (localStorage.getItem(`personal_info_saved_${userId}`) === "true") return true;
    const draft = JSON.parse(localStorage.getItem(`personal_info_draft_${userId}`) || "{}");
    return !!(
      draft.mobileNumber ||
      draft.address ||
      draft.city ||
      draft.state ||
      draft.pincode ||
      draft.loanAmount
    );
  } catch {
    return false;
  }
};

const hasUsableDocument = (docsByType, type) => {
  const doc = docsByType[type];
  return !!doc && doc.status !== "REJECTED";
};

const getDocumentType = (doc) => doc?.documentType || doc?.type || "";

const getDocumentSortValue = (doc) => {
  const dateValue = doc?.updatedAt || doc?.uploadedAt || doc?.createdAt;
  if (dateValue) {
    const time = new Date(dateValue).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return Number(doc?.documentId || doc?.id || 0);
};

const pickLatestDocument = (current, next) => {
  if (!current) return next;
  const currentValue = getDocumentSortValue(current);
  const nextValue = getDocumentSortValue(next);
  if (nextValue !== currentValue) return nextValue > currentValue ? next : current;
  if (current.status === "REJECTED" && next.status !== "REJECTED") return next;
  return current;
};

const latestDocumentsByType = (documents) => {
  const byType = new Map();
  documents.filter(Boolean).forEach((doc) => {
    const type = getDocumentType(doc);
    if (!type) return;
    byType.set(type, pickLatestDocument(byType.get(type), doc));
  });
  return Array.from(byType.values()).sort((a, b) => getDocumentSortValue(b) - getDocumentSortValue(a));
};

const missingLabel = (type) =>
  type === "RESIDENTIAL_PROOF"
    ? "Light Bill or Rental Agreement"
    : DOCUMENT_LABELS[type] || type;

const PAYMENT_STATUS = {
  DRAFT: "DRAFT",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  PAYMENT_VERIFICATION_PENDING: "PAYMENT_VERIFICATION_PENDING",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
};

const PAYMENT_REQUESTS_KEY = "customer_payment_requests";
const ADMIN_NOTIFICATIONS_KEY = "admin_activity_notifications";
const CUSTOMER_NOTIFICATIONS_KEY = "customer_activity_notifications";

const getPaymentStorageKey = (userId) => `customer_payment_status_${userId || "guest"}`;

const getStoredPaymentStatus = (userId) => {
  try {
    return localStorage.getItem(getPaymentStorageKey(userId)) || PAYMENT_STATUS.DRAFT;
  } catch {
    return PAYMENT_STATUS.DRAFT;
  }
};

const getAssignedBankDetailKey = (userId) => `user_bank_assignment_detail_${userId}`;

const readLocalAssignedBank = (userId) => {
  try {
    const detail = JSON.parse(localStorage.getItem(getAssignedBankDetailKey(userId)) || "null");
    if (detail) return detail;
  } catch {
    // Ignore malformed local assignment data.
  }

  const bankId = localStorage.getItem(`user_bank_assignment_${userId}`);
  return bankId ? { bankId, assignedBankId: bankId, bankName: "Assigned" } : null;
};

const inferPaymentStatus = (user) =>
  user?.paymentDone
    ? PAYMENT_STATUS.PAYMENT_APPROVED
    : getStoredPaymentStatus(user?.userId || user?.id);

const upsertPaymentRequest = ({ userId, status, profile, personalInfo, documents }) => {
  if (!userId) return;
  try {
    const requests = JSON.parse(localStorage.getItem(PAYMENT_REQUESTS_KEY) || "[]");
    const nextRequest = {
      userId,
      status,
      fullName: profile?.fullName || personalInfo?.fullName || "Customer",
      email: profile?.email || personalInfo?.email || "",
      mobileNumber: profile?.mobileNumber || personalInfo?.mobileNumber || "",
      loanAmount: personalInfo?.loanAmount || "",
      feeName: READY2DRIVE_FEE_LABEL,
      feeBaseAmount: READY2DRIVE_BASE_AMOUNT,
      gstRatePercent: READY2DRIVE_GST_PERCENT,
      gstAmount: READY2DRIVE_GST_AMOUNT,
      payableAmount: READY2DRIVE_TOTAL_AMOUNT,
      documentCount: documents?.length || 0,
      documents:
        documents?.map((doc) => ({
          ...doc,
          userId: doc.userId || userId,
          status: doc.status || "PENDING",
        })) || [],
      updatedAt: new Date().toISOString(),
    };
    const exists = requests.some((request) => String(request.userId) === String(userId));
    const nextRequests = exists
      ? requests.map((request) =>
          String(request.userId) === String(userId) ? { ...request, ...nextRequest } : request
        )
      : [nextRequest, ...requests];
    localStorage.setItem(PAYMENT_REQUESTS_KEY, JSON.stringify(nextRequests));
  } catch {
    localStorage.setItem(
      PAYMENT_REQUESTS_KEY,
      JSON.stringify([
        {
          userId,
          status,
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
          documents:
            documents?.map((doc) => ({
              ...doc,
              userId: doc.userId || userId,
              status: doc.status || "PENDING",
            })) || [],
          updatedAt: new Date().toISOString(),
        },
      ])
    );
  }
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

const readLocalCustomerNotifications = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY) || "[]").filter(
      (item) => String(item.userId) === String(userId)
    );
  } catch {
    return [];
  }
};

const markLocalCustomerNotificationRead = (notificationId) => {
  try {
    const notifications = JSON.parse(localStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY) || "[]");
    localStorage.setItem(
      CUSTOMER_NOTIFICATIONS_KEY,
      JSON.stringify(
        notifications.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item
        )
      )
    );
  } catch {
    // Ignore malformed local notification data.
  }
};

const getNotificationId = (item) => item?.id ?? item?.notificationId ?? item?.notification_id ?? "";

const getNotificationMessage = (item) =>
  item?.message ?? item?.notification ?? item?.title ?? item?.description ?? "Notification update";

const getNotificationCreatedAt = (item) =>
  item?.createdAt ?? item?.created_at ?? item?.timestamp ?? item?.date ?? new Date().toISOString();

const getNotificationRead = (item) => Boolean(item?.read ?? item?.isRead ?? item?.readStatus ?? false);

const normalizeNotification = (item, fallbackId) => {
  if (!item) return null;
  const id = getNotificationId(item) || fallbackId;
  return {
    ...item,
    id: String(id),
    message: getNotificationMessage(item),
    createdAt: getNotificationCreatedAt(item),
    read: getNotificationRead(item),
  };
};

const notificationListFromResponse = (response) => {
  const data = unwrap(response);
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  return [
    data.notifications,
    data.content,
    data.items,
    data.records,
    data.result,
    data.results,
    data.data,
  ].find(Array.isArray) || [];
};

const mergeNotifications = (...lists) =>
  Array.from(
    lists
    .flat()
    .filter(Boolean)
      .map((item, index) => normalizeNotification(item, `customer-notification-${index}`))
      .filter(Boolean)
      .reduce((map, item) => map.set(item.id, item), new Map())
      .values()
  ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const session = useMemo(getUserSession, []);
  const userId = session?.id;

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState("");
  const [preview, setPreview] = useState(null);
  const [paymentPromptOpen, setPaymentPromptOpen] = useState(false);
  const [qrPaymentOpen, setQrPaymentOpen] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [employmentType, setEmploymentType] = useState("Salaried");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(() =>
    getStoredPaymentStatus(userId)
  );
  const [profile, setProfile] = useState({
    ...emptyProfile,
    userId,
    fullName: session?.name || "",
    email: session?.email || "",
    dealerCode: session?.dealerCode || "",
  });
  const [personalInfo, setPersonalInfo] = useState(() =>
    getPersonalInfoDraft(userId, session)
  );
  const [hasPersonalInfo, setHasPersonalInfo] = useState(() =>
    hasSavedPersonalInfoDraft(userId)
  );
  const [documents, setDocuments] = useState([]);
  const [counts, setCounts] = useState({
    pendingCount: 0,
    verifiedCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assignedBank, setAssignedBank] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    fullName: session?.name || "",
    email: session?.email || "",
    mobileNumber: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const rejectedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "REJECTED"),
    [documents]
  );

  const docsByType = useMemo(() => {
    return documents.reduce((acc, doc) => {
      const type = getDocumentType(doc);
      if (!type) return acc;
      acc[type] = pickLatestDocument(acc[type], doc);
      return acc;
    }, {});
  }, [documents]);
  const lockedIncomeType = useMemo(() => getLockedIncomeTypeFromDocs(docsByType), [docsByType]);

  const fetchDashboardData = useCallback(
    async (showSpinner = false) => {
      if (!userId) {
        setLoading(false);
        toast.error("User session not found. Please login again.");
        return;
      }

      if (showSpinner) setLoading(true);
      try {
        setPaymentStatus(getStoredPaymentStatus(userId));
        const [userRes, docsRes, notificationsRes, paymentHistoryRes] =
          await Promise.allSettled([
            api.get(`/user/${userId}`),
            api.get(`/documents/user/${userId}`),
            api.get(`/notifications/${userId}`),
            api.get(`/user/history/${userId}`),
          ]);

        let backendPaymentApproved = false;
        if (paymentHistoryRes.status === "fulfilled") {
          const historyData = unwrap(paymentHistoryRes.value) || {};
          if (historyData.paymentStatus === "APPROVED") {
            backendPaymentApproved = true;
          }
        }

        if (userRes.status === "fulfilled") {
          const user = unwrap(userRes.value) || {};
          const isApproved = backendPaymentApproved || user.paymentDone;
          setPaymentStatus(isApproved ? PAYMENT_STATUS.PAYMENT_APPROVED : inferPaymentStatus(user));
          const nextProfile = {
            ...emptyProfile,
            ...user,
            userId: user.userId || userId,
            fullName: user.fullName || session?.name || "",
            email: user.email || session?.email || "",
            dealerCode: user.dealerCode || session?.dealerCode || "",
            role: user.role || "USER",
          };
          setProfile(nextProfile);
          setSettingsForm({
            fullName: nextProfile.fullName,
            email: nextProfile.email,
            mobileNumber: nextProfile.mobileNumber || "",
          });
          setPersonalInfo((prev) => ({
            ...prev,
            fullName: nextProfile.fullName,
            email: nextProfile.email,
            mobileNumber: prev.mobileNumber || nextProfile.mobileNumber || "",
          }));
          if (user.applicationId) {
            setApplicationNumber(user.applicationId);
          }
          const bankId = user.bankId || user.assignedBankId;
          const backendBankName = user.assignedBankName || user.bankName;
          const localAssignedBank = readLocalAssignedBank(userId);
          if (bankId) {
            try {
              const banksRes = await api.get("/admin/banks");
              const bankList = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.data || [];
              const bank = bankList.find((b) => String(b.bankId) === String(bankId));
              setAssignedBank(bank || { ...localAssignedBank, bankId, bankName: backendBankName || localAssignedBank?.bankName || "Assigned" });
            } catch {
              setAssignedBank({ ...localAssignedBank, bankId, bankName: backendBankName || localAssignedBank?.bankName || "Assigned" });
            }
          } else if (backendBankName || localAssignedBank) {
            setAssignedBank({
              ...(localAssignedBank || {}),
              bankName: backendBankName || localAssignedBank?.bankName || "Assigned",
              assignedBankName: backendBankName || localAssignedBank?.assignedBankName || localAssignedBank?.bankName || "Assigned",
            });
          } else {
            setAssignedBank(null);
          }
        }

        let effectiveDocumentsForCounts = null;
        if (docsRes.status === "fulfilled") {
          const loadedDocuments = latestDocumentsByType(unwrap(docsRes.value) || []);
          const localAssignedBank = readLocalAssignedBank(userId);
          const user = userRes.status === "fulfilled" ? unwrap(userRes.value) || {} : {};
          const hasAssignedBank = !!(
            user.bankId ||
            user.assignedBankId ||
            user.assignedBankName ||
            user.bankName ||
            localAssignedBank
          );
          effectiveDocumentsForCounts = hasAssignedBank
            ? loadedDocuments.map((doc) => ({ ...doc, status: "APPROVED", remarks: "" }))
            : loadedDocuments;
          setDocuments(effectiveDocumentsForCounts);
          setCounts(countsFromDocuments(effectiveDocumentsForCounts));
        }

        // Counts are computed locally from documents above

        if (notificationsRes.status === "fulfilled") {
          setNotifications(
            mergeNotifications(
              readLocalCustomerNotifications(userId),
              notificationListFromResponse(notificationsRes.value)
            )
          );
        } else {
          setNotifications(mergeNotifications(readLocalCustomerNotifications(userId)));
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [session?.dealerCode, session?.email, session?.name, userId]
  );

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => fetchDashboardData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`personal_info_draft_${userId}`, JSON.stringify(personalInfo));
  }, [personalInfo, userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(getPaymentStorageKey(userId), paymentStatus);
  }, [paymentStatus, userId]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const persistPersonalInfo = async (payload) => {
    if (hasPersonalInfo) {
      try {
        await api.put(`/personal-info/update/${userId}`, payload);
        return;
      } catch (error) {
        if (![404, 409, 500].includes(error?.response?.status)) {
          throw error;
        }
      }
    }

    try {
      await api.post("/personal-info/save", payload);
    } catch (error) {
      if ([400, 409, 500].includes(error?.response?.status)) {
        await api.put(`/personal-info/update/${userId}`, payload);
        return;
      }
      throw error;
    }
  };

  const savePersonalInfo = async () => {
    const missingFields = getMissingPersonalInfoFields(personalInfo);
    if (missingFields.length > 0) {
      toast.error(`Please fill ${missingFields.join(", ")} before continuing.`);
      return;
    }

    const payload = {
      userId,
      address: personalInfo.address,
      mobileNumber: personalInfo.mobileNumber,
      city: personalInfo.city,
      state: personalInfo.state,
      pincode: personalInfo.pincode,
      loanAmount: Number(personalInfo.loanAmount) || 0,
    };

    if (payload.loanAmount < 100000) {
      toast.error("Loan amount must be greater than 1 Lakh.");
      return;
    }

    setSaving(true);
    try {
      await persistPersonalInfo(payload);
      toast.success("Personal information saved.");
      localStorage.setItem(`personal_info_draft_${userId}`, JSON.stringify(personalInfo));
      localStorage.setItem(`personal_info_saved_${userId}`, "true");
      setHasPersonalInfo(true);
      setCurrentStep(2);
      await fetchDashboardData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save personal information.");
    } finally {
      setSaving(false);
    }
  };

  const uploadForType = async (type, file) => {
    if (!file) return;
    if (assignedBank) {
      toast.info("Your application is already assigned to a bank. Documents are locked.");
      return;
    }
    const incomeGroup = getIncomeGroupForType(type);
    if (incomeGroup && lockedIncomeType && lockedIncomeType !== incomeGroup) {
      toast.error(
        `${lockedIncomeType} income documents already uploaded. Remove them before switching income type.`
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5MB or smaller.");
      return;
    }

    const existing = docsByType[type];
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("type", type);
    formData.append("file", file);

    setUploadingType(type);
    try {
      const existingDocumentId = existing?.documentId || existing?.id;
      const wasRejected = existing?.status === "REJECTED";

      if (existingDocumentId) {
        try {
          await api.delete(`/documents/${existingDocumentId}`);
        } catch (deleteError) {
          if (deleteError?.response?.status !== 404) {
            throw deleteError;
          }
        }
      }
      await api.post("/documents/upload", formData);
      if (existingDocumentId && paymentStatus === PAYMENT_STATUS.PAYMENT_APPROVED) {
        addLocalAdminNotification(
          `${profile.fullName || "Customer"} ${wasRejected ? "reuploaded" : "replaced"} ${
            DOCUMENT_LABELS[type] || type
          }.`
        );
      }
      toast.success(
        `${DOCUMENT_LABELS[type] || type} ${existingDocumentId ? "replaced" : "uploaded"}.`
      );
      await fetchDashboardData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed.");
    } finally {
      setUploadingType("");
    }
  };

  const openPreview = async (document) => {
    const documentId = typeof document === "object" ? document?.documentId : document;
    if (!documentId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://v1.vahanfinserv.com/api/documents/preview/${documentId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) throw new Error("Preview failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = typeof document === "object" ? document?.fileName || "" : "";
      const contentType = blob.type || response.headers.get("content-type") || "";
      const lowerFileName = fileName.toLowerCase();
      const isImage =
        contentType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(lowerFileName);
      const isPdf = contentType.includes("pdf") || lowerFileName.endsWith(".pdf");

      if (preview?.url) URL.revokeObjectURL(preview.url);
      setPreview({
        url,
        fileName,
        isImage,
        isPdf,
      });
    } catch {
      toast.error("Unable to preview this document.");
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const markNotificationRead = async (notificationId) => {
    if (String(notificationId).startsWith("local-customer-")) {
      markLocalCustomerNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === String(notificationId) ? { ...item, read: true } : item))
      );
      return;
    }
    try {
      await api.put(`/notifications/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === String(notificationId) ? { ...item, read: true } : item
        )
      );
    } catch {
      toast.error("Failed to update notification.");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: settingsForm.fullName,
        email: settingsForm.email,
        mobileNumber: settingsForm.mobileNumber,
        registrationType: profile.registrationType || "INDIVIDUAL",
        role: profile.role || "USER",
      };
      await api.put(`/user/update/${userId}`, payload);
      const stored = getUserSession();
      localStorage.setItem(
        "userData",
        JSON.stringify({ ...stored, name: settingsForm.fullName })
      );
      toast.success("Profile updated.");
      await fetchDashboardData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
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

    setSaving(true);
    try {
      await api.post("/user/reset-password", {
        email: settingsForm.email,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast.success("Password changed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const incomeTypes =
    employmentType === "Salaried"
      ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
      : ["ITR_RETURN", "BANK_STATEMENT"];

  const missingRequiredTypes = useMemo(
    () => {
      const missing = ["PAN", "AADHAAR", ...incomeTypes, ...VEHICLE_REQUIRED_TYPES].filter(
        (type) => !hasUsableDocument(docsByType, type)
      );

      const hasResidentialProof =
        hasUsableDocument(docsByType, "LIGHT_BILL") ||
        hasUsableDocument(docsByType, "RENTAL_AGREEMENT");

      return hasResidentialProof ? missing : [...missing, "RESIDENTIAL_PROOF"];
    },
    [docsByType, incomeTypes]
  );

  const submitForApproval = async () => {
    if (!hasPersonalInfo) {
      toast.error("Please save personal information before final submit.");
      setCurrentStep(1);
      return;
    }

    if (missingRequiredTypes.length > 0) {
      toast.error("Please upload all required documents before final submit.");
      return;
    }

    setSaving(true);
    try {
      const personalPayload = {
        userId,
        address: personalInfo.address,
        mobileNumber: personalInfo.mobileNumber,
        city: personalInfo.city,
        state: personalInfo.state,
        pincode: personalInfo.pincode,
        loanAmount: Number(personalInfo.loanAmount) || 0,
      };

      if (personalPayload.loanAmount <= 0) {
        toast.error("Loan amount must be greater than 0.");
        return;
      }

      await persistPersonalInfo(personalPayload);
      setPaymentStatus(PAYMENT_STATUS.PAYMENT_PENDING);
      upsertPaymentRequest({
        userId,
        status: PAYMENT_STATUS.PAYMENT_PENDING,
        profile,
        personalInfo,
        documents,
      });
      setApplicationSubmitted(true);
      setPaymentPromptOpen(true);
      toast.success("Application saved. Complete payment to proceed.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data ||
          "Failed to submit application for approval."
      );
    } finally {
      setSaving(false);
    }
  };

  const openQrPayment = () => {
    setQrImageError(false);
    setPaymentPromptOpen(false);
    setQrPaymentOpen(true);
  };

  const verifyPayment = () => {
    setPaymentStatus(PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING);
    upsertPaymentRequest({
      userId,
      status: PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING,
      profile,
      personalInfo,
      documents,
    });
    localStorage.removeItem(`personal_info_draft_${userId}`);
    localStorage.removeItem(`personal_info_saved_${userId}`);
    setQrPaymentOpen(false);
    setActiveMenu("Status");
    addLocalAdminNotification(`${profile.fullName || "Customer"} has submitted documents for payment verification.`);
    toast.success("Payment verification request sent to admin.");
  };

  const currentDocumentTypes =
    currentStep === 4 ? incomeTypes : STEPS.find((step) => step.id === currentStep)?.types || [];
  const unreadCount = notifications.filter((item) => !item.read).length;

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
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0B2A4A] shadow-sm md:hidden"
                aria-label="Open navigation"
              >
                <FaBars />
              </button>
              <div className="min-w-0">
              <p className="text-sm font-semibold text-[#27D3C3]">{activeMenu}</p>
              <h1 className="truncate text-2xl md:text-3xl font-bold text-[#0B2A4A]">
                Welcome, {profile.fullName || "Customer"}
              </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative h-11 w-11 rounded-2xl bg-white text-[#0B2A4A] shadow-sm flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 z-30 mt-3 w-[calc(100vw-2rem)] sm:w-80 rounded-3xl border border-slate-100 bg-white p-4 shadow-xl">
                    <h3 className="mb-3 font-bold text-[#0B2A4A]">Notifications</h3>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-500">No notifications.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {notifications.slice(0, 8).map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => !item.read && markNotificationRead(item.id)}
                            className={`w-full rounded-2xl p-3 text-left text-sm ${
                              item.read ? "bg-slate-50" : "bg-[#EAFBF8]"
                            }`}
                          >
                            <p className="font-semibold text-[#0B2A4A]">{item.message}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                className="self-start md:self-auto bg-white px-5 py-3 rounded-2xl text-sm font-semibold text-[#0B2A4A] shadow-sm"
              >
                Refresh
              </button>
            </div>
          </header>

          {loading ? (
            <div className="bg-white rounded-3xl p-5 sm:p-8 text-[#0B2A4A] font-semibold">
              Loading dashboard...
            </div>
          ) : (
            <>
              {activeMenu === "Dashboard" && (
                <DashboardTab
                  counts={counts}
                  documents={documents}
                  hasPersonalInfo={hasPersonalInfo}
                  notifications={notifications}
                  personalInfo={personalInfo}
                  rejectedDocuments={rejectedDocuments}
                  assignedBank={assignedBank}
                  paymentStatus={paymentStatus}
                  onPayNow={openQrPayment}
                  setActiveMenu={setActiveMenu}
                  markNotificationRead={markNotificationRead}
                />
              )}

              {activeMenu === "Documents" && (
                <DocumentsTab
                  currentDocumentTypes={currentDocumentTypes}
                  currentStep={currentStep}
                  docsByType={docsByType}
                  employmentType={employmentType}
                  applicationNumber={applicationNumber}
                  applicationSubmitted={applicationSubmitted}
                  documents={documents}
                  missingRequiredTypes={missingRequiredTypes}
                  personalInfo={personalInfo}
                  assignedBank={assignedBank}
                  lockedIncomeType={lockedIncomeType}
                  saving={saving}
                  setCurrentStep={setCurrentStep}
                  setEmploymentType={setEmploymentType}
                  setPersonalInfo={setPersonalInfo}
                  uploadForType={uploadForType}
                  uploadingType={uploadingType}
                  savePersonalInfo={savePersonalInfo}
                  submitForApproval={submitForApproval}
                  openPreview={openPreview}
                  paymentStatus={paymentStatus}
                  onPayNow={openQrPayment}
                />
              )}

              {activeMenu === "Status" && (
              <StatusTab
                  counts={counts}
                  documents={documents}
                  docsByType={docsByType}
                  assignedBank={assignedBank}
                  openPreview={openPreview}
                  uploadForType={uploadForType}
                  uploadingType={uploadingType}
                  paymentStatus={paymentStatus}
                  onPayNow={openQrPayment}
                />
              )}

              {activeMenu === "Settings" && (
                <SettingsTab
                  passwordForm={passwordForm}
                  saving={saving}
                  settingsForm={settingsForm}
                  setPasswordForm={setPasswordForm}
                  setSettingsForm={setSettingsForm}
                  saveSettings={saveSettings}
                  changePassword={changePassword}
                  assignedBank={assignedBank}
                />
              )}
            </>
          )}
        </div>
        </main>
      </div>
      <Footer logoutOnNavigate />

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-full max-w-3xl h-[72vh] max-h-[640px] p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#0B2A4A]">Document Preview</h2>
                {preview.fileName && (
                  <p className="text-xs text-slate-500 truncate">{preview.fileName}</p>
                )}
              </div>
              <button
                onClick={closePreview}
                className="w-10 h-10 rounded-full bg-[#F4F6F9] flex items-center justify-center"
                aria-label="Close preview"
              >
                <FaTimes />
              </button>
            </div>
            {preview.isImage ? (
              <img
                src={preview.url}
                alt="Document preview"
                className="flex-1 min-h-0 w-full object-contain bg-slate-50 rounded-xl border border-slate-100"
              />
            ) : preview.isPdf ? (
              <iframe
                src={preview.url}
                title="Document preview"
                className="flex-1 min-h-0 w-full rounded-xl bg-slate-50 border border-slate-100"
              />
            ) : (
              <div className="flex-1 min-h-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-center p-6">
                <p className="text-sm font-semibold text-slate-500">
                  Preview is available for PDF, JPG and PNG files.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {paymentPromptOpen && (
        <PaymentPromptModal
          onClose={() => setPaymentPromptOpen(false)}
          onPayNow={openQrPayment}
        />
      )}

      {qrPaymentOpen && (
        <QrPaymentModal
          qrImageError={qrImageError}
          setQrImageError={setQrImageError}
          onClose={() => setQrPaymentOpen(false)}
          onVerifyPayment={verifyPayment}
        />
      )}

      {/* Chatbot mount only; dashboard logic remains unchanged. */}
      <Chatbot roleOverride="USER" onNavigateSection={setActiveMenu} />
    </div>
  );
};

const countsFromDocuments = (documents = []) =>
  documents.reduce(
    (acc, doc) => {
      const status = doc?.status || "PENDING";
      acc.totalCount += 1;
      if (status === "PENDING") acc.pendingCount += 1;
      if (status === "VERIFIED") acc.verifiedCount += 1;
      if (status === "APPROVED") acc.approvedCount += 1;
      if (status === "REJECTED") acc.rejectedCount += 1;
      return acc;
    },
    {
      totalCount: 0,
      pendingCount: 0,
      verifiedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    }
  );

const PaymentPromptModal = ({ onClose, onPayNow }) => (
  <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
    <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Application Submitted Successfully</h2>
          <p className="text-sm font-semibold text-amber-700 mt-3">
            Please complete {READY2DRIVE_FEE_LABEL} payment before your documents go to admin review.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#F4F6F9] flex items-center justify-center shrink-0"
          aria-label="Close payment prompt"
        >
          <FaTimes />
        </button>
      </div>
      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-amber-800">Ready2Drive fee</span>
          <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_BASE_AMOUNT)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-amber-800">{READY2DRIVE_GST_LABEL}</span>
          <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_GST_AMOUNT)}</span>
        </div>
        <div className="mt-3 border-t border-amber-200 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#0B2A4A]">Total payable</span>
          <span className="text-xl font-black text-[#0B2A4A]">{formatINR(READY2DRIVE_TOTAL_AMOUNT)}</span>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onPayNow}
          className="flex-1 bg-[#0B2A4A] text-white px-5 py-3 rounded-2xl font-bold"
        >
          Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-[#F4F6F9] text-[#0B2A4A] px-5 py-3 rounded-2xl font-bold"
        >
          Later
        </button>
      </div>
    </div>
  </div>
);

const QrPaymentModal = ({ qrImageError, setQrImageError, onClose, onVerifyPayment }) => (
  <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
    <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Ready2Drive Payment</h2>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-[#F4F6F9] flex items-center justify-center shrink-0"
          aria-label="Close QR payment"
        >
          <FaTimes />
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Processing fee</span>
          <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_BASE_AMOUNT)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">{READY2DRIVE_GST_LABEL}</span>
          <span className="font-bold text-[#0B2A4A]">{formatINR(READY2DRIVE_GST_AMOUNT)}</span>
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between">
          <span className="font-bold text-[#0B2A4A]">Total payable</span>
          <span className="text-lg font-black text-[#0B2A4A]">{formatINR(READY2DRIVE_TOTAL_AMOUNT)}</span>
        </div>
      </div>

      <div className="bg-[#F4F6F9] rounded-2xl border border-slate-100 p-4 sm:p-5 min-h-[220px] sm:min-h-[260px] flex items-center justify-center">
        {qrImageError ? (
          <div className="text-center">
            <p className="text-sm font-bold text-[#0B2A4A]">QR image placeholder</p>
            <p className="text-xs text-slate-500 mt-2">
              Add your QR image in src/assets.
            </p>
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
        onClick={onVerifyPayment}
        className="mt-5 w-full bg-[#27D3C3] text-[#0B2A4A] px-5 py-3 rounded-2xl font-bold"
      >
        Verify Payment of {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
      </button>
    </div>
  </div>
);

const SimpleListOverlay = ({ title, items, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0B2A4A]">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-red-600" aria-label="Close">
          <FaTimes />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl bg-[#F4F6F9] p-4 sm:p-6 text-sm text-slate-500">No data found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4">
              <p className="font-bold text-[#0B2A4A]">{item.title}</p>
              {item.subtitle && <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const DashboardTab = ({
  counts,
  documents,
  hasPersonalInfo,
  notifications,
  personalInfo,
  rejectedDocuments,
  assignedBank,
  paymentStatus,
  onPayNow,
  setActiveMenu,
  markNotificationRead,
}) => {
  const [statOverlay, setStatOverlay] = useState(null);
  const cards = [
    {
      label: "Loan Amount",
      value: personalInfo.loanAmount
        ? `Rs ${Number(personalInfo.loanAmount).toLocaleString("en-IN")}`
        : "Not set",
      icon: <FaRupeeSign />,
      items: [
        {
          title: personalInfo.fullName || "Loan application",
          subtitle: personalInfo.loanAmount
            ? `Rs ${Number(personalInfo.loanAmount).toLocaleString("en-IN")}`
            : "Loan amount not set",
        },
      ],
    },
    {
      label: "Documents Uploaded",
      value: documents.length,
      icon: <FaFileAlt />,
      items: documents.map((doc) => ({
        title: DOCUMENT_LABELS[doc.documentType] || doc.documentType || doc.fileName || "Document",
        subtitle: doc.status || "PENDING",
      })),
    },
    {
      label: "Admin Approval Pending",
      value: counts.pendingCount || 0,
      icon: <FaBell />,
      items: documents
        .filter((doc) => doc.status === "PENDING")
        .map((doc) => ({
          title: DOCUMENT_LABELS[doc.documentType] || doc.documentType || doc.fileName || "Document",
          subtitle: doc.fileName,
        })),
    },
    {
      label: "Admin Approved",
      value: counts.approvedCount || 0,
      icon: <FaCheckCircle />,
      items: documents
        .filter((doc) => doc.status === "APPROVED")
        .map((doc) => ({
          title: DOCUMENT_LABELS[doc.documentType] || doc.documentType || doc.fileName || "Document",
          subtitle: doc.fileName,
        })),
    },
    {
      label: "Assigned Bank",
      value: assignedBank ? assignedBank.bankName : "Yet to assign",
      icon: <FaUniversity />,
      highlight: !!assignedBank,
      items: [
        {
          title: assignedBank ? assignedBank.bankName : "Bank not assigned",
          subtitle: assignedBank?.representativeName || assignedBank?.email || "",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-amber-800">Payment required</h2>
            <p className="text-sm text-amber-700 mt-1">
              Your documents are saved. Pay processing fee total payable is{" "}
              <span className="font-bold">{formatINR(READY2DRIVE_TOTAL_AMOUNT)}</span> before admin review.
            </p>
          </div>
          <button
            onClick={onPayNow}
            className="bg-[#0B2A4A] text-white px-5 py-3 rounded-2xl font-bold"
          >
            Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
          </button>
        </div>
      )}

      {paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING && (
        <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 sm:p-6">
          <h2 className="text-xl font-bold text-sky-800">Payment verification pending</h2>
          <p className="text-sm text-sky-700 mt-1">
            Admin will verify your payment. Documents will be submitted for approval after payment is approved.
          </p>
        </div>
      )}

      {paymentStatus === PAYMENT_STATUS.PAYMENT_APPROVED && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 sm:p-6">
          <h2 className="text-xl font-bold text-emerald-800">Payment verified successfully</h2>
          <p className="text-sm text-emerald-700 mt-1">
            Your documents have been submitted for admin review.
          </p>
        </div>
      )}

      {!hasPersonalInfo && (
        <div className="bg-[#0B2A4A] text-white rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Complete your profile to get started</h2>
            <p className="text-white/70 text-sm mt-1">
              Add personal and loan details before uploading documents.
            </p>
          </div>
          <button
            onClick={() => setActiveMenu("Documents")}
            className="bg-[#27D3C3] text-[#0B2A4A] px-5 py-3 rounded-2xl font-bold"
          >
            Complete Profile
          </button>
        </div>
      )}

      {rejectedDocuments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-red-700">Documents need re-upload</h2>
            <p className="text-sm text-red-600 mt-1">
              {rejectedDocuments.length} document(s) were rejected by admin.
            </p>
          </div>
          <button
            onClick={() => setActiveMenu("Documents")}
            className="bg-red-600 text-white px-5 py-3 rounded-2xl font-bold"
          >
            Re-upload
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {cards.map((card) => (
          <button
            type="button"
            key={card.label}
            onClick={() => setStatOverlay(card)}
            className={`rounded-3xl p-4 sm:p-6 shadow-sm text-left hover:-translate-y-0.5 hover:shadow-md transition ${card.highlight ? "bg-[#EAFBF8] border border-[#27D3C3]/40" : "bg-white"}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${card.highlight ? "bg-[#27D3C3]/20 text-[#0B2A4A]" : "bg-[#EAFBF8] text-[#0B2A4A]"}`}>
              {card.icon}
            </div>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`text-xl font-bold mt-2 break-words ${card.highlight ? "text-[#0B2A4A]" : "text-[#0B2A4A]"}`}>{card.value}</p>
            {card.label === "Assigned Bank" && (
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${assignedBank ? "bg-[#27D3C3] text-[#0B2A4A]" : "bg-slate-200 text-slate-500"}`}>
                {assignedBank ? "ASSIGNED" : "PENDING"}
              </span>
            )}
          </button>
        ))}
      </div>
      {statOverlay && (
        <SimpleListOverlay
          title={statOverlay.label}
          items={statOverlay.items}
          onClose={() => setStatOverlay(null)}
        />
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <button
                key={item.id}
                onClick={() => !item.read && markNotificationRead(item.id)}
                className={`w-full text-left p-4 rounded-2xl border ${
                  item.read ? "bg-slate-50 border-slate-100" : "bg-[#EAFBF8] border-[#27D3C3]/30"
                }`}
              >
                <p className="text-sm font-semibold text-[#0B2A4A]">{item.message}</p>
                <p className="text-xs text-slate-500 mt-1">{formatDate(item.createdAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentsTab = ({
  applicationNumber,
  applicationSubmitted,
  currentDocumentTypes,
  currentStep,
  documents,
  docsByType,
  employmentType,
  missingRequiredTypes,
  personalInfo,
  assignedBank,
  lockedIncomeType,
  saving,
  setCurrentStep,
  setEmploymentType,
  setPersonalInfo,
  uploadForType,
  uploadingType,
  savePersonalInfo,
  submitForApproval,
  openPreview,
  paymentStatus,
  onPayNow,
}) => {
  const requiredTypesForStep = () => {
    if (currentStep === 2) return ["PAN", "AADHAAR"];
    if (currentStep === 3) return ["RESIDENTIAL_PROOF"];
    if (currentStep === 4) return employmentType === "Salaried"
      ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
      : ["ITR_RETURN", "BANK_STATEMENT"];
    if (currentStep === 5) return VEHICLE_REQUIRED_TYPES;
    return [];
  };

  const missingForCurrentStep = () => {
    if (currentStep === 1) return getMissingPersonalInfoFields(personalInfo);
    return requiredTypesForStep().filter((type) => {
      if (type === "RESIDENTIAL_PROOF") {
        return !(
          hasUsableDocument(docsByType, "LIGHT_BILL") ||
          hasUsableDocument(docsByType, "RENTAL_AGREEMENT")
        );
      }
      return !hasUsableDocument(docsByType, type);
    });
  };

  const showStepBlockedToast = (missing) => {
    if (currentStep === 1) {
      toast.error(`Please fill ${missing.join(", ")} before continuing.`);
      return;
    }
    toast.error(`Please upload ${missing.map(missingLabel).join(", ")} before continuing.`);
  };

  const goToStep = (stepId) => {
    if (assignedBank || stepId <= currentStep) {
      setCurrentStep(stepId);
      return;
    }

    const missing = missingForCurrentStep();
    if (missing.length > 0) {
      showStepBlockedToast(missing);
      return;
    }
    setCurrentStep(stepId);
  };

  return (
  <div className="space-y-6">
    {assignedBank && (
      <div className="bg-[#EAFBF8] border border-[#27D3C3]/40 rounded-3xl p-4 sm:p-5 text-sm font-semibold text-[#0B2A4A]">
        This application has been forwarded to {assignedBank.bankName}. Documents and application details are locked.
      </div>
    )}
    <div className="bg-white rounded-3xl p-3 sm:p-5 shadow-sm overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => goToStep(step.id)}
            className={`px-5 py-3 rounded-2xl text-sm font-bold ${
              currentStep === step.id
                ? "bg-[#0B2A4A] text-white"
                : "bg-[#F4F6F9] text-[#0B2A4A]"
            }`}
          >
            {step.id}. {step.title}
          </button>
        ))}
      </div>
    </div>

    {currentStep === 1 ? (
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Full Name" value={personalInfo.fullName} readOnly />
          <Field label="Email" value={personalInfo.email} readOnly />
          {[
            ["mobileNumber", "Mobile Number"],
            ["address", "Address"],
            ["city", "City"],
            ["state", "State"],
            ["pincode", "Pincode"],
            ["loanAmount", "Loan Amount"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={personalInfo[key]}
              readOnly={!!assignedBank}
              type={key === "loanAmount" ? "number" : "text"}
              onChange={(value) =>
                setPersonalInfo({
                  ...personalInfo,
                  [key]: key === "loanAmount" ? value.replace(/^-/, "") : value,
                })
              }
            />
          ))}
        </div>
        {!assignedBank && (
          <button
            onClick={savePersonalInfo}
            disabled={saving}
            className="mt-6 bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Next"}
          </button>
        )}
      </div>
    ) : currentStep === 6 ? (
      <VerifySubmitStep
        applicationNumber={applicationNumber}
        applicationSubmitted={applicationSubmitted}
        documents={documents}
        missingRequiredTypes={missingRequiredTypes}
        personalInfo={personalInfo}
        saving={saving}
        setCurrentStep={setCurrentStep}
        submitForApproval={submitForApproval}
        openPreview={openPreview}
        locked={!!assignedBank}
        paymentStatus={paymentStatus}
        onPayNow={onPayNow}
      />
    ) : (
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#0B2A4A]">
            {STEPS.find((step) => step.id === currentStep)?.title}
          </h2>
          {currentStep === 4 && (
            <div className="flex rounded-2xl bg-[#F4F6F9] p-1">
              {["Salaried", "Self Employed"].map((type) => (
                <button
                  key={type}
                  disabled={!!assignedBank || (!!lockedIncomeType && lockedIncomeType !== type)}
                  onClick={() => {
                    if (lockedIncomeType && lockedIncomeType !== type) {
                      toast.error(
                        `${lockedIncomeType} income documents already uploaded. Remove them before switching income type.`
                      );
                      return;
                    }
                    setEmploymentType(type);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    employmentType === type ? "bg-white text-[#0B2A4A] shadow-sm" : "text-slate-500"
                  } ${lockedIncomeType && lockedIncomeType !== type ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
        <DocumentUploadGrid
          docsByType={docsByType}
          openPreview={openPreview}
          types={currentDocumentTypes}
          uploadingType={uploadingType}
          uploadForType={uploadForType}
          locked={!!assignedBank}
        />
        {!assignedBank && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => goToStep(Math.min(currentStep + 1, 6))}
              className="bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold"
            >
              Next
            </button>
          </div>
        )}
      </div>
    )}
  </div>
  );
};

const VerifySubmitStep = ({
  applicationNumber,
  applicationSubmitted,
  documents,
  missingRequiredTypes,
  personalInfo,
  saving,
  setCurrentStep,
  submitForApproval,
  openPreview,
  locked,
  paymentStatus,
  onPayNow,
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Verify Details Before Submit</h2>
          <p className="text-sm text-slate-500 mt-1">
            Review your personal details and uploaded documents before sending them to admin.
          </p>
        </div>
        <div className="bg-[#EAFBF8] text-[#0B2A4A] px-4 py-3 rounded-2xl text-sm font-bold">
          Application: {applicationNumber || "Not generated"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          ["Full Name", personalInfo.fullName],
          ["Email", personalInfo.email],
          ["Mobile Number", personalInfo.mobileNumber],
          ["Address", personalInfo.address],
          ["City", personalInfo.city],
          ["State", personalInfo.state],
          ["Pincode", personalInfo.pincode],
          [
            "Loan Amount",
            personalInfo.loanAmount
              ? `Rs ${Number(personalInfo.loanAmount).toLocaleString("en-IN")}`
              : "",
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#F4F6F9] rounded-2xl p-4">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-[#0B2A4A] mt-1 break-words">
              {value || "Not provided"}
            </p>
          </div>
        ))}
      </div>

      {!locked && (
        <button
          onClick={() => setCurrentStep(1)}
          className="mt-5 bg-white border border-slate-200 text-[#0B2A4A] px-5 py-3 rounded-2xl font-bold"
        >
          Edit Personal Details
        </button>
      )}
    </div>

    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Uploaded Documents</h2>
          <p className="text-sm text-slate-500 mt-1">
            Preview files and confirm statuses before final submit.
          </p>
        </div>
        {!locked && (
          <button
            onClick={() => setCurrentStep(2)}
            className="bg-[#F4F6F9] text-[#0B2A4A] px-5 py-3 rounded-2xl font-bold"
          >
            Edit Documents
          </button>
        )}
      </div>

      {missingRequiredTypes.length > 0 && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="font-bold text-red-700">Required documents missing or rejected</p>
          <p className="text-sm text-red-600 mt-2">
            {missingRequiredTypes.map(missingLabel).join(", ")}
          </p>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">No documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const type = doc.documentType || doc.type;
            return (
              <div key={doc.documentId} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#0B2A4A]">{DOCUMENT_LABELS[type] || type}</h3>
                    <p className="text-xs text-slate-500 mt-1 break-all">{doc.fileName}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                {doc.remarks && (
                  <p className="mt-3 bg-red-50 text-red-700 rounded-2xl p-3 text-sm">
                    Admin remarks: {doc.remarks}
                  </p>
                )}
                <button
                  onClick={() => openPreview(doc)}
                  className="mt-4 px-4 py-2 rounded-2xl bg-[#F4F6F9] text-[#0B2A4A] text-sm font-bold flex items-center gap-2"
                >
                  <FaEye /> Preview
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING && (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-amber-800">Ready2Drive payment pending</h2>
          <p className="text-sm text-amber-700 mt-1">
            Your application is saved. Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)} to move it to admin verification.
          </p>
        </div>
        <button
          onClick={onPayNow}
          className="bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold"
        >
          Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
        </button>
      </div>
    )}

    {paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING && (
      <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 sm:p-6">
        <h2 className="text-xl font-bold text-sky-800">Payment verification pending</h2>
        <p className="text-sm text-sky-700 mt-1">
          Admin will verify your QR payment before documents are submitted for approval.
        </p>
      </div>
    )}

    <div className="bg-[#0B2A4A] rounded-3xl p-4 sm:p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">
          {locked
            ? "Forwarded to bank"
            : paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING
            ? "Waiting for payment approval"
            : paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING
            ? "Application saved"
            : applicationSubmitted
            ? "Application saved"
            : "Ready to submit application"}
        </h2>
        <p className="text-sm text-white/70 mt-1">
          {locked
            ? "Your application is locked because it has been assigned to a bank."
            : paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING
            ? "Documents will go to admin after payment is approved."
            : paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING
            ? `Complete ${READY2DRIVE_FEE_LABEL} payment. Total payable is ${formatINR(READY2DRIVE_TOTAL_AMOUNT)}.`
            : "Final submit saves your details and asks you to complete payment."}
        </p>
      </div>
      <button
        onClick={paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING ? onPayNow : submitForApproval}
        disabled={
          locked ||
          saving ||
          paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING ||
          paymentStatus === PAYMENT_STATUS.PAYMENT_APPROVED ||
          missingRequiredTypes.length > 0
        }
        className="bg-[#27D3C3] text-[#0B2A4A] px-6 py-3 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FaPaperPlane />
        {locked
          ? "Locked"
          : saving
          ? "Saving..."
          : paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING
          ? "Verification Pending"
          : paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING
          ? `Pay ${formatINR(READY2DRIVE_TOTAL_AMOUNT)}`
          : "Final Submit"}
      </button>
    </div>
  </div>
);

const TRACKING_STEPS = [
  {
    key: "payment_pending",
    label: "Payment Pending",
    sub: `Complete ${READY2DRIVE_FEE_LABEL} payment. Total payable is ${formatINR(READY2DRIVE_TOTAL_AMOUNT)}.`,
    icon: <FaRupeeSign />,
  },
  {
    key: "payment_verification_pending",
    label: "Payment Verification Pending",
    sub: "Admin is verifying your payment.",
    icon: <FaFileAlt />,
  },
  {
    key: "payment_verified",
    label: "Payment Verified",
    sub: "Payment approved. Documents can move to admin review.",
    icon: <FaCheckCircle />,
  },
  {
    key: "documents_submitted",
    label: "Documents Submitted For Approval",
    sub: "Your details and documents are submitted to admin.",
    icon: <FaCloudUploadAlt />,
  },
  {
    key: "under_review",
    label: "Under Review",
    sub: "Admin is verifying your documents.",
    icon: <FaFileAlt />,
  },
  {
    key: "approved",
    label: "Documents Approved",
    sub: "All documents have been approved by admin.",
    icon: <FaCheckCircle />,
  },
  {
    key: "sent_to_bank",
    label: "Sent to Bank",
    sub: "Your application has been forwarded to the bank.",
    icon: <FaUniversity />,
  },
];

const getActiveTrackingStep = (documents, counts, assignedBank, paymentStatus) => {
  if (!documents.length) return -1;
  if (assignedBank) return 6;
  if (paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING) return 0;
  if (paymentStatus === PAYMENT_STATUS.PAYMENT_VERIFICATION_PENDING) return 1;
  if (paymentStatus !== PAYMENT_STATUS.PAYMENT_APPROVED) return -1;
  if (counts.approvedCount > 0 && counts.pendingCount === 0 && counts.rejectedCount === 0) return 5;
  if (counts.verifiedCount > 0 || counts.pendingCount > 0 || counts.rejectedCount > 0) return 4;
  return 3;
};

const StatusTab = ({
  counts,
  documents,
  docsByType,
  assignedBank,
  openPreview,
  uploadForType,
  uploadingType,
  paymentStatus,
  onPayNow,
}) => {
  const activeStep = getActiveTrackingStep(documents, counts, assignedBank, paymentStatus);

  return (
    <div className="space-y-6">
      {paymentStatus === PAYMENT_STATUS.PAYMENT_PENDING && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-amber-800">Ready2Drive payment pending</h2>
            <p className="text-sm text-amber-700 mt-1">
              Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)} to continue your application.
            </p>
          </div>
          <button
            onClick={onPayNow}
            className="bg-[#0B2A4A] text-white px-5 py-3 rounded-2xl font-bold"
          >
            Pay {formatINR(READY2DRIVE_TOTAL_AMOUNT)}
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#0B2A4A] mb-6">Application Tracking</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet. Upload documents to start tracking.</p>
        ) : (
          <div className="relative">
            <div className="hidden md:block absolute left-[22px] top-6 bottom-6 w-0.5 bg-slate-200" />
            <div className="space-y-0">
              {TRACKING_STEPS.map((step, idx) => {
                const done = idx < activeStep;
                const current = idx === activeStep;
                const pending = idx > activeStep;
                return (
                  <div key={step.key} className="relative flex items-start gap-4 md:gap-6 pb-8 last:pb-0">
                    <div className={`relative z-10 shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-base font-bold border-2 transition-all ${
                      done ? "bg-[#27D3C3] border-[#27D3C3] text-[#0B2A4A]" :
                      current ? "bg-[#0B2A4A] border-[#0B2A4A] text-white shadow-lg" :
                      "bg-white border-slate-200 text-slate-400"
                    }`}>
                      {done ? <FaCheckCircle /> : step.icon}
                    </div>
                    <div className={`flex-1 pt-2 ${ pending ? "opacity-40" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-bold text-sm ${ current ? "text-[#0B2A4A]" : done ? "text-[#27D3C3]" : "text-slate-400"}` }>
                          {step.label}
                        </p>
                        {current && (
                          <span className="bg-[#0B2A4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">CURRENT</span>
                        )}
                        {done && (
                          <span className="bg-[#27D3C3]/20 text-[#0B2A4A] text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {step.key === "sent_to_bank" && assignedBank
                          ? `Forwarded to ${assignedBank.bankName}`
                          : step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Pending", counts.pendingCount || 0],
          ["Verified", counts.verifiedCount || 0],
          ["Approved", counts.approvedCount || 0],
          ["Rejected", counts.rejectedCount || 0],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-[#0B2A4A] mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {documents.length === 0 ? (
          <div className="bg-white rounded-3xl p-4 sm:p-6 text-slate-500">No documents uploaded yet.</div>
        ) : (
          documents.map((doc) => (
            <DocumentCard
              key={doc.documentId}
              doc={doc}
              docsByType={docsByType}
              openPreview={openPreview}
              uploadForType={uploadForType}
              uploadingType={uploadingType}
              locked={!!assignedBank}
            />
          ))
        )}
      </div>
    </div>
  );
};

const SettingsTab = ({
  passwordForm,
  saving,
  settingsForm,
  setPasswordForm,
  setSettingsForm,
  saveSettings,
  changePassword,
  assignedBank,
}) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Profile Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Full Name"
            value={settingsForm.fullName}
            onChange={(value) => setSettingsForm({ ...settingsForm, fullName: value })}
          />
          <Field label="Email" value={settingsForm.email} readOnly />
          <Field label="Mobile" value={settingsForm.mobileNumber} readOnly />
          
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="mt-6 bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
        >
          Save Changes
        </button>
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
            showPassword={showNewPassword}
            setShowPassword={setShowNewPassword}
            value={passwordForm.newPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
          />
          <PasswordField
            label="Confirm Password"
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            value={passwordForm.confirmPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
          />
        </div>
        <button
          onClick={changePassword}
          disabled={saving}
          className="mt-6 bg-[#27D3C3] text-[#0B2A4A] px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
        >
          Update Password
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, readOnly = false, type = "text" }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-[#0B2A4A] mb-2">{label}</span>
    <input
      type={type}
      min={type === "number" ? "1" : undefined}
      value={value ?? ""}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full rounded-2xl px-4 py-3 border border-slate-200 outline-none ${
        readOnly ? "bg-slate-50 text-slate-500" : "bg-white focus:border-[#27D3C3]"
      }`}
    />
  </label>
);

const PasswordField = ({ label, value, onChange, showPassword, setShowPassword }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-[#0B2A4A] mb-2">{label}</span>
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-2xl px-4 py-3 pr-12 border border-slate-200 bg-white outline-none focus:border-[#27D3C3]"
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2A4A]"
        aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  </label>
);

const DocumentUploadGrid = ({ docsByType, openPreview, types, uploadingType, uploadForType, locked }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    {types.map((type) => (
      <DocumentUploadTile
        key={type}
        doc={docsByType[type]}
        openPreview={openPreview}
        type={type}
        uploadingType={uploadingType}
        uploadForType={uploadForType}
        locked={locked}
      />
    ))}
  </div>
);

const DocumentUploadTile = ({ doc, openPreview, type, uploadingType, uploadForType, locked }) => {
  const inputId = `upload-${type}`;
  const rejected = doc?.status === "REJECTED";
  const optional = OPTIONAL_DOCUMENT_TYPES.has(type);

  return (
    <div className="border border-slate-200 rounded-3xl p-4 sm:p-5 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#0B2A4A]">{DOCUMENT_LABELS[type] || type}</h3>
            {optional && (
              <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-1 rounded-full">
                Optional
              </span>
            )}
          </div>
          {doc ? (
            <p className="text-xs text-slate-500 mt-1 break-all">{doc.fileName}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">
              {optional ? "Optional upload. " : ""}PDF, JPG or PNG up to 5MB
            </p>
          )}
        </div>
        {doc && <StatusBadge status={doc.status} />}
      </div>

      {doc?.remarks && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-2xl p-3">{doc.remarks}</p>
      )}

      <div className="flex flex-wrap gap-3 mt-5">
        {doc && (
          <button
            onClick={() => openPreview(doc)}
            className="px-4 py-2 rounded-2xl bg-[#F4F6F9] text-[#0B2A4A] text-sm font-bold flex items-center gap-2"
          >
            <FaEye /> Preview
          </button>
        )}
        {!locked && (
          <>
            <label
              htmlFor={inputId}
              className="cursor-pointer px-4 py-2 rounded-2xl bg-[#0B2A4A] text-white text-sm font-bold flex items-center gap-2"
            >
              {rejected ? <FaRedo /> : <FaCloudUploadAlt />}
              {uploadingType === type ? "Uploading..." : rejected ? "Re-upload" : doc ? "Replace" : "Upload"}
            </label>
            <input
              id={inputId}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                uploadForType(type, file);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

const DocumentCard = ({ doc, openPreview, uploadForType, uploadingType, locked }) => {
  const type = doc.documentType || doc.type;
  const inputId = `status-reupload-${doc.documentId}`;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#0B2A4A]">{DOCUMENT_LABELS[type] || type}</h3>
          <p className="text-sm text-slate-500 mt-1 break-all">{doc.fileName}</p>
        </div>
        <StatusBadge status={doc.status} />
      </div>
      {doc.remarks && (
        <p className="mt-4 bg-red-50 text-red-700 rounded-2xl p-3 text-sm">
          Admin remarks: {doc.remarks}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={() => openPreview(doc)}
          className="px-4 py-2 rounded-2xl bg-[#F4F6F9] text-[#0B2A4A] text-sm font-bold flex items-center gap-2"
        >
          <FaEye /> Preview
        </button>
        {doc.status === "REJECTED" && !locked && (
          <>
            <label
              htmlFor={inputId}
              className="cursor-pointer px-4 py-2 rounded-2xl bg-red-600 text-white text-sm font-bold flex items-center gap-2"
            >
              <FaRedo />
              {uploadingType === type ? "Uploading..." : "Re-upload"}
            </label>
            <input
              id={inputId}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                uploadForType(type, file);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status || "PENDING"}
  </span>
);

export default CustomerDashboard;

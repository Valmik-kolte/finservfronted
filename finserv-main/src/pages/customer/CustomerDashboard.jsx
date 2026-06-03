import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaEye,
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

const OPTIONAL_DOCUMENT_TYPES = new Set([
  "CAR_FRONT_SIDE_PHOTO",
  "CAR_BACK_SIDE_PHOTO",
  "CHASSIS_NUMBER",
  "ODOMETER_READING",
]);

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

const missingLabel = (type) =>
  type === "RESIDENTIAL_PROOF"
    ? "Light Bill or Rental Agreement"
    : DOCUMENT_LABELS[type] || type;

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const session = useMemo(getUserSession, []);
  const userId = session?.id;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState("");
  const [preview, setPreview] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [employmentType, setEmploymentType] = useState("Salaried");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
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
      const type = doc.documentType || doc.type;
      if (!acc[type] || doc.status === "REJECTED") acc[type] = doc;
      return acc;
    }, {});
  }, [documents]);

  const fetchDashboardData = useCallback(
    async (showSpinner = false) => {
      if (!userId) {
        setLoading(false);
        toast.error("User session not found. Please login again.");
        return;
      }

      if (showSpinner) setLoading(true);
      try {
        const [userRes, docsRes, countsRes, notificationsRes] =
          await Promise.allSettled([
            api.get(`/user/${userId}`),
            api.get(`/documents/user/${userId}`),
            api.get(`/documents/count/${userId}`),
            api.get(`/notifications/${userId}`),
          ]);

        if (userRes.status === "fulfilled") {
          const user = unwrap(userRes.value) || {};
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
          if (bankId) {
            try {
              const banksRes = await api.get("/admin/banks");
              const bankList = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.data || [];
              const bank = bankList.find((b) => String(b.bankId) === String(bankId));
              setAssignedBank(bank || { bankId, bankName: "Assigned" });
            } catch {
              setAssignedBank({ bankId, bankName: "Assigned" });
            }
          } else {
            setAssignedBank(null);
          }
        }

        if (docsRes.status === "fulfilled") {
          setDocuments(unwrap(docsRes.value) || []);
        }

        if (countsRes.status === "fulfilled") {
          setCounts({
            pendingCount: 0,
            verifiedCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            ...(unwrap(countsRes.value) || {}),
          });
        }

        if (notificationsRes.status === "fulfilled") {
          setNotifications(unwrap(notificationsRes.value) || []);
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

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
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
    const payload = {
      userId,
      address: personalInfo.address,
      mobileNumber: personalInfo.mobileNumber,
      city: personalInfo.city,
      state: personalInfo.state,
      pincode: personalInfo.pincode,
      loanAmount: Number(personalInfo.loanAmount) || 0,
    };

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
      if (existing?.status === "REJECTED") {
        await api.delete(`/documents/${existing.documentId}`);
      }
      await api.post("/documents/upload", formData);
      toast.success(`${DOCUMENT_LABELS[type]} uploaded.`);
      await fetchDashboardData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Upload failed.");
    } finally {
      setUploadingType("");
    }
  };

  const openPreview = async (documentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:8081/api/documents/preview/${documentId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) throw new Error("Preview failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreview({ url, type: blob.type });
    } catch {
      toast.error("Unable to preview this document.");
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await api.put(`/notifications/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item
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
      const missing = ["PAN", "AADHAAR", ...incomeTypes, "RC", "INSURANCE"].filter(
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

      await persistPersonalInfo(personalPayload);
      toast.success("Documents and details submitted to admin for approval.");
      setApplicationSubmitted(true);
      setActiveMenu("Status");
      await fetchDashboardData(false);
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

  const currentDocumentTypes =
    currentStep === 4 ? incomeTypes : STEPS.find((step) => step.id === currentStep)?.types || [];

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex text-slate-800">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        handleLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-5 md:p-8 max-w-7xl mx-auto">
          <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#27D3C3]">{activeMenu}</p>
              <h1 className="text-3xl font-bold text-[#0B2A4A]">
                Welcome, {profile.fullName || "Customer"}
              </h1>
            </div>
            <button
              onClick={() => fetchDashboardData(true)}
              className="self-start md:self-auto bg-white px-5 py-3 rounded-2xl text-sm font-semibold text-[#0B2A4A] shadow-sm"
            >
              Refresh
            </button>
          </header>

          {loading ? (
            <div className="bg-white rounded-3xl p-8 text-[#0B2A4A] font-semibold">
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
                  saving={saving}
                  setCurrentStep={setCurrentStep}
                  setEmploymentType={setEmploymentType}
                  setPersonalInfo={setPersonalInfo}
                  uploadForType={uploadForType}
                  uploadingType={uploadingType}
                  savePersonalInfo={savePersonalInfo}
                  submitForApproval={submitForApproval}
                  openPreview={openPreview}
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

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0B2A4A]">Document Preview</h2>
              <button
                onClick={closePreview}
                className="w-10 h-10 rounded-full bg-[#F4F6F9] flex items-center justify-center"
                aria-label="Close preview"
              >
                <FaTimes />
              </button>
            </div>
            {preview.type?.startsWith("image/") ? (
              <img
                src={preview.url}
                alt="Document preview"
                className="flex-1 min-h-0 object-contain bg-slate-50 rounded-2xl"
              />
            ) : (
              <iframe
                src={preview.url}
                title="Document preview"
                className="flex-1 min-h-0 rounded-2xl bg-slate-50"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardTab = ({
  counts,
  documents,
  hasPersonalInfo,
  notifications,
  personalInfo,
  rejectedDocuments,
  assignedBank,
  setActiveMenu,
  markNotificationRead,
}) => {
  const cards = [
    {
      label: "Loan Amount",
      value: personalInfo.loanAmount
        ? `Rs ${Number(personalInfo.loanAmount).toLocaleString("en-IN")}`
        : "Not set",
      icon: <FaRupeeSign />,
    },
    { label: "Documents Uploaded", value: documents.length, icon: <FaFileAlt /> },
    { label: "Pending", value: counts.pendingCount || 0, icon: <FaBell /> },
    { label: "Approved", value: counts.approvedCount || 0, icon: <FaCheckCircle /> },
    {
      label: "Assigned Bank",
      value: assignedBank ? assignedBank.bankName : "Yet to assign",
      icon: <FaUniversity />,
      highlight: !!assignedBank,
    },
  ];

  return (
    <div className="space-y-6">
      {!hasPersonalInfo && (
        <div className="bg-[#0B2A4A] text-white rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          <div key={card.label} className={`rounded-3xl p-6 shadow-sm ${card.highlight ? "bg-[#EAFBF8] border border-[#27D3C3]/40" : "bg-white"}`}>
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
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">
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
                <p className="text-xs text-slate-500 mt-1">{item.createdAt || ""}</p>
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
  saving,
  setCurrentStep,
  setEmploymentType,
  setPersonalInfo,
  uploadForType,
  uploadingType,
  savePersonalInfo,
  submitForApproval,
  openPreview,
}) => (
  <div className="space-y-6">
    {assignedBank && (
      <div className="bg-[#EAFBF8] border border-[#27D3C3]/40 rounded-3xl p-5 text-sm font-semibold text-[#0B2A4A]">
        This application has been forwarded to {assignedBank.bankName}. Documents and application details are locked.
      </div>
    )}
    <div className="bg-white rounded-3xl p-5 shadow-sm overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {STEPS.map((step) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(step.id)}
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
      <div className="bg-white rounded-3xl p-6 shadow-sm">
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
              onChange={(value) => setPersonalInfo({ ...personalInfo, [key]: value })}
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
      />
    ) : (
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-[#0B2A4A]">
            {STEPS.find((step) => step.id === currentStep)?.title}
          </h2>
          {currentStep === 4 && (
            <div className="flex rounded-2xl bg-[#F4F6F9] p-1">
              {["Salaried", "Self Employed"].map((type) => (
                <button
                  key={type}
                  disabled={!!assignedBank}
                  onClick={() => setEmploymentType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold ${
                    employmentType === type ? "bg-white text-[#0B2A4A] shadow-sm" : "text-slate-500"
                  }`}
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
              onClick={() => setCurrentStep(Math.min(currentStep + 1, 6))}
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
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-3xl p-6 shadow-sm">
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

    <div className="bg-white rounded-3xl p-6 shadow-sm">
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
                  onClick={() => openPreview(doc.documentId)}
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

    <div className="bg-[#0B2A4A] rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold">
          {locked ? "Forwarded to bank" : applicationSubmitted ? "Submitted to admin" : "Ready for admin approval"}
        </h2>
        <p className="text-sm text-white/70 mt-1">
          {locked
            ? "Your application is locked because it has been assigned to a bank."
            : applicationSubmitted
            ? "Your application is already in the approval workflow."
            : "Final submit sends your details and documents to admin for verification."}
        </p>
      </div>
      <button
        onClick={submitForApproval}
        disabled={locked || saving || applicationSubmitted || missingRequiredTypes.length > 0}
        className="bg-[#27D3C3] text-[#0B2A4A] px-6 py-3 rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <FaPaperPlane />
        {locked ? "Locked" : saving ? "Submitting..." : applicationSubmitted ? "Submitted" : "Submit for Approval"}
      </button>
    </div>
  </div>
);

const TRACKING_STEPS = [
  {
    key: "submitted",
    label: "Documents Submitted",
    sub: "Your documents have been uploaded successfully.",
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

const getActiveTrackingStep = (documents, counts, assignedBank) => {
  if (!documents.length) return -1;
  if (assignedBank) return 3;
  if (counts.approvedCount > 0 && counts.pendingCount === 0 && counts.rejectedCount === 0) return 2;
  if (counts.verifiedCount > 0 || counts.pendingCount > 0) return 1;
  return 0;
};

const StatusTab = ({ counts, documents, docsByType, assignedBank, openPreview, uploadForType, uploadingType }) => {
  const activeStep = getActiveTrackingStep(documents, counts, assignedBank);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Pending", counts.pendingCount || 0],
          ["Verified", counts.verifiedCount || 0],
          ["Approved", counts.approvedCount || 0],
          ["Rejected", counts.rejectedCount || 0],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-[#0B2A4A] mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {documents.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-slate-500">No documents uploaded yet.</div>
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
}) => (
  <div className="max-w-4xl space-y-6">
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Profile Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Full Name"
          value={settingsForm.fullName}
          onChange={(value) => setSettingsForm({ ...settingsForm, fullName: value })}
        />
        <Field label="Email" value={settingsForm.email} readOnly />
        <Field label="Mobile" value={settingsForm.mobileNumber} readOnly />
        <Field
          label="Assigned Bank"
          value={assignedBank ? assignedBank.bankName : "Yet to assign"}
          readOnly
        />
      </div>
      <button
        onClick={saveSettings}
        disabled={saving}
        className="mt-6 bg-[#0B2A4A] text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-60"
      >
        Save Changes
      </button>
    </div>

    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#EAFBF8] text-[#0B2A4A] flex items-center justify-center">
          <FaLock />
        </div>
        <h2 className="text-xl font-bold text-[#0B2A4A]">Change Password</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="New Password"
          type="password"
          value={passwordForm.newPassword}
          onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
        />
        <Field
          label="Confirm Password"
          type="password"
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

const Field = ({ label, value, onChange, readOnly = false, type = "text" }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-[#0B2A4A] mb-2">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full rounded-2xl px-4 py-3 border border-slate-200 outline-none ${
        readOnly ? "bg-slate-50 text-slate-500" : "bg-white focus:border-[#27D3C3]"
      }`}
    />
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
    <div className="border border-slate-200 rounded-3xl p-5 bg-white">
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
            onClick={() => openPreview(doc.documentId)}
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
    <div className="bg-white rounded-3xl p-5 shadow-sm">
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
          onClick={() => openPreview(doc.documentId)}
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

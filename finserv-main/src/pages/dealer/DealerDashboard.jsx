import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaCheckCircle,
  FaClipboardList,
  FaCopy,
  FaEye,
  FaFileAlt,
  FaLock,
  FaRedo,
  FaTimes,
  FaUpload,
  FaUsers,
} from "react-icons/fa";
import Sidebar from "../../components/dealer/Sidebar";
import api from "../../services/api";

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

const readDealerSession = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("dealerData") || "null");
    return parsed || {};
  } catch {
    return {};
  }
};

const sameId = (a, b) => String(a || "") === String(b || "");
const sameCode = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const isUserAssignedToBank = (user) =>
  !!(
    user?.bankId ||
    user?.assignedBankId ||
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
  <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
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
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="text-xl font-bold text-[#0B2A4A]">{title}</h3>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4F6F9] text-[#0B2A4A]"
          aria-label="Close"
        >
          <FaTimes />
        </button>
      </div>
      <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

const DealerDashboard = () => {
  const navigate = useNavigate();
  const session = useMemo(() => readDealerSession(), []);
  const dealerId = session.dealerId || session.id;
  const storedDealerCode = session.dealerCode || localStorage.getItem("dealerCode") || "";
  const token = localStorage.getItem("token");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const normalizedMenu = activeMenu === "User" ? "Users" : activeMenu;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [personalInfos, setPersonalInfos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
  const [preview, setPreview] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [personalForm, setPersonalForm] = useState(initialPersonalForm);
  const [employmentType, setEmploymentType] = useState("");
  const [files, setFiles] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [savingWizard, setSavingWizard] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
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
      users: users.length,
      docs: docs.length,
      pending: docs.filter((doc) => doc.status === "PENDING").length,
      approved: docs.filter((doc) => doc.status === "APPROVED").length,
    }),
    [docs, users.length]
  );

  const rejectedUsers = useMemo(() => {
    const rejectedIds = new Set(docs.filter((doc) => doc.status === "REJECTED").map((doc) => doc.userId));
    return users.filter((user) => rejectedIds.has(user.userId));
  }, [docs, users]);

  const dealerCode = profile.dealerCode;
  const notificationDealerId = profile.dealerId || dealerId;
  const unreadCount = notifications.filter((item) => !item.read).length;

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
    return allDocs;
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!notificationDealerId) return [];
    const res = await api.get(`/notifications/${notificationDealerId}`);
    const list = Array.isArray(res.data) ? res.data : [];
    const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(sorted);
    return sorted;
  }, [notificationDealerId]);

  const fetchDealerProfile = useCallback(async () => {
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
      console.log("[DEALER] fetchDealerProfile result:", JSON.stringify(dealerProfile, null, 2));
      const resolvedDealerId = dealerProfile?.dealerId || dealerProfile?.id || dealerId;
      const resolvedCode = dealerProfile?.dealerCode || storedDealerCode;
      console.log("[DEALER] resolvedDealerId:", resolvedDealerId, "resolvedCode:", resolvedCode);

      setProfile((prev) => ({
        dealerId: resolvedDealerId || prev.dealerId,
        fullName: dealerProfile?.fullName || prev.fullName,
        email: dealerProfile?.email || prev.email,
        mobileNumber: dealerProfile?.mobileNumber || prev.mobileNumber,
        dealerCode: resolvedCode || prev.dealerCode,
        role: dealerProfile?.role || prev.role || "DEALER",
      }));

      const [userRes, personalRes] = await Promise.all([
        api.get("/user/all"),
        api.get("/personal-info/all"),
      ]);

      const allUsers = userRes.data?.data || [];
      console.log("[DEALER] total users from API:", allUsers.length);
      console.log("[DEALER] first user sample:", JSON.stringify(allUsers[0], null, 2));

        // Build filtered list of users belonging to the logged‑in dealer
        // Match on dealerCode (if present) OR dealerId / assignedDealerId
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
        console.log("[DEALER] users matched after robust filter:", myUsers.length);

      const ids = new Set(myUsers.map((u) => u.userId));
      const myInfos = (personalRes.data?.data || []).filter((info) => ids.has(info.userId));
      const myDocs = await fetchDocsForUsers([...ids]);

      myUsers.sort((a, b) =>
        String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
      );
      setUsers(myUsers);
      setPersonalInfos(myInfos);
      setDocs(myDocs);

      if (resolvedDealerId) {
        try {
          const notifRes = await api.get(`/notifications/${resolvedDealerId}`);
          const list = Array.isArray(notifRes.data) ? notifRes.data : [];
          setNotifications([...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch {
          // notifications failure is non-critical
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
    try {
      await api.put(`/notifications/read/${notificationId}`);
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
        isPdf: fileName.toLowerCase().endsWith(".pdf"),
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
      const [docsRes, countRes] = await Promise.all([
        api.get(`/documents/user/${user.userId}`),
        api.get(`/documents/count/${user.userId}`),
      ]);
      setSelectedUserDocs(docsRes.data?.data || []);
      setSelectedCounts(countRes.data?.data || null);
    } catch (error) {
      showError(error, "Failed to load user details");
    }
  };

  const openTrackingModal = async (user) => {
    setTrackingUser(user);
    setTrackingCounts(null);
    setTrackingDocs(docsByUser[user.userId] || []);
    try {
      const [docsRes, countRes] = await Promise.all([
        api.get(`/documents/user/${user.userId}`),
        api.get(`/documents/count/${user.userId}`),
      ]);
      setTrackingDocs(docsRes.data?.data || []);
      setTrackingCounts(countRes.data?.data || null);
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

      await api.post("/personal-info/save", {
        userId: Number(newUserId),
        address: personalForm.address,
        mobileNumber: personalForm.mobileNumber,
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

      setUploadedDocs(uploaded.filter(Boolean));
      await loadDashboard();
      toast.success("New user loan registration submitted");
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
      const formData = new FormData();
      formData.append("userId", String(userId));
      formData.append("type", type);
      formData.append("file", file);
      await api.post("/documents/upload", formData);
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
      await api.put(`/dealer/update/${dealerId}`, {
        fullName: profile.fullName,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
      });
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

  const sortedStatusUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" })
    );
  }, [users]);

  const title = normalizedMenu === "Users" ? "Users" : normalizedMenu;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={activeMenu === "Users" ? "User" : activeMenu}
        setActiveMenu={setActiveMenu}
        handleLogout={handleLogout}
      />

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#0B2A4A]">{title}</h1>
              <p className="text-sm font-medium text-gray-500">Dealer Panel</p>
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
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl">
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
                              item.read ? "bg-white text-gray-600" : "bg-[#EAFBF8] text-[#0B2A4A]"
                            }`}
                          >
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

        <div className="p-6">
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
                  markRead={markRead}
                  openNewCustomer={openWizard}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                />
              )}

              {normalizedMenu === "Users" && (
                <UsersTab
                  users={users}
                  openUserModal={openUserModal}
                  openTrackingModal={openTrackingModal}
                />
              )}

              {normalizedMenu === "Status" && (
                <StatusTab
                  users={sortedStatusUsers}
                  docsByUser={docsByUser}
                  openPreview={openPreview}
                  reuploadDoc={reuploadDoc}
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
          <div className="h-[75vh] overflow-hidden rounded-2xl border border-gray-100 bg-[#F4F6F9]">
            {preview.isPdf ? (
              <iframe title={preview.title} src={preview.url} className="h-full w-full" />
            ) : (
              <img src={preview.url} alt={preview.title} className="h-full w-full object-contain" />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const DashboardTab = ({ stats, rejectedUsers, notifications, users, markRead, openNewCustomer, openUserModal, openTrackingModal }) => {
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);

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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FaUsers />} label="My Users" value={stats.users} />
        <StatCard icon={<FaFileAlt />} label="Total Docs Uploaded" value={stats.docs} />
        <StatCard icon={<FaClipboardList />} label="Pending Docs" value={stats.pending} />
        <StatCard icon={<FaCheckCircle />} label="Approved Docs" value={stats.approved} />
      </div>

      {users.length === 0 && <EmptyState text="No users found" />}
      {rejectedUsers.length > 0 && (
        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">
          <p className="font-bold">Rejected documents need attention</p>
          <p className="mt-1 text-sm">{rejectedUsers.map((user) => user.fullName).join(", ")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionTitle title="Recent Users" />
          <UserTable users={recentUsers} openUserModal={openUserModal} openTrackingModal={openTrackingModal} />
        </section>

        <section>
          <SectionTitle title="Latest Notifications" />
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {notifications.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`block w-full border-b border-gray-50 p-4 text-left text-sm ${
                  item.read ? "bg-white" : "bg-[#EAFBF8]"
                }`}
              >
                <p className="font-semibold text-[#0B2A4A]">{item.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(item.createdAt)}</p>
              </button>
            ))}
            {notifications.length === 0 && <div className="p-5 text-sm text-gray-500">No notifications</div>}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-500">{label}</p>
        <p className="mt-2 text-3xl font-black text-[#0B2A4A]">{value}</p>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAFBF8] text-2xl text-[#0B2A4A]">
        {icon}
      </div>
    </div>
  </div>
);

const SectionTitle = ({ title }) => <h2 className="mb-4 text-lg font-black text-[#0B2A4A]">{title}</h2>;

const UserTable = ({ users, openUserModal, openTrackingModal }) => (
  <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-[#0B2A4A] text-sm text-white">
          <tr>
            <th className="px-5 py-4">Name</th>
            <th className="px-5 py-4">Email</th>
            <th className="px-5 py-4">Mobile</th>
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
              <td className="px-5 py-4 text-gray-600">{formatDate(user.createdAt)}</td>
              {openUserModal && (
                <td className="px-5 py-4 flex gap-2">
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

const UsersTab = ({ users, openUserModal, openTrackingModal }) => (
  <div className="space-y-5">
    <SectionTitle title="My Users" />
    <UserTable users={users} openUserModal={openUserModal} openTrackingModal={openTrackingModal} />
  </div>
);

const UserModal = ({ user, info, docs, counts, onClose, openPreview, openWizard, reuploadDoc, locked }) => (
  <Modal title={user.fullName || "User Details"} onClose={onClose} wide>
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoTile label="Name" value={user.fullName} />
        <InfoTile label="Email" value={user.email} />
        <InfoTile label="Mobile" value={user.mobileNumber} />
      </div>

      <div className="rounded-3xl bg-[#F4F6F9] p-5">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
      <div key={doc.documentId} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
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

const StatusTab = ({ users, docsByUser, openPreview, reuploadDoc }) => (
  <div className="space-y-6">
    {users.map((user) => {
      const userDocs = docsByUser[user.userId] || [];
      const counts = {
        total: userDocs.length,
        pending: userDocs.filter((doc) => doc.status === "PENDING").length,
        approved: userDocs.filter((doc) => doc.status === "APPROVED").length,
        rejected: userDocs.filter((doc) => doc.status === "REJECTED").length,
      };

      return (
        <section key={user.userId} className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#0B2A4A]">{user.fullName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <p className="rounded-2xl bg-[#F4F6F9] px-4 py-2 text-sm font-bold text-[#0B2A4A]">
              {counts.total} docs • {counts.pending} pending • {counts.approved} approved • {counts.rejected} rejected
            </p>
          </div>
          <DocumentGrid
            docs={userDocs}
            openPreview={openPreview}
            reuploadDoc={isUserAssignedToBank(user) ? null : reuploadDoc}
          />
        </section>
      );
    })}
    {users.length === 0 && <EmptyState text="No user status found." />}
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
}) => (
  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <SectionTitle title="Profile" />
      <FormField label="Full Name" value={profile.fullName} onChange={(value) => setProfile({ ...profile, fullName: value })} />
      <FormField label="Email" value={profile.email} readOnly />
      <FormField label="Mobile" value={profile.mobileNumber} readOnly />
      <FormField label="Dealer Code" value={profile.dealerCode} readOnly />
      <FormField label="Role" value={profile.role} readOnly />
      <button
        onClick={saveProfile}
        disabled={profileSaving}
        className="mt-2 rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white disabled:opacity-60"
      >
        {profileSaving ? "Saving..." : "Save Name"}
      </button>
    </section>

    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <SectionTitle title="Change Password" />
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
      <button
        onClick={changePassword}
        className="mt-2 flex items-center gap-2 rounded-2xl bg-[#27D3C3] px-6 py-3 font-black text-[#0B2A4A]"
      >
        <FaLock /> Change Password
      </button>
    </section>
  </div>
);

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

  const incomeTypes =
    employmentType === "Salaried"
      ? ["SALARY_SLIP", "APPOINTMENT_LETTER", "BANK_STATEMENT"]
      : employmentType === "Self Employed"
        ? ["ITR_RETURN", "BANK_STATEMENT"]
        : [];

  const setFile = (type, file) => setFiles((prev) => ({ ...prev, [type]: file }));
  const updateForm = (key, value) => setPersonalForm({ ...personalForm, [key]: value });
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
    setLocalPreview({ title: docLabel(type), url: URL.createObjectURL(file) });
  };

  const closeSelectedFilePreview = () => {
    if (localPreview?.url) URL.revokeObjectURL(localPreview.url);
    setLocalPreview(null);
  };

  const handleVerifySubmit = async () => {
    const saved = await onSubmit();
    if (saved) setReviewOpen(false);
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
        <section className="rounded-3xl bg-[#F4F6F9] p-5">
          <h4 className="mb-4 font-black text-[#0B2A4A]">User Details</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Full Name" value={personalForm.fullName} onChange={(value) => updateForm("fullName", value)} />
            <FormField label="Email" type="email" value={personalForm.email} onChange={(value) => updateForm("email", value)} />
            <FormField
              label="Mobile Number"
              value={personalForm.mobileNumber}
              onChange={(value) => updateForm("mobileNumber", value.replace(/\D/g, "").slice(0, 10))}
            />
            <FormField
              label="Password"
              type="password"
              value={personalForm.password}
              onChange={(value) => updateForm("password", value)}
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
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
                onChange={(event) => setEmploymentType(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#0B2A4A] outline-none focus:border-[#27D3C3]"
              >
                <option value="">Select Employment Type</option>
                <option value="Salaried">Salaried</option>
                <option value="Self Employed">Self Employed</option>
              </select>
            </label>
          </div>
        </section>

        <UploadStep title="KYC Documents" types={STEP_TYPES[2]} files={files} setFile={setFile} />
        <UploadStep title="Residential Proof" types={STEP_TYPES[3]} files={files} setFile={setFile} note="Upload Light Bill or Rental Agreement." />
        {incomeTypes.length > 0 && <UploadStep title="Income Documents" types={incomeTypes} files={files} setFile={setFile} />}
        <UploadStep title="Vehicle Documents" types={STEP_TYPES[5]} files={files} setFile={setFile} />

        {uploadedDocs.length > 0 && (
          <section className="space-y-4 rounded-3xl bg-[#F4F6F9] p-5">
            <h4 className="font-black text-[#0B2A4A]">Uploaded Documents</h4>
            <DocumentGrid docs={uploadedDocs} openPreview={openPreview} />
          </section>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
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
          <div className="h-[75vh] overflow-hidden rounded-2xl border border-gray-100 bg-[#F4F6F9]">
            <iframe title={localPreview.title} src={localPreview.url} className="h-full w-full" />
          </div>
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
      <section className="rounded-3xl bg-[#F4F6F9] p-5">
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
            <div key={type} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
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

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
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

const UploadStep = ({ title, types, files, setFile, note }) => (
  <div>
    <h4 className="font-black text-[#0B2A4A]">{title}</h4>
    {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {types.map((type) => (
        <label key={type} className="block rounded-3xl border border-gray-100 bg-[#F4F6F9] p-5">
          <span className="font-black text-[#0B2A4A]">{docLabel(type)}</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(event) => setFile(type, event.target.files?.[0])}
            className="mt-4 w-full text-sm"
          />
          {files[type] && <span className="mt-2 block truncate text-sm text-gray-500">{files[type].name}</span>}
        </label>
      ))}
    </div>
  </div>
);

const TrackingModal = ({ user, docs, counts, onClose }) => {
  const steps = useMemo(() => {
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
  }, [docs, user.userId]);

  return (
    <Modal title="Application Tracking" onClose={onClose}>
      <div className="space-y-6 p-1">
        <div className="rounded-3xl bg-gradient-to-br from-[#0B2A4A] to-[#1a3d60] p-6 text-white shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-[#27D3C3]">Applicant Details</span>
          <h3 className="mt-1 text-2xl font-black">{user.fullName}</h3>
          <p className="text-sm opacity-80">{user.email} • {user.mobileNumber}</p>
          <div className="mt-4 border-t border-white/10 pt-4 flex justify-between items-center text-xs opacity-75">
            <span>App ID: {user.applicationId || "N/A"}</span>
            <span>Registered: {formatDate(user.createdAt)}</span>
          </div>
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

        <div className="flex justify-end border-t border-gray-100 pt-5">
          <button
            onClick={onClose}
            className="rounded-2xl bg-[#0B2A4A] px-6 py-3 font-bold text-white shadow-lg shadow-[#0B2A4A]/10 hover:bg-[#1a3d60] transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DealerDashboard;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaBell,
  FaCheck,
  FaExclamationTriangle,
  FaFileAlt,
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
import {
  DataTable,
  formatDate,
  getAdminSession,
  PreviewModal,
  StatCard,
  unwrap,
} from "./adminShared";

const emptyBank = {
  bankName: "",
  representativeName: "",
  contactNumber: "",
  email: "",
};

const asList = (response) => {
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
};

const isForbiddenResult = (result) =>
  result?.status === "rejected" && result.reason?.response?.status === 403;

const readAssignedBankId = (userId) => localStorage.getItem(`user_bank_assignment_${userId}`) || "";

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

  return mergedDocs;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const admin = useMemo(getAdminSession, []);
  const adminId = admin?.id || 1;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState("");
  const [users, setUsers] = useState([]);
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
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [dealerForm, setDealerForm] = useState(null);
  const [documentTab, setDocumentTab] = useState("Pending");
  const [remarks, setRemarks] = useState({});
  const [bankModal, setBankModal] = useState(null);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [preview, setPreview] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const allKnownDocs = useMemo(
    () => {
      const map = new Map();
      [...allDocuments, ...pendingDocs, ...verifiedDocs].forEach((doc) => {
        if (doc?.documentId) map.set(doc.documentId, doc);
      });
      return Array.from(map.values());
    },
    [allDocuments, pendingDocs, verifiedDocs]
  );
  const approvedDocsCount = allKnownDocs.filter((doc) => doc.status === "APPROVED").length;
  const rejectedDocsCount = allKnownDocs.filter((doc) => doc.status === "REJECTED").length;
  const effectivePendingDocs = allKnownDocs.filter((doc) => doc.status === "PENDING");
  const effectiveVerifiedDocs = allKnownDocs.filter((doc) => doc.status === "VERIFIED");
  const unreadCount = notifications.filter((item) => !item.read).length;

  const fetchAdminData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        setPermissionError("");
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

        const protectedResults = [
          pendingRes,
          verifiedRes,
          personalRes,
          banksRes,
          notificationsRes,
        ];
        const hasAdminForbidden = protectedResults.some(isForbiddenResult);

        let loadedUsers = [];
        if (usersRes.status === "fulfilled") {
          loadedUsers = asList(usersRes.value);
          setUsers(loadedUsers);
        } else if (usersRes.reason?.response?.status === 403) {
          setUsers([]);
          setPermissionError("Your current token is not authorized for admin data. Please login again with an ADMIN account.");
        }
        if (dealersRes.status === "fulfilled") setDealers(asList(dealersRes.value));
        if (pendingRes.status === "fulfilled") setPendingDocs(asList(pendingRes.value));
        if (verifiedRes.status === "fulfilled") setVerifiedDocs(asList(verifiedRes.value));
        if (personalRes.status === "fulfilled") setPersonalInfos(asList(personalRes.value));
        if (banksRes.status === "fulfilled") {
          const bankData = banksRes.value.data;
          setBanks(Array.isArray(bankData) ? bankData : []);
        }
        if (notificationsRes.status === "fulfilled") {
          setNotifications(Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : []);
        }

        if (hasAdminForbidden) {
          setPermissionError("Admin API access is forbidden for this token. Please login again as ADMIN, or check backend role permissions for admin endpoints.");
          setAllDocuments([]);
        } else if (loadedUsers.length > 0) {
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

  const fetchDocumentLists = useCallback(async () => {
    if (permissionError) return;
    try {
      const [pendingRes, verifiedRes] = await Promise.allSettled([
        api.get("/documents/pending"),
        api.get("/documents/verified"),
      ]);
      if (isForbiddenResult(pendingRes) || isForbiddenResult(verifiedRes)) {
        setPermissionError("Document APIs are forbidden for this token. Please login again as ADMIN, or check backend document permissions.");
        setPendingDocs([]);
        setVerifiedDocs([]);
        setAllDocuments([]);
        return;
      }
      if (pendingRes.status === "fulfilled") setPendingDocs(asList(pendingRes.value));
      if (verifiedRes.status === "fulfilled") setVerifiedDocs(asList(verifiedRes.value));
      setAllDocuments(await fetchDocumentsForUsersInBatches(users));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to refresh documents.");
    }
  }, [permissionError, users]);

  useEffect(() => {
    fetchAdminData(true);
  }, [fetchAdminData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (permissionError) return;
      fetchDocumentLists();
      api
        .get(`/notifications/${adminId}`)
        .then((res) => setNotifications(res.data || []))
        .catch((error) => {
          if (error?.response?.status === 403) {
            setNotifications([]);
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
    try {
      const res = await api.get(`/user/search?name=${encodeURIComponent(searchName.trim())}`);
      setUsers(Array.isArray(res.data) ? res.data : unwrap(res) || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "User search failed.");
    }
  };

  const assignBank = async () => {
    if (!selectedUser || !assignBankId) {
      toast.error("Please select a bank.");
      return;
    }
    const assignedBank = banks.find((bank) => String(bank.bankId) === String(assignBankId));
    const selectedPersonalInfo = personalInfos.find((info) => info.userId === selectedUser.userId);

    if (!selectedPersonalInfo) {
      toast.error("Personal info is missing for this user. Add personal info before assigning a bank.");
      return;
    }

    try {
      await api.put(`/user/assign-bank/${selectedUser.userId}`, { bankId: Number(assignBankId) });
      const approvalResult = await approveDocuments(selectedUserDocs);
      localStorage.setItem(`user_bank_assignment_${selectedUser.userId}`, String(assignBankId));
      if (approvalResult.failed > 0) {
        toast.warning(`Bank assigned, but ${approvalResult.failed} document(s) could not be auto-approved.`);
      } else if (approvalResult.approved > 0) {
        toast.success(`Bank assigned, bank notified, and ${approvalResult.approved} document(s) approved.`);
      } else {
        toast.success("Bank assigned and bank notified.");
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
      setSelectedUser((prev) => (prev ? { ...prev, ...bankFields } : prev));
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === selectedUser.userId ? { ...user, ...bankFields } : user
        )
      );
      setAssignBankId("");
      await fetchAdminData(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to assign bank.");
    }
  };

  const openDealer = (dealer) => {
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
      toast.success(`Document marked ${status}.`);
      await fetchDocumentLists();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update document status.");
    }
  };

  const saveRemark = async (documentId) => {
    try {
      await api.put(`/documents/${documentId}/remarks`, {
        remarks: remarks[documentId] || "",
      });
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
          personalInfo={personalInfos.find((info) => info.userId === selectedUser?.userId)}
          closeUser={() => setSelectedUser(null)}
          openPreview={openPreview}
        />
      );
    }

    if (activeMenu === "Dealers") {
      return (
        <Dealers
          dealers={dealers}
          openDealer={openDealer}
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
          allDocs={allKnownDocs}
          users={users}
          remarks={remarks}
          setRemarks={setRemarks}
          updateDocumentStatus={updateDocumentStatus}
          saveRemark={saveRemark}
          openPreview={openPreview}
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
        setActiveMenu={setActiveMenu}
      />
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F9] text-slate-800">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        handleLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="bg-white px-6 md:px-8 py-5 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0B2A4A]">{activeMenu}</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, {admin?.name || "Admin"}</p>
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
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-xl border border-slate-100 z-30 p-4">
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
            <div className="bg-white rounded-3xl p-8 font-bold text-[#0B2A4A]">Loading admin data...</div>
          ) : (
            renderActivePage()
          )}
        </div>
      </main>

      {preview && <PreviewModal preview={preview} closePreview={closePreview} />}
    </div>
  );
};

const PermissionWarning = ({ message, onLogout }) => (
  <div className="bg-white rounded-3xl p-8 shadow-sm max-w-3xl">
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

const DashboardOverview = ({ users, dealers, pendingDocs, verifiedDocs, personalInfos, setActiveMenu }) => {
  const stats = [
    { label: "Total Users", value: users.length, icon: <FaUsers /> },
    { label: "Total Dealers", value: dealers.length, icon: <FaUserTie /> },
    { label: "Pending Documents", value: pendingDocs.length, icon: <FaFileAlt /> },
    { label: "Verified Documents", value: verifiedDocs.length, icon: <FaCheck /> },
    { label: "Total Loan Applications", value: personalInfos.length, icon: <FaUniversity /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {pendingDocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

      <div className="bg-white rounded-3xl p-6 shadow-sm overflow-x-auto">
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

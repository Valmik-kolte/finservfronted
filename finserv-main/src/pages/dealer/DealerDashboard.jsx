import React, { useEffect, useState } from "react";
import Sidebar from "../../components/dealer/Sidebar";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const Dashboard = () => {

const [dealerUserData, setDealerUserData] = useState({
  name: "",
  mobile: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  address: "",
  loanAmount: "",
});



  /* Documents States */

  const [showAddCustomerModal, setShowAddCustomerModal] =
  useState(false);

const [dealerCurrentStep, setDealerCurrentStep] =
  useState(1);

const [dealerEmploymentType, setDealerEmploymentType] =
  useState("");

const [dealerResidentialType, setDealerResidentialType] =
  useState("");

const [dealerVehicleDocs, setDealerVehicleDocs] =
  useState({});

  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [currentApplicationNumber, setCurrentApplicationNumber] = useState(null);
  const [currentCustomerUserId, setCurrentCustomerUserId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  /* SETTINGS STATES */

const [showPasswordForm, setShowPasswordForm] =
  useState(false);

const [showPhoneModal, setShowPhoneModal] =
  useState(false);

const [showEmailModal, setShowEmailModal] =
  useState(false);

const [phoneOtpStep, setPhoneOtpStep] =
  useState(false);

const [emailOtpStep, setEmailOtpStep] =
  useState(false);

const [profileData, setProfileData] =
  useState({
    name: "",
    phone: "",
    email: "",
    dealerCode: localStorage.getItem("dealerCode") || "—",
  });

const [phoneForm, setPhoneForm] =
  useState({
    currentPhone: "9876543210",
    newPhone: "",
    otp: "",
  });

const [emailForm, setEmailForm] =
  useState({
    currentEmail: "dealer@gmail.com",
    newEmail: "",
    otp: "",
  });
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [activeMenu, setActiveMenu] =
    useState("Dashboard");

  const [selectedUser, setSelectedUser] =
    useState(null);

  
const [showEditModal, setShowEditModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [documentsEditMode, setDocumentsEditMode] = useState(false);
  const [showStatusModal, setShowStatusModal] =
    useState(false);
const [editMode, setEditMode] = useState(false);
const [documentMode, setDocumentMode] = useState(false);
  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [statusFilter, setStatusFilter] =
    useState("All");

    const [activeMonth, setActiveMonth] =
  useState(0);

const [showRemarksModal, setShowRemarksModal] =
  useState(false);

const [selectedRemark, setSelectedRemark] =
  useState("");

  const mapStatus = (status) => {
    switch (status) {
      case "PENDING":
      case "DOCUMENTS_SUBMITTED":
        return "Documents Submitted";
      case "DOCUMENTS_VERIFIED":
        return "Documents Verified";
      case "SENT_TO_BANK":
      case "BANK_REVIEW":
        return "Bank Review";
      case "APPROVED":
        return "Loan Approved";
      case "REJECTED":
        return "Rejected";
      default:
        return status || "Documents Submitted";
    }
  };

  
  const fetchApplications = async (dealerId) => {
    try {
      const res = await api.get(`/loan-applications/dealer/${dealerId}`);
      const rawApps = res.data || [];
      const mapped = rawApps.map(app => {
        const documents = [];
        if (app.panDocumentId) documents.push("PAN Card");
        if (app.aadhaarFrontDocumentId || app.aadhaarBackDocumentId) documents.push("Aadhaar Card");
        if (app.residentialProofDocumentId) documents.push("Residential Proof");
        if (app.bankStatementDocumentId || app.salarySlipDocumentId || app.itrDocumentId) documents.push("Income Proof");
        if (app.rcDocumentId || app.insuranceDocumentId || app.carFrontDocumentId || app.carBackDocumentId) documents.push("Vehicle Documents");

        return {
          id: app.loanApplicationId,
          applicationNumber: app.applicationNumber,
          userId: app.userId,
          name: app.fullName || "—",
          mobile: app.mobileNumber || "—",
          email: app.email || "",
          loan: app.loanAmount ? `₹${app.loanAmount.toLocaleString('en-IN')}` : "—",
          loanAmount: app.loanAmount || 0,
          status: mapStatus(app.status),
          rawStatus: app.status,
          type: app.registrationType === "DEALER" ? "Dealer Added" : "Individual",
          documents,
          hasRemark: !!app.remark,
          remark: app.remark,
          editable: true
        };
      });
      setUsers(mapped);
      setStatusData(mapped);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  
  const handleDocumentUpload = async (file, documentType) => {
    if (!file) {
      alert("Please select a file");
      return;
    }
    if (!currentCustomerUserId) {
      alert("Please complete step 1 (Personal Information) first before uploading documents.");
      return;
    }

    try {
      setDocumentLoading(true);
      const formData = new FormData();
      formData.append("userId", currentCustomerUserId);
      formData.append("type", documentType);
      formData.append("file", file);

      const res = await api.post("/documents/upload", formData);
      const uploadedDoc = res.data.data;
      setUploadedDocuments((prev) => {
        const filtered = prev.filter(d => d.documentType !== documentType && d.type !== documentType);
        return [...filtered, uploadedDoc];
      });
      alert(`${documentType} Uploaded Successfully`);
    } catch (error) {
      console.error("Document upload error:", error);
      alert(error?.response?.data?.message || "Document upload failed");
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleNextStep1 = async () => {
    if (!dealerUserData.name || !dealerUserData.mobile || !dealerUserData.email || !dealerUserData.loanAmount) {
      alert("Please fill in all mandatory fields: Name, Mobile, Email, and Loan Amount");
      return;
    }
    if (!dealerUserData.mobile.match(/^[6-9][0-9]{9}$/)) {
      alert("Please enter a valid 10-digit mobile number starting with 6-9");
      return;
    }
    if (parseFloat(dealerUserData.loanAmount) <= 0) {
      alert("Loan amount must be greater than 0");
      return;
    }

    try {
      const storedDealer = JSON.parse(localStorage.getItem("dealerData"));
      const dealerId = storedDealer?.dealerId || storedDealer?.id;
      if (!dealerId) {
        alert("Dealer session not found. Please log in again.");
        return;
      }

      const payload = {
        fullName: dealerUserData.name,
        email: dealerUserData.email,
        mobileNumber: dealerUserData.mobile,
        loanAmount: parseFloat(dealerUserData.loanAmount),
        address: dealerUserData.address || "",
        city: dealerUserData.city || "",
        state: dealerUserData.state || "",
        pincode: dealerUserData.pincode || ""
      };

      let res;
      if (currentApplicationNumber) {
        res = await api.put(`/loan-applications/personal/${currentApplicationNumber}`, {
          fullName: dealerUserData.name,
          email: dealerUserData.email,
          mobileNumber: dealerUserData.mobile,
          address: dealerUserData.address || "",
          city: dealerUserData.city || "",
          state: dealerUserData.state || "",
          pincode: dealerUserData.pincode || ""
        });
      } else {
        res = await api.post(`/loan-applications/apply-by-dealer/${dealerId}`, payload);
        const savedApp = res.data;
        setCurrentApplicationNumber(savedApp.applicationNumber);
        setCurrentCustomerUserId(savedApp.userId);
      }
      setDealerCurrentStep(2);
    } catch (error) {
      console.error("Error saving step 1:", error);
      alert(error?.response?.data?.message || error?.response?.data || "Failed to save step 1 details");
    }
  };

  const handleNext = async () => {
    if (dealerCurrentStep === 1) {
      await handleNextStep1();
    } else if (dealerCurrentStep === 2) {
      const panDoc = uploadedDocuments.find(d => d.documentType === "PAN" || d.type === "PAN");
      const aadhaarDoc = uploadedDocuments.find(d => d.documentType === "AADHAAR" || d.type === "AADHAAR");
      if (!panDoc || !aadhaarDoc) {
        alert("Please upload both PAN Card and Aadhaar Card before proceeding.");
        return;
      }
      try {
        const payload = {
          panDocumentId: panDoc.documentId,
          aadhaarFrontDocumentId: aadhaarDoc.documentId,
          aadhaarBackDocumentId: aadhaarDoc.documentId
        };
        await api.post(`/loan-applications/kyc/${currentApplicationNumber}`, payload);
        setDealerCurrentStep(3);
      } catch (err) {
        console.error(err);
        alert(err?.response?.data?.message || err?.response?.data || "Failed to save KYC");
      }
    } else if (dealerCurrentStep === 3) {
      if (!dealerUserData.city || !dealerUserData.state || !dealerUserData.pincode) {
        alert("Please fill in all address fields: City, State, and Pincode");
        return;
      }
      if (!dealerUserData.pincode.match(/^[0-9]{6}$/)) {
        alert("Please enter a valid 6-digit pincode");
        return;
      }
      const lightBillDoc = uploadedDocuments.find(d => d.documentType === "LIGHT_BILL" || d.type === "LIGHT_BILL");
      const rentalDoc = uploadedDocuments.find(d => d.documentType === "RENTAL_AGREEMENT" || d.type === "RENTAL_AGREEMENT");
      const docId = lightBillDoc?.documentId || rentalDoc?.documentId;
      if (!docId) {
        alert("Please upload at least one residential proof (Light Bill or Rent Agreement).");
        return;
      }
      try {
        const payload = {
          residentialProofDocumentId: docId,
          address: dealerUserData.address,
          city: dealerUserData.city,
          state: dealerUserData.state,
          pincode: dealerUserData.pincode
        };
        await api.post(`/loan-applications/residential/${currentApplicationNumber}`, payload);
        setDealerCurrentStep(4);
      } catch (err) {
        console.error(err);
        alert(err?.response?.data?.message || err?.response?.data || "Failed to save Residential details");
      }
    } else if (dealerCurrentStep === 4) {
      if (!dealerUserData.employmentType) {
        alert("Please select Employment Type.");
        return;
      }
      const bankStatementDoc = uploadedDocuments.find(d => d.documentType === "BANK_STATEMENT" || d.type === "BANK_STATEMENT");
      if (!bankStatementDoc) {
        alert("Bank Statement is required.");
        return;
      }
      try {
        const payload = {
          employmentType: dealerUserData.employmentType === "Salaried" ? "SALARIED" : "BUSINESS",
          bankStatementDocumentId: bankStatementDoc.documentId,
        };
        if (dealerUserData.employmentType === "Salaried") {
          const salarySlipDoc = uploadedDocuments.find(d => d.documentType === "SALARY_SLIP" || d.type === "SALARY_SLIP");
          const appLetterDoc = uploadedDocuments.find(d => d.documentType === "APPOINTMENT_LETTER" || d.type === "APPOINTMENT_LETTER");
          payload.salarySlipDocumentId = salarySlipDoc?.documentId || null;
          payload.appointmentLetterDocumentId = appLetterDoc?.documentId || null;
        } else {
          const itrDoc = uploadedDocuments.find(d => d.documentType === "ITR_RETURN" || d.type === "ITR_RETURN");
          payload.itrDocumentId = itrDoc?.documentId || null;
        }
        await api.post(`/loan-applications/income/${currentApplicationNumber}`, payload);
        setDealerCurrentStep(5);
      } catch (err) {
        console.error(err);
        alert(err?.response?.data?.message || err?.response?.data || "Failed to save Income details");
      }
    } else if (dealerCurrentStep === 5) {
      const rcDoc = uploadedDocuments.find(d => d.documentType === "RC" || d.type === "RC");
      const insDoc = uploadedDocuments.find(d => d.documentType === "INSURANCE" || d.type === "INSURANCE");
      const carFrontDoc = uploadedDocuments.find(d => d.documentType === "CAR_FRONT_SIDE_PHOTO" || d.type === "CAR_FRONT_SIDE_PHOTO");
      const carBackDoc = uploadedDocuments.find(d => d.documentType === "CAR_BACK_SIDE_PHOTO" || d.type === "CAR_BACK_SIDE_PHOTO");
      
      if (!rcDoc || !insDoc) {
        alert("RC Copy and Insurance Copy are required.");
        return;
      }
      try {
        const payload = {
          rcDocumentId: rcDoc.documentId,
          insuranceDocumentId: insDoc.documentId,
          carFrontDocumentId: carFrontDoc?.documentId || null,
          carBackDocumentId: carBackDoc?.documentId || null
        };
        await api.post(`/loan-applications/vehicle/${currentApplicationNumber}`, payload);
        setDealerCurrentStep(6);
      } catch (err) {
        console.error(err);
        alert(err?.response?.data?.message || err?.response?.data || "Failed to save Vehicle details");
      }
    }
  };

  const resetNewUserForm = () => {
    setDealerCurrentStep(1);
    setDealerUserData({ name: "", mobile: "", email: "", city: "", state: "", pincode: "", address: "", loanAmount: "" });
    setUploadedDocuments([]);
    setCurrentApplicationNumber(null);
    setCurrentCustomerUserId(null);
    setDealerEmploymentType("");
    setDealerResidentialType("");
    setIsEditMode(false);
  };

  const handleFinalSubmit = async () => {
    try {
      if (isEditMode) {
        const payload = { fullName: dealerUserData.name, email: dealerUserData.email, mobileNumber: dealerUserData.mobile, loanAmount: parseFloat(dealerUserData.loanAmount) || 0, address: dealerUserData.address || '', city: dealerUserData.city || '', state: dealerUserData.state || '', pincode: dealerUserData.pincode || '' };
        await api.put(`/loan-applications/personal/${currentApplicationNumber}`, payload);
        alert('Customer details updated successfully!');
      } else {
        await api.post(`/loan-applications/submit/${currentApplicationNumber}`);
        alert('Customer documents submitted for approval successfully!');
      }
      setShowAddCustomerModal(false);
      setIsEditMode(false);
      setDealerCurrentStep(1);
      setDealerUserData({ name: '', mobile: '', email: '', city: '', state: '', pincode: '', address: '', loanAmount: '' });
      setUploadedDocuments([]);
      setCurrentApplicationNumber(null);
      setCurrentCustomerUserId(null);
      const storedDealer = JSON.parse(localStorage.getItem('dealerData'));
      const dealerId = storedDealer?.dealerId || storedDealer?.id;
      if (dealerId) fetchApplications(dealerId);
    } catch (err) {
      console.error('Final submit error:', err);
      alert(err?.response?.data?.message || err?.response?.data || 'Failed to submit application');
    }
  };

  const handleEditUser = async (user) => {
    setSelectedUser(user);
    setEditingUser(user);
    setDetailsEditMode(false);
    setDocumentsEditMode(false);
    setShowEditUserModal(true);

    try {
      const [appRes, docRes] = await Promise.all([
        api.get(`/loan-applications/user/${user.userId}`),
        api.get(`/documents/user/${user.userId}`),
      ]);

      const appData = appRes.data;
      const app = Array.isArray(appData)
        ? appData.find((a) => a.applicationNumber === user.applicationNumber) || appData[0]
        : appData;

      if (app) {
        setEditingUser((prev) => ({
          ...prev,
          name: app.fullName || prev?.name || "",
          mobile: app.mobileNumber || prev?.mobile || "",
          email: app.email || prev?.email || "",
          loan: app.loanAmount ? `₹${app.loanAmount.toLocaleString("en-IN")}` : prev?.loan || "",
        }));
      }

      setUploadedDocuments(docRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching application details:", err);
    }
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;

    const applicationNumber = editingUser.applicationNumber || editingUser.applicationNo || editingUser.applicationNumber;
    if (!applicationNumber) {
      alert("Unable to identify application for update.");
      return;
    }

    const loanAmountValue = Number(
      String(editingUser.loan || "")
        .replace(/[^0-9.]/g, "")
    );

    try {
      const payload = {
        fullName: editingUser.name,
        email: editingUser.email,
        mobileNumber: editingUser.mobile,
        loanAmount: isNaN(loanAmountValue) ? 0 : loanAmountValue,
      };

      await api.put(`/loan-applications/personal/${applicationNumber}`, payload);

      setUsers((prev) =>
        prev.map((user) =>
          user.applicationNumber === applicationNumber || user.userId === editingUser.userId
            ? {
                ...user,
                name: editingUser.name,
                mobile: editingUser.mobile,
                email: editingUser.email,
                loan: editingUser.loan || user.loan,
              }
            : user
        )
      );
      setStatusData((prev) =>
        prev.map((user) =>
          user.applicationNumber === applicationNumber || user.userId === editingUser.userId
            ? {
                ...user,
                name: editingUser.name,
                mobile: editingUser.mobile,
                email: editingUser.email,
                loan: editingUser.loan || user.loan,
              }
            : user
        )
      );

      setSelectedUser((prev) =>
        prev && (prev.applicationNumber === applicationNumber || prev.userId === editingUser.userId)
          ? { ...prev, ...editingUser }
          : prev
      );

      setShowEditUserModal(false);
      alert("User updates saved successfully.");
    } catch (err) {
      console.error("Update user error:", err);
      alert(err?.response?.data?.message || "Failed to save user updates");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const storedDealer = JSON.parse(localStorage.getItem("dealerData"));
      const dealerId = storedDealer?.dealerId || storedDealer?.id;
      if (!dealerId) {
        alert("Dealer ID not found. Please log in again.");
        return;
      }
      const payload = {
        fullName: profileData.name,
        email: profileData.email,
        mobileNumber: profileData.phone,
        role: "DEALER"
      };
      await api.put(`/dealer/update/${dealerId}`, payload);
      
      const updatedDealer = {
        ...storedDealer,
        fullName: profileData.name,
        email: profileData.email,
        mobileNumber: profileData.phone,
        name: profileData.name,
        phone: profileData.phone
      };
      localStorage.setItem("dealerData", JSON.stringify(updatedDealer));
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to update profile");
    }
  };

  const handleSavePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert("Please fill in all password fields");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("New Password and Confirm Password do not match");
      return;
    }
    try {
      const payload = {
        email: profileData.email,
        newPassword: passwordForm.newPassword,
      };
      await api.post("/dealer/reset-password", payload);
      alert("Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Password change error:", err);
      alert(err?.response?.data || err?.response?.data?.message || "Failed to update password");
    }
  };

  const fetchNotifications = async (dealerId) => {
    try {
      // Fetch base notifications
      const res = await api.get(`/notifications/${dealerId}`);
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const feed = sorted.map((n) => {
        const date = new Date(n.createdAt);
        const diffMs = new Date() - date;
        const diffMins = Math.floor(diffMs / 60000);
        let timeStr = "Just now";
        if (diffMins > 0) {
          if (diffMins < 60) timeStr = `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
          else {
            const diffHours = Math.floor(diffMins / 60);
            timeStr = diffHours < 24 ? `${diffHours} hour${diffHours > 1 ? "s" : ""} ago` : date.toLocaleDateString();
          }
        }
        return { id: n.id, message: n.message, time: timeStr };
      });

      // Fetch document rejection/remark updates for dealer's customers
      try {
        const appsRes = await api.get(`/loan-applications/dealer/${dealerId}`);
        const apps = appsRes.data || [];
        const docFeed = [];

        await Promise.all(apps.map(async (app) => {
          if (!app.userId) return;
          try {
            const docRes = await api.get(`/documents/user/${app.userId}`);
            const docs = docRes.data.data || [];
            docs.forEach((doc) => {
              const name = app.fullName || "Customer";
              const label = docNames[doc.documentType] || (doc.documentType || "").replace(/_/g, " ");
              if (doc.status === "REJECTED") {
                docFeed.push({
                  id: `rej-${doc.documentId}`,
                  message: `❌ ${name}'s ${label} was rejected by admin${doc.remarks ? `: "${doc.remarks}"` : "."}`,
                  time: "Recent",
                  type: "rejected",
                  documentId: doc.documentId,
                  documentType: doc.documentType,
                  userId: app.userId,
                  customerName: name,
                  label,
                });
              } else if (doc.remarks && doc.status !== "REJECTED") {
                docFeed.push({
                  id: `rem-${doc.documentId}`,
                  message: `💬 Admin added remark on ${name}'s ${label}: "${doc.remarks}"`,
                  time: "Recent",
                  type: "remark",
                  documentId: doc.documentId,
                  documentType: doc.documentType,
                  userId: app.userId,
                  customerName: name,
                  label,
                });
              } else if (doc.status === "APPROVED") {
                docFeed.push({
                  id: `apv-${doc.documentId}`,
                  message: `✅ ${name}'s ${label} was approved by admin.`,
                  time: "Recent",
                  type: "approved",
                });
              }
            });
          } catch (_) {}
        }));

        // Merge: doc updates first (most actionable), then notifications
        setActivityFeed([...docFeed, ...feed]);
      } catch (_) {
        setActivityFeed(feed);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const [activityFeed, setActivityFeed] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const docNames = {
    PAN: "PAN Card",
    AADHAAR: "Aadhaar Card",
    AADHAAR_FRONT: "Aadhaar Front",
    AADHAAR_BACK: "Aadhaar Back",
    LIGHT_BILL: "Light Bill",
    RENTAL_AGREEMENT: "Rental Agreement",
    RC: "RC Copy",
    INSURANCE: "Insurance Copy",
    SALARY_SLIP: "Salary Slip",
    APPOINTMENT_LETTER: "Appointment Letter",
    ITR_RETURN: "ITR Copy",
    BANK_STATEMENT: "Bank Statement",
    CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
    CAR_BACK_SIDE_PHOTO: "Car Back Photo",
    CHASSIS_NUMBER: "Chassis Number",
    ODOMETER_READING: "Odometer Reading",
  };

  const openPreview = async (doc) => {
    try {
      const res = await fetch(`${api.defaults.baseURL}/documents/preview/${doc.documentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewDoc(doc);
      setShowPreviewModal(true);
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to load document preview");
    }
  };

  const handleReuploadDocument = async (documentId, documentType, file, userId) => {
    if (!file) return;
    const resolvedUserId = userId || currentCustomerUserId;
    try {
      setDocumentLoading(true);
      await api.delete(`/documents/${documentId}`);
      const formData = new FormData();
      formData.append("userId", resolvedUserId);
      formData.append("type", documentType);
      formData.append("file", file);
      const res = await api.post("/documents/upload", formData);
      const uploadedDoc = res.data.data;
      setUploadedDocuments((prev) => [
        ...prev.filter((d) => d.documentId !== documentId),
        uploadedDoc,
      ]);
      alert(`${documentType} re-uploaded successfully!`);
      // Refresh notifications to reflect updated status
      const storedDealer = JSON.parse(localStorage.getItem("dealerData"));
      const dealerId = storedDealer?.dealerId || storedDealer?.id;
      if (dealerId) fetchNotifications(dealerId);
    } catch (error) {
      console.error("Re-upload error:", error);
      alert(error?.response?.data?.message || "Failed to re-upload document");
    } finally {
      setDocumentLoading(false);
    }
  };

  useEffect(() => {
    const storedDealer = JSON.parse(localStorage.getItem("dealerData"));
    const storedCode = localStorage.getItem("dealerCode");
    if (storedDealer || storedCode) {
      setProfileData((prev) => ({
        ...prev,
        name: storedDealer?.fullName || storedDealer?.name || prev.name,
        phone: storedDealer?.mobileNumber || storedDealer?.phone || prev.phone,
        email: storedDealer?.email || prev.email,
        dealerCode: storedDealer?.dealerCode || storedCode || prev.dealerCode,
      }));
    }
    const dealerId = storedDealer?.dealerId || storedDealer?.id;
    let interval = null;
    if (dealerId) {
      fetchApplications(dealerId);
      fetchNotifications(dealerId);
      interval = setInterval(() => {
        fetchNotifications(dealerId);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);



  /* USERS */

  const [users, setUsers] = useState([]);
  const [statusData, setStatusData] = useState([]);

  const statusUsers = [
    "Documents Submitted",
    "Documents Verified",
    "Bank Review",
    "Loan Approved",
    "Rejected",
  ];

  const filteredUsers =
    statusFilter === "All"
      ? statusData
      : statusData.filter(
          (item) =>
            item.status === statusFilter
        );

  /* FLOW */

  const steps = [
    "Documents Submitted",
    "Documents Verified",
    "Sent To Bank",
    "Bank Review",
    "Loan Approved",
    "Amount Disbursed",
  ];




  const reportsData = [
  {
    month: "January",
    values: [45, 70, 58, 95, 120, 85],
  },
  {
    month: "February",
    values: [60, 82, 74, 110, 138, 96],
  },
  {
    month: "March",
    values: [75, 90, 84, 125, 150, 118],
  },
  {
    month: "April",
    values: [55, 76, 66, 104, 132, 92],
  },
  {
    month: "May",
    values: [82, 105, 96, 138, 170, 130],
  },
];


const weekLabels = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
];




  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      {/* SIDEBAR */}

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        handleLogout={handleLogout}
      />

      {/* MAIN */}

      <div className="flex-1 overflow-y-auto">
        {/* TOPBAR */}

        <div className="bg-white px-8 py-6 shadow-sm flex items-center justify-between">

  {/* LEFT SIDE */}

  <div>
    <h1 className="text-3xl font-bold text-[#0B2A4A]">
      Dealer Panel
    </h1>

    <p className="text-sm text-gray-500 mt-1">
      Manage customers, documents & bank approvals
    </p>
  </div>

  {/* RIGHT SIDE — DEALER CODE */}

  <div
    className="bg-gradient-to-r from-[#0B2A4A] to-[#123E68]
    text-white px-6 py-4 rounded-2xl
    shadow-lg min-w-[220px]"
  >

    <p className="text-xs uppercase tracking-wider text-gray-300">
      Dealer Code
    </p>

    <div className="flex items-center justify-between mt-2">

      <h2 className="text-2xl font-bold tracking-widest">
        {profileData.dealerCode}
      </h2>

      <button
        onClick={() => {
          navigator.clipboard.writeText(profileData.dealerCode);
          alert("Dealer Code Copied");
        }}
        className="bg-white/20 hover:bg-white/30
        px-3 py-1 rounded-lg text-sm transition"
      >
        Copy
      </button>

    </div>

  </div>

</div>

        {/* CONTENT */}

        <div className="p-8 space-y-8">
          {/* DASHBOARD */}

          {activeMenu === "Dashboard" && (
            <>
              {/* STATS */}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Total Applications
                  </p>

                  <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
                    {users.length}
                  </h2>

                  <p className="text-xs text-green-600 mt-2">
                    Active applications
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Pending Applications
                  </p>

                  <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
                    {statusData.filter(app => app.rawStatus === "DOCUMENTS_SUBMITTED" || app.rawStatus === "PENDING").length}
                  </h2>

                  <p className="text-xs text-orange-500 mt-2">
                    Submitted for approval
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Approved Loans
                  </p>

                  <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
                    {statusData.filter(app => app.rawStatus === "APPROVED").length}
                  </h2>

                  <p className="text-xs text-green-600 mt-2">
                    Loans approved
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Loan Value
                  </p>

                  <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
                    {(() => {
                      const totalVal = statusData.reduce((sum, app) => sum + (app.loanAmount || 0), 0);
                      if (totalVal >= 10000000) {
                        return `₹${(totalVal / 10000000).toFixed(2)}Cr`;
                      } else if (totalVal >= 100000) {
                        return `₹${(totalVal / 100000).toFixed(2)}L`;
                      }
                      return `₹${totalVal.toLocaleString('en-IN')}`;
                    })()}
                  </h2>

                  <p className="text-xs text-blue-500 mt-2">
                    Total processed amount
                  </p>
                </div>
              </div>

              {/* QUICK ACTIONS */}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

  {/* ADD CUSTOMER CARD */}

  <div
    onClick={() => { resetNewUserForm(); setShowAddCustomerModal(true); }}
    className="group relative overflow-hidden
    bg-gradient-to-r from-[#0B2A4A] to-[#123E68]
    rounded-3xl p-6 cursor-pointer
    transition-all duration-300
    hover:scale-[1.02] hover:shadow-2xl"
  >

    {/* WHITE OVERLAY */}

    <div
      className="absolute inset-0
      bg-white
      opacity-0
      group-hover:opacity-100
      transition-all duration-300"
    ></div>

    {/* CONTENT */}

    <div className="relative z-10">

      <h2
        className="text-xl font-bold text-white
        group-hover:text-[#0B2A4A]
        transition-colors duration-300"
      >
        Add New Customer
      </h2>

      <p
        className="text-sm text-gray-300 mt-2 leading-6
        group-hover:text-[#0B2A4A]
        transition-colors duration-300"
      >
        Create loan applications and upload customer documents
      </p>

    </div>

  </div>

  {/* DEALER PERFORMANCE */}

  <div
    onClick={() =>
      setActiveMenu("Reports")
    }
    className="group relative overflow-hidden
    bg-gradient-to-r from-[#0B2A4A] to-[#123E68]
    rounded-3xl p-6 cursor-pointer
    transition-all duration-300
    hover:scale-[1.02] hover:shadow-2xl"
  >

    {/* WHITE OVERLAY */}

    <div
      className="absolute inset-0
      bg-white
      opacity-0
      group-hover:opacity-100
      transition-all duration-300"
    ></div>

    {/* CONTENT */}

    <div className="relative z-10">

      <h2
        className="text-xl font-bold text-white
        group-hover:text-[#0B2A4A]
        transition-colors duration-300"
      >
        Dealer Performance
      </h2>

      <p
        className="text-sm text-gray-300 mt-2 leading-6
        group-hover:text-[#0B2A4A]
        transition-colors duration-300"
      >
        Track monthly approvals & customer growth
      </p>

    </div>

  </div>

</div>

{/* ADD CUSTOMER MODAL */}

{showAddCustomerModal && (

  <div
    className="fixed inset-0 z-50
    bg-black/50 backdrop-blur-sm
    flex items-center justify-center p-4"
  >

    {/* MODAL */}

    <div
      className="bg-white w-full max-w-6xl
      max-h-[95vh] overflow-y-auto
      rounded-[32px] shadow-2xl
      animate-in fade-in zoom-in duration-200"
    >

      {/* HEADER */}

      <div
        className="sticky top-0 z-20
        bg-white border-b border-gray-100
        px-8 py-5 flex items-center justify-between"
      >

        <div>

          <h2 className="text-2xl font-bold text-[#0B2A4A]">
            Add New Customer
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Upload customer loan documents
          </p>

        </div>

        <button
          onClick={() =>
            setShowAddCustomerModal(false)
          }
          className="w-11 h-11 rounded-full
          bg-[#F4F6F9]
          hover:bg-gray-200
          flex items-center justify-center
          text-lg font-bold"
        >
          ✕
        </button>

      </div>

      {/* BODY */}

      <div className="p-8">

  {/* STEPS */}

  <div className="flex items-center gap-3 mb-8 overflow-x-auto">

    {[
      "Personal",
      "KYC",
      "Residential",
      "Income",
      "Vehicle",
      "Verify",
    ].map((step, index) => (

      <div
        key={index}
        className={`px-5 py-2 rounded-2xl
        text-sm font-semibold whitespace-nowrap
        transition-all duration-200

        ${
          dealerCurrentStep === index + 1
            ? "bg-[#27D3C3] text-[#0B2A4A] shadow-lg scale-105"
            : "bg-[#F4F6F9] text-gray-500"
        }`}
      >
        {index + 1}. {step}
      </div>

    ))}

  </div>

  {/* STEP 1 — PERSONAL */}

  {dealerCurrentStep === 1 && (

    <div>

      <div className="mb-8">

        <h2 className="text-2xl font-bold text-[#0B2A4A]">
          Personal Information
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Enter customer personal details
        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Full Name <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            placeholder="Enter Full Name"
            value={dealerUserData?.name || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                name: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Mobile Number <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            maxLength={10}
            placeholder="Enter Mobile Number"
            value={dealerUserData?.mobile || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                mobile: e.target.value.replace(/\D/g, ""),
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>

          <input
            type="email"
            placeholder="Enter Email"
            value={dealerUserData?.email || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                email: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Loan Amount <span className="text-red-500">*</span>
          </label>

          <input
            type="number"
            placeholder="Enter Loan Amount"
            value={dealerUserData?.loanAmount || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                loanAmount: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Date Of Birth
          </label>

          <input
            type="date"
            value={dealerUserData?.dob || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                dob: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            City <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            placeholder="Enter City"
            value={dealerUserData?.city || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                city: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            State <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            placeholder="Enter State"
            value={dealerUserData?.state || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                state: e.target.value,
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Pincode <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            maxLength={6}
            placeholder="Enter Pincode"
            value={dealerUserData?.pincode || ""}
            onChange={(e) =>
              setDealerUserData({
                ...dealerUserData,
                pincode: e.target.value.replace(/\D/g, ""),
              })
            }
            className="w-full h-14 rounded-2xl border border-gray-200
            bg-[#F8FAFC] px-5 outline-none"
          />

        </div>

        

      </div>

    </div>

  )}

  {/* STEP 2 — KYC */}

  {dealerCurrentStep === 2 && (

    <div>

      <h2 className="text-2xl font-bold text-[#0B2A4A]">
        KYC Documents
      </h2>

      <p className="text-sm text-gray-500 mt-2 mb-8">
        Upload PAN & Aadhaar documents
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* PAN */}

        <div className="bg-[#F8FAFC] border border-gray-200 rounded-3xl p-5">

          <label className="font-semibold text-[#0B2A4A] block mb-3">
            Upload PAN Card
          </label>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setDealerUserData({
                  ...dealerUserData,
                  panFile: file,
                });
                handleDocumentUpload(file, "PAN");
              }
            }}
            className="mt-4 w-full text-sm
            file:mr-4 file:px-4 file:py-2
            file:rounded-xl file:border-0
            file:bg-[#0B2A4A]
            file:text-white"
          />

        </div>

        {/* AADHAAR */}

        <div className="bg-[#F8FAFC] border border-gray-200 rounded-3xl p-5">

          <label className="font-semibold text-[#0B2A4A] block mb-3">
            Upload Aadhaar Card
          </label>

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setDealerUserData({
                  ...dealerUserData,
                  aadhaarFile: file,
                });
                handleDocumentUpload(file, "AADHAAR");
              }
            }}
            className="mt-4 w-full text-sm
            file:mr-4 file:px-4 file:py-2
            file:rounded-xl file:border-0
            file:bg-[#0B2A4A]
            file:text-white"
          />

        </div>

      </div>

    </div>

  )}

  {/* STEP 3 — RESIDENTIAL */}

  {dealerCurrentStep === 3 && (

    <div>

      <h2 className="text-2xl font-bold text-[#0B2A4A]">
        Residential Proof
      </h2>

      <p className="text-sm text-gray-500 mt-2 mb-8">
        Upload Light Bill or Rental Agreement
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {[
          {
            title: "Light Bill",
            key: "lightBill",
          },
          {
            title: "Rental Agreement",
            key: "rentAgreement",
          },
        ].map((doc, index) => (

          <div
            key={index}
            className="bg-[#F8FAFC]
            border border-gray-200 rounded-3xl p-5"
          >

            <h3 className="font-semibold text-[#0B2A4A]">
              {doc.title}
            </h3>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setDealerUserData({
                    ...dealerUserData,
                    [doc.key]: file,
                  });
                  const docType = doc.key === "lightBill" ? "LIGHT_BILL" : "RENTAL_AGREEMENT";
                  handleDocumentUpload(file, docType);
                }
              }}
              className="mt-5 w-full text-sm
              file:mr-4 file:px-4 file:py-2
              file:rounded-xl file:border-0
              file:bg-[#0B2A4A]
              file:text-white"
            />

          </div>

        ))}

      </div>

    </div>

  )}

  {/* STEP 4 — INCOME */}

  {dealerCurrentStep === 4 && (

    <div>

      <h2 className="text-2xl font-bold text-[#0B2A4A]">
        Income Proof
      </h2>

      <p className="text-sm text-gray-500 mt-2 mb-8">
        Upload income verification documents
      </p>

      <select
        value={dealerUserData?.employmentType || ""}
        onChange={(e) =>
          setDealerUserData({
            ...dealerUserData,
            employmentType: e.target.value,
          })
        }
        className="w-full md:w-1/2 h-14 rounded-2xl border border-gray-200
        bg-[#F8FAFC] px-5 mb-8"
      >

        <option value="">
          Select Employment Type
        </option>

        <option value="Salaried">
          Salaried
        </option>

        <option value="Self Employed">
          Self Employed
        </option>

      </select>

      {/* SALARIED */}

      {dealerUserData?.employmentType === "Salaried" && (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {[
            { label: "Appointment Letter", type: "APPOINTMENT_LETTER" },
            { label: "3 Months Salary Slips", type: "SALARY_SLIP" },
            { label: "6 Months Bank Statement", type: "BANK_STATEMENT" },
          ].map((doc, index) => (

            <div
              key={index}
              className="bg-[#F8FAFC]
              border border-gray-200 rounded-3xl p-5"
            >

              <h3 className="font-semibold text-[#0B2A4A]">
                {doc.label}
              </h3>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleDocumentUpload(file, doc.type);
                  }
                }}
                className="mt-5 w-full text-sm
                file:mr-4 file:px-4 file:py-2
                file:rounded-xl file:border-0
                file:bg-[#0B2A4A]
                file:text-white"
              />

            </div>

          ))}

        </div>

      )}

      {/* SELF EMPLOYED */}

      {dealerUserData?.employmentType === "Self Employed" && (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {[
            { label: "ITR Copy", type: "ITR_RETURN" },
            { label: "6 Months Bank Statement", type: "BANK_STATEMENT" },
          ].map((doc, index) => (

            <div
              key={index}
              className="bg-[#F8FAFC]
              border border-gray-200 rounded-3xl p-5"
            >

              <h3 className="font-semibold text-[#0B2A4A]">
                {doc.label}
              </h3>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleDocumentUpload(file, doc.type);
                  }
                }}
                className="mt-5 w-full text-sm
                file:mr-4 file:px-4 file:py-2
                file:rounded-xl file:border-0
                file:bg-[#0B2A4A]
                file:text-white"
              />

            </div>

          ))}

        </div>

      )}

    </div>

  )}

  {/* STEP 5 — VEHICLE */}

  {dealerCurrentStep === 5 && (

    <div>

      <h2 className="text-2xl font-bold text-[#0B2A4A]">
        Vehicle Documents
      </h2>

      <p className="text-sm text-gray-500 mt-2 mb-8">
        Upload vehicle verification documents
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {[
          { label: "RC Copy", type: "RC" },
          { label: "Insurance Copy", type: "INSURANCE" },
          { label: "Front Car Image", type: "CAR_FRONT_SIDE_PHOTO" },
          { label: "Rear Car Image", type: "CAR_BACK_SIDE_PHOTO" },
          { label: "Chassis Number Image", type: "CHASSIS_NUMBER" },
          { label: "Odometer Image (KM Visible)", type: "ODOMETER_READING" },
        ].map((doc, index) => (

          <div
            key={index}
            className="bg-[#FFF7F7]
            border border-red-200 rounded-3xl p-5"
          >

            <h3 className="font-semibold text-[#0B2A4A]">
              {doc.label}
            </h3>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleDocumentUpload(file, doc.type);
                }
              }}
              className="mt-5 w-full text-sm
              file:mr-4 file:px-4 file:py-2
              file:rounded-xl file:border-0
              file:bg-[#0B2A4A]
              file:text-white"
            />

          </div>

        ))}

      </div>

    </div>

  )}

  {/* STEP 6 — VERIFY */}

  {dealerCurrentStep === 6 && (

    <div>

      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-[#EAFBF8] flex items-center justify-center text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-[#0B2A4A] mt-6">{isEditMode ? 'Edit Customer Details' : 'Verify Customer Details'}</h2>
        <p className="text-gray-500 mt-3">{isEditMode ? 'Update details and re-upload documents, then click Update' : 'Please verify all details before final submission'}</p>
      </div>

      {/* CUSTOMER INFO */}
      <div className="bg-[#F8FAFC] rounded-3xl p-6 mb-6 space-y-3">
        <div><span className="font-semibold text-[#0B2A4A]">Name:</span> {dealerUserData?.name}</div>
        <div><span className="font-semibold text-[#0B2A4A]">Mobile:</span> {dealerUserData?.mobile}</div>
        <div><span className="font-semibold text-[#0B2A4A]">Email:</span> {dealerUserData?.email}</div>
        <div><span className="font-semibold text-[#0B2A4A]">Employment:</span> {dealerUserData?.employmentType}</div>
        
      </div>

      {/* UPLOADED DOCUMENTS */}
      <h3 className="text-lg font-bold text-[#0B2A4A] mb-4">Uploaded Documents</h3>
      {uploadedDocuments.length === 0 ? (
        <p className="text-sm text-gray-400">No documents uploaded.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {uploadedDocuments.map((doc, index) => {
            const type = doc.documentType || doc.type || "";
            const label = docNames[type] || type.replace(/_/g, " ");
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Document</p>
                    <p className="font-semibold text-[#0B2A4A]">{label}</p>
                  </div>
                  <button
                    onClick={() => openPreview(doc)}
                    className="bg-[#0B2A4A] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#081f36] transition"
                  >
                    View {label}
                  </button>
                </div>
                {/* REUPLOAD */}
                <div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    id={`reupload-${doc.documentId || index}`}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) await handleReuploadDocument(doc.documentId, type, file);
                    }}
                  />
                  <button
                    onClick={() => document.getElementById(`reupload-${doc.documentId || index}`).click()}
                    disabled={documentLoading}
                    className="w-full bg-[#F4F6F9] hover:bg-[#EAFBF8] text-[#0B2A4A] py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    📤 Re-upload {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>

  )}

  {/* FOOTER */}

  <div className="flex items-center justify-between mt-10">

    <button
      disabled={dealerCurrentStep === 1}
      onClick={() =>
        setDealerCurrentStep((prev) => prev - 1)
      }
      className={`px-6 py-3 rounded-2xl font-semibold

      ${
        dealerCurrentStep === 1
          ? "bg-gray-200 text-gray-400"
          : "bg-[#F4F6F9]"
      }`}
    >
      ← Previous
    </button>

    {dealerCurrentStep !== 6 ? (

      <button
        onClick={handleNext}
        className="bg-[#0B2A4A]
        hover:bg-[#081f36]
        text-white px-6 py-3
        rounded-2xl font-semibold"
      >
        Next →
      </button>

    ) : (

      <button
        onClick={handleFinalSubmit}
        className="bg-[#27D3C3]
        hover:bg-[#1fb5a7]
        text-[#0B2A4A]
        px-8 py-3 rounded-2xl
        font-bold"
      >
        {isEditMode ? 'Update Details' : 'Submit Documents'}
      </button>

    )}

  </div>

</div>

    </div>

  </div>

)}

              {/* LIVE + RECENT */}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LIVE */}

                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#0B2A4A]">
                        Live Quick View
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Real-time traffic
                      </p>
                    </div>

                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  </div>

                  <div className="space-y-4">
                    {activityFeed.length === 0 ? (
                      <p className="text-sm text-gray-400">No updates yet.</p>
                    ) : (
                      activityFeed.map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl p-4 border ${
                            item.type === "rejected"
                              ? "bg-red-50 border-red-100"
                              : item.type === "remark"
                              ? "bg-amber-50 border-amber-100"
                              : item.type === "approved"
                              ? "bg-green-50 border-green-100"
                              : "bg-[#F8FAFC] border-gray-100"
                          }`}
                        >
                          <p className={`text-sm font-medium ${
                            item.type === "rejected" ? "text-red-700"
                            : item.type === "remark" ? "text-amber-700"
                            : item.type === "approved" ? "text-green-700"
                            : "text-[#0B2A4A]"
                          }`}>
                            {item.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{item.time}</p>

                          {/* REUPLOAD BUTTON for rejected or remarked docs */}
                          {(item.type === "rejected" || item.type === "remark") && item.documentId && (
                            <div className="mt-3">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                id={`live-reupload-${item.documentId}`}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) await handleReuploadDocument(item.documentId, item.documentType, file, item.userId);
                                }}
                              />
                              <button
                                onClick={() => document.getElementById(`live-reupload-${item.documentId}`).click()}
                                disabled={documentLoading}
                                className={`w-full py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
                                  item.type === "rejected"
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "bg-amber-500 hover:bg-amber-600 text-white"
                                }`}
                              >
                                📤 Re-upload {item.label}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* RECENT */}

                <div className="bg-white rounded-3xl p-6 shadow-sm xl:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#0B2A4A]">
                        Recent Applications
                      </h2>

                      <p className="text-sm text-gray-500 mt-1">
                        Customers linked to
                        your dealer code
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-4 text-left text-sm text-gray-500">
                            Customer
                          </th>

                          <th className="pb-4 text-left text-sm text-gray-500">
                            Loan
                          </th>

                          <th className="pb-4 text-left text-sm text-gray-500">
                            Status
                          </th>

                          <th className="pb-4 text-left text-sm text-gray-500">
                            Type
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-b border-gray-50"
                          >
                            <td className="py-5">
                              <h3 className="font-semibold text-[#0B2A4A]">
                                {user.name}
                              </h3>

                              <p className="text-sm text-gray-500 mt-1">
                                {user.mobile}
                              </p>
                            </td>

                            <td className="py-5 font-semibold text-[#0B2A4A]">
                              {user.loan}
                            </td>

                            <td className="py-5">
                              <span
                                className="px-4 py-2 rounded-full text-xs font-bold bg-[#EAFBF8] text-[#0B2A4A]"
                              >
                                {user.status}
                              </span>
                            </td>

                            <td className="py-5 text-sm text-gray-600">
                              {user.type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* USERS */}

          {activeMenu === "User" && (
  <div className="space-y-6">
    {/* HEADER */}

    <div
      className="bg-white rounded-3xl p-6
      shadow-sm flex items-center justify-between"
    >
      <div>
        <h2 className="text-2xl font-bold text-[#0B2A4A]">
          User Management
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Add customers and manage
          documents
        </p>
      </div>

      <button
  type="button"
  onClick={() => {
    resetNewUserForm();

    setDealerCurrentStep(1);
    setUploadedDocuments([]);
    setIsEditMode(false);

    setDealerUserData({
      name: "",
      mobile: "",
      email: "",
      loanAmount: "",
      dob: "",
      city: "",
      state: "",
      pincode: "",
      employmentType: "",
    });

    setActiveMenu("Dashboard"); // switch to Dashboard

    setTimeout(() => {
      setShowAddCustomerModal(true);
    }, 0);
  }}
  className="bg-[#27D3C3] hover:bg-[#1fb5a7] text-[#0B2A4A] px-6 py-3 rounded-2xl font-bold transition-all duration-200 hover:scale-[1.02]"
>
  + Add User
</button>
    </div>

    {/* USER LIST */}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {users.map((user) => (
    <div
      key={user.id}
      className="bg-white rounded-3xl p-6 shadow-sm"
    >
      {/* TOP SECTION */}

      <div className="flex items-start justify-between">
        {/* USER INFO */}

        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#0B2A4A]">
                {user.name}
              </h2>

              {/* REMARKS BUTTON ONLY FOR DEALER ADDED */}

              {user.type === "Dealer Added" && (
                <button
                  onClick={() => {
                    setSelectedUser(user);

                    setSelectedRemark(
                      user.remark ||
                        "No remarks added by admin."
                    );

                    setShowRemarksModal(true);
                  }}
                  className="relative w-9 h-9 rounded-full
                  bg-[#F4F6F9]
                  hover:bg-[#EAFBF8]
                  border border-gray-200
                  flex items-center justify-center
                  transition"
                >
                  💬

                  {/* RED DOT */}

                  {user.hasRemark && (
                    <span
                      className="absolute top-1 right-1
                      w-3 h-3 rounded-full
                      bg-red-500 border-2 border-white
                      animate-pulse"
                    ></span>
                  )}
                </button>
              )}
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {user.mobile}
            </p>
          </div>
        </div>

        {/* STATUS */}

        <span
          className="bg-[#EAFBF8]
          text-[#0B2A4A]
          px-4 py-2 rounded-full
          text-xs font-bold"
        >
          {user.status}
        </span>
      </div>

      {/* INFO CARDS */}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="bg-[#F8FAFC] rounded-2xl p-4">
          <p className="text-xs text-gray-500">
            Loan Amount
          </p>

          <h3 className="font-bold text-[#0B2A4A] mt-2">
            {user.loan}
          </h3>
        </div>

        <div className="bg-[#F8FAFC] rounded-2xl p-4">
          <p className="text-xs text-gray-500">
            User Type
          </p>

          <h3 className="font-bold text-[#0B2A4A] mt-2">
            {user.type}
          </h3>
        </div>
      </div>

      {/* ACTION BUTTONS */}

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={() => {
            setSelectedUser(user);
            setShowStatusModal(true);
          }}
          className="bg-[#0B2A4A]
          text-white px-5 py-3
          rounded-2xl text-sm font-semibold"
        >
          View Status
        </button>

        <button
          onClick={() => {
            setSelectedUser(user);
            setShowDetailsModal(true);
          }}
          className="bg-[#EAFBF8]
          text-[#0B2A4A]
          px-5 py-3 rounded-2xl
          text-sm font-semibold"
        >
          View Details
        </button>

        {user.editable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEditUser(user);
            }}
            className="bg-yellow-100
            text-yellow-700 px-5 py-3
            rounded-2xl text-sm font-semibold"
          >
            Edit User
          </button>
        )}
      </div>
    </div>
  ))}
</div>

    {/* REMARKS MODAL */}

    {/* REMARKS MODAL */}

{showRemarksModal && selectedUser && (
  <div
    className="fixed inset-0 bg-black/40
    flex items-center justify-center z-50"
  >
    <div className="bg-white rounded-3xl p-8 w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2A4A]">
            Admin Remarks
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Read-only review updates
          </p>
        </div>

        <button
          onClick={() =>
            setShowRemarksModal(false)
          }
          className="text-2xl"
        >
          ×
        </button>
      </div>

      <div
        className="bg-[#F8FAFC]
        border border-gray-200
        rounded-2xl p-5 min-h-[160px]"
      >
        <p className="text-sm leading-7 text-gray-700">
          {selectedRemark}
        </p>
      </div>

      <div
        className="mt-5 bg-red-50
        border border-red-100
        rounded-2xl p-4"
      >
        <p className="text-xs text-red-600 font-medium">
          Remarks are added by admin and
          cannot be edited by dealer.
        </p>
      </div>
    </div>
  </div>
)}

{showEditUserModal && editingUser && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
    <div className="bg-white rounded-3xl w-full max-w-5xl p-8 max-h-[90vh] overflow-y-auto">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2A4A]">
            Edit User Application
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            View submitted details and uploaded documents
          </p>
        </div>

        <button
          onClick={() => setShowEditUserModal(false)}
          className="text-3xl text-gray-500"
        >
          ×
        </button>
      </div>

      {/* PERSONAL DETAILS */}

      <div className="bg-[#F8FAFC] rounded-3xl p-6 mb-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-lg text-[#0B2A4A]">
            Personal Details
          </h3>

          <button
            onClick={() =>
              setDetailsEditMode(!detailsEditMode)
            }
            className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl"
          >
            ✏️ Edit Details
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="text-xs text-gray-500">
              Full Name
            </label>

            <input
              value={editingUser.name || ""}
              disabled={!detailsEditMode}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  name: e.target.value,
                })
              }
              className="w-full mt-1 border rounded-xl p-3"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Mobile Number
            </label>

            <input
              value={editingUser.mobile || ""}
              disabled={!detailsEditMode}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  mobile: e.target.value,
                })
              }
              className="w-full mt-1 border rounded-xl p-3"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Email
            </label>

            <input
              value={editingUser.email || ""}
              disabled={!detailsEditMode}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  email: e.target.value,
                })
              }
              className="w-full mt-1 border rounded-xl p-3"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Loan Amount
            </label>

            <input
              value={editingUser.loan || ""}
              disabled={!detailsEditMode}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  loan: e.target.value,
                })
              }
              className="w-full mt-1 border rounded-xl p-3"
            />
          </div>

        </div>
      </div>

      {/* DOCUMENTS */}

      <div className="bg-[#F8FAFC] rounded-3xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-lg text-[#0B2A4A]">
            Uploaded Documents
          </h3>

          <button
            onClick={() =>
              setDocumentsEditMode(!documentsEditMode)
            }
            className="bg-green-100 text-green-700 px-4 py-2 rounded-xl"
          >
            🔄 Re-upload Documents
          </button>
        </div>

        <div className="space-y-5">

          <div className="flex justify-between items-center border rounded-2xl p-4 bg-white">
            <div>
              <h4 className="font-semibold">
                Aadhaar Card
              </h4>
            </div>

            {documentsEditMode ? (
              <input type="file" />
            ) : (
              <button className="text-blue-600 font-medium">
                View
              </button>
            )}
          </div>

          <div className="flex justify-between items-center border rounded-2xl p-4 bg-white">
            <div>
              <h4 className="font-semibold">
                PAN Card
              </h4>
            </div>

            {documentsEditMode ? (
              <input type="file" />
            ) : (
              <button className="text-blue-600 font-medium">
                View
              </button>
            )}
          </div>

          <div className="flex justify-between items-center border rounded-2xl p-4 bg-white">
            <div>
              <h4 className="font-semibold">
                Bank Statement
              </h4>
            </div>

            {documentsEditMode ? (
              <input type="file" />
            ) : (
              <button className="text-blue-600 font-medium">
                View
              </button>
            )}
          </div>

        </div>
      </div>

      {/* FOOTER */}

      <div className="flex justify-end gap-4 mt-8">
        <button
          onClick={() =>
            setShowEditUserModal(false)
          }
          className="px-6 py-3 rounded-2xl border"
        >
          Cancel
        </button>

        <button
          onClick={handleSaveEditUser}
          className="bg-[#27D3C3] hover:bg-[#1fb5a7] text-[#0B2A4A] px-8 py-3 rounded-2xl font-bold"
        >
          Save Changes
        </button>
      </div>

    </div>
  </div>
)}
  </div>
)}

          {/* STATUS */}

          {activeMenu === "Status" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0B2A4A]">
                      Application Status
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      Track customer
                      applications
                    </p>
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value
                      )
                    }
                    className="border border-gray-200 rounded-2xl px-5 py-3"
                  >
                    <option value="All">
                      All
                    </option>

                    {statusUsers.map(
                      (status, index) => (
                        <option
                          key={index}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 text-left text-sm text-gray-500">
                        Name
                      </th>

                      <th className="pb-4 text-left text-sm text-gray-500">
                        Mobile
                      </th>

                      <th className="pb-4 text-left text-sm text-gray-500">
                        Current Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map(
                      (user, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-50"
                        >
                          <td className="py-5 font-semibold text-[#0B2A4A]">
                            {user.name}
                          </td>

                          <td className="py-5 text-gray-600">
                            {user.mobile}
                          </td>

                          <td className="py-5">
                            <span
                              className="bg-[#EAFBF8]
                              text-[#0B2A4A]
                              px-4 py-2 rounded-full
                              text-xs font-bold"
                            >
                              {user.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORTS */}

          {/* REPORTS */}

{/* REPORTS */}

{activeMenu === "Reports" && (
  <div className="space-y-6">

    {/* HEADER */}

    <div className="bg-white rounded-3xl p-6 shadow-sm">

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div>

          <h2 className="text-2xl font-bold text-[#0B2A4A]">
            Reports & Analytics
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Monthly dealer performance & growth analytics
          </p>

        </div>

        {/* MONTH SWITCH */}

        <div className="flex items-center gap-3">

          <button
            onClick={() =>
              setActiveMonth((prev) =>
                prev === 0
                  ? reportsData.length - 1
                  : prev - 1
              )
            }
            className="w-11 h-11 rounded-2xl
            bg-[#F4F6F9]
            hover:bg-[#EAFBF8]
            transition"
          >
            ←
          </button>

          <div
            className="bg-[#0B2A4A]
            text-white px-6 py-3
            rounded-2xl text-sm font-semibold"
          >
            {reportsData[activeMonth].month}
          </div>

          <button
            onClick={() =>
              setActiveMonth((prev) =>
                prev === reportsData.length - 1
                  ? 0
                  : prev + 1
              )
            }
            className="w-11 h-11 rounded-2xl
            bg-[#F4F6F9]
            hover:bg-[#EAFBF8]
            transition"
          >
            →
          </button>

        </div>

      </div>

    </div>

    {/* GRAPH */}

    <div className="bg-white rounded-3xl p-8 shadow-sm">

      <div className="flex items-center justify-between mb-8">

        <div>

          <h3 className="text-xl font-bold text-[#0B2A4A]">
            Users Added Trend
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Weekly customer onboarding activity
          </p>

        </div>

        <div
          className="bg-[#EAFBF8]
          px-5 py-3 rounded-2xl"
        >

          <p className="text-xs text-gray-500">
            Monthly Growth
          </p>

          <h3 className="font-bold text-[#0B2A4A] mt-1">
            +18.6%
          </h3>

        </div>

      </div>

      {/* BAR GRAPH */}

      <div className="flex items-end gap-5 h-80">

        {reportsData[activeMonth].values.map(
          (value, index) => (

            <div
              key={index}
              className="flex-1 flex flex-col items-center"
            >

              {/* VALUE */}

              <div className="mb-3 text-sm font-bold text-[#0B2A4A]">
                {value}
              </div>

              {/* BAR */}

              <div
                className="w-full rounded-t-[28px]
                bg-gradient-to-t
                from-[#27D3C3]
                to-[#0B2A4A]
                transition-all duration-700
                hover:scale-105"
                style={{
                  height: `${value * 1.5}px`,
                }}
              ></div>

              {/* LABEL */}

              <p className="text-xs text-gray-500 mt-4">
                {weekLabels[index]}
              </p>

            </div>

          )
        )}

      </div>

    </div>

    {/* REPORT STATS */}

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

      <div className="bg-white rounded-3xl p-6 shadow-sm">

        <p className="text-sm text-gray-500">
          Approval Rate
        </p>

        <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
          82%
        </h2>

        <p className="text-xs text-green-600 mt-2">
          +4.2% increase
        </p>

      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">

        <p className="text-sm text-gray-500">
          Avg Loan Size
        </p>

        <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
          ₹7.2L
        </h2>

        <p className="text-xs text-blue-500 mt-2">
          Higher than last month
        </p>

      </div>

      

      <div className="bg-white rounded-3xl p-6 shadow-sm">

        <p className="text-sm text-gray-500">
          Revenue Generated
        </p>

        <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">
          ₹18.4L
        </h2>

        <p className="text-xs text-orange-500 mt-2">
          Updated from approvals
        </p>

      </div>

    </div>

    

  </div>
)}

{/* SETTINGS */}

{activeMenu === "Settings" && (

  <div className="max-w-4xl mx-auto space-y-6">

    {/* HEADER */}

    <div className="bg-white rounded-3xl p-6 shadow-sm">

      <h2 className="text-2xl font-bold text-[#0B2A4A]">
        Dealer Settings
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Manage dealer profile and security
      </p>

    </div>

    {/* PROFILE CARD */}

    <div className="bg-white rounded-3xl p-8 shadow-sm">

      {/* TOP */}

      <div className="flex items-center gap-5 mb-8">

        <div
          className="w-20 h-20 rounded-full
          bg-[#EAFBF8]
          flex items-center justify-center
          text-3xl"
        >
          🏢
        </div>

        <div>

          <h3 className="text-2xl font-bold text-[#0B2A4A]">
            {profileData.name}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            {profileData.email}
          </p>

        </div>

      </div>

      {/* FORM */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* NAME */}

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">
            Dealer Name
          </label>

          <input
            type="text"
            value={profileData.name}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                name: e.target.value,
              })
            }
            className="w-full bg-[#F8FAFC]
            border border-gray-200
            rounded-2xl px-5 py-4
            outline-none"
          />

        </div>

        {/* PHONE */}

        <div>

          <div className="flex items-center justify-between mb-2">

            <label className="text-sm font-semibold text-[#0B2A4A]">
              Phone Number
            </label>

            <button
              onClick={() =>
                setShowPhoneModal(true)
              }
              className="w-8 h-8 rounded-full
              bg-[#EAFBF8]
              flex items-center justify-center"
            >
              ✏️
            </button>

          </div>

          <input
            type="text"
            value={profileData.phone}
            readOnly
            className="w-full bg-[#F8FAFC]
            border border-gray-200
            rounded-2xl px-5 py-4"
          />

        </div>

        {/* EMAIL */}

        <div className="md:col-span-2">

          <div className="flex items-center justify-between mb-2">

            <label className="text-sm font-semibold text-[#0B2A4A]">
              Email Address
            </label>

            <button
              onClick={() =>
                setShowEmailModal(true)
              }
              className="w-8 h-8 rounded-full
              bg-[#EAFBF8]
              flex items-center justify-center"
            >
              ✏️
            </button>

          </div>

          <input
            type="email"
            value={profileData.email}
            readOnly
            className="w-full bg-[#F8FAFC]
            border border-gray-200
            rounded-2xl px-5 py-4"
          />

        </div>

      </div>

      {/* BUTTONS */}

      <div className="flex gap-4 mt-8">

        <button
          onClick={handleSaveProfile}
          className="bg-[#0B2A4A]
          text-white px-6 py-3
          rounded-2xl font-semibold"
        >
          Save Changes
        </button>

        <button
          onClick={() =>
            setShowPasswordForm(
              !showPasswordForm
            )
          }
          className="bg-[#EAFBF8]
          text-[#0B2A4A]
          px-6 py-3 rounded-2xl
          font-semibold"
        >
          Update Password
        </button>

      </div>

      {/* PASSWORD FORM */}

      {showPasswordForm && (

        <div className="mt-8 border-t pt-8">

          <h3 className="text-lg font-bold text-[#0B2A4A] mb-5">
            Change Password
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            <input
              type="password"
              placeholder="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="bg-[#F8FAFC]
              border border-gray-200
              rounded-2xl px-5 py-4 outline-none"
            />

            <input
              type="password"
              placeholder="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="bg-[#F8FAFC]
              border border-gray-200
              rounded-2xl px-5 py-4 outline-none"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="bg-[#F8FAFC]
              border border-gray-200
              rounded-2xl px-5 py-4 outline-none"
            />

          </div>

          <button
            onClick={handleSavePassword}
            className="mt-5 bg-[#27D3C3]
            text-[#0B2A4A]
            px-6 py-3 rounded-2xl
            font-bold"
          >
            Save Password
          </button>

        </div>

      )}

    </div>

  </div>

)}
        </div>
      </div>

      {/* STATUS MODAL */}

      {showStatusModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/40
          flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#0B2A4A]">
                Loan Journey for {selectedUser.name}
              </h2>

              <button
                onClick={() =>
                  setShowStatusModal(false)
                }
                className="text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              {steps.map((step, index) => {
                const statusOrder = [
                  "PENDING",
                  "DOCUMENTS_SUBMITTED",
                  "DOCUMENTS_VERIFIED",
                  "SENT_TO_BANK",
                  "BANK_REVIEW",
                  "APPROVED"
                ];
                
                const stepStatusMapping = {
                  "Documents Submitted": "DOCUMENTS_SUBMITTED",
                  "Documents Verified": "DOCUMENTS_VERIFIED",
                  "Sent To Bank": "SENT_TO_BANK",
                  "Bank Review": "BANK_REVIEW",
                  "Loan Approved": "APPROVED",
                  "Amount Disbursed": "APPROVED"
                };

                const requiredStatus = stepStatusMapping[step];
                const appStatus = selectedUser.rawStatus;
                const appStatusIndex = statusOrder.indexOf(appStatus);
                const requiredStatusIndex = statusOrder.indexOf(requiredStatus);

                let icon = index + 1;
                let bgClass = "bg-gray-100 text-gray-400";
                let desc = "Pending";

                if (appStatus === "REJECTED") {
                  if (index === 0) {
                    icon = "✓";
                    bgClass = "bg-[#27D3C3] text-[#0B2A4A]";
                    desc = "Completed";
                  } else {
                    icon = "✕";
                    bgClass = "bg-red-100 text-red-500";
                    desc = "Rejected/Stopped";
                  }
                } else if (appStatusIndex >= requiredStatusIndex) {
                  icon = "✓";
                  bgClass = "bg-[#27D3C3] text-[#0B2A4A]";
                  desc = "Process completed";
                } else if (appStatusIndex + 1 === requiredStatusIndex) {
                  icon = "●";
                  bgClass = "bg-blue-100 text-blue-600 animate-pulse";
                  desc = "In progress";
                }

                return (
                  <div
                    key={index}
                    className="flex items-center gap-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-full
                      flex items-center justify-center
                      font-bold ${bgClass}`}
                    >
                      {icon}
                    </div>

                    <div>
                      <h3 className="font-bold text-[#0B2A4A]">
                        {step}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}

      {showDetailsModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/40
          flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#0B2A4A]">
                User Documents
              </h2>

              <button
                onClick={() =>
                  setShowDetailsModal(false)
                }
                className="text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {selectedUser.documents.map(
                (doc, index) => (
                  <div
                    key={index}
                    className="bg-[#F8FAFC]
                    rounded-2xl p-4
                    flex items-center justify-between"
                  >
                    <h3 className="font-semibold text-[#0B2A4A]">
                      {doc}
                    </h3>

                    <span
                      className="bg-green-100
                      text-green-700 px-4 py-2
                      rounded-full text-xs font-bold"
                    >
                      Submitted
                    </span>
                  </div>
                )
              )}
            </div>

            {!selectedUser.editable && (
              <div
                className="mt-6 bg-yellow-50
                border border-yellow-200
                rounded-2xl p-4"
              >
                <p className="text-sm text-yellow-700">
                  This user registered using
                  your dealer code. Actual
                  document files cannot be
                  viewed or edited.
                </p>
              </div>
            )}
          </div>
        </div>

        
      )}

      {/* PHONE UPDATE MODAL */}

{showPhoneModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-8 w-full max-w-md relative">
      <button onClick={() => setShowPhoneModal(false)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#F4F6F9] hover:bg-red-100 text-[#0B2A4A] hover:text-red-600 text-xl font-bold flex items-center justify-center transition">×</button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0B2A4A]">Update Phone Number</h2>
        <p className="text-sm text-gray-500 mt-1">Enter new phone number</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">Current Phone</label>
          <input type="text" value={profileData.phone} readOnly className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">New Phone</label>
          <input type="text" value={phoneForm.newPhone} onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })} placeholder="Enter new phone number" className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none" />
        </div>
      </div>
      <div className="flex gap-4 mt-8">
        <button onClick={() => { setProfileData({ ...profileData, phone: phoneForm.newPhone }); setPhoneForm({ ...phoneForm, newPhone: "" }); setShowPhoneModal(false); }} className="flex-1 bg-[#0B2A4A] text-white py-3 rounded-2xl font-semibold">Submit</button>
      </div>
    </div>
  </div>
)}

{/* EMAIL UPDATE MODAL */}

{showEmailModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-8 w-full max-w-md relative">
      <button onClick={() => setShowEmailModal(false)} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[#F4F6F9] hover:bg-red-100 text-[#0B2A4A] hover:text-red-600 text-xl font-bold flex items-center justify-center transition">×</button>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0B2A4A]">Update Email Address</h2>
        <p className="text-sm text-gray-500 mt-1">Enter new email address</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">Current Email</label>
          <input type="email" value={profileData.email} readOnly className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">New Email</label>
          <input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} placeholder="Enter new email" className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none" />
        </div>
      </div>
      <div className="flex gap-4 mt-8">
        <button onClick={() => { setProfileData({ ...profileData, email: emailForm.newEmail }); setEmailForm({ ...emailForm, newEmail: "" }); setShowEmailModal(false); }} className="flex-1 bg-[#0B2A4A] text-white py-3 rounded-2xl font-semibold">Submit</button>
      </div>
    </div>
  </div>
)}

{/* DOCUMENT PREVIEW MODAL */}

{showPreviewModal && previewDoc && (
  <div
    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={() => { setShowPreviewModal(false); setPreviewUrl(null); setPreviewDoc(null); }}
  >
    <div
      className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <p className="font-bold text-[#0B2A4A]">
          {docNames[previewDoc.documentType || previewDoc.type] || (previewDoc.documentType || previewDoc.type || "Document").replace(/_/g, " ")}
        </p>
        <button
          onClick={() => { setShowPreviewModal(false); setPreviewUrl(null); setPreviewDoc(null); }}
          className="w-9 h-9 rounded-full bg-[#F4F6F9] hover:bg-red-100 flex items-center justify-center text-lg font-bold transition"
        >
          ✕
        </button>
      </div>
      <div className="p-4 flex items-center justify-center bg-[#F8FAFC] min-h-[300px]">
        {previewUrl ? (
          previewUrl.startsWith("blob:") && previewDoc.fileType?.includes("pdf") ? (
            <iframe src={previewUrl} title="Document Preview" className="w-full h-[400px] rounded-xl border-0" />
          ) : (
            <img src={previewUrl} alt="Document Preview" className="max-w-full max-h-[400px] object-contain rounded-xl" />
          )
        ) : (
          <p className="text-gray-400 text-sm">Loading preview...</p>
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Dashboard;
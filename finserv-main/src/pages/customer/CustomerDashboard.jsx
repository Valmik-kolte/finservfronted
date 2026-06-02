import React, { useState, useEffect, useRef } from "react";



import { useNavigate } from "react-router-dom";



import api from "../../services/api";



import Sidebar from "../../components/customer/Sidebar";



import {

  uploadDocument,

} from "../../services/documentService";



const Dashboard = () => {





/* SETTINGS */



const [showPasswordForm, setShowPasswordForm] =

  useState(false);



const [showPhoneModal, setShowPhoneModal] =

  useState(false);



const [showEmailModal, setShowEmailModal] =

  useState(false);



const storedUser = localStorage.getItem("userData");

const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

const currentUserId = loggedInUser?.id || 1;



const [profileData, setProfileData] =

  useState({

    name: loggedInUser?.name || "Rahul Sharma",

    phone: "9876543210",

    email: loggedInUser?.email || "rahul@gmail.com",

  });



const [phoneForm, setPhoneForm] =

  useState({

    currentPhone: "9876543210",

    newPhone: "",

    otp: "",

  });



const [emailForm, setEmailForm] =

  useState({

    currentEmail: loggedInUser?.email || "rahul@gmail.com",

    newEmail: "",

    otp: "",

  });



const [passwordForm, setPasswordForm] =

  useState({

    currentPassword: "",

    newPassword: "",

    confirmPassword: "",

  });





/* REMARKS MODAL */



const [showRemarksModal, setShowRemarksModal] =

  useState(false);



const [selectedRemark, setSelectedRemark] =

  useState("");



/* ACTION ALERT MODAL */



const [showActionModal, setShowActionModal] = useState(false);



/* USER REMARK */



const [userRemarkData, setUserRemarkData] = useState({

  hasRemark: false,

  remark: "No remarks added by admin.",

});

  const navigate = useNavigate();



  const [sidebarOpen, setSidebarOpen] =

    useState(true);



  const [activeMenu, setActiveMenu] =

    useState("Dashboard");



  /* DOCUMENT STEP */



  const [currentStep, setCurrentStep] =

    useState(1);



const [residentialType, setResidentialType] =

  useState("");



  const [employmentType, setEmploymentType] =

    useState("");



  const [documentsSubmitted, setDocumentsSubmitted] =

    useState(false);

  const isInitializedRef = useRef(false);



  const handleSaveProfile = async () => {

    try {

      const payload = {

        fullName: profileData.name,

        email: profileData.email,

        mobileNumber: profileData.phone,

        registrationType: loggedInUser?.registrationType || "INDIVIDUAL",

        role: "USER"

      };

      await api.put(`/user/update/${currentUserId}`, payload);



      // Sync updated data back to localStorage

      const stored = localStorage.getItem("userData");

      if (stored) {

        const parsed = JSON.parse(stored);

        parsed.name = profileData.name;

        parsed.email = profileData.email;

        localStorage.setItem("userData", JSON.stringify(parsed));

      }

      localStorage.setItem("user_mobile_" + currentUserId, profileData.phone);

      localStorage.setItem("user_mobile_" + profileData.email.toLowerCase().trim(), profileData.phone);



      alert("Profile updated successfully!");

    } catch (err) {

      console.error(err);

      alert(err?.response?.data?.message || "Failed to update profile");

    }

  };



  const handleSavePassword = async () => {

    if (!passwordForm.newPassword) {

      alert("Please enter a new password");

      return;

    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {

      alert("New passwords do not match");

      return;

    }

    try {

      const payload = {

        email: profileData.email,

        newPassword: passwordForm.newPassword

      };

      await api.post("/user/reset-password", payload);

      alert("Password changed successfully!");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      setShowPasswordForm(false);

    } catch (err) {

      console.error(err);

      alert(err?.response?.data?.message || "Failed to change password");

    }

  };



  const handleNextStep = async () => {

    let currentAppId = userData.applicationId;



    if (currentStep === 1 && (!currentAppId || currentAppId === "Pending Initiation")) {

      try {

        // Resolve dealer ID

        let resolvedDealerId = null;

        const codeMap = JSON.parse(localStorage.getItem("dealerCodeMap") || "{}");

        const userDealerCode = userData.dealerCode || profileData.dealerCode || loggedInUser?.dealerCode;

        if (userDealerCode && codeMap[userDealerCode]) {

          resolvedDealerId = codeMap[userDealerCode];

        } else {

          resolvedDealerId = localStorage.getItem("dealerId") || 1;

        }



        // Auto-create loan application first

        const initPayload = {

          fullName: userData.name || profileData.name || loggedInUser?.name,

          email: userData.email || profileData.email || loggedInUser?.email,

          mobileNumber: userData.mobile || profileData.phone || "9876543210",

          loanAmount: typeof userData.loanAmount === "string" 

            ? parseFloat(userData.loanAmount.replace(/[^0-9.]/g, '')) || 0

            : (userData.loanAmount || 0),

          address: userData.address || "Default Address",

          city: userData.city || "Default City",

          state: userData.state || "Default State",

          pincode: userData.pincode || "411014"

        };



        const initRes = await api.post(`/loan-applications/apply-by-dealer/${resolvedDealerId}`, initPayload);

        const savedApp = initRes.data;

        if (savedApp && savedApp.applicationNumber) {

          currentAppId = savedApp.applicationNumber;

          // Sync application number to state

          setUserData((prev) => ({

            ...prev,

            applicationId: savedApp.applicationNumber,

          }));

        } else {

          throw new Error("Failed to get application number");

        }

      } catch (initErr) {

        console.error("Auto-initiation failed, trying fallback to dealer ID 3:", initErr);

        try {

          const initPayload = {

            fullName: userData.name || profileData.name || loggedInUser?.name,

            email: userData.email || profileData.email || loggedInUser?.email,

            mobileNumber: userData.mobile || profileData.phone || "9876543210",

            loanAmount: typeof userData.loanAmount === "string" 

              ? parseFloat(userData.loanAmount.replace(/[^0-9.]/g, '')) || 0

              : (userData.loanAmount || 0),

            address: userData.address || "Default Address",

            city: userData.city || "Default City",

            state: userData.state || "Default State",

            pincode: userData.pincode || "411014"

          };

          const initRes = await api.post(`/loan-applications/apply-by-dealer/3`, initPayload);

          const savedApp = initRes.data;

          if (savedApp && savedApp.applicationNumber) {

            currentAppId = savedApp.applicationNumber;

            setUserData((prev) => ({

              ...prev,

              applicationId: savedApp.applicationNumber,

            }));

          } else {

            throw new Error("Failed to get application number");

          }

        } catch (fallbackErr) {

          alert("No active loan application found and auto-initiation failed. Please ask your dealer to initiate the application.");

          return;

        }

      }

    }



    if (!currentAppId || currentAppId === "Pending Initiation") {

      alert("No active loan application found to update. Please ask your dealer to initiate the application.");

      return;

    }



    try {

      if (currentStep === 1) {

        // Step 1: Save Personal Info

        const payload = {

          fullName: userData.name,

          email: userData.email,

          mobileNumber: userData.mobile,

          address: userData.address || "",

          city: userData.city || "",

          state: userData.state || "",

          pincode: userData.pincode || "",

          loanAmount: typeof userData.loanAmount === "string" 

            ? parseFloat(userData.loanAmount.replace(/[^0-9.]/g, '')) 

            : (userData.loanAmount || 0)

        };

        await api.post(`/loan-applications/personal/${currentAppId}`, payload);

      } else if (currentStep === 2) {

        // Step 2: Save KYC

        const panDoc = uploadedDocuments.find(d => d.documentType === "PAN" || d.type === "PAN");

        const aadhaarDoc = uploadedDocuments.find(d => d.documentType === "AADHAAR" || d.type === "AADHAAR");

        if (!panDoc || !aadhaarDoc) {

          alert("Please upload both PAN Card and Aadhaar Card before proceeding.");

          return;

        }

        const payload = {

          panDocumentId: panDoc.documentId,

          aadhaarFrontDocumentId: aadhaarDoc.documentId,

          aadhaarBackDocumentId: aadhaarDoc.documentId

        };

        await api.post(`/loan-applications/kyc/${currentAppId}`, payload);

      } else if (currentStep === 3) {

        // Step 3: Save Residential Details

        const lightBillDoc = uploadedDocuments.find(d => d.documentType === "LIGHT_BILL" || d.type === "LIGHT_BILL");

        const rentalDoc = uploadedDocuments.find(d => d.documentType === "RENTAL_AGREEMENT" || d.type === "RENTAL_AGREEMENT");

        const docId = lightBillDoc?.documentId || rentalDoc?.documentId;

        if (!docId) {

          alert("Please upload at least one residential proof (Light Bill or Rent Agreement).");

          return;

        }

        const payload = {

          residentialProofDocumentId: docId

        };

        await api.post(`/loan-applications/residential/${currentAppId}`, payload);

      } else if (currentStep === 4) {

        // Step 4: Save Income Details

        if (!userData.employmentType) {

          alert("Please select Employment Type.");

          return;

        }

        const bankStatementDoc = uploadedDocuments.find(d => d.documentType === "BANK_STATEMENT" || d.type === "BANK_STATEMENT");

        if (!bankStatementDoc) {

          alert("Bank Statement is required.");

          return;

        }

        const payload = {

          employmentType: userData.employmentType === "Salaried" ? "SALARIED" : "BUSINESS",

          bankStatementDocumentId: bankStatementDoc.documentId,

        };

        if (userData.employmentType === "Salaried") {

          const salarySlipDoc = uploadedDocuments.find(d => d.documentType === "SALARY_SLIP" || d.type === "SALARY_SLIP");

          const appLetterDoc = uploadedDocuments.find(d => d.documentType === "APPOINTMENT_LETTER" || d.type === "APPOINTMENT_LETTER");

          payload.salarySlipDocumentId = salarySlipDoc?.documentId || null;

          payload.appointmentLetterDocumentId = appLetterDoc?.documentId || null;

        } else {

          const itrDoc = uploadedDocuments.find(d => d.documentType === "ITR_RETURN" || d.type === "ITR_RETURN");

          payload.itrDocumentId = itrDoc?.documentId || null;

        }

        await api.post(`/loan-applications/income/${currentAppId}`, payload);

      } else if (currentStep === 5) {

        // Step 5: Save Vehicle Details

        const rcDoc = uploadedDocuments.find(d => d.documentType === "RC" || d.type === "RC");

        const insDoc = uploadedDocuments.find(d => d.documentType === "INSURANCE" || d.type === "INSURANCE");

        const carFrontDoc = uploadedDocuments.find(d => d.documentType === "CAR_FRONT_SIDE_PHOTO" || d.type === "CAR_FRONT_SIDE_PHOTO");

        const carBackDoc = uploadedDocuments.find(d => d.documentType === "CAR_BACK_SIDE_PHOTO" || d.type === "CAR_BACK_SIDE_PHOTO");

        

        if (!rcDoc || !insDoc) {

          alert("RC Copy and Insurance Copy are required.");

          return;

        }

        const payload = {

          rcDocumentId: rcDoc.documentId,

          insuranceDocumentId: insDoc.documentId,

          carFrontDocumentId: carFrontDoc?.documentId || null,

          carBackDocumentId: carBackDoc?.documentId || null,

        };

        await api.post(`/loan-applications/vehicle/${currentAppId}`, payload);

      }



      setCurrentStep((prev) => prev + 1);
      // Refresh data from API without full page reload
      await fetchData(false);


    } catch (err) {

      console.error("Step save error:", err);

      alert(err?.response?.data || err?.response?.data?.message || `Failed to save step ${currentStep}`);

    } finally {

      setDocumentLoading(false);

    }

  };


  const fetchData = async (forceReset = false) => {
    try {
      const docRes = await api.get(`/documents/user/${currentUserId}`);
      const docs = docRes.data.data || [];
      setUploadedDocuments(docs);

      let registrationUserObj = null;
      let userMobile = "9876543210";

      try {

        const userRes = await api.get(`/user/${currentUserId}`);

        const userObj = userRes.data.data;

        if (userObj) {

          registrationUserObj = userObj;

          userMobile = localStorage.getItem("user_mobile_" + currentUserId) || 

                       localStorage.getItem("user_mobile_" + userObj.email.toLowerCase().trim()) || 

                       userObj.mobileNumber || 

                       "9876543210";

          setProfileData({

            name: userObj.fullName || "",

            phone: userMobile,

            email: userObj.email || "",

            dealerCode: userObj.dealerCode || "",

          });

          setPhoneForm((prev) => ({ ...prev, currentPhone: userMobile }));

          setEmailForm((prev) => ({ ...prev, currentEmail: userObj.email || "" }));

          

          localStorage.setItem("user_mobile_" + currentUserId, userMobile);

        }

      } catch (err) {

        console.error("Failed to fetch user profile:", err);

      }



      // 3. Fetch loan application status

      const loanAppRes = await api.get(`/loan-applications/user/${currentUserId}`);

      const appList = loanAppRes.data || [];

      

      if (appList.length > 0) {

        const app = appList[0];

        

        let displayStatus = "Documents yet to submit";

        if (app.status === "DOCUMENTS_SUBMITTED") displayStatus = "Documents Submitted";

        else if (app.status === "DOCUMENTS_VERIFIED") displayStatus = "Documents Verified";

        else if (app.status === "SENT_TO_BANK") displayStatus = "Sent To Bank";

        else if (app.status === "BANK_REVIEW") displayStatus = "Bank Review";

        else if (app.status === "APPROVED") displayStatus = "Loan Approved";

        else if (app.status === "REJECTED") displayStatus = "Rejected";



        const assignedBank = localStorage.getItem(`bank_assignment_${app.applicationNumber}`) || "";
        if (assignedBank && !["BANK_REVIEW", "APPROVED", "REJECTED"].includes(app.status)) {
          displayStatus = "Sent To Bank";
        }
        setUserData((prev) => {
          if (isInitializedRef.current && !forceReset) {
            // Only update non-form-wizard dynamic fields
            return {
              ...prev,
              applicationId: app.applicationNumber || "",
              loanAmount: (app.loanAmount != null && app.loanAmount > 0) ? `₹${Number(app.loanAmount).toLocaleString('en-IN')}` : (prev.loanAmount && prev.loanAmount !== "₹0" ? prev.loanAmount : null),
              rawLoanAmount: app.loanAmount || 0,
              bank: assignedBank || prev.bank || "Yet to assign",
              status: displayStatus,
              documentsUploaded: docs.length,
            };
          }
          return {
            name: app.fullName || registrationUserObj?.fullName || "",
            mobile: app.mobileNumber || userMobile || "",
            email: app.email || registrationUserObj?.email || "",
            applicationId: app.applicationNumber || "",
            loanAmount: (app.loanAmount != null && app.loanAmount > 0) ? `₹${Number(app.loanAmount).toLocaleString('en-IN')}` : null,
            rawLoanAmount: app.loanAmount || 0,
            bank: assignedBank || "Yet to assign",
            status: displayStatus,
            documentsUploaded: docs.length,
            totalDocuments: 8,
            address: app.address || "",
            city: app.city || "",
            state: app.state || "",
            pincode: app.pincode || "",
            employmentType: app.employmentType === "SALARIED" ? "Salaried" : (app.employmentType === "BUSINESS" ? "Self Employed" : ""),
            pan: "",
            aadhaar: "",
            chassisNumber: app.chassisNumber || "",
            odometerReading: app.odometerReading || "",
            dealerCode: registrationUserObj?.dealerCode || "",
          };
        });

        // Initialize currentStep and mark as initialized
        if (!isInitializedRef.current || forceReset) {
          const stepMap = {
            "PERSONAL_INFORMATION": 1,
            "KYC": 2,
            "RESIDENTIAL": 3,
            "INCOME": 4,
            "VEHICLE": 5,
            "VERIFY": 6
          };
          if (app.currentStep && stepMap[app.currentStep]) {
            setCurrentStep(stepMap[app.currentStep]);
          }
          isInitializedRef.current = true;
        }



        setUserRemarkData({

          hasRemark: !!app.remark,

          remark: app.remark || "No remarks added by admin.",

        });



        setDocumentsSubmitted(
          app.status === "DOCUMENTS_SUBMITTED" ||
          app.status === "DOCUMENTS_VERIFIED" ||
          app.status === "SENT_TO_BANK" ||
          app.status === "BANK_REVIEW" ||
          app.status === "APPROVED" ||
          app.status === "REJECTED"
        );

      } else {

        setUserData((prev) => ({

          ...prev,

          name: registrationUserObj?.fullName || loggedInUser?.name || prev.name,

          email: registrationUserObj?.email || loggedInUser?.email || prev.email,

          mobile: userMobile,

          applicationId: "",

          status: "Documents yet to submit",

          documentsUploaded: docs.length,

          bank: "Yet to assign",

          loanAmount: "₹0",

          dealerCode: registrationUserObj?.dealerCode || "",

        }));

      }

    } catch (err) {

      console.error("Init load failed", err);

    }

  };



useEffect(() => {

  isInitializedRef.current = false;
  fetchData(true);

}, []);



// Re-fetch documents & remarks when user navigates to Dashboard tab
useEffect(() => {

  if (activeMenu === "Dashboard") {

    fetchData(false);

  }

}, [activeMenu]);



// Poll every 20 seconds so admin remarks/status appear without manual refresh
useEffect(() => {

  const interval = setInterval(() => {

    fetchData(false);

  }, 20000);

  return () => clearInterval(interval);

}, []);





  /* VEHICLE DOCS */



  const [vehicleDocs, setVehicleDocs] =

    useState({

      rc: null,

      insurance: null,

    });



    const [showPreviewModal, setShowPreviewModal] =

  useState(false);



const [selectedDocument, setSelectedDocument] =

  useState(null);



  const [previewUrl, setPreviewUrl] = useState(null);



const [finalSubmitting, setFinalSubmitting] =

  useState(false);



  const openPreview = async (doc) => {

  try {

    const res = await fetch(

      `${api.defaults.baseURL}/documents/preview/${doc.documentId}`

    );



    const blob = await res.blob();

    const url = URL.createObjectURL(blob);



    setPreviewUrl(url);

    setSelectedDocument(doc);

    setShowPreviewModal(true);

  } catch (err) {

    console.error("Preview Error:", err);

  }

};





  /* USER DATA */



  const [userData, setUserData] =

    useState({

      name: "",

      applicationId: "",

      loanAmount: "₹0",

      bank: "Yet to assign",

      status: "Documents yet to submit",

      documentsUploaded: 0,

      totalDocuments: 8,

      dealerCode: "",

    });



    const [documentLoading, setDocumentLoading] =

  useState(false);



const [uploadedDocuments, setUploadedDocuments] =

  useState([]);



  const handleDocumentUpload = async (

  file,

  documentType

) => {



  if (!file) {

    alert("Please Select File");

    return;

  }



  try {



    setDocumentLoading(true);



    const formData = new FormData();



    formData.append("userId", currentUserId); // logged in user id

    formData.append("type", documentType);

    formData.append("file", file);



    console.log("UPLOAD PAYLOAD");



    const res =

      await uploadDocument(formData);



    console.log(

      "DOCUMENT UPLOAD RESPONSE :",

      res.data

    );



    alert(

      `${documentType} Uploaded Successfully`

    );



    setUploadedDocuments((prev) => [...prev, res.data.data]);



  } catch (error) {



    console.error(

      "DOCUMENT UPLOAD ERROR :",

      error

    );



    alert(

      error?.response?.data?.message ||

      "Document Upload Failed"

    );



  } finally {



    setDocumentLoading(false);



  }

};



  const handleReuploadDocument = async (documentId, documentType, file) => {

    if (!file) return;

    try {

      setDocumentLoading(true);

      // 1. Delete old rejected doc

      await api.delete(`/documents/${documentId}`);

      

      // 2. Upload new doc

      const formData = new FormData();

      formData.append("userId", currentUserId);

      formData.append("type", documentType);

      formData.append("file", file);

      

      const res = await api.post("/documents/upload", formData, {

        headers: {

          "Content-Type": "multipart/form-data"

        }

      });

      

      alert("Document re-uploaded successfully!");

      

      // 3. Fetch latest docs

      const docRes = await api.get(`/documents/user/${currentUserId}`);

      setUploadedDocuments(docRes.data.data || []);

    } catch (error) {

      console.error("Re-upload error:", error);

      alert(error?.response?.data?.message || "Failed to re-upload document");

    } finally {

      setDocumentLoading(false);

    }

  };



  /* STATUS STEPS */



  const steps = [

    "Documents Submitted",

    "Documents Verified",

    "Sent To Bank",

    "Bank Review",

    "Loan Approved",

    "Amount Disbursed",

  ];



  const currentStatusStep =

    steps.indexOf(userData.status);



  /* LOGOUT */



  const handleLogout = () => {



    localStorage.removeItem("role");



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



          <div>



            <h1 className="text-3xl font-bold text-[#0B2A4A]">

              {activeMenu}

            </h1>



            <p className="text-sm text-gray-500 mt-1">

              Welcome back 👋, {userData?.name || loggedInUser?.name || "User"}

            </p>



          </div>



          <div className="bg-[#EAFBF8] px-5 py-3 rounded-2xl border border-[#27D3C3]/20">



            <p className="text-xs text-gray-500">

              Application ID

            </p>



            <h3 className="text-lg font-bold text-[#0B2A4A] mt-1">

              {documentsSubmitted ? userData.applicationId : ""}

            </h3>



          </div>



        </div>



        {/* CONTENT */}



        <div className="p-8">



          {/* DASHBOARD */}



          {activeMenu === "Dashboard" && (



            <div className="space-y-6">



              {/* HEADER */}



              <div className="bg-white rounded-3xl p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">

                <div>

                  <h1 className="text-2xl font-bold text-[#0B2A4A]">
                    Welcome Back 👋
                  </h1>

                  <p className="text-sm text-gray-500 mt-1">
                    Track your loan application progress
                  </p>

                </div>

                <div className="bg-[#EAFBF8] px-5 py-3 rounded-2xl border border-[#27D3C3]/20">

                  <p className="text-xs text-gray-500">
                    Current Status
                  </p>

                  <h3 className="text-sm font-bold text-[#27D3C3] mt-1">
                    {userData.status}
                  </h3>

                </div>

              </div>

              {/* ACTION REQUIRED: REJECTED DOCUMENTS */}
              {uploadedDocuments.filter(d => d.status === "REJECTED").length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border-2 border-red-200">
                  <div className="bg-gradient-to-r from-red-600 to-red-500 px-7 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                        ⚠️
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Action Required — Updates</h2>
                        <p className="text-red-100 text-sm mt-0.5">
                          {uploadedDocuments.filter(d => d.status === "REJECTED").length} document(s) rejected — please re-upload
                        </p>
                      </div>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-xl text-xs text-white font-semibold">
                      URGENT
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {uploadedDocuments.filter(d => d.status === "REJECTED").map((doc, idx) => {
                      const docNames = {
                        PAN: "PAN Card",
                        AADHAAR: "Aadhar Card",
                        AADHAAR_FRONT: "Aadhaar Front",
                        AADHAAR_BACK: "Aadhaar Back",
                        LIGHT_BILL: "Light Bill",
                        RENTAL_AGREEMENT: "Rental Agreement",
                        RC: "RC Book",
                        INSURANCE: "Vehicle Insurance",
                        SALARY_SLIP: "Salary Slip",
                        APPOINTMENT_LETTER: "Appointment Letter",
                        ITR_RETURN: "ITR Copy",
                        BANK_STATEMENT: "Bank Statement",
                        CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                        CAR_BACK_SIDE_PHOTO: "Car Back Photo",
                      };
                      const docName = docNames[doc.documentType] || doc.documentType;
                      return (
                        <div key={doc.documentId || idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-[#FFF5F5] border border-red-100 rounded-2xl p-5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-base font-bold text-[#0B2A4A]">{docName}</span>
                              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-lg">REJECTED</span>
                            </div>
                            <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-red-100">
                              <span className="text-red-500 mt-0.5">💬</span>
                              <div>
                                <p className="text-xs text-gray-500 font-semibold mb-0.5">Admin Remark:</p>
                                <p className="text-sm text-gray-700">{doc.remarks ? doc.remarks : <span className="text-gray-400 italic">No remark added.</span>}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-start md:items-end gap-2 min-w-[180px]">
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              id={`reupload-dash-${doc.documentId}`}
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) await handleReuploadDocument(doc.documentId, doc.documentType, file);
                              }}
                            />
                            <button
                              onClick={() => document.getElementById(`reupload-dash-${doc.documentId}`).click()}
                              disabled={documentLoading}
                              className="bg-[#0B2A4A] hover:bg-[#123E68] disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2"
                            >
                              <span>📤</span> Re-upload Document
                            </button>
                            <p className="text-xs text-gray-400">PDF, JPG or PNG · max 5MB</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* APPROVED DOCUMENTS */}
              {uploadedDocuments.filter(d => d.status === "APPROVED").length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border-2 border-green-200 mb-6">
                  <div className="bg-gradient-to-r from-green-600 to-green-500 px-7 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                        ✅
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Approved Documents</h2>
                        <p className="text-green-100 text-sm mt-0.5">
                          {uploadedDocuments.filter(d => d.status === "APPROVED").length} document(s) approved successfully
                        </p>
                      </div>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-xl text-xs text-white font-semibold">
                      VERIFIED
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {uploadedDocuments.filter(d => d.status === "APPROVED").map((doc, idx) => {
                      const docNames = {
                        PAN: "PAN Card",
                        AADHAAR: "Aadhar Card",
                        AADHAAR_FRONT: "Aadhaar Front",
                        AADHAAR_BACK: "Aadhaar Back",
                        LIGHT_BILL: "Light Bill",
                        RENTAL_AGREEMENT: "Rental Agreement",
                        RC: "RC Book",
                        INSURANCE: "Vehicle Insurance",
                        SALARY_SLIP: "Salary Slip",
                        APPOINTMENT_LETTER: "Appointment Letter",
                        ITR_RETURN: "ITR Copy",
                        BANK_STATEMENT: "Bank Statement",
                        CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                        CAR_BACK_SIDE_PHOTO: "Car Back Photo",
                      };
                      const docName = docNames[doc.documentType] || doc.documentType;
                      return (
                        <div key={doc.documentId || idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-[#F2FDF5] border border-green-100 rounded-2xl p-5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-base font-bold text-[#0B2A4A]">{docName}</span>
                              <span className="bg-green-100 text-green-600 text-xs font-bold px-2 py-0.5 rounded-lg">APPROVED</span>
                            </div>
                            <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-green-100">
                              <span className="text-green-500 mt-0.5">💬</span>
                              <div>
                                <p className="text-xs text-gray-500 font-semibold mb-0.5">Admin Remark:</p>
                                <p className="text-sm text-gray-700">{doc.remarks ? doc.remarks : <span className="text-gray-400 italic">No remark added.</span>}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STATS */}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Loan Amount</p>
                      <h2 className="text-2xl font-bold text-[#0B2A4A] mt-2">
                        {userData.loanAmount
                          ? userData.loanAmount
                          : <span className="text-sm text-gray-400 font-normal">Not set yet</span>
                        }
                      </h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#EAFBF8] flex items-center justify-center text-xl">💰</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Documents Uploaded</p>
                      <h2 className="text-2xl font-bold text-[#0B2A4A] mt-2">{userData.documentsUploaded}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#EEF6FF] flex items-center justify-center text-xl">📄</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Assigned Bank</p>
                      <h2 className="text-sm text-[#0B2A4A] mt-2">{userData.bank}</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#FFF4E5] flex items-center justify-center text-xl">🏦</div>
                  </div>
                </div>

                

              </div>

              {!documentsSubmitted ? (
                <div className="bg-gradient-to-r from-[#0B2A4A] to-[#123E68] rounded-3xl p-6 text-white shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-5">
                    <div>
                      <h2 className="text-xl font-bold">Upload Pending Documents</h2>
                      <p className="text-gray-300 mt-2 text-sm">Complete your KYC and vehicle verification process.</p>
                    </div>
                    <button
                      onClick={() => setActiveMenu("Documents")}
                      className="bg-[#27D3C3] hover:bg-[#1fb5a7] text-[#0B2A4A] px-5 py-3 rounded-2xl text-sm font-bold transition"
                    >
                      Upload Documents
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-6 text-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">✅</div>
                    <div>
                      <h2 className="text-xl font-bold">Documents Submitted Successfully</h2>
                      <p className="text-green-100 mt-1 text-sm">Your application is under review. Track progress in the Status tab.</p>
                    </div>
                  </div>
                </div>
              )}



            </div>



          )}



          {/* DOCUMENTS */}



          {activeMenu === "Documents" && (



            <div className="max-w-5xl mx-auto">

              {/* IF SUBMITTED — show uploaded docs list instead of upload form */}
              {documentsSubmitted ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 shadow-sm">
                    <h1 className="text-2xl font-bold text-[#0B2A4A]">Your Documents</h1>
                    <p className="text-sm text-gray-500 mt-1">Documents submitted for your loan application</p>
                  </div>
                  {uploadedDocuments.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 shadow-sm text-center text-gray-400">No documents found.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {uploadedDocuments.map((doc, index) => {
                        const docLabels = {
                          PAN: "PAN Card", AADHAAR: "Aadhaar Card", AADHAAR_FRONT: "Aadhaar Front",
                          AADHAAR_BACK: "Aadhaar Back", LIGHT_BILL: "Light Bill", RENTAL_AGREEMENT: "Rental Agreement",
                          RC: "RC Copy", INSURANCE: "Insurance Copy", SALARY_SLIP: "Salary Slip",
                          APPOINTMENT_LETTER: "Appointment Letter", ITR_RETURN: "ITR Copy",
                          BANK_STATEMENT: "Bank Statement", CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                          CAR_BACK_SIDE_PHOTO: "Car Back Photo", CHASSIS_NUMBER: "Chassis Number",
                          ODOMETER_READING: "Odometer Reading",
                        };
                        const label = docLabels[doc.documentType] || (doc.documentType || "").replace(/_/g, " ");
                        const statusColor = doc.status === "APPROVED"
  ? "bg-green-100 text-green-700"
  : doc.status === "REJECTED"
  ? "bg-red-100 text-red-700"
  : doc.status === "VERIFIED"
  ? "bg-blue-100 text-blue-700"
  : "bg-yellow-100 text-yellow-700";
                        return (
                          <div key={doc.documentId || index} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-[#0B2A4A]">{label}</h4>
                                <p className="text-xs text-gray-400 mt-1">{doc.fileName || "Uploaded"}</p>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor}`}>{doc.status || "PENDING"}</span>
                            </div>
                            {doc.remarks && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                                <p className="text-xs text-amber-700 font-semibold">Admin Remark:</p>
                                <p className="text-xs text-gray-700 mt-0.5">{doc.remarks}</p>
                              </div>
                            )}
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`${api.defaults.baseURL}/documents/preview/${doc.documentId}`, {
                                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                                  });
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  setPreviewUrl(url);
                                  setSelectedDocument(doc);
                                  setShowPreviewModal(true);
                                } catch (e) { alert("Failed to load preview"); }
                              }}
                              className="w-full bg-[#0B2A4A] hover:bg-[#081f36] text-white py-2.5 rounded-2xl text-sm font-semibold transition"
                            >
                              View {label}
                            </button>
                            {doc.status === "REJECTED" && (
                              <div className="mt-2">
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" id={`reup-${doc.documentId}`} className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) await handleReuploadDocument(doc.documentId, doc.documentType, file);
                                  }}
                                />
                                <button onClick={() => document.getElementById(`reup-${doc.documentId}`).click()}
                                  disabled={documentLoading}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-2xl text-sm font-semibold transition disabled:opacity-50"
                                >
                                  📤 Re-upload {label}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
              <div>

              {/* HEADER */}



              <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">



                <h1 className="text-2xl font-bold text-[#0B2A4A]">

                  Upload Documents

                </h1>



                <p className="text-sm text-gray-500 mt-2">

                  Complete your KYC and verification process

                </p>



                {/* STEPS */}



                <div className="flex items-center gap-3 mt-6 overflow-x-auto">



                  {[

                    "Personal information",

                    "KYC",

                    "Residential",

                    "Income",

                    "Vehicle",

                    "Verify",

                  ].map((step, index) => (



                    <div

                      key={index}

                      className={`px-5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap



                      ${

                        currentStep === index + 1

                          ? "bg-[#27D3C3] text-[#0B2A4A]"

                          : "bg-[#F4F6F9] text-gray-500"

                      }`}

                    >

                      {index + 1}. {step}

                    </div>



                  ))}



                </div>



              </div>



              {/* FORM */}



              {/* BUTTONS */}



<div className="bg-white rounded-3xl p-6 shadow-sm">



  {/* STEP 1 â€” PERSONAL INFORMATION */}



  {currentStep === 1 && (



    <div>



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        Personal Information

      </h2>



      <p className="text-sm text-gray-500 mt-2 mb-8">

        Enter customer personal details

      </p>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Full Name

          </label>



          <input

            type="text"

            placeholder="Enter Full Name"

            value={userData?.name || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                name: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Mobile Number

          </label>



          <input

            type="text"

            placeholder="Enter Mobile Number"

            value={userData?.mobile || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                mobile: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Email Address

          </label>



          <input

            type="email"

            placeholder="Enter Email"

            value={userData?.email || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                email: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Loan Amount

          </label>



          <input

            type="text"

            placeholder="Enter Loan Amount"

            value={userData?.loanAmount ? String(userData.loanAmount).replace(/[^0-9.]/g, '') : ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                loanAmount: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Date Of Birth

          </label>



          <input

            type="date"

            value={userData?.dob || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                dob: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            City <span className="text-red-500">*</span>

          </label>

          <input

            type="text"

            placeholder="Enter City"

            value={userData?.city || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                city: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            State <span className="text-red-500">*</span>

          </label>

          <input

            type="text"

            placeholder="Enter State"

            value={userData?.state || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                state: e.target.value,

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

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

            value={userData?.pincode || ""}

            onChange={(e) =>

              setUserData((prev) => ({

                ...prev,

                pincode: e.target.value.replace(/\D/g, ""),

              }))

            }

            className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5"

          />

        </div>



        



      </div>



    </div>



  )}



  {/* STEP 2 â€” KYC */}



  {currentStep === 2 && (



    <div>



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        KYC Documents

      </h2>



      <p className="text-sm text-gray-500 mt-2 mb-8">

        Upload PAN Card and Aadhaar Card

      </p>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



        {/* PAN */}



        <div className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]">



          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

            Upload PAN Card

          </label>



          <input

            type="file"

            accept=".jpg,.jpeg,.png,.pdf"

            onChange={async (e) => {



  const file = e.target.files[0];



  setUserData((prev) => ({

    ...prev,

    panFile: file,

  }));



  await handleDocumentUpload(

    file,

    "PAN"

  );

}}

            className="w-full text-sm

            file:mr-4 file:px-4 file:py-2

            file:rounded-xl file:border-0

            file:bg-[#0B2A4A]

            file:text-white"

          />



        </div>



        {/* AADHAAR */}



        {/* AADHAAR */}



<div className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]">



  <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">

    Upload Aadhaar Card

  </label>



  <input

    type="file"

    accept=".jpg,.jpeg,.png,.pdf"

    onChange={async (e) => {



      const file = e.target.files[0];



      if (!file) return;



      setUserData((prev) => ({

        ...prev,

        aadhaarFile: file,

      }));



      await handleDocumentUpload(

        file,

        "AADHAAR"

      );

    }}

    className="w-full text-sm

    file:mr-4 file:px-4 file:py-2

    file:rounded-xl file:border-0

    file:bg-[#0B2A4A]

    file:text-white"

  />



</div>



      </div>



    </div>



  )}



  {/* STEP 3 â€” RESIDENTIAL */}



  {currentStep === 3 && (



    <div>



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        Residential Details

      </h2>



      <p className="text-sm text-gray-500 mt-2 mb-8">

        Upload Light Bill or Rental Agreement

      </p>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">



        {/* LIGHT BILL */}



        <div className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]">



          <h3 className="font-semibold text-[#0B2A4A]">

            Light Bill

          </h3>



          <p className="text-xs text-gray-500 mt-1">

            Upload latest electricity bill

          </p>



          <input

            type="file"

            accept=".jpg,.jpeg,.png,.pdf"

            onChange={async (e) => {



  const file = e.target.files[0];



  setUserData((prev) => ({

    ...prev,

    lightBill: file,

  }));



  await handleDocumentUpload(

    file,

    "LIGHT_BILL"

  );

}}

            className="mt-4 w-full text-sm

            file:mr-4 file:px-4 file:py-2

            file:rounded-xl file:border-0

            file:bg-[#0B2A4A]

            file:text-white"

          />



        </div>



        {/* RENT AGREEMENT */}



        <div className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]">



          <h3 className="font-semibold text-[#0B2A4A]">

            Rent Agreement

          </h3>



          <p className="text-xs text-gray-500 mt-1">

            Upload rental agreement copy

          </p>



          <input

            type="file"

            accept=".jpg,.jpeg,.png,.pdf"

            onChange={async (e) => {



  const file = e.target.files[0];



  setUserData((prev) => ({

    ...prev,

    rentAgreement: file,

  }));



  await handleDocumentUpload(

    file,

    "RENTAL_AGREEMENT"

  );

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



  {/* STEP 4 â€” INCOME */}



  {currentStep === 4 && (



    <div>



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        Income Proof

      </h2>



      <p className="text-sm text-gray-500 mt-2 mb-8">

        Upload employment and income documents

      </p>



      <select

        value={userData?.employmentType || ""}

        onChange={(e) =>

          setUserData((prev) => ({

            ...prev,

            employmentType: e.target.value,

          }))

        }

        className="w-full h-14 rounded-2xl border border-gray-200 bg-[#F8FAFC] px-5 mb-8"

      >

        <option value="">Select Employment Type</option>

        <option value="Salaried">Salaried</option>

        <option value="Self Employed">Self Employed</option>

      </select>



      {/* SALARIED */}



      {userData?.employmentType === "Salaried" && (



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



          {[

  {

    label: "Appointment Letter",

    type: "APPOINTMENT_LETTER",

  },

  {

    label: "3 Months Salary Slips",

    type: "SALARY_SLIP",

  },

  {

    label: "6 Months Bank Statement",

    type: "BANK_STATEMENT",

  },

].map((doc, index) => (



            <div

              key={index}

              className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]"

            >



              <h3 className="font-semibold text-[#0B2A4A]">

                {doc.label}

              </h3>



              <input

  type="file"

  accept=".jpg,.jpeg,.png,.pdf"

  onChange={async (e) => {



    const file = e.target.files[0];



    await handleDocumentUpload(

      file,

      doc.type

    );

  }}

                accept=".jpg,.jpeg,.png,.pdf"

                className="mt-4 w-full text-sm

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



      {userData?.employmentType === "Self Employed" && (



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



          {[

  {

    label: "ITR Copy",

    type: "ITR_RETURN",

  },

  {

    label: "6 Months Bank Statement",

    type: "BANK_STATEMENT",

  },

].map((doc, index) => (



            <div

              key={index}

              className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]"

            >



              <h3 className="font-semibold text-[#0B2A4A]">

                {doc.label}

              </h3>



              <input

  type="file"

  accept=".jpg,.jpeg,.png,.pdf"

  onChange={async (e) => {



    const file = e.target.files[0];



    await handleDocumentUpload(

      file,

      doc.type

    );

  }}

                accept=".jpg,.jpeg,.png,.pdf"

                className="mt-4 w-full text-sm

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



  {/* STEP 5 â€” VEHICLE */}



  {currentStep === 5 && (



    <div>



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        Vehicle Documents

      </h2>



      <p className="text-sm text-gray-500 mt-2 mb-8">

        Upload vehicle related documents and enter vehicle details

      </p>







      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



        {[

  {

    label: "RC Copy",

    type: "RC",

  },

  {

    label: "Insurance Copy",

    type: "INSURANCE",

  },

  {

    label: "Front Car Image",

    type: "CAR_FRONT_SIDE_PHOTO",

  },

  {

    label: "Rear Car Image",

    type: "CAR_BACK_SIDE_PHOTO",

  },

  {

    label: "Chassis Number Image",

    type: "CHASSIS_NUMBER",

  },

  {

    label: "Odometer Image (KM Visible)",

    type: "ODOMETER_READING",

  },

].map((doc, index) => (



          <div

            key={index}

            className="border border-gray-200 rounded-3xl p-5 bg-[#F8FAFC]"

          >



            <h3 className="font-semibold text-[#0B2A4A]">

              {doc.label}

            </h3>



            <input

  type="file"

  accept=".jpg,.jpeg,.png,.pdf"

  onChange={async (e) => {



    const file = e.target.files[0];



    await handleDocumentUpload(

      file,

      doc.type

    );

  }}

              accept=".jpg,.jpeg,.png,.pdf"

              className="mt-4 w-full text-sm

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



  {/* STEP 6 â€” VERIFY */}



  {/* STEP 6 — VERIFY */}



{currentStep === 6 && (



  <div>



    <div className="text-center mb-8">



      <div

        className="w-24 h-24 mx-auto rounded-full

        bg-[#EAFBF8]

        flex items-center justify-center text-5xl"

      >

        ✅

      </div>



      <h2 className="text-2xl font-bold text-[#0B2A4A] mt-6">

        Verify Details

      </h2>



      <p className="text-gray-500 mt-3">

        Please verify all uploaded documents before final submit

      </p>



    </div>



    {/* USER DETAILS */}



    <div

      className="bg-[#F8FAFC]

      rounded-3xl p-6 space-y-4 mb-8"

    >



      <div>

        <span className="font-semibold text-[#0B2A4A]">

          Name:

        </span>{" "}

        {userData?.name}

      </div>



      <div>

        <span className="font-semibold text-[#0B2A4A]">

          Mobile:

        </span>{" "}

        {userData?.mobile}

      </div>



      <div>

        <span className="font-semibold text-[#0B2A4A]">

          PAN:

        </span>{" "}

        {userData?.pan}

      </div>



      <div>

        <span className="font-semibold text-[#0B2A4A]">

          Aadhaar:

        </span>{" "}

        {userData?.aadhaar}

      </div>



      <div>

        <span className="font-semibold text-[#0B2A4A]">

          Employment:

        </span>{" "}

        {userData?.employmentType}

      </div>



      



    </div>



    {/* DOCUMENT PREVIEW GRID */}



    <div>



      <h3 className="text-xl font-bold text-[#0B2A4A] mb-5">

        Uploaded Documents

      </h3>



      {uploadedDocuments.length === 0 ? (



        <div

          className="bg-[#FFF4F4]

          border border-red-200

          text-red-500

          rounded-2xl p-5"

        >

          No documents uploaded yet.

        </div>



      ) : (



        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">



          {uploadedDocuments.map((doc, index) => (



            <div

              key={index}

              className="bg-white border border-gray-200

              rounded-3xl p-5 shadow-sm"

            >



              <div className="flex items-center justify-between">



                <div>



                  <h4 className="font-bold text-[#0B2A4A]">

                    {doc.documenttype}

                  </h4>



                  <p className="text-xs text-gray-500 mt-1">

                    Uploaded Successfully

                  </p>



                </div>



                <div

                  className="w-12 h-12 rounded-2xl

                  bg-[#EAFBF8]

                  flex items-center justify-center text-2xl"

                >

                  📄

                </div>



              </div>



              <button

                onClick={() => openPreview(doc)}

                className="mt-5 w-full

                bg-[#0B2A4A]

                hover:bg-[#081f36]

                text-white py-3 rounded-2xl

                text-sm font-semibold"

              >

                View Document

              </button>



            </div>



          ))}



        </div>



      )}



    </div>



  </div>



)}



  {/* BUTTONS */}



  <div className="flex items-center justify-between mt-10">



    <button

      disabled={currentStep === 1}

      onClick={() =>

        setCurrentStep((prev) => prev - 1)

      }

      className={`px-6 py-3 rounded-2xl text-sm font-semibold

      ${

        currentStep === 1

          ? "bg-gray-200 text-gray-400 cursor-not-allowed"

          : "bg-[#F4F6F9] hover:bg-gray-200 text-[#0B2A4A]"

      }`}

    >

      â† Previous

    </button>



    {currentStep !== 6 ? (



      <button

        onClick={handleNextStep}

        className="bg-[#0B2A4A] hover:bg-[#081f36]

        text-white px-6 py-3 rounded-2xl

        text-sm font-semibold"

      >

        Next →

      </button>



    ) : (



      <button

  disabled={finalSubmitting}

  onClick={async () => {



    try {



      setFinalSubmitting(true);



      await api.post(`/loan-applications/submit/${userData.applicationId}`);



      alert(

        "Documents Submitted Successfully"

      );



      setDocumentsSubmitted(true);



      setUserData((prev) => ({

        ...prev,

        status: "Documents Submitted",

      }));



      setCurrentStep(1);



      setActiveMenu("Status");
      // Refresh data to reflect submitted status
      await fetchData(true);




    } catch (error) {



      console.error(error);



      alert(error?.response?.data?.message || "Submission Failed");



    } finally {



      setFinalSubmitting(false);



    }



  }}

  className="bg-[#27D3C3] hover:bg-[#1fb5a7]

  text-[#0B2A4A] px-8 py-3 rounded-2xl

  text-sm font-bold disabled:opacity-50"

>



  {finalSubmitting

    ? "Submitting..."

    : "Final Submit"}



</button>



    )}



  </div>



</div>




            </div>
            )}

            </div>

          )}

{/* DOCUMENT PREVIEW MODAL */}

{showPreviewModal && selectedDocument && (

  <div
    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={() => setShowPreviewModal(false)}
  >
    <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">
            {({
              PAN: "PAN Card", AADHAAR: "Aadhaar Card", LIGHT_BILL: "Light Bill",
              RENTAL_AGREEMENT: "Rental Agreement", RC: "RC Copy", INSURANCE: "Insurance Copy",
              SALARY_SLIP: "Salary Slip", APPOINTMENT_LETTER: "Appointment Letter",
              ITR_RETURN: "ITR Copy", BANK_STATEMENT: "Bank Statement",
              CAR_FRONT_SIDE_PHOTO: "Car Front Photo", CAR_BACK_SIDE_PHOTO: "Car Back Photo",
            })[selectedDocument.documentType] || (selectedDocument.documentType || "Document").replace(/_/g, " ")}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Document Preview</p>
        </div>
        <button onClick={() => setShowPreviewModal(false)} className="w-10 h-10 rounded-full bg-[#F4F6F9] hover:bg-gray-200 flex items-center justify-center">✕</button>
      </div>
      <div className="border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center bg-[#F8FAFC] min-h-[300px]">
        {previewUrl && (
          selectedDocument.fileType?.includes("pdf") ? (
            <iframe src={previewUrl} className="w-full h-[400px]" title="Document Preview" />
          ) : (
            <img src={previewUrl} alt="Document Preview" className="max-w-full max-h-[400px] object-contain" />
          )
        )}
      </div>
    </div>
  </div>
)}

          {/* STATUS */}



{activeMenu === "Status" && (



  <div className="max-w-5xl mx-auto">



    {/* STATUS PROGRESS */}



    <div className="bg-white rounded-[32px] p-7 shadow-sm border border-gray-100">



      {/* HEADER */}



      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">



  <div>



    <h2 className="text-2xl font-bold text-[#0B2A4A]">

      Loan Journey

    </h2>



    <p className="text-sm text-gray-500 mt-1">

      Your application is moving smoothly through verification

    </p>



  </div>



  {/* RIGHT SIDE */}



  <div className="flex items-center gap-3">



    {/* STATUS PILL */}



    <div

      className="bg-gradient-to-r from-[#EAFBF8] to-[#F4FFFD]

      border border-[#27D3C3]/20

      px-5 py-3 rounded-2xl"

    >



      <p className="text-[11px] uppercase tracking-wider text-gray-500">

        Current Stage

      </p>



      <h3 className="text-sm font-bold text-[#0B2A4A] mt-1">

        {userData.status}

      </h3>



    </div>
  </div>



</div>



      {/* TIMELINE */}



      <div className="relative">



        {/* MAIN LINE */}



        <div

          className="absolute left-5 top-2 bottom-2

          w-[3px] bg-gray-200 rounded-full"

        ></div>



        {/* ACTIVE LINE */}



        <div

          className="absolute left-5 top-2

          w-[3px] bg-[#27D3C3] rounded-full transition-all duration-500"

          style={{

            height: `${currentStatusStep * 112}px`,

          }}

        ></div>



        <div className="space-y-6">



          {steps.map((step, index) => {



            const completed =

              index < currentStatusStep;



            const active =

              index === currentStatusStep;



            return (



              <div

                key={index}

                className="relative flex items-start gap-5"

              >



                {/* STEP ICON */}



                <div

                  className={`relative z-10 min-w-[42px] h-[42px]

                  rounded-full flex items-center justify-center

                  text-sm font-bold transition-all duration-300



                  ${

                    completed

                      ? "bg-[#27D3C3] text-[#0B2A4A]"

                      : active

                      ? "bg-[#0B2A4A] text-white ring-4 ring-[#27D3C3]/20"

                      : "bg-white border-2 border-gray-300 text-gray-400"

                  }`}

                >



                  {completed ? "✓" : index + 1}



                </div>



                {/* CARD */}



                <div

                  className={`flex-1 rounded-3xl border p-5 transition-all duration-300



                  ${

                    active

                      ? "bg-[#0B2A4A] border-[#0B2A4A] shadow-lg"

                      : completed

                      ? "bg-[#F2FFFC] border-[#27D3C3]/20"

                      : "bg-[#FAFAFA] border-gray-200"

                  }`}

                >



                  <div className="flex items-start justify-between gap-4 flex-wrap">



                    {/* LEFT */}



                    <div>



                      <div className="flex items-center gap-3">



                        <h3

                          className={`text-base font-bold



                          ${

                            active

                              ? "text-white"

                              : completed

                              ? "text-[#0B2A4A]"

                              : "text-gray-500"

                          }`}

                        >



                          {step}



                        </h3>



                        {/* Smart Status Dot */}
                        {(() => {
                          const hasActionNeeded = active && (
                            uploadedDocuments.filter(d => d.status === "REJECTED" || d.remarks).length > 0 ||
                            userRemarkData.hasRemark
                          );

                          const rejectedDocs = uploadedDocuments.filter(d => d.status === "REJECTED");
                          const remarkDocs = uploadedDocuments.filter(d => d.remarks && d.status !== "REJECTED");
                          const docNames = {
                            PAN: "PAN Card", AADHAAR: "Aadhaar Card", AADHAAR_FRONT: "Aadhaar Front",
                            AADHAAR_BACK: "Aadhaar Back", LIGHT_BILL: "Light Bill", RENTAL_AGREEMENT: "Rental Agreement",
                            RC: "RC Book", INSURANCE: "Vehicle Insurance", SALARY_SLIP: "Salary Slip",
                            APPOINTMENT_LETTER: "Appointment Letter", ITR_RETURN: "ITR Copy",
                            BANK_STATEMENT: "Bank Statement", CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                            CAR_BACK_SIDE_PHOTO: "Car Back Photo",
                          };

                          if (hasActionNeeded) {
                            return (
                              <div className="relative group ml-1">
                                {/* Ping animation */}
                                <span className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                                {/* Solid red dot */}
                                <span className="relative block w-3 h-3 bg-red-500 rounded-full cursor-pointer" />

                                {/* Hover Tooltip */}
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-72 pointer-events-none">
                                  <div className="bg-[#0B2A4A] text-white rounded-2xl shadow-2xl p-4 text-left border border-red-400/30">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                      <span className="text-base">⚠️</span>
                                      <p className="text-sm font-bold text-red-300">Action Required</p>
                                    </div>
                                    <div className="space-y-2">
                                      {userRemarkData.hasRemark && (
                                        <div className="flex items-start gap-2">
                                          <span className="text-amber-400 text-xs mt-0.5">💬</span>
                                          <p className="text-xs text-gray-300 leading-relaxed">
                                            <span className="font-semibold text-white">Admin Remark:</span> {userRemarkData.remark}
                                          </p>
                                        </div>
                                      )}
                                      {rejectedDocs.map((doc, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <span className="text-red-400 text-xs mt-0.5">❌</span>
                                          <p className="text-xs text-gray-300 leading-relaxed">
                                            <span className="font-semibold text-white">{docNames[doc.documentType] || doc.documentType}</span> rejected
                                            {doc.remarks && <span className="text-gray-400"> — {doc.remarks}</span>}
                                          </p>
                                        </div>
                                      ))}
                                      {remarkDocs.map((doc, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <span className="text-amber-400 text-xs mt-0.5">💬</span>
                                          <p className="text-xs text-gray-300 leading-relaxed">
                                            <span className="font-semibold text-white">{docNames[doc.documentType] || doc.documentType}:</span> {doc.remarks}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Arrow */}
                                  <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#0B2A4A] rotate-45 border-l border-b border-red-400/30" />
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                completed
                                  ? "bg-[#27D3C3]"
                                  : active
                                  ? "bg-[#27D3C3] animate-pulse"
                                  : "bg-gray-300"
                              }`}
                            />
                          );
                        })()}


                      </div>



                      <p

                        className={`text-sm mt-2 leading-relaxed



                        ${

                          active

                            ? "text-gray-300"

                            : completed

                            ? "text-gray-500"

                            : "text-gray-400"

                        }`}

                      >



                        {active

                          ? "Your application is currently being processed at this stage."

                          : completed

                          ? "This stage has been completed successfully."

                          : "This stage will begin automatically once previous verification is completed."}



                      </p>



                    </div>



                    {/* STATUS BADGE */}



                    <div>



                      {active ? (



                        <span

                          className="bg-[#27D3C3]

                          text-[#0B2A4A]

                          text-[11px] font-bold

                          px-4 py-2 rounded-full

                          tracking-wide"

                        >

                          IN PROGRESS

                        </span>



                      ) : completed ? (



                        <span

                          className="bg-[#27D3C3]/15

                          text-[#0B2A4A]

                          text-[11px] font-bold

                          px-4 py-2 rounded-full

                          tracking-wide"

                        >

                          COMPLETED

                        </span>



                      ) : (



                        <span

                          className="bg-gray-200

                          text-gray-500

                          text-[11px] font-semibold

                          px-4 py-2 rounded-full

                          tracking-wide"

                        >

                          UPCOMING

                        </span>



                      )}



                    </div>



                  </div>



                </div>



              </div>



            );

          })}



        </div>



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

        User Settings

      </h2>



      <p className="text-sm text-gray-500 mt-1">

        Manage profile and security settings

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

          👤

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

            Full Name

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

              rounded-2xl px-5 py-4"

            />



            <input

              type="password"

              placeholder="New Password"

              value={passwordForm.newPassword}

              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}

              className="bg-[#F8FAFC]

              border border-gray-200

              rounded-2xl px-5 py-4"

            />



            <input

              type="password"

              placeholder="Confirm Password"

              value={passwordForm.confirmPassword}

              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}

              className="bg-[#F8FAFC]

              border border-gray-200

              rounded-2xl px-5 py-4"

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

{/* PHONE MODAL */}



{showPhoneModal && (

  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

    <div className="bg-white rounded-3xl p-8 w-full max-w-md">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h2 className="text-2xl font-bold text-[#0B2A4A]">Update Phone Number</h2>

          <p className="text-sm text-gray-500 mt-1">Enter new phone number</p>

        </div>

        <button onClick={() => setShowPhoneModal(false)} className="w-10 h-10 rounded-full bg-[#F4F6F9] hover:bg-gray-200 flex items-center justify-center text-lg">x</button>

      </div>

      <div className="space-y-5">

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">Current Number</label>

          <input type="text" value={profileData.phone} readOnly className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">New Number</label>

          <input type="text" value={phoneForm.newPhone} onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })} className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none" />

        </div>

        <button onClick={() => { setProfileData({ ...profileData, phone: phoneForm.newPhone }); setPhoneForm({ ...phoneForm, newPhone: "" }); setShowPhoneModal(false); }} className="w-full bg-[#0B2A4A] text-white py-4 rounded-2xl font-semibold">Submit</button>

      </div>

    </div>

  </div>

)}



{showEmailModal && (

  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

    <div className="bg-white rounded-3xl p-8 w-full max-w-md">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h2 className="text-2xl font-bold text-[#0B2A4A]">Update Email Address</h2>

          <p className="text-sm text-gray-500 mt-1">Enter new email address</p>

        </div>

        <button onClick={() => setShowEmailModal(false)} className="w-10 h-10 rounded-full bg-[#F4F6F9] hover:bg-gray-200 flex items-center justify-center text-lg">x</button>

      </div>

      <div className="space-y-5">

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">Current Email</label>

          <input type="email" value={profileData.email} readOnly className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A] block mb-2">New Email</label>

          <input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} className="w-full bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none" />

        </div>

        <button onClick={() => { setProfileData({ ...profileData, email: emailForm.newEmail }); setEmailForm({ ...emailForm, newEmail: "" }); setShowEmailModal(false); }} className="w-full bg-[#0B2A4A] text-white py-4 rounded-2xl font-semibold">Submit</button>

      </div>

    </div>

  </div>

)}

{showRemarksModal && (



  <div

    className="fixed inset-0 z-50

    bg-black/40 backdrop-blur-sm

    flex items-center justify-center p-4"

  >



    <div

      className="bg-white w-full max-w-md

      rounded-3xl p-6 shadow-2xl

      animate-in fade-in zoom-in duration-200"

    >



      {/* HEADER */}



      <div className="flex items-center justify-between mb-5">



        <div>



          <h2 className="text-xl font-bold text-[#0B2A4A]">

            Admin Remarks

          </h2>



          <p className="text-xs text-gray-500 mt-1">

            Read only updates from admin

          </p>



        </div>



        <button

          onClick={() =>

            setShowRemarksModal(false)

          }

          className="w-9 h-9 rounded-full

          bg-[#F4F6F9]

          hover:bg-gray-200

          flex items-center justify-center"

        >

          âœ•

        </button>



      </div>



      {/* REMARK BOX */}



      <div

        className="min-h-[170px]

        bg-[#F8FAFC]

        border border-gray-200

        rounded-2xl p-5"

      >



        <p className="text-sm leading-7 text-gray-700 whitespace-pre-line">

          {selectedRemark}

        </p>



      </div>



    </div>



  </div>



)}

{/* ACTION REQUIRED POPUP MODAL */}
{showActionModal && (
  <div
    className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={() => setShowActionModal(false)}
  >
    <div
      className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-7 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-white">Action Required</h2>
            <p className="text-red-100 text-sm mt-0.5">Please resolve the following issues</p>
          </div>
        </div>
        <button
          onClick={() => setShowActionModal(false)}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white font-bold transition"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

        {/* Application-level remark */}
        {userRemarkData.hasRemark && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-lg mt-0.5">💬</span>
              <div>
                <p className="text-sm font-bold text-[#0B2A4A] mb-1">Admin Remark on Application</p>
                <p className="text-sm text-gray-700 leading-relaxed">{userRemarkData.remark}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rejected documents */}
        {uploadedDocuments.filter(d => d.status === "REJECTED").length > 0 && (
          <div>
            <p className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
              <span>❌</span> Documents Rejected — Re-upload Required
            </p>
            <div className="space-y-3">
              {uploadedDocuments.filter(d => d.status === "REJECTED").map((doc, idx) => {
                const docNames = {
                  PAN: "PAN Card", AADHAAR: "Aadhaar Card", AADHAAR_FRONT: "Aadhaar Front",
                  AADHAAR_BACK: "Aadhaar Back", LIGHT_BILL: "Light Bill", RENTAL_AGREEMENT: "Rental Agreement",
                  RC: "RC Book", INSURANCE: "Vehicle Insurance", SALARY_SLIP: "Salary Slip",
                  APPOINTMENT_LETTER: "Appointment Letter", ITR_RETURN: "ITR Copy",
                  BANK_STATEMENT: "Bank Statement", CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                  CAR_BACK_SIDE_PHOTO: "Car Back Photo",
                };
                const name = docNames[doc.documentType] || doc.documentType;
                return (
                  <div key={idx} className="bg-red-50 border border-red-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-[#0B2A4A] text-sm">{name}</span>
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED</span>
                    </div>
                    {doc.remarks && (
                      <p className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">💬</span>
                        <span><span className="font-semibold">Reason: </span>{doc.remarks}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents with remarks (not rejected) */}
        {uploadedDocuments.filter(d => d.remarks && d.status !== "REJECTED").length > 0 && (
          <div>
            <p className="text-sm font-bold text-amber-600 mb-3 flex items-center gap-2">
              <span>💬</span> Documents with Admin Remarks
            </p>
            <div className="space-y-3">
              {uploadedDocuments.filter(d => d.remarks && d.status !== "REJECTED").map((doc, idx) => {
                const docNames = {
                  PAN: "PAN Card", AADHAAR: "Aadhaar Card", AADHAAR_FRONT: "Aadhaar Front",
                  AADHAAR_BACK: "Aadhaar Back", LIGHT_BILL: "Light Bill", RENTAL_AGREEMENT: "Rental Agreement",
                  RC: "RC Book", INSURANCE: "Vehicle Insurance", SALARY_SLIP: "Salary Slip",
                  APPOINTMENT_LETTER: "Appointment Letter", ITR_RETURN: "ITR Copy",
                  BANK_STATEMENT: "Bank Statement", CAR_FRONT_SIDE_PHOTO: "Car Front Photo",
                  CAR_BACK_SIDE_PHOTO: "Car Back Photo",
                };
                const name = docNames[doc.documentType] || doc.documentType;
                return (
                  <div key={idx} className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-[#0B2A4A] text-sm">{name}</span>
                      <span className="bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{doc.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">💬</span>
                      <span><span className="font-semibold">Remark: </span>{doc.remarks}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No issues */}
        {!userRemarkData.hasRemark &&
          uploadedDocuments.filter(d => d.status === "REJECTED" || d.remarks).length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold">No pending actions</p>
            <p className="text-sm mt-1">Your application is progressing smoothly.</p>
          </div>
        )}

        {/* Go to Documents CTA */}
        {uploadedDocuments.filter(d => d.status === "REJECTED").length > 0 && (
          <button
            onClick={() => { setShowActionModal(false); setActiveMenu("Documents"); }}
            className="w-full bg-[#0B2A4A] hover:bg-[#123E68] text-white py-3.5 rounded-2xl font-semibold transition mt-2 flex items-center justify-center gap-2"
          >
            <span>📤</span> Go to Documents to Re-upload
          </button>
        )}
      </div>
    </div>
  </div>
)}

        </div>



      </div>



    </div>

  );

};

 

export default Dashboard;


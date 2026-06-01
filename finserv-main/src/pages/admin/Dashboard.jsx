import React, {

  useState,

  useEffect,

} from "react";



import { useNavigate } from "react-router-dom";



import Sidebar from "../../components/admin/Sidebar";

import api from "../../services/api";



const Dashboard = () => {



  const navigate = useNavigate();



  /* SIDEBAR */



  const [sidebarOpen, setSidebarOpen] =

    useState(true);



  const [activeMenu, setActiveMenu] =

    useState("Dashboard");



  /* SETTINGS */



  const [showPasswordForm, setShowPasswordForm] =

    useState(false);



  const [showPhoneModal, setShowPhoneModal] =

    useState(false);



  const [showEmailModal, setShowEmailModal] =

    useState(false);



  /* PROFILE */



  const [profileData, setProfileData] =

    useState({

      name: "Admin",

      phone: "9876543210",

      email: "admin@gmail.com",

      password: "",

    });



  /* PHONE FORM */



  const [phoneForm, setPhoneForm] =

    useState({

      currentPhone: "9876543210",

      newPhone: "",

      otp: "",

    });



  /* EMAIL FORM */



  const [emailForm, setEmailForm] =

    useState({

      currentEmail: "rahul@gmail.com",

      newEmail: "",

      otp: "",

    });



  /* USERS */

  const [selectedUser, setSelectedUser] = useState(null);

  const [users, setUsers] = useState([]);

  const [selectedUserDocuments, setSelectedUserDocuments] = useState([]);
  const [documentRemarks, setDocumentRemarks] = useState({});



  /* REMARKS */

  const [remarkUser, setRemarkUser] = useState(null);

  const [remarkText, setRemarkText] = useState("");



  /* DEALERS */

  const [selectedDealer, setSelectedDealer] = useState(null);

  const [dealers, setDealers] = useState([]);



    /* BANKS */

  const [selectedBank, setSelectedBank] = useState(null);

  const [banks, setBanks] = useState([]);

  const [showAddBankModal, setShowAddBankModal] = useState(false);

  const [newBankForm, setNewBankForm] = useState({
    bankName: "",
    representativeName: "",
    contactNumber: "",
    email: "",
  });



  /* STATUS */

  const [statusUser, setStatusUser] = useState(null);



  /* LIVE UPDATES */

  const [currentUpdate, setCurrentUpdate] = useState(0);

  const [liveUpdates, setLiveUpdates] = useState([

    {

      title: "System Active",

      description: "Admin dashboard is connected and monitoring live application feeds.",

      color: "bg-[#EAFBF8] text-[#0B2A4A]"

    }

  ]);



  const fetchAdminData = async () => {

    try {

      const appsRes = await api.get("/loan-applications/admin/all");

      const apps = appsRes.data || [];



      const dealersRes = await api.get("/dealer/all");

      const rawDealers = dealersRes.data.data || [];



      const banksRes = await api.get("/admin/banks");

      const rawBanks = banksRes.data || [];



      const uniqueUserIds = [...new Set(apps.map(a => a.userId).filter(Boolean))];

      const allDocsMap = {};

      

      await Promise.all(uniqueUserIds.map(async (userId) => {

        try {

          const docRes = await api.get(`/documents/user/${userId}`);

          allDocsMap[userId] = docRes.data.data || [];

        } catch (err) {

          console.error(`Error fetching docs for user ${userId}:`, err);

          allDocsMap[userId] = [];

        }

      }));



      const getDocName = (type) => {

        switch (type) {

          case "PAN": return "PAN Card";

          case "AADHAAR": return "Aadhar Card";

          case "AADHAAR_FRONT": return "Aadhaar Front";

          case "AADHAAR_BACK": return "Aadhaar Back";

          case "LIGHT_BILL": return "Light Bill";

          case "RENTAL_AGREEMENT": return "Rental Agreement";

          case "RC": return "RC Book";

          case "INSURANCE": return "Vehicle Insurance";

          case "SALARY_SLIP": return "Salary Slip";

          case "APPOINTMENT_LETTER": return "Appointment Letter";

          case "ITR_RETURN": return "ITR Copy";

          case "BANK_STATEMENT": return "Bank Statement";

          case "CAR_FRONT_SIDE_PHOTO": return "Car Front Photo";

          case "CAR_BACK_SIDE_PHOTO": return "Car Back Photo";

          default: return type;

        }

      };



      const mappedUsers = apps.map(app => {

        let displayStatus = "Documents yet to submit";

        if (app.status === "DOCUMENTS_SUBMITTED") displayStatus = "Documents Submitted";

        else if (app.status === "DOCUMENTS_VERIFIED") displayStatus = "Documents Verified";

        else if (app.status === "SENT_TO_BANK") displayStatus = "Sent To Bank";

        else if (app.status === "BANK_REVIEW") displayStatus = "Bank Review";

        else if (app.status === "APPROVED") displayStatus = "Loan Approved";

        else if (app.status === "REJECTED") displayStatus = "Rejected";



        const amountStr = app.loanAmount ? `₹${app.loanAmount.toLocaleString()}` : "₹0";



        const dateObj = new Date(app.createdAt);

        const options = { day: 'numeric', month: 'short', year: 'numeric' };

        const appliedDate = app.createdAt ? dateObj.toLocaleDateString('en-IN', options) : "N/A";



        const dealer = rawDealers.find(d => d.dealerId === app.dealerId);

        const savedBank = localStorage.getItem(`bank_assignment_${app.applicationNumber}`) || "";



        return {

          id: app.loanApplicationId,

          applicationNumber: app.applicationNumber,

          userId: app.userId,

          dealerId: app.dealerId,

          dealerCode: dealer ? dealer.dealerCode : "N/A",

          name: app.fullName || "N/A",

          mobile: app.mobileNumber || "N/A",

          amount: amountStr,

          rawAmount: app.loanAmount || 0,

          status: displayStatus,

          rawStatus: app.status,

          email: app.email || "N/A",

          address: `${app.address || ""}, ${app.city || ""}, ${app.state || ""} ${app.pincode || ""}`.trim().replace(/^,|,$/g, '').trim() || "N/A",

          car: "Mahindra Scorpio N",

          appliedDate: appliedDate,

          bank: savedBank,

          changed: false

        };

      });



      const mappedDealers = rawDealers.map(dlr => {

        const dlrUsers = mappedUsers.filter(u => u.dealerId === dlr.dealerId);

        return {

          id: dlr.dealerId,

          name: dlr.fullName || "N/A",

          code: dlr.dealerCode || "N/A",

          mobile: dlr.mobileNumber || "N/A",

          users: dlrUsers

        };

      });



      const mappedBanks = rawBanks.map(b => {

        const bankCases = mappedUsers.filter(u => u.bank === b.bankName);

        const totalCases = bankCases.length;

        const activeCases = bankCases.filter(u => u.status !== "Loan Approved" && u.status !== "Rejected").length;

        const approvedCases = bankCases.filter(u => u.status === "Loan Approved").length;

        const rejectedCases = bankCases.filter(u => u.status === "Rejected").length;



        return {

          id: b.bankId,

          bank: b.bankName || "N/A",

          representative: b.representativeName || "N/A",

          mobile: b.contactNumber || "N/A",

          email: b.email || "N/A",

          totalCases: totalCases || (b.bankId * 15 + 45),

          activeCases: activeCases || (b.bankId * 3 + 7),

          approvedCases: approvedCases || (b.bankId * 10 + 30),

          rejectedCases: rejectedCases || (b.bankId * 2 + 8)

        };

      });



      const updates = [];

      apps.forEach(app => {

        const name = app.fullName || "A user";

        const amtText = app.loanAmount ? `₹${app.loanAmount.toLocaleString()}` : "";

        

        if (app.status === "APPROVED") {

          updates.push({

            title: "Loan Approved",

            description: `Loan ${amtText ? "of " + amtText : ""} for ${name} is approved.`,

            color: "bg-green-100 text-green-600"

          });

        } else if (app.status === "SENT_TO_BANK") {

          const assignedBank = localStorage.getItem(`bank_assignment_${app.applicationNumber}`) || "bank partners";

          updates.push({

            title: "Sent to Bank",

            description: `Loan application for ${name} has been sent to ${assignedBank}.`,

            color: "bg-blue-100 text-blue-600"

          });

        } else if (app.status === "DOCUMENTS_SUBMITTED") {

          updates.push({

            title: "Documents Submitted",

            description: `${name} has submitted all loan documents for verification.`,

            color: "bg-purple-100 text-purple-600"

          });

        } else if (app.status === "PENDING") {

          updates.push({

            title: "New Application Draft",

            description: `${name} started a new loan application draft.`,

            color: "bg-yellow-100 text-yellow-600"

          });

        }



        const userDocs = allDocsMap[app.userId] || [];

        userDocs.forEach(doc => {

          const docName = getDocName(doc.documentType);

          if (doc.status === "APPROVED") {

            updates.push({

              title: "Document Approved",

              description: `Admin approved ${name}'s ${docName}.`,

              color: "bg-emerald-100 text-emerald-600"

            });

          } else if (doc.status === "REJECTED") {

            updates.push({

              title: "Document Rejected",

              description: `Admin rejected ${name}'s ${docName}.`,

              color: "bg-red-100 text-red-600"

            });

          } else if (doc.status === "VERIFIED") {

            updates.push({

              title: "Document Verified",

              description: `Admin verified ${name}'s ${docName}.`,

              color: "bg-cyan-100 text-cyan-600"

            });

          }



          if (doc.remarks) {

            updates.push({

              title: "Remark Added",

              description: `Admin added remark on ${name}'s ${docName}: "${doc.remarks}"`,

              color: "bg-amber-100 text-amber-600"

            });

          }

        });

      });



      if (updates.length === 0) {

        updates.push({

          title: "System Active",

          description: "Admin dashboard is connected and monitoring live application feeds.",

          color: "bg-[#EAFBF8] text-[#0B2A4A]"

        });

      }



      setUsers(mappedUsers);

      setDealers(mappedDealers);

      setBanks(mappedBanks);

      setLiveUpdates(updates);



      if (selectedUser) {

        const freshUser = mappedUsers.find(u => u.id === selectedUser.id);

        if (freshUser) setSelectedUser(freshUser);

      }

    } catch (err) {

      console.error("Error loading admin dashboard data:", err);

    }

  };



  useEffect(() => {

    fetchAdminData();

  }, [selectedUser?.id]);



  useEffect(() => {

    if (selectedUser) {

      api.get(`/documents/user/${selectedUser.userId}`)

        .then(res => {

          const docsData = res.data.data || [];
          setSelectedUserDocuments(docsData);
          const remarksMap = {};
          docsData.forEach(d => { remarksMap[d.documentId] = d.remarks || ''; });
          setDocumentRemarks(remarksMap);

        })

        .catch(err => {

          console.error("Error fetching user documents:", err);

          setSelectedUserDocuments([]);

        });

    } else {

      setSelectedUserDocuments([]);

    }

  }, [selectedUser?.userId]);



  const handleUpdateDocumentStatus = async (documentId, newStatus) => {

    try {

      // Save remark automatically if it has been added or edited
      const typedRemark = documentRemarks[documentId];
      const originalDoc = selectedUserDocuments.find(d => d.documentId === documentId);
      const originalRemark = originalDoc?.remarks || "";
      if (typedRemark !== undefined && typedRemark !== null && typedRemark !== originalRemark) {
        await api.put(`/documents/${documentId}/remarks`, { remarks: typedRemark });
      }

      await api.put(`/documents/status/${documentId}?status=${newStatus}`);

      alert(`Document status updated to ${newStatus}`);

      if (selectedUser) {

        const res = await api.get(`/documents/user/${selectedUser.userId}`);

        const _docsData = res.data.data || [];
          setSelectedUserDocuments(_docsData);
          const _rMap = {};
          _docsData.forEach(d => { _rMap[d.documentId] = d.remarks || ''; });
          setDocumentRemarks(_rMap);

      }

      fetchAdminData();

    } catch (err) {

      console.error("Failed to update document status:", err);

      alert(err?.response?.data?.message || "Failed to update document status");

    }

  };



  const handleSaveDocumentRemark = async (documentId, remarks) => {

    try {

      await api.put(`/documents/${documentId}/remarks`, { remarks });

      alert("Remark saved successfully");

      if (selectedUser) {

        const res = await api.get(`/documents/user/${selectedUser.userId}`);

        const _docsData = res.data.data || [];
          setSelectedUserDocuments(_docsData);
          const _rMap = {};
          _docsData.forEach(d => { _rMap[d.documentId] = d.remarks || ''; });
          setDocumentRemarks(_rMap);

      }

      fetchAdminData();

    } catch (err) {

      console.error("Failed to save document remark:", err);

      alert(err?.response?.data?.message || "Failed to save document remark");

    }

  };



  useEffect(() => {

    if (liveUpdates.length <= 1) return;

    const interval = setInterval(() => {

      setCurrentUpdate((prev) =>

        prev >= liveUpdates.length - 1 ? 0 : prev + 1

      );

    }, 3000);

    return () => clearInterval(interval);

  }, [liveUpdates.length]);



    /* ADD BANK HANDLER */

  const handleAddBank = async (e) => {
    e.preventDefault();

    if (!newBankForm.bankName.trim()) {
      alert("Bank Name is required.");
      return;
    }
    if (newBankForm.bankName.length > 50) {
      alert("Bank Name must be less than 50 characters.");
      return;
    }
    if (!newBankForm.representativeName.trim()) {
      alert("Representative Name is required.");
      return;
    }
    if (!newBankForm.contactNumber.trim()) {
      alert("Contact Number is required.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(newBankForm.contactNumber)) {
      alert("Invalid Contact Number. Must be a 10-digit number starting with 6, 7, 8, or 9.");
      return;
    }
    if (!newBankForm.email.trim()) {
      alert("Email is required.");
      return;
    }
    if (!/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/.test(newBankForm.email)) {
      alert("Invalid Email Format.");
      return;
    }

    try {
      await api.post("/admin/banks", newBankForm);
      alert("Bank added successfully!");
      setNewBankForm({
        bankName: "",
        representativeName: "",
        contactNumber: "",
        email: "",
      });
      setShowAddBankModal(false);
      fetchAdminData();
    } catch (err) {
      console.error("Failed to add bank:", err);
      alert(err.response?.data || "Failed to add bank. Please make sure the bank name, email, or contact number does not already exist.");
    }
  };



  /* LOGOUT */



  const handleLogout = () => {



    localStorage.removeItem("token");



    localStorage.removeItem("user");



    localStorage.removeItem("role");



    navigate("/", {

      replace: true,

    });

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



      {/* MAIN CONTENT */}



      <div className="flex-1 overflow-y-auto">

        {/* TOPBAR */}



        <div className="bg-white px-8 py-5 shadow-sm flex items-center justify-between">

          <div>

            <h1 className="text-3xl font-bold text-[#0B2A4A]">

              {activeMenu}

            </h1>



            <p className="text-gray-500 mt-1">

              Welcome back ADMIN 👋

            </p>

          </div>

        </div>



        {/* PAGE CONTENT */}



        <div className="p-8">

          {/* DASHBOARD */}



          {activeMenu === "Dashboard" && (

            <div className="space-y-8">

              {/* TOP STATS */}



              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">



  {/* TOTAL APPLICATIONS */}



  <div className="bg-gradient-to-br from-[#0B2A4A] to-[#123E68]

  rounded-3xl p-7 shadow-xl text-white relative overflow-hidden">



    <div className="absolute right-[-20px] top-[-20px]

    w-32 h-32 bg-white/5 rounded-full"></div>



    <p className="text-sm text-gray-300 tracking-wide">

      Total Applications

    </p>



    <h2 className="text-5xl font-bold mt-4">

      {users.length}

    </h2>



    <div className="mt-5 flex items-center justify-between">



      <p className="text-sm text-[#27D3C3] font-semibold">

        ↑ 18% This Month

      </p>



      <div className="bg-white/10 px-3 py-1 rounded-xl text-xs">

        LIVE

      </div>



    </div>



  </div>



  {/* ACTIVE DEALERS */}



  <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100">



    <div className="flex items-center justify-between">



      <div>



        <p className="text-sm text-gray-500 tracking-wide">

          Active Dealers

        </p>



        <h2 className="text-5xl font-bold text-[#0B2A4A] mt-4">

          {dealers.length}

        </h2>



      </div>



      <div className="w-16 h-16 rounded-2xl

      bg-[#EAFBF8] flex items-center justify-center

      text-3xl">

        🚘

      </div>



    </div>



    <div className="mt-6">



      <div className="flex items-center justify-between text-sm">



        <span className="text-gray-500">

          Dealer Performance

        </span>



        <span className="font-bold text-[#27D3C3]">

          92%

        </span>



      </div>



      <div className="w-full h-3 bg-gray-100 rounded-full mt-3 overflow-hidden">



        <div

          className="h-full bg-[#27D3C3] rounded-full"

          style={{ width: "92%" }}

        ></div>



      </div>



    </div>



  </div>



  {/* LOANS APPROVED */}



  <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100">



    <div className="flex items-center justify-between">



      <div>



        <p className="text-sm text-gray-500 tracking-wide">

          Loans Approved

        </p>



        <h2 className="text-5xl font-bold text-[#0B2A4A] mt-4">

          {users.filter(u => u.status === "Loan Approved" || u.rawStatus === "APPROVED").length}

        </h2>



      </div>



      <div className="w-16 h-16 rounded-2xl

      bg-[#EEF6FF] flex items-center justify-center

      text-3xl">

        ✅

      </div>



    </div>



    <div className="mt-6 flex items-center justify-between">



      <div>



        <p className="text-xs text-gray-500">

          Approval Ratio

        </p>



        <h3 className="text-xl font-bold text-[#0B2A4A] mt-1">

          78%

        </h3>



      </div>



      <div className="bg-green-100 text-green-600

      px-4 py-2 rounded-xl text-sm font-semibold">

        Excellent

      </div>



    </div>



  </div>



  {/* BANK PARTNERS */}



  <div className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100">



    <div className="flex items-center justify-between">



      <div>



        <p className="text-sm text-gray-500 tracking-wide">

          Bank Partners

        </p>



        <h2 className="text-5xl font-bold text-[#0B2A4A] mt-4">

          {banks.length}

        </h2>



      </div>



      <div className="w-16 h-16 rounded-2xl

      bg-[#FFF4E5] flex items-center justify-center

      text-3xl">

        🏦

      </div>



    </div>



    <div className="mt-6 space-y-3">



      <div className="flex items-center justify-between">



        <span className="text-sm text-gray-500">

          Fastest Bank

        </span>



        <span className="text-sm font-bold text-[#0B2A4A]">

          HDFC

        </span>



      </div>



      <div className="flex items-center justify-between">



        <span className="text-sm text-gray-500">

          Avg Approval

        </span>



        <span className="text-sm font-bold text-[#27D3C3]">

          2.4 Days

        </span>



      </div>



    </div>



  </div>



</div>



              {/* QUICK VIEW */}



              <div className="bg-white rounded-3xl p-8 shadow-sm mt-8">

                <div className="flex items-center justify-between mb-8">

                  <div>

                    <h2 className="text-3xl font-bold text-[#0B2A4A]">

                      Quick View

                    </h2>



                    <p className="text-gray-500 mt-2">

                      Real-time loan and bank updates

                    </p>

                  </div>



                  <div className="flex items-center gap-2">

                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>



                    <span className="text-sm text-green-600 font-medium">

                      Live Updates

                    </span>

                  </div>

                </div>



                {/* TOP LIVE ALERT */}



                <div className="mb-8 overflow-hidden">

                  <div

                    key={currentUpdate}

                    className="bg-[#0B2A4A] text-white rounded-2xl p-5

                    animate-[pulse_1s_ease-in-out]

                    flex items-center justify-between gap-5"

                  >

                    <div className="flex items-center gap-4">

                      <div className="w-14 h-14 rounded-2xl bg-[#27D3C3] text-[#0B2A4A]

                      flex items-center justify-center text-2xl font-bold">

                        !

                      </div>



                      <div>

                        <h3 className="text-xl font-bold">

                          {liveUpdates[currentUpdate].title}

                        </h3>



                        <p className="text-gray-300 mt-1">

                          {

                            liveUpdates[

                              currentUpdate

                            ].description

                          }

                        </p>

                      </div>

                    </div>



                    <div className="text-sm text-[#27D3C3] whitespace-nowrap font-medium">

                      New Update

                    </div>

                  </div>

                </div>



                {/* UPDATE LIST */}



                <div className="space-y-5">

                  {liveUpdates.map(

                    (item, index) => (

                      <div

                        key={index}

                        className={`flex items-start gap-5 rounded-2xl p-5 transition-all duration-500



                        ${

                          currentUpdate === index

                            ? "bg-[#EAFBF8] scale-[1.01] border border-[#27D3C3]"

                            : "bg-[#F4F6F9]"

                        }`}

                      >

                        <div

                          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg ${item.color}`}

                        >

                          !

                        </div>



                        <div className="flex-1">

                          <h3 className="text-lg font-bold text-[#0B2A4A]">

                            {item.title}

                          </h3>



                          <p className="text-gray-500 mt-1">

                            {item.description}

                          </p>

                        </div>



                        <p className="text-sm text-gray-400 whitespace-nowrap">

                          {currentUpdate === index

                            ? "Just Now"

                            : "2 min ago"}

                        </p>

                      </div>

                    )

                  )}

                </div>

              </div>

            </div>

          )}



          {/* USER SECTION */}



          {activeMenu === "User" && (

  <div className="space-y-6">

    <div className="bg-white rounded-3xl p-8 shadow-sm">

      <h2 className="text-3xl font-bold text-[#0B2A4A]">

        User Management

      </h2>



      <p className="text-gray-500 mt-2">

        Manage all registered users and loan applications

      </p>

    </div>



    <div className="bg-white rounded-3xl p-8 shadow-sm overflow-x-auto">

      <table className="w-full">

        <thead>

          <tr className="text-left border-b border-gray-200">

            <th className="pb-4 text-gray-500 font-semibold">

              Name

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Mobile Number

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Amount Required

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Assign To Bank

            </th>



            {/* NEW REMARKS COLUMN */}

            <th className="pb-4 text-gray-500 font-semibold">

              Remarks

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Status

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Action

            </th>

          </tr>

        </thead>



        <tbody>

          {users.map((user) => (

            <tr

              key={user.id}

              className="border-b border-gray-100 hover:bg-gray-50 transition"

            >

              {/* NAME */}

              <td className="py-5 font-semibold text-[#0B2A4A]">

                {user.name}

              </td>



              {/* MOBILE */}

              <td className="py-5 text-gray-600">

                {user.mobile}

              </td>



              {/* AMOUNT */}

              <td className="py-5 text-gray-600">

                {user.amount}

              </td>



              {/* BANK DROPDOWN */}

              <td className="py-5">

                <div className="flex items-center gap-2">

                  <select

                    value={user.bank}

                    onChange={(e) => {

                      const updatedUsers = users.map((u) => {

                        if (u.id === user.id) {

                          return {

                            ...u,

                            bank: e.target.value,

                            changed: true,

                          };

                        }



                        return u;

                      });



                      setUsers(updatedUsers);

                    }}

                    className="bg-[#F4F6F9] border border-gray-200

                    px-4 py-2 rounded-xl outline-none

                    text-[#0B2A4A] font-medium"

                  >

                    <option value="">

                      Select Bank

                    </option>



                    {banks.map((bank) => (

                      <option

                        key={bank.id}

                        value={bank.bank}

                      >

                        {bank.bank}

                      </option>

                    ))}

                  </select>



                  {user.changed && (

                    <button

                      onClick={async () => {

                        try {

                          localStorage.setItem(`bank_assignment_${user.applicationNumber}`, user.bank);

                          await api.put(`/loan-applications/status/${user.applicationNumber}?status=SENT_TO_BANK`);

                          alert(`Loan application assigned to ${user.bank} successfully!`);

                          fetchAdminData();

                        } catch (err) {

                          console.error("Failed to assign bank:", err);

                          alert("Failed to assign bank.");

                        }

                      }}

                      className="bg-[#27D3C3] hover:bg-[#1fb5a7]

                      text-[#0B2A4A] px-3 py-2 rounded-xl

                      text-sm font-semibold transition"

                    >

                      Submit

                    </button>

                  )}

                </div>

              </td>





              {/* STATUS */}

              <td className="py-5">

                <button

                  onClick={() =>

                    setStatusUser(user)

                  }

                  className="bg-[#27D3C3] hover:bg-[#1fb5a7]

                  text-[#0B2A4A] px-4 py-2 rounded-xl

                  text-sm font-semibold transition"

                >

                  View Status

                </button>

              </td>



              {/* ACTION */}

<td className="py-5">

  <div className="flex items-center gap-3">



    {/* VIEW DETAILS BUTTON */}

    <button

      onClick={() =>

        setSelectedUser(user)

      }

      className="bg-[#0B2A4A] hover:bg-[#081f36]

      text-white px-5 py-2 rounded-xl text-sm transition"

    >

      View Details

    </button>



    </div>

</td>{/* REMARK POPUP */}

{remarkUser && (

  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">



    <div className="bg-white rounded-3xl p-6 w-[400px] shadow-2xl relative">



      {/* CLOSE BUTTON */}

      <button

        onClick={() => setRemarkUser(null)}

        className="absolute top-4 right-4 text-gray-400

        hover:text-black text-xl"

      >

        ✕

      </button>



      <h2 className="text-2xl font-bold text-[#0B2A4A] mb-2">

        Add Remarks

      </h2>



      <p className="text-gray-500 mb-5">

        Remarks for {remarkUser.name}

      </p>



      {/* 4x4 REMARK BOX */}

      <textarea

        rows={4}

        cols={4}

        value={remarkText}

        onChange={(e) =>

          setRemarkText(e.target.value)

        }

        placeholder="Write remarks here..."

        className="w-full border border-gray-200

        rounded-2xl p-4 outline-none

        bg-[#F4F6F9] resize-none

        text-[#0B2A4A]"

      />



      {/* BUTTONS */}

      <div className="flex justify-end gap-3 mt-5">



        <button

          onClick={() => setRemarkUser(null)}

          className="px-5 py-2 rounded-xl

          border border-gray-300

          text-gray-600 hover:bg-gray-100 transition"

        >

          Cancel

        </button>



        <button

          onClick={async () => {

            try {

              await api.put(`/loan-applications/status/${remarkUser.applicationNumber}?remark=${encodeURIComponent(remarkText)}`);

              alert("Remark saved successfully!");

              fetchAdminData();

              setRemarkUser(null);

              setRemarkText("");

            } catch (err) {

              console.error("Failed to save remark:", err);

              alert("Failed to save remark.");

            }

          }}

          className="bg-[#0B2A4A]

          hover:bg-[#081f36]

          text-white px-5 py-2

          rounded-xl transition"

        >

          Send Remark →

        </button>



      </div>

    </div>

  </div>

)}

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>

)}



          {/* DEALER SECTION */}



          {activeMenu === "Dealer" && (

            <div className="space-y-6">

              <div className="bg-white rounded-3xl p-8 shadow-sm">

                <h2 className="text-3xl font-bold text-[#0B2A4A]">

                  Dealer Management

                </h2>



                <p className="text-gray-500 mt-2">

                  Manage all registered dealers

                </p>

              </div>



              <div className="bg-white rounded-3xl p-8 shadow-sm overflow-x-auto">

                <table className="w-full">

                  <thead>

                    <tr className="text-left border-b border-gray-200">

                      <th className="pb-4 text-gray-500 font-semibold">

                        Dealer Name

                      </th>



                      <th className="pb-4 text-gray-500 font-semibold">

                        Dealer Code

                      </th>



                      <th className="pb-4 text-gray-500 font-semibold">

                        Number

                      </th>



                      <th className="pb-4 text-gray-500 font-semibold">

                        Users

                      </th>



                      <th className="pb-4 text-gray-500 font-semibold">

                        Action

                      </th>

                    </tr>

                  </thead>



                  <tbody>

                    {dealers.map((dealer) => (

                      <tr

                        key={dealer.id}

                        className="border-b border-gray-100 hover:bg-gray-50 transition"

                      >

                        <td className="py-5 font-semibold text-[#0B2A4A]">

                          {dealer.name}

                        </td>



                        <td className="py-5 text-gray-600">

                          {dealer.code}

                        </td>



                        <td className="py-5 text-gray-600">

                          {dealer.mobile}

                        </td>



                        <td className="py-5 text-gray-600">

                          {dealer.users.length}

                        </td>



                        <td className="py-5">

                          <button

                            onClick={() =>

                              setSelectedDealer(

                                dealer

                              )

                            }

                            className="bg-[#0B2A4A] hover:bg-[#081f36]

                            text-white px-5 py-2 rounded-xl text-sm transition"

                          >

                            View Details

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          )}



          {/* DEALER DETAILS POPUP */}



          {selectedDealer && (

            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

              <div className="bg-white w-full max-w-6xl rounded-3xl p-8 overflow-y-auto max-h-[90vh]">

                <div className="flex items-center justify-between mb-8">

                  <div>

                    <h2 className="text-3xl font-bold text-[#0B2A4A]">

                      Dealer Details

                    </h2>



                    <p className="text-gray-500 mt-1">

                      {selectedDealer.name}

                    </p>

                  </div>



                  <button

                    onClick={() =>

                      setSelectedDealer(null)

                    }

                    className="text-2xl text-gray-400 hover:text-red-500"

                  >

                    ✕

                  </button>

                </div>



                <div className="bg-[#F4F6F9] rounded-3xl p-6 overflow-x-auto">

                  <table className="w-full">

                    <thead>

                      <tr className="text-left border-b border-gray-200">

                        <th className="pb-4">

                          User Name

                        </th>



                        <th className="pb-4">

                          Car Selected

                        </th>



                        <th className="pb-4">

                          Loan Amount

                        </th>



                        <th className="pb-4">

                          Date Applied

                        </th>



                        <th className="pb-4">

                          Loan Status

                        </th>

                      </tr>

                    </thead>



                    <tbody>

                      {selectedDealer.users.map(

                        (user) => (

                          <tr

                            key={user.id}

                            className="border-b border-gray-200"

                          >

                            <td className="py-5">

                              <button

                                onClick={() =>

                                  setSelectedUser(

                                    user

                                  )

                                }

                                className="text-[#0B2A4A] font-semibold hover:underline"

                              >

                                {user.name}

                              </button>

                            </td>



                            <td className="py-5">

                              {user.car}

                            </td>



                            <td className="py-5">

                              {user.amount}

                            </td>



                            <td className="py-5">

                              {

                                user.appliedDate

                              }

                            </td>



                            <td className="py-5">

                              <button

                                onClick={() =>

                                  setStatusUser(

                                    user

                                  )

                                }

                                className="bg-[#27D3C3] hover:bg-[#1fb5a7]

                                text-[#0B2A4A] px-4 py-2 rounded-xl

                                text-sm font-semibold transition"

                              >

                                View Status

                              </button>

                            </td>

                          </tr>

                        )

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          )}



          {/* USER DETAILS POPUP */}



          {selectedUser && (

            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

              <div className="bg-white w-full max-w-4xl rounded-3xl p-8 overflow-y-auto max-h-[90vh]">

                <div className="flex items-center justify-between mb-8">

                  <div>

                    <h2 className="text-3xl font-bold text-[#0B2A4A]">

                      User Details

                    </h2>



                    <p className="text-gray-500 mt-1">

                      Complete application and KYC details

                    </p>

                  </div>



                  <button

                    onClick={() =>

                      setSelectedUser(null)

                    }

                    className="text-2xl text-gray-400 hover:text-red-500"

                  >

                    ✕

                  </button>

                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="bg-gray-50 rounded-2xl p-5">

                    <p className="text-sm text-gray-500">

                      Full Name

                    </p>



                    <h3 className="text-lg font-bold text-[#0B2A4A] mt-2">

                      {selectedUser.name}

                    </h3>

                  </div>



                  <div className="bg-gray-50 rounded-2xl p-5">

                    <p className="text-sm text-gray-500">

                      Mobile Number

                    </p>



                    <h3 className="text-lg font-bold text-[#0B2A4A] mt-2">

                      {selectedUser.mobile}

                    </h3>

                  </div>



                  <div className="bg-gray-50 rounded-2xl p-5">

                    <p className="text-sm text-gray-500">

                      Email

                    </p>



                    <h3 className="text-lg font-bold text-[#0B2A4A] mt-2">

                      {selectedUser.email}

                    </h3>

                  </div>



                  <div className="bg-gray-50 rounded-2xl p-5">

                    <p className="text-sm text-gray-500">

                      Address

                    </p>



                    <h3 className="text-lg font-bold text-[#0B2A4A] mt-2">

                      {selectedUser.address}

                    </h3>

                  </div>

                </div>



                {/* KYC */}

                <div className="mt-10">

                  <h2 className="text-2xl font-bold text-[#0B2A4A] mb-6">

                    KYC Documents

                  </h2>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {selectedUserDocuments.length === 0 ? (

                      <p className="text-gray-500 col-span-2 py-4 text-center">No documents uploaded for this application yet.</p>

                    ) : (

                      selectedUserDocuments.map((doc, index) => {

                        const getDocFriendlyName = (type) => {

                          switch (type) {

                            case "PAN": return "PAN Card";

                            case "AADHAAR": return "Aadhar Card";

                            case "AADHAAR_FRONT": return "Aadhaar Front";

                            case "AADHAAR_BACK": return "Aadhaar Back";

                            case "LIGHT_BILL": return "Light Bill";

                            case "RENTAL_AGREEMENT": return "Rental Agreement";

                            case "RC": return "RC Book";

                            case "INSURANCE": return "Vehicle Insurance";

                            case "SALARY_SLIP": return "Salary Slip";

                            case "APPOINTMENT_LETTER": return "Appointment Letter";

                            case "ITR_RETURN": return "ITR Copy";

                            case "BANK_STATEMENT": return "Bank Statement";

                            case "CAR_FRONT_SIDE_PHOTO": return "Car Front Photo";

                            case "CAR_BACK_SIDE_PHOTO": return "Car Back Photo";

                            default: return type;

                          }

                        };



                        return (

                          <div

                            key={doc.documentId || index}

                            className="bg-[#F4F6F9] rounded-2xl p-5 flex flex-col justify-between gap-4 border border-gray-100"

                          >

                            <div className="flex items-start justify-between">

                              <div>

                                <h3 className="font-semibold text-[#0B2A4A] text-lg">

                                  {getDocFriendlyName(doc.documentType)}

                                </h3>

                                <p className="text-xs text-gray-400 mt-1">

                                  Filename: {doc.fileName}

                                </p>

                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-2

                                  ${doc.status === "APPROVED" ? "bg-green-100 text-green-700" :

                                    doc.status === "VERIFIED" ? "bg-blue-100 text-blue-700" :

                                    doc.status === "REJECTED" ? "bg-red-100 text-red-700" :

                                    "bg-yellow-100 text-yellow-700"}`}>

                                  {doc.status}

                                </span>

                              </div>



                              <button

                                onClick={() => window.open(`http://localhost:8081/api/documents/preview/${doc.documentId}`, "_blank")}

                                className="bg-[#0B2A4A] hover:bg-[#081f36] text-white px-4 py-2 rounded-xl text-sm transition"

                              >

                                View File

                              </button>

                            </div>



                            {doc.remarks && (

                              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-xs text-yellow-800">

                                <span className="font-bold text-amber-700">Admin Remark:</span> {doc.remarks}

                              </div>

                            )}



                            <div className="flex flex-col gap-2 border-t border-gray-200 pt-3">

                              <div className="flex items-center gap-2">

                                {doc.status === "PENDING" && (

                                  <>

                                    <button

                                      onClick={() => handleUpdateDocumentStatus(doc.documentId, "VERIFIED")}

                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                    >

                                      Verify

                                    </button>

                                    <button

                                      onClick={() => handleUpdateDocumentStatus(doc.documentId, "REJECTED")}

                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                    >

                                      Reject

                                    </button>

                                  </>

                                )}

                                {doc.status === "VERIFIED" && (

                                  <>

                                    <button

                                      onClick={() => handleUpdateDocumentStatus(doc.documentId, "APPROVED")}

                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                    >

                                      Approve

                                    </button>

                                    <button

                                      onClick={() => handleUpdateDocumentStatus(doc.documentId, "REJECTED")}

                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                    >

                                      Reject

                                    </button>

                                  </>

                                )}

                                {doc.status === "APPROVED" && (

                                  <button

                                    onClick={() => handleUpdateDocumentStatus(doc.documentId, "REJECTED")}

                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                  >

                                    Reject Approved Doc

                                  </button>

                                )}

                                {doc.status === "REJECTED" && (

                                  <button

                                    onClick={() => handleUpdateDocumentStatus(doc.documentId, "VERIFIED")}

                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-medium transition"

                                  >

                                    Verify Rejected Doc

                                  </button>

                                )}

                              </div>



                                                            <div className="flex gap-2 items-center mt-2">
                                <input
                                  type="text"
                                  placeholder="Add remark for this document..."
                                  value={documentRemarks[doc.documentId] !== undefined ? documentRemarks[doc.documentId] : (doc.remarks || '')}
                                  onChange={(e) => setDocumentRemarks(prev => ({ ...prev, [doc.documentId]: e.target.value }))}
                                  id={`remark-input-${doc.documentId}`}
                                  className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#27D3C3]"
                                />
                                <button
                                  onClick={() => {
                                    const val = (documentRemarks[doc.documentId] || '').trim();
                                    if (val) handleSaveDocumentRemark(doc.documentId, val);
                                  }}
                                  className="bg-[#27D3C3] hover:bg-[#1fb5a7] text-[#0B2A4A] text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                                >
                                  Save
                                </button>
                              </div>

                            </div>

                          </div>

                        );

                      })

                    )}

                  </div>

                </div>

              </div>

            </div>

          )}



            {/* REPORTS SECTION */}



{activeMenu === "Reports" && (



  <div className="space-y-8">



    {/* HEADER */}



    <div className="bg-white rounded-3xl p-8 shadow-sm flex items-center justify-between">



      <div>



        <h2 className="text-3xl font-bold text-[#0B2A4A]">

          Annual Sales Reports

        </h2>



        <p className="text-gray-500 mt-2">

          Dealer performance and yearly revenue analytics

        </p>



      </div>



      <button

        className="bg-[#0B2A4A] hover:bg-[#081f36]

        text-white px-6 py-3 rounded-2xl transition"

      >

        View Sales Since 2019 →

      </button>



    </div>



    {/* TOP SUMMARY CARDS */}



    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">



      <div className="bg-white rounded-3xl p-6 shadow-sm">



        <p className="text-gray-500 text-sm">

          Total Revenue 2026

        </p>



        <h2 className="text-4xl font-bold text-[#0B2A4A] mt-3">

          ₹12.8Cr

        </h2>



        <p className="text-green-600 mt-3 text-sm">

          ↑ 18% from last year

        </p>



      </div>



      <div className="bg-white rounded-3xl p-6 shadow-sm">



        <p className="text-gray-500 text-sm">

          Best Performing Dealer

        </p>



        <h2 className="text-3xl font-bold text-[#0B2A4A] mt-3">

          Shiv Motors

        </h2>



        <p className="text-[#27D3C3] mt-3 text-sm">

          Revenue: ₹4.2Cr

        </p>



      </div>



      <div className="bg-white rounded-3xl p-6 shadow-sm">



        <p className="text-gray-500 text-sm">

          Total Loans Processed

        </p>



        <h2 className="text-4xl font-bold text-[#0B2A4A] mt-3">

          1,284

        </h2>



        <p className="text-green-600 mt-3 text-sm">

          ↑ 12% growth

        </p>



      </div>



    </div>



    {/* CHART SECTION */}



    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">



      {/* CHART 1 */}



      <div className="bg-white rounded-3xl p-8 shadow-sm">



        <div className="flex items-center justify-between mb-8">



          <div>



            <h2 className="text-2xl font-bold text-[#0B2A4A]">

              Dealer Revenue

            </h2>



            <p className="text-gray-500 mt-1">

              Annual dealer sales comparison

            </p>



          </div>



          <button

            className="bg-[#27D3C3] hover:bg-[#1fb5a7]

            text-[#0B2A4A] px-5 py-2 rounded-xl font-semibold transition"

          >

            →

          </button>



        </div>



        {/* BAR GRAPH */}



        <div className="space-y-6">



          {[

            {

              dealer: "Shiv Motors",

              value: "₹4.2Cr",

              width: "90%",

            },



            {

              dealer: "Patil Auto",

              value: "₹3.4Cr",

              width: "72%",

            },



            {

              dealer: "Sai Vehicles",

              value: "₹2.8Cr",

              width: "60%",

            },



            {

              dealer: "Om Cars",

              value: "₹1.9Cr",

              width: "40%",

            },

          ].map((item, index) => (



            <div key={index}>



              <div className="flex items-center justify-between mb-2">



                <h3 className="font-semibold text-[#0B2A4A]">

                  {item.dealer}

                </h3>



                <p className="text-sm text-gray-500">

                  {item.value}

                </p>



              </div>



              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">



                <div

                  className="h-full rounded-full bg-[#27D3C3]"

                  style={{

                    width: item.width,

                  }}

                ></div>



              </div>



            </div>

          ))}



        </div>



        {/* SUMMARY */}



        <div className="mt-8 bg-[#F4F6F9] rounded-2xl p-5">



          <h3 className="font-bold text-[#0B2A4A] text-lg">

            Report Summary

          </h3>



          <p className="text-gray-600 mt-2 leading-7">

            Shiv Motors recorded the highest

            annual sales revenue in 2026 with

            ₹4.2Cr in processed vehicle loans.

            Patil Auto maintained consistent

            growth throughout the year with

            strong SUV segment sales.

          </p>



        </div>



      </div>



      {/* CHART 2 */}



      <div className="bg-white rounded-3xl p-8 shadow-sm">



        <div className="flex items-center justify-between mb-8">



          <div>



            <h2 className="text-2xl font-bold text-[#0B2A4A]">

              Sales Per Year

            </h2>



            <p className="text-gray-500 mt-1">

              Revenue growth from 2019

            </p>



          </div>



          <button

            className="bg-[#0B2A4A] hover:bg-[#081f36]

            text-white px-5 py-2 rounded-xl transition"

          >

            2019 - 2026

          </button>



        </div>



        {/* LINE GRAPH */}



        <div className="flex items-end justify-between h-72 gap-4">



          {[

            {

              year: "2019",

              value: "25%",

            },



            {

              year: "2020",

              value: "38%",

            },



            {

              year: "2021",

              value: "52%",

            },



            {

              year: "2022",

              value: "65%",

            },



            {

              year: "2023",

              value: "74%",

            },



            {

              year: "2024",

              value: "82%",

            },



            {

              year: "2025",

              value: "90%",

            },



            {

              year: "2026",

              value: "100%",

            },

          ].map((item, index) => (



            <div

              key={index}

              className="flex flex-col items-center flex-1"

            >



              <div

                className="w-full bg-[#0B2A4A] rounded-t-2xl transition-all duration-500 hover:bg-[#27D3C3]"

                style={{

                  height: item.value,

                }}

              ></div>



              <p className="text-sm text-gray-500 mt-3">

                {item.year}

              </p>



            </div>

          ))}



        </div>



        {/* SUMMARY */}



        <div className="mt-8 bg-[#F4F6F9] rounded-2xl p-5">



          <h3 className="font-bold text-[#0B2A4A] text-lg">

            Yearly Insights

          </h3>



          <p className="text-gray-600 mt-2 leading-7">

            Vehicle loan processing has shown

            continuous growth since 2019.

            Revenue doubled after 2022 due to

            increased dealer onboarding and

            faster loan approvals. 2026 marks

            the highest recorded sales cycle.

          </p>



        </div>



      </div>



    </div>



    {/* PERFORMANCE TABLE */}



    <div className="bg-white rounded-3xl p-8 shadow-sm overflow-x-auto">



      <div className="flex items-center justify-between mb-8">



        <div>



          <h2 className="text-2xl font-bold text-[#0B2A4A]">

            Dealer Performance By Year

          </h2>



          <p className="text-gray-500 mt-1">

            Best dealer and revenue statistics

          </p>



        </div>



      </div>



      <table className="w-full">



        <thead>



          <tr className="border-b border-gray-200 text-left">



            <th className="pb-4 text-gray-500 font-semibold">

              Year

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Best Dealer

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Revenue

            </th>



            <th className="pb-4 text-gray-500 font-semibold">

              Growth

            </th>



          </tr>



        </thead>



        <tbody>



          {[

            {

              year: "2019",

              dealer: "Sai Vehicles",

              revenue: "₹85L",

              growth: "+12%",

            },



            {

              year: "2020",

              dealer: "Patil Auto",

              revenue: "₹1.2Cr",

              growth: "+18%",

            },



            {

              year: "2021",

              dealer: "Shiv Motors",

              revenue: "₹1.8Cr",

              growth: "+26%",

            },



            {

              year: "2022",

              dealer: "Shiv Motors",

              revenue: "₹2.6Cr",

              growth: "+34%",

            },



            {

              year: "2023",

              dealer: "Patil Auto",

              revenue: "₹3.1Cr",

              growth: "+42%",

            },



            {

              year: "2024",

              dealer: "Shiv Motors",

              revenue: "₹3.8Cr",

              growth: "+49%",

            },



            {

              year: "2025",

              dealer: "Shiv Motors",

              revenue: "₹4.0Cr",

              growth: "+56%",

            },



            {

              year: "2026",

              dealer: "Shiv Motors",

              revenue: "₹4.2Cr",

              growth: "+61%",

            },

          ].map((item, index) => (



            <tr

              key={index}

              className="border-b border-gray-100 hover:bg-gray-50 transition"

            >



              <td className="py-5 font-semibold text-[#0B2A4A]">

                {item.year}

              </td>



              <td className="py-5 text-gray-600">

                {item.dealer}

              </td>



              <td className="py-5 text-gray-600">

                {item.revenue}

              </td>



              <td className="py-5">



                <span className="bg-green-100 text-green-600 px-4 py-2 rounded-xl text-sm font-semibold">

                  {item.growth}

                </span>



              </td>



            </tr>

          ))}



        </tbody>



      </table>



    </div>



  </div>



)}

          {/* STATUS POPUP */}



          {statusUser && (

<div

  onClick={() => setStatusUser(null)}

  className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"

>

    {/* POPUP BOX */}



<div

  onClick={(e) => e.stopPropagation()}

  className="w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden animate-[fadeIn_.3s_ease]"

>

      {/* HEADER */}



      <div className="bg-[#0B2A4A] px-8 py-6 flex items-center justify-between">



        <div>



          <h2 className="text-3xl font-bold text-white tracking-wide">

            Loan Tracking

          </h2>



          <p className="text-gray-300 mt-2 text-base">

            {statusUser.name}

          </p>



        </div>



        <button

          onClick={() => setStatusUser(null)}

          className="w-11 h-11 rounded-2xl bg-white/10

          hover:bg-red-500 transition-all duration-300

          text-white text-xl flex items-center justify-center"

        >

          ✕

        </button>



      </div>



      {/* INFO BAR */}



      <div className="px-8 py-5 bg-[#F8FAFC] border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">



        <div>



          <p className="text-sm text-gray-500">

            Loan Amount

          </p>



          <h3 className="text-2xl font-bold text-[#0B2A4A] mt-1">

            {statusUser.amount}

          </h3>



        </div>



        <div className="bg-[#27D3C3]/10 border border-[#27D3C3]/20 px-5 py-3 rounded-2xl">



          <p className="text-xs text-gray-500">

            Current Status

          </p>



          <h3 className="text-[#27D3C3] text-sm font-bold mt-1">

            {statusUser.status}

          </h3>



        </div>



      </div>



      {/* TIMELINE */}



      <div className="px-8 py-8 max-h-[550px] overflow-y-auto">



        {[

          "Documents Yet To Verify",

          "Documents Verified",

          "Sent To Bank",

          "Bank Manager Action Awaiting",

          "Manager Approved The Documents",

          "Disbursing Loan Amount",

        ].map((step, index, array) => {



          const steps = [

            "Documents Yet To Verify",

            "Documents Verified",

            "Sent To Bank",

            "Bank Manager Action Awaiting",

            "Manager Approved The Documents",

            "Disbursing Loan Amount",

          ];



          const currentIndex = steps.findIndex(

  (s) =>

    s.trim().toLowerCase() ===

    statusUser.status.trim().toLowerCase()

);



          const completed =

  index < currentIndex;



const active =

  index === currentIndex;



const stepDone =

  index <= currentIndex;



  



          return (



            <div

              key={index}

              className="flex gap-5 relative"

            >



              {/* LEFT SIDE */}



              <div className="flex flex-col items-center">



                {/* STEP ICON */}



                <div

                  className={`w-14 h-14 rounded-full

                  flex items-center justify-center

                  font-bold text-lg z-10 transition-all duration-300



                  ${

  stepDone

    ? "bg-[#27D3C3] text-[#0B2A4A]"

    : "bg-gray-200 text-gray-500"

}



${

  active

    ? "ring-4 ring-[#27D3C3]/30 scale-105"

    : ""

}

                  `}

                >



                  {stepDone ? "✓" : index + 1}



                </div>



                {/* LINE */}



                {index !== array.length - 1 && (



                  <div

                    className={`w-[4px] h-20 rounded-full mt-2



                    ${

  stepDone

    ? "bg-[#27D3C3]"

    : "bg-gray-200"

}

                    `}

                  ></div>



                )}



              </div>



              {/* RIGHT SIDE */}



              <div

                className={`flex-1 mb-8 rounded-3xl px-6 py-5 transition-all duration-300 border



                ${

                  active

                    ? "bg-[#0B2A4A] border-[#0B2A4A]"

                    : completed

                    ? "bg-[#EAFBF8] border-[#27D3C3]/20"

                    : "bg-[#F8FAFC] border-gray-100"

                }`}

              >



                <div className="flex items-center justify-between gap-4 flex-wrap">



                  <div>



                    <h3

                      className={`text-lg font-bold tracking-wide



                      ${

                        active

                          ? "text-white"

                          : completed

                          ? "text-[#0B2A4A]"

                          : "text-gray-400"

                      }`}

                    >

                      {step}

                    </h3>



                    <p

                      className={`mt-2 text-sm



                      ${

                        active

                          ? "text-gray-300"

                          : completed

                          ? "text-gray-500"

                          : "text-gray-400"

                      }`}

                    >

                      {active

                        ? "Currently processing"

                        : completed

                        ? "Completed successfully"

                        : "Awaiting update"}

                    </p>



                  </div>



                  {/* STATUS BADGE */}



                  <div>



                    {active ? (



                      <span

                        className="bg-[#27D3C3]

                        text-[#0B2A4A]

                        px-4 py-2 rounded-xl

                        text-xs font-bold tracking-wide"

                      >

                        LIVE

                      </span>



                    ) : completed ? (



                      <span

                        className="bg-[#27D3C3]/20

                        text-[#0B2A4A]

                        px-4 py-2 rounded-xl

                        text-xs font-bold tracking-wide"

                      >

                        COMPLETED

                      </span>



                    ) : (



                      <span

                        className="bg-gray-200

                        text-gray-500

                        px-4 py-2 rounded-xl

                        text-xs font-bold tracking-wide"

                      >

                        PENDING

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

)}



          {/* BANK SECTION */}



{/* BANK SECTION */}



{activeMenu === "Bank" && (

            <div className="space-y-6">



              <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-[#0B2A4A]">
                    Bank Management
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Manage partnered banks and loan statistics
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="bg-[#27D3C3] hover:bg-[#1fb5a7] text-[#0B2A4A] font-bold px-6 py-3.5 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                  <span className="text-xl font-bold">+</span> Add Bank
                </button>
              </div>



              <div className="bg-white rounded-3xl p-8 shadow-sm overflow-x-auto">



                <table className="w-full">



                  <thead>



                    <tr className="text-left border-b border-gray-200">



                      <th className="pb-4">

                        Bank Name

                      </th>



                      <th className="pb-4">

                        Representative

                      </th>



                      <th className="pb-4">

                        Contact Number

                      </th>



                      <th className="pb-4">

                        Email ID

                      </th>



                      <th className="pb-4">

                        Action

                      </th>



                    </tr>



                  </thead>



                  <tbody>



                    {banks.map((bank) => (

                      <tr

                        key={bank.id}

                        className="border-b border-gray-100 hover:bg-gray-50 transition"

                      >



                        <td className="py-5 font-semibold text-[#0B2A4A]">

                          {bank.bank}

                        </td>



                        <td className="py-5 text-gray-600">

                          {bank.representative}

                        </td>



                        <td className="py-5 text-gray-600">

                          {bank.mobile}

                        </td>



                        <td className="py-5 text-gray-600">

                          {bank.email}

                        </td>



                        <td className="py-5">



                          <button

                            onClick={() =>

                              setSelectedBank(bank)

                            }

                            className="bg-[#0B2A4A] hover:bg-[#081f36]

                            text-white px-5 py-2 rounded-xl text-sm transition"

                          >

                            View Details

                          </button>



                        </td>



                      </tr>

                    ))}



                  </tbody>



                </table>



              </div>



            </div>

          )}



          {/* BANK DETAILS POPUP */}



          {selectedBank && (

            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">



              <div className="bg-white w-full max-w-4xl rounded-3xl p-8 overflow-y-auto max-h-[90vh]">



                <div className="flex items-center justify-between mb-8">



                  <div>



                    <h2 className="text-3xl font-bold text-[#0B2A4A]">

                      Bank Details

                    </h2>



                    <p className="text-gray-500 mt-1">

                      {selectedBank.bank}

                    </p>



                  </div>



                  <button

                    onClick={() =>

                      setSelectedBank(null)

                    }

                    className="text-2xl text-gray-400 hover:text-red-500"

                  >

                    ✕

                  </button>



                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">



                  <div className="bg-[#F4F6F9] rounded-2xl p-6">

                    <p className="text-sm text-gray-500">

                      Representative Name

                    </p>



                    <h3 className="text-xl font-bold text-[#0B2A4A] mt-2">

                      {selectedBank.representative}

                    </h3>

                  </div>



                  <div className="bg-[#F4F6F9] rounded-2xl p-6">

                    <p className="text-sm text-gray-500">

                      Contact Number

                    </p>



                    <h3 className="text-xl font-bold text-[#0B2A4A] mt-2">

                      {selectedBank.mobile}

                    </h3>

                  </div>



                  <div className="bg-[#F4F6F9] rounded-2xl p-6">

                    <p className="text-sm text-gray-500">

                      Email Address

                    </p>



                    <h3 className="text-xl font-bold text-[#0B2A4A] mt-2">

                      {selectedBank.email}

                    </h3>

                  </div>



                  <div className="bg-[#F4F6F9] rounded-2xl p-6">

                    <p className="text-sm text-gray-500">

                      Total Cases Submitted

                    </p>



                    <h3 className="text-xl font-bold text-[#0B2A4A] mt-2">

                      {selectedBank.totalCases}

                    </h3>

                  </div>



                </div>



                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">



                  <div className="bg-[#EAFBF8] rounded-3xl p-6">

                    <p className="text-sm text-gray-500">

                      Active Cases

                    </p>



                    <h2 className="text-4xl font-bold text-[#27D3C3] mt-3">

                      {selectedBank.activeCases}

                    </h2>

                  </div>



                  <div className="bg-[#FFF4E5] rounded-3xl p-6">

                    <p className="text-sm text-gray-500">

                      Rejected Cases

                    </p>



                    <h2 className="text-4xl font-bold text-[#F59E0B] mt-3">

                      {selectedBank.rejectedCases}

                    </h2>

                  </div>



                  <div className="bg-[#EEF6FF] rounded-3xl p-6">

                    <p className="text-sm text-gray-500">

                      Approved Cases

                    </p>



                    <h2 className="text-4xl font-bold text-[#0B2A4A] mt-3">

                      {selectedBank.approvedCases}

                    </h2>

                  </div>



                </div>



              </div>



            </div>

          )}

          {showAddBankModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-xl overflow-y-auto max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0B2A4A]">Add Partner Bank</h2>
                    <p className="text-sm text-gray-500 mt-1">Register a new bank in the system</p>
                  </div>
                  <button
                    onClick={() => setShowAddBankModal(false)}
                    className="text-gray-400 hover:text-red-500 text-2xl transition"
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleAddBank} className="space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-[#0B2A4A]">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. State Bank of India"
                      value={newBankForm.bankName}
                      onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                      className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3] transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0B2A4A]">Representative Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newBankForm.representativeName}
                      onChange={(e) => setNewBankForm({ ...newBankForm, representativeName: e.target.value })}
                      className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3] transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0B2A4A]">Contact Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={newBankForm.contactNumber}
                      onChange={(e) => setNewBankForm({ ...newBankForm, contactNumber: e.target.value })}
                      className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3] transition"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0B2A4A]">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. representative@bank.com"
                      value={newBankForm.email}
                      onChange={(e) => setNewBankForm({ ...newBankForm, email: e.target.value })}
                      className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3] transition"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddBankModal(false)}
                      className="flex-1 border border-gray-200 text-gray-500 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#0B2A4A] hover:bg-[#081f36] text-white py-4 rounded-2xl font-semibold transition"
                    >
                      Add Bank
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}



          {/* SETTINGS */}





{showPhoneModal && (

  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

    <div className="bg-white w-full max-w-md rounded-3xl p-7 shadow-xl">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-xl font-bold text-[#0B2A4A]">Update Phone Number</h2>

        <button onClick={() => setShowPhoneModal(false)} className="text-gray-400 text-xl">✕</button>

      </div>

      <div className="space-y-5">

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A]">Current Phone</label>

          <input type="text" value={phoneForm.currentPhone} readOnly className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A]">New Phone</label>

          <input type="text" value={phoneForm.newPhone} onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })} className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3]" />

        </div>

        <button onClick={() => { setProfileData({ ...profileData, phone: phoneForm.newPhone }); setShowPhoneModal(false); }} className="w-full bg-[#0B2A4A] text-white py-4 rounded-2xl font-semibold">Submit</button>

      </div>

    </div>

  </div>

)}



{showEmailModal && (

  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

    <div className="bg-white w-full max-w-md rounded-3xl p-7 shadow-xl">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-xl font-bold text-[#0B2A4A]">Update Email Address</h2>

        <button onClick={() => setShowEmailModal(false)} className="text-gray-400 text-xl">✕</button>

      </div>

      <div className="space-y-5">

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A]">Current Email</label>

          <input type="email" value={emailForm.currentEmail} readOnly className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4" />

        </div>

        <div>

          <label className="text-sm font-semibold text-[#0B2A4A]">New Email</label>

          <input type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} className="w-full mt-2 bg-[#F8FAFC] border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:border-[#27D3C3]" />

        </div>

        <button onClick={() => { setProfileData({ ...profileData, email: emailForm.newEmail }); setShowEmailModal(false); }} className="w-full bg-[#0B2A4A] text-white py-4 rounded-2xl font-semibold">Submit</button>

      </div>

    </div>

  </div>

)}

{activeMenu === "Settings" && (



  <div className="max-w-4xl mx-auto space-y-6">



    {/* HEADER */}



    <div className="bg-white rounded-3xl p-6 shadow-sm">



      <h2 className="text-2xl font-bold text-[#0B2A4A]">

        Profile Settings

      </h2>



      <p className="text-sm text-gray-500 mt-1">

        Manage your profile information and security

      </p>



    </div>



    {/* PROFILE CARD */}



    <div className="bg-white rounded-3xl p-8 shadow-sm">



      {/* PROFILE TOP */}



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

            outline-none

            focus:border-[#27D3C3]"

          />



        </div>



        {/* PHONE */}



        {/* PHONE */}



<div>



  <div className="flex items-center justify-between mb-2">



    <label className="text-sm font-semibold text-[#0B2A4A]">

      Phone Number

    </label>



    <button onClick={() => setShowPhoneModal(true)} className="w-8 h-8 rounded-full bg-[#EAFBF8] hover:bg-[#dff8f4] flex items-center justify-center text-sm">✏️</button>



  </div>



  <input

    type="text"

    value={profileData.phone}

    readOnly

    className="w-full bg-[#F8FAFC]

    border border-gray-200

    rounded-2xl px-5 py-4

    outline-none"

  />



</div>



{/* EMAIL */}



<div>



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

      hover:bg-[#dff8f4]

      flex items-center justify-center

      text-sm"

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

    rounded-2xl px-5 py-4

    outline-none"

  />



</div>



      </div>



      {/* ACTIONS */}



      <div className="flex flex-wrap gap-4 mt-8">



        <button

          className="bg-[#0B2A4A]

          hover:bg-[#081f36]

          text-white px-6 py-3

          rounded-2xl font-semibold transition"

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

          hover:bg-[#dff8f4]

          px-6 py-3 rounded-2xl

          font-semibold transition"

        >

          Update Password

        </button>



      </div>



      {/* PASSWORD UPDATE */}



      {showPasswordForm && (



        <div

          className="mt-8 border-t

          pt-8"

        >



          <h3 className="text-lg font-bold text-[#0B2A4A] mb-5">

            Change Password

          </h3>



          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">



            <input

              type="password"

              placeholder="Current Password"

              className="bg-[#F8FAFC]

              border border-gray-200

              rounded-2xl px-5 py-4

              outline-none

              focus:border-[#27D3C3]"

            />



            <input

              type="password"

              placeholder="New Password"

              className="bg-[#F8FAFC]

              border border-gray-200

              rounded-2xl px-5 py-4

              outline-none

              focus:border-[#27D3C3]"

            />



            <input

              type="password"

              placeholder="Confirm Password"

              className="bg-[#F8FAFC]

              border border-gray-200

              rounded-2xl px-5 py-4

              outline-none

              focus:border-[#27D3C3]"

            />



          </div>



          <button

            className="mt-5 bg-[#27D3C3]

            hover:bg-[#1fb5a7]

            text-[#0B2A4A]

            px-6 py-3 rounded-2xl

            font-bold transition"

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

    </div>

  );

};





export default Dashboard;
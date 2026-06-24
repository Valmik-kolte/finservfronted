import React, { useMemo } from "react";
import {
  FaUsers,
  FaFileAlt,
  FaClipboardList,
  FaCheckCircle,
  FaRedo,
} from "react-icons/fa";

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

const StatCard = ({ label, value, icon }) => (
  <div className="w-full bg-white rounded-3xl p-4 sm:p-6 shadow-sm text-left border border-gray-50">
    <div className="w-12 h-12 rounded-2xl bg-[#EAFBF8] text-[#0B2A4A] flex items-center justify-center mb-4 text-xl">
      {icon}
    </div>
    <p className="text-sm text-slate-500 font-medium">{label}</p>
    <p className="text-2xl sm:text-3xl font-black text-[#0B2A4A] mt-2">{value}</p>
  </div>
);

const ResponsiveTable = ({ children }) => (
  <div className="w-full max-w-full overflow-x-auto">
    <table className="w-full min-w-[760px] text-sm text-left border-collapse">{children}</table>
  </div>
);

const DataTable = ({ headers, rows }) => (
  <ResponsiveTable>
    <thead>
      <tr className="text-slate-500 border-b border-slate-100">
        {headers.map((header) => (
          <th key={header} className="py-3 px-4 text-xs font-bold uppercase tracking-wider">
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
          {row.map((cell, cellIndex) => (
            <td key={cellIndex} className="py-3 px-4 text-sm text-[#0B2A4A] font-medium">
              {cell || "-"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </ResponsiveTable>
);

const DocumentDonutChart = ({ pending = 0, approved = 0, rejected = 0 }) => {
  const total = pending + approved + rejected;
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-2xl text-sm text-gray-400">
        No documents uploaded yet.
      </div>
    );
  }

  const radius = 35;
  const circumference = 2 * Math.PI * radius; // ~219.91
  
  const appPct = (approved / total) * 100;
  const penPct = (pending / total) * 100;
  const rejPct = (rejected / total) * 100;

  // Segment offset calculations
  const appOffset = 0;
  const penOffset = (approved / total) * circumference;
  const rejOffset = ((approved + pending) / total) * circumference;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F8FAFC" strokeWidth="10" />
          
          {/* Approved Segment (Emerald) */}
          {approved > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#10B981"
              strokeWidth="10"
              strokeDasharray={`${(approved / total) * circumference} ${circumference}`}
              strokeDashoffset={-appOffset}
              className="transition-all duration-300 hover:stroke-[12px] cursor-pointer"
            />
          )}
          
          {/* Pending Segment (Amber) */}
          {pending > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F59E0B"
              strokeWidth="10"
              strokeDasharray={`${(pending / total) * circumference} ${circumference}`}
              strokeDashoffset={-penOffset}
              className="transition-all duration-300 hover:stroke-[12px] cursor-pointer"
            />
          )}
          
          {/* Rejected Segment (Red) */}
          {rejected > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#EF4444"
              strokeWidth="10"
              strokeDasharray={`${(rejected / total) * circumference} ${circumference}`}
              strokeDashoffset={-rejOffset}
              className="transition-all duration-300 hover:stroke-[12px] cursor-pointer"
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center text-center">
          <span className="text-xl font-black text-[#0B2A4A]">{total}</span>
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Docs</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full sm:w-auto">
        <div className="flex items-center gap-3 bg-slate-50/50 px-3 py-2 rounded-2xl border border-gray-100">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <div>
            <p className="text-xs font-bold text-[#0B2A4A]">Approved</p>
            <p className="text-[10px] text-gray-500 font-semibold">{approved} docs ({appPct.toFixed(1)}%)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50/50 px-3 py-2 rounded-2xl border border-gray-100">
          <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <div>
            <p className="text-xs font-bold text-[#0B2A4A]">Pending</p>
            <p className="text-[10px] text-gray-500 font-semibold">{pending} docs ({penPct.toFixed(1)}%)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50/50 px-3 py-2 rounded-2xl border border-gray-100">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <div>
            <p className="text-xs font-bold text-[#0B2A4A]">Rejected</p>
            <p className="text-[10px] text-gray-500 font-semibold">{rejected} docs ({rejPct.toFixed(1)}%)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegistrationBarChart = ({ users = [] }) => {
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      
      const count = users.filter((u) => {
        if (!u.createdAt) return false;
        const uDate = new Date(u.createdAt);
        return (
          uDate.getDate() === d.getDate() &&
          uDate.getMonth() === d.getMonth() &&
          uDate.getFullYear() === d.getFullYear()
        );
      }).length;
      
      data.push({ label, value: count });
    }
    return data;
  }, [users]);

  const maxVal = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.value), 0);
    return max === 0 ? 1 : max;
  }, [chartData]);

  const totalRegistered = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Total in last 7 days: <span className="text-[#0B2A4A] font-black">{totalRegistered}</span>
        </p>
      </div>

      <div className="flex items-end justify-between gap-2 h-44 px-2 pt-4">
        {chartData.map((data, idx) => {
          const heightPct = (data.value / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-full h-32 flex items-end justify-center bg-slate-50/50 rounded-xl p-1 border border-dashed border-slate-100">
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[28px] bg-gradient-to-t from-[#0B2A4A] to-[#27D3C3] rounded-lg transition-all duration-700 ease-out hover:opacity-90 relative group cursor-pointer min-h-[4px]"
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0B2A4A] text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-md">
                    {data.value} {data.value === 1 ? "User" : "Users"}
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-black text-slate-400 whitespace-nowrap tracking-tighter">
                {data.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

const isDealerAddedUser = (user) => {
  if (!user) return false;
  return (
    user.registrationType === "DEALER" ||
    (user.dealerCode !== undefined && user.dealerCode !== null && String(user.dealerCode).trim() !== "")
  );
};

const getUserStatusText = (user) => {
  if (!user) return "Sent to Admin";
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

const DealerReports = ({ users = [], personalInfos = [], docs = [] }) => {
  const stats = useMemo(() => {
    return {
      users: users.length,
      personalInfos: personalInfos.length,
      docs: docs.length,
      pending: docs.filter((doc) => doc.status === "PENDING").length,
      approved: docs.filter((doc) => doc.status === "APPROVED" || doc.status === "VERIFIED").length,
      rejected: docs.filter((doc) => doc.status === "REJECTED").length,
      bankAssigned: users.filter(isUserAssignedToBank).length,
    };
  }, [users, personalInfos, docs]);

  const statCardsData = [
    { label: "Total Users", value: stats.users, icon: <FaUsers /> },
    { label: "Loan Applications", value: stats.personalInfos, icon: <FaClipboardList /> },
    { label: "Total Docs Uploaded", value: stats.docs, icon: <FaFileAlt /> },
    { label: "Docs Pending Approval", value: stats.pending, icon: <FaClipboardList /> },
    { label: "Approved Docs", value: stats.approved, icon: <FaCheckCircle /> },
    { label: "Rejected Docs", value: stats.rejected, icon: <FaRedo /> },
    { label: "Bank Assigned", value: stats.bankAssigned, icon: <FaCheckCircle /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-5">
        {statCardsData.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-50 flex flex-col justify-between">
          <h3 className="text-base font-black text-[#0B2A4A] mb-4 uppercase tracking-wider">
            Document Status Breakdown
          </h3>
          <DocumentDonutChart
            pending={stats.pending}
            approved={stats.approved}
            rejected={stats.rejected}
          />
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-50 flex flex-col justify-between">
          <h3 className="text-base font-black text-[#0B2A4A] mb-4 uppercase tracking-wider">
            Registrations (Last 7 Days)
          </h3>
          <RegistrationBarChart users={users} />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-50">
        <h2 className="text-xl font-black text-[#0B2A4A] mb-5">Personal Info Reports</h2>
        {personalInfos.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 bg-slate-50 rounded-2xl">
            No personal info records found.
          </div>
        ) : (
          <DataTable
            headers={[
              "Name",
              "Email",
              "Mobile",
              "City",
              "State",
              "Loan Amount",
              "Approved Docs",
              "Bank Assigned",
              "Status",
              "Created Date",
            ]}
            rows={personalInfos.map((info) => {
              const user = users.find((u) => String(u.userId || u.id) === String(info.userId));
              const userDocs = user?.documents || [];
              const totalDocs = userDocs.length;
              const approvedDocsCount = userDocs.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED").length;
              const bankName = user?.assignedBankName || user?.bankName || "";
              return [
                info.fullName,
                info.email,
                info.mobileNumber,
                info.city,
                info.state,
                info.loanAmount ? `Rs ${Number(info.loanAmount).toLocaleString("en-IN")}` : "N/A",
                `${approvedDocsCount} / ${totalDocs} Docs`,
                bankName || "Pending",
                getUserStatusText(user),
                formatDate(info.createdAt),
              ];
            })}
          />
        )}
      </div>
    </div>
  );
};

export default DealerReports;

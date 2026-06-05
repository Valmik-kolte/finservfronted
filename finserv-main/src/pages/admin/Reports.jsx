import React from "react";
import { FaFileAlt } from "react-icons/fa";
import { DataTable, formatDate, StatCard } from "./adminShared";

const Reports = ({
  users,
  dealers,
  personalInfos,
  pendingDocs,
  verifiedDocs,
  approvedDocsCount,
  rejectedDocsCount,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {[
        ["Total Users", users.length],
        ["Total Dealers", dealers.length],
        ["Loan Applications", personalInfos.length],
        ["Pending Docs", pendingDocs.length],
        ["Verified Docs", verifiedDocs.length],
        ["Approved Docs", approvedDocsCount],
        ["Rejected Docs", rejectedDocsCount],
      ].map(([label, value]) => (
        <StatCard key={label} label={label} value={value} icon={<FaFileAlt />} />
      ))}
    </div>

    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm overflow-x-auto">
      <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Personal Info</h2>
      <DataTable
        headers={["Name", "Email", "Mobile", "City", "State", "Loan Amount", "Created"]}
        rows={personalInfos.map((info) => [
          info.fullName,
          info.email,
          info.mobileNumber,
          info.city,
          info.state,
          info.loanAmount ? `Rs ${Number(info.loanAmount).toLocaleString("en-IN")}` : "N/A",
          formatDate(info.createdAt),
        ])}
      />
    </div>
  </div>
);

export default Reports;

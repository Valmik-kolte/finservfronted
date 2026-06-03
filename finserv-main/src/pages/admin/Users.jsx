import React from "react";
import { FaEye, FaSearch } from "react-icons/fa";
import {
  DOCUMENT_LABELS,
  formatDate,
  ReadOnlyField,
  ResponsiveTable,
  Modal,
  StatusBadge,
} from "./adminShared";

const getAssignedBankId = (user) =>
  user.bankId ||
  user.assignedBankId ||
  localStorage.getItem(`user_bank_assignment_${user.userId}`) ||
  "";

const getAssignedBankName = (user, banks) => {
  if (user.assignedBankName || user.bankName) return user.assignedBankName || user.bankName;
  const bankId = getAssignedBankId(user);
  const bank = banks.find((item) => String(item.bankId) === String(bankId));
  return bank?.bankName || "";
};

const Users = ({
  users,
  banks,
  searchName,
  setSearchName,
  searchUsers,
  openUser,
  selectedUser,
  selectedUserDocs,
  selectedUserCounts,
  assignBankId,
  setAssignBankId,
  assignBank,
  personalInfo,
  closeUser,
  openPreview,
}) => (
  <>
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Users</h2>
          <p className="text-sm text-slate-500 mt-1">Manage customer profiles, documents, and bank assignment.</p>
        </div>
        <div className="flex gap-3">
          <input
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            placeholder="Search by name"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
          <button
            onClick={searchUsers}
            className="bg-[#0B2A4A] text-white rounded-2xl px-4 py-3"
            aria-label="Search users"
          >
            <FaSearch />
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="bg-[#F4F6F9] rounded-2xl p-6 text-sm text-slate-500">
          No users found. Check the backend response for <span className="font-semibold">/api/user/all</span>.
        </div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr className="text-left text-sm text-slate-500">
              {["ID", "Name", "Email", "Mobile", "Registration", "Dealer Code", "Created"].map((head) => (
                <th key={head} className="py-3 px-4">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const bankName = getAssignedBankName(user, banks);
              return (
                <tr key={user.userId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">{user.userId}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => openUser(user)} className="font-semibold text-[#0B2A4A]">
                      {user.fullName}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">
                      Bank: {bankName || "Not assigned"}
                    </p>
                  </td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.mobileNumber}</td>
                  <td className="py-3 px-4">{user.registrationType}</td>
                  <td className="py-3 px-4">{user.dealerCode}</td>
                  <td className="py-3 px-4">{formatDate(user.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </ResponsiveTable>
      )}
    </div>

    {selectedUser && (
      <Modal title={selectedUser.fullName || "User Details"} onClose={closeUser}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Email", selectedUser.email],
            ["Mobile", selectedUser.mobileNumber],
            ["Dealer Code", selectedUser.dealerCode],
            ["Registration", selectedUser.registrationType],
          ].map(([label, value]) => (
            <ReadOnlyField key={label} label={label} value={value || "N/A"} />
          ))}
        </div>

        {selectedUserCounts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {Object.entries(selectedUserCounts).map(([key, value]) => (
              <div key={key} className="bg-[#F4F6F9] rounded-2xl p-4">
                <p className="text-xs text-slate-500">{key}</p>
                <p className="text-xl font-bold text-[#0B2A4A]">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 bg-[#F4F6F9] rounded-2xl p-4">
          <h3 className="font-bold text-[#0B2A4A] mb-3">Assign Bank</h3>
          <p className="text-sm text-slate-500 mb-3">
            Current bank:{" "}
            <span className="font-semibold text-[#0B2A4A]">
              {getAssignedBankName(selectedUser, banks) || "Not assigned"}
            </span>
          </p>
          <div className="flex gap-3">
            <select
              value={assignBankId}
              onChange={(event) => setAssignBankId(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Select bank</option>
              {banks.map((bank) => (
                <option key={bank.bankId} value={bank.bankId}>
                  {bank.bankName}
                </option>
              ))}
            </select>
            <button onClick={assignBank} className="bg-[#0B2A4A] text-white rounded-2xl px-5 font-bold">
              Assign
            </button>
          </div>
        </div>

        {personalInfo && (
          <div className="mt-5">
            <h3 className="font-bold text-[#0B2A4A] mb-3">Personal Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {["address", "city", "state", "pincode", "loanAmount"].map((key) => (
                <ReadOnlyField key={key} label={key} value={personalInfo[key] || "N/A"} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <h3 className="font-bold text-[#0B2A4A] mb-3">Documents</h3>
          <div className="space-y-3">
            {selectedUserDocs.map((doc) => (
              <div
                key={doc.documentId}
                className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-[#0B2A4A]">
                    {DOCUMENT_LABELS[doc.documentType] || doc.documentType}
                  </p>
                  <p className="text-xs text-slate-500">{doc.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  <button onClick={() => openPreview(doc.documentId)} className="text-[#0B2A4A]">
                    <FaEye />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    )}
  </>
);

export default Users;

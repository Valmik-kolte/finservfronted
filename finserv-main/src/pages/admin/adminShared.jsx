import React from "react";
import { FaTimes } from "react-icons/fa";

export const DOCUMENT_LABELS = {
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

export const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-sky-100 text-sky-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const unwrap = (response) => response?.data?.data ?? response?.data ?? [];

export const getAdminSession = () => {
  try {
    return JSON.parse(localStorage.getItem("adminData") || "{}");
  } catch {
    return {};
  }
};

export const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
};

export const StatusBadge = ({ status }) => (
  <span
    className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status || "PENDING"}
  </span>
);

export const StatCard = ({ label, value, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`w-full bg-white rounded-3xl p-6 shadow-sm text-left ${
      onClick ? "hover:-translate-y-0.5 hover:shadow-md transition" : ""
    }`}
  >
    <div className="w-12 h-12 rounded-2xl bg-[#EAFBF8] text-[#0B2A4A] flex items-center justify-center mb-4">
      {icon}
    </div>
    <p className="text-sm text-slate-500">{label}</p>
    <p className="text-3xl font-bold text-[#0B2A4A] mt-2">{value}</p>
  </button>
);

export const Field = ({ label, value, onChange, type = "text" }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-[#0B2A4A] mb-2">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#27D3C3]"
    />
  </label>
);

export const ReadOnlyField = ({ label, value }) => (
  <div className="bg-[#F4F6F9] rounded-2xl p-4">
    <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-[#0B2A4A] mt-1 break-words">{value}</p>
  </div>
);

export const ResponsiveTable = ({ children }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-sm">{children}</table>
  </div>
);

export const DataTable = ({ headers, rows }) => (
  <ResponsiveTable>
    <thead>
      <tr className="text-left text-sm text-slate-500">
        {headers.map((header) => (
          <th key={header} className="py-3 px-4">
            {header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <tr key={index} className="border-t border-slate-100">
          {row.map((cell, cellIndex) => (
            <td key={cellIndex} className="py-3 px-4">
              {cell || "N/A"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </ResponsiveTable>
);

export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-40 bg-black/50 p-4 flex items-center justify-center">
    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[#0B2A4A]">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-red-600">
          <FaTimes />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const ListOverlay = ({ title, items, emptyText = "No data found.", onClose }) => (
  <Modal title={title} onClose={onClose}>
    {items.length === 0 ? (
      <div className="bg-[#F4F6F9] rounded-2xl p-6 text-sm text-slate-500">{emptyText}</div>
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
  </Modal>
);

export const PreviewModal = ({ preview, closePreview }) => (
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
);

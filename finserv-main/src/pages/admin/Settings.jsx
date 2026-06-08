import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Field, ReadOnlyField } from "./adminShared";

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

const Settings = ({ admin, passwordForm, setPasswordForm, changePassword }) => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const adminName = firstPresent(admin?.fullName, admin?.name, admin?.adminName);
  const adminEmail = firstPresent(admin?.email, admin?.username, admin?.sub);
  const adminMobile = firstPresent(
    admin?.mobileNumber,
    admin?.mobile,
    admin?.phoneNumber,
    admin?.phone,
    admin?.contactNumber
  );
  const adminId = firstPresent(admin?.adminId, admin?.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Admin Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Name", adminName],
            ["Email", adminEmail],
            ["Mobile Number", adminMobile],
            ["Role", admin?.role],
            ["ID", adminId || 1],
          ].map(([label, value]) => (
            <ReadOnlyField key={label} label={label} value={value || "N/A"} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PasswordField
            label="New Password"
            showPassword={showNewPassword}
            setShowPassword={setShowNewPassword}
            value={passwordForm.newPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
          />
          <PasswordField
            label="Confirm Password"
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            value={passwordForm.confirmPassword}
            onChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
          />
        </div>
        <button
          onClick={changePassword}
          className="mt-5 bg-[#27D3C3] text-[#0B2A4A] rounded-2xl px-6 py-3 font-bold"
        >
          Save Password
        </button>
      </div>
    </div>
  );
};

const PasswordField = ({ label, value, onChange, showPassword, setShowPassword }) => (
  <label className="block">
    <span className="block text-sm font-semibold text-[#0B2A4A] mb-2">{label}</span>
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-[#27D3C3]"
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B2A4A]"
        aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </div>
  </label>
);

export default Settings;

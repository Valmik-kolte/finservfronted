import React from "react";
import { Field, ReadOnlyField } from "./adminShared";

const Settings = ({ admin, passwordForm, setPasswordForm, changePassword }) => (
  <div className="max-w-3xl space-y-6">
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Admin Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ["Name", admin?.name],
          ["Email", admin?.email],
          ["Role", admin?.role],
          ["ID", admin?.id || 1],
        ].map(([label, value]) => (
          <ReadOnlyField key={label} label={label} value={value || "N/A"} />
        ))}
      </div>
    </div>

    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0B2A4A] mb-5">Change Password</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="New Password"
          type="password"
          value={passwordForm.newPassword}
          onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })}
        />
        <Field
          label="Confirm Password"
          type="password"
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

export default Settings;

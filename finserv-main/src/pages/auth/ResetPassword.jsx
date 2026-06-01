import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    toast.success("Password reset successful");
    navigate("/");
  };

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Reset Password</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Enter your new password</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="New Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-3 bg-gray-50 outline-none text-sm" />
        <input type="password" placeholder="Confirm Password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full border rounded-lg px-3 py-3 bg-gray-50 outline-none text-sm" />
        <button type="submit" className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;

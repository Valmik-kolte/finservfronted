import React, { useState } from "react";
import { FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthPageFrame from "./AuthPageFrame";

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
    <AuthPageFrame ariaLabel="Reset password form">
      <form onSubmit={handleSubmit}>
        <h2 className="auth-simple-title">Reset Password</h2>
        <p className="auth-simple-subtitle">Enter your new password</p>
        <div className="auth-simple-divider" />

        <label className="auth-simple-label first" htmlFor="reset-password">
          New Password
        </label>
        <div className="auth-simple-input-wrap first">
          <FaLock className="auth-simple-icon" />
          <input
            id="reset-password"
            type="password"
            placeholder="New Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="auth-simple-input"
          />
        </div>

        <label className="auth-simple-label second" htmlFor="reset-confirm-password">
          Confirm Password
        </label>
        <div className="auth-simple-input-wrap second">
          <FaLock className="auth-simple-icon" />
          <input
            id="reset-confirm-password"
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="auth-simple-input"
          />
        </div>

        <button type="submit" className="auth-simple-submit two-fields">
          Reset Password
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default ResetPassword;

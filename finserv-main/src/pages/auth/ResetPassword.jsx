import React, { useEffect, useState } from "react";
import { FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { dealerResetPassword } from "../../services/dealerService";
import { userResetPassword } from "../../services/customerService";
import AuthPageFrame from "./AuthPageFrame";

const getMessage = (error, fallback) =>
  error?.response?.data || error?.message || fallback;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const email = sessionStorage.getItem("forgot_email") || "";
  const role = sessionStorage.getItem("forgot_role") || "USER";
  const otpVerified = sessionStorage.getItem("forgot_otp_verified") === "true";

  useEffect(() => {
    if (!email || !otpVerified) {
      toast.error("Please verify OTP first.");
      navigate(email ? "/verify-otp" : "/forgot-password");
    }
  }, [email, otpVerified, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.password) return toast.error("Please enter a new password.");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const dto = { email, newPassword: form.password };
      const message =
        role === "DEALER" ? await dealerResetPassword(dto) : await userResetPassword(dto);

      const normalized = String(message || "").toLowerCase();
      if (normalized.includes("verify otp first") || normalized.includes("not found")) {
        toast.error(message);
        return;
      }

      sessionStorage.removeItem("forgot_email");
      sessionStorage.removeItem("forgot_role");
      sessionStorage.removeItem("forgot_otp_verified");
      toast.success(message || "Password reset successful");
      navigate("/login");
    } catch (error) {
      toast.error(getMessage(error, "Failed to reset password."));
    } finally {
      setLoading(false);
    }
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
            required
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
            required
          />
        </div>

        <button type="submit" className="auth-simple-submit two-fields" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default ResetPassword;

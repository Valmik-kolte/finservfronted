import React, { useEffect, useState } from "react";
import { FaKey } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { dealerVerifyOtp } from "../../services/dealerService";
import { userVerifyOtp } from "../../services/customerService";
import AuthPageFrame from "./AuthPageFrame";

const getMessage = (error, fallback) =>
  error?.response?.data || error?.message || fallback;

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const email = sessionStorage.getItem("forgot_email") || "";
  const role = sessionStorage.getItem("forgot_role") || "USER";

  useEffect(() => {
    if (!email) {
      toast.error("Please request OTP first.");
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      toast.error("OTP should be 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const dto = { email, otp: cleanOtp };
      const message = role === "DEALER" ? await dealerVerifyOtp(dto) : await userVerifyOtp(dto);
      const normalized = String(message || "").toLowerCase();
      if (!normalized.includes("verified successfully")) {
        toast.error(message || "Invalid OTP");
        return;
      }

      sessionStorage.setItem("forgot_otp_verified", "true");
      toast.success(message || "OTP verified");
      navigate("/reset-password");
    } catch (error) {
      toast.error(getMessage(error, "Failed to verify OTP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageFrame ariaLabel="Verify OTP form">
      <form onSubmit={handleSubmit}>
        <h2 className="auth-simple-title">Verify OTP</h2>
        <p className="auth-simple-subtitle">Enter the 6 digit OTP sent to {email || "your email"}</p>
        <div className="auth-simple-divider" />

        <label className="auth-simple-label first" htmlFor="verify-otp">
          OTP
        </label>
        <div className="auth-simple-input-wrap first">
          <FaKey className="auth-simple-icon" />
          <input
            id="verify-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="auth-simple-input"
            required
          />
        </div>

        <button type="submit" className="auth-simple-submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
        <button type="button" className="auth-simple-link" onClick={() => navigate("/forgot-password")}>
          Change Email
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default VerifyOtp;

import React, { useEffect, useState } from "react";
import { FaKey } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { dealerVerifyOtp, dealerSendOtp } from "../../services/dealerService";
import { userVerifyOtp, userSendOtp } from "../../services/customerService";
import AuthPageFrame from "./AuthPageFrame";

const getMessage = (error, fallback) =>
  error?.response?.data || error?.message || fallback;

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const email = sessionStorage.getItem("forgot_email") || "";
  const role = sessionStorage.getItem("forgot_role") || "USER";

  useEffect(() => {
    if (!email) {
      toast.error("Please request OTP first.");
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      if (role === "DEALER") {
        await dealerSendOtp(email);
      } else {
        await userSendOtp(email);
      }
      toast.success("OTP resent successfully.");
      setResendTimer(300); // 5 minutes timer
    } catch (error) {
      toast.error(getMessage(error, "Failed to send OTP."));
    } finally {
      setLoading(false);
    }
  };

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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendTimer > 0 || loading}
            style={{
              background: "transparent",
              border: "none",
              color: resendTimer > 0 ? "rgba(255, 255, 255, 0.4)" : "#00D4B4",
              fontFamily: '"Inter", sans-serif',
              fontSize: "12px",
              fontWeight: "600",
              cursor: resendTimer > 0 ? "default" : "pointer",
              outline: "none",
            }}
          >
            {resendTimer > 0 ? `Resend in ${formatTimer(resendTimer)}` : "Resend OTP"}
          </button>
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

import React, { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { dealerSendOtp } from "../../services/dealerService";
import { userSendOtp } from "../../services/customerService";
import AuthPageFrame from "./AuthPageFrame";

const getMessage = (error, fallback) =>
  error?.response?.data || error?.message || fallback;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const message =
        role === "DEALER"
          ? await dealerSendOtp(trimmedEmail)
          : await userSendOtp(trimmedEmail);

      sessionStorage.setItem("forgot_email", trimmedEmail);
      sessionStorage.setItem("forgot_role", role);
      sessionStorage.removeItem("forgot_otp_verified");
      toast.success(message || "OTP sent to your email");
      navigate("/verify-otp");
    } catch (error) {
      toast.error(getMessage(error, "Failed to send OTP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageFrame ariaLabel="Forgot password form">
      <form onSubmit={handleSubmit}>
        <h2 className="auth-simple-title">Forgot Password</h2>
        <p className="auth-simple-subtitle">Enter your email to receive OTP</p>
        <div className="auth-simple-divider" />

        <div
          style={{
            position: "absolute",
            left: 37,
            top: 145,
            width: 340,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 4,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.1)",
            padding: 4,
            boxSizing: "border-box",
          }}
        >
          {["USER", "DEALER"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRole(item)}
              style={{
                height: 28,
                border: 0,
                borderRadius: 6,
                background: role === item ? "linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%)" : "transparent",
                color: role === item ? "#FFFFFF" : "rgba(255, 255, 255, 0.7)",
                fontFamily: '"Inter", sans-serif',
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: role === item ? "0 8px 18px rgba(0, 212, 180, 0.22)" : "none",
                transition: "background 180ms ease, color 180ms ease, box-shadow 180ms ease",
              }}
            >
              {item === "USER" ? "User" : "Dealer"}
            </button>
          ))}
        </div>

        <label className="auth-simple-label first" htmlFor="forgot-email" style={{ top: 198 }}>
          Email
        </label>
        <div className="auth-simple-input-wrap first" style={{ top: 218 }}>
          <FaEnvelope className="auth-simple-icon" />
          <input
            id="forgot-email"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-simple-input"
            required
          />
        </div>

        <button type="submit" className="auth-simple-submit" style={{ top: 295 }} disabled={loading}>
          {loading ? "Sending..." : "Send OTP"}
        </button>
        <button type="button" className="auth-simple-link" onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default ForgotPassword;

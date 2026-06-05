import React, { useState } from "react";
import { FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthPageFrame from "./AuthPageFrame";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("OTP sent to your email");
    navigate("/verify-otp");
  };

  return (
    <AuthPageFrame ariaLabel="Forgot password form">
      <form onSubmit={handleSubmit}>
        <h2 className="auth-simple-title">Forgot Password</h2>
        <p className="auth-simple-subtitle">Enter your email to receive OTP</p>
        <div className="auth-simple-divider" />

        <label className="auth-simple-label first" htmlFor="forgot-email">
          Email
        </label>
        <div className="auth-simple-input-wrap first">
          <FaEnvelope className="auth-simple-icon" />
          <input
            id="forgot-email"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-simple-input"
          />
        </div>

        <button type="submit" className="auth-simple-submit">
          Send OTP
        </button>
        <button type="button" className="auth-simple-link" onClick={() => navigate("/")}>
          Back to Login
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default ForgotPassword;

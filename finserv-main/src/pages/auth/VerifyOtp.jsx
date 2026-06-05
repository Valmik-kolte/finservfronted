import React, { useState } from "react";
import { FaKey } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthPageFrame from "./AuthPageFrame";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("OTP verified");
    navigate("/reset-password");
  };

  return (
    <AuthPageFrame ariaLabel="Verify OTP form">
      <form onSubmit={handleSubmit}>
        <h2 className="auth-simple-title">Verify OTP</h2>
        <p className="auth-simple-subtitle">Enter the OTP sent to your email</p>
        <div className="auth-simple-divider" />

        <label className="auth-simple-label first" htmlFor="verify-otp">
          OTP
        </label>
        <div className="auth-simple-input-wrap first">
          <FaKey className="auth-simple-icon" />
          <input
            id="verify-otp"
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="auth-simple-input"
          />
        </div>

        <button type="submit" className="auth-simple-submit">
          Verify OTP
        </button>
      </form>
    </AuthPageFrame>
  );
};

export default VerifyOtp;

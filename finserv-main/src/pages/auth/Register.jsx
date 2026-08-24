import React, { useState, useEffect } from "react";
import {
  FaCar,
  FaCheckCircle,
  FaClipboardCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhone,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  registerUser,
  registerUserSendOtp,
  registerUserVerifyOtp,
  registerUserSendMobileOtp,
  registerUserVerifyMobileOtp,
} from "../../services/customerService.js";
import {
  registerDealer,
  registerDealerSendOtp,
  registerDealerVerifyOtp,
  registerDealerSendMobileOtp,
  registerDealerVerifyMobileOtp,
} from "../../services/dealerService.js";
import loginVideo from "../../assets/login-bg.mp4";

const bullet = "\u2022";
const rightArrow = "\u2192";

const getInitialRole = (pathname, defaultRole) => {
  if (defaultRole) return defaultRole;
  if (pathname.includes("/dealer")) return "DEALER";
  return "INDIVIDUAL";
};

const Register = ({ defaultRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(() => getInitialRole(location.pathname, defaultRole));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [mobileOtpVerifying, setMobileOtpVerifying] = useState(false);
  const [mobileResendTimer, setMobileResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (mobileResendTimer <= 0) return;
    const interval = setInterval(() => {
      setMobileResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [mobileResendTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setResendTimer(0);
    setMobileOtpSent(false);
    setMobileVerified(false);
    setMobileOtp("");
    setMobileResendTimer(0);
  };

  const handleSendOtp = async () => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const response =
        role === "DEALER"
          ? await registerDealerSendOtp(trimmedEmail)
          : await registerUserSendOtp(trimmedEmail);

      setOtpSent(true);
      setResendTimer(300);
      toast.success(response?.message || response || "OTP sent to your email.");
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length === 0) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      setOtpVerifying(true);
      const dto = { email: form.email.trim(), otp: otp.trim() };
      const response =
        role === "DEALER"
          ? await registerDealerVerifyOtp(dto)
          : await registerUserVerifyOtp(dto);

      const resData = response;
      const message = typeof resData === "string" ? resData.toLowerCase() : (resData?.message?.toLowerCase() || "");
      const success =
        resData?.statusCode === 200 ||
        resData?.status === true ||
        resData?.success === true ||
        message.includes("verified") ||
        message.includes("success") ||
        resData === "verified" ||
        resData === "success" ||
        (typeof resData === "string" && resData.toLowerCase().includes("success")) ||
        (typeof resData === "string" && resData.toLowerCase().includes("verified"));

      if (success) {
        setOtpVerified(true);
        toast.success("OTP verified successfully");
      } else {
        setOtpVerified(false);
        toast.error("Invalid OTP");
      }
    } catch (error) {
      setOtpVerified(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Invalid OTP";
      toast.error(errorMessage);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSendMobileOtp = async () => {
    const trimmedMobile = form.mobile.trim();
    if (!trimmedMobile) {
      toast.error("Please enter your mobile number.");
      return;
    }
    if (!/^\d{10}$/.test(trimmedMobile)) {
      toast.error("Mobile number should be 10 digits");
      return;
    }

    setSendingMobileOtp(true);
    try {
      const response =
        role === "DEALER"
          ? await registerDealerSendMobileOtp(trimmedMobile)
          : await registerUserSendMobileOtp(trimmedMobile);

      setMobileOtpSent(true);
      setMobileResendTimer(300);
      toast.success(response?.message || response || "OTP sent to your mobile.");
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to send OTP.");
    } finally {
      setSendingMobileOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.trim().length === 0) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      setMobileOtpVerifying(true);
      const dto = { mobileNumber: form.mobile.trim(), otp: mobileOtp.trim() };
      const response =
        role === "DEALER"
          ? await registerDealerVerifyMobileOtp(dto)
          : await registerUserVerifyMobileOtp(dto);

      const resData = response;
      const message = typeof resData === "string" ? resData.toLowerCase() : (resData?.message?.toLowerCase() || "");
      const success =
        resData?.statusCode === 200 ||
        resData?.status === true ||
        resData?.success === true ||
        message.includes("verified") ||
        message.includes("success") ||
        resData === "verified" ||
        resData === "success" ||
        (typeof resData === "string" && resData.toLowerCase().includes("success")) ||
        (typeof resData === "string" && resData.toLowerCase().includes("verified"));

      if (success) {
        setMobileVerified(true);
        toast.success("Mobile OTP verified successfully");
      } else {
        setMobileVerified(false);
        toast.error("Invalid OTP");
      }
    } catch (error) {
      setMobileVerified(false);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Invalid OTP";
      toast.error(errorMessage);
    } finally {
      setMobileOtpVerifying(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "mobile") {
      setForm((prev) => ({ ...prev, mobile: value.replace(/\D/g, "").slice(0, 10) }));
      setMobileOtpSent(false);
      setMobileVerified(false);
      setMobileOtp("");
      setMobileResendTimer(0);
      return;
    }
    if (name === "email") {
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
      setResendTimer(0);
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Mobile number should be 10 digits");
      return;
    }
    if (!mobileVerified) {
      toast.error("Please verify your mobile number first.");
      return;
    }
    if (!otpVerified) {
      toast.error("Please verify your email first.");
      return;
    }
    setLoading(true);

    const payload = {
      fullName: form.fullName,
      email: form.email,
      mobileNumber: form.mobile,
      password: form.password,
      registrationType: role,
    };

    try {
      if (role === "DEALER") {
        const data = await registerDealer(payload);
        if (data?.dealerId) localStorage.setItem("dealerId", String(data.dealerId));
        if (data?.dealerCode) localStorage.setItem("dealerCode", data.dealerCode);
        if (data?.dealerCode && data?.dealerId) {
          const codeMap = JSON.parse(localStorage.getItem("dealerCodeMap") || "{}");
          codeMap[data.dealerCode] = data.dealerId;
          localStorage.setItem("dealerCodeMap", JSON.stringify(codeMap));
        }
        if (form.email && form.mobile) {
          localStorage.setItem(`dealer_mobile_${form.email.toLowerCase().trim()}`, form.mobile);
        }
        toast.success("Dealer registered successfully");
      } else {
        await registerUser(payload);
        if (form.email && form.mobile) {
          localStorage.setItem(`user_mobile_${form.email.toLowerCase().trim()}`, form.mobile);
        }
        toast.success("User registered successfully");
      }

      navigate("/login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="finserv-register-page">
      <style>{`
        html, body {
          overflow: hidden !important;
          height: 100vh !important;
        }

        .finserv-register-page {
          position: fixed;
          inset: 0;
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #02142d 0%, #001a3a 58%, #041e4d 100%);
          font-family: "Inter", sans-serif;
          color: #ffffff;
          overflow: hidden;
          padding: 12px 16px;
          box-sizing: border-box;
          z-index: 999;
        }

        .register-container {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .register-bg {
          position: fixed;
          inset: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .register-bg-video {
          width: 100vw;
          height: 100vh;
          object-fit: cover;
          opacity: 0.25;
        }

        .register-left-content {
          position: relative;
          z-index: 5;
        }

        .register-heading {
          font-size: 34px;
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 10px 0;
          letter-spacing: -0.5px;
        }

        .register-heading span {
          color: #00D4B4;
          background: linear-gradient(90deg, #00D4B4 0%, #00e0d3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .register-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 16px;
        }

        .register-features-row {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .feature-card-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 14px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          font-size: 11px;
          font-weight: 600;
          text-align: center;
        }

        .feature-icon-box {
          font-size: 18px;
          color: #00D4B4;
        }

        .register-right-card {
          position: relative;
          z-index: 5;
          background: rgba(11, 42, 74, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 16px 20px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          max-height: 96vh;
          overflow: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .register-right-card::-webkit-scrollbar {
          display: none;
          width: 0px;
          height: 0px;
        }

        .register-title {
          font-size: 22px;
          font-weight: 800;
          text-align: center;
          margin: 0 0 2px 0;
          color: #ffffff;
        }

        .register-card-subtitle {
          font-size: 12px;
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 12px;
        }

        .role-switch-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 3px;
          border-radius: 10px;
          margin-bottom: 12px;
        }

        .role-switch-btn {
          padding: 6px 10px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .role-switch-btn.active {
          background: linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 212, 180, 0.3);
        }

        .form-group-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 8px;
        }

        .form-field-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-pill-wrapper {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          padding: 0 4px 0 10px;
          height: 38px;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .input-pill-wrapper:focus-within {
          border-color: #00D4B4;
          box-shadow: 0 0 0 3px rgba(0, 212, 180, 0.2);
        }

        .field-icon {
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          flex-shrink: 0;
        }

        .field-input {
          flex: 1;
          background: transparent;
          border: 0;
          outline: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          padding: 0 8px;
          min-width: 0;
        }

        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .inline-action-btn {
          height: 28px;
          padding: 0 10px;
          border: 0;
          border-radius: 6px;
          background: linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%);
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
        }

        .inline-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 180, 0.4);
        }

        .inline-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(39, 211, 195, 0.15);
          color: #27D3C3;
          border: 1px solid rgba(39, 211, 195, 0.3);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .inline-otp-section {
          background: rgba(0, 212, 180, 0.05);
          border: 1px solid rgba(0, 212, 180, 0.25);
          border-radius: 10px;
          padding: 6px 10px;
          margin-top: 3px;
          margin-bottom: 4px;
        }

        .password-toggle-btn {
          background: transparent;
          border: 0;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }

        .submit-register-btn {
          width: 100%;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
          box-shadow: 0 6px 16px rgba(0, 212, 180, 0.3);
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .submit-register-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(0, 212, 180, 0.45);
        }

        .submit-register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-footer-text {
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 10px;
        }

        .login-footer-link {
          color: #00D4B4;
          font-weight: 700;
          background: transparent;
          border: 0;
          cursor: pointer;
          margin-left: 6px;
        }

        @media (max-width: 900px) {
          .register-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .register-left-content {
            text-align: center;
          }
          .register-features-row {
            justify-content: center;
          }
        }
      `}</style>

      <div className="register-bg">
        <video className="register-bg-video" autoPlay muted loop playsInline preload="auto">
          <source src={loginVideo} type="video/mp4" />
        </video>
      </div>

      <div className="register-container">
        <div className="register-left-content">
          <h1 className="register-heading">
            Drive Your Dreams,
            <br />
            <span>Finance Your Journey</span>
          </h1>
          <p className="register-subtitle">
            Fast {bullet} Secure {bullet} Trusted Car Loan
          </p>

          <div className="register-features-row">
            <div className="feature-card-item">
              <FaCar className="feature-icon-box" />
              <span>Car Loan</span>
            </div>
            <div className="feature-card-item">
              <FaShieldAlt className="feature-icon-box" />
              <span>Quick Approval</span>
            </div>
            <div className="feature-card-item">
              <FaClipboardCheck className="feature-icon-box" />
              <span>Minimal Docs</span>
            </div>
          </div>
        </div>

        <div className="register-right-card">
          <h2 className="register-title">Create Account</h2>
          <p className="register-card-subtitle">Register to continue your application</p>

          <div className="role-switch-container">
            <button
              type="button"
              className={`role-switch-btn ${role === "INDIVIDUAL" ? "active" : ""}`}
              onClick={() => handleRoleChange("INDIVIDUAL")}
            >
              User
            </button>
            <button
              type="button"
              className={`role-switch-btn ${role === "DEALER" ? "active" : ""}`}
              onClick={() => handleRoleChange("DEALER")}
            >
              Dealer
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group-block">
              <label className="form-field-label" htmlFor="register-full-name">
                Full Name
              </label>
              <div className="input-pill-wrapper">
                <FaUser className="field-icon" />
                <input
                  id="register-full-name"
                  type="text"
                  name="fullName"
                  placeholder="Enter full name"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="form-group-block">
              <label className="form-field-label" htmlFor="register-mobile">
                Mobile Number
              </label>
              <div className="input-pill-wrapper">
                <FaPhone className="field-icon" />
                <input
                  id="register-mobile"
                  type="tel"
                  name="mobile"
                  placeholder="Enter 10-digit mobile number"
                  value={form.mobile}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength={10}
                  required
                  readOnly={mobileVerified}
                  className="field-input"
                />
                {mobileVerified ? (
                  <div className="verified-badge">
                    <FaCheckCircle /> Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={sendingMobileOtp || !form.mobile || form.mobile.length !== 10 || mobileResendTimer > 0}
                    className="inline-action-btn"
                  >
                    {sendingMobileOtp
                      ? "Sending..."
                      : mobileResendTimer > 0
                      ? formatTimer(mobileResendTimer)
                      : mobileOtpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </button>
                )}
              </div>

              {/* Mobile OTP Inline Container */}
              {mobileOtpSent && !mobileVerified && (
                <div className="inline-otp-section">
                  <div className="form-field-label" style={{ marginBottom: "6px" }}>
                    <span>Enter Mobile OTP</span>
                    {mobileResendTimer > 0 && (
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>
                        Resend in {formatTimer(mobileResendTimer)}
                      </span>
                    )}
                  </div>
                  <div className="input-pill-wrapper" style={{ height: "40px" }}>
                    <FaShieldAlt className="field-icon" />
                    <input
                      id="register-mobile-otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyMobileOtp}
                      disabled={mobileOtpVerifying || mobileOtp.length === 0}
                      className="inline-action-btn"
                    >
                      {mobileOtpVerifying ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="form-group-block">
              <label className="form-field-label" htmlFor="register-email">
                Email Address
              </label>
              <div className="input-pill-wrapper">
                <FaEnvelope className="field-icon" />
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  readOnly={otpVerified}
                  className="field-input"
                />
                {otpVerified ? (
                  <div className="verified-badge">
                    <FaCheckCircle /> Verified
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !form.email || resendTimer > 0}
                    className="inline-action-btn"
                  >
                    {sendingOtp
                      ? "Sending..."
                      : resendTimer > 0
                      ? formatTimer(resendTimer)
                      : otpSent
                      ? "Resend OTP"
                      : "Send OTP"}
                  </button>
                )}
              </div>

              {/* Email OTP Inline Container */}
              {otpSent && !otpVerified && (
                <div className="inline-otp-section">
                  <div className="form-field-label" style={{ marginBottom: "6px" }}>
                    <span>Enter Email OTP</span>
                    {resendTimer > 0 && (
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>
                        Resend in {formatTimer(resendTimer)}
                      </span>
                    )}
                  </div>
                  <div className="input-pill-wrapper" style={{ height: "40px" }}>
                    <FaShieldAlt className="field-icon" />
                    <input
                      id="register-otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otp.length === 0}
                      className="inline-action-btn"
                    >
                      {otpVerifying ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="form-group-block">
              <label className="form-field-label" htmlFor="register-password">
                Password
              </label>
              <div className="input-pill-wrapper">
                <FaLock className="field-icon" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !otpVerified || !mobileVerified}
              className="submit-register-btn"
              title={!mobileVerified ? "Verify mobile number first" : !otpVerified ? "Verify email first" : ""}
            >
              {loading ? "Creating Account..." : `Register ${rightArrow}`}
            </button>

            <div className="login-footer-text">
              Already have an account?
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="login-footer-link"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

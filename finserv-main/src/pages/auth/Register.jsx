import React, { useState, useEffect } from "react";
import {
  FaCar,
  FaClipboardCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhone,
  FaShieldAlt,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { registerUser, registerUserSendOtp, registerUserVerifyOtp } from "../../services/customerService.js";
import { registerDealer, registerDealerSendOtp, registerDealerVerifyOtp } from "../../services/dealerService.js";
import loginVideo from "../../assets/login-bg.mp4";

const bullet = "\u2022";
const rightArrow = "\u2192";
const quoteOpen = "\u201C";
const quoteClose = "\u201D";
const quoteLine1 =
  "\u0924\u0941\u092e\u091a\u094d\u092f\u093e \u0938\u094d\u0935\u092a\u094d\u0928\u093e\u0924\u0940\u0932 \u0935\u093e\u0939\u0928\u093e\u0938\u093e\u0920\u0940";
const quoteLine2 =
  "\u0935\u093f\u0936\u094d\u0935\u093e\u0938\u093e\u091a\u0940 \u0906\u0930\u094d\u0925\u093f\u0915 \u0938\u093e\u0925";

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

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const otpLabelTop = 406;
  const otpWrapTop = 423;
  
  const passwordLabelTop = otpSent ? 472 : 406;
  const passwordWrapTop = otpSent ? 489 : 423;
  
  const submitTop = otpSent ? 548 : 482;
  const loginLinkTop = otpSent ? 610 : 544;
  const cardHeight = otpSent ? 650 : 584;

  const features = [
    { label: "Car Loan", icon: <FaCar />, left: 70 },
    { label: "Quick Approval", icon: <FaShieldAlt />, left: 157 },
    { label: "Minimal Documents", icon: <FaClipboardCheck />, left: 256 },
  ];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setResendTimer(0);
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "mobile") {
      setForm((prev) => ({ ...prev, mobile: value.replace(/\D/g, "").slice(0, 10) }));
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
        @keyframes registerFadeLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes registerFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .finserv-register-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 8px;
          background: linear-gradient(135deg, #02142d 0%, #001a3a 58%, #041e4d 100%);
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          letter-spacing: 0;
        }

        .register-stage {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #001a3a;
          --auth-left-nudge: 24px;
        }

        .register-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .register-bg-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .register-left {
          position: absolute;
          left: 0;
          top: 0;
          width: 52%;
          height: 100%;
          color: #ffffff;
          z-index: 5;
          animation: registerFadeLeft 650ms ease-out both;
        }

        .register-left::before { content: none; }
        .register-left::after { content: none; }

        .register-heading {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 117px;
          z-index: 2;
          width: 410px;
          margin: 0;
          color: #ffffff;
          font-family: "Montserrat ExtraBold", "Noto Sans Devanagari", sans-serif;
          font-size: 36px;
          font-weight: 800;
          line-height: 37px;
          letter-spacing: -0.8px;
        }

        .register-heading span {
          color: #00e0d3;
        }

        .register-subtitle {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 204px;
          z-index: 2;
          margin: 0;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 24px;
        }

        .register-teal {
          color: #00e0d3;
        }

        .register-underline {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 233px;
          z-index: 2;
          width: 36px;
          height: 2px;
          border-radius: 2px;
          background: #00e0d3;
        }

        .register-feature {
          position: absolute;
          top: 260px;
          z-index: 2;
          width: 52px;
          text-align: center;
          animation: registerFadeUp 650ms ease-out both;
        }

        .register-feature-card {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 224, 211, 0.45);
          border-radius: 10px;
          background: rgba(0, 25, 65, 0.45);
          color: #ffffff;
          font-size: 27px;
          box-shadow: 0 0 14px rgba(0, 224, 211, 0.25);
          backdrop-filter: blur(10px);
          transition: transform 220ms ease, box-shadow 220ms ease;
        }

        .register-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 22px rgba(0, 224, 211, 0.36);
        }

        .register-feature-label {
          position: absolute;
          top: 61px;
          left: 50%;
          margin: 0;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.9);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 11px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .register-quote {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 348px;
          z-index: 2;
          width: 310px;
        }

        .register-quote-text {
          margin: 0;
          color: #ffffff;
          font-family: "Noto Sans Devanagari", "Inter", sans-serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 30px;
        }

        .register-quote-mark {
          color: #00e0d3;
          font-size: 26px;
          font-weight: 900;
          line-height: 1;
        }

        .register-quote-line {
          margin-left: 5px;
        }

        .register-quote-line.second {
          margin-left: 24px;
        }

        .register-right {
          position: absolute;
          right: 0;
          top: 0;
          width: 48%;
          height: 90%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 5;
        }

        .register-card {
          position: relative;
          left: 0;
          top: 30px;
          width: 414px;
          height: 543px;
          animation: registerFadeUp 650ms ease-out both;
          background: transparent;
          border: 1px solid #ffffff;
          border-radius: 24px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .register-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.15),
            transparent
          );
          pointer-events: none;
          border-radius: 24px;
        }

        .register-title {
          position: absolute;
          left: 0;
          top: 22px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 34px;
          font-weight: 700;
          line-height: 1.1;
        }

        .register-card-subtitle {
          position: absolute;
          left: 0;
          top: 66px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .register-divider {
          position: absolute;
          left: calc(50% - 20px);
          top: 92px;
          width: 40px;
          height: 2px;
          border-radius: 2px;
          background: #00D4B4;
        }

        .role-switch {
          position: absolute;
          left: 37px;
          top: 112px;
          width: 340px;
          box-sizing: border-box;
          height: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px;
        }

        .role-option {
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease;
        }

        .role-option.active {
          background: linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%);
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(0, 212, 180, 0.22);
        }

        .register-label {
          position: absolute;
          left: 37px;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
        }

        .verify-email-btn {
          position: absolute;
          left: 37px;
          top: 362px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(90deg, #00e0d3 0%, #007bff 100%);
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          height: 32px;
          padding: 0 16px;
          box-shadow: 0 4px 12px rgba(0, 224, 211, 0.2);
          transition: transform 200ms ease, box-shadow 200ms ease;
        }
        .verify-email-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 224, 211, 0.4);
        }
        .verify-email-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .otp-label-container {
          position: absolute;
          left: 37px;
          width: 340px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .otp-resend-btn {
          background: transparent;
          border: 0;
          color: #00D4B4;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          transition: opacity 150ms ease;
        }
        .otp-resend-btn:hover:not(:disabled) {
          text-decoration: underline;
          opacity: 0.9;
        }
        .otp-resend-btn:disabled {
          color: rgba(255, 255, 255, 0.4);
          cursor: not-allowed;
        }

        .otp-input-wrapper {
          position: absolute;
          left: 37px;
          width: 340px;
          box-sizing: border-box;
          height: 44px;
          border: 1px solid #00e5e5;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .otp-input-wrapper:focus-within {
          border-color: #00D4B4;
          box-shadow: 0 0 0 3px rgba(0, 212, 180, 0.25);
        }

        .otp-icon {
          position: absolute;
          left: 14px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
        }

        .otp-input {
          width: 100%;
          height: 100%;
          padding-left: 48px;
          padding-right: 118px;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 14px;
          font-weight: 600;
        }

        .otp-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .verify-otp-inside-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 96px;
          height: 32px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(90deg, #00D6DC 0%, #0095F5 100%);
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 6px 16px rgba(0, 149, 245, 0.28);
          transition: all 0.25s ease;
        }

        .verify-otp-inside-btn:hover:not(:disabled) {
          box-shadow: 0 8px 20px rgba(0, 149, 245, 0.35);
          transform: translateY(-50%) scale(1.02);
        }

        .verify-otp-inside-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .otp-readonly {
          opacity: 0.85;
          cursor: not-allowed;
        }

        .verified-btn {
          background: linear-gradient(90deg, #16A34A 0%, #22C55E 100%) !important;
          cursor: not-allowed;
          box-shadow: 0 6px 16px rgba(34, 197, 94, 0.28) !important;
        }

        .register-label.name { top: 168px; }
        .register-label.mobile { top: 234px; }
        .register-label.email { top: 300px; }
        .register-label.password { top: 366px; }

        .register-input-wrap {
          position: absolute;
          left: 37px;
          width: 340px;
          box-sizing: border-box;
          height: 37px;
          display: flex;
          align-items: center;
          border: 1px solid #ffffff;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.85);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .register-input-wrap.name { top: 185px; }
        .register-input-wrap.mobile { top: 251px; }
        .register-input-wrap.email { top: 317px; }
        .register-input-wrap.password { top: 383px; }

        .register-input-wrap:focus-within {
          border-color: #00D4B4;
          box-shadow: 0 0 0 3px rgba(0, 212, 180, 0.25);
        }

        .register-input-wrap:focus-within,
        .register-input-wrap:has(input:not(:placeholder-shown)) {
          background: rgba(0, 0, 0, 0.45) !important;
        }

        .register-input-icon {
          flex: 0 0 auto;
          margin-left: 14px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
        }

        .register-input {
          width: 100%;
          min-width: 0;
          margin-left: 15px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 500;
        }

        .register-input:-webkit-autofill,
        .register-input:-webkit-autofill:hover, 
        .register-input:-webkit-autofill:focus, 
        .register-input:-webkit-autofill:active {
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s !important;
          box-shadow: inset 0 0 20px 20px transparent !important;
        }

        .register-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-weight: 500;
        }

        .register-password-toggle {
          flex: 0 0 auto;
          margin: 0 13px 0 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
        }

        .register-submit {
          position: absolute;
          left: 37px;
          top: 442px;
          width: 340px;
          height: 43px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(90deg, #00D4B4 0%, #0D6EFD 100%);
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 0 20px rgba(0, 212, 180, 0.35);
          transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
        }

        .register-submit:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 0 26px rgba(0, 212, 180, 0.55), 0 10px 20px rgba(0, 0, 0, 0.15);
        }

        .register-submit:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .register-login-link {
          position: absolute;
          left: 0;
          top: 504px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .register-login-link button {
          margin-left: 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #00D4B4;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        @media (max-width: 920px) {
          .finserv-register-page {
            display: block;
            min-height: 100vh;
            overflow-y: auto;
            padding: 0;
          }

          .register-stage {
            width: 100%;
            min-height: 100vh;
            height: auto;
            border-radius: 0;
          }

          .register-left,
          .register-right {
            position: relative;
            left: auto;
            top: auto;
            width: 100%;
            height: auto;
          }

          .register-left {
            min-height: 430px;
            padding: 34px 26px 36px;
          }

          .register-left::before { content: none; }

          .register-heading,
          .register-subtitle,
          .register-underline,
          .register-feature,
          .register-quote {
            position: relative;
            left: auto !important;
            top: auto;
          }

          .register-heading {
            width: min(100%, 380px);
            font-size: 30px;
            line-height: 37px;
          }

          .register-subtitle {
            margin-top: 18px;
          }

          .register-underline {
            margin-top: 13px;
          }

          .register-feature {
            display: inline-block;
            margin-top: 24px;
            margin-right: 38px;
            vertical-align: top;
          }

          .register-quote {
            margin-top: 38px;
          }

          .register-right {
            display: flex;
            justify-content: center;
            padding: 24px 16px 32px;
          }

          .register-card {
            position: relative;
            left: auto;
            top: auto;
            width: min(100%, 414px);
            max-width: 414px;
          }
        }

        @media (max-width: 768px) {
          .register-left {
            min-height: 440px;
            padding: 28px 20px 32px;
          }

          .register-heading {
            font-size: 28px;
            line-height: 35px;
          }

          .register-subtitle {
            font-size: 16px;
          }

          .register-feature {
            margin-right: 26px;
          }

          .register-quote-text {
            font-size: 15px;
            line-height: 28px;
          }

          .register-right {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px 0;
          }

          .register-card {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 90% !important;
            max-width: 380px !important;
            height: auto !important;
            min-height: unset !important;
            margin: 20px auto !important;
            transform: translateY(-40px) !important;
            padding: 32px 24px 24px !important;
            display: flex !important;
            flex-direction: column !important;
          }

          .register-title {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 10px 0 !important;
            font-size: 34px !important;
            text-align: center !important;
          }

          .register-card-subtitle {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 12px 0 !important;
            text-align: center !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .register-divider {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 40px !important;
            height: 2px !important;
            margin: 0 auto 20px auto !important;
            transform: none !important;
          }

          .role-switch {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 16px 0 !important;
            box-sizing: border-box !important;
            border-radius: 12px !important;
          }

          .register-label {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 6px 0 !important;
          }

          .register-input-wrap {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 16px 0 !important;
            box-sizing: border-box !important;
          }

          .register-submit {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 10px 0 20px 0 !important;
            border-radius: 12px !important;
          }

          .register-login-link {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 10px 0 !important;
            text-align: center !important;
          }

          .verify-email-btn {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: fit-content !important;
            margin: 0 0 16px 0 !important;
          }

          .otp-input-wrapper {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 16px 0 !important;
            box-sizing: border-box !important;
            height: 44px !important;
          }

          .otp-label-container {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 6px 0 !important;
            display: flex !important;
          }

          .register-input {
            font-size: 15px;
          }
        }

        @media (min-width: 2000px) {
          .register-left {
            transform: scale(1.4);
            transform-origin: left center;
            left: 4% !important;
          }
          .register-right {
            transform: scale(1.4);
            transform-origin: right center;
            right: 4% !important;
          }
        }

        @media (min-width: 3200px) {
          .register-left {
            transform: scale(2.0);
            transform-origin: left center;
            left: 8% !important;
          }
          .register-right {
            transform: scale(2.0);
            transform-origin: right center;
            right: 8% !important;
          }
        }
      `}</style>

      <div className="register-stage">
        <div className="register-bg">
          <video className="register-bg-video" autoPlay muted loop playsInline preload="auto">
            <source src={loginVideo} type="video/mp4" />
          </video>
        </div>

        <section className="register-left" aria-label="Vahan Finserv car loan intro">
          <h2 className="register-heading">
            Drive Your Dreams,
            <br />
            <span>Finance Your Journey</span>
          </h2>

          <p className="register-subtitle">
            Fast <span className="register-teal">{bullet}</span> Secure{" "}
            <span className="register-teal">{bullet}</span> Trusted Car Loan
          </p>
          <div className="register-underline" />

          {features.map((feature, index) => (
            <div
              key={feature.label}
              className="register-feature"
              style={{
                left: `calc(${feature.left}px + var(--auth-left-nudge))`,
                animationDelay: `${120 + index * 100}ms`,
              }}
            >
              <div className="register-feature-card">{feature.icon}</div>
              <p className="register-feature-label">{feature.label}</p>
            </div>
          ))}

          <div className="register-quote">
            <p className="register-quote-text">
              <span className="register-quote-mark">{quoteOpen}</span>
              <span className="register-quote-line">{quoteLine1}</span>
              <br />
              <span className="register-quote-line second">{quoteLine2}</span>
              <span className="register-quote-mark"> {quoteClose}</span>
            </p>
          </div>
        </section>

        <section className="register-right" aria-label="Register form">
          <form className="register-card" onSubmit={handleSubmit} style={{ height: `${cardHeight}px` }}>
            <h2 className="register-title">Create Account</h2>
            <p className="register-card-subtitle">Register to continue</p>
            <div className="register-divider" />

            <div className="role-switch" role="tablist" aria-label="Select registration role">
              <button
                type="button"
                className={`role-option ${role === "INDIVIDUAL" ? "active" : ""}`}
                onClick={() => handleRoleChange("INDIVIDUAL")}
              >
                User
              </button>
              <button
                type="button"
                className={`role-option ${role === "DEALER" ? "active" : ""}`}
                onClick={() => handleRoleChange("DEALER")}
              >
                Dealer
              </button>
            </div>

            <label className="register-label name" htmlFor="register-full-name">
              Full Name
            </label>
            <div className="register-input-wrap name">
              <FaUser className="register-input-icon" />
              <input
                id="register-full-name"
                type="text"
                name="fullName"
                placeholder="Enter full name"
                value={form.fullName}
                onChange={handleChange}
                required
                className="register-input"
              />
            </div>

            <label className="register-label mobile" htmlFor="register-mobile">
              Mobile Number
            </label>
            <div className="register-input-wrap mobile">
              <FaPhone className="register-input-icon" />
              <input
                id="register-mobile"
                type="tel"
                name="mobile"
                placeholder="Enter mobile number"
                value={form.mobile}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={10}
                required
                className="register-input"
              />
            </div>

            <label className="register-label email" htmlFor="register-email">
              Email
            </label>
            <div className="register-input-wrap email">
              <FaEnvelope className="register-input-icon" />
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
                readOnly={otpVerified}
                className={`register-input ${otpVerified ? "opacity-75 cursor-not-allowed" : ""}`}
              />
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || otpVerified || !form.email || resendTimer > 0}
              className="verify-email-btn"
            >
              {sendingOtp ? (
                "Sending..."
              ) : otpVerified ? (
                "Email Verified"
              ) : resendTimer > 0 ? (
                `Resend in ${formatTimer(resendTimer)}`
              ) : otpSent ? (
                "Resend OTP"
              ) : (
                "Verify Email"
              )}
            </button>

            {otpSent && (
              <>
                <div
                  className="otp-label-container"
                  style={{ top: `${otpLabelTop}px` }}
                >
                  <label
                    className="register-label"
                    htmlFor="register-otp"
                    style={{ position: "static", margin: 0, padding: 0 }}
                  >
                    OTP
                  </label>
                  {!otpVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || resendTimer > 0}
                      className="otp-resend-btn"
                    >
                      {resendTimer > 0 ? `Resend in ${formatTimer(resendTimer)}` : "Resend OTP"}
                    </button>
                  )}
                </div>
                <div
                  className="otp-input-wrapper"
                  style={{ top: `${otpWrapTop}px` }}
                >
                  <FaShieldAlt className="otp-icon" />
                  <input
                    id="register-otp"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => {
                      if (otpVerified) return;
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    }}
                    readOnly={otpVerified}
                    className={`otp-input ${otpVerified ? "otp-readonly" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpVerified}
                    className={`verify-otp-inside-btn ${otpVerified ? "verified-btn" : ""}`}
                  >
                    {otpVerifying ? "Verifying..." : otpVerified ? "Verified" : "Verify OTP"}
                  </button>
                </div>
              </>
            )}

            <label
              className="register-label password"
              htmlFor="register-password"
              style={{ top: `${passwordLabelTop}px` }}
            >
              Password
            </label>
            <div
              className="register-input-wrap password"
              style={{ top: `${passwordWrapTop}px` }}
            >
              <FaLock className="register-input-icon" />
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                required
                className="register-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="register-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="register-submit"
              style={{ top: `${submitTop}px` }}
            >
              {loading ? "Creating Account..." : `Register ${rightArrow}`}
            </button>

            <p className="register-login-link" style={{ top: `${loginLinkTop}px` }}>
              Already have an account?
              <button type="button" onClick={() => navigate("/login")}>
                Login
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Register;

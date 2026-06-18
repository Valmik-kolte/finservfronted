import { useState } from "react";
import {
  FaCar,
  FaClipboardCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { loginUser } from "../../services/authService.js";
import loginVideo from "../../assets/login-bg.mp4";

const bullet = "\u2022";
const wave = "\u{1F44B}";
const rightArrow = "\u2192";
const quoteOpen = "\u201C";
const quoteClose = "\u201D";
const quoteLine1 =
  "\u0924\u0941\u092e\u091a\u094d\u092f\u093e \u0938\u094d\u0935\u092a\u094d\u0928\u093e\u0924\u0940\u0932 \u0935\u093e\u0939\u0928\u093e\u0938\u093e\u0920\u0940";
const quoteLine2 =
  "\u0935\u093f\u0936\u094d\u0935\u093e\u0938\u093e\u091a\u0940 \u0906\u0930\u094d\u0925\u093f\u0915 \u0938\u093e\u0925";

const features = [
  { label: "Car Loan", icon: <FaCar />, left: 70 },
  { label: "Quick Approval", icon: <FaShieldAlt />, left: 157 },
  { label: "Minimal Documents", icon: <FaClipboardCheck />, left: 256 },
];



const FeatureCards = () => (
  <>
    {features.map((feature, index) => (
      <div
        key={feature.label}
        className="feature-item"
        style={{
          left: `calc(${feature.left}px + var(--auth-left-nudge))`,
          animationDelay: `${120 + index * 100}ms`,
        }}
      >
        <div className="feature-card">{feature.icon}</div>
        <p className="feature-label">{feature.label}</p>
      </div>
    ))}
  </>
);

const LeftMarketingSection = () => (
  <section className="left-section" aria-label="Vahan Finserv car loan intro">


    <h2 className="hero-heading">
      Drive Your Dreams,
      <br />
      <span>Finance Your Journey</span>
    </h2>

    <p className="hero-subtitle">
      Fast <span className="teal-dot">{bullet}</span> Secure{" "}
      <span className="teal-dot">{bullet}</span> Trusted Car Loan
    </p>
    <div className="subtitle-underline" />

    <FeatureCards />

    

    <div className="quote-block">
      <p className="quote-text">
        <span className="quote-mark">{quoteOpen}</span>
        <span className="quote-line">{quoteLine1}</span>
        <br />
        <span className="quote-line second">{quoteLine2}</span>
        <span className="quote-mark"> {quoteClose}</span>
      </p>
    </div>
  </section>
);
const LoginCard = ({
  form,
  handleChange,
  handleSubmit,
  loading,
  onCreateAccount,
  onForgotPassword,
  showPassword,
  togglePassword,
}) => (
  <section className="right-section" aria-label="Login form">
    <form className="login-card" onSubmit={handleSubmit}>
      <h2 className="card-title">Welcome Back {wave}</h2>
      <p className="card-subtitle">Sign in to continue</p>
      <div className="card-divider" />

      <label className="form-label email" htmlFor="login-email">
        Email
      </label>
      <div className="input-wrap email">
        <FaEnvelope className="input-icon" />
        <input
          id="login-email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={form.email}
          onChange={handleChange}
          required
          className="form-input"
        />
      </div>

      <label className="form-label password" htmlFor="login-password">
        Password
      </label>
      <div className="input-wrap password">
        <FaLock className="input-icon" />
        <input
          id="login-password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          required
          className="form-input"
        />
        <button
          type="button"
          onClick={togglePassword}
          className="password-toggle"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      <button type="button" onClick={onForgotPassword} className="forgot-link">
        Forgot Password?
      </button>

      <button type="submit" disabled={loading} className="signin-button">
        {loading ? "Signing in..." : `Login In ${rightArrow}`}
      </button>

      <p className="create-account">
        Don&apos;t have an account?
        <button type="button" onClick={onCreateAccount}>
          Create Account
        </button>
      </p>

      <div className="trust-row">
        <div className="trust-item">
          <FaLock /> Secure Login
        </div>
        <div className="trust-item middle">
          <FaShieldAlt /> RBI Compliant
        </div>
        <div className="trust-item">
          <FaUsers /> Trusted Service
        </div>
      </div>
    </form>
  </section>
);

const clearStoredSession = () => {
  ["token", "role", "user", "userData", "dealerData", "adminData"].forEach((key) =>
    localStorage.removeItem(key)
  );
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const normalizeRole = (role) => {
  const value = String(role || "USER").replace(/^ROLE_/, "").toUpperCase();
  if (value === "ADMIN") return "ADMIN";
  if (value === "DEALER") return "DEALER";
  return "USER";
};

const getLoginData = (response) => {
  const data = response?.data?.data || response?.data || response || {};
  const nestedUser = data.user || data.admin || data.dealer || data.customer || data.profile || {};
  return { ...data, ...nestedUser };
};

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      clearStoredSession();
      let res = null;
      try {
        res = await loginUser(form);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Login failed");
        return;
      }

      const body = getLoginData(res);
      const token = firstValue(body?.token, res?.token, res?.data?.token, res?.data?.data?.token);
      if (!token) {
        toast.error("Token not found in response");
        return;
      }

      const decoded = jwtDecode(token);
      const role = normalizeRole(firstValue(body?.role, decoded?.role));
      localStorage.setItem(`token_${role}`, token);
      const id = firstValue(
        body?.id,
        body?.userId,
        body?.adminId,
        body?.dealerId,
        decoded?.id,
        decoded?.userId,
        decoded?.adminId,
        decoded?.dealerId
      );

      const userObject = {
        ...body,
        id: id || null,
        name: firstValue(body?.fullName, body?.name, decoded?.fullName, decoded?.name, form.email),
        fullName: firstValue(body?.fullName, body?.name, decoded?.fullName, decoded?.name, form.email),
        email: firstValue(body?.email, decoded?.email, decoded?.sub, form.email),
        mobileNumber: firstValue(
          body?.mobileNumber,
          body?.mobile,
          body?.phoneNumber,
          body?.phone,
          body?.contactNumber,
          decoded?.mobileNumber,
          decoded?.mobile,
          decoded?.phoneNumber,
          decoded?.phone,
          decoded?.contactNumber,
          role === "DEALER" ? localStorage.getItem(`dealer_mobile_${form.email.toLowerCase().trim()}`) : null,
          role === "USER" ? localStorage.getItem(`user_mobile_${form.email.toLowerCase().trim()}`) : null,
          null
        ),
        role,
        dealerId:
          role === "DEALER"
            ? firstValue(body?.dealerId, body?.id, decoded?.dealerId, decoded?.id)
            : firstValue(body?.dealerId, decoded?.dealerId, null),
        dealerCode: firstValue(body?.dealerCode, decoded?.dealerCode, null),
        token,
        loginTime: new Date().toISOString(),
      };



      if (role === "ADMIN") {
        localStorage.setItem("adminData", JSON.stringify(userObject));
        toast.success("Admin Login Successful");
        navigate("/admin/dashboard");
      } else if (role === "DEALER") {
        localStorage.setItem("dealerData", JSON.stringify(userObject));
        if (userObject.dealerCode) localStorage.setItem("dealerCode", userObject.dealerCode);
        toast.success("Dealer Login Successful");
        navigate("/dealer/dashboard");
      } else {
        localStorage.setItem("userData", JSON.stringify(userObject));
        toast.success("Login Successful");
        navigate("/customer/dashboard");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="finserv-login-page">
      <style>{`

        @keyframes loginFadeLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .finserv-login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 0;
          background: #020b1c;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          letter-spacing: 0;
        }

        .login-stage {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          overflow: hidden;
          background: #001a3a;
          --auth-left-nudge: 24px;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .bg-video {
          position: absolute;
          inset: 0;
          z-index: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .left-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 52%;
          height: 100%;
          color: #ffffff;
          z-index: 5;
          animation: loginFadeLeft 650ms ease-out both;
        }

        .left-section::before { content: none; }
        .left-section::after { content: none; }

        .hero-heading {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 117px;
          z-index: 2;
          width: 410px;
          margin: 0;
          font-family: "Montserrat ExtraBold", "Noto Sans Devanagari", sans-serif;
          font-size: 36px;
          font-weight: 800;
          line-height: 37px;
          letter-spacing: -0.8px;
          color: #ffffff;
        }

        .hero-heading span {
          color: #00e0d3;
        }

        .hero-subtitle {
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

        .teal-dot {
          color: #00e0d3;
        }

        .subtitle-underline {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 233px;
          z-index: 2;
          width: 36px;
          height: 2px;
          border-radius: 2px;
          background: #00e0d3;
        }

        .feature-item {
          position: absolute;
          top: 260px;
          z-index: 2;
          width: 52px;
          text-align: center;
          animation: loginFadeUp 650ms ease-out both;
        }

        .feature-card {
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

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 22px rgba(0, 224, 211, 0.36);
        }

        .feature-label {
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

        .quote-block {
          position: absolute;
          left: calc(70px + var(--auth-left-nudge));
          top: 348px;
          z-index: 2;
          width: 310px;
          color: #ffffff;
        }

        .quote-mark {
          color: #00e0d3;
          font-size: 26px;
          font-weight: 900;
          line-height: 1;
        }

        .quote-text {
          margin: 0;
          color: #ffffff;
          font-family: "Noto Sans Devanagari", "Inter", sans-serif;
          font-size: 16px;
          font-weight: 500;
          line-height: 30px;
        }

        .quote-line {
          margin-left: 5px;
        }

        .quote-line.second {
          margin-left: 24px;
        }

        .right-section {
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

        .login-card {
          position: relative;
          left: 0;
          top: 30px;
          width: 414px;
          height: 543px;
          animation: loginFadeUp 650ms ease-out both;
          background: transparent;
          border: 3px solid #ffffff;
          border-radius: 24px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .login-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), transparent);
          pointer-events: none;
          border-radius: 24px;
        }

        .card-title {
          position: absolute;
          left: 0;
          top: 58px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 34px;
          font-weight: 700;
          line-height: 1.1;
        }

        .card-subtitle {
          position: absolute;
          left: 0;
          top: 106px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: rgba(255,255,255,0.8);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .card-divider {
          position: absolute;
          left: calc(50% - 20px);
          top: 134px;
          width: 40px;
          height: 2px;
          border-radius: 2px;
          background: #00D4B4;
        }

        .form-label {
          position: absolute;
          left: 37px;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1;
        }

        .form-label.email { top: 149px; }
        .form-label.password { top: 243px; }

        .input-wrap {
          position: absolute;
          left: 37px;
          width: 340px;
          height: 41px;
          display: flex;
          align-items: center;
          border: 1px solid #ffffff;
          border-radius: 12px;
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.85);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .input-wrap.email { top: 169px; }
        .input-wrap.password { top: 264px; }

        .input-wrap:focus-within {
          border-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(0, 212, 180, 0.25);
        }

        .input-wrap:focus-within,
        .input-wrap:has(input:not(:placeholder-shown)) {
          background: rgba(0, 0, 0, 0.45) !important;
        }

        .input-icon {
          flex: 0 0 auto;
          margin-left: 14px;
          font-size: 17px;
          color: rgba(255, 255, 255, 0.7);
        }

        .form-input {
          width: 100%;
          min-width: 0;
          margin-left: 16px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 500;
        }

        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover, 
        .form-input:-webkit-autofill:focus, 
        .form-input:-webkit-autofill:active {
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s !important;
          box-shadow: inset 0 0 20px 20px transparent !important;
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-weight: 500;
        }

        .password-toggle {
          flex: 0 0 auto;
          margin: 0 13px 0 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
        }

        .forgot-link {
          position: absolute;
          right: 37px;
          top: 321px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #00D4B4;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
        }

        .forgot-link:hover { text-decoration: underline; }

        .signin-button {
          position: absolute;
          left: 37px;
          top: 363px;
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
          box-shadow: 0 0 20px rgba(0,212,180,0.35);
          transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
        }

        .signin-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 0 26px rgba(0,212,180,0.55), 0 10px 20px rgba(0, 0, 0, 0.15);
        }

        .signin-button:disabled { cursor: not-allowed; opacity: 0.6; }

        .create-account {
          position: absolute;
          left: 0;
          top: 431px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .create-account button {
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

        .trust-row {
          position: absolute;
          left: 37px;
          top: 486px;
          width: 340px;
          height: 26px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          color: rgba(255, 255, 255, 0.7);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 10px;
          font-weight: 500;
        }

        .trust-item {
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .trust-item.middle {
          border-left: 1px solid rgba(255, 255, 255, 0.2);
          border-right: 1px solid rgba(255, 255, 255, 0.2);
        }

        .trust-item svg { color: #00D4B4; font-size: 14px; }

        @media (max-width: 1100px) {
          .right-section {
            width: 48%;
          }

          .login-card {
            width: min(414px, 92%);
          }
        }

        @media (max-width: 920px) {
          .finserv-login-page {
            display: block;
            min-height: 100vh;
            overflow-y: auto;
            padding: 0;
          }

          .login-stage {
            width: 100%;
            min-height: 100vh;
            height: auto;
            border-radius: 0;
          }

          .left-section,
          .right-section {
            position: relative;
            left: auto;
            right: auto;
            top: auto;
            width: 100%;
            height: auto;
          }

          .left-section {
            min-height: 430px;
            padding: 34px 26px 36px;
          }

          .left-section::before { content: none; }

          .hero-heading,
          .hero-subtitle,
          .subtitle-underline,
          .feature-item,
          .quote-block {
            position: relative;
            left: auto !important;
            top: auto;
          }

          .hero-heading {
            width: min(100%, 380px);
            font-size: 30px;
            line-height: 37px;
          }

          .hero-subtitle {
            margin-top: 18px;
          }

          .subtitle-underline {
            margin-top: 13px;
          }

          .feature-item {
            display: inline-block;
            margin-top: 24px;
            margin-right: 38px;
            vertical-align: top;
          }

          .quote-block {
            margin-top: 38px;
          }

          .right-section {
            display: flex;
            justify-content: center;
            padding: 32px 16px 42px;
          }

          .login-card {
            position: relative;
            left: auto;
            top: auto;
            width: min(100%, 414px);
            max-width: 414px;
          }
        }

        @media (max-width: 768px) {
          .left-section {
            min-height: 440px;
            padding: 28px 20px 32px;
          }

          .hero-heading {
            font-size: 28px;
            line-height: 35px;
          }

          .hero-subtitle {
            font-size: 16px;
          }

          .feature-item {
            margin-right: 26px;
          }

          .quote-text {
            font-size: 15px;
            line-height: 28px;
          }

          .right-section {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px 0;
          }

          .login-card {
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

          .card-title {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 10px 0 !important;
            font-size: 34px !important;
            text-align: center !important;
          }

          .card-subtitle {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 12px 0 !important;
            text-align: center !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
          }

          .card-divider {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 40px !important;
            height: 2px !important;
            margin: 0 auto 20px auto !important;
          }

          .form-label {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 6px 0 !important;
          }

          .input-wrap {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 16px 0 !important;
            box-sizing: border-box !important;
            border-radius: 12px !important;
          }

          .forgot-link {
            position: relative !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            width: auto !important;
            align-self: flex-end !important;
            margin: -6px 0 20px 0 !important;
          }

          .signin-button {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 16px 0 !important;
            border-radius: 12px !important;
          }

          .create-account {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin: 0 0 24px 0 !important;
            text-align: center !important;
          }

          .form-input {
            font-size: 15px;
          }

          .trust-row {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            margin-top: 10px !important;
            padding-top: 0 !important;
            box-sizing: border-box !important;
            font-size: 9px;
          }

          .trust-item {
            gap: 5px;
            border-color: rgba(255, 255, 255, 0.2) !important;
          }

          .trust-item.middle {
            border-left: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
          }
        }

        @media (min-width: 2000px) {
          .left-section {
            transform: scale(1.4);
            transform-origin: left center;
            left: 4% !important;
          }
          .right-section {
            transform: scale(1.4);
            transform-origin: right center;
            right: 4% !important;
          }
        }

        @media (min-width: 3200px) {
          .left-section {
            transform: scale(2.0);
            transform-origin: left center;
            left: 8% !important;
          }
          .right-section {
            transform: scale(2.0);
            transform-origin: right center;
            right: 8% !important;
          }
        }

      `}</style>

      <div className="login-stage" style={{ "--login-bg": `url(${loginVideo})` }}>
        <div className="login-bg">
          <video className="bg-video" autoPlay muted loop playsInline preload="auto">
            <source src={loginVideo} type="video/mp4" />
          </video>
        </div>

        <LeftMarketingSection />
        <LoginCard
          form={form}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          loading={loading}
          onCreateAccount={() => navigate("/register")}
          onForgotPassword={() => navigate("/forgot-password")}
          showPassword={showPassword}
          togglePassword={() => setShowPassword((prev) => !prev)}
        />
      </div>
    </div>
  );
};

export default Login;

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
import logo from "../../assets/vahan-logo.jpg";
import loginVideo from "../../assets/login-bg.mp4";

const bullet = "\u2022";
const wave = "\u{1F44B}";
const rightArrow = "\u2192";
const quoteOpen = "\u201C";
const quoteClose = "\u201D";
const quoteLine1 =
  "\u0924\u0941\u092e\u091a\u094d\u092f\u093e \u0938\u094d\u0935\u092a\u094d\u0928\u093e\u0924\u0940\u0932 \u0935\u093e\u0939\u0928\u093e\u0938\u093e\u0920\u0940";
const quoteLine2 =
  "\u0935\u093f\u0936\u094d\u0935\u093e\u0938\u093e\u0930\u094d\u0939 \u0906\u0930\u094d\u0925\u093f\u0915 \u0938\u093e\u0925";

const features = [
  { label: "Car Loan", icon: <FaCar />, left: 53 },
  { label: "Quick Approval", icon: <FaShieldAlt />, left: 180 },
  { label: "Minimal Documents", icon: <FaClipboardCheck />, left: 315 },
];

const BrandBlock = () => (
  <div className="brand-group">
    <img src={logo} alt="Vahan Finserv" className="brand-logo" />
    <div className="brand-copy">
      <h1 className="brand-name">Vahan <span>Finserv</span></h1>
      <p className="brand-tagline">Smart Finance, Simplified</p>
    </div>
  </div>
);

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
    <BrandBlock />

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
        {loading ? "Signing in..." : `Sign In ${rightArrow}`}
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

      localStorage.setItem("token", token);
      const decoded = jwtDecode(token);
      const role = normalizeRole(firstValue(body?.role, decoded?.role));
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

      localStorage.setItem("role", role);

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
          --auth-left-nudge: 18px;
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

        .login-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 22% 72%, rgba(0, 224, 211, 0.14), transparent 80%),
            linear-gradient(90deg, rgba(0, 10, 35, 0.68) 0%, rgba(0, 10, 35, 0.28) 48%, rgba(0, 10, 35, 0.52) 100%);
        }

        .left-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 58%;
          height: 100%;
          color: #ffffff;
          animation: loginFadeLeft 650ms ease-out both;
        }

        .left-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0, 12, 36, 0.72) 0%, rgba(0, 12, 36, 0.42) 58%, rgba(0, 12, 36, 0.05) 100%);
        }

        .left-section::after {
          content: "";
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.55);
          pointer-events: none;
        }

        .brand-group {
          position: absolute;
          left: calc(50px + var(--auth-left-nudge));
          top: 48px;
          z-index: 2;
          display: flex;
          width: 210px;
          height: 68px;
          align-items: flex-start;
          gap: 14px;
        }

        .brand-logo {
          width: 58px;
          height: 58px;
          object-fit: contain;
          border-radius: 2px;
          box-shadow: 0 0 24px rgba(0, 224, 211, 0.16);
        }

        .brand-copy {
          padding-top: 6px;
        }

        .brand-name {
          margin: 0;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.7px;
          line-height: 1.05;
        }

        .brand-name span {
          display: block;
          color: #00e0d3;
        }

        .brand-tagline {
          margin: 14px 0 0;
          color: #c9d3e7;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .hero-heading {
          position: absolute;
          left: calc(49px + var(--auth-left-nudge));
          top: 200px;
          z-index: 2;
          width: 540px;
          margin: 0;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 44px;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -1.4px;
          color: #ffffff;
          text-shadow: 0 12px 38px rgba(0, 0, 0, 0.42);
        }

        .hero-heading span {
          color: #00e0d3;
        }

        .hero-subtitle {
          position: absolute;
          left: calc(50px + var(--auth-left-nudge));
          top: 334px;
          z-index: 2;
          margin: 0;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 23px;
          font-weight: 700;
          line-height: 28px;
          text-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .teal-dot {
          color: #00e0d3;
        }

        .subtitle-underline {
          position: absolute;
          left: calc(49px + var(--auth-left-nudge));
          top: 372px;
          z-index: 2;
          width: 50px;
          height: 3px;
          border-radius: 3px;
          background: #00e0d3;
        }

        .feature-item {
          position: absolute;
          top: 398px;
          z-index: 2;
          width: 76px;
          text-align: center;
          animation: loginFadeUp 650ms ease-out both;
        }

        .feature-card {
          width: 74px;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 224, 211, 0.65);
          border-radius: 14px;
          background: rgba(0, 25, 65, 0.42);
          color: #ffffff;
          font-size: 31px;
          box-shadow: 0 0 22px rgba(0, 224, 211, 0.34);
          backdrop-filter: blur(10px);
          transition: transform 220ms ease, box-shadow 220ms ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 28px rgba(0, 224, 211, 0.46);
        }

        .feature-label {
          position: absolute;
          top: 88px;
          left: 50%;
          margin: 0;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.94);
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
          text-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
        }

        .quote-block {
          position: absolute;
          left: calc(47px + var(--auth-left-nudge));
          top: 552px;
          z-index: 2;
          width: 380px;
          color: #ffffff;
        }

        .quote-mark {
          color: #00e0d3;
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }

        .quote-text {
          margin: 0;
          color: #ffffff;
          font-family: "Noto Sans Devanagari", "Inter", sans-serif;
          font-size: 18px;
          font-weight: 700;
          line-height: 34px;
          text-shadow: 0 12px 30px rgba(0, 0, 0, 0.42);
        }

        .quote-line {
          margin-left: 5px;
        }

        .quote-line.second {
          margin-left: 28px;
        }

        .right-section {
          position: absolute;
          right: 0;
          top: 0;
          width: 43%;
          height: 100%;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          padding: 48px clamp(36px, 5.2vw, 84px) 48px 0;
          z-index: 3;
        }

        .login-card {
          position: relative;
          width: clamp(390px, 31vw, 460px);
          min-height: 625px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 70px 42px 42px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.36);
          animation: loginFadeUp 650ms ease-out both;
          backdrop-filter: blur(18px);
        }

        .card-title {
          margin: 0;
          text-align: center;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 28px;
          font-weight: 800;
          line-height: 1.12;
        }

        .card-subtitle {
          margin: 26px 0 0;
          text-align: center;
          color: #667085;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 1;
        }

        .card-divider {
          width: 54px;
          height: 3px;
          margin: 20px auto 28px;
          border-radius: 3px;
          background: #00c6bd;
        }

        .form-label {
          margin: 0;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
        }

        .form-label.email {
          margin-top: 0;
        }

        .form-label.password {
          margin-top: 32px;
        }

        .input-wrap {
          width: 100%;
          height: 56px;
          margin-top: 12px;
          display: flex;
          align-items: center;
          box-sizing: border-box;
          border: 1px solid #d9dee8;
          border-radius: 8px;
          background: #ffffff;
          color: #7b8aa8;
          box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .input-wrap.email {
          margin-top: 13px;
        }

        .input-wrap.password {
          margin-top: 13px;
        }

        .input-wrap:focus-within {
          border-color: #00c6bd;
          box-shadow: 0 0 0 4px rgba(0, 198, 189, 0.14);
        }

        .input-icon {
          flex: 0 0 auto;
          margin-left: 18px;
          font-size: 20px;
          color: #7b8aa8;
        }

        .form-input {
          width: 100%;
          min-width: 0;
          margin-left: 20px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 16px;
          font-weight: 600;
        }

        .form-input::placeholder {
          color: #98a2b3;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-weight: 500;
        }

        .password-toggle {
          flex: 0 0 auto;
          margin: 0 16px 0 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #7b8aa8;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .forgot-link {
          align-self: flex-end;
          margin: 23px 0 0;
          border: 0;
          padding: 0;
          background: transparent;
          color: #0047ff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 15px;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .signin-button {
          width: 100%;
          height: 60px;
          margin-top: 42px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(90deg, #14d8c4 0%, #0047d9 100%);
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 18px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
        }

        .signin-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 16px 34px rgba(10, 85, 209, 0.34);
        }

        .signin-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .create-account {
          margin: 30px 0 0;
          text-align: center;
          color: #344054;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 15px;
          font-weight: 400;
          line-height: 1;
        }

        .create-account button {
          margin-left: 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #0047ff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        .trust-row {
          width: 100%;
          height: 26px;
          margin-top: auto;
          padding-top: 34px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          align-items: center;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 12px;
          font-weight: 700;
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
          border-left: 1px solid #d9dee8;
          border-right: 1px solid #d9dee8;
        }

        .trust-item svg {
          color: #061842;
          font-size: 15px;
        }

        @media (max-width: 1100px) {
          .hero-heading {
            font-size: 36px;
            width: 440px;
          }

          .hero-subtitle {
            font-size: 20px;
          }

          .right-section {
            width: 46%;
            padding-right: clamp(24px, 3.6vw, 44px);
          }

          .login-card {
            width: min(410px, 92%);
            padding-left: 34px;
            padding-right: 34px;
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
            min-height: 610px;
            padding: 34px 26px 36px;
          }

          .left-section::before {
            background: rgba(0, 15, 45, 0.64);
          }

          .brand-group,
          .hero-heading,
          .hero-subtitle,
          .subtitle-underline,
          .feature-item,
          .quote-block {
            position: relative;
            left: auto !important;
            top: auto;
          }

          .brand-group {
            margin-bottom: 84px;
          }

          .hero-heading {
            width: min(100%, 520px);
            font-size: 38px;
            line-height: 1.15;
          }

          .hero-subtitle {
            margin-top: 24px;
          }

          .subtitle-underline {
            margin-top: 13px;
          }

          .feature-item {
            display: inline-block;
            margin-top: 24px;
            margin-right: 70px;
            vertical-align: top;
          }

          .quote-block {
            margin-top: 86px;
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
            width: min(100%, 460px);
            max-width: 460px;
          }
        }

        @media (max-width: 480px) {
          .left-section {
            min-height: 600px;
            padding: 28px 20px 32px;
          }

          .brand-group {
            gap: 10px;
            margin-bottom: 68px;
          }

          .hero-heading {
            font-size: 31px;
          }

          .hero-subtitle {
            font-size: 17px;
          }

          .feature-item {
            margin-right: 34px;
          }

          .feature-card {
            width: 62px;
            height: 62px;
          }

          .feature-label {
            top: 74px;
            font-size: 11px;
          }

          .quote-text {
            font-size: 15px;
            line-height: 28px;
          }

          .right-section {
            padding: 20px 16px 28px;
          }

          .login-card {
            width: 100%;
            min-height: 600px;
            padding: 54px 20px 30px;
          }

          .card-title {
            font-size: 25px;
          }

          .form-input {
            font-size: 15px;
          }

          .trust-row {
            font-size: 9px;
            padding-top: 26px;
          }

          .trust-item {
            gap: 5px;
          }
        }

      `}</style>

      <div className="login-stage" style={{ "--login-bg": `url(${loginVideo})` }}>
        <div className="login-bg" />
        <video
      className="bg-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    >
      <source src={loginVideo} type="video/mp4" />
    </video>

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

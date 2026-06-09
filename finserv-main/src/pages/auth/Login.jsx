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
  { label: "Quick Approval", icon: <FaShieldAlt />, left: 140 },
  { label: "Minimal Documents", icon: <FaClipboardCheck />, left: 239 },
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

        .brand-group {
          position: absolute;
          left: calc(50px + var(--auth-left-nudge));
          top: 40px;
          z-index: 2;
          display: flex;
          width: 170px;
          height: 55px;
          align-items: flex-start;
          gap: 13px;
        }

        .brand-logo {
          width: 50px;
          height: 45px;
          object-fit: contain;
        }

        .brand-copy {
          padding-top: 7px;
        }

        .brand-name {
          margin: 0;
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .brand-name span {
          color: #00e0d3;
        }

        .brand-tagline {
          margin: 7px 0 0;
          color: #8fa3c7;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .hero-heading {
          position: absolute;
          left: calc(49px + var(--auth-left-nudge));
          top: 117px;
          z-index: 2;
          width: 380px;
          margin: 0;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 31px;
          font-weight: 800;
          line-height: 38px;
          letter-spacing: -0.8px;
          color: #ffffff;
        }

        .hero-heading span {
          color: #00e0d3;
        }

        .hero-subtitle {
          position: absolute;
          left: calc(50px + var(--auth-left-nudge));
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
          left: calc(49px + var(--auth-left-nudge));
          top: 233px;
          z-index: 2;
          width: 36px;
          height: 2px;
          border-radius: 2px;
          background: #00e0d3;
        }

        .feature-item {
          position: absolute;
          top: 248px;
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
          left: calc(47px + var(--auth-left-nudge));
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
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          animation: loginFadeUp 650ms ease-out both;
        }

        .card-title {
          position: absolute;
          left: 0;
          top: 58px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 23px;
          font-weight: 800;
          line-height: 24px;
        }

        .card-subtitle {
          position: absolute;
          left: 0;
          top: 100px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #667085;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .card-divider {
          position: absolute;
          left: 180px;
          top: 127px;
          width: 40px;
          height: 2px;
          border-radius: 2px;
          background: #00c6bd;
        }

        .form-label {
          position: absolute;
          left: 37px;
          margin: 0;
          color: #061842;
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
          border: 1px solid #d9dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #7b8aa8;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .input-wrap.email { top: 169px; }
        .input-wrap.password { top: 264px; }

        .input-wrap:focus-within {
          border-color: #00c6bd;
          box-shadow: 0 0 0 3px rgba(0, 198, 189, 0.14);
        }

        .input-icon {
          flex: 0 0 auto;
          margin-left: 14px;
          font-size: 17px;
          color: #7b8aa8;
        }

        .form-input {
          width: 100%;
          min-width: 0;
          margin-left: 16px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #061842;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 13px;
          font-weight: 500;
        }

        .form-input::placeholder {
          color: #98a2b3;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-weight: 500;
        }

        .password-toggle {
          flex: 0 0 auto;
          margin: 0 13px 0 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #7b8aa8;
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
          color: #0047ff;
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
          border-radius: 6px;
          background: linear-gradient(90deg, #14d8c4 0%, #0047d9 100%);
          color: #ffffff;
          font-family: "Inter", "Noto Sans Devanagari", sans-serif;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
        }

        .signin-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 16px 34px rgba(10, 85, 209, 0.34);
        }

        .signin-button:disabled { cursor: not-allowed; opacity: 0.6; }

        .create-account {
          position: absolute;
          left: 0;
          top: 431px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #344054;
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
          color: #0047ff;
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
          color: #061842;
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
          border-left: 1px solid #d9dee8;
          border-right: 1px solid #d9dee8;
        }

        .trust-item svg { color: #061842; font-size: 14px; }

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
            margin-bottom: 30px;
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

        @media (max-width: 480px) {
          .left-section {
            min-height: 440px;
            padding: 28px 20px 32px;
          }

          .brand-group {
            gap: 10px;
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

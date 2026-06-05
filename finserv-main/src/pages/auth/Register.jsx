import React, { useState } from "react";
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
import { registerUser } from "../../services/customerService.js";
import { registerDealer } from "../../services/dealerService.js";
import logo from "../../assets/logo3.png";
import heroImage from "../../assets/finserv-login-hero.png";

const bullet = "\u2022";
const rightArrow = "\u2192";
const quoteOpen = "\u201C";
const quoteClose = "\u201D";
const quoteLine1 =
  "\u0924\u0941\u092e\u091a\u094d\u092f\u093e \u0938\u094d\u0935\u092a\u094d\u0928\u093e\u0924\u0940\u0932 \u0935\u093e\u0939\u0928\u093e\u0938\u093e\u0920\u0940";
const quoteLine2 =
  "\u0935\u093f\u0936\u094d\u0935\u093e\u0938\u093e\u0930\u094d\u0939 \u0906\u0930\u094d\u0925\u093f\u0915 \u0938\u093e\u0925";

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

  const features = [
    { label: "Car Loan", icon: <FaCar />, left: 53 },
    { label: "Quick Approval", icon: <FaShieldAlt />, left: 146 },
    { label: "Minimal Documents", icon: <FaClipboardCheck />, left: 239 },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
          overflow: hidden;
          background: #02142d;
          color: #061842;
          font-family: Inter, Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          letter-spacing: 0;
        }

        .register-stage {
          position: relative;
          width: 908px;
          height: 604px;
          overflow: hidden;
          border-radius: 8px;
          background: #001a3a;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
        }

        .register-bg {
          position: absolute;
          inset: 0;
          background-image: var(--register-bg);
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        .register-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0, 10, 35, 0.25);
        }

        .register-left {
          position: absolute;
          left: 0;
          top: 0;
          width: 455px;
          height: 604px;
          color: #ffffff;
          animation: registerFadeLeft 650ms ease-out both;
        }

        .register-left::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0, 15, 45, 0.68) 0%, rgba(0, 15, 45, 0.48) 58%, rgba(0, 15, 45, 0.1) 100%);
        }

        .register-left::after {
          content: "";
          position: absolute;
          inset: 0;
          box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }

        .register-brand {
          position: absolute;
          left: 50px;
          top: 40px;
          z-index: 2;
          display: flex;
          width: 170px;
          height: 55px;
          align-items: flex-start;
          gap: 13px;
        }

        .register-logo {
          width: 50px;
          height: 45px;
          object-fit: contain;
        }

        .register-brand-copy {
          padding-top: 7px;
        }

        .register-brand-name {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
        }

        .register-tagline {
          margin: 7px 0 0;
          color: #8fa3c7;
          font-size: 12px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .register-heading {
          position: absolute;
          left: 49px;
          top: 117px;
          z-index: 2;
          width: 380px;
          margin: 0;
          color: #ffffff;
          font-size: 31px;
          font-weight: 800;
          line-height: 38px;
        }

        .register-heading span {
          color: #00e0d3;
        }

        .register-subtitle {
          position: absolute;
          left: 50px;
          top: 204px;
          z-index: 2;
          margin: 0;
          color: #ffffff;
          font-size: 18px;
          font-weight: 500;
          line-height: 1;
        }

        .register-teal {
          color: #00e0d3;
        }

        .register-underline {
          position: absolute;
          left: 49px;
          top: 233px;
          z-index: 2;
          width: 36px;
          height: 2px;
          border-radius: 2px;
          background: #00e0d3;
        }

        .register-feature {
          position: absolute;
          top: 248px;
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
          color: rgba(255, 255, 255, 0.92);
          font-size: 11px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
        }

        .register-quote {
          position: absolute;
          left: 47px;
          top: 348px;
          z-index: 2;
          width: 310px;
        }

        .register-quote-text {
          margin: 0;
          color: #ffffff;
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
          left: 455px;
          top: 0;
          width: 453px;
          height: 604px;
        }

        .register-card {
          position: absolute;
          left: 11px;
          top: 30px;
          width: 414px;
          height: 543px;
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          animation: registerFadeUp 650ms ease-out both;
        }

        .register-title {
          position: absolute;
          left: 0;
          top: 35px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #061842;
          font-size: 23px;
          font-weight: 800;
          line-height: 24px;
        }

        .register-card-subtitle {
          position: absolute;
          left: 0;
          top: 69px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #667085;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .register-divider {
          position: absolute;
          left: 187px;
          top: 95px;
          width: 40px;
          height: 2px;
          border-radius: 2px;
          background: #00c6bd;
        }

        .role-switch {
          position: absolute;
          left: 37px;
          top: 116px;
          width: 340px;
          height: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          border: 1px solid #d9dee8;
          border-radius: 8px;
          background: #f8fafc;
          padding: 4px;
        }

        .role-option {
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #667085;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease;
        }

        .role-option.active {
          background: linear-gradient(90deg, #14d8c4 0%, #0047d9 100%);
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(10, 85, 209, 0.22);
        }

        .register-label {
          position: absolute;
          left: 37px;
          margin: 0;
          color: #061842;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
        }

        .register-label.name { top: 174px; }
        .register-label.mobile { top: 240px; }
        .register-label.email { top: 306px; }
        .register-label.password { top: 372px; }

        .register-input-wrap {
          position: absolute;
          left: 37px;
          width: 340px;
          height: 37px;
          display: flex;
          align-items: center;
          border: 1px solid #d9dee8;
          border-radius: 6px;
          background: #ffffff;
          color: #7b8aa8;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }

        .register-input-wrap.name { top: 191px; }
        .register-input-wrap.mobile { top: 257px; }
        .register-input-wrap.email { top: 323px; }
        .register-input-wrap.password { top: 389px; }

        .register-input-wrap:focus-within {
          border-color: #00c6bd;
          box-shadow: 0 0 0 3px rgba(0, 198, 189, 0.14);
        }

        .register-input-icon {
          flex: 0 0 auto;
          margin-left: 14px;
          color: #7b8aa8;
          font-size: 15px;
        }

        .register-input {
          width: 100%;
          min-width: 0;
          margin-left: 15px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #061842;
          font-size: 13px;
          font-weight: 500;
        }

        .register-input::placeholder {
          color: #98a2b3;
          font-weight: 500;
        }

        .register-password-toggle {
          flex: 0 0 auto;
          margin: 0 13px 0 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #7b8aa8;
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
        }

        .register-submit {
          position: absolute;
          left: 37px;
          top: 448px;
          width: 340px;
          height: 43px;
          border: 0;
          border-radius: 6px;
          background: linear-gradient(90deg, #14d8c4 0%, #0047d9 100%);
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
        }

        .register-submit:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 16px 34px rgba(10, 85, 209, 0.34);
        }

        .register-submit:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .register-login-link {
          position: absolute;
          left: 0;
          top: 510px;
          width: 100%;
          margin: 0;
          text-align: center;
          color: #344054;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
        }

        .register-login-link button {
          margin-left: 8px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #0047ff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        @media (max-width: 920px) {
          .finserv-register-page {
            display: block;
            min-height: 100vh;
            overflow-y: auto;
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

          .register-left::before {
            background: rgba(0, 15, 45, 0.66);
          }

          .register-brand,
          .register-heading,
          .register-subtitle,
          .register-underline,
          .register-feature,
          .register-quote {
            position: relative;
            left: auto !important;
            top: auto;
          }

          .register-brand {
            margin-bottom: 30px;
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
          }
        }
      `}</style>

      <div className="register-stage" style={{ "--register-bg": `url(${heroImage})` }}>
        <div className="register-bg" />

        <section className="register-left" aria-label="FinServ car loan intro">
          <div className="register-brand">
            <img src={logo} alt="FinServ" className="register-logo" />
            <div className="register-brand-copy">
              <h1 className="register-brand-name">FinServ</h1>
              <p className="register-tagline">Smart Finance, Simplified</p>
            </div>
          </div>

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
              style={{ left: `${feature.left}px`, animationDelay: `${120 + index * 100}ms` }}
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
          <form className="register-card" onSubmit={handleSubmit}>
            <h2 className="register-title">Create Account</h2>
            <p className="register-card-subtitle">Register to continue</p>
            <div className="register-divider" />

            <div className="role-switch" role="tablist" aria-label="Select registration role">
              <button
                type="button"
                className={`role-option ${role === "INDIVIDUAL" ? "active" : ""}`}
                onClick={() => setRole("INDIVIDUAL")}
              >
                User
              </button>
              <button
                type="button"
                className={`role-option ${role === "DEALER" ? "active" : ""}`}
                onClick={() => setRole("DEALER")}
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
                className="register-input"
              />
            </div>

            <label className="register-label password" htmlFor="register-password">
              Password
            </label>
            <div className="register-input-wrap password">
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

            <button type="submit" disabled={loading} className="register-submit">
              {loading ? "Creating Account..." : `Register ${rightArrow}`}
            </button>

            <p className="register-login-link">
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

import React from "react";
import {
  FaCar,
  FaClipboardCheck,
  FaShieldAlt,
} from "react-icons/fa";
import logo from "../../assets/vahan-logo.jpg";
import loginVideo from "../../assets/login-bg.mp4";

const bullet = "\u2022";
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

const AuthPageFrame = ({ children, ariaLabel = "Authentication form" }) => (
  <div className="auth-frame-page">
    <style>{`
      @keyframes authFadeLeft {
        from { opacity: 0; transform: translateX(-24px); }
        to { opacity: 1; transform: translateX(0); }
      }

      @keyframes authFadeUp {
        from { opacity: 0; transform: translateY(22px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .auth-frame-page {
        min-height: 100vh;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 8px;
        background: #02142d;
        color: #061842;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        letter-spacing: 0;
      }

      .auth-stage {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #001a3a;
        --auth-left-nudge: 24px;
      }

      .auth-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
        z-index: 1;
        pointer-events: none;
      }

      .auth-bg-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .auth-left {
        position: absolute;
        left: 0;
        top: 0;
        width: 52%;
        height: 100%;
        color: #ffffff;
        z-index: 5;
        animation: authFadeLeft 650ms ease-out both;
      }

      .auth-left::before { content: none; }
      .auth-left::after { content: none; }

      .auth-brand {
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

      .auth-logo {
        width: 50px;
        height: 45px;
        object-fit: contain;
      }

      .auth-brand-copy {
        padding-top: 7px;
      }

      .auth-brand-name {
        margin: 0;
        color: #ffffff;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      .auth-brand-name span {
        color: #00e0d3;
      }

      .auth-tagline {
        margin: 7px 0 0;
        color: #8fa3c7;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 12px;
        font-weight: 400;
        line-height: 1;
        white-space: nowrap;
      }

      .auth-heading {
        position: absolute;
        left: calc(49px + var(--auth-left-nudge));
        top: 120px;
        z-index: 2;
        width: 380px;
        margin: 0;
        color: #ffffff;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 31px;
        font-weight: 800;
        line-height: 38px;
        letter-spacing: -0.8px;
      }

      .auth-heading span {
        color: #00e0d3;
      }

      .auth-subtitle {
        position: absolute;
        left: calc(50px + var(--auth-left-nudge));
        top: 205px;
        z-index: 2;
        margin: 0;
        color: #ffffff;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 18px;
        font-weight: 500;
        line-height: 24px;
      }

      .auth-teal {
        color: #00e0d3;
      }

      .auth-underline {
        position: absolute;
        left: calc(49px + var(--auth-left-nudge));
        top: 233px;
        z-index: 2;
        width: 36px;
        height: 2px;
        border-radius: 2px;
        background: #00e0d3;
      }

      .auth-feature {
        position: absolute;
        top: 248px;
        z-index: 2;
        width: 52px;
        text-align: center;
        animation: authFadeUp 650ms ease-out both;
      }

      .auth-feature-card {
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

      .auth-feature-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 0 22px rgba(0, 224, 211, 0.36);
      }

      .auth-feature-label {
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

      .auth-quote {
        position: absolute;
        left: calc(47px + var(--auth-left-nudge));
        top: 348px;
        z-index: 2;
        width: 310px;
        color: #ffffff;
      }

      .auth-quote-mark {
        color: #00e0d3;
        font-size: 26px;
        font-weight: 900;
        line-height: 1;
      }

      .auth-quote-text {
        margin: 0;
        color: #ffffff;
        font-family: "Noto Sans Devanagari", "Inter", sans-serif;
        font-size: 16px;
        font-weight: 500;
        line-height: 30px;
      }

      .auth-quote-line {
        margin-left: 5px;
      }

      .auth-quote-line.second {
        margin-left: 24px;
      }

      .auth-right {
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

      .auth-card {
        position: relative;
        left: 0;
        top: 30px;
        width: 414px;
        height: 543px;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        animation: authFadeUp 650ms ease-out both;
      }

      .auth-simple-title {
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

      .auth-simple-subtitle {
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

      .auth-simple-divider {
        position: absolute;
        left: 180px;
        top: 127px;
        width: 40px;
        height: 2px;
        border-radius: 2px;
        background: #00c6bd;
      }

      .auth-simple-label {
        position: absolute;
        left: 37px;
        margin: 0;
        color: #061842;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
      }

      .auth-simple-label.first {
        top: 164px;
      }

      .auth-simple-label.second {
        top: 258px;
      }

      .auth-simple-input-wrap {
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

      .auth-simple-input-wrap.first {
        top: 184px;
      }

      .auth-simple-input-wrap.second {
        top: 278px;
      }

      .auth-simple-input-wrap:focus-within {
        border-color: #00c6bd;
        box-shadow: 0 0 0 3px rgba(0, 198, 189, 0.14);
      }

      .auth-simple-icon {
        flex: 0 0 auto;
        margin-left: 14px;
        font-size: 17px;
        color: #7b8aa8;
      }

      .auth-simple-input {
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

      .auth-simple-input::placeholder {
        color: #98a2b3;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 13px;
        font-weight: 500;
      }

      .auth-simple-submit {
        position: absolute;
        left: 37px;
        top: 295px;
        width: 340px;
        height: 43px;
        border: 0;
        border-radius: 6px;
        background: linear-gradient(90deg, #14d8c4 0%, #0a55d1 100%);
        color: #ffffff;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease;
      }

      .auth-simple-submit.two-fields {
        top: 363px;
      }

      .auth-simple-submit:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 16px 34px rgba(10, 85, 209, 0.34);
      }

      .auth-simple-link {
        position: absolute;
        left: 0;
        top: 370px;
        width: 100%;
        border: 0;
        padding: 0;
        background: transparent;
        color: #0047ff;
        font-family: "Inter", "Noto Sans Devanagari", sans-serif;
        font-size: 13px;
        font-weight: 500;
        text-align: center;
        cursor: pointer;
      }

      .auth-simple-link.two-fields {
        top: 435px;
      }

      .auth-simple-link:hover {
        text-decoration: underline;
      }

      @media (max-width: 920px) {
        .auth-frame-page {
          display: block;
          min-height: 100vh;
          overflow-y: auto;
          padding: 0;
        }

        .auth-stage {
          width: 100%;
          min-height: 100vh;
          height: auto;
        }

        .auth-left,
        .auth-right {
          position: relative;
          left: auto;
          right: auto;
          top: auto;
          width: 100%;
          height: auto;
        }

        .auth-left {
          min-height: 430px;
          padding: 34px 26px 36px;
        }

        .auth-left::before { content: none; }

        .auth-brand,
        .auth-heading,
        .auth-subtitle,
        .auth-underline,
        .auth-feature,
        .auth-quote {
          position: relative;
          left: auto !important;
          top: auto;
        }

        .auth-brand {
          margin-bottom: 30px;
        }

        .auth-heading {
          width: min(100%, 380px);
          font-size: 30px;
          line-height: 37px;
        }

        .auth-subtitle {
          margin-top: 18px;
        }

        .auth-underline {
          margin-top: 13px;
        }

        .auth-feature {
          display: inline-block;
          margin-top: 24px;
          margin-right: 38px;
          vertical-align: top;
        }

        .auth-quote {
          margin-top: 38px;
        }

        .auth-right {
          display: flex;
          justify-content: center;
          padding: 24px 16px 32px;
        }

        .auth-card {
          position: relative;
          left: auto;
          top: auto;
          width: min(100%, 414px);
          max-width: 414px;
        }
      }

      @media (max-width: 480px) {
        .auth-left {
          min-height: 440px;
          padding: 28px 20px 32px;
        }

        .auth-brand {
          gap: 10px;
        }

        .auth-heading {
          font-size: 28px;
          line-height: 35px;
        }

        .auth-subtitle {
          font-size: 16px;
        }

        .auth-feature {
          margin-right: 26px;
        }

        .auth-quote-text {
          font-size: 15px;
          line-height: 28px;
        }

        .auth-right {
          padding: 20px 16px 28px;
        }

        .auth-card {
          width: 100%;
        }

        .auth-simple-divider {
          left: 50%;
          transform: translateX(-50%);
        }

        .auth-simple-label,
        .auth-simple-input-wrap,
        .auth-simple-submit {
          left: 20px;
          width: calc(100% - 40px);
        }
      }
    `}</style>

    <div className="auth-stage">
      <div className="auth-bg">
        <video className="auth-bg-video" autoPlay muted loop playsInline preload="auto">
          <source src={loginVideo} type="video/mp4" />
        </video>
      </div>

      <section className="auth-left" aria-label="Vahan Finserv car loan intro">
        <div className="auth-brand">
          <img src={logo} alt="Vahan Finserv" className="auth-logo" />
          <div className="auth-brand-copy">
            <h1 className="auth-brand-name">Vahan <span>Finserv</span></h1>
            <p className="auth-tagline">Smart Finance, Simplified</p>
          </div>
        </div>

        <h2 className="auth-heading">
          Drive Your Dreams,
          <br />
          <span>Finance Your Journey</span>
        </h2>

        <p className="auth-subtitle">
          Fast <span className="auth-teal">{bullet}</span> Secure{" "}
          <span className="auth-teal">{bullet}</span> Trusted Car Loan
        </p>
        <div className="auth-underline" />

        {features.map((feature, index) => (
          <div
            key={feature.label}
            className="auth-feature"
            style={{
              left: `calc(${feature.left}px + var(--auth-left-nudge))`,
              animationDelay: `${120 + index * 100}ms`,
            }}
          >
            <div className="auth-feature-card">{feature.icon}</div>
            <p className="auth-feature-label">{feature.label}</p>
          </div>
        ))}

        <div className="auth-quote">
          <p className="auth-quote-text">
            <span className="auth-quote-mark">{quoteOpen}</span>
            <span className="auth-quote-line">{quoteLine1}</span>
            <br />
            <span className="auth-quote-line second">{quoteLine2}</span>
            <span className="auth-quote-mark"> {quoteClose}</span>
          </p>
        </div>
      </section>

      <section className="auth-right" aria-label={ariaLabel}>
        <div className="auth-card">{children}</div>
      </section>
    </div>
  </div>
);

export default AuthPageFrame;

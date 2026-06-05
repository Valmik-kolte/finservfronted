import React from "react";
import { Routes, Route } from "react-router-dom";

import Landing from "../pages/landing/Landing";
import LoanCalculator from "../pages/landing/LoanCalculator";
import Faq from "../pages/landing/Faq";
import PrivacyPolicy from "../pages/landing/PrivacyPolicy";
import TermsCondition from "../pages/landing/TermsCondition";
import RefundPolicy from "../pages/landing/RefundPolicy";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyOtp from "../pages/auth/VerifyOtp";
import Unauthorized from "../pages/auth/Unauthorized";

import AdminDashboard from "../pages/admin/Dashboard";
import DealerDashboard from "../pages/dealer/DealerDashboard";
import CustomerDashboard from "../pages/customer/CustomerDashboard";

const AppRoutes = () => (
  <Routes>
    {/* LANDING */}
    <Route path="/" element={<Landing />} />
    <Route path="/loan-calculator" element={<LoanCalculator />} />
    <Route path="/faq" element={<Faq />} />
    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    <Route path="/terms-and-conditions" element={<TermsCondition />} />
    <Route path="/terms-condition" element={<TermsCondition />} />
    <Route path="/terms-conditions" element={<TermsCondition />} />
    <Route path="/refund-policy" element={<RefundPolicy />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/register/dealer" element={<Register defaultRole="DEALER" />} />
    <Route path="/register/customer" element={<Register defaultRole="INDIVIDUAL" />} />

    {/* AUTH */}
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-otp" element={<VerifyOtp />} />

    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* ADMIN */}
    <Route path="/admin/dashboard" element={<AdminDashboard />} />

    {/* DEALER */}
    <Route path="/dealer/dashboard" element={<DealerDashboard />} />

    {/* CUSTOMER */}
    <Route path="/customer/dashboard" element={<CustomerDashboard />} />
  </Routes>
);

export default AppRoutes;

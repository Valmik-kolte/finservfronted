import React from "react";
import { Routes, Route } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import DealerRegister from "../pages/auth/DealerRegister";
import CustomerRegister from "../pages/auth/CustomerRegister";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import VerifyOtp from "../pages/auth/VerifyOtp";
import Unauthorized from "../pages/auth/Unauthorized";

import AdminDashboard from "../pages/admin/Dashboard";
import DealerDashboard from "../pages/dealer/DealerDashboard";
import CustomerDashboard from "../pages/customer/CustomerDashboard";

const AppRoutes = () => (
  <Routes>
    {/* AUTH */}
    <Route element={<AuthLayout />}>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/dealer" element={<DealerRegister />} />
      <Route path="/register/customer" element={<CustomerRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
    </Route>

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

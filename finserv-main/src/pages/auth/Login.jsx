import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../../services/authService.js";
import { jwtDecode } from "jwt-decode";


const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

 const handleSubmit = async (e) => {

  e.preventDefault();

  setLoading(true);

  try {

    const res = await loginUser(form);

    console.log("[LOGIN] full response:", res);

    const token =
      res?.token ||
      res?.data?.token ||
      res?.data?.data?.token;

    if (!token) {

      toast.error("Token not found");

      return;
    }

    /* SAVE TOKEN */

    localStorage.setItem("token", token);

    /* DECODE TOKEN */

    const decoded = jwtDecode(token);

    console.log("[LOGIN] decoded JWT:", decoded);

    const role = decoded?.role || "USER";

    /* COMMON USER OBJECT */

    const userObject = {

      id:
        decoded?.id || null,

      name:
        decoded?.name || "",

      email:
        decoded?.sub || "",

      role:
        decoded?.role || "",

      dealerId:
        decoded?.dealerId || null,

      dealerCode:
        decoded?.dealerCode || null,

      token,

      loginTime:
        new Date().toISOString(),
    };

    /* SAVE ROLE */

    localStorage.setItem("role", role);

    /* REMOVE OLD DATA */

    localStorage.removeItem("userData");
    localStorage.removeItem("dealerData");
    localStorage.removeItem("adminData");

    /* ROLE BASED STORAGE */

    if (role === "ADMIN") {

      localStorage.setItem(
        "adminData",
        JSON.stringify(userObject)
      );

      toast.success("Admin Login Successful");

      navigate("/admin/dashboard");
    }

    else if (role === "DEALER") {

      localStorage.setItem(
        "dealerData",
        JSON.stringify(userObject)
      );

      // Save dealerCode separately for easy access
      if (userObject.dealerCode) {
        localStorage.setItem("dealerCode", userObject.dealerCode);
      }

      // Save dealer code to ID mapping in localStorage for customer lookup
      if (userObject.dealerCode && (userObject.dealerId || userObject.id)) {
        const codeMap = JSON.parse(localStorage.getItem("dealerCodeMap") || "{}");
        codeMap[userObject.dealerCode] = userObject.dealerId || userObject.id;
        localStorage.setItem("dealerCodeMap", JSON.stringify(codeMap));
      }

      toast.success("Dealer Login Successful");

      navigate("/dealer/dashboard");
    }

    else {

      localStorage.setItem(
        "userData",
        JSON.stringify(userObject)
      );

      // Save user mobile from registration fallback if present
      if (userObject.email && userObject.id) {
        const savedMobile = localStorage.getItem("user_mobile_" + userObject.email.toLowerCase().trim());
        if (savedMobile) {
          localStorage.setItem("user_mobile_" + userObject.id, savedMobile);
        }
      }

      toast.success("Login Successful");

      navigate("/customer/dashboard");
    }

  }

  catch (error) {

    console.log(error);

    toast.error(
      error?.response?.data?.message ||
      "Login failed"
    );

  }

  finally {

    setLoading(false);
  }
};

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Welcome Back</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Sign in to continue</p>

      <form onSubmit={handleSubmit}>
        <label className="text-sm text-gray-600">Email</label>
        <div className="flex items-center border rounded-lg px-3 py-3 mt-1 mb-4 bg-gray-50">
          <FaEnvelope className="text-gray-400" />
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={form.email}
            onChange={handleChange}
            required
            className="ml-2 bg-transparent outline-none w-full text-sm"
          />
        </div>

        <label className="text-sm text-gray-600">Password</label>
        <div className="flex items-center border rounded-lg px-3 py-3 mt-1 mb-5 bg-gray-50">
          <FaLock className="text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter password"
            value={form.password}
            onChange={handleChange}
            required
            className="ml-2 bg-transparent outline-none w-full text-sm"
          />
          {showPassword ? (
            <FaEyeSlash onClick={() => setShowPassword(false)} className="cursor-pointer text-gray-400" />
          ) : (
            <FaEye onClick={() => setShowPassword(true)} className="cursor-pointer text-gray-400" />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium hover:bg-[#081f36] transition disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">Don't have an account?</p>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="mt-2 text-[#0b2a4a] font-semibold hover:text-[#27D3C3] transition"
          >
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;

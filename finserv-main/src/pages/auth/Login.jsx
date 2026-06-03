import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser, loginDealer } from "../../services/authService.js";
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
    let res = null;
    let usedEndpoint = "/auth/login";

    // Single login attempt – the backend returns role (DEALER, ADMIN, USER)
    try {
      res = await loginUser(form);
      console.log("[LOGIN] /auth/login SUCCESS:", JSON.stringify(res, null, 2));
    } catch (e) {
      console.log("[LOGIN] /auth/login FAILED status:", e?.response?.status);
      console.log("[LOGIN] /auth/login FAILED data:", JSON.stringify(e?.response?.data, null, 2));
      const msg = e?.response?.data?.message || "Login failed";
      toast.error(msg);
      return;
    }

    console.log("[LOGIN] used endpoint:", usedEndpoint);

    const token = res?.token || res?.data?.token || res?.data?.data?.token;
    console.log("[LOGIN] token found:", !!token, "| value:", token?.substring(0, 30));

    if (!token) {
      toast.error("Token not found in response");
      return;
    }

    localStorage.setItem("token", token);

    const decoded = jwtDecode(token);
    console.log("[LOGIN] decoded JWT:", JSON.stringify(decoded, null, 2));
    const role = decoded?.role || "USER";

    const body = res?.data?.data || res?.data || res || {};
    console.log("[LOGIN] body extracted:", JSON.stringify(body, null, 2));

    const userObject = {
      id:         decoded?.id         || body?.id         || body?.userId     || null,
      name:       decoded?.name       || body?.fullName   || "",
      email:      decoded?.sub        || body?.email      || "",
      role:       decoded?.role       || body?.role       || "",
      dealerId:   decoded?.dealerId   || body?.dealerId   || body?.id         || null,
      dealerCode: decoded?.dealerCode || body?.dealerCode || null,
      token,
      loginTime: new Date().toISOString(),
    };
    console.log("[LOGIN] userObject saved:", JSON.stringify(userObject, null, 2));

    localStorage.setItem("role", role);
    localStorage.removeItem("userData");
    localStorage.removeItem("dealerData");
    localStorage.removeItem("adminData");

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
    console.log("[LOGIN] unexpected error:", error?.message, JSON.stringify(error?.response?.data, null, 2));
    toast.error(error?.response?.data?.message || error?.message || "Login failed");
  } finally {
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

import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaPhone } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { registerUser } from "../../services/customerService.js";
import { registerDealer } from "../../services/dealerService.js";

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: "",
    fullName: "",
    mobile: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (form.role === "DEALER") {
        const res = await registerDealer({
          fullName: form.fullName,
          email: form.email,
          mobileNumber: form.mobile,
          password: form.password,
          registrationType: form.role,
        });

        

        toast.success("Dealer Registered 🎉");
        navigate("/");
      } else {
        const res = await registerUser({
          fullName: form.fullName,
          email: form.email,
          mobileNumber: form.mobile,
          password: form.password,
          registrationType: form.role,
        });

        if (form.email && form.mobile) {
          localStorage.setItem("user_mobile_" + form.email.toLowerCase().trim(), form.mobile);
        }

        toast.success("User Registered Successfully 🎉");
        navigate("/");
      }
    } catch (err) {
      // Only show error if backend didn’t return 201
      toast.error(err.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Create Account</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Register to continue</p>

      <form onSubmit={handleSubmit}>
        <label className="text-sm text-gray-600">Select Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleChange}
          className="w-full border rounded-lg px-3 py-3 mt-1 mb-4 bg-gray-50 outline-none"
          required
        >
          <option value="">Choose Role</option>
          <option value="DEALER">Dealer</option>
          <option value="INDIVIDUAL">User</option>
        </select>

        <label className="text-sm text-gray-600">Full Name</label>
        <div className="flex items-center border rounded-lg px-3 py-3 mt-1 mb-4 bg-gray-50">
          <FaUser className="text-gray-400" />
          <input
            type="text"
            name="fullName"
            placeholder="Enter full name"
            value={form.fullName}
            onChange={handleChange}
            required
            className="ml-2 bg-transparent outline-none w-full text-sm"
          />
        </div>

        <label className="text-sm text-gray-600">Mobile Number</label>
        <div className="flex items-center border rounded-lg px-3 py-3 mt-1 mb-4 bg-gray-50">
          <FaPhone className="text-gray-400" />
          <input
            type="text"
            name="mobile"
            placeholder="Enter mobile number"
            value={form.mobile}
            onChange={handleChange}
            required
            className="ml-2 bg-transparent outline-none w-full text-sm"
          />
        </div>

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
            <FaEyeSlash
              onClick={() => setShowPassword(false)}
              className="cursor-pointer text-gray-400"
            />
          ) : (
            <FaEye
              onClick={() => setShowPassword(true)}
              className="cursor-pointer text-gray-400"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium hover:bg-[#081f36] transition disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Register →"}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-500">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/")}
          className="text-[#1cc5b7] cursor-pointer font-medium hover:underline"
        >
          Login
        </span>
      </p>
    </div>
  );
};

export default Register;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("OTP sent to your email");
    navigate("/verify-otp");
  };

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Forgot Password</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Enter your email to receive OTP</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-3 mb-4 bg-gray-50 outline-none text-sm"
        />
        <button type="submit" className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium">
          Send OTP
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-gray-500 cursor-pointer" onClick={() => navigate("/")}>
        Back to Login
      </p>
    </div>
  );
};

export default ForgotPassword;

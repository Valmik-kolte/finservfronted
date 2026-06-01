import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success("OTP verified");
    navigate("/reset-password");
  };

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Verify OTP</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Enter the OTP sent to your email</p>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full border rounded-lg px-3 py-3 mb-4 bg-gray-50 outline-none text-sm" />
        <button type="submit" className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium">Verify OTP</button>
      </form>
    </div>
  );
};

export default VerifyOtp;

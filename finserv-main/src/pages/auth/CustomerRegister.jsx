import React from "react";
import { useNavigate } from "react-router-dom";

const CustomerRegister = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-white w-full max-w-md p-6 sm:p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Customer Registration</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Register as a customer</p>
      <button onClick={() => navigate("/")} className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium">
        Back to Login
      </button>
    </div>
  );
};

export default CustomerRegister;

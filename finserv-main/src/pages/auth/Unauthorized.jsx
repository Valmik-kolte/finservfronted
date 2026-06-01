import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f5f7fb]">
      <h1 className="text-5xl font-bold text-[#0b2a4a] mb-4">403</h1>
      <p className="text-gray-500 mb-6">You are not authorized to access this page.</p>
      <button onClick={() => navigate("/")} className="px-6 py-3 bg-[#0b2a4a] text-white rounded-xl font-medium">
        Go to Login
      </button>
    </div>
  );
};

export default Unauthorized;

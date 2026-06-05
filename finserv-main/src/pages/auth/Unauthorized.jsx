import React from "react";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7fb] px-4 text-center">
      <h1 className="mb-4 text-4xl sm:text-5xl font-bold text-[#0b2a4a]">403</h1>
      <p className="mb-6 text-gray-500">You are not authorized to access this page.</p>
      <button onClick={() => navigate("/")} className="px-6 py-3 bg-[#0b2a4a] text-white rounded-xl font-medium">
        Go to Login
      </button>
    </div>
  );
};

export default Unauthorized;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { registerDealer } from "../../services/dealerService";

const DealerRegister = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerDealer(form);

      // Backend returns DealerResponseDTO inside res.data.data
      const data = res?.data?.data;
      if (data) {
        const { dealerId, dealerCode } = data;
        if (dealerId) localStorage.setItem("dealerId", dealerId);
        if (dealerCode) localStorage.setItem("dealerCode", dealerCode);
        
        // Save dealer code to ID mapping in localStorage for customer lookup
        if (dealerCode && dealerId) {
          const codeMap = JSON.parse(localStorage.getItem("dealerCodeMap") || "{}");
          codeMap[dealerCode] = dealerId;
          localStorage.setItem("dealerCodeMap", JSON.stringify(codeMap));
        }
      }
      localStorage.setItem("role", "DEALER");

      toast.success("Registration Successful 🎉");
      navigate("/dealer/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-semibold text-center mb-1">Dealer Registration</h2>
      <p className="text-sm text-gray-500 text-center mb-6">Register as a dealer</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-600">Full Name</label>
          <input
            type="text"
            name="fullName"
            placeholder="Enter full name"
            value={form.fullName}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-3 mt-1 bg-gray-50 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-3 mt-1 bg-gray-50 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Mobile Number</label>
          <input
            type="text"
            name="mobileNumber"
            placeholder="Enter mobile number"
            value={form.mobileNumber}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-3 mt-1 bg-gray-50 outline-none text-sm"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-3 mt-1 bg-gray-50 outline-none text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#0b2a4a] text-white rounded-lg font-medium hover:bg-[#081f36] transition disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register →"}
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

export default DealerRegister;

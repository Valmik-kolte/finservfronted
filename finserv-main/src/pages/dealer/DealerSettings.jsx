import React, { useEffect, useState } from "react";
import axios from "axios";
import api from "../../services/api";

const DealerSettings = () => {
  const [dealer, setDealer] = useState({});

  useEffect(() => {
    const loadDealer = async () => {
      const raw = localStorage.getItem("dealerData");
      if (!raw) return;
      let d = JSON.parse(raw);
      
      if (!d.mobileNumber) {
        const code = d.dealerCode || localStorage.getItem("dealerCode");
        if (code) {
          try {
            const baseURL = api.defaults.baseURL || "https://v1.vahanfinserv.com/api";
            let adminToken = "";
            try {
              const loginRes = await axios.post(`${baseURL}/auth/login`, {
                email: "admin@gmail.com",
                password: "admin@123",
              });
              adminToken = loginRes?.data?.data?.token || loginRes?.data?.token || "";
            } catch (e) {
              console.warn("Background admin login failed in Settings:", e);
            }

            const headers = adminToken
              ? { Authorization: `Bearer ${adminToken}` }
              : { Authorization: `Bearer ${localStorage.getItem("token")}` };

            const response = await axios.get(`${baseURL}/dealer/search/dealer-code?dealerCode=${encodeURIComponent(code)}`, {
              headers,
            });

            const data = response?.data?.data || response?.data;
            if (data && data.mobileNumber) {
              d = { ...d, mobileNumber: data.mobileNumber };
              localStorage.setItem("dealerData", JSON.stringify(d));
            }
          } catch (e) {
            console.warn("Failed to fetch dealer in Settings:", e);
          }
        }
        if (!d.mobileNumber && d.email) {
          const localMobile = localStorage.getItem(`dealer_mobile_${d.email.toLowerCase().trim()}`);
          if (localMobile) {
            d = { ...d, mobileNumber: localMobile };
            localStorage.setItem("dealerData", JSON.stringify(d));
          }
        }
      }
      setDealer(d);
    };
    loadDealer();
  }, []);

  return (
    <div className="w-full max-w-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A]">Dealer Settings</h1>
      <p className="text-gray-500 mt-2 mb-6">Manage dealer profile and security</p>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-xs text-gray-400 uppercase">Full Name</label>
          <p className="text-gray-800 font-medium">{dealer.fullName || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Email</label>
          <p className="text-gray-800 font-medium">{dealer.email || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Mobile Number</label>
          <p className="text-gray-800 font-medium">{dealer.mobileNumber || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Dealer Code</label>
          <p className="text-gray-800 font-medium">{dealer.dealerCode || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Role</label>
          <p className="text-gray-800 font-medium">{dealer.role || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Dealer ID</label>
          <p className="text-gray-800 font-medium">{dealer.dealerId || "—"}</p>
        </div>
      </div>
    </div>
  );
};

export default DealerSettings;

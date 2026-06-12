import React, { useEffect, useState } from "react";

const DealerSettings = () => {
  const [dealer, setDealer] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem("dealerData");
    if (!raw) return;
    const d = JSON.parse(raw);
    setDealer(d);
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

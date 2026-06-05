import React, { useEffect, useState } from "react";
import { getUserProfile } from "../../services/customerService";

const CustomerSettings = () => {
  const [user, setUser] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem("userData");
    if (!raw) return;
    const u = JSON.parse(raw);
    getUserProfile(u.id)
      .then((profile) => setUser(profile))
      .catch(() => setUser(u));
  }, []);

  return (
    <div className="w-full max-w-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A]">Settings</h1>
      <p className="text-gray-500 mt-2 mb-6">Manage your profile and security</p>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-xs text-gray-400 uppercase">Full Name</label>
          <p className="text-gray-800 font-medium">{user.fullName || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Email</label>
          <p className="text-gray-800 font-medium">{user.email || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Mobile Number</label>
          <p className="text-gray-800 font-medium">{user.mobileNumber || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Role</label>
          <p className="text-gray-800 font-medium">{user.role || "—"}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">User ID</label>
          <p className="text-gray-800 font-medium">{user.userId || "—"}</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSettings;

import React from "react";
import { Outlet } from "react-router-dom";

const AdminLayout = () => (
  <div className="flex min-h-screen bg-[#F4F6F9]">
    <Outlet />
  </div>
);

export default AdminLayout;

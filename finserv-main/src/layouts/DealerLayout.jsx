import React from "react";
import { Outlet } from "react-router-dom";

const DealerLayout = () => (
  <div className="flex min-h-screen bg-[#F4F6F9]">
    <Outlet />
  </div>
);

export default DealerLayout;

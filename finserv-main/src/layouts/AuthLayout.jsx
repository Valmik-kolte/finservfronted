import React from "react";
import { Outlet } from "react-router-dom";

const AuthLayout = () => (
  <div className="flex h-screen w-full overflow-hidden">
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a2540] via-[#0b2a4a] to-[#081f36] text-white px-20 py-20 flex-col justify-between">
      <div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Caryanam <br /> FinServ
        </h1>
        <p className="text-gray-300">Auto Finance Platform</p>
      </div>
    </div>
    <div className="flex w-full md:w-1/2 items-center justify-center bg-[#f5f7fb] p-4">
      <Outlet />
    </div>
  </div>
);

export default AuthLayout;

import React from "react";

import {
  FaTachometerAlt,
  FaFileAlt,
  FaClipboardCheck,
  FaCog,
  FaSignOutAlt,
  FaBars,
} from "react-icons/fa";
import logo from "../../assets/vahan-logo.jpg";

const menuItems = [
  { name: "Dashboard", icon: <FaTachometerAlt /> },
  { name: "Documents", icon: <FaFileAlt /> },
  { name: "Status", icon: <FaClipboardCheck /> },
  { name: "Settings", icon: <FaCog /> },
];

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeMenu,
  setActiveMenu,
  handleLogout,
  showAlertDot,
}) => {
  const handleMenuSelect = (name) => {
    setActiveMenu(name);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh flex-col bg-[#0B2A4A] text-white transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        sidebarOpen
          ? "w-[calc(100vw-1rem)] translate-x-0 sm:w-72 md:w-72"
          : "w-[calc(100vw-1rem)] -translate-x-full sm:w-72 md:w-24 md:translate-x-0"
      }`}
    >
      <div
        className={`flex border-b border-white/10 ${
          sidebarOpen
            ? "items-center justify-between px-3 py-5 sm:px-4 sm:py-6"
            : "items-center justify-center px-3 py-5 md:flex-col md:gap-4"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!sidebarOpen) setSidebarOpen(true);
          }}
          className={`flex min-w-0 items-center rounded-2xl text-left ${
            sidebarOpen ? "gap-3 px-4 sm:px-5" : "justify-center hover:bg-white/10"
          }`}
          aria-label={sidebarOpen ? "Customer home" : "Expand navigation"}
        >
          <img
            src={logo}
            alt="Vahan Finserv"
            className={`shrink-0 rounded-full bg-white object-cover ring-2 ring-[#27D3C3]/30 ${
              sidebarOpen ? "h-12 w-12" : "h-12 w-12"
            }`}
          />
          {sidebarOpen && (
            <div className="flex min-w-0 flex-col justify-center leading-none">
              <h1 className="m-0 truncate text-2xl font-black tracking-normal text-white">Vahan</h1>
              <p className="m-0 mt-1 truncate text-sm font-bold tracking-normal text-[#27D3C3]">Finserv</p>
            </div>
          )}
        </button>

        {sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl hover:bg-white/10"
            aria-label="Collapse navigation"
          >
            <FaBars />
          </button>
        )}
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3 sm:px-4">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleMenuSelect(item.name)}
            title={!sidebarOpen ? item.name : undefined}
            className={`mb-3 flex w-full items-center rounded-2xl py-4 transition-all duration-200 ${
              sidebarOpen ? "justify-start gap-4 px-4 sm:px-5" : "justify-center px-0"
            } ${
              activeMenu === item.name
                ? "bg-[#27D3C3] text-[#0B2A4A] font-bold"
                : "hover:bg-white/10"
            }`}
          >
            <span className="text-lg relative flex items-center justify-center">
              {item.icon}
              {item.name === "Status" && showAlertDot && (
                <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </span>
            {sidebarOpen && <span className="text-sm">{item.name}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleLogout}
          title={!sidebarOpen ? "Logout" : undefined}
          className={`flex w-full items-center rounded-2xl bg-red-500 py-4 font-medium text-white transition-all hover:bg-red-600 ${
            sidebarOpen ? "justify-start gap-4 px-5" : "justify-center px-0"
          }`}
        >
          <FaSignOutAlt className="text-lg" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

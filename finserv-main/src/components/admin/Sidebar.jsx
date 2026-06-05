import React from "react";

import {
  FaTachometerAlt,
  FaUsers,
  FaUserTie,
  FaChartBar,
  FaUniversity,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaClipboardCheck,
  FaRupeeSign,
} from "react-icons/fa";

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeMenu,
  setActiveMenu,
  handleLogout,
}) => {

  const menuItems = [
    {
      name: "Dashboard",
      icon: <FaTachometerAlt />,
    },
    {
      name: "Users",
      icon: <FaUsers />,
    },
    {
      name: "Dealers",
      icon: <FaUserTie />,
    },
    {
      name: "Documents",
      icon: <FaClipboardCheck />,
    },
    {
      name: "Payments",
      icon: <FaRupeeSign />,
    },
    {
      name: "Banks",
      icon: <FaUniversity />,
    },
    {
      name: "Reports",
      icon: <FaChartBar />,
    },
    {
      name: "Settings",
      icon: <FaCog />,
    },
  ];

  return (

    <div
      className={`bg-[#0B2A4A] text-white transition-all duration-300 flex flex-col
      ${
        sidebarOpen
          ? "w-72"
          : "w-24"
      }`}
    >

      {/* LOGO */}

      <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">

        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-2xl bg-[#27D3C3] flex items-center justify-center text-2xl">

            🏦

          </div>

          {sidebarOpen && (

            <div>

              <h1 className="text-2xl font-bold">

                Caryanam

              </h1>

              <p className="text-sm text-gray-300">

                FinServ

              </p>

            </div>
          )}
        </div>

        <button
          onClick={() =>
            setSidebarOpen(
              !sidebarOpen
            )
          }
          className="text-xl"
        >

          <FaBars />

        </button>
      </div>

      {/* MENU */}

      <div className="flex-1 mt-8 px-4">

        {menuItems.map((item) => (

          <button
            key={item.name}
            onClick={() =>
              setActiveMenu(
                item.name
              )
            }
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-4 transition-all duration-200
            ${
              activeMenu ===
              item.name
                ? "bg-[#27D3C3] text-[#0B2A4A] font-bold"
                : "hover:bg-white/10"
            }`}
          >

            <span className="text-lg">

              {item.icon}

            </span>

            {sidebarOpen && (

              <span className="text-sm">

                {item.name}

              </span>
            )}
          </button>
        ))}
      </div>

      {/* LOGOUT */}

      <div className="p-4 border-t border-white/10 mt-auto">

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl
          bg-red-500 hover:bg-red-600 transition-all text-white font-medium"
        >

          <FaSignOutAlt className="text-lg" />

          {sidebarOpen && (

            <span>
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

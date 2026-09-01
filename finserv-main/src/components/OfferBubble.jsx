import React, { useState } from "react";
import { FaGift, FaCar, FaTimes, FaArrowRight, FaShieldAlt, FaGem, FaCheckCircle } from "react-icons/fa";

const OfferBubble = () => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* LEFT SIDE FLOATING BUBBLE (Vertically Centered) */}
      {!isCollapsed ? (
        <div
          onClick={() => setIsOpenModal(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 cursor-pointer group select-none animate-left-bubble-float"
          aria-label="Vahan Finserv Special Offer"
        >
          <div className="relative flex items-center bg-gradient-to-r from-[#0B1E3F] via-[#112B5A] to-[#0A4D68] text-white pl-3 pr-4 py-3 rounded-r-2xl border-y border-r border-[#1ECFC3]/40 shadow-[0_10px_30px_rgba(30,207,195,0.25)] hover:shadow-[0_12px_40px_rgba(30,207,195,0.45)] hover:border-[#1ECFC3] transition-all duration-300 max-w-[245px] sm:max-w-[280px]">
            
            {/* Gift Icon Badge */}
            <div className="relative flex-shrink-0 mr-3">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#1ECFC3] to-amber-400 opacity-75 blur-sm animate-pulse"></div>
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#1ECFC3] to-[#00B4D8] text-white shadow-md group-hover:scale-105 transition-transform duration-300">
                <FaGift className="text-lg animate-bounce" />
              </div>
            </div>

            {/* Bubble Text */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#1ECFC3]">
                <FaCar className="text-xs text-yellow-300" />
                <span className="truncate">VAHAN FINSERV SPECIAL!</span>
              </div>
              <h4 className="text-xs sm:text-sm font-black leading-tight text-white mt-0.5 group-hover:text-yellow-300 transition-colors">
                🎁 Free Insurance Premium Offer!
              </h4>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-300">
                <span>Up to 2 Yrs Free • Tap for info</span>
                <FaArrowRight className="text-[9px] text-[#1ECFC3] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Minimize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-red-500 hover:border-red-500 flex items-center justify-center transition-all shadow-md"
              title="Minimize Offer"
              aria-label="Minimize offer banner"
            >
              <FaTimes className="text-[9px]" />
            </button>
          </div>
        </div>
      ) : (
        /* COLLAPSED TAB BUTTON */
        <div
          onClick={() => setIsOpenModal(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 cursor-pointer group"
          title="Click to view Vahan Finserv Special Offer"
        >
          <div className="flex items-center gap-2 bg-[#112B5A] text-white px-3 py-2.5 rounded-r-xl border-y border-r border-[#1ECFC3]/50 shadow-lg hover:bg-[#163772] hover:border-[#1ECFC3] transition-all duration-300 animate-pulse">
            <div className="relative">
              <FaGift className="text-yellow-300 text-base animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1ECFC3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1ECFC3]"></span>
              </span>
            </div>
            <span className="text-xs font-bold text-[#1ECFC3] hidden sm:inline">Free Insurance Offer!</span>
          </div>
        </div>
      )}

      {/* CLEAN & SIMPLE POPUP WITH LUXURY & NON-LUXURY BREAKDOWN */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0"
            onClick={() => setIsOpenModal(false)}
          ></div>

          {/* Compact Popup Card */}
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 z-10 overflow-hidden animate-float-card">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B1E3F] via-[#112B5A] to-[#0A4D68] px-5 py-4 text-white relative">
              <button
                onClick={() => setIsOpenModal(false)}
                className="absolute top-3.5 right-3.5 rounded-full bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition"
                aria-label="Close"
              >
                <FaTimes size={13} />
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
                <FaCar className="text-xs" /> Vahan Finserv Special Offer
              </div>
              <h3 className="text-lg font-black text-white leading-snug">
                🎁 Free Vehicle Insurance <span className="text-[#1ECFC3]">Premium!</span>
              </h3>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-3.5 text-slate-700 text-xs leading-relaxed">
              <p className="font-semibold text-slate-800 text-xs">
                Enjoy 100% free vehicle insurance premium benefits based on your vehicle category:
              </p>

              {/* Offer Breakdown Cards */}
              <div className="space-y-2.5 pt-0.5">
                {/* Non-Luxury Cars */}
                <div className="flex items-start gap-3 rounded-xl bg-teal-50/70 p-3 border border-[#1ECFC3]/30">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#1ECFC3]/20 text-[#112B5A]">
                    <FaCar size={13} />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-[#112B5A] flex items-center gap-1">
                      Non-Luxury / Standard Cars
                    </h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                      🎁 <strong className="text-teal-700 font-bold">Last 2 Years’ Insurance FREE!</strong> Pay ₹0 premium for the final 24 months of coverage.
                    </p>
                  </div>
                </div>

                {/* Luxury / Premium Cars */}
                <div className="flex items-start gap-3 rounded-xl bg-amber-50/70 p-3 border border-amber-300/40">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-700">
                    <FaGem size={13} />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                      Luxury & Premium Cars
                    </h5>
                    <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                      👑 <strong className="text-amber-800 font-bold">1st Year Insurance FREE!</strong> Enjoy 1 full year of 100% complimentary insurance premium.
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Terms */}
              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                <FaCheckCircle className="text-[#1ECFC3] text-xs flex-shrink-0 mt-0.5" />
                <span>
                  Applicable on new vehicle loan approvals & balance transfers processed through Vahan Finserv.
                </span>
              </div>

              {/* Got It Button */}
              <div className="pt-2">
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#112B5A] to-[#0A4D68] text-white text-xs font-bold hover:opacity-95 transition shadow-sm"
                >
                  Got It
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default OfferBubble;

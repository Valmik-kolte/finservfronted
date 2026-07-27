import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

const PromoBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-[90px] right-6 z-40 w-[195px] bg-white/95 backdrop-blur-sm rounded-[14px] border border-[#16D5E3]/20 pt-[10px] pb-[10px] pl-[12px] pr-[12px] shadow-[0_10px_25px_rgba(0,0,0,0.06)] hover:-translate-y-[2px] hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col animate-promo-banner select-none text-slate-800">

      {/* Dismiss Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition"
        aria-label="Close"
      >
        <FaTimes size={6} />
      </button>

      {/* Top Gradient Badge */}
      <div className="flex mb-[8px]">
        <span className="h-[20px] bg-gradient-to-r from-[#16D5E3] to-[#0F2D52] text-white text-[9px] font-extrabold uppercase px-[10px] rounded-full tracking-wider shadow-sm flex items-center justify-center">
          ⚡ Quick Loan Offer
        </span>
      </div>

      {/* Main Heading */}
      <h4 className="text-[15px] font-bold text-[#0F2D52] leading-[1.15] tracking-[-0.2px] mb-[6px]">
        Know Your Loan Status <br />
        in <span className="text-[#16D5E3]">10 Minutes</span>
      </h4>

      {/* Feature list */}
      <div className="flex flex-col gap-[4px] text-[11px] font-bold text-[#0F2D52]/80 border-t border-slate-100/50 pt-[4px]">
        <span className="flex items-center gap-[6px]"><span className="text-[11px] text-[#16D5E3]">⚡</span> Fast Approval</span>
        <span className="flex items-center gap-[6px]"><span className="text-[11px] text-[#16D5E3]">🔒</span> Secure Process</span>
      </div>

      {/* Bottom tap prompt */}
      <div className="border-t border-slate-100/50 mt-[4px] pt-[4px]">
        <p className="text-[11px] font-medium text-[#0F2D52]/60 flex items-center gap-1.5 leading-tight">
          <span>👇</span> Tap WhatsApp
        </p>
      </div>

      {/* Down-pointing pointer shape */}
      <div className="absolute -bottom-1.5 right-6 w-2.5 h-2.5 bg-white border-r border-b border-[#16D5E3]/20 rotate-45"></div>

    </div>
  );
};

export default PromoBanner;

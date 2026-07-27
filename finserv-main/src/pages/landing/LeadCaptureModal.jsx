import React, { useState } from "react";
import { FaTimes, FaWhatsapp } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const LeadCaptureModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Front-end Validation
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!mobileNumber.trim()) {
      setError("Mobile number is required.");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobileNumber)) {
      setError("Mobile Number must contain exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      // POST lead to Spring Boot API
      await axios.post("http://localhost:8085/api/v1/whatsapp-leads", {
        name: name.trim(),
        mobileNumber: mobileNumber.trim()
      });

      toast.success("Lead registered! Redirecting to WhatsApp...");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save WhatsApp lead:", err);
      // Fallback message extraction
      const serverMessage = err.response?.data?.message || "Failed to register lead. Please try again.";
      setError(serverMessage);
      toast.error(serverMessage);
      
      // If there's an API failure, we should still allow redirection as fallback for optimal UX
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2D52]/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-white/95 rounded-[16px] border border-[#16D5E3]/25 shadow-[0_20px_50px_rgba(15,45,82,0.15)] max-w-sm w-full p-6 relative transition-all duration-300 transform scale-100 select-none text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <FaTimes size={14} />
        </button>

        {/* Top Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-full bg-[#16D5E3]/15 flex items-center justify-center text-[#16D5E3]">
            <FaWhatsapp size={20} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#0F2D52] leading-tight">
              Connect via WhatsApp
            </h3>
            <p className="text-[11px] text-[#0F2D52]/60">
              Enter details to check your loan status
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {error && (
            <div className="text-red-500 bg-red-50/50 border border-red-100 rounded-[8px] p-2.5 text-[11px] font-semibold leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#0F2D52]/80 uppercase tracking-wider">
              Full Name
            </label>
            <input 
              type="text"
              placeholder="e.g. Rahul Patil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-[13px] bg-slate-50/50 border border-slate-200 rounded-[10px] px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16D5E3] focus:ring-1 focus:ring-[#16D5E3]/25 transition"
              disabled={isSubmitting}
            />
          </div>

          {/* Mobile Number Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#0F2D52]/80 uppercase tracking-wider">
              Mobile Number
            </label>
            <input 
              type="tel"
              placeholder="10-digit number"
              maxLength={10}
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full text-[13px] bg-slate-50/50 border border-slate-200 rounded-[10px] px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#16D5E3] focus:ring-1 focus:ring-[#16D5E3]/25 transition"
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className="w-full mt-2 rounded-full bg-gradient-to-r from-[#1ECFC3] to-[#0F2D52] hover:from-[#1ECFC3]/90 hover:to-[#0F2D52]/90 text-white font-bold py-2.5 px-4 rounded shadow-md transition duration-200 flex items-center justify-center gap-2 text-[13px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <FaWhatsapp size={16} />
                <span>Start Chat</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LeadCaptureModal;

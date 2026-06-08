import React from "react";
import chatboxIcon from "../../assets/chatbox.png";

// Floating launcher for the Vahan Finserv assistant. It intentionally stays below dashboard drawers and modals.
const ChatbotButton = ({ onClick, unreadCount = 0 }) => (
  <button
    type="button"
    onClick={onClick}
    className="fixed bottom-4 right-4 z-[35] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#0B2A4A] text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#12385f] sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
    aria-label="Open Vahan Finserv assistant"
  >
    <img src={chatboxIcon} alt="" className="h-full w-full object-cover" />
    <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-[#27D3C3]" />
    {unreadCount > 0 && (
      <span className="absolute -left-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
        {unreadCount}
      </span>
    )}
  </button>
);

export default ChatbotButton;

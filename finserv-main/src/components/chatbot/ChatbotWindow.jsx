import React, { useEffect, useMemo, useRef } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "filedata",
  "otp",
  "binarydata",
  "userid",
  "id",
  "documentid",
  "docid",
]);

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value);

const titleize = (value) =>
  String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isSensitiveKey = (key) => {
  const normalized = String(key || "").replace(/[_-]/g, "").toLowerCase();
  return SENSITIVE_KEYS.has(normalized);
};

const isDateKey = (key) => /date|time|at$/i.test(key);
const isAmountKey = (key) => /amount|loan|payable|fee|gst/i.test(key);

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (key === "paymentDone") return value ? "Payment Approved" : "Payment Pending";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (isDateKey(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (isAmountKey(key) && !Number.isNaN(Number(value))) {
    return Number(value).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === "object") return "";
  return String(value);
};

const getRenderableEntries = (record) =>
  Object.entries(record || {})
    .filter(([key, value]) => !isSensitiveKey(key) && !Array.isArray(value) && !isPlainObject(value))
    .slice(0, 8);

const getDataRecords = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (isPlainObject(data)) {
    const nestedList = [
      data.items,
      data.records,
      data.users,
      data.documents,
      data.dealers,
      data.results,
      data.content,
      data.data,
    ].find(Array.isArray);
    return nestedList || [];
  }
  return [];
};

// Safely renders chatbot API payloads without exposing tokens, passwords, OTPs, or file binaries.
const shouldShowDocumentNavigation = (actionKey = "") =>
  actionKey.includes("DOCUMENT") || actionKey.includes("PENDING");

const getDocumentTarget = (role) => (role === "DEALER" ? "Status" : "Documents");

const DataPreview = ({ data, actionKey, role, onNavigateSection }) => {
  const records = useMemo(() => getDataRecords(data), [data]);

  if (!data) return null;

  if (records.length > 0) {
    const visibleRecords = records.slice(0, 5);
    const remaining = records.length - visibleRecords.length;

    return (
      <div className="mt-3 space-y-2">
        {visibleRecords.map((record, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 bg-white p-3 text-xs">
            {getRenderableEntries(record).length === 0 ? (
              <p className="text-slate-500">No displayable fields.</p>
            ) : (
              getRenderableEntries(record).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 py-1">
                  <span className="shrink-0 font-bold text-[#0B2A4A]">{titleize(key)}</span>
                  <span className="break-words text-right text-slate-600">{formatValue(key, value)}</span>
                </div>
              ))
            )}
          </div>
        ))}
        {remaining > 0 && (
          <div className="space-y-2">
            <p className="rounded-full bg-[#EAFBF8] px-3 py-2 text-center text-xs font-bold text-[#0B2A4A]">
              + {remaining} more records
            </p>
            {onNavigateSection && shouldShowDocumentNavigation(actionKey) && (
              <button
                type="button"
                onClick={() => onNavigateSection(getDocumentTarget(role))}
                className="w-full rounded-2xl bg-[#0B2A4A] px-3 py-2 text-xs font-bold text-white"
              >
                View Documents
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isPlainObject(data)) {
    const entries = getRenderableEntries(data);
    if (entries.length === 0) {
      return <p className="mt-3 text-xs text-slate-500">No records found for this action.</p>;
    }

    return (
      <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 py-1.5">
            <span className="shrink-0 font-bold text-[#0B2A4A]">{titleize(key)}</span>
            <span className="break-words text-right text-slate-600">{formatValue(key, value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const MessageBubble = ({ message, role, onNavigateSection }) => {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "rounded-br-md bg-[#0B2A4A] text-white"
            : "rounded-bl-md bg-[#F4F6F9] text-slate-700"
        }`}
      >
        <p className="leading-6">{message.text}</p>
        {!isUser && (
          <DataPreview
            data={message.data}
            actionKey={message.actionKey}
            role={role}
            onNavigateSection={onNavigateSection}
          />
        )}
      </div>
    </div>
  );
};

// Chat window for role-aware FinServ quick actions and structured assistant responses.
const ChatbotWindow = ({
  role,
  messages,
  menuItems,
  loading,
  onClose,
  onAction,
  onNavigateSection,
}) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <section className="fixed bottom-20 left-3 right-3 z-[35] max-h-[75vh] overflow-hidden rounded-3xl bg-white shadow-2xl sm:bottom-[90px] sm:left-auto sm:right-6 sm:w-[400px] sm:max-h-[70vh]">
      <div className="flex items-center justify-between gap-3 bg-[#0B2A4A] px-4 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#27D3C3] text-[#0B2A4A]">
            <FaRobot />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black">FinServ Assistant</h2>
            <span className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#27D3C3]">
              {role || "SESSION"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="Close FinServ assistant"
        >
          <FaTimes />
        </button>
      </div>

      <div className="flex max-h-[calc(75vh-72px)] flex-col sm:max-h-[calc(70vh-72px)]">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="rounded-3xl bg-[#F4F6F9] p-4 text-sm text-slate-500">
              Choose a quick action to get started.
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                role={role}
                onNavigateSection={onNavigateSection}
              />
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md bg-[#F4F6F9] px-4 py-3 text-sm text-slate-600">
                Fetching latest FinServ data...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onAction(item)}
                disabled={loading}
                className="rounded-full bg-[#EAFBF8] px-3 py-2 text-xs font-bold text-[#0B2A4A] transition hover:bg-[#27D3C3] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChatbotWindow;

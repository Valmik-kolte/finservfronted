import React, { useEffect, useMemo, useRef } from "react";
import { FaTimes, FaTrash } from "react-icons/fa";
import chatboxIcon from "../../assets/chatbox.png";
import api from "../../services/api";
import { toast } from "react-toastify";

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

  if (key === "month") {
    const now = new Date();
    if (value === "current") {
      return now.toLocaleString("en-IN", { month: "long", year: "numeric" });
    }
    if (value === "last") {
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      return lastMonth.toLocaleString("en-IN", { month: "long", year: "numeric" });
    }
  }

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

const getRenderableEntries = (record, actionKey) => {
  const entries = [];
  Object.entries(record || {}).forEach(([key, value]) => {
    if (isSensitiveKey(key)) return;
    if (key.toLowerCase() === "verified") return;
    if (key === "showPaymentButton" || key === "redirectToActionNeeded") return;
    if (actionKey === "ADMIN_DOCUMENT_SUMMARY" && key.toLowerCase() === "month") return;
    if (Array.isArray(value)) return;
    if (isPlainObject(value)) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (subKey.toLowerCase() === "verified") return;
        if (subKey === "showPaymentButton" || subKey === "redirectToActionNeeded") return;
        if (actionKey === "ADMIN_DOCUMENT_SUMMARY" && subKey.toLowerCase() === "month") return;
        if (!isSensitiveKey(subKey) && !Array.isArray(subValue) && !isPlainObject(subValue)) {
          entries.push([subKey, subValue]);
        }
      });
    } else {
      entries.push([key, value]);
    }
  });
  return entries.slice(0, 12);
};

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

const DataPreview = ({ data, actionKey, role, onNavigateSection, onAction, menuItems = [] }) => {
  const records = useMemo(() => getDataRecords(data), [data]);
  const [uploadingDocId, setUploadingDocId] = React.useState(null);

  if (!data) return null;

  const handleFileChange = async (e, docId, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be 5MB or smaller.");
      return;
    }

    try {
      setUploadingDocId(docId);
      
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      const userId = userData.userId || userData.id;
      if (!userId) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // 1. Delete existing document if it exists
      if (docId) {
        try {
          await api.delete(`/documents/${docId}`);
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
        }
      }

      // 2. Upload new document
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("type", docType);
      formData.append("file", file);

      await api.post("/documents/upload", formData);

      // Send notification to admin
      try {
        const fullName = userData.fullName || userData.name || "Customer";
        await api.post("/notifications/send", {
          senderId: userId,
          receiverId: 1, // Admin id is 1
          senderRole: "USER",
          receiverRole: "ADMIN",
          message: `${fullName} reuploaded ${titleize(docType)}.`,
        });
      } catch (errNotif) {
        console.error("Failed to send reupload notification to admin:", errNotif);
      }

      toast.success(`${titleize(docType)} reuploaded successfully!`);

      // Refresh the "Action Needed" view in the chatbot
      const actionNeededItem = menuItems.find((item) => item.key === "USER_ACTION_NEEDED");
      if (onAction && actionNeededItem) {
        onAction(actionNeededItem);
      }
    } catch (error) {
      console.error("Chatbot upload failed:", error);
      toast.error(error?.response?.data?.message || "Reupload failed. Please try again.");
    } finally {
      setUploadingDocId(null);
    }
  };
  
  if (actionKey === "USER_DOCUMENT_STATUS" && Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="mt-3 text-xs text-slate-500">No documents uploaded yet.</p>;
    }

    return (
      <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm space-y-2 font-sans w-full">
        <h4 className="font-bold text-[#0B2A4A] border-b pb-1.5 text-xs">Document Status Summary</h4>
        <div className="overflow-x-auto -mx-3 px-3">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-1.5 pr-2 font-bold text-[#0B2A4A] min-w-[70px]">Type</th>
                <th className="py-1.5 px-1 font-bold text-[#0B2A4A]">Status</th>
                <th className="py-1.5 px-1 font-bold text-[#0B2A4A]">Uploaded</th>
                <th className="py-1.5 pl-2 font-bold text-[#0B2A4A] min-w-[80px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((doc, idx) => {
                const type = doc.documentType || doc.type || "";
                const status = doc.status || "PENDING";
                const remarks = doc.remarks || doc.remark || "—";
                const uploadedAt = doc.uploadedAt || doc.createdAt || doc.updatedAt || "";
                
                let statusColor = "bg-amber-50 text-amber-700 border-amber-100";
                if (status === "APPROVED" || status === "VERIFIED") {
                  statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                } else if (status === "REJECTED") {
                  statusColor = "bg-red-50 text-red-700 border-red-100";
                }

                let formattedTime = "N/A";
                if (uploadedAt) {
                  const d = new Date(uploadedAt);
                  if (!Number.isNaN(d.getTime())) {
                    formattedTime = d.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  }
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition duration-150">
                    <td className="py-2 pr-2 font-bold text-slate-700 break-words max-w-[85px]">
                      {titleize(type)}
                    </td>
                    <td className="py-2 px-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[8px] font-bold ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-slate-500 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td className="py-2 pl-2 text-slate-500 break-words max-w-[100px]">
                      {remarks}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (actionKey === "USER_TIMELINE" && Array.isArray(data)) {
    return (
      <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs space-y-4 shadow-sm">
        <h4 className="font-bold text-[#0B2A4A] border-b pb-2 mb-2 text-sm">Loan Journey Tracker</h4>
        <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4">
          {data.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";
            const isFailed = step.status === "failed";
            
            let bulletColor = "bg-slate-300 text-slate-500";
            let textColor = "text-slate-400 font-normal";
            let icon = "○";
            
            if (isCompleted) {
              bulletColor = "bg-[#27D3C3] text-[#0B2A4A]";
              textColor = "text-slate-600 font-medium";
              icon = "✓";
            } else if (isCurrent) {
              bulletColor = "bg-[#0B2A4A] text-[#27D3C3] animate-pulse";
              textColor = "text-[#0B2A4A] font-bold";
              icon = "▶";
            } else if (isFailed) {
              bulletColor = "bg-red-500 text-white";
              textColor = "text-red-600 font-bold";
              icon = "✗";
            }

            return (
              <div key={idx} className="relative flex items-center gap-3">
                <span className={`absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${bulletColor}`}>
                  {icon}
                </span>
                <span className={textColor}>{step.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (actionKey === "USER_ASSIGNED_BANK" && isPlainObject(data) && data.bankName && data.bankName !== "N/A") {
    return (
      <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-sm space-y-3">
        <div className="flex items-center gap-3 border-b pb-2 mb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAFBF8] text-[#0B2A4A] font-black text-lg">
            🏦
          </div>
          <div>
            <h4 className="font-black text-[#0B2A4A] text-sm">{data.bankName}</h4>
            <p className="text-slate-500 text-[10px]">{data.branchName || "Corporate Branch"}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-50 pb-1.5 font-sans">
            <span className="font-bold text-[#0B2A4A]">Manager Name</span>
            <span className="text-slate-600">{data.branchManagerName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 pb-1.5 font-sans">
            <span className="font-bold text-[#0B2A4A]">Contact Mobile</span>
            <a href={`tel:${data.branchManagerMobile}`} className="text-blue-600 hover:underline font-bold">
              {data.branchManagerMobile}
            </a>
          </div>
          <div className="flex justify-between pb-0.5 font-sans">
            <span className="font-bold text-[#0B2A4A]">Contact Email</span>
            <a href={`mailto:${data.branchManagerEmail}`} className="text-blue-600 hover:underline">
              {data.branchManagerEmail}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (actionKey === "USER_NEXT_ACTION" && isPlainObject(data)) {
    if (data.redirectToActionNeeded === true) {
      const actionNeededItem = menuItems.find((item) => item.key === "USER_ACTION_NEEDED");
      return (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 text-xs shadow-sm space-y-3">
          <p className="text-slate-600 font-medium leading-5">{data.description}</p>
          {onAction && actionNeededItem && (
            <button
              type="button"
              onClick={() => onAction(actionNeededItem)}
              className="w-full rounded-2xl bg-[#0B2A4A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A3E62]"
            >
              Action Needed
            </button>
          )}
        </div>
      );
    }

    const isCompleted = data.nextAction === "Application Completed";
    return (
      <div className={`mt-3 rounded-2xl border p-4 text-xs shadow-sm space-y-2 ${isCompleted ? "border-emerald-100 bg-emerald-50/50" : "border-amber-100 bg-amber-50/50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{isCompleted ? "🎉" : "💡"}</span>
          <h4 className="font-black text-[#0B2A4A] text-sm">{data.nextAction}</h4>
        </div>
        <p className="text-slate-600 leading-5">{data.description}</p>
        {data.details && (
          <div className="mt-2 p-2 rounded-lg bg-white/70 border border-slate-100 text-slate-500 font-mono text-[10px]">
            {data.details}
          </div>
        )}
        {data.showPaymentButton === true && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("trigger-payment"));
            }}
            className="w-full mt-3 rounded-2xl bg-[#0B2A4A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A3E62] flex items-center justify-center gap-1.5"
          >
            Pay ₹116.82
          </button>
        )}
      </div>
    );
  }

  if (actionKey === "USER_ACTION_NEEDED" && isPlainObject(data)) {
    if (data.hasRejected === false) {
      const timelineItem = menuItems.find((item) => item.key === "USER_TIMELINE");
      return (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-emerald-50/20 p-4 text-xs shadow-sm space-y-3">
          <p className="text-slate-600 font-medium">No documents are rejected yet, it seems.</p>
          {onAction && timelineItem && (
            <button
              type="button"
              onClick={() => onAction(timelineItem)}
              className="w-full rounded-2xl bg-[#0B2A4A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A3E62]"
            >
              Check Application Status
            </button>
          )}
        </div>
      );
    }

    if (data.hasRejected === true && Array.isArray(data.rejectedDocuments)) {
      return (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/20 p-4 text-xs shadow-sm space-y-4">
          <h4 className="font-bold text-red-800 text-sm">Action Required: Rejected Documents</h4>
          <div className="space-y-3">
            {data.rejectedDocuments.map((doc, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-red-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0B2A4A]">{titleize(doc.documentType)}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">Rejected</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono break-all">{doc.fileName}</p>
                <div className="text-[10px] bg-red-50 text-red-800 p-2 rounded-lg leading-relaxed">
                  <strong>Reason:</strong> {doc.remarks}
                </div>
                
                {/* File picker & direct reupload */}
                <div className="relative">
                  <input
                    type="file"
                    id={`file-input-${doc.documentId}`}
                    className="hidden"
                    onChange={(e) => handleFileChange(e, doc.documentId, doc.documentType)}
                    disabled={uploadingDocId !== null}
                  />
                  <label
                    htmlFor={`file-input-${doc.documentId}`}
                    className={`block w-full text-center rounded-xl py-2 px-3 text-xs font-bold transition duration-200 cursor-pointer ${
                      uploadingDocId === doc.documentId
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-[#0B2A4A] text-white hover:bg-[#1A3E62]"
                    }`}
                  >
                    {uploadingDocId === doc.documentId ? "Uploading..." : "Choose File & Reupload"}
                  </label>
                </div>
              </div>
            ))}
          </div>
          {onNavigateSection && (
            <button
              type="button"
              onClick={() => onNavigateSection("Documents")}
              className="w-full rounded-2xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 font-sans"
            >
              Go to Documents Section
            </button>
          )}
        </div>
      );
    }
  }

  if (records.length > 0) {
    const visibleRecords = records.slice(0, 5);
    const remaining = records.length - visibleRecords.length;

    return (
      <div className="mt-3 space-y-2">
        {visibleRecords.map((record, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 bg-white p-3 text-xs">
            {getRenderableEntries(record, actionKey).length === 0 ? (
              <p className="text-slate-500">No displayable fields.</p>
            ) : (
              getRenderableEntries(record, actionKey).map(([key, value]) => (
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
    const entries = getRenderableEntries(data, actionKey);
    if (entries.length === 0) {
      return <p className="mt-3 text-xs text-slate-500">No records found for this action.</p>;
    }

    return (
      <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 text-xs space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3 py-1.5 border-b border-slate-50 last:border-b-0">
            <span className="shrink-0 font-bold text-[#0B2A4A]">{titleize(key)}</span>
            <span className="break-words text-right text-slate-600">{formatValue(key, value)}</span>
          </div>
        ))}
        {data.showPaymentButton === true && (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("trigger-payment"));
            }}
            className="w-full mt-2 rounded-2xl bg-[#0B2A4A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A3E62] flex items-center justify-center gap-1.5"
          >
            Pay ₹116.82
          </button>
        )}
      </div>
    );
  }

  return null;
};

const MessageBubble = ({ message, role, onNavigateSection, onAction, menuItems }) => {
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
            onAction={onAction}
            menuItems={menuItems}
          />
        )}
      </div>
    </div>
  );
};

// Chat window for role-aware Vahan Finserv quick actions and structured assistant responses.
const ChatbotWindow = ({
  role,
  messages,
  menuItems,
  loading,
  onClose,
  onAction,
  onNavigateSection,
  onClear,
}) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <section className="fixed bottom-20 left-3 right-3 z-[35] max-h-[75vh] overflow-hidden rounded-3xl bg-white shadow-2xl sm:bottom-[90px] sm:left-auto sm:right-6 sm:w-[400px] sm:max-h-[70vh]">
      <div className="flex items-center justify-between gap-3 bg-[#0B2A4A] px-4 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#27D3C3] text-[#0B2A4A]">
            <img src={chatboxIcon} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black">Vahan Finserv Assistant</h2>
            <span className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-[#27D3C3]">
              {role || "SESSION"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
              title="Clear chat history"
              aria-label="Clear chat history"
            >
              <FaTrash />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
            aria-label="Close Vahan Finserv assistant"
          >
            <FaTimes />
          </button>
        </div>
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
                onAction={onAction}
                menuItems={menuItems}
              />
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-3xl rounded-bl-md bg-[#F4F6F9] px-4 py-3 text-sm text-slate-600">
                Fetching latest Vahan Finserv data...
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

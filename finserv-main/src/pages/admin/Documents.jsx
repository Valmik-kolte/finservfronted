import React, { useMemo, useState } from "react";
import { FaEye, FaChevronDown, FaChevronUp, FaSearch } from "react-icons/fa";
import { DOCUMENT_LABELS, formatDate, StatusBadge } from "./adminShared";

const STATUS_PRIORITY = { REJECTED: 0, PENDING: 1, VERIFIED: 2, APPROVED: 3 };

const FILTER_TABS = ["All", "Pending", "Verified", "Approved", "Rejected"];

const Documents = ({
  documentTab,
  setDocumentTab,
  docs,
  allDocs,
  users,
  remarks,
  setRemarks,
  updateDocumentStatus,
  saveRemark,
  openPreview,
}) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [expanded, setExpanded] = useState({});

  // Merge pending + verified docs, deduplicate by documentId
  const allDocuments = useMemo(() => {
    const map = new Map();
    [...(allDocs || []), ...(docs || [])].forEach((d) => map.set(d.documentId, d));
    return Array.from(map.values());
  }, [allDocs, docs]);

  // Build user map from users list
  const userMap = useMemo(() => {
    const map = {};
    (users || []).forEach((u) => { map[u.userId] = u; });
    return map;
  }, [users]);

  // Filter docs by status tab
  const filteredDocs = useMemo(() => {
    if (filterStatus === "All") return allDocuments;
    return allDocuments.filter((d) => d.status === filterStatus.toUpperCase());
  }, [allDocuments, filterStatus]);

  // Group by userId
  const grouped = useMemo(() => {
    const map = {};
    filteredDocs.forEach((doc) => {
      const uid = doc.userId ?? doc.user?.userId ?? "unknown";
      if (!map[uid]) map[uid] = [];
      map[uid].push(doc);
    });
    return map;
  }, [filteredDocs]);

  // Sort users: lowest priority status first (REJECTED first)
  const sortedUserIds = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const minPriorityA = Math.min(...grouped[a].map((d) => STATUS_PRIORITY[d.status] ?? 99));
      const minPriorityB = Math.min(...grouped[b].map((d) => STATUS_PRIORITY[d.status] ?? 99));
      return minPriorityA - minPriorityB;
    });
  }, [grouped]);

  // Filter by search (name or email)
  const visibleUserIds = useMemo(() => {
    if (!search.trim()) return sortedUserIds;
    const q = search.toLowerCase();
    return sortedUserIds.filter((uid) => {
      const u = userMap[uid];
      return (
        u?.fullName?.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q) ||
        String(uid).includes(q)
      );
    });
  }, [sortedUserIds, search, userMap]);

  const toggleExpand = (uid) =>
    setExpanded((prev) => ({ ...prev, [uid]: !prev[uid] }));

  const statusCounts = (docList) => {
    const counts = { PENDING: 0, VERIFIED: 0, APPROVED: 0, REJECTED: 0 };
    docList.forEach((d) => { if (counts[d.status] !== undefined) counts[d.status]++; });
    return counts;
  };

  return (
    <div className="space-y-5">
      {/* Search + Filter */}
      <div className="bg-white rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <FaSearch className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name or email..."
            className="flex-1 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                filterStatus === tab
                  ? "bg-[#0B2A4A] text-white"
                  : "bg-[#F4F6F9] text-[#0B2A4A]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-slate-500 px-1">
        Showing <span className="font-bold text-[#0B2A4A]">{visibleUserIds.length}</span> user(s) ·{" "}
        <span className="font-bold text-[#0B2A4A]">{filteredDocs.length}</span> document(s)
      </div>

      {/* User Groups */}
      {visibleUserIds.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center text-slate-500 shadow-sm">
          No documents found.
        </div>
      ) : (
        visibleUserIds.map((uid) => {
          const user = userMap[uid];
          const userLabel = uid === "unknown" ? "Unknown User" : user?.fullName || `User #${uid}`;
          const userDocs = grouped[uid];
          const counts = statusCounts(userDocs);
          const isOpen = expanded[uid] !== false; // default open
          const hasRejected = counts.REJECTED > 0;
          const hasPending = counts.PENDING > 0;

          return (
            <div
              key={uid}
              className={`bg-white rounded-3xl shadow-sm overflow-hidden border-2 ${
                hasRejected
                  ? "border-red-200"
                  : hasPending
                  ? "border-amber-200"
                  : "border-transparent"
              }`}
            >
              {/* User Header */}
              <button
                onClick={() => toggleExpand(uid)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-[#EAFBF8] flex items-center justify-center font-bold text-[#0B2A4A]">
                    {user?.fullName?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#0B2A4A]">
                      {userLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {uid === "unknown"
                        ? "User details unavailable from document response"
                        : `${user?.email || "N/A"} · ${user?.mobileNumber || "N/A"} · Dealer: ${user?.dealerCode || "N/A"}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {counts.REJECTED > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                        {counts.REJECTED} Rejected
                      </span>
                    )}
                    {counts.PENDING > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                        {counts.PENDING} Pending
                      </span>
                    )}
                    {counts.VERIFIED > 0 && (
                      <span className="bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1 rounded-full">
                        {counts.VERIFIED} Verified
                      </span>
                    )}
                    {counts.APPROVED > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                        {counts.APPROVED} Approved
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                      {userDocs.length} Total
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 ml-4">
                  {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </button>

              {/* Document Cards */}
              {isOpen && (
                <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {userDocs.map((doc) => (
                    <DocumentCard
                      key={doc.documentId}
                      doc={doc}
                      remark={remarks[doc.documentId] ?? doc.remarks ?? ""}
                      setRemark={(value) =>
                        setRemarks((prev) => ({ ...prev, [doc.documentId]: value }))
                      }
                      updateDocumentStatus={updateDocumentStatus}
                      saveRemark={saveRemark}
                      openPreview={openPreview}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

const DocumentCard = ({ doc, remark, setRemark, updateDocumentStatus, saveRemark, openPreview }) => (
  <div
    className={`rounded-2xl p-5 border ${
      doc.status === "REJECTED"
        ? "bg-red-50 border-red-200"
        : doc.status === "APPROVED"
        ? "bg-emerald-50 border-emerald-200"
        : "bg-[#F8FAFC] border-slate-200"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-bold text-[#0B2A4A]">
          {DOCUMENT_LABELS[doc.documentType] || doc.documentType}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 break-all">{doc.fileName}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
        {doc.remarks && (
          <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded-xl px-2 py-1">
            Remark: {doc.remarks}
          </p>
        )}
      </div>
      <StatusBadge status={doc.status} />
    </div>

    {/* Action Buttons */}
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={() => openPreview(doc.documentId)}
        className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-[#0B2A4A] font-bold text-xs flex items-center gap-1"
      >
        <FaEye /> Preview
      </button>
      {doc.status === "PENDING" && (
        <>
          <button
            onClick={() => updateDocumentStatus(doc, "VERIFIED")}
            className="px-3 py-2 rounded-2xl bg-sky-600 text-white font-bold text-xs"
          >
            Verify
          </button>
          <button
            onClick={() => updateDocumentStatus(doc, "REJECTED")}
            className="px-3 py-2 rounded-2xl bg-red-600 text-white font-bold text-xs"
          >
            Reject
          </button>
        </>
      )}
      {doc.status === "VERIFIED" && (
        <>
          <button
            onClick={() => updateDocumentStatus(doc, "APPROVED")}
            className="px-3 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs"
          >
            Approve
          </button>
          <button
            onClick={() => updateDocumentStatus(doc, "REJECTED")}
            className="px-3 py-2 rounded-2xl bg-red-600 text-white font-bold text-xs"
          >
            Reject
          </button>
        </>
      )}
    </div>

    {/* Remark Input */}
    <div className="mt-3 flex gap-2">
      <input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="Add admin remark..."
        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 outline-none text-xs bg-white"
      />
      <button
        onClick={() => saveRemark(doc.documentId)}
        className="bg-[#0B2A4A] text-white rounded-2xl px-4 font-bold text-xs"
      >
        Save
      </button>
    </div>
  </div>
);

export default Documents;

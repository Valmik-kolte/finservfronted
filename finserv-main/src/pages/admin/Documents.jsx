import React, { useMemo, useState } from "react";
import { FaEye, FaChevronDown, FaChevronUp, FaSearch } from "react-icons/fa";
import { DOCUMENT_LABELS, formatDate, StatusBadge } from "./adminShared";

const FILTER_TABS = ["All", "Pending", "Verified", "Approved", "Rejected"];

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") ?? "";

const getDocumentOwnerId = (doc) =>
  firstPresent(
    doc?.userId,
    doc?.user?.userId,
    doc?.customer?.userId,
    doc?.customerId,
    doc?.user?.id,
    doc?.customer?.id,
    doc?.uploadedByUserId,
    doc?.uploadedBy
  );

const getDocumentGroupId = (doc) =>
  String(
    firstPresent(
      getDocumentOwnerId(doc),
      doc?.user?.email,
      doc?.customer?.email,
      doc?.email,
      doc?.mobileNumber,
      doc?.user?.mobileNumber,
      doc?.customer?.mobileNumber,
      "unknown"
    )
  );

const mergeDocumentRecords = (current, next) => {
  const currentOwnerId = getDocumentOwnerId(current);
  const nextOwnerId = getDocumentOwnerId(next);
  return {
    ...(current || {}),
    ...(next || {}),
    user: next?.user || current?.user,
    customer: next?.customer || current?.customer,
    userId: nextOwnerId || currentOwnerId,
  };
};

const getUserFromDocument = (doc, uid) => {
  const embedded = doc?.user || doc?.customer || {};
  return {
    userId: getDocumentOwnerId(doc) || uid,
    fullName: firstPresent(
      embedded.fullName,
      embedded.name,
      doc?.fullName,
      doc?.customerName,
      doc?.userName,
      doc?.uploadedByName
    ),
    email: firstPresent(embedded.email, doc?.email, doc?.customerEmail, doc?.userEmail),
    mobileNumber: firstPresent(
      embedded.mobileNumber,
      embedded.mobile,
      doc?.mobileNumber,
      doc?.customerMobileNumber,
      doc?.userMobileNumber
    ),
    dealerCode: firstPresent(embedded.dealerCode, doc?.dealerCode),
  };
};

const getDocumentKey = (doc) => {
  if (doc?.documentId) return `id:${doc.documentId}`;
  return [
    "fallback",
    getDocumentOwnerId(doc),
    doc?.documentType || doc?.type || "",
    doc?.fileName || doc?.originalFileName || doc?.name || "",
    doc?.createdAt || doc?.uploadedAt || "",
  ].join(":");
};

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

  // Merge admin document sources once and dedupe by id or stable document fields.
  const allDocuments = useMemo(() => {
    const map = new Map();
    [...(allDocs || []), ...(docs || [])].filter(Boolean).forEach((doc) => {
      const key = getDocumentKey(doc);
      map.set(key, mergeDocumentRecords(map.get(key), doc));
    });
    return Array.from(map.values());
  }, [allDocs, docs]);

  // Build user map from users list
  const userMap = useMemo(() => {
    const map = {};
    (users || []).forEach((u) => {
      const id = u.userId ?? u.id;
      if (id !== undefined && id !== null) map[String(id)] = u;
    });
    allDocuments.forEach((doc) => {
      const uid = getDocumentGroupId(doc);
      if (!uid || uid === "unknown" || map[uid]) return;
      const user = getUserFromDocument(doc, uid);
      if (user.fullName || user.email || user.mobileNumber || user.dealerCode) {
        map[uid] = user;
      }
    });
    return map;
  }, [allDocuments, users]);

  // Filter docs by status tab
  const filteredDocs = useMemo(() => {
    if (filterStatus === "All") return allDocuments;
    return allDocuments.filter((d) => d.status === filterStatus.toUpperCase());
  }, [allDocuments, filterStatus]);

  // Group by userId
  const grouped = useMemo(() => {
    const map = {};
    filteredDocs.forEach((doc) => {
      const uid = getDocumentGroupId(doc);
      if (!map[uid]) map[uid] = [];
      map[uid].push(doc);
    });
    return map;
  }, [filteredDocs]);

  // Sort users alphabetically by username.
  const sortedUserIds = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const userA = userMap[a];
      const userB = userMap[b];
      const nameA = a === "unknown" ? "Unknown User" : userA?.fullName || userA?.email || `User #${a}`;
      const nameB = b === "unknown" ? "Unknown User" : userB?.fullName || userB?.email || `User #${b}`;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [grouped, userMap]);

  // Filter by search (name or email)
  const visibleUserIds = useMemo(() => {
    if (!search.trim()) return sortedUserIds;
    const q = search.toLowerCase();
    return sortedUserIds.filter((uid) => {
      const u = userMap[uid];
      return (
        u?.fullName?.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q) ||
        String(u?.mobileNumber || "").toLowerCase().includes(q) ||
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
        <div className="bg-white rounded-3xl p-5 sm:p-8 text-center text-slate-500 shadow-sm">
          No documents found.
        </div>
      ) : (
        visibleUserIds.map((uid) => {
          const user = userMap[uid] || getUserFromDocument(grouped[uid]?.[0], uid);
          const userLabel = uid === "unknown" ? "Unknown User" : user?.fullName || user?.email || `User #${uid}`;
          const userDocs = grouped[uid];
          const counts = statusCounts(userDocs);
          const isOpen = expanded[uid] === true;
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
                className="w-full flex items-start justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 hover:bg-slate-50 transition"
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EAFBF8] flex items-center justify-center font-bold text-[#0B2A4A]">
                    {(user?.fullName || user?.email || "U")?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="font-bold text-[#0B2A4A]">
                      {userLabel}
                    </p>
                    <p className="text-xs text-slate-500 break-words">
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
                <span className="shrink-0 text-slate-400">
                  {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              </button>

              {/* Document Cards */}
              {isOpen && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
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
    className={`rounded-2xl p-4 sm:p-5 border ${
      doc.status === "REJECTED"
        ? "bg-red-50 border-red-200"
        : doc.status === "APPROVED"
        ? "bg-emerald-50 border-emerald-200"
        : "bg-[#F8FAFC] border-slate-200"
    }`}
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="Add admin remark..."
        className="w-full flex-1 rounded-2xl border border-slate-200 px-3 py-2 outline-none text-xs bg-white"
      />
      <button
        onClick={() => saveRemark(doc.documentId)}
        className="bg-[#0B2A4A] text-white rounded-2xl px-4 py-2 font-bold text-xs"
      >
        Save
      </button>
    </div>
  </div>
);

export default Documents;

import React, { useState, useEffect } from "react";
import {
  FaCheck,
  FaFileAlt,
  FaUniversity,
  FaUpload,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaUser,
  FaHome,
  FaBell,
  FaRegFileAlt,
  FaCheckDouble,
  FaClock,
  FaExclamationTriangle
} from "react-icons/fa";
import { MdVerified, MdDirectionsCar, MdTimer } from "react-icons/md";
import logo from "../../assets/vahan-logo.jpg";

const INITIAL_DOCUMENTS = [
  { id: 1, type: "AADHAAR_1", label: "Aadhaar Front Side", status: "VERIFIED", date: "24 Jul 2026" },
  { id: 2, type: "AADHAAR_2", label: "Aadhaar Back Side", status: "VERIFIED", date: "24 Jul 2026" },
  { id: 3, type: "PAN", label: "PAN Card", status: "VERIFIED", date: "24 Jul 2026" },
  { id: 4, type: "BANK_STATEMENT", label: "Bank Statement", status: "PENDING_VERIFICATION", date: "25 Jul 2026" },
  { id: 5, type: "SALARY_SLIP_1", label: "Salary Slip Month 1", status: "UNDER_REVIEW", date: "26 Jul 2026" },
];

const DOC_OPTIONS = [
  { value: "RC_1", label: "RC Front Side" },
  { value: "RC_2", label: "RC Back Side" },
  { value: "INSURANCE", label: "Insurance Policy" },
  { value: "VEHICLE_PHOTO", label: "Vehicle Photo" },
  { value: "LIGHT_BILL", label: "Light Bill" },
  { value: "ITR_RETURN", label: "ITR Return" },
];

const MockMobileApp = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [docs, setDocs] = useState(INITIAL_DOCUMENTS);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [uploadState, setUploadState] = useState({
    status: "idle", // idle, uploading, success
    progress: 0,
    fileName: ""
  });
  const [showNotification, setShowNotification] = useState(false);

  const handleUploadSimulate = (e) => {
    e.preventDefault();
    if (!selectedDocType) return;

    const matchedOption = DOC_OPTIONS.find((o) => o.value === selectedDocType);
    const label = matchedOption ? matchedOption.label : "Document";

    setUploadState({
      status: "uploading",
      progress: 0,
      fileName: `${selectedDocType.toLowerCase()}_mock.pdf`
    });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 10;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // Add to docs list after 500ms delay to make it smooth
        setTimeout(() => {
          setDocs((prev) => {
            // Check if already exists, replace it, otherwise append
            const filtered = prev.filter((d) => d.type !== selectedDocType);
            return [
              ...filtered,
              {
                id: Date.now(),
                type: selectedDocType,
                label: label,
                status: "UNDER_REVIEW",
                date: new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              }
            ];
          });
          setUploadState({
            status: "success",
            progress: 100,
            fileName: ""
          });
          setSelectedDocType("");
          setShowNotification(true);
        }, 500);
      } else {
        setUploadState((prev) => ({ ...prev, progress: currentProgress }));
      }
    }, 150);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
            <FaCheckCircle className="text-[10px]" /> Verified
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
            <FaClock className="text-[10px]" /> In Review
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-full">
            <FaClock className="text-[10px]" /> Pending
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">
            <FaExclamationTriangle className="text-[10px]" /> Required
          </span>
        );
    }
  };

  return (
    <div className="relative w-64 h-[470px] sm:w-[280px] sm:h-[510px] bg-slate-950 rounded-[32px] sm:rounded-[36px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col font-sans select-none text-slate-800">
      
      {/* Top Speaker / Camera Notch (Dynamic Island look) */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-50 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 ml-auto mr-3"></div>
      </div>

      {/* Phone Status Bar */}
      <div className="h-8 bg-slate-900 text-white flex items-center justify-between px-5 pt-1.5 text-[10px] font-medium z-40">
        <span>88% Battery</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.07 19.58 10.48 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
          </svg>
          <span className="font-bold text-[10px]">5G</span>
          <div className="w-5 h-2.5 border border-white/60 rounded-[3px] p-0.5 flex items-center">
            <div className="h-full w-4 bg-emerald-400 rounded-[1px]"></div>
          </div>
        </div>
      </div>

      {/* Internal App Area */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
        
        {/* App Bar */}
        <div className="h-12 bg-gradient-to-r from-[#112B5A] to-[#1a3f7a] text-white flex items-center justify-between px-4 shadow-sm z-30">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">Vahan Finserv</span>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotification(!showNotification)}
              className="p-1 hover:bg-white/10 rounded-full transition relative text-white"
            >
              <FaBell size={14} />
              {showNotification && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-slate-900"></span>
              )}
            </button>

            {/* Notification Dropdown inside phone */}
            {showNotification && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 p-3 z-50 animate-fade-in text-xs text-slate-700">
                <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-100">
                  <span className="font-bold text-[#112B5A]">Notification</span>
                  <button onClick={() => setShowNotification(false)} className="text-slate-400 hover:text-slate-600">
                    <FaTimes size={10} />
                  </button>
                </div>
                <p className="text-slate-600 leading-tight">
                  🎉 Document upload successful! Your document is being verified.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto pb-4 scrollbar-none">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="p-4 space-y-4 animate-fade-in text-slate-800">
              {/* User Banner */}
              <div className="bg-gradient-to-r from-[#1ECFC3]/20 to-[#00B4D8]/10 rounded-2xl p-4 border border-[#1ECFC3]/30">
                <p className="text-xs font-semibold text-slate-500">Welcome Back</p>
                <h4 className="text-base font-extrabold text-[#112B5A] mt-0.5">Rajesh K. Shinde 👋</h4>
                <p className="text-[11px] text-[#112B5A]/80 mt-1">Application Status: <span className="font-bold text-[#112B5A]">In Progress</span></p>
              </div>

              {/* Active Loan Details Card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1ECFC3] bg-[#1ECFC3]/10 px-2 py-0.5 rounded-full">Used Car Loan</span>
                    <h5 className="font-bold text-sm text-[#112B5A] mt-1.5">Maruti Swift VXI (2021)</h5>
                  </div>
                  <MdDirectionsCar size={24} className="text-[#1ECFC3]" />
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Loan Amount</span>
                    <span className="font-bold text-slate-800">₹ 4,80,000</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Preferred Bank</span>
                    <span className="font-bold text-slate-800">HDFC Bank</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tenure Requested</span>
                    <span className="font-bold text-slate-800">48 Months</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Interest Est.</span>
                    <span className="font-bold text-emerald-600">10.25% p.a.</span>
                  </div>
                </div>
              </div>

              {/* Tracking Stepper */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h5 className="font-bold text-xs text-[#112B5A] mb-3.5">Loan Progress Tracker</h5>
                <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                  
                  {/* Step 1 */}
                  <div className="relative flex gap-3 items-start">
                    <div className="absolute -left-[13px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
                      <FaCheck className="text-[6px] text-white" />
                    </div>
                    <div>
                      <h6 className="text-[11px] font-bold text-slate-800">Application Submitted</h6>
                      <p className="text-[9px] text-slate-400">Completed on 24 Jul 2026</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative flex gap-3 items-start">
                    <div className="absolute -left-[13px] w-3 h-3 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
                      <FaCheck className="text-[6px] text-white" />
                    </div>
                    <div>
                      <h6 className="text-[11px] font-bold text-slate-800">KYC Documents Uploaded</h6>
                      <p className="text-[9px] text-slate-400">Completed on 25 Jul 2026</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative flex gap-3 items-start">
                    <div className="absolute -left-[13px] w-3 h-3 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-sm animate-pulse"></div>
                    <div>
                      <h6 className="text-[11px] font-bold text-slate-800">Bank Partner Review</h6>
                      <p className="text-[9px] text-amber-600 font-semibold">Under verification by HDFC Bank</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative flex gap-3 items-start">
                    <div className="absolute -left-[13px] w-3 h-3 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center shadow-sm"></div>
                    <div>
                      <h6 className="text-[11px] font-bold text-slate-400">Sanction Letter Approved</h6>
                      <p className="text-[9px] text-slate-400">Pending verification approval</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Banner */}
              <button 
                onClick={() => setActiveTab("docs")}
                className="w-full bg-[#112B5A] hover:bg-[#081f36] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <FaUpload size={12} /> Upload Missing Documents
              </button>
            </div>
          )}

          {/* TAB 2: DOCUMENTS (DOCUMENT DATA UI) */}
          {activeTab === "docs" && (
            <div className="p-4 space-y-4 animate-fade-in text-slate-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-[#112B5A]">KYC & Vehicle Docs</h4>
                  <p className="text-[10px] text-slate-500">Provide required files to speed up sanction</p>
                </div>
                <span className="text-[10px] font-bold bg-[#1ECFC3]/15 text-[#1ECFC3] px-2 py-0.5 rounded-full">
                  {docs.length} Uploaded
                </span>
              </div>

              {/* Simulated Document Upload UI */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h5 className="font-bold text-xs text-slate-700 mb-2">Simulate Document Upload</h5>
                
                {uploadState.status === "idle" && (
                  <form onSubmit={handleUploadSimulate} className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Select Document Type</label>
                      <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none text-slate-700 font-medium"
                        required
                      >
                        <option value="">Choose document...</option>
                        {DOC_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedDocType}
                      className="w-full bg-[#1ECFC3] disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                    >
                      <FaUpload size={10} /> Choose & Upload Mock File
                    </button>
                  </form>
                )}

                {uploadState.status === "uploading" && (
                  <div className="py-2 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 truncate max-w-[150px] font-medium">{uploadState.fileName}</span>
                      <span className="text-indigo-600 font-bold">{uploadState.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#1ECFC3] to-[#00B4D8] h-1.5 rounded-full transition-all duration-150" 
                        style={{ width: `${uploadState.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 animate-pulse">Uploading securely to bank portal...</p>
                  </div>
                )}

                {uploadState.status === "success" && (
                  <div className="text-center py-2 space-y-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <FaCheck size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Upload Complete!</p>
                    <p className="text-[10px] text-slate-400">Document status set to "Under Review".</p>
                    <button
                      onClick={() => setUploadState({ status: "idle", progress: 0, fileName: "" })}
                      className="text-[10px] text-indigo-600 font-bold underline hover:text-indigo-700"
                    >
                      Upload another document
                    </button>
                  </div>
                )}
              </div>

              {/* Document List */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-slate-700 px-1">Document Status</h5>
                
                <div className="space-y-2">
                  {docs.map((doc) => (
                    <div key={doc.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <FaRegFileAlt size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{doc.label}</p>
                          <p className="text-[9px] text-slate-400">Uploaded {doc.date}</p>
                        </div>
                      </div>
                      <div>{getStatusBadge(doc.status)}</div>
                    </div>
                  ))}
                  
                  {/* Show missing/pending docs from options to encourage upload */}
                  {DOC_OPTIONS.filter(opt => !docs.some(d => d.type === opt.value)).slice(0, 2).map((opt) => (
                    <div key={opt.value} className="bg-slate-100/70 p-3 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 opacity-60">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center">
                          <FaRegFileAlt size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600">{opt.label}</p>
                          <p className="text-[9px] text-slate-400">Not uploaded yet</p>
                        </div>
                      </div>
                      <div>{getStatusBadge("REQUIRED")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OFFERS */}
          {activeTab === "offers" && (
            <div className="p-4 space-y-4 animate-fade-in text-slate-800">
              <div>
                <h4 className="font-bold text-sm text-[#112B5A]">Bank Loan Offers</h4>
                <p className="text-[10px] text-slate-500">Pre-approved offers based on your application</p>
              </div>

              {/* Offer Card 1 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#1ECFC3] text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">
                  Best Rate
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-extrabold text-blue-700">
                    HDFC
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">HDFC Bank Car Loan</h5>
                    <p className="text-[9px] text-slate-400">Instant Digital Disbursal</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center py-1.5 bg-slate-50 rounded-xl text-slate-700">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Interest Rate</span>
                    <span className="font-extrabold text-xs text-emerald-600">10.25%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Monthly EMI</span>
                    <span className="font-extrabold text-xs">₹ 11,114</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Max Funding</span>
                    <span className="font-extrabold text-xs">90%</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    alert("Applied to HDFC Bank Offer in Demo!");
                    setActiveTab("dashboard");
                  }}
                  className="w-full bg-[#112B5A] text-white font-bold text-xs py-2 rounded-lg hover:bg-[#081f36] transition"
                >
                  Select & Apply
                </button>
              </div>

              {/* Offer Card 2 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-xs font-extrabold text-orange-600">
                    ICICI
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">ICICI Bank Auto Loan</h5>
                    <p className="text-[9px] text-slate-400">Minimal Documentation</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center py-1.5 bg-slate-50 rounded-xl text-slate-700">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Interest Rate</span>
                    <span className="font-extrabold text-xs text-emerald-600">10.50%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Monthly EMI</span>
                    <span className="font-extrabold text-xs">₹ 11,171</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Max Funding</span>
                    <span className="font-extrabold text-xs">85%</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    alert("Applied to ICICI Bank Offer in Demo!");
                    setActiveTab("dashboard");
                  }}
                  className="w-full bg-[#112B5A] text-white font-bold text-xs py-2 rounded-lg hover:bg-[#081f36] transition"
                >
                  Select & Apply
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === "profile" && (
            <div className="p-4 space-y-4 animate-fade-in text-slate-700">
              <div className="text-center py-4 space-y-2">
                <div className="w-16 h-16 rounded-full bg-slate-200 text-[#112B5A] flex items-center justify-center mx-auto">
                  <FaUser size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#112B5A]">Rajesh K. Shinde</h4>
                  <p className="text-[10px] text-slate-400">Customer ID: VF-98745</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Mobile Number</span>
                  <span className="font-semibold text-slate-800">+91 98765 43210</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Email Address</span>
                  <span className="font-semibold text-slate-800">rajesh.shinde@email.com</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">City / Location</span>
                  <span className="font-semibold text-slate-800">Pune, Maharashtra</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">User Profile Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <FaCheckDouble size={10} /> Fully KYC Verified
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom App Navigation Bar */}
        <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 text-slate-500">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center gap-1.5 transition ${activeTab === "dashboard" ? "text-[#1ECFC3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <FaHome size={16} />
            <span className="text-[9px] font-bold">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab("docs")}
            className={`flex flex-col items-center gap-1.5 transition ${activeTab === "docs" ? "text-[#1ECFC3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <FaFileAlt size={16} />
            <span className="text-[9px] font-bold">Documents</span>
          </button>

          <button 
            onClick={() => setActiveTab("offers")}
            className={`flex flex-col items-center gap-1.5 transition ${activeTab === "offers" ? "text-[#1ECFC3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <FaUniversity size={16} />
            <span className="text-[9px] font-bold">Offers</span>
          </button>

          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1.5 transition ${activeTab === "profile" ? "text-[#1ECFC3]" : "text-slate-400 hover:text-slate-600"}`}
          >
            <FaUser size={16} />
            <span className="text-[9px] font-bold">Profile</span>
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="h-3 bg-white flex items-center justify-center z-30">
          <div className="w-20 h-0.5 bg-slate-300 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};

export default MockMobileApp;

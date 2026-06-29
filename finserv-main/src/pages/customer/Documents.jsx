import React, { useEffect, useState } from "react";
import { uploadDocument } from "../../services/documentService";
import { getUserProfile } from "../../services/customerService";
import { toast } from "react-toastify";

const DOC_TYPES = [
  { value: "AADHAAR_1", label: "Aadhaar Front Side" },
  { value: "AADHAAR_2", label: "Aadhaar Back Side" },
  { value: "PAN", label: "PAN" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "LIGHT_BILL", label: "Light Bill" },
  { value: "RENTAL_AGREEMENT", label: "Rental Agreement" },
  { value: "SALARY_SLIP_1", label: "Salary Slip Month 1" },
  { value: "SALARY_SLIP_2", label: "Salary Slip Month 2" },
  { value: "SALARY_SLIP_3", label: "Salary Slip Month 3" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "ITR_RETURN", label: "ITR Return" },
  { value: "APPOINTMENT_LETTER", label: "Appointment Letter" },
  { value: "RC_1", label: "RC Front Side" },
  { value: "RC_2", label: "RC Back Side" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "VEHICLE_INVOICE", label: "Vehicle Invoice" },
  { value: "VEHICLE_PHOTO", label: "Vehicle Photo" },
  { value: "ODOMETER_READING", label: "Odometer Reading" },
  { value: "CHASSIS_NUMBER", label: "Chassis Number" },
  { value: "CAR_FRONT_SIDE_PHOTO", label: "Car Front Side Photo" },
  { value: "CAR_BACK_SIDE_PHOTO", label: "Car Back Side Photo" },
  { value: "PASSPORT_SIZE_PHOTO", label: "Passport Size Photo" },
];

const Documents = () => {
  const [userInfo, setUserInfo] = useState({ name: "", email: "", mobile: "" });
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("userData");
    if (!raw) return;
    const u = JSON.parse(raw);
    setUserId(u.id);

    getUserProfile(u.id)
      .then((profile) => {
        setUserInfo({
          name: profile?.fullName || "",
          email: profile?.email || "",
          mobile: profile?.mobileNumber || "",
        });
      })
      .catch(() => {
        setUserInfo({ name: u.name || "", email: u.email || "", mobile: "" });
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !docType) return toast.error("Please select document type and file.");
    if (!userId) return toast.error("User session not found.");

    const cleanName = file.name.replace(/,/g, "");
    const cleanFile = new File([file], cleanName, { type: file.type });

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("type", docType);
    formData.append("file", cleanFile);

    setLoading(true);
    try {
      await uploadDocument(formData);
      toast.success("Document uploaded successfully!");
      setFile(null);
      setDocType("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2A4A]">Documents</h1>
      <p className="text-gray-500 mt-2 mb-6">Upload and manage your KYC documents</p>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase">Full Name</label>
            <input
              type="text"
              value={userInfo.name}
              readOnly
              className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Email</label>
            <input
              type="text"
              value={userInfo.email}
              readOnly
              className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-700 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Mobile Number</label>
            <input
              type="text"
              value={userInfo.mobile}
              readOnly
              className="w-full mt-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-700 outline-none"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-gray-400 uppercase">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 outline-none"
              required
            >
              <option value="">Select type</option>
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {(docType === "SALARY_SLIP" || docType.startsWith("SALARY_SLIP")) && (
              <p className="text-xs text-slate-500 font-semibold mt-1">Last 3 month salary slip</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Choose File (PDF, JPG, PNG, WEBP)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full mt-1 text-sm text-gray-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#0B2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#081f36] transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Documents;

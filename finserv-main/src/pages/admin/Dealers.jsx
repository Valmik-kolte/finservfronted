import React, { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { Field, formatDate, Modal, ResponsiveTable } from "./adminShared";

const Dealers = ({
  dealers,
  openDealer,
  dealerMode,
  selectedDealer,
  dealerForm,
  setDealerForm,
  updateDealer,
  closeDealer,
}) => {
  const [searchDealer, setSearchDealer] = useState("");
  const filteredDealers = useMemo(() => {
    const query = searchDealer.trim().toLowerCase();
    if (!query) return dealers;

    return dealers.filter((dealer) =>
      [
        dealer.dealerId,
        dealer.id,
        dealer.dealerCode,
        dealer.fullName,
        dealer.name,
        dealer.email,
        dealer.mobileNumber,
        dealer.mobile,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [dealers, searchDealer]);

  return (
    <>
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0B2A4A]">Dealers</h2>
            <p className="text-sm text-slate-500 mt-1">Review and update registered dealer details.</p>
          </div>
          <div className="relative w-full md:w-80">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchDealer}
              onChange={(event) => setSearchDealer(event.target.value)}
              placeholder="Search by dealer ID or code"
              className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-[#27D3C3]"
            />
          </div>
      </div>

      <ResponsiveTable>
        <thead>
          <tr className="text-left text-sm text-slate-500">
            {["ID", "Dealer Code", "Name", "Email", "Mobile", "Created", "Action"].map((head) => (
              <th key={head} className="py-3 px-4">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredDealers.map((dealer) => (
            <tr key={dealer.dealerId} className="border-t border-slate-100">
              <td className="py-3 px-4">{dealer.dealerId}</td>
              <td className="py-3 px-4 font-semibold">{dealer.dealerCode}</td>
              <td className="py-3 px-4">{dealer.fullName}</td>
              <td className="py-3 px-4">{dealer.email}</td>
              <td className="py-3 px-4">{dealer.mobileNumber}</td>
              <td className="py-3 px-4">{formatDate(dealer.createdAt)}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-3">
                <button onClick={() => openDealer(dealer, "view")} className="text-[#0B2A4A] font-bold">
                  View
                </button>
                <button onClick={() => openDealer(dealer, "edit")} className="text-[#27D3C3] font-bold">
                  Edit
                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
      {filteredDealers.length === 0 && (
        <div className="mt-4 rounded-2xl bg-[#F4F6F9] p-4 text-center text-sm text-slate-500">
          No dealers found for this search.
        </div>
      )}
    </div>

    {selectedDealer && dealerForm && (
      <Modal title={`${dealerMode === "edit" ? "Edit" : "View"} Dealer ${selectedDealer.dealerCode || ""}`} onClose={closeDealer}>
        <div className="grid grid-cols-1 gap-4">
          {dealerMode === "edit" ? (
            <>
              <Field
                label="Full Name"
                value={dealerForm.fullName}
                onChange={(value) => setDealerForm({ ...dealerForm, fullName: value })}
              />
              <Field
                label="Email"
                value={dealerForm.email}
                onChange={(value) => setDealerForm({ ...dealerForm, email: value })}
              />
              <Field
                label="Mobile Number"
                value={dealerForm.mobileNumber}
                onChange={(value) => setDealerForm({ ...dealerForm, mobileNumber: value })}
              />
            </>
          ) : (
            [
              ["Dealer Code", selectedDealer.dealerCode],
              ["Full Name", selectedDealer.fullName],
              ["Email", selectedDealer.email],
              ["Mobile Number", selectedDealer.mobileNumber],
              ["Created", formatDate(selectedDealer.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F4F6F9] p-4">
                <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                <p className="mt-1 font-bold text-[#0B2A4A] break-words">{value || "N/A"}</p>
              </div>
            ))
          )}
        </div>
        {dealerMode === "edit" && (
          <button onClick={updateDealer} className="mt-5 bg-[#0B2A4A] text-white rounded-2xl px-6 py-3 font-bold">
            Save Dealer
          </button>
        )}
      </Modal>
    )}
  </>
  );
};

export default Dealers;

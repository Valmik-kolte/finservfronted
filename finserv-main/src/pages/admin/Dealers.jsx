import React from "react";
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
}) => (
  <>
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#0B2A4A]">Dealers</h2>
        <p className="text-sm text-slate-500 mt-1">Review and update registered dealer details.</p>
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
          {dealers.map((dealer) => (
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

export default Dealers;

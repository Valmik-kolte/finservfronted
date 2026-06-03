import React from "react";
import { Field, formatDate, Modal, ResponsiveTable } from "./adminShared";

const Dealers = ({
  dealers,
  openDealer,
  selectedDealer,
  dealerForm,
  setDealerForm,
  updateDealer,
  closeDealer,
}) => (
  <>
    <div className="bg-white rounded-3xl p-6 shadow-sm">
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
                <button onClick={() => openDealer(dealer)} className="text-[#0B2A4A] font-bold">
                  View / Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </ResponsiveTable>
    </div>

    {selectedDealer && dealerForm && (
      <Modal title={`Dealer ${selectedDealer.dealerCode || ""}`} onClose={closeDealer}>
        <div className="grid grid-cols-1 gap-4">
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
        </div>
        <button onClick={updateDealer} className="mt-5 bg-[#0B2A4A] text-white rounded-2xl px-6 py-3 font-bold">
          Save Dealer
        </button>
      </Modal>
    )}
  </>
);

export default Dealers;

import React from "react";
import { FaPlus } from "react-icons/fa";
import { Field, Modal, ResponsiveTable } from "./adminShared";

const emptyBank = {
  bankName: "",
  representativeName: "",
  contactNumber: "",
  email: "",
};

const Bank = ({ banks, setBankModal, setBankForm, bankModal, bankForm, saveBank, deleteBank, closeBankModal }) => (
  <>
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#0B2A4A]">Banks</h2>
          <p className="text-sm text-slate-500 mt-1">Manage partner banks and representatives.</p>
        </div>
        <button
          onClick={() => {
            setBankForm(emptyBank);
            setBankModal({ mode: "add" });
          }}
          className="bg-[#0B2A4A] text-white rounded-2xl px-5 py-3 font-bold flex items-center gap-2"
        >
          <FaPlus /> Add Bank
        </button>
      </div>

      {banks.length === 0 ? (
        <div className="bg-[#F4F6F9] rounded-2xl p-6 text-sm text-slate-500">
          No banks found. Use <span className="font-semibold">Add Bank</span> or check the backend response for{" "}
          <span className="font-semibold">/api/admin/banks</span>.
        </div>
      ) : (
        <ResponsiveTable>
          <thead>
            <tr className="text-left text-sm text-slate-500">
              {["Bank", "Representative", "Contact", "Email", "Actions"].map((head) => (
                <th key={head} className="py-3 px-4">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {banks.map((bank) => (
              <tr key={bank.bankId} className="border-t border-slate-100">
                <td className="py-3 px-4 font-semibold">{bank.bankName}</td>
                <td className="py-3 px-4">{bank.representativeName}</td>
                <td className="py-3 px-4">{bank.contactNumber}</td>
                <td className="py-3 px-4">{bank.email}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setBankForm({
                          bankName: bank.bankName || "",
                          representativeName: bank.representativeName || "",
                          contactNumber: bank.contactNumber || "",
                          email: bank.email || "",
                        });
                        setBankModal({ mode: "edit", bank });
                      }}
                      className="text-[#0B2A4A] font-bold"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteBank(bank.bankId)} className="text-red-600 font-bold">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </ResponsiveTable>
      )}
    </div>

    {bankModal && (
      <Modal title={bankModal.mode === "edit" ? "Edit Bank" : "Add Bank"} onClose={closeBankModal}>
        <div className="grid grid-cols-1 gap-4">
          {[
            ["bankName", "Bank Name"],
            ["representativeName", "Representative Name"],
            ["contactNumber", "Contact Number"],
            ["email", "Email"],
          ].map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={bankForm[key]}
              onChange={(value) => setBankForm({ ...bankForm, [key]: value })}
            />
          ))}
        </div>
        <button onClick={saveBank} className="mt-5 bg-[#0B2A4A] text-white rounded-2xl px-6 py-3 font-bold">
          Save Bank
        </button>
      </Modal>
    )}
  </>
);

export default Bank;

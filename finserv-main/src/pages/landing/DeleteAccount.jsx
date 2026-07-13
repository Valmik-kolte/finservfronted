import { useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaShieldAlt, FaTrashAlt, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import Footer from "./Footer";
import logo from "../../assets/vahan-logo.jpg";
import api from "../../services/api";
import { API_BASE_URL } from "../../config/appConfig";
import { AUTH_SESSION_KEYS, clearAuthSession } from "../../utils/authSession";

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

const normalizeRole = (role) => {
  const value = String(role || "USER").replace(/^ROLE_/, "").toUpperCase();
  if (value === "DEALER") return "DEALER";
  if (value === "ADMIN") return "ADMIN";
  return "USER";
};

const getLoginData = (response) => {
  const data = response?.data?.data || response?.data || response || {};
  const nestedUser = data.user || data.admin || data.dealer || data.customer || data.profile || {};
  return { ...data, ...nestedUser };
};

const resolveAccount = async ({ email, password }) => {
  let response = null;
  try {
    response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  } catch (userError) {
    try {
      response = await axios.post(`${API_BASE_URL}/dealer/login`, { email, password });
    } catch {
      throw userError;
    }
  }

  const body = getLoginData(response);
  const token = firstValue(body?.token, response?.data?.token, response?.data?.data?.token);
  if (!token) throw new Error("Unable to verify your account. Please try again.");

  const decoded = jwtDecode(token);
  const role = normalizeRole(firstValue(body?.role, decoded?.role));
  const id = firstValue(
    body?.id,
    body?.userId,
    body?.dealerId,
    decoded?.id,
    decoded?.userId,
    decoded?.dealerId
  );

  if (!id) throw new Error("Account verified, but account ID was not found.");
  if (role === "ADMIN") throw new Error("Admin accounts cannot be deleted from this public form.");

  return {
    id,
    role,
    token,
    name: firstValue(body?.fullName, body?.name, decoded?.fullName, decoded?.name, email),
    email: firstValue(body?.email, decoded?.email, decoded?.sub, email),
    dealerCode: firstValue(body?.dealerCode, decoded?.dealerCode, ""),
  };
};

const saveTemporarySession = (account) => {
  AUTH_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(`token_${account.role}`, account.token);
  if (account.role === "DEALER") {
    localStorage.setItem(
      "dealerData",
      JSON.stringify({
        dealerId: account.id,
        id: account.id,
        fullName: account.name,
        name: account.name,
        email: account.email,
        role: "DEALER",
        dealerCode: account.dealerCode,
        token: account.token,
      })
    );
    if (account.dealerCode) localStorage.setItem("dealerCode", account.dealerCode);
    return;
  }

  localStorage.setItem(
    "userData",
    JSON.stringify({
      userId: account.id,
      id: account.id,
      fullName: account.name,
      name: account.name,
      email: account.email,
      role: "USER",
      token: account.token,
    })
  );
};

const deleteVerifiedAccount = async (account) => {
  saveTemporarySession(account);
  if (account.role === "DEALER") {
    return api.delete(`/dealer/delete/${account.id}`);
  }
  return api.delete(`/user/delete/${account.id}`);
};

const DeleteAccount = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [verifiedAccount, setVerifiedAccount] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const account = await resolveAccount(form);
      setVerifiedAccount(account);
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to verify account details.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!verifiedAccount) return;
    setLoading(true);
    try {
      await deleteVerifiedAccount(verifiedAccount);
      clearAuthSession();
      setConfirmOpen(false);
      setDeleted(true);
      setForm({ email: "", password: "" });
      toast.success("Your Vahan Finserv account deletion request has been completed.");
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#0B2A4A]">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-8 flex items-center gap-3">
          <img src={logo} alt="Vahan Finserv Logo" className="h-11 w-11 rounded-full object-contain" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1ECFC3]">Vahan Finserv</p>
            <h1 className="text-3xl font-black text-[#0B2A4A] sm:text-5xl">Delete Your Account</h1>
          </div>
        </div>

        <p className="mb-8 max-w-3xl text-base leading-7 text-slate-600">
          Enter your registered email and password to request deletion of your Vahan Finserv account.
          This flow is for customers and dealers who want to permanently remove account access.
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <FaTrashAlt />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0B2A4A]">Delete Your Vahan Finserv Account</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  At Vahan Finserv, we respect your privacy and give you control over your account information.
                  You can request account deletion by verifying your registered email and password.
                </p>
                <p>
                  Once deletion is confirmed, your login access, profile details, loan application details,
                  uploaded documents, payment verification records, dealer/customer records, and account-related
                  information may be removed from our platform.
                </p>
                <p>
                  Some information may be retained where required for legal, payment, security, dispute resolution,
                  audit, or compliance purposes.
                </p>
                <p>
                  Before deleting your account, make sure you have no active loan applications, pending payments,
                  bank assignments, document verifications, or unresolved service issues.
                </p>
              </div>
            </div>
          </div>

          {deleted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <p className="font-bold">Your account deletion request is complete.</p>
              <p className="mt-1 text-sm">You can create a new Vahan Finserv account later if you need our services again.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 border-t border-slate-200 pt-7">
              <div className="grid gap-5">
                <label className="block">
                  <span className="text-sm font-bold text-[#0B2A4A]">Email Address</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-[#EAF4FF] px-4 py-3 text-sm font-semibold outline-none focus:border-[#1ECFC3] focus:ring-2 focus:ring-[#1ECFC3]/20"
                    placeholder="Enter your registered email"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[#0B2A4A]">Password</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-[#EAF4FF] px-4 py-3 text-sm font-semibold outline-none focus:border-[#1ECFC3] focus:ring-2 focus:ring-[#1ECFC3]/20"
                    placeholder="Enter your password"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaTrashAlt /> {loading ? "Verifying..." : "Request Account Deletion"}
              </button>
            </form>
          )}
        </section>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FaShieldAlt />
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close confirmation"
              >
                <FaTimes />
              </button>
            </div>
            <h2 className="text-2xl font-black text-[#0B2A4A]">
              Are you sure you want to delete your Vahan Finserv account?
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              This action may permanently remove account access for{" "}
              <span className="font-bold text-[#0B2A4A]">{verifiedAccount?.email}</span>, including loan applications,
              uploaded documents, dealer/customer records, and account history.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-[#0B2A4A] hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Yes, Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default DeleteAccount;

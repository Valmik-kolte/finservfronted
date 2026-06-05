import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;

export const markPaymentSuccess = async (userId) => {
  const response = await api.put(`/user/payment-success/${userId}`);
  return unwrap(response);
};

export const getPaymentVerificationRequests = async () => {
  const response = await api.get("/payments/admin/verification-requests");
  return unwrap(response);
};

export const approvePayment = async (userId, remarks = "Payment received") => {
  const response = await api.put(`/payments/admin/${userId}/approve`, { remarks });
  return unwrap(response);
};

export const rejectPayment = async (userId, remarks = "Payment not received / invalid transaction") => {
  const response = await api.put(`/payments/admin/${userId}/reject`, { remarks });
  return unwrap(response);
};

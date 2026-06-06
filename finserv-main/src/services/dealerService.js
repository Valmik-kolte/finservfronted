import api from "./api";

export const registerDealer = async (dealerData) => {
  const response = await api.post("/dealer/register", dealerData);
  return response.data.data;
};

export const getAllDealers = async () => {
  const response = await api.get("/dealer/all");
  return response.data.data; // returns array of DealerResponseDTO
};

export const updateDealer = async (id, dealerData) => {
  const response = await api.put(`/dealer/update/${id}`, dealerData);
  return response.data.data;
};

export const dealerSendOtp = async (email) => {
  const response = await api.post(`/dealer/send-otp?email=${encodeURIComponent(email)}`, null, {
    skipAuth: true,
  });
  return response.data;
};

export const dealerVerifyOtp = async (dto) => {
  const response = await api.post("/dealer/verify-otp", dto, { skipAuth: true });
  return response.data;
};

export const dealerResetPassword = async (dto) => {
  const response = await api.post("/dealer/reset-password", dto, { skipAuth: true });
  return response.data;
};

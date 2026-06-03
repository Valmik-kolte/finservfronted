import api from "./api";

export const registerUser = async (userData) => {
  const response = await api.post("/user/register", userData);
  return response.data.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/user/${userId}`);
  return response.data.data; // { userId, fullName, email, mobileNumber, role, ... }
};

export const getAllUsers = async () => {
  const response = await api.get("/user/all");
  return response.data.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/user/update/${id}`, userData);
  return response.data.data;
};

export const searchUsers = async (name) => {
  const response = await api.get(`/user/search?name=${name}`);
  return response.data.data;
};

export const assignBank = async (userId, bankId) => {
  const response = await api.put(`/user/assign-bank/${userId}`, { bankId });
  return response.data;
};

export const userSendOtp = async (email) => {
  const response = await api.post(`/user/send-otp?email=${email}`);
  return response.data;
};

export const userVerifyOtp = async (dto) => {
  const response = await api.post("/user/verify-otp", dto);
  return response.data;
};

export const userResetPassword = async (dto) => {
  const response = await api.post("/user/reset-password", dto);
  return response.data;
};

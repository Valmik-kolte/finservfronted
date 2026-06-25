import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;

export const registerUser = async (userData) => {
  const response = await api.post("/user/register", userData);
  return unwrap(response);
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/user/${userId}`);
  return unwrap(response); // { userId, fullName, email, mobileNumber, role, ... }
};

export const getAllUsers = async () => {
  const response = await api.get("/user/all");
  return unwrap(response);
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/user/update/${id}`, userData);
  return unwrap(response);
};

export const searchUsers = async (name) => {
  const response = await api.get(`/user/search?name=${name}`);
  return unwrap(response);
};

export const assignBank = async (userId, bankId) => {
  const response = await api.put(`/user/assign-bank/${userId}`, { bankId });
  return response.data;
};

export const userSendOtp = async (email) => {
  const response = await api.post(`/user/send-otp?email=${encodeURIComponent(email)}`, null, {
    skipAuth: true,
  });
  return response.data;
};

export const userVerifyOtp = async (dto) => {
  const response = await api.post("/user/verify-otp", dto, { skipAuth: true });
  return response.data;
};

export const userResetPassword = async (dto) => {
  const response = await api.post("/user/reset-password", dto, { skipAuth: true });
  return response.data;
};

export const registerUserSendOtp = async (email) => {
  const response = await api.post(`/user/register/send-otp?email=${encodeURIComponent(email)}`, null, {
    skipAuth: true,
  });
  return response.data;
};

export const registerUserVerifyOtp = async (dto) => {
  const response = await api.post("/user/register/verify-otp", dto, { skipAuth: true });
  return response.data;
};

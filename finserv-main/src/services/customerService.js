// src/services/userService.js
import api from "./api";

// USER REGISTER
export const registerUser = async (userData) => {
  // userData = { fullName, email, mobileNumber, password, registrationType, dealerCode }
  const response = await api.post("/user/register", userData);
  return response.data;
};

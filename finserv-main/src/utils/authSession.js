export const AUTH_SESSION_KEYS = [
  "token",
  "role",
  "user",
  "userData",
  "dealerData",
  "adminData",
  "dealerId",
  "dealerCode",
];

export const clearAuthSession = () => {
  AUTH_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

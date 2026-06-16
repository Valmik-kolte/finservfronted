export const AUTH_SESSION_KEYS = [
  "token",
  "role",
  "user",
  "userData",
  "dealerData",
  "adminData",
  "dealerId",
  "dealerCode",
  "token_ADMIN",
  "token_DEALER",
  "token_USER",
];

export const clearAuthSession = () => {
  AUTH_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn("Failed to clear sessionStorage:", e);
  }
};

export const getAuthToken = () => {
  let token = localStorage.getItem("token");
  if (typeof window !== "undefined" && window.location) {
    const path = window.location.pathname;
    try {
      if (path.includes("/admin")) {
        const adminData = JSON.parse(localStorage.getItem("adminData") || "null");
        token = adminData?.token || localStorage.getItem("token_ADMIN") || token;
      } else if (path.includes("/dealer")) {
        const dealerData = JSON.parse(localStorage.getItem("dealerData") || "null");
        token = dealerData?.token || localStorage.getItem("token_DEALER") || token;
      } else if (path.includes("/customer")) {
        const userData = JSON.parse(localStorage.getItem("userData") || "null");
        token = userData?.token || localStorage.getItem("token_USER") || token;
      }
    } catch (e) {
      console.warn("Failed to resolve role-specific token:", e);
    }
  }
  return token;
};

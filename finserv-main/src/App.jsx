import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import AppRoutes from "./routes/AppRoutes";
import { getAuthToken, clearAuthSession } from "./utils/authSession";

function App() {
  const location = useLocation();

  useEffect(() => {
    // 1. Function to handle session expiration and redirect
    const handleSessionExpired = () => {
      clearAuthSession();
      localStorage.setItem("session_expired_toast", "true");
      window.location.href = "/login";
    };

    // 2. Decode token and get remaining time
    const checkTokenExpiry = () => {
      const token = getAuthToken();
      if (!token) return null;

      try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        
        // Normalize base64url to base64 and pad
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padLen = (4 - (base64.length % 4)) % 4;
        const paddedBase64 = base64 + "=".repeat(padLen);
        
        const jsonPayload = decodeURIComponent(
          atob(paddedBase64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        
        const payload = JSON.parse(jsonPayload);
        if (!payload.exp) return null;
        const expiryMs = payload.exp * 1000;
        const remaining = expiryMs - Date.now();
        return { expired: remaining <= 0, remaining };
      } catch (e) {
        console.warn("Failed to decode JWT token:", e);
        return { expired: true, remaining: 0 };
      }
    };

    // 3. Perform initial check
    const status = checkTokenExpiry();
    if (status && status.expired) {
      handleSessionExpired();
      return;
    }

    // 4. Set proactive timeout if token is valid and has remaining time
    let expiryTimeout = null;
    if (status && status.remaining > 0) {
      expiryTimeout = setTimeout(() => {
        handleSessionExpired();
      }, status.remaining);
    }

    // 5. Check on tab focus
    const handleFocus = () => {
      const focusStatus = checkTokenExpiry();
      if (focusStatus && focusStatus.expired) {
        handleSessionExpired();
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (expiryTimeout) clearTimeout(expiryTimeout);
      window.removeEventListener("focus", handleFocus);
    };
  }, [location.pathname]);

  // Toast trigger on page load / navigate when flag is set
  useEffect(() => {
    if (localStorage.getItem("session_expired_toast") === "true") {
      localStorage.removeItem("session_expired_toast");
      toast.error("Session expired. Please login again.");
    }
  }, [location.pathname]);

  return <AppRoutes />;
}

export default App;
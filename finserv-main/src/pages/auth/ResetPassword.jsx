import  { useEffect, useState } from "react";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { dealerResetPassword } from "../../services/dealerService";
import { userResetPassword } from "../../services/customerService";
import AuthPageFrame from "./AuthPageFrame";

const getMessage = (error, fallback) =>
    error?.response?.data || error?.message || fallback;

const ResetPassword = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const email = sessionStorage.getItem("forgot_email") || "";
  const role = sessionStorage.getItem("forgot_role") || "USER";
  const otpVerified =
      sessionStorage.getItem("forgot_otp_verified") === "true";

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }

    if (!otpVerified) {
      navigate("/verify-otp");
    }
  }, [email, otpVerified, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.password) {
      toast.error("Please enter a new password.");
      return;
    }

    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const dto = {
        email,
        newPassword: form.password,
      };

      const message =
          role === "DEALER"
              ? await dealerResetPassword(dto)
              : await userResetPassword(dto);

      const normalized = String(message || "").toLowerCase();

      if (
          normalized.includes("verify otp first") ||
          normalized.includes("not found")
      ) {
        toast.error(message);
        return;
      }

      toast.success(message || "Password reset successful");

      sessionStorage.removeItem("forgot_email");
      sessionStorage.removeItem("forgot_role");
      sessionStorage.removeItem("forgot_otp_verified");

      navigate("/login");
    } catch (error) {
      toast.error(
          getMessage(error, "Failed to reset password.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
      <AuthPageFrame ariaLabel="Reset password form">
        <form onSubmit={handleSubmit}>
          <h2 className="auth-simple-title">Reset Password</h2>
          <p className="auth-simple-subtitle">
            Enter your new password
          </p>

          <div className="auth-simple-divider" />

          <label
              className="auth-simple-label first"
              htmlFor="reset-password"
          >
            New Password
          </label>

          <div className="auth-simple-input-wrap first">
            <FaLock className="auth-simple-icon" />

            <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={form.password}
                onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                }
                className="auth-simple-input"
                required
            />

            <button
                type="button"
                onClick={() =>
                    setShowPassword((prev) => !prev)
                }
                style={{
                  marginRight: 13,
                  border: 0,
                  background: "transparent",
                  color: "#7b8aa8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <label
              className="auth-simple-label second"
              htmlFor="reset-confirm-password"
          >
            Confirm Password
          </label>

          <div className="auth-simple-input-wrap second">
            <FaLock className="auth-simple-icon" />

            <input
                id="reset-confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirm}
                onChange={(e) =>
                    setForm({
                      ...form,
                      confirm: e.target.value,
                    })
                }
                className="auth-simple-input"
                required
            />

            <button
                type="button"
                onClick={() =>
                    setShowConfirm((prev) => !prev)
                }
                style={{
                  marginRight: 13,
                  border: 0,
                  background: "transparent",
                  color: "#7b8aa8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
              type="submit"
              className="auth-simple-submit two-fields"
              disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </AuthPageFrame>
  );
};

export default ResetPassword;
 
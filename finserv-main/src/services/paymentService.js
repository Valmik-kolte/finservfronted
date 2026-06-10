import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;

export const markPaymentSuccess = async (userId) => {
  const response = await api.put(`/user/payment-success/${userId}`);
  return unwrap(response);
};

export const getPaymentVerificationRequests = async () => {
  try {
    const response = await api.get("/user/history");
    const dbUsers = unwrap(response) || [];

    let localRequests = [];
    try {
      localRequests = JSON.parse(localStorage.getItem("customer_payment_requests") || "[]");
    } catch (e) {
      localRequests = [];
    }

    const localMap = new Map(
      localRequests.map((req) => [String(req.userId), req])
    );

    return dbUsers.map((dbUser) => {
      const userIdStr = String(dbUser.userId);
      const localReq = localMap.get(userIdStr);

      let status = "PAYMENT_PENDING";
      if (dbUser.paymentStatus === "APPROVED") {
        status = "PAYMENT_APPROVED";
      } else if (localReq) {
        status = localReq.status || "PAYMENT_VERIFICATION_PENDING";
      }

      return {
        userId: dbUser.userId,
        applicationId: dbUser.applicationId,
        fullName: dbUser.fullName,
        email: dbUser.email,
        mobileNumber: dbUser.mobileNumber,
        status: status,
        createdAt: dbUser.paymentDate || new Date().toISOString(),
        transactionId: localReq?.transactionId || "",
        paymentScreenshot: localReq?.paymentScreenshot || "",
      };
    });
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return [];
  }
};

export const approvePayment = async (userId) => {
  const response = await api.put(`/user/payment-success/${userId}`);

  try {
    localStorage.setItem(`customer_payment_status_${userId}`, "PAYMENT_APPROVED");
    
    let localRequests = JSON.parse(localStorage.getItem("customer_payment_requests") || "[]");
    localRequests = localRequests.map((req) =>
      String(req.userId) === String(userId) ? { ...req, status: "PAYMENT_APPROVED" } : req
    );
    localStorage.setItem("customer_payment_requests", JSON.stringify(localRequests));
  } catch (e) {
    console.error("Failed to update local storage for approval:", e);
  }

  return unwrap(response);
};

export const rejectPayment = async (userId) => {
  try {
    localStorage.setItem(`customer_payment_status_${userId}`, "PAYMENT_REJECTED");
    
    let localRequests = JSON.parse(localStorage.getItem("customer_payment_requests") || "[]");
    localRequests = localRequests.map((req) =>
      String(req.userId) === String(userId) ? { ...req, status: "PAYMENT_REJECTED" } : req
    );
    localStorage.setItem("customer_payment_requests", JSON.stringify(localRequests));
  } catch (e) {
    console.error("Failed to update local storage for rejection:", e);
  }

  return { success: true };
};

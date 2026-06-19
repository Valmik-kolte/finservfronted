import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;

const getAdminId = () => {
  try {
    const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
    return admin.id || 1;
  } catch {
    return 1;
  }
};

export const markPaymentSuccess = async (userId) => {
  const response = await api.put(`/user/payment-success/${userId}?amount=116.82`);
  return unwrap(response);
};

export const getPaymentVerificationRequests = async () => {
  try {
    const adminId = getAdminId();
    const [historyRes, notifRes] = await Promise.all([
      api.get("/user/history"),
      api.get(`/notifications/${adminId}`)
    ]);

    const dbUsers = unwrap(historyRes) || [];
    const notifications = notifRes.data || [];

    const approvedUserIds = new Set(
      notifications
        .filter((notif) => notif.message === "PAYMENT_STATUS:PAYMENT_APPROVED")
        .map((notif) => String(notif.receiverId || notif.senderId))
    );

    const rejectedUserIds = new Set(
      notifications
        .filter((notif) => notif.message === "PAYMENT_STATUS:PAYMENT_REJECTED")
        .map((notif) => String(notif.receiverId || notif.senderId))
    );

    // Identify userIds who have paid and are waiting for admin payment approval.
    const pendingRequestUserIds = new Set(
      notifications
        .filter(
          (notif) =>
            notif.message &&
            (notif.message === "PAYMENT_STATUS:PAYMENT_VERIFICATION_PENDING" ||
              notif.message.includes("submitted documents for payment verification"))
        )
        .map((notif) => String(notif.senderId || notif.receiverId))
    );

    return dbUsers.map((dbUser) => {
      let status = "PAYMENT_PENDING";
      if (approvedUserIds.has(String(dbUser.userId)) || dbUser.paymentStatus === "PAYMENT_APPROVED") {
        status = "PAYMENT_APPROVED";
      } else if (rejectedUserIds.has(String(dbUser.userId)) || dbUser.paymentStatus === "PAYMENT_REJECTED") {
        status = "PAYMENT_REJECTED";
      } else if (
        pendingRequestUserIds.has(String(dbUser.userId)) ||
        dbUser.paymentDone ||
        dbUser.paymentStatus === "APPROVED" ||
        dbUser.paymentStatus === "VERIFICATION_PENDING" ||
        dbUser.paymentStatus === "PAYMENT_VERIFICATION_PENDING"
      ) {
        status = "PAYMENT_VERIFICATION_PENDING";
      }

      return {
        userId: dbUser.userId,
        applicationId: dbUser.applicationId || "",
        fullName: dbUser.fullName,
        email: dbUser.email,
        mobileNumber: dbUser.mobileNumber,
        status: status,
        createdAt: dbUser.paymentDate || dbUser.createdAt || new Date().toISOString(),
        transactionId: "",
        paymentScreenshot: "",
      };
    });
  } catch (error) {
    console.error("Failed to fetch payment verification requests:", error);
    return [];
  }
};

export const approvePayment = async (userId) => {
  const adminId = getAdminId();

  try {
    await api.post("/notifications/send", {
      senderId: userId,
      receiverId: adminId,
      senderRole: "USER",
      receiverRole: "ADMIN",
      role: "ADMIN",
      message: "PAYMENT_STATUS:PAYMENT_APPROVED",
    });

    await api.post("/notifications/send", {
      senderId: adminId,
      receiverId: userId,
      senderRole: "ADMIN",
      receiverRole: "USER",
      role: "USER",
      message: "PAYMENT_STATUS:PAYMENT_APPROVED",
    });
  } catch (e) {
    console.error("Failed to send approval notification to database:", e);
  }

  return { success: true };
};

export const rejectPayment = async (userId) => {
  const adminId = getAdminId();

  try {
    await api.post("/notifications/send", {
      senderId: userId,
      receiverId: adminId,
      senderRole: "USER",
      receiverRole: "ADMIN",
      role: "ADMIN",
      message: "PAYMENT_STATUS:PAYMENT_REJECTED",
    });

    await api.post("/notifications/send", {
      senderId: adminId,
      receiverId: userId,
      senderRole: "ADMIN",
      receiverRole: "USER",
      role: "USER",
      message: "PAYMENT_STATUS:PAYMENT_REJECTED",
    });
  } catch (e) {
    console.error("Failed to send rejection notification to database:", e);
  }

  return { success: true };
};

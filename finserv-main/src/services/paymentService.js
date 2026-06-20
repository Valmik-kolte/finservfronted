import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;
const asList = (response) => {
  if (Array.isArray(response)) return response;

  const data = response?.data !== undefined ? unwrap(response) : response;
  if (Array.isArray(data)) return data;

  const nestedList = [
    data?.data,
    data?.content,
    data?.users,
    data?.notifications,
    data?.items,
    data?.records,
    data?.result,
    data?.results,
  ].find(Array.isArray);

  return nestedList || [];
};

const getAdminId = () => {
  try {
    const admin = JSON.parse(localStorage.getItem("adminData") || "{}");
    return admin.id || admin.adminId || 1;
  } catch {
    return 1;
  }
};

const getNotificationUserId = (notif) => {
  if (notif.senderRole === "USER" && notif.senderId) return notif.senderId;
  if (notif.receiverRole === "USER" && notif.receiverId) return notif.receiverId;
  return notif.userId || notif.customerId || notif.senderId || notif.receiverId;
};

const normalizeStatus = (status) => String(status || "").trim().toUpperCase();

const isPaymentVerificationPending = (user) => {
  const status = normalizeStatus(user.paymentStatus || user.status);
  const hasPaymentReference = Boolean(
    user.paymentId ||
    user.razorpayPaymentId ||
    user.razorpay_payment_id ||
    user.transactionId ||
    user.paymentReferenceId
  );

  return (
    user.paymentDone === true ||
    user.paid === true ||
    hasPaymentReference ||
    status === "APPROVED" ||
    status === "VERIFICATION_PENDING" ||
    status === "PAYMENT_VERIFICATION_PENDING" ||
    status === "PAYMENT_SUCCESS" ||
    status === "SUCCESS" ||
    status === "COMPLETED" ||
    status === "PAID"
  );
};

export const markPaymentSuccess = async (userId, payload = {}) => {
  const encodedOrderId = encodeURIComponent(payload.orderId || "");
  const encodedPaymentId = encodeURIComponent(payload.paymentId || "");
  const response = await api.put(
    `/user/payment-success/${userId}/${encodedOrderId}/${encodedPaymentId}`,
    null
  );
  return unwrap(response);
};

export const getPaymentVerificationRequests = async () => {
  try {
    const adminId = getAdminId();
    const [historyRes, notifRes] = await Promise.allSettled([
      api.get("/user/history"),
      api.get(`/notifications/${adminId}`)
    ]);

    if (historyRes.status === "rejected") {
      throw historyRes.reason;
    }

    const dbUsers = asList(historyRes.value);
    const notifications = notifRes.status === "fulfilled" ? asList(notifRes.value) : [];

    const approvedUserIds = new Set(
      notifications
        .filter((notif) => notif.message === "PAYMENT_STATUS:PAYMENT_APPROVED")
        .map((notif) => String(getNotificationUserId(notif)))
    );

    const rejectedUserIds = new Set(
      notifications
        .filter((notif) => notif.message === "PAYMENT_STATUS:PAYMENT_REJECTED")
        .map((notif) => String(getNotificationUserId(notif)))
    );

    // Notifications are helpful, but payment requests must not depend on a hardcoded admin id.
    const pendingRequestUserIds = new Set(
      notifications
        .filter(
          (notif) =>
            notif.message &&
            (notif.message === "PAYMENT_STATUS:PAYMENT_VERIFICATION_PENDING" ||
              notif.message.includes("submitted documents for payment verification"))
        )
        .map((notif) => String(getNotificationUserId(notif)))
    );

    return dbUsers.map((dbUser) => {
      let status = "PAYMENT_PENDING";
      const userId = dbUser.userId || dbUser.id;
      const paymentStatus = normalizeStatus(dbUser.paymentStatus || dbUser.status);

      if (approvedUserIds.has(String(userId)) || paymentStatus === "PAYMENT_APPROVED") {
        status = "PAYMENT_APPROVED";
      } else if (rejectedUserIds.has(String(userId)) || paymentStatus === "PAYMENT_REJECTED") {
        status = "PAYMENT_REJECTED";
      } else if (pendingRequestUserIds.has(String(userId)) || isPaymentVerificationPending(dbUser)) {
        status = "PAYMENT_VERIFICATION_PENDING";
      }

      return {
        userId,
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

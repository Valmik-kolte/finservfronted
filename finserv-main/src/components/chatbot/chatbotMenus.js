import {
  getAdminDealerSummary,
  getAdminDocumentSummary,
  getAdminPendingDocuments,
  getAdminUsers,
  getDealerMonthlySummary,
  getDealerMyId,
  getDealerPendingDocuments,
  getDealerUsers,
  getUserApplicationSummary,
  getUserDocumentStatus,
  getUserPendingDocuments,
  getUserLoanAmount,
  getUserTimeline,
  getUserPaymentStatus,
  getUserAssignedBank,
  getUserNextAction,
  getUserActionNeeded,
} from "../../services/chatbotService";

export const CHATBOT_WELCOME_MESSAGES = {
  USER: (name) =>
    `Hi ${name || "User"}, I can help you check your application, documents, payment, and loan status.`,
  DEALER: (name) =>
    `Hi ${name || "Dealer"}, I can help you review your users, pending documents, and dealer summary.`,
  ADMIN: () =>
    "Hi Admin, I can help you monitor users, dealers, payments, and document activity.",
};

// Role-based quick actions map each chip to one protected chatbot API call.
export const CHATBOT_MENUS = {
  USER: [
    {
      key: "USER_APPLICATION_SUMMARY",
      label: "Application Summary",
      service: getUserApplicationSummary,
    },
    {
      key: "USER_TIMELINE",
      label: "Application Timeline",
      service: getUserTimeline,
    },
    {
      key: "USER_DOCUMENT_STATUS",
      label: "Document Status",
      service: getUserDocumentStatus,
    },
    {
      key: "USER_PENDING_DOCUMENTS",
      label: "Pending Documents",
      service: getUserPendingDocuments,
    },
    {
      key: "USER_LOAN_AMOUNT",
      label: "Loan Amount",
      service: getUserLoanAmount,
    },
    {
      key: "USER_PAYMENT_STATUS",
      label: "Payment Status",
      service: getUserPaymentStatus,
    },
    {
      key: "USER_ASSIGNED_BANK",
      label: "Assigned Bank",
      service: getUserAssignedBank,
    },
    {
      key: "USER_NEXT_ACTION",
      label: "What Should I Do?",
      service: getUserNextAction,
    },
    {
      key: "USER_ACTION_NEEDED",
      label: "Action Needed",
      service: getUserActionNeeded,
    },
  ],
  DEALER: [
    {
      key: "DEALER_MY_ID",
      label: "My Dealer ID",
      service: getDealerMyId,
    },
    {
      key: "DEALER_USERS",
      label: "My Users",
      service: getDealerUsers,
    },
    {
      key: "DEALER_PENDING_DOCUMENTS",
      label: "Pending Documents",
      service: getDealerPendingDocuments,
    },
    {
      key: "DEALER_MONTHLY_SUMMARY",
      label: "Monthly Summary",
      service: getDealerMonthlySummary,
    },
  ],
  ADMIN: [
    {
      key: "ADMIN_USERS",
      label: "All Users",
      service: getAdminUsers,
    },
    {
      key: "ADMIN_DEALER_SUMMARY",
      label: "Dealer Summary",
      service: getAdminDealerSummary,
    },
    {
      key: "ADMIN_DOCUMENT_SUMMARY",
      label: "Document Summary",
      service: getAdminDocumentSummary,
    },
    {
      key: "ADMIN_PENDING_DOCUMENTS",
      label: "Pending Documents",
      service: getAdminPendingDocuments,
    },
  ],
};

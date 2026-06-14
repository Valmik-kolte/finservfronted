import React, { useCallback, useEffect, useMemo, useState } from "react";
import ChatbotButton from "./ChatbotButton";
import ChatbotWindow from "./ChatbotWindow";
import { CHATBOT_MENUS, CHATBOT_WELCOME_MESSAGES } from "./chatbotMenus";
import { getAuthToken } from "../../utils/authSession";

const parseSession = (role) => {
  const key =
    role === "ADMIN" ? "adminData" : role === "DEALER" ? "dealerData" : "userData";

  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const normalizeRole = (value) => {
  const role = String(value || "")
    .replace(/^ROLE_/i, "")
    .toUpperCase();
  if (role === "CUSTOMER") return "USER";
  if (["USER", "DEALER", "ADMIN"].includes(role)) return role;
  return "";
};

const detectStoredRole = () => {
  const explicitRole = normalizeRole(localStorage.getItem("role"));
  if (explicitRole) return explicitRole;
  if (localStorage.getItem("adminData")) return "ADMIN";
  if (localStorage.getItem("dealerData")) return "DEALER";
  if (localStorage.getItem("userData")) return "USER";
  return "";
};

const createMessage = ({ sender, text, actionKey = "", data = null }) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sender,
  text,
  createdAt: new Date().toISOString(),
  actionKey,
  data,
});

const getDefaultMessage = (role, sessionUser) => {
  const resolver = CHATBOT_WELCOME_MESSAGES[role];
  return resolver
    ? resolver(sessionUser?.name)
    : "Your session is not available. Please login again.";
};

// Role-aware Phase 1 assistant mounted on authenticated dashboards only.
const Chatbot = ({ roleOverride = "", onNavigateSection }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Resolve auth/session from the same localStorage keys already used by the dashboards.
  useEffect(() => {
    const storedRole = normalizeRole(roleOverride) || detectStoredRole();
    const token = getAuthToken();
    if (!token || !storedRole) {
      setRole(null);
      setSessionUser(null);
      return;
    }

    const normalizedRole = normalizeRole(storedRole);
    setRole(normalizedRole);
    setSessionUser(parseSession(normalizedRole) || {});
    setMessages([]);
    setIsOpen(false);
  }, [roleOverride]);

  const menuItems = useMemo(() => CHATBOT_MENUS[role] || [], [role]);

  const openChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
    setMessages((prev) =>
      prev.length > 0
        ? prev
        : [
            createMessage({
              sender: "bot",
              text: getDefaultMessage(role, sessionUser),
            }),
          ]
    );
  };

  const closeChat = () => setIsOpen(false);

  const handleAction = useCallback(
    async (item) => {
      const token = getAuthToken();
      if (!token || !role) {
        setMessages((prev) => [
          ...prev,
          createMessage({
            sender: "bot",
            text: "Your session is not available. Please login again.",
            actionKey: item?.key,
          }),
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        createMessage({ sender: "user", text: item.label, actionKey: item.key }),
      ]);
      setLoading(true);

      try {
        // Each action calls its protected role-specific chatbot endpoint.
        const response = await item.service();
        const hasNoData =
          !response?.data ||
          (Array.isArray(response.data) && response.data.length === 0) ||
          (typeof response.data === "object" &&
            !Array.isArray(response.data) &&
            Object.keys(response.data).length === 0);

        setMessages((prev) => [
          ...prev,
          createMessage({
            sender: "bot",
            text:
              response?.message ||
              (response?.success === false
                ? "Unable to fetch this right now. Please try again."
                : hasNoData
                  ? "No records found for this action."
                  : "Here is the latest Vahan Finserv data."),
            actionKey: item.key,
            data: response?.data,
          }),
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          createMessage({
            sender: "bot",
            text:
              error?.response?.data?.message ||
              "Unable to fetch this right now. Please try again.",
            actionKey: item.key,
          }),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [role, sessionUser]
  );

  if (!getAuthToken() || !role || menuItems.length === 0) return null;

  return (
    <>
      {isOpen ? (
        <ChatbotWindow
          role={role}
          messages={messages}
          menuItems={menuItems}
          loading={loading}
          onClose={closeChat}
          onAction={handleAction}
          onNavigateSection={onNavigateSection}
        />
      ) : (
        <ChatbotButton onClick={openChat} unreadCount={unreadCount} />
      )}
    </>
  );
};

export default Chatbot;

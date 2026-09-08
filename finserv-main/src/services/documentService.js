import api from "./api";

export const uploadDocument = (formData) =>
  api.post("/documents/upload", formData);

export const getUserDocuments = (userId) =>
  api.get(`/documents/user/${userId}`);

export const getDocumentById = (documentId) =>
  api.get(`/documents/${documentId}`);

export const deleteDocument = (documentId) =>
  api.delete(`/documents/${documentId}`);

export const updateDocumentStatus = (documentId, status) =>
  api.put(`/documents/status/${documentId}?status=${status}`);

export const addRemarks = (documentId, remarks) =>
  api.put(`/documents/${documentId}/remarks`, { remarks });

export const getPendingDocuments = () =>
  api.get("/documents/pending");

export const getVerifiedDocuments = () =>
  api.get("/documents/verified");

export const getDocumentCounts = (userId) =>
  api.get(`/documents/count/${userId}`);

export const getDocumentPreviewUrl = (documentId) =>
  `${api.defaults.baseURL}/documents/preview/${documentId}`;

export const getDocumentDownloadUrl = (documentId) =>
  `${api.defaults.baseURL}/documents/download/${documentId}`;

export const getMediaBaseUrl = () => {
  const base = api.defaults.baseURL || "";
  return base.replace(/\/api\/?$/, "");
};

export const isImageFile = (fileNameOrUrl = "") => {
  const clean = String(fileNameOrUrl).split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(clean);
};

export const isPdfFile = (fileNameOrUrl = "") => {
  const clean = String(fileNameOrUrl).split("?")[0].toLowerCase();
  return /\.pdf$/i.test(clean);
};

export const resolveDocumentUrl = (doc) => {
  if (!doc) return "";
  if (doc.fileUrl) {
    if (doc.fileUrl.startsWith("/")) {
      return `${getMediaBaseUrl()}${doc.fileUrl}`;
    }
    try {
      const parsed = new URL(doc.fileUrl);
      if (parsed.pathname.startsWith("/media/")) {
        return `${getMediaBaseUrl()}${parsed.pathname}`;
      }
    } catch {
      // Invalid URL or relative, return as-is
    }
    return doc.fileUrl;
  }
  if (doc.documentId) {
    return `${api.defaults.baseURL}/documents/preview/${doc.documentId}`;
  }
  return "";
};


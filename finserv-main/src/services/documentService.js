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
  `http://localhost:8081/api/documents/preview/${documentId}`;

export const getDocumentDownloadUrl = (documentId) =>
  `http://localhost:8081/api/documents/download/${documentId}`;

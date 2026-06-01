import api from "./api";

export const getDocuments = (customerId) =>
  api.get(`/documents/id/${customerId}`);

// UPLOAD DOCUMENT
export const uploadDocument = (formData) => {
  return api.post(
    "/documents/upload",
    formData
  );
};
// GET USER DOCUMENTS
export const getUserDocuments = (userId) =>
  api.get(`/documents/user/${userId}`);
export const deleteDocument = (id) =>
  api.delete(`/documents/id/${id}`);
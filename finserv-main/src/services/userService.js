import api from "./api";

const unwrap = (response) => response.data?.data ?? response.data;

export const deleteUserAccount = async (userId) => {
  const response = await api.delete(`/user/delete/${userId}`);
  return unwrap(response);
};

export const deleteDealerAccount = async (dealerId) => {
  const response = await api.delete(`/dealer/delete/${dealerId}`);
  return unwrap(response);
};

export const deleteDealerAddedUser = async (dealerCode, userId) => {
  const response = await api.delete(`/dealer/${dealerCode}/user/${userId}`);
  return unwrap(response);
};

import api from "./api";

export const registerDealer = async (dealerData) => {
  const response = await api.post("/dealer/register", dealerData);
  return response; // return full response, not just response.data
};

export const getDealerById = async (dealerId) => {
  const response = await api.get(`/dealer/${dealerId}`);
  return response; // same here
};

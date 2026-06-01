export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone) =>
  /^[6-9]\d{9}$/.test(phone);

export const isValidPAN = (pan) =>
  /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

export const isValidAadhaar = (aadhaar) =>
  /^\d{12}$/.test(aadhaar);

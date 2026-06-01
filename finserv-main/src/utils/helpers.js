export const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export const truncate = (str, len = 30) =>
  str?.length > len ? str.slice(0, len) + "..." : str;

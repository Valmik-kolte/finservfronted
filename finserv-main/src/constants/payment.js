export const READY2DRIVE_BASE_AMOUNT = 99;
export const READY2DRIVE_GST_RATE = 0.18;
export const READY2DRIVE_GST_PERCENT = READY2DRIVE_GST_RATE * 100;
export const READY2DRIVE_GST_AMOUNT = Number(
  (READY2DRIVE_BASE_AMOUNT * READY2DRIVE_GST_RATE).toFixed(2)
);
export const READY2DRIVE_TOTAL_AMOUNT = Number(
  (READY2DRIVE_BASE_AMOUNT + READY2DRIVE_GST_AMOUNT).toFixed(2)
);

export const formatINR = (amount) => {
  const value = Number(amount) || 0;
  return `Rs ${value.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export const READY2DRIVE_FEE_LABEL = `Ready2Drive @ ${formatINR(
  READY2DRIVE_BASE_AMOUNT
)} + GST`;
export const READY2DRIVE_GST_LABEL = `GST ${READY2DRIVE_GST_PERCENT}%`;

export const formatDocNumber = (receiptNumber, id) => {
  const groups = String(receiptNumber || "").match(/\d+/g);
  const source = groups ? groups[groups.length - 1] : String(id || 1);
  return source.slice(-4).padStart(4, "0");
};

export default formatDocNumber;

export const formatDocNumber = (receiptNumber, id) => {
  const prefixed = String(receiptNumber || "").trim().match(/^([a-z]+)-(\d+)$/i);
  if (prefixed) {
    return `${prefixed[1].toUpperCase()}-${prefixed[2].padStart(2, "0")}`;
  }
  const groups = String(receiptNumber || "").match(/\d+/g);
  const source = groups ? groups[groups.length - 1] : String(id || 1);
  return source.slice(-4).padStart(4, "0");
};

export default formatDocNumber;

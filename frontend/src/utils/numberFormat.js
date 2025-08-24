export function formatNumbersInString(str) {
  // Only format numbers with 4 or more digits
  return str.replace(/\d{4,}/g, match =>
    Number(match).toLocaleString()
  );
}

export function formatValue(val) {
  if (typeof val === "number" && val >= 1000) return val.toLocaleString();
  if (typeof val === "number") return val.toString();
  if (typeof val === "string") return formatNumbersInString(val);
  return val;
}
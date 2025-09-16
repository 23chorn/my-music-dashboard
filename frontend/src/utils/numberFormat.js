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

export function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
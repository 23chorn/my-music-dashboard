export function formatNumbersInString(str) {
  // If the string matches a date format dd/mm/yyyy or mm/yyyy, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str) || /^\d{2}\/\d{4}$/.test(str)) return str;
  return str.replace(/\d+/g, match =>
    Number(match).toLocaleString()
  );
}

export function formatValue(val) {
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "string") return formatNumbersInString(val);
  return val;
}
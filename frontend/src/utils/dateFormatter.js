export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "Now Playing";
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatDayDate(dayString) {
  if (!dayString) return "N/A";
  const d = new Date(dayString);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

export function formatMonthYear(monthString) {
  if (!monthString) return "N/A";
  const [year, month] = monthString.split("-");
  return `${month}/${year}`;
}
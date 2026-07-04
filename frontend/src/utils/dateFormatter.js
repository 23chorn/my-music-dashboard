export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function formatWeekdayDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return "N/A";
  const diffSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "Now Playing";
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
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

export function formatDateString(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

export function formatReleaseDate(dateString, precision) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);

  if (precision === 'day') {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (precision === 'month') {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long'
    });
  } else if (precision === 'year') {
    return date.toLocaleDateString(undefined, {
      year: 'numeric'
    });
  }

  return "N/A";
}
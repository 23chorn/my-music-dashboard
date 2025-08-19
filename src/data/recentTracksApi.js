export async function getRecentTimestampFromServer() {
  const res = await fetch('http://localhost:3001/api/recent-timestamp');
  if (!res.ok) throw new Error('Failed to fetch timestamp');
  const data = await res.json();
  return data.lastTimestamp;
}

export async function saveRecentTimestampToServer(lastTimestamp) {
  await fetch('http://localhost:3001/api/recent-timestamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastTimestamp }),
  });
}

export async function saveRecentTracksToServer(tracks) {
  await fetch('http://localhost:3001/api/recent-tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks }),
  });
}

export async function getRecentTracksDataFromServer() {
  const res = await fetch('http://localhost:3001/api/recent-tracks');
  if (!res.ok) throw new Error('Failed to fetch recent tracks data');
  return await res.json(); // { lastTimestamp, tracks }
}
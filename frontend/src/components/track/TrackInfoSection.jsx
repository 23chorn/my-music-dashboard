import { Link } from "react-router-dom";
import StatCard from "../stats/StatCard";

const POPULARITY_BARS = 20;

function formatDuration(ms) {
  if (!ms) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function CreditLine({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-surface-500 uppercase text-[11px] tracking-wide">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function TrackInfoSection({ track }) {
  if (!track) return null;

  const catalogNo = `TRK-${String(track.id).padStart(6, "0")}`;
  const duration = formatDuration(track.duration_ms);
  const releaseYear = track.primary_album_release_date
    ? new Date(track.primary_album_release_date).getFullYear()
    : null;
  const hasPopularity = typeof track.popularity === "number";
  const featuredArtists = (track.artists || []).filter(a => a.id !== track.primary_artist_id);
  const otherAlbums = (track.albums || []).filter(a => a.id !== track.primary_album_id);
  const hasStats = duration || releaseYear || hasPopularity;
  const hasCredits = featuredArtists.length > 0 || otherAlbums.length > 0;

  return (
    <div className="bg-surface-900 rounded-lg p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-sm uppercase tracking-widest text-brand-400">Track Information</h2>
        <span className="font-mono text-[11px] tracking-widest text-surface-600">{catalogNo}</span>
      </div>

      {hasStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {duration && <StatCard title="Duration" value={duration} color="text-surface-100" />}
          {releaseYear && <StatCard title="Released" value={releaseYear} color="text-surface-100" />}
          {hasPopularity && (
            <div className="col-span-2 bg-surface-800 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-xs uppercase tracking-widest text-surface-400">Popularity</h3>
                <span className="font-mono text-xs tabular-nums text-surface-500">{track.popularity}/100</span>
              </div>
              <div className="flex items-end gap-[3px] h-6">
                {Array.from({ length: POPULARITY_BARS }).map((_, i) => {
                  const lit = track.popularity >= (i + 1) * (100 / POPULARITY_BARS);
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-[1px] transition-colors ${lit ? "bg-brand-400" : "bg-surface-700"}`}
                      style={{ height: `${35 + ((i * 7) % 5) * 13}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {hasCredits && (
        <div className={`space-y-2 font-mono text-sm ${hasStats ? "mt-6 pt-5 border-t border-surface-700" : ""}`}>
          {featuredArtists.length > 0 && (
            <CreditLine label="Featuring">
              {featuredArtists.map((a, i) => (
                <span key={a.id}>
                  <Link to={`/artist/${a.id}`} className="text-surface-200 hover:text-brand-400 transition-colors">
                    {a.name}
                  </Link>
                  {i < featuredArtists.length - 1 && <span className="text-surface-600">, </span>}
                </span>
              ))}
            </CreditLine>
          )}
          {otherAlbums.length > 0 && (
            <CreditLine label="Also appears on">
              {otherAlbums.map((al, i) => (
                <span key={al.id}>
                  <Link to={`/album/${al.id}`} className="text-surface-200 hover:text-brand-400 transition-colors">
                    {al.name}
                  </Link>
                  {al.release_date && (
                    <span className="text-surface-600"> ({new Date(al.release_date).getFullYear()})</span>
                  )}
                  {i < otherAlbums.length - 1 && <span className="text-surface-600">, </span>}
                </span>
              ))}
            </CreditLine>
          )}
        </div>
      )}
    </div>
  );
}

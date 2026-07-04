function ResultRow({ image, name, subtitle, playcount, onClick }) {
  return (
    <li
      onClick={onClick}
      className="group relative flex items-center gap-3 pl-3 pr-2 py-2 rounded-sm cursor-pointer transition-colors hover:bg-surface-800 before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-brand-400 before:transition-[width] before:duration-200 hover:before:w-0.5"
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-9 h-9 shrink-0 object-cover rounded ring-1 ring-brand-400/30 sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100"
        />
      ) : (
        <div className="w-9 h-9 shrink-0 rounded bg-surface-800 border border-surface-700 flex items-center justify-center">
          <span className="font-display text-sm text-brand-400/40">
            {(name || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm text-surface-100 truncate">{name}</div>
        {subtitle && <div className="text-xs text-surface-500 truncate">{subtitle}</div>}
      </div>
      {playcount != null && (
        <div className="font-mono text-xs text-surface-500 shrink-0 tabular-nums">
          {playcount} {playcount === 1 ? "play" : "plays"}
        </div>
      )}
    </li>
  );
}

function ResultSection({ title, isEmpty, children }) {
  return (
    <div>
      <h3 className="font-display text-xs uppercase tracking-widest text-brand-400 mb-1">{title}</h3>
      {isEmpty ? (
        <p className="text-xs text-surface-600 italic px-3 py-1.5">No {title.toLowerCase()} found.</p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}

export default function SearchResultsDropdown({
  results,
  onSelectArtist,
  onClose,
  dropdownRef,
  navigate,
}) {
  if (!results) return null;

  const artists = results.artists || [];
  const tracks = results.tracks || [];
  const albums = results.albums || [];

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 mt-1 max-w-xl w-full z-50 bg-surface-900 border border-surface-700 shadow-xl rounded-lg p-2 sm:p-3 space-y-3 max-h-[70vh] overflow-y-auto"
    >
      <ResultSection title="Artists" isEmpty={artists.length === 0}>
        {artists.map(artist => (
          <ResultRow
            key={artist.id}
            image={artist.image}
            name={artist.name}
            playcount={artist.playcount}
            onClick={() => {
              if (onSelectArtist) onSelectArtist(artist.id);
              if (onClose) onClose();
              if (navigate) navigate(`/artist/${artist.id}`);
            }}
          />
        ))}
      </ResultSection>

      <ResultSection title="Tracks" isEmpty={tracks.length === 0}>
        {tracks.map(track => (
          <ResultRow
            key={track.id}
            image={track.image}
            name={track.name}
            subtitle={[track.artist, track.album].filter(Boolean).join(" • ")}
            playcount={track.playcount}
            onClick={() => {
              if (onClose) onClose();
              if (navigate) navigate(`/track/${track.id}`);
            }}
          />
        ))}
      </ResultSection>

      <ResultSection title="Albums" isEmpty={albums.length === 0}>
        {albums.map(album => (
          <ResultRow
            key={album.id}
            image={album.image}
            name={album.name}
            subtitle={album.artist}
            playcount={album.playcount}
            onClick={() => {
              if (onClose) onClose();
              if (navigate) navigate(`/album/${album.id}`);
            }}
          />
        ))}
      </ResultSection>
    </div>
  );
}

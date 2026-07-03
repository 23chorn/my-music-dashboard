export default function SearchResultsDropdown({
  results,
  onSelectArtist,
  onClose,
  dropdownRef,
  navigate,
}) {
  if (!results) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 mt-1 max-w-xl w-full z-50 bg-surface-900 border border-surface-700 shadow-lg rounded p-2 sm:p-4 text-surface-100"
    >
      <div>
        <h3 className="font-display text-xs uppercase tracking-widest text-brand-400 mb-2">Artists</h3>
        <ul>
          {(!results.artists || results.artists.length === 0) && <li className="text-surface-400">No artists found.</li>}
          {results.artists && results.artists.map(artist => (
            <li
              key={artist.id}
              className="mb-1 px-2 py-2 hover:bg-surface-800 rounded cursor-pointer text-sm sm:text-base"
              onClick={() => {
                if (onSelectArtist) onSelectArtist(artist.id);
                if (onClose) onClose();
                if (navigate) navigate(`/artist/${artist.id}`);
              }}
            >
              {artist.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-display text-xs uppercase tracking-widest text-brand-400 mb-2">Tracks</h3>
        <ul>
          {(!results.tracks || results.tracks.length === 0) && <li className="text-surface-400">No tracks found.</li>}
          {results.tracks && results.tracks.map(track => (
            <li 
              key={track.id} 
              className="mb-1 px-2 py-2 hover:bg-surface-800 rounded cursor-pointer text-sm sm:text-base"
              onClick={() => {
                if (onClose) onClose();
                if (navigate) navigate(`/track/${track.id}`);
              }}
            >
              {track.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-display text-xs uppercase tracking-widest text-brand-400 mb-2">Albums</h3>
        <ul>
          {(!results.albums || results.albums.length === 0) && <li className="text-surface-400">No albums found.</li>}
          {results.albums && results.albums.map(album => (
            <li
              key={album.id}
              className="mb-1 px-2 py-2 hover:bg-surface-800 rounded cursor-pointer text-sm sm:text-base"
              onClick={() => {
                if (onClose) onClose();
                if (navigate) navigate(`/album/${album.id}`);
              }}
            >
              {album.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
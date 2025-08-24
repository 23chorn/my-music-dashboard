import React from "react";

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
      className="absolute left-0 right-0 mt-1 max-w-xl w-full z-50 bg-gray-900 border border-gray-700 shadow-lg rounded-lg p-2 sm:p-4 text-gray-100"
    >
      <div>
        <h3 className="font-bold mb-2 text-gray-200 text-base sm:text-lg">Artists</h3>
        <ul>
          {results.artists.length === 0 && <li className="text-gray-400">No artists found.</li>}
          {results.artists.map(artist => (
            <li
              key={artist.id}
              className="mb-1 px-2 py-2 hover:bg-gray-800 rounded cursor-pointer text-sm sm:text-base"
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
        <h3 className="font-bold mb-2 text-gray-200 text-base sm:text-lg">Tracks</h3>
        <ul>
          {results.tracks.length === 0 && <li className="text-gray-400">No tracks found.</li>}
          {results.tracks.map(track => (
            <li key={track.id} className="mb-1 px-2 py-2 hover:bg-gray-800 rounded text-sm sm:text-base">
              {track.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-bold mb-2 text-gray-200 text-base sm:text-lg">Albums</h3>
        <ul>
          {results.albums.length === 0 && <li className="text-gray-400">No albums found.</li>}
          {results.albums.map(album => (
            <li
              key={album.id}
              className="mb-1 px-2 py-2 hover:bg-gray-800 rounded cursor-pointer text-sm sm:text-base"
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
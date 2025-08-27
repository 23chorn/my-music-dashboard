import { Link } from "react-router-dom";

export default function Tile({ tiles }) {
  if (!tiles || tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      {tiles.map((tile, idx) => {
        const content = (
          <div className="flex flex-row items-center justify-center w-full h-full text-center">
            {tile.image && (
              <img
                src={tile.image}
                alt={tile.label}
                className="w-14 h-14 object-cover mr-4 rounded"
              />
            )}
            <div className="flex flex-col items-center justify-center flex-1">
              <span className="text-gray-400 text-sm mb-1">
                {tile.label}
              </span>
              <span className="font-bold text-lg text-blue-300">
                {tile.value}
              </span>
              {tile.sub && (
                <span className="text-gray-400 text-xs">
                  {tile.sub}
                </span>
              )}
              {tile.album && (
                <span className="text-blue-400 text-xs">
                  {tile.album}
                </span>
              )}
            </div>
          </div>
        );
        if (tile.link && tile.link.startsWith("/")) {
          return (
            <Link
              key={idx}
              to={tile.link}
              className="bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center hover:bg-blue-900 transition text-center"
            >
              {content}
            </Link>
          );
        } else if (tile.link) {
          return (
            <a
              key={idx}
              href={tile.link}
              className="bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center hover:bg-blue-900 transition text-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        } else {
          return (
            <div
              key={idx}
              className="bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center hover:bg-gray-700 transition text-center"
            >
              {content}
            </div>
          );
        }
      })}
    </div>
  );
}
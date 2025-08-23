import { Link } from "react-router-dom";
import { formatValue } from "../utils/numberFormat";

export default function Tile({ tiles }) {
  if (!tiles || tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      {tiles.map((tile, idx) => {
        const content = (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <span className="text-gray-400 text-sm mb-1">
              {formatValue(tile.label)}
            </span>
            <span className="font-bold text-lg text-blue-300">
              {formatValue(tile.value)}
            </span>
            {tile.sub && (
              <span className="text-gray-400 text-xs">
                {formatValue(tile.sub)}
              </span>
            )}
            {tile.album && (
              <span className="text-blue-400 text-xs">
                {formatValue(tile.album)}
              </span>
            )}
          </div>
        );
        if (tile.link && tile.link.startsWith("/")) {
          return (
            <Link
              key={idx}
              to={tile.link}
              className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center justify-center hover:bg-blue-900 transition text-center"
            >
              {content}
            </Link>
          );
        } else if (tile.link) {
          return (
            <a
              key={idx}
              href={tile.link}
              className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center justify-center hover:bg-blue-900 transition text-center"
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
              className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center justify-center hover:bg-gray-700 transition text-center"
            >
              {content}
            </div>
          );
        }
      })}
    </div>
  );
}
import BaseTile from "./BaseTile";

export default function GridTile({ label, value, sub, album, image, link }) {
  return (
    <BaseTile link={link}>
      <div className="flex flex-col items-center justify-center w-full h-full text-center p-2 min-h-[120px]">
        {image && (
          <img
            src={image}
            alt={label}
            className="w-12 h-12 object-cover mb-2 rounded"
          />
        )}
        <div className="flex flex-col items-center justify-center flex-1 space-y-1 w-full">
          {label && (
            <span className="text-gray-400 text-xs leading-tight truncate w-full text-center">
              {label}
            </span>
          )}
          <span className="font-bold text-sm text-blue-300 leading-tight text-center truncate w-full">
            {value}
          </span>
          {sub && (
            <span className="text-gray-400 text-xs leading-tight truncate w-full text-center">
              {sub}
            </span>
          )}
          {album && (
            <span className="text-blue-400 text-xs leading-tight truncate w-full text-center">
              {album}
            </span>
          )}
        </div>
      </div>
    </BaseTile>
  );
}
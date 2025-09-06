import BaseTile from "./BaseTile";

export default function GridTile({ label, value, sub, album, image, link, tooltip }) {
  return (
    <BaseTile link={link}>
      <div 
        className="flex flex-col items-center justify-center w-full h-full text-center min-h-[100px]"
        title={tooltip}
      >
        {image && (
          <img
            src={image}
            alt={label}
            className="w-10 h-10 object-cover mb-2 rounded"
          />
        )}
        <div className="flex flex-col items-center justify-center flex-1 space-y-0.5 w-full">
          {label && (
            <span className="text-gray-400 text-xs leading-tight truncate w-full text-center">
              {label}
            </span>
          )}
          <span className="font-bold text-sm text-white leading-tight text-center truncate w-full">
            {value}
          </span>
          {sub && (
            <span className="text-gray-500 text-xs leading-tight truncate w-full text-center">
              {sub}
            </span>
          )}
          {album && (
            <span className="text-gray-400 text-xs leading-tight truncate w-full text-center">
              {album}
            </span>
          )}
        </div>
      </div>
    </BaseTile>
  );
}
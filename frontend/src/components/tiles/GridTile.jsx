import BaseTile from "./BaseTile";

export default function GridTile({ label, value, sub, album, image, link }) {
  return (
    <BaseTile link={link}>
      <div className="flex flex-row items-center justify-center w-full h-full text-center">
        {image && (
          <img
            src={image}
            alt={label}
            className="w-14 h-14 object-cover mr-4 rounded"
          />
        )}
        <div className="flex flex-col items-center justify-center flex-1">
          <span className="text-gray-400 text-sm mb-1">
            {label}
          </span>
          <span className="font-bold text-lg text-blue-300">
            {value}
          </span>
          {sub && (
            <span className="text-gray-400 text-xs">
              {sub}
            </span>
          )}
          {album && (
            <span className="text-blue-400 text-xs">
              {album}
            </span>
          )}
        </div>
      </div>
    </BaseTile>
  );
}
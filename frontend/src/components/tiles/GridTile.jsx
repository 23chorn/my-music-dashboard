import BaseTile from "./BaseTile";
import ContextMenu from "../ui/ContextMenu";

export default function GridTile({ label, value, sub, album, image, link, tooltip, entityId, entityType = 'track' }) {
  // Determine entity name for context menu based on entity type
  const getEntityName = () => {
    switch (entityType) {
      case 'track':
        return label ? `${label} - ${value}` : value;
      case 'album':
        return label ? `${value} by ${label}` : value;
      case 'artist':
        return value;
      default:
        return value;
    }
  };

  const entityName = getEntityName();

  return (
    <ContextMenu
      entityId={entityId}
      entityType={entityType}
      entityName={entityName}
    >
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
    </ContextMenu>
  );
}
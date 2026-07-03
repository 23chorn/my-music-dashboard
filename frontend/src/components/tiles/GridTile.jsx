import BaseTile from "./BaseTile";
import ContextMenu from "../ui/ContextMenu";

export default function GridTile({ label, value, sub, album, image, link, tooltip, entityId, entityType = 'track', rank }) {
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
        {rank && (
          <span
            className="absolute -top-2 -left-1 font-mono font-bold text-4xl sm:text-5xl leading-none text-brand-400/20 select-none pointer-events-none"
            aria-hidden="true"
          >
            {String(rank).padStart(2, '0')}
          </span>
        )}
        <div
          className="relative flex flex-col items-center justify-center w-full h-full text-center min-h-[100px]"
          title={tooltip}
        >
          {image ? (
            <img
              src={image}
              alt={label}
              className="w-16 h-16 object-cover mb-2 rounded ring-1 ring-brand-400/30 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.6)] sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100"
            />
          ) : (
            <div className="w-16 h-16 mb-2 rounded ring-1 ring-surface-600 bg-surface-900 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.6)] flex items-center justify-center">
              <span className="font-display text-2xl text-brand-400/40">
                {(value || label || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center justify-center flex-1 space-y-0.5 w-full">
            {label && (
              <span className="text-surface-400 text-xs leading-tight truncate w-full text-center">
                {label}
              </span>
            )}
            <span className="font-bold text-sm text-white leading-tight text-center truncate w-full">
              {value}
            </span>
            {sub && (
              <span className="text-surface-500 text-xs leading-tight truncate w-full text-center">
                {sub}
              </span>
            )}
            {album && (
              <span className="text-surface-400 text-xs leading-tight truncate w-full text-center">
                {album}
              </span>
            )}
          </div>
        </div>
      </BaseTile>
    </ContextMenu>
  );
}
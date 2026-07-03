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
        {/* Full-bleed cover image or initial-letter placeholder */}
        {image ? (
          <img
            src={image}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover sepia-[.45] saturate-[.7] contrast-[1.05] scale-100 transition-[filter,transform] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-900 flex items-center justify-center">
            <span className="font-display text-5xl text-brand-400/30">
              {(value || label || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Scrim so overlaid text stays legible over any photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950/95 via-surface-950/35 to-transparent" />

        {rank && (
          <span
            className="absolute -top-1 -left-1 font-mono font-bold text-4xl sm:text-5xl leading-none text-surface-100/30 select-none pointer-events-none [text-shadow:0_2px_6px_rgba(0,0,0,0.8)]"
            aria-hidden="true"
          >
            {String(rank).padStart(2, '0')}
          </span>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center text-center space-y-0.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          title={tooltip}
        >
          {label && (
            <span className="text-surface-300 text-xs leading-tight truncate w-full">
              {label}
            </span>
          )}
          <span className="font-bold text-sm text-white leading-tight truncate w-full">
            {value}
          </span>
          {sub && (
            <span className="text-surface-300 text-xs leading-tight truncate w-full">
              {sub}
            </span>
          )}
          {album && (
            <span className="text-surface-300 text-xs leading-tight truncate w-full">
              {album}
            </span>
          )}
        </div>
      </BaseTile>
    </ContextMenu>
  );
}
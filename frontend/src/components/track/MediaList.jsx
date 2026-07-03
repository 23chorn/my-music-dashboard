export default function MediaList({ title, items, itemType }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">
        {items.length === 1 ? title.slice(0, -1) : title}
      </h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center space-x-4">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-16 h-16 rounded object-cover ring-1 ring-brand-400/30 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.6)] sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100"
              />
            ) : (
              <div className="w-16 h-16 rounded ring-1 ring-surface-600 bg-surface-900 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.6)] flex items-center justify-center shrink-0">
                <span className="font-display text-2xl text-brand-400/40">
                  {(item.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <a 
                href={`/${itemType}/${item.id}`}
                className="text-white hover:text-success-400 transition-colors text-lg font-medium block"
              >
                {item.name}
              </a>
              {item.release_date && (
                <div className="text-sm text-surface-400">
                  {new Date(item.release_date).getFullYear()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
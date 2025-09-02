export default function MediaList({ title, items, itemType }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {items.length === 1 ? title.slice(0, -1) : title}
      </h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-4">
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <a 
                href={`/${itemType}/${item.id}`}
                className="text-white hover:text-green-400 transition-colors text-lg font-medium block"
              >
                {item.name}
              </a>
              {item.release_date && (
                <div className="text-sm text-gray-400">
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
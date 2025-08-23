export default function TilesSection({ tiles, title = "Tiles" }) {
  if (!tiles || tiles.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-blue-400">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {tiles.map((tile, idx) => (
          <div key={idx} className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
            <span className="text-gray-400 text-sm mb-1">{tile.label}</span>
            <span className="font-bold text-lg text-blue-300">{tile.value}</span>
            {tile.sub && (
              <span className="text-gray-400 text-xs">{tile.sub}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
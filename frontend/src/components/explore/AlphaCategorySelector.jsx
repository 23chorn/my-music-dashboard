export default function AlphaCategorySelector({ categories, selectedCategory, onCategoryChange, categoryLabel }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {categories.map(letter => (
          <button
            key={letter}
            onClick={() => onCategoryChange(letter)}
            className={`px-2.5 py-1 rounded-sm font-mono text-xs border transition-colors
              ${selectedCategory === letter
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-surface-800 text-surface-300 border-surface-700 hover:bg-surface-700 hover:text-surface-100"}
            `}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="font-display text-[10px] uppercase tracking-widest text-surface-500">
        Category — {categoryLabel}
      </div>
    </div>
  );
}

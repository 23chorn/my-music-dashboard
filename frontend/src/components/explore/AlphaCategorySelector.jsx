export default function AlphaCategorySelector({ categories, selectedCategory, onCategoryChange, categoryLabel }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {categories.map(letter => (
          <button
            key={letter}
            onClick={() => onCategoryChange(letter)}
            className={`px-3 py-1 rounded font-semibold border transition
              ${selectedCategory === letter
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-surface-700 text-brand-300 border-surface-700 hover:bg-surface-800"}
            `}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="text-brand-400 font-semibold text-lg">
        Category: {categoryLabel}
      </div>
    </div>
  );
}
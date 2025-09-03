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
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 text-blue-300 border-gray-700 hover:bg-gray-800"}
            `}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="text-blue-400 font-semibold text-lg">
        Category: {categoryLabel}
      </div>
    </div>
  );
}
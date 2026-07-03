export default function DataTypeSelector({ dataTypes, selectedType, onTypeChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {dataTypes.map((type) => (
        <button
          key={type.key}
          onClick={() => onTypeChange(type.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded font-semibold border-2 transition
            ${selectedType === type.key
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-surface-700 text-brand-300 border-surface-700 hover:bg-surface-800"}
          `}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
export default function DataTypeSelector({ dataTypes, selectedType, onTypeChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {dataTypes.map((type, idx) => (
        <button
          key={type.key}
          onClick={() => onTypeChange(type.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded font-semibold border-2 transition
            ${selectedType === type.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-gray-700 text-blue-300 border-gray-700 hover:bg-gray-800"}
          `}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
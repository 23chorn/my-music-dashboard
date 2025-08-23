export default function SearchBarDropdown({ options = [], value, onChange }) {
  return (
    <select
      className="px-2 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring focus:ring-blue-400"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
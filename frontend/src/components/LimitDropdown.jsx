export default function LimitDropdown({ value, onChange, options = [5,10,15,20,25,30,40,50], label = "Limit:" }) {
  return (
    <div>
      <label className="mr-2">{label}</label>
      <select
        value={value}
        onChange={e => onChange(Math.min(50, Number(e.target.value)))}
        className="bg-gray-700 text-white p-1 rounded"
      >
        {options.map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  );
}
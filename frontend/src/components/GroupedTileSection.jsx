import CollapsibleSection from "./CollapsibleSection";
import TilesSection from "./TilesSection";

export default function GenericTopSection({
  title,
  items,
  period,
  setPeriod,
  limit,
  setLimit,
  periodOptions = [
    { value: "overall", label: "All Time" },
    { value: "7day", label: "Last 7 Days" },
    { value: "1month", label: "Last Month" },
    { value: "3month", label: "Last 3 Months" },
    { value: "6month", label: "Last 6 Months" },
    { value: "12month", label: "Last 12 Months" },
  ],
  limitOptions = [5, 10, 15, 20, 25, 30, 40, 50],
  tileMapper, // function to map each item to { label, value, sub }
}) {
  const tiles = Array.isArray(items)
    ? items.slice(0, limit).map(tileMapper)
    : [];

  return (
    <CollapsibleSection title={title}>
      <div className="mb-2 flex flex-wrap gap-4 items-center">
        <div>
          <label className="mr-2">Period:</label>
          <select
            value={period ?? "overall"}
            onChange={e => setPeriod(e.target.value)}
            className="bg-gray-700 text-white p-1 rounded"
          >
            {periodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2">Limit:</label>
          <select
            value={limit}
            onChange={e => setLimit(Math.min(50, Number(e.target.value)))}
            className="bg-gray-700 text-white p-1 rounded"
          >
            {limitOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <TilesSection tiles={tiles} title={title} />
    </CollapsibleSection>
  );
}
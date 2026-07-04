import Dropdown from "./Dropdown";

const DEFAULT_OPTIONS = [
  { value: "overall", label: "All Time" },
  { value: "7day", label: "Last 7 Days" },
  { value: "1month", label: "Last Month" },
  { value: "3month", label: "Last 3 Months" },
  { value: "6month", label: "Last 6 Months" },
  { value: "12month", label: "Last 12 Months" },
];

export default function PeriodDropdown({ value, onChange, options }) {
  return (
    <Dropdown
      value={value ?? "overall"}
      onChange={onChange}
      options={options || DEFAULT_OPTIONS}
    />
  );
}

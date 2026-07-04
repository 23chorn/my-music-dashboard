import Dropdown from "./Dropdown";

export default function LimitDropdown({ value, onChange, options = [5, 10, 15, 20, 25, 30, 40, 50], label = "Show", variant, align }) {
  const opts = options.map(n => ({ value: n, label: String(n) }));
  return (
    <Dropdown
      value={value}
      onChange={v => onChange(Math.min(50, Number(v)))}
      options={opts}
      label={label}
      variant={variant}
      align={align}
    />
  );
}

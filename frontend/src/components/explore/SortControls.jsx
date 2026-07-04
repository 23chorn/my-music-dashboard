import SegmentedControl from "../controls/SegmentedControl";

const OPTIONS = [
  { value: "plays", label: "By Plays" },
  { value: "alpha", label: "A–Z" },
];

export default function SortControls({ sortBy, onSortChange }) {
  return (
    <SegmentedControl options={OPTIONS} value={sortBy} onChange={onSortChange} />
  );
}

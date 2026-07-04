import SegmentedControl from "../controls/SegmentedControl";

export default function DataTypeSelector({ dataTypes, selectedType, onTypeChange }) {
  const options = dataTypes.map(type => ({ value: type.key, label: type.label }));
  return (
    <SegmentedControl options={options} value={selectedType} onChange={onTypeChange} />
  );
}

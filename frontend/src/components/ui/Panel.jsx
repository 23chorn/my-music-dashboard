export default function Panel({ children, className = "", rounded = "rounded", as, ...rest }) {
  const Component = as || "div";
  return (
    <Component className={`bg-surface-800 border border-surface-700 ${rounded} ${className}`} {...rest}>
      {children}
    </Component>
  );
}

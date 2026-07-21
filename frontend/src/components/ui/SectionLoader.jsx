import LoadingSpinner from "./LoadingSpinner";

export default function SectionLoader({ loading, children, className = "" }) {
  // Always render the same wrapper shape whether loading or not — if `children`
  // sits at a different depth/element type across renders (e.g. wrapped only
  // while loading), React can't reconcile it against the previous tree and
  // unmounts/remounts the whole subtree instead of just toggling classes. That
  // silently reset any open picker/sheet inside (losing an in-progress mobile
  // scroll-picker selection) every time a fetch this section triggered resolved.
  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-surface-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <LoadingSpinner size="md" />
        </div>
      )}
      <div className={loading ? "opacity-30 pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}
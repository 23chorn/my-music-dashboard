import LoadingSpinner from "./LoadingSpinner";

export default function SectionLoader({ loading, children, className = "" }) {
  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg z-10">
          <LoadingSpinner size="md" />
        </div>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  return children;
}
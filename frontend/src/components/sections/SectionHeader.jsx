import { Link } from "react-router-dom";

export default function SectionHeader({ image, title, subheader, subheaderLink, metadata }) {
  const titleInitial = typeof title === "string" && title.length > 0
    ? title.charAt(0).toUpperCase()
    : "?";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8">
      {image ? (
        <img
          src={image}
          alt={typeof title === "string" ? title : ""}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded object-cover mb-4 sm:mb-0 ring-1 ring-brand-400/30 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded mb-4 sm:mb-0 ring-1 ring-surface-600 bg-surface-900 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.6)] flex items-center justify-center">
          <span className="font-display text-3xl sm:text-4xl text-brand-400/40">
            {titleInitial}
          </span>
        </div>
      )}
      <div className="text-center sm:text-left w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{title}</h1>
        {subheader && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            {subheaderLink ? (
              <Link to={subheaderLink} className="text-base sm:text-lg text-surface-400 hover:underline">
                {subheader}
              </Link>
            ) : (
              <p className="text-base sm:text-lg text-surface-400">{subheader}</p>
            )}
            {metadata && (
              <>
                <span className="hidden sm:inline text-surface-600">•</span>
                <p className="text-sm sm:text-base text-surface-500">{metadata}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
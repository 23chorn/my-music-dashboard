import { Link } from "react-router-dom";

export default function SectionHeader({ image, title, subheader, subheaderLink, metadata, metadataLink }) {
  return (
    <div className="group flex flex-col sm:flex-row items-stretch rounded overflow-hidden mb-8 bg-surface-900">
      {/* Editorial crop: a tight detail of the image, not the whole cover.
          No placeholder when there's no image — the text below just takes the full width. */}
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="w-full h-40 sm:h-auto sm:w-48 md:w-56 shrink-0 object-cover scale-125 border-b-2 sm:border-b-0 sm:border-r-2 border-brand-400/30 sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100"
        />
      )}
      <div className="text-center sm:text-left w-full p-6 sm:p-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{title}</h1>
        {subheader && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center sm:justify-start">
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
                {metadataLink ? (
                  <Link to={metadataLink} className="text-sm sm:text-base text-surface-500 hover:underline">
                    {metadata}
                  </Link>
                ) : (
                  <p className="text-sm sm:text-base text-surface-500">{metadata}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
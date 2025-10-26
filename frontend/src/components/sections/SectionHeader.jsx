import { Link } from "react-router-dom";

export default function SectionHeader({ image, title, subheader, subheaderLink, metadata }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8">
      {image && (
        <img
          src={image}
          alt={title}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded shadow-lg object-cover mb-4 sm:mb-0" // Changed to square
        />
      )}
      <div className="text-center sm:text-left w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{title}</h1>
        {subheader && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            {subheaderLink ? (
              <Link to={subheaderLink} className="text-base sm:text-lg text-gray-400 hover:underline">
                {subheader}
              </Link>
            ) : (
              <p className="text-base sm:text-lg text-gray-400">{subheader}</p>
            )}
            {metadata && (
              <>
                <span className="hidden sm:inline text-gray-600">•</span>
                <p className="text-sm sm:text-base text-gray-500">{metadata}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
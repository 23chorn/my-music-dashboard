import { Link } from "react-router-dom";

export default function SectionHeader({ image, title, subheader, subheaderLink }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8">
      {image && (
        <img
          src={image}
          alt={title}
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full shadow-lg object-cover mb-4 sm:mb-0"
        />
      )}
      <div className="text-center sm:text-left w-full">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">{title}</h1>
        {subheader && (
          subheaderLink ? (
            <Link to={subheaderLink} className="text-base sm:text-lg text-gray-400 hover:underline">
              {subheader}
            </Link>
          ) : (
            <p className="text-base sm:text-lg text-gray-400">{subheader}</p>
          )
        )}
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";

export default function ListTile({ label, value, sub, link, album }) {
  const mainContent = (
    <span>
      <span className="font-bold text-lg text-white">{label}</span>
      {value && (
        <>
          {" — "}
          <span className="font-medium text-lg text-gray-300">{value}</span>
        </>
      )}
      {album && (
        <>
          {" • "}
          <span className="text-gray-400">{album}</span>
        </>
      )}
    </span>
  );

  const subContent = sub && (
    <span className="text-gray-500 md:text-right text-sm">{sub}</span>
  );

  const baseClasses =
    "p-3 bg-gray-800 rounded-lg border border-gray-700 flex flex-col md:flex-row md:justify-between items-start md:items-center";
  const hoverClasses = link
    ? "hover:bg-gray-700 hover:border-gray-600 transition"
    : "hover:bg-gray-750 transition";

  const classes = `${baseClasses} ${hoverClasses}`;

  return link ? (
    <Link to={link} className={classes}>
      {mainContent}
      {subContent}
    </Link>
  ) : (
    <li className={classes}>
      {mainContent}
      {subContent}
    </li>
  );
}
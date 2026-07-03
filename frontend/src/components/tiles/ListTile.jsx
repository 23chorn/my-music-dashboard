import { Link } from "react-router-dom";

export default function ListTile({ label, value, sub, link, album, rank }) {
  const mainContent = (
    <span className="flex items-baseline">
      {rank && (
        <span className="font-mono text-sm text-surface-500 w-7 shrink-0" aria-hidden="true">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <span>
        <span className="font-bold text-lg text-white">{label}</span>
        {value && (
          <>
            {" — "}
            <span className="font-medium text-lg text-surface-300">{value}</span>
          </>
        )}
        {album && (
          <>
            {" • "}
            <span className="text-surface-400">{album}</span>
          </>
        )}
      </span>
    </span>
  );

  const subContent = sub && (
    <span className="text-surface-500 md:text-right text-sm">{sub}</span>
  );

  const baseClasses =
    "relative overflow-hidden p-3 bg-surface-800 rounded border border-surface-700 flex flex-col md:flex-row md:justify-between items-start md:items-center before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-brand-400 before:transition-[width] before:duration-200";
  const hoverClasses = link
    ? "hover:bg-surface-700 hover:border-surface-600 hover:before:w-1 transition"
    : "hover:bg-surface-750 hover:before:w-1 transition";

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
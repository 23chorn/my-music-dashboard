import { Link } from "react-router-dom";

export default function ListTile({ label, value, sub, link, album, rank, image }) {
  const thumbnail = image ? (
    <img
      src={image}
      alt={label}
      className="w-12 h-12 shrink-0 object-cover rounded ring-1 ring-brand-400/30 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.6)] sepia-[.45] saturate-[.7] contrast-[1.05] transition-[filter,transform] duration-300 group-hover:sepia-0 group-hover:saturate-100 group-hover:contrast-100 group-hover:scale-105"
    />
  ) : null;

  const mainContent = (
    <span className="flex items-center gap-3 min-w-0">
      {thumbnail}
      <span className="flex items-baseline min-w-0">
        {rank && (
          <span
            className="font-mono text-sm text-surface-500 w-7 shrink-0 origin-left transition-[color,transform] duration-200 group-hover:text-brand-400 group-hover:scale-110"
            aria-hidden="true"
          >
            {String(rank).padStart(2, '0')}
          </span>
        )}
        <span className="truncate">
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
    </span>
  );

  const subContent = sub && (
    <span className="text-surface-500 md:text-right text-sm shrink-0">{sub}</span>
  );

  // Signature hover: the rank digit (this is a tracklist, after all) inks in
  // brand-orange and steps forward, and a dotted ledger-rule draws in under
  // the entry — echoes the dotted underline used on inline dropdowns, rather
  // than a generic accent bar down the side.
  const baseClasses =
    "group relative overflow-hidden p-3 pb-4 bg-surface-800 rounded border border-surface-700 flex flex-col md:flex-row md:justify-between items-start md:items-center transition-colors duration-200 after:content-[''] after:absolute after:left-3 after:right-3 after:bottom-1.5 after:border-b after:border-dotted after:border-brand-400/50 after:scale-x-0 after:origin-left after:transition-transform after:duration-300";
  const hoverClasses = link
    ? "hover:bg-surface-700 hover:border-surface-600 hover:after:scale-x-100"
    : "hover:bg-surface-750 hover:after:scale-x-100";

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
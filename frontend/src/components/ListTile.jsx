import { Link } from "react-router-dom";

export default function ListTile({ label, value, sub, link, album }) {
  const mainContent = (
    <span>
      <span className="font-semibold">{label}</span>
      {value && (
        <>
          {" — "}
          <span className="text-gray-300">{value}</span>
        </>
      )}
      {album && (
        <>
          {" • "}
          <span className="text-gray-200">{album}</span>
        </>
      )}
    </span>
  );

  const subContent = sub && (
    <span className="italic text-gray-400 md:text-right text-sm">{sub}</span>
  );

  const classes =
    "p-2 bg-gray-800 rounded hover:bg-gray-700 flex flex-col md:flex-row md:justify-between items-start md:items-center";

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
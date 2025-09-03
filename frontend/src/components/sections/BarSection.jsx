import { Link } from "react-router-dom";

export default function BarSection({ label, value, sub, link, album }) {
  const content = (
    <>
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
          <span className="text-blue-400">{album}</span>
        </>
      )}
      {sub && (
        <>
          {" • "}
          <span className="italic text-gray-400">{sub}</span>
        </>
      )}
    </>
  );

  return link ? (
    <Link
      to={link}
      className="p-2 bg-gray-800 rounded hover:bg-gray-700 flex flex-col md:flex-row md:justify-between"
    >
      <span>{content}</span>
    </Link>
  ) : (
    <li className="p-2 bg-gray-800 rounded hover:bg-gray-700 flex flex-col md:flex-row md:justify-between">
      <span>{content}</span>
    </li>
  );
}
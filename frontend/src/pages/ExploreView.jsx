import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllArtistsWithPlaycount } from "../data/artistApi"; 

const DATA_TYPES = [
  { key: "artist", label: "Artists" },
];

const PAGE_SIZE = 50;

export default function ExploreView() {
  const [dataType, setDataType] = useState("artist");
  const [data, setData] = useState([]);
  const [sortBy, setSortBy] = useState("plays");
  const [loading, setLoading] = useState(true);
  const [alphaCategory, setAlphaCategory] = useState("A");
  const [page, setPage] = useState(1); // <-- Move here!
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (dataType === "artist") {
        try {
          const result = await getAllArtistsWithPlaycount();
          setData(result);
        } catch {
          setData([]);
        }
        setLoading(false);
        setAlphaCategory("A");
        setPage(1);
        return;
      }
    }
    fetchData();
  }, [dataType]);

  // Alphabetical categories (A-Z, #)
  const alphaCategories = [
    ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    "#"
  ];

  let displayedData = [];
  let categoryLabel = "";

  if (sortBy === "alpha") {
    if (alphaCategory === "#") {
      displayedData = data.filter(
        a => !/^[A-Z]/i.test((a.name || "").charAt(0))
      );
      categoryLabel = "Other";
    } else {
      displayedData = data.filter(
        a => (a.name || "").toUpperCase().startsWith(alphaCategory)
      );
      categoryLabel = alphaCategory;
    }
    displayedData = displayedData.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  } else {
    const sortedData = [...data].sort((a, b) => (b.playcount || 0) - (a.playcount || 0));
    const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
    displayedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Pagination controls for playcount sort
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Explore</h1>
        <div className="mb-4 flex gap-4 items-center">
          {DATA_TYPES.map((type, idx) => (
            <button
              key={type.key}
              onClick={() => setDataType(type.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded font-semibold border-2 transition
                ${dataType === type.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-700 text-blue-300 border-gray-700 hover:bg-gray-800"}
              `}
            >
              {type.label}
            </button>
          ))}
          <label className="font-medium ml-4">Sort by:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-700 text-white p-1 rounded"
          >
            <option value="plays">Number of Plays</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <ul className="divide-y divide-gray-700">
              {displayedData.map(item => (
                <li
                  key={item.id}
                  className="py-3 px-2 flex justify-between items-center cursor-pointer hover:bg-gray-800 rounded transition"
                  onClick={() => navigate(`/artist/${item.id}`)}
                >
                  <span className="text-blue-400 font-semibold underline">
                    {item.name}
                  </span>
                  <span className="text-gray-400 text-sm">{item.playcount ?? 0} plays</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              >
                Prev
              </button>
              <span className="font-medium text-blue-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Alphabetical controls and display
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Explore</h1>
      <div className="mb-4 flex gap-4 items-center">
        {DATA_TYPES.map((type, idx) => (
          <button
            key={type.key}
            onClick={() => setDataType(type.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-semibold border-2 transition
              ${dataType === type.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 text-blue-300 border-gray-700 hover:bg-gray-800"}
            `}
          >
            {type.label}
          </button>
        ))}
        <label className="font-medium ml-4">Sort by:</label>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-gray-700 text-white p-1 rounded"
        >
          <option value="plays">Number of Plays</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {alphaCategories.map(letter => (
          <button
            key={letter}
            onClick={() => setAlphaCategory(letter)}
            className={`px-3 py-1 rounded font-semibold border transition
              ${alphaCategory === letter
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 text-blue-300 border-gray-700 hover:bg-gray-800"}
            `}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="mb-2 text-blue-400 font-semibold text-lg">
        Category: {categoryLabel}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="divide-y divide-gray-700">
          {displayedData.map(item => (
            <li
              key={item.id}
              className="py-3 px-2 flex justify-between items-center cursor-pointer hover:bg-gray-800 rounded transition"
              onClick={() => navigate(`/artist/${item.id}`)}
            >
              <span className="text-blue-400 font-semibold underline">
                {item.name}
              </span>
              <span className="text-gray-400 text-sm">{item.playcount ?? 0} plays</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
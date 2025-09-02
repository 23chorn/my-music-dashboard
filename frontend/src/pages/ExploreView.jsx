import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllArtistsWithPlaycount } from "../data/artistApi";
import { getAllAlbumsWithPlaycount } from "../data/albumApi";
import { getAllTracksWithPlaycount } from "../data/trackApi";
import GridTile from "../components/tiles/GridTile";
import PageLayout from "../components/layout/PageLayout";
import GroupedSection from "../components/GroupedSection";

const DATA_TYPES = [
  { key: "artist", label: "Artists" },
  { key: "album", label: "Albums" },
  { key: "track", label: "Tracks" },
];

const PAGE_SIZE = 50;

export default function ExploreView() {
  // Load initial state from localStorage
  const [dataType, setDataType] = useState(() => {
    return localStorage.getItem('exploreView_dataType') || "artist";
  });
  const [data, setData] = useState([]);
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem('exploreView_sortBy') || "plays";
  });
  const [loading, setLoading] = useState(true);
  const [alphaCategory, setAlphaCategory] = useState(() => {
    return localStorage.getItem('exploreView_alphaCategory') || "A";
  });
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('exploreView_page');
    return savedPage ? parseInt(savedPage) : 1;
  });
  const navigate = useNavigate();

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('exploreView_dataType', dataType);
  }, [dataType]);

  useEffect(() => {
    localStorage.setItem('exploreView_sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('exploreView_alphaCategory', alphaCategory);
  }, [alphaCategory]);

  useEffect(() => {
    localStorage.setItem('exploreView_page', page.toString());
  }, [page]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let result = [];
        if (dataType === "artist") {
          result = await getAllArtistsWithPlaycount();
        } else if (dataType === "album") {
          result = await getAllAlbumsWithPlaycount();
        } else if (dataType === "track") {
          result = await getAllTracksWithPlaycount();
        }
        setData(result);
      } catch (err) {
        console.error(`Failed to fetch ${dataType} data:`, err);
        setData([]);
      }
      setLoading(false);
      // Only reset page when changing data type, keep other filters intact
      if (sortBy === "plays") {
        setPage(1);
      }
    }
    fetchData();
  }, [dataType]);

  const alphaCategories = [
    ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    "#"
  ];

  let displayedData = [];
  let categoryLabel = "";
  let totalPages = 1;

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
    totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
    displayedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  // Prepare tiles for GroupedSection
  const tiles = displayedData.map((item, idx) => ({
    label: undefined, // Don't use label to avoid duplicate text
    value: item.name, // The main text to display
    sub: `${item.playcount ?? 0} plays`,
    image: item.image_url || undefined, // Artists and albums might have images
    link: `/${dataType}/${item.id}`,
    number: sortBy === "plays" ? (page - 1) * PAGE_SIZE + idx + 1 : undefined
  }));

  return (
    <PageLayout
      title="Explore"
      subheader="Browse all artists by playcount or alphabetically."
    >
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
      
      {sortBy === "alpha" && (
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
      )}

      {sortBy === "alpha" && (
        <div className="mb-2 text-blue-400 font-semibold text-lg">
          Category: {categoryLabel}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <GroupedSection
          title={DATA_TYPES.find(t => t.key === dataType)?.label || "Items"}
          items={tiles}
          showPeriod={false}
          showLimit={false}
          mapper={tile => tile}
          layout="grid"
          Renderer={GridTile}
        />
      )}

      {sortBy === "plays" && (
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
      )}
    </PageLayout>
  );
}
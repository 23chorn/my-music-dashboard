import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllArtistsWithPlaycount } from "../data/artistApi";
import { getAllAlbumsWithPlaycount } from "../data/albumApi";
import { getAllTracksWithPlaycount } from "../data/trackApi";
import GridTile from "../components/tiles/GridTile";
import PageLayout from "../components/layout/PageLayout";
import GroupedSection from "../components/sections/GroupedSection";
import DataTypeSelector from "../components/explore/DataTypeSelector";
import SortControls from "../components/explore/SortControls";
import PlayCountFilters from "../components/explore/PlayCountFilters";
import AlphaCategorySelector from "../components/explore/AlphaCategorySelector";
import PaginationControls from "../components/explore/PaginationControls";
import { DEFAULT_LIMITS, ALPHA_CATEGORIES } from "../config/appConfig";

const DATA_TYPES = [
  { key: "artist", label: "Artists" },
  { key: "album", label: "Albums" },
  { key: "track", label: "Tracks" },
];

const PAGE_SIZE = DEFAULT_LIMITS.explore.pageSize;

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
    return localStorage.getItem('exploreView_alphaCategory') || ALPHA_CATEGORIES.defaultCategory;
  });
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('exploreView_page');
    return savedPage ? parseInt(savedPage) : 1;
  });
  const [minPlays, setMinPlays] = useState(() => {
    const saved = localStorage.getItem('exploreView_minPlays');
    return saved && saved !== '' && saved !== 'NaN' ? parseInt(saved) : '';
  });
  const [maxPlays, setMaxPlays] = useState(() => {
    const saved = localStorage.getItem('exploreView_maxPlays');
    return saved && saved !== '' && saved !== 'NaN' ? parseInt(saved) : '';
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
    localStorage.setItem('exploreView_minPlays', minPlays === '' ? '' : minPlays.toString());
  }, [minPlays]);

  useEffect(() => {
    localStorage.setItem('exploreView_maxPlays', maxPlays === '' ? '' : maxPlays.toString());
  }, [maxPlays]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let result = [];
        const options = {
          page: page, // Use pagination for both plays and alphabetical sorting
          limit: PAGE_SIZE,
          sortBy,
          alphaCategory: sortBy === "alpha" ? alphaCategory : null,
          minPlays: minPlays !== '' ? minPlays : null,
          maxPlays: maxPlays !== '' ? maxPlays : null
        };

        if (dataType === "artist") {
          result = await getAllArtistsWithPlaycount(options);
        } else if (dataType === "album") {
          result = await getAllAlbumsWithPlaycount(options);
        } else if (dataType === "track") {
          result = await getAllTracksWithPlaycount(options);
        }
        setData(result);
      } catch (err) {
        console.error(`Failed to fetch ${dataType} data:`, err);
        setData([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [dataType, page, sortBy, alphaCategory, minPlays, maxPlays]);

  const alphaCategories = [
    ...ALPHA_CATEGORIES.letters,
    ALPHA_CATEGORIES.other
  ];

  // Server handles all filtering/sorting, so we just use data directly
  const displayedData = data;
  let categoryLabel = "";
  
  if (sortBy === "alpha" && alphaCategory) {
    categoryLabel = alphaCategory === ALPHA_CATEGORIES.other ? "Other" : alphaCategory;
  }

  // Prepare tiles for GroupedSection
  const tiles = displayedData.map((item, idx) => ({
    label: undefined, // Don't use label to avoid duplicate text
    value: item.name, // The main text to display
    sub: `${item.playcount ?? 0} plays`,
    image: item.image_url || undefined, // Artists and albums might have images
    link: `/${dataType}/${item.id}`,
    number: (page - 1) * PAGE_SIZE + idx + 1 // Show numbers for all sorting types
  }));

  return (
    <PageLayout
      title="Explore"
      subheader="Browse all artists by playcount or alphabetically."
    >
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <DataTypeSelector 
          dataTypes={DATA_TYPES}
          selectedType={dataType}
          onTypeChange={(newDataType) => {
            setDataType(newDataType);
            setPage(1); // Reset to first page when changing data type
          }}
        />
        
        <SortControls 
          sortBy={sortBy}
          onSortChange={(newSortBy) => {
            setSortBy(newSortBy);
            setPage(1); // Reset to first page when changing sort method
          }}
        />
        
        <PlayCountFilters
          minPlays={minPlays}
          maxPlays={maxPlays}
          onMinPlaysChange={(newMinPlays) => {
            setMinPlays(newMinPlays);
            setPage(1); // Reset to first page when changing filters
          }}
          onMaxPlaysChange={(newMaxPlays) => {
            setMaxPlays(newMaxPlays);
            setPage(1); // Reset to first page when changing filters
          }}
          onClearFilters={() => {
            setMinPlays('');
            setMaxPlays('');
            setPage(1); // Reset to first page when clearing filters
          }}
        />
      </div>
      
      {sortBy === "alpha" && (
        <AlphaCategorySelector 
          categories={alphaCategories}
          selectedCategory={alphaCategory}
          onCategoryChange={(newCategory) => {
            setAlphaCategory(newCategory);
            setPage(1); // Reset to first page when changing alpha category
          }}
          categoryLabel={categoryLabel}
        />
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

      <PaginationControls
        currentPage={page}
        onPageChange={setPage}
        hasNextPage={data.length >= PAGE_SIZE}
        pageSize={PAGE_SIZE}
      />
    </PageLayout>
  );
}
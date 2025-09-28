import { Routes, Route } from "react-router-dom";
import Dashboard from "../../pages/Dashboard";
import ArtistView from "../../pages/ArtistView";
import AlbumView from "../../pages/AlbumView";
import TrackView from "../../pages/TrackView";
import ExploreView from "../../pages/ExploreView";
import StatsView from "../../pages/StatsView";
import InsightsView from "../../pages/InsightsView";
import AIInsightsView from "../../pages/AIInsightsView";
import TagsPage from "../../pages/TagsPage";
import TagFilterPage from "../../pages/TagFilterPage";
import AppHeader from "./AppHeader";

export default function AppLayout({ searchProps }) {
  return (
    <div className="flex min-h-screen bg-gray-950 w-full flex-col">
      <AppHeader {...searchProps} />
      <main className="flex-1 w-full bg-gray-950">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/artist/:id" element={<ArtistView />} />
          <Route path="/album/:id" element={<AlbumView />} />
          <Route path="/track/:id" element={<TrackView />} />
          <Route path="/explore" element={<ExploreView />} />
          <Route path="/stats" element={<StatsView />} />
          <Route path="/insights" element={<InsightsView />} />
          <Route path="/ai-insights" element={<AIInsightsView />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/tags/:tagId" element={<TagFilterPage />} />
        </Routes>
      </main>
    </div>
  );
}
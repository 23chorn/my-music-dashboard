import { Routes, Route } from "react-router-dom";
import Dashboard from "../../pages/Dashboard";
import ArtistView from "../../pages/ArtistView";
import AlbumView from "../../pages/AlbumView";
import TrackView from "../../pages/TrackView";
import ExploreView from "../../pages/ExploreView";
import StatsView from "../../pages/StatsView";
import SystemDataView from "../../pages/SystemDataView";
import AIInsightsView from "../../pages/AIInsightsView";
import TagsPage from "../../pages/TagsPage";
import TagFilterPage from "../../pages/TagFilterPage";
import TriviaPage from "../../pages/TriviaPage";
import ChatView from "../../pages/ChatView";
import AppHeader from "./AppHeader";

export default function AppLayout({ searchProps }) {
  return (
    <div className="flex min-h-screen bg-surface-950 w-full flex-col">
      <AppHeader {...searchProps} />
      <main className="flex-1 w-full bg-surface-950">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/artist/:id" element={<ArtistView />} />
          <Route path="/album/:id" element={<AlbumView />} />
          <Route path="/track/:id" element={<TrackView />} />
          <Route path="/explore" element={<ExploreView />} />
          <Route path="/stats" element={<StatsView />} />
          <Route path="/insights" element={<SystemDataView />} />
          <Route path="/ai-insights" element={<AIInsightsView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/tags/:tagId" element={<TagFilterPage />} />
          <Route path="/trivia" element={<TriviaPage />} />
        </Routes>
      </main>
    </div>
  );
}
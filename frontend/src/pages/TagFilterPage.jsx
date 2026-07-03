import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import GridTile from '../components/tiles/GridTile';
import { TagIcon, MusicalNoteIcon, RectangleStackIcon, MicrophoneIcon } from '@heroicons/react/24/outline';

const ENTITY_TYPES = [
  { value: 'track', label: 'Tracks', icon: MusicalNoteIcon },
  { value: 'album', label: 'Albums', icon: RectangleStackIcon },
  { value: 'artist', label: 'Artists', icon: MicrophoneIcon },
];

export default function TagFilterPage() {
  const { tagId } = useParams();
  const [searchParams] = useSearchParams();
  const tagName = searchParams.get('name') || 'Unknown Tag';

  const [entities, setEntities] = useState([]);
  const [tagStats, setTagStats] = useState(null);
  const [selectedType, setSelectedType] = useState('track');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  const fetchTagStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/${tagId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setTagStats(data);
      }
    } catch (error) {
      console.error('Error fetching tag stats:', error);
    }
  }, [API_BASE_URL, tagId]);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tags/${tagId}/entities?entityType=${selectedType}&limit=100`
      );

      if (response.ok) {
        const data = await response.json();
        setEntities(data.entities || []);
      } else {
        setError('Failed to fetch tagged entities');
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
      setError('Failed to fetch tagged entities');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, tagId, selectedType]);

  useEffect(() => {
    if (tagId) {
      fetchTagStats();
    }
  }, [tagId, fetchTagStats]);

  useEffect(() => {
    if (tagId && selectedType) {
      fetchEntities();
    }
  }, [tagId, selectedType, fetchEntities]);

  const renderEntity = (entity) => {
    const entityData = entity.entity_data;
    if (!entityData) return null;

    switch (entity.entity_type) {
      case 'track':
        return (
          <GridTile
            key={`track-${entity.entity_id}`}
            label={entityData.artist_name}
            value={entityData.name}
            album={entityData.album_name}
            link={`/track/${entityData.id}`}
            entityId={entityData.id}
            entityType="track"
          />
        );
      case 'album':
        return (
          <GridTile
            key={`album-${entity.entity_id}`}
            label={entityData.artist_name}
            value={entityData.name}
            image={entityData.image_url}
            link={`/album/${entityData.id}`}
            entityId={entityData.id}
            entityType="album"
          />
        );
      case 'artist':
        return (
          <GridTile
            key={`artist-${entity.entity_id}`}
            value={entityData.name}
            image={entityData.image_url}
            link={`/artist/${entityData.id}`}
            entityId={entityData.id}
            entityType="artist"
          />
        );
      default:
        return null;
    }
  };

  const totalCount = tagStats?.totalCount || 0;

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <TagIcon className="w-8 h-8 text-highlight-400" />
          <span>Tag: {tagName}</span>
        </div>
      }
      subheader={
        totalCount > 0
          ? `${totalCount} items tagged with "${tagName}"`
          : 'No items found with this tag'
      }
      loading={loading && !tagStats}
      error={error}
    >
      <div className="space-y-8">
        {/* Tag Statistics */}
        {tagStats && (
          <div className="bg-surface-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Tag Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ENTITY_TYPES.map((type) => {
                const stat = tagStats.stats.find(s => s.entity_type === type.value);
                const count = stat ? parseInt(stat.count) : 0;
                return (
                  <div
                    key={type.value}
                    className={`p-5 rounded-lg border transition-all cursor-pointer hover:scale-105 ${
                      selectedType === type.value
                        ? 'bg-brand-600/20 border-brand-400/50 ring-2 ring-brand-400/30'
                        : 'bg-surface-800 border-surface-600 hover:border-surface-500'
                    }`}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <type.icon className="w-5 h-5 text-surface-400" />
                      <span className={`font-medium ${
                        selectedType === type.value ? 'text-brand-300' : 'text-white'
                      }`}>{type.label}</span>
                    </div>
                    <div className={`text-3xl font-bold ${
                      selectedType === type.value ? 'text-brand-400' : 'text-surface-300'
                    }`}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Entity Type Selector */}
        <div className="bg-surface-900 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6">
            <h2 className="text-xl font-semibold text-white">View Tagged Items</h2>
            <div className="flex flex-wrap gap-3">
              {ENTITY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 sm:px-6 py-3 text-sm font-medium transition-all whitespace-nowrap rounded-xl shadow-lg ${
                    selectedType === type.value
                      ? 'bg-brand-500 text-white shadow-brand-500/25 transform scale-105'
                      : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600 hover:shadow-xl'
                  }`}
                >
                  <type.icon className="inline-block w-4 h-4 mr-2 -mt-0.5" />
                  {type.label}
                  {tagStats && (
                    <span className={`ml-2 text-xs ${
                      selectedType === type.value ? 'opacity-90' : 'opacity-75'
                    }`}>
                      ({tagStats.stats.find(s => s.entity_type === type.value)?.count || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entities Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-surface-800 rounded-lg p-4">
                    <div className="h-4 bg-surface-700 rounded mb-2"></div>
                    <div className="h-3 bg-surface-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : entities.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {entities.map(renderEntity)}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-surface-500 mb-2 flex justify-center">
                {(() => {
                  const EmptyIcon = ENTITY_TYPES.find(t => t.value === selectedType)?.icon;
                  return EmptyIcon ? <EmptyIcon className="w-10 h-10" /> : null;
                })()}
              </div>
              <h3 className="text-lg font-medium text-surface-400 mb-2">
                No {selectedType}s found
              </h3>
              <p className="text-surface-500">
                No {selectedType}s are tagged with "{tagName}"
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { TagIcon, PlusIcon } from '@heroicons/react/24/outline';

const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      } else {
        setError('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setError('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: selectedColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags(prev => [...prev, data.tag]);
        setNewTagName('');
        setSelectedColor(TAG_COLORS[0]);
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        console.error('Error creating tag:', errorData.error);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteTag = async (tagId) => {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all entities.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTags(prev => prev.filter(tag => tag.id !== tagId));
      } else {
        const errorData = await response.json();
        console.error('Error deleting tag:', errorData.error);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-3">
          <TagIcon className="w-8 h-8 text-purple-400" />
          <span>Tags Management</span>
        </div>
      }
      subheader={`${tags.length} tags total`}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Create New Tag */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Create New Tag</h2>

          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Tag
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-800 rounded-lg">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 min-w-48 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />

              {/* Color Picker */}
              <div className="flex gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      selectedColor === color ? 'border-white' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Select ${color}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createTag}
                  disabled={creating || !newTagName.trim()}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                    setSelectedColor(TAG_COLORS[0]);
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Tags */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">All Tags</h2>

          {tags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      to={`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-white font-medium">{tag.name}</span>
                    </Link>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete tag"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-sm text-gray-400">
                    Created: {new Date(tag.created_at).toLocaleDateString()}
                  </div>

                  <Link
                    to={`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`}
                    className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View tagged items →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No tags yet</h3>
              <p className="text-gray-500">Create your first tag to get started</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
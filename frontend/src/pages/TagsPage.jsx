import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { TagIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon, TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const TAG_COLORS = [
  '#64748B', // Slate
  '#6B7280', // Gray
  '#78716C', // Stone
  '#DC2626', // Muted Red
  '#EA580C', // Muted Orange
  '#CA8A04', // Muted Yellow
  '#16A34A', // Muted Green
  '#0891B2', // Muted Cyan
  '#2563EB', // Muted Blue
  '#7C3AED', // Muted Purple
  '#BE185D', // Muted Pink
  '#A21CAF', // Muted Magenta
];

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editingColor, setEditingColor] = useState('');
  const [updating, setUpdating] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  const fetchTags = useCallback(async () => {
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
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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

  const startEditingTag = (tag) => {
    setEditingTag(tag.id);
    setEditingColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setEditingColor('');
  };

  const updateTag = async (tagId) => {
    setUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/${tagId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          color: editingColor,
        }),
      });

      if (response.ok) {
        setTags(prev => prev.map(tag =>
          tag.id === tagId ? { ...tag, color: editingColor } : tag
        ));
        setEditingTag(null);
        setEditingColor('');
      } else {
        const errorData = await response.json();
        console.error('Error updating tag:', errorData.error);
      }
    } catch (error) {
      console.error('Error updating tag:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PageLayout
      title="Tags Management"
      subheader={`${tags.length} tags total`}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Create New Tag */}
        <div className="bg-surface-900 rounded-lg p-6">
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400 mb-4">Create New Tag</h2>

          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-300 hover:text-white bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create Tag
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-800 border border-surface-700 rounded">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 min-w-48 px-3 py-2 text-sm bg-surface-700 border border-surface-600 rounded text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-400"
                onKeyDown={(e) => e.key === 'Enter' && createTag()}
              />

              {/* Color Picker */}
              <div className="flex gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full transition-shadow ${
                      selectedColor === color ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-surface-800' : ''
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
                  className="px-3 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                    setSelectedColor(TAG_COLORS[0]);
                  }}
                  className="px-3 py-2 text-sm font-medium text-surface-300 hover:text-white bg-surface-700 hover:bg-surface-600 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Tags */}
        <div className="bg-surface-900 rounded-lg p-6">
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400 mb-4">All Tags</h2>

          {tags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-surface-800 border border-surface-700 rounded-lg p-4 hover:border-surface-600 transition-colors"
                >
                  {editingTag === tag.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: editingColor }}
                        />
                        <span className="text-surface-100 font-medium">{tag.name}</span>
                      </div>

                      {/* Color Picker */}
                      <div className="flex flex-wrap gap-2">
                        {TAG_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditingColor(color)}
                            className={`w-6 h-6 rounded-full transition-shadow ${
                              editingColor === color ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-surface-800' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            title={`Select ${color}`}
                          />
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateTag(tag.id)}
                          disabled={updating}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-success-600 hover:bg-success-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          <CheckIcon className="w-3 h-3" />
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-surface-600 hover:bg-surface-500 text-white rounded transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Normal mode
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <Link
                          to={`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-surface-100 font-medium">{tag.name}</span>
                        </Link>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditingTag(tag)}
                            className="text-surface-400 hover:text-brand-400 transition-colors"
                            title="Edit color"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTag(tag.id)}
                            className="text-surface-400 hover:text-danger-400 transition-colors"
                            title="Delete tag"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-surface-500">
                        Created {new Date(tag.created_at).toLocaleDateString()}
                      </div>

                      <Link
                        to={`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        View tagged items
                        <ArrowRightIcon className="w-3 h-3" />
                      </Link>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <TagIcon className="w-12 h-12 text-surface-700 mx-auto mb-4" />
              <h3 className="font-display text-lg text-surface-300 mb-2">No tags yet</h3>
              <p className="text-surface-500">Create your first tag to get started</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
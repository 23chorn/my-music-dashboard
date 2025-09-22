import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

export default function TagManager({ entityId, entityType, entityName, onTagsChange }) {
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    if (entityId && entityType) {
      fetchEntityTags();
      fetchAllTags();
    }
  }, [entityId, entityType]);

  const fetchEntityTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/entity/${entityType}/${entityId}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
        if (onTagsChange) {
          onTagsChange(data.tags || []);
        }
      }
    } catch (error) {
      console.error('Error fetching entity tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching all tags:', error);
    }
  };

  const addTag = async () => {
    if (!newTagName.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/entity/${entityType}/${entityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: newTagName.trim(),
          color: selectedColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.wasCreated) {
          // Add the new tag to our local state
          const newTag = data.tag;
          setTags(prev => [...prev, { ...newTag, tagged_at: new Date().toISOString() }]);

          // Update all tags if this was a new tag
          if (!allTags.find(tag => tag.id === newTag.id)) {
            setAllTags(prev => [...prev, newTag]);
          }

          if (onTagsChange) {
            onTagsChange([...tags, { ...newTag, tagged_at: new Date().toISOString() }]);
          }
        }

        // Reset form
        setNewTagName('');
        setSelectedColor(TAG_COLORS[0]);
        setShowAddForm(false);
      } else {
        const errorData = await response.json();
        console.error('Error adding tag:', errorData.error);
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setAdding(false);
    }
  };

  const removeTag = async (tagId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/entity/${entityType}/${entityId}/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.wasRemoved) {
          // Remove tag from local state
          const updatedTags = tags.filter(tag => tag.id !== tagId);
          setTags(updatedTags);

          if (onTagsChange) {
            onTagsChange(updatedTags);
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Error removing tag:', errorData.error);
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const addExistingTag = async (existingTag) => {
    setAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/entity/${entityType}/${entityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: existingTag.name,
          color: existingTag.color,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.wasCreated) {
          const newTag = data.tag;
          setTags(prev => [...prev, { ...newTag, tagged_at: new Date().toISOString() }]);

          if (onTagsChange) {
            onTagsChange([...tags, { ...newTag, tagged_at: new Date().toISOString() }]);
          }
        }
      }
    } catch (error) {
      console.error('Error adding existing tag:', error);
    } finally {
      setAdding(false);
    }
  };

  // Get available tags that aren't already applied
  const availableTags = allTags.filter(tag =>
    !tags.some(entityTag => entityTag.id === tag.id)
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-700 rounded w-16"></div>
          <div className="h-6 bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Tags */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Tags {entityName && `for "${entityName}"`}
        </h4>
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center justify-between px-2 py-1 rounded-full text-sm font-medium text-white min-w-0 opacity-100 hover:opacity-75 transition-opacity"
                style={{ backgroundColor: tag.color }}
              >
                <Link
                  to={`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`}
                  className="flex-1 truncate pr-1 transition-all"
                  style={{ color: 'white' }}
                  title={`View all items tagged with "${tag.name}"`}
                >
                  {tag.name}
                </Link>
                <button
                  onClick={() => removeTag(tag.id)}
                  className="flex-shrink-0 text-white hover:opacity-75 transition-opacity border-0 outline-0"
                  style={{ backgroundColor: tag.color, padding: '1px' }}
                  title="Remove tag"
                >
                  <XMarkIcon className="w-3 h-3 stroke-[3]" />
                </button>
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-500 italic">No tags</span>
          )}
        </div>
      </div>

      {/* Quick Add Existing Tags */}
      {availableTags.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-400 mb-1">Quick Add:</h5>
          <div className="flex flex-wrap gap-1">
            {availableTags.slice(0, 5).map((tag) => (
              <button
                key={tag.id}
                onClick={() => addExistingTag(tag)}
                disabled={adding}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white opacity-100 hover:opacity-75 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: tag.color }}
                title={`Add "${tag.name}" tag`}
              >
                <PlusIcon className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add New Tag */}
      <div>
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            Add Tag
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-800 rounded-lg">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="flex-1 min-w-0 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />

            {/* Color Picker */}
            <div className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedColor === color ? 'border-white' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>

            <div className="flex gap-1">
              <button
                onClick={addTag}
                disabled={adding || !newTagName.trim()}
                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTagName('');
                  setSelectedColor(TAG_COLORS[0]);
                }}
                className="px-2 py-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
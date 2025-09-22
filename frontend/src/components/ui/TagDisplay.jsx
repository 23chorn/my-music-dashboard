import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TagDisplay({ entityId, entityType, showCount = false, clickable = true }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    if (entityId && entityType) {
      fetchEntityTags();
    }
  }, [entityId, entityType]);

  const fetchEntityTags = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags/entity/${entityType}/${entityId}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching entity tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    if (clickable) {
      // Navigate to tag filtering page
      navigate(`/tags/${tag.id}?name=${encodeURIComponent(tag.name)}`);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse flex gap-1">
        <div className="h-5 bg-gray-700 rounded w-12"></div>
        <div className="h-5 bg-gray-700 rounded w-16"></div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          onClick={() => handleTagClick(tag)}
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
            clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          style={{ backgroundColor: tag.color }}
          title={clickable ? `View all ${entityType}s with "${tag.name}" tag` : tag.name}
        >
          {tag.name}
          {showCount && tag.count && (
            <span className="ml-1 opacity-75">({tag.count})</span>
          )}
        </span>
      ))}
    </div>
  );
}
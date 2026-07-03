import { useEffect } from 'react';
import { MusicalNoteIcon, UserIcon, RectangleStackIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TYPE_ICONS = {
  track: MusicalNoteIcon,
  artist: UserIcon,
  album: RectangleStackIcon,
};

export default function StatPopup({ isOpen, onClose, title, type, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const TypeIcon = TYPE_ICONS[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-surface-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {TypeIcon && <TypeIcon className="w-5 h-5 text-brand-400" />}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
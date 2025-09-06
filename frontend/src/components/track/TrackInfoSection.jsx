import MediaList from "./MediaList";
import TrackDetails from "./TrackDetails";

export default function TrackInfoSection({ track }) {
  if (!track) return null;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-blue-400 mb-6">Track Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Artists Section */}
        <MediaList 
          title="Artists" 
          items={track.artists} 
          itemType="artist" 
        />

        {/* Albums Section */}
        <MediaList 
          title="Albums" 
          items={track.albums} 
          itemType="album" 
        />

        {/* Track Details */}
        <TrackDetails track={track} />
      </div>
    </div>
  );
}
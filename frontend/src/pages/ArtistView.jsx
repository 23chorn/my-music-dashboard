import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays
} from "../data/artistApi";

export default function ArtistView() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [artistData, tracks, albums, plays] = await Promise.all([
          getArtistInfo(id),
          getArtistTopTracks(id),
          getArtistTopAlbums(id),
          getArtistRecentPlays(id)
        ]);
        setArtist(artistData);
        setTopTracks(tracks);
        setTopAlbums(albums);
        setRecentPlays(plays);
      } catch {
        setArtist(null);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!artist) return <div className="p-4">Artist not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        {artist.image_url && (
          <img src={artist.image_url} alt={artist.name} className="w-24 h-24 rounded" />
        )}
        <h1 className="text-3xl font-bold">{artist.name}</h1>
      </div>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Top Tracks</h2>
        <ul>
          {topTracks.map(track => (
            <li key={track.id} className="mb-1">
              {track.name} <span className="text-gray-500">({track.playcount} plays)</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Top Albums</h2>
        <ul>
          {topAlbums.map(album => (
            <li key={album.id} className="mb-1">
              {album.name} <span className="text-gray-500">({album.playcount} plays)</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Recent Plays</h2>
        <ul>
          {recentPlays.map((play, idx) => (
            <li key={idx} className="mb-1">
              {play.track} {play.album && <>– <span className="text-gray-400">{play.album}</span></>} <span className="text-gray-500">({new Date(play.timestamp * 1000).toLocaleString()})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
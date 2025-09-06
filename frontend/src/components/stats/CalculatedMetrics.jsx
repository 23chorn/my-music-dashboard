import StatCard from "./StatCard";

export default function CalculatedMetrics({ calculatedMetrics }) {
  const {
    tracksPerArtist = 0,
    playsPerArtist = 0,
    tracksPerAlbum = 0,
    hoursPerDay = 0,
    minutesPerPlay = 0,
    libraryCoverage = 0
  } = calculatedMetrics;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🧮 Calculated Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Tracks per Artist" 
          value={tracksPerArtist} 
          subtitle="average"
          color="text-pink-400"
        />
        <StatCard 
          title="Plays per Artist" 
          value={playsPerArtist} 
          subtitle="average"
          color="text-pink-400"
        />
        <StatCard 
          title="Tracks per Album" 
          value={tracksPerAlbum} 
          subtitle="average"
          color="text-teal-400"
        />
        <StatCard 
          title="Hours per Day" 
          value={hoursPerDay} 
          subtitle="if spread evenly"
          color="text-amber-400"
        />
        <StatCard 
          title="Minutes per Play" 
          value={minutesPerPlay} 
          subtitle="average duration"
          color="text-lime-400"
        />
        <StatCard 
          title="Library Coverage" 
          value={`${libraryCoverage}%`} 
          subtitle="plays vs unique tracks"
          color="text-violet-400"
        />
      </div>
    </div>
  );
}
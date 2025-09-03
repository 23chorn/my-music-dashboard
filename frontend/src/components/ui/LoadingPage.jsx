import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

const MUSIC_MESSAGES = [
  "🎤 Spitting bars from your playlist...",
  "🔥 Dropping beats like it's hot...",
  "💿 Spinning tracks, no cap...",
  "🎧 DJ'ing your top bangers...",
  "📱 Flexing your music stats...",
  "💎 Diamonds in your data, we mining...",
  "🎵 Cooking up your musical recipe...",
  "🏆 Your playlist going platinum...",
  "🎪 About to drop the illest dashboard...",
  "🚀 Your vibes launching to the moon...",
  "🔊 Bass dropping, data loading...",
  "💯 Keeping it 100 with your tracks...",
  "🎶 Orchestrating a symphony for your soul...",
  "🎻 Conducting your musical masterpiece...",
  "🎹 Composing bars from your history..."
];

export default function LoadingPage({ message = null, showMusicMessages = true }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState("opacity-100");

  useEffect(() => {
    if (!showMusicMessages) return;

    const interval = setInterval(() => {
      setFadeClass("opacity-0");
      
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % MUSIC_MESSAGES.length);
        setFadeClass("opacity-100");
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, [showMusicMessages]);

  const displayMessage = showMusicMessages 
    ? MUSIC_MESSAGES[messageIndex]
    : (message || "Loading your music data...");

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center space-y-6 z-50">
      <div className="flex flex-col items-center space-y-6">
        <LoadingSpinner size="xl" className="scale-150" />
        <div 
          className={`text-xl text-gray-300 font-medium text-center transition-opacity duration-300 ${fadeClass} px-4`}
        >
          {displayMessage}
        </div>
      </div>
    </div>
  );
}
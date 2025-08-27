import LoadingSpinner from "./LoadingSpinner";

export default function LoadingPage({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
      <LoadingSpinner size="xl" />
      <div className="text-lg text-gray-400 font-medium">{message}</div>
    </div>
  );
}
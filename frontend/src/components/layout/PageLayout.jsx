import SectionHeader from "../sections/SectionHeader";
import LoadingPage from "../ui/LoadingPage";

export default function PageLayout({
  loading,
  error,
  title,
  image,
  subheader,
  subheaderLink,
  metadata,
  metadataLink,
  children
}) {
  if (loading) {
    return <LoadingPage message="Loading your music data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-surface-950 px-4">
        <div className="text-lg text-danger-400 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-surface-950">
      <div className="w-full px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-10">
          {(title || image) && (
            <SectionHeader
              image={image}
              title={title}
              subheader={subheader}
              subheaderLink={subheaderLink}
              metadata={metadata}
              metadataLink={metadataLink}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
import SectionHeader from "../SectionHeader";
import LoadingPage from "../ui/LoadingPage";

export default function PageLayout({ 
  loading, 
  error, 
  title, 
  image, 
  subheader, 
  subheaderLink,
  children 
}) {
  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <LoadingPage message="Loading your music data..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-lg text-red-400">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {(title || image) && (
          <SectionHeader 
            image={image}
            title={title}
            subheader={subheader}
            subheaderLink={subheaderLink}
          />
        )}
        {children}
      </div>
    </div>
  );
}
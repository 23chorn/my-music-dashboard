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
      <div className="space-y-10 w-full px-4 sm:px-6 lg:px-8">
        <LoadingPage message="Loading your music data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64 px-4">
        <div className="text-lg text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full px-4 sm:px-6 lg:px-8">
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
  );
}
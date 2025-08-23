export default function SectionHeader({ image, title, subheader }) {
  return (
    <div className="flex items-center gap-6 mb-8">
      {image && (
        <img src={image} alt={title} className="w-28 h-28 rounded shadow-lg object-cover" />
      )}
      <div>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        {subheader && (
          <p className="text-lg text-gray-400">{subheader}</p>
        )}
      </div>
    </div>
  );
}
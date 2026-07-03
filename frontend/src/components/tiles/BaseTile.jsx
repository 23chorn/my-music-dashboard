import { Link } from "react-router-dom";

export default function BaseTile({ 
  children, 
  link, 
  className = "",
  hoverEffect = true 
}) {
  const baseClasses = "group relative overflow-hidden bg-surface-800 rounded p-3 flex items-center justify-center text-center transition border border-surface-700 before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-brand-400 before:transition-[width] before:duration-200";

  const hoverClasses = hoverEffect
    ? (link ? "hover:bg-surface-700 hover:border-surface-600 hover:before:w-1" : "hover:bg-surface-750 hover:before:w-1")
    : "";
    
  const classes = `${baseClasses} ${hoverClasses} ${className}`;

  if (link && link.startsWith("/")) {
    return (
      <Link to={link} className={classes}>
        {children}
      </Link>
    );
  } else if (link) {
    return (
      <a
        href={link}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  } else {
    return (
      <div className={classes}>
        {children}
      </div>
    );
  }
}
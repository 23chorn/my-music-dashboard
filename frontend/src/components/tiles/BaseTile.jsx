import { Link } from "react-router-dom";

export default function BaseTile({ 
  children, 
  link, 
  className = "",
  hoverEffect = true 
}) {
  const baseClasses = "group relative overflow-hidden bg-surface-800 rounded aspect-square block transition border border-surface-700";

  const hoverClasses = hoverEffect ? "hover:border-brand-400/60" : "";
    
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
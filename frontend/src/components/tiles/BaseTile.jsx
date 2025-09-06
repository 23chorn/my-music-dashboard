import { Link } from "react-router-dom";

export default function BaseTile({ 
  children, 
  link, 
  className = "",
  hoverEffect = true 
}) {
  const baseClasses = "bg-gray-800 rounded-lg p-3 flex items-center justify-center text-center transition border border-gray-700";
  
  const hoverClasses = hoverEffect 
    ? (link ? "hover:bg-gray-700 hover:border-gray-600" : "hover:bg-gray-750")
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
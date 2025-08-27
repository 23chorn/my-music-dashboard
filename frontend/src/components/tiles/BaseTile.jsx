import { Link } from "react-router-dom";

export default function BaseTile({ 
  children, 
  link, 
  className = "",
  hoverEffect = true 
}) {
  const baseClasses = "bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center text-center transition";
  
  const hoverClasses = hoverEffect 
    ? (link ? "hover:bg-blue-900" : "hover:bg-gray-700")
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
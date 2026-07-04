import { NavLink } from "react-router-dom";

const NAV_GROUPS = [
  [
    { label: "Dashboard", path: "/", end: true },
    { label: "Explore", path: "/explore" },
    { label: "Stats", path: "/stats" }
  ],
  [
    { label: "AI Insights", path: "/ai-insights" },
    { label: "AI Chat", path: "/chat" },
    { label: "Insights", path: "/insights" }
  ],
  [
    { label: "Tags", path: "/tags" },
    { label: "Trivia", path: "/trivia" }
  ]
];

export default function NavTabs() {
  return (
    <nav className="hidden lg:flex items-center">
      {NAV_GROUPS.map((group, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && <span className="mx-3 h-5 w-px bg-surface-700" aria-hidden="true" />}
          {group.map(({ label, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-brand-400 text-white"
                    : "border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

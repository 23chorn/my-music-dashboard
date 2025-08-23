import { FaBars } from "react-icons/fa";

export default function SidePanel({ children, collapsed, setCollapsed }) {
  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300
        ${collapsed ? "w-16" : "w-48"}
        h-screen fixed top-0 left-0 z-20 flex flex-col`}
    >
      <button
        className="p-2 focus:outline-none absolute top-2 right-2"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle menu"
      >
        <FaBars />
      </button>
      <div className={`${collapsed ? "hidden" : ""} mt-10`}>
        <h1 className="text-xl font-bold mb-8 px-4 py-2 text-gray-200 bg-gray-800 rounded">
          My Music Stats
        </h1>
        {children}
      </div>
    </aside>
  );
}
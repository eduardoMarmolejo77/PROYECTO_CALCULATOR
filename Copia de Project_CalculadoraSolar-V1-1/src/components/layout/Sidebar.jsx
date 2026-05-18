import { NavLink } from 'react-router-dom';
import { modules } from '../../modules';
import './layout.css';

/**
 * Sidebar dinámico — genera links a partir de modules/index.js.
 * Si un módulo se quita, su link desaparece automáticamente.
 */
export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">🚀</span>
        {!collapsed && <span className="sidebar__brand-text">Propuestas</span>}
      </div>

      <nav className="sidebar__nav">
        {modules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            title={mod.name}
          >
            <span className="sidebar__link-icon">{mod.icon}</span>
            {!collapsed && <span className="sidebar__link-text">{mod.name}</span>}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar__toggle" onClick={onToggle} title="Toggle sidebar">
        {collapsed ? '▶' : '◀'}
      </button>
    </aside>
  );
}

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import './layout.css';

/**
 * Layout principal del dashboard: sidebar + navbar + content area.
 */
export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`dashboard ${sidebarCollapsed ? 'dashboard--collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />
      <div className="dashboard__main">
        <Navbar />
        <main className="dashboard__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

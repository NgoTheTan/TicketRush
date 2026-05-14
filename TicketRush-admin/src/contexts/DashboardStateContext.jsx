// src/contexts/DashboardStateContext.jsx
// Persists dashboard state (selectedEventId, searchInput) across page navigation
import { createContext, useContext, useState, useRef } from 'react';

const DashboardStateContext = createContext(null);

export function DashboardStateProvider({ children }) {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [searchInput, setSearchInput]         = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Store dashboard data so it doesn't re-fetch on every visit
  const dashboardRef = useRef(null);

  return (
    <DashboardStateContext.Provider value={{
      selectedEventId, setSelectedEventId,
      searchInput, setSearchInput,
      sidebarCollapsed, setSidebarCollapsed,
      dashboardRef,
    }}>
      {children}
    </DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  return useContext(DashboardStateContext);
}

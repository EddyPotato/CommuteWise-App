// src/layouts/CommuterLayout.jsx
// Version: Production 1.0

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Map, Search, User } from 'lucide-react';

export default function CommuterLayout() {
  const navClass = ({ isActive }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    color: isActive ? '#10b981' : '#94a3b8', // Green when active
    textDecoration: 'none',
    fontSize: '0.75rem',
    fontWeight: isActive ? '600' : '500',
    transition: 'color 0.2s'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#f8fafc' }}>
      
      {/* MAIN CONTENT (Map/Search) */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </div>

      {/* BOTTOM NAVIGATION BAR (Mobile Style) */}
      <nav style={{ 
          height: '65px', 
          backgroundColor: 'white', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
          zIndex: 1000
      }}>
        <NavLink to="/" end style={navClass}>
          <Search size={24} style={{ marginBottom: '4px' }} />
          Explore
        </NavLink>
        
        <NavLink to="/commuter/routes" style={navClass}>
          <Map size={24} style={{ marginBottom: '4px' }} />
          Routes
        </NavLink>

        {/* Optional: Profile or Settings */}
        <NavLink to="/login" style={navClass}>
           <User size={24} style={{ marginBottom: '4px' }} />
           Admin
        </NavLink>
      </nav>
    </div>
  );
}
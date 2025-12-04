// src/layouts/AdminLayout.jsx
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, Navigation, LogOut, MessageSquare } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  // Helper for consistent link styling
  const navStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    color: isActive ? '#fff' : '#cbd5e1',
    background: isActive ? '#0fa958' : 'transparent', // Active Green
    textDecoration: 'none',
    borderRadius: '8px',
    margin: '5px 10px',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s'
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f1f5f9' }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{ width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column' }}>
        
        {/* Brand Header */}
        <div style={{ padding: '25px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, color: '#0fa958', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={28} /> CommuteWise
          </h2>
          <small style={{ color: '#94a3b8' }}>Admin Panel v1.0</small>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '20px 0' }}>
          <NavLink to="/" style={navStyle}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          
          <NavLink to="/routes" style={navStyle}>
            <Map size={20} /> Route Manager
          </NavLink>

          <NavLink to="/feedbacks" style={navStyle}>
            <MessageSquare size={20} /> Feedbacks
          </NavLink>
        </nav>

        {/* Footer / Logout */}
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button 
            onClick={() => alert("Logout logic here")}
            style={{ 
              display: 'flex', gap: '10px', background: 'transparent', border: 'none', 
              color: '#ef4444', cursor: 'pointer', fontSize: '1rem' 
            }}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA (Dynamic) --- */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {/* <Outlet /> renders the specific page (Dashboard or Routes) */}
        <Outlet />
      </div>

    </div>
  );
}
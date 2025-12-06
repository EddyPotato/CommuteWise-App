// CommuteWise - AdminLayout.jsx
// Version: Production 1.2 (Route Updates)

import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map, MessageSquare, Shield, LogOut, Navigation, BarChart3 } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Admin Panel | CommuteWise";
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = '/vite.svg'; // Or your admin logo
  }, []);

  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        navigate('/admin-login'); // FIXED: New Login URL
    } catch (error) {
        console.error("Logout failed:", error);
        navigate('/admin-login');
    }
  };

  const navClass = ({ isActive }) => ({
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
    transition: 'all 0.2s',
    fontSize: '0.95rem'
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f1f5f9' }}>
      
      {/* --- SIDEBAR --- */}
      <div style={{ width: '260px', background: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        
        {/* Brand Header */}
        <div style={{ padding: '25px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, color: '#0fa958', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={28} /> CommuteWise
          </h2>
          <small style={{ color: '#94a3b8' }}>Admin Panel v1.0</small>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
          
          {/* UPDATED: Points to /dashboard */}
          <NavLink to="/dashboard" style={navClass}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          
          <NavLink to="/analytics" style={navClass}>
            <BarChart3 size={20} /> Analytics
          </NavLink>

          <NavLink to="/routes" style={navClass}>
            <Map size={20} /> Route Manager
          </NavLink>

          <NavLink to="/feedbacks" style={navClass}>
            <MessageSquare size={20} /> Feedbacks
          </NavLink>

          {/* ADMIN MANAGEMENT LINK */}
          <div style={{ padding: '10px 0', borderTop: '1px solid #334155', marginTop: '10px' }}>
             <p style={{ padding: '0 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '5px' }}>System</p>
            <NavLink to="/admin-management" style={navClass}>
                <Shield size={20} /> Admin Management
            </NavLink>
          </div>
        </nav>

        {/* Footer / Logout */}
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button 
            onClick={handleLogout} 
            style={{ 
              display: 'flex', gap: '10px', background: 'transparent', border: 'none', 
              color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '10px', width: '100%', justifyContent: 'flex-start'
            }}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA (Dynamic) --- */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <Outlet />
      </div>

    </div>
  );
}
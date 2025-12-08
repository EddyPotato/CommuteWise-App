// CommuteWise - AdminLayout.jsx
// Version: Production 2.0 (Responsive Sidebar & Mobile Nav)

import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, MessageSquare, Shield, LogOut, Navigation, BarChart3, Menu, X } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = "Admin Panel | CommuteWise";
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = '/vite.svg';

    const handleResize = () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (!mobile) setIsSidebarOpen(true); // Always open on desktop
        else setIsSidebarOpen(false); // Closed by default on mobile
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
      if (isMobile) setIsSidebarOpen(false);
  }, [location, isMobile]);

  const handleLogout = async () => {
    try {
        await supabase.auth.signOut();
        navigate('/admin-login');
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
    background: isActive ? '#0fa958' : 'transparent',
    textDecoration: 'none',
    borderRadius: '8px',
    margin: '5px 10px',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
    fontSize: '0.95rem'
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f1f5f9', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden' }}>
      
      {/* --- MOBILE HEADER --- */}
      {isMobile && (
          <div style={{ padding: '15px 20px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <Navigation size={24} color="#0fa958" /> CommuteWise
              </div>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', color: 'white' }}>
                  {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
          </div>
      )}

      {/* --- SIDEBAR --- */}
      <div style={{ 
          width: isMobile ? '100%' : '260px', 
          height: isMobile ? 'calc(100vh - 60px)' : '100vh', // Adjust height for mobile header
          background: '#1e293b', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          zIndex: 40,
          position: isMobile ? 'absolute' : 'relative',
          top: isMobile ? '60px' : '0',
          left: 0,
          transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: isMobile && isSidebarOpen ? '4px 0 15px rgba(0,0,0,0.3)' : 'none'
      }}>
        
        {/* Desktop Brand Header */}
        {!isMobile && (
            <div style={{ padding: '25px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ margin: 0, color: '#0fa958', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Navigation size={28} /> CommuteWise
            </h2>
            <small style={{ color: '#94a3b8' }}>Admin Panel v1.0</small>
            </div>
        )}

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
          <NavLink to="/dashboard" style={navClass}><LayoutDashboard size={20} /> Dashboard</NavLink>
          <NavLink to="/analytics" style={navClass}><BarChart3 size={20} /> Analytics</NavLink>
          <NavLink to="/routes" style={navClass}><Map size={20} /> Route Manager</NavLink>
          <NavLink to="/feedbacks" style={navClass}><MessageSquare size={20} /> Feedbacks</NavLink>

          <div style={{ padding: '10px 0', borderTop: '1px solid #334155', marginTop: '10px' }}>
             <p style={{ padding: '0 20px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '5px' }}>System</p>
            <NavLink to="/admin-management" style={navClass}><Shield size={20} /> Admin Management</NavLink>
          </div>
        </nav>

        {/* Footer / Logout */}
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button onClick={handleLogout} style={{ display: 'flex', gap: '10px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '10px', width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* --- OVERLAY BACKDROP (Mobile Only) --- */}
      {isMobile && isSidebarOpen && (
          <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: '60px', left: 0, width: '100vw', height: 'calc(100vh - 60px)', background: 'rgba(0,0,0,0.5)', zIndex: 30 }}></div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', width: '100%' }}>
        <Outlet />
      </div>

    </div>
  );
}
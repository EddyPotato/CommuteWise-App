// CommuteWise - App.jsx
// Version: Production 1.2 (Admin Routes Updated)

import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

// --- LAYOUTS ---
import AdminLayout from './layouts/AdminLayout';

// --- PAGES ---
import Dashboard from './pages/Dashboard';
import RouteManager from './pages/RouteManager';
import FeedbackManager from './pages/FeedbackManager';
import AdminManagement from './pages/AdminManagement';
import Analytics from './pages/Analytics';
import Login from './pages/Login';

// --- ACTIVITY TRACKER (Auto Logout) ---
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

const ActivityTracker = () => {
    const timeoutRef = useRef(null);
    const navigate = useNavigate();

    const handleInactivityTimeout = async () => {
        console.log("Session timed out due to inactivity.");
        await supabase.auth.signOut();
        navigate('/admin-login', { replace: true }); // Redirects to new Login URL
    };

    const resetTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    };

    useEffect(() => {
        resetTimer();
        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, []); 

    return null;
};

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontFamily: 'sans-serif'}}>
        <Loader2 className="animate-spin" size={24} style={{marginRight: '8px'}} /> Checking session...
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/admin-login" replace />; // Redirects to new Login URL
  }

  return (
    <>
      <ActivityTracker /> 
      {children}
    </>
  );
};

// --- MAIN ROUTER ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* PUBLIC ROUTE: NEW URL */}
        <Route path="/admin-login" element={<Login />} />
        
        {/* PROTECTED ROUTES */}
        <Route path="/" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          {/* Redirect root '/' to '/dashboard' */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="routes" element={<RouteManager />} />
          <Route path="feedbacks" element={<FeedbackManager />} />
          <Route path="admin-management" element={<AdminManagement />} />
        </Route>

        {/* Catch-all: Redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

const Loader2 = ({ className, size, style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);

export default App;
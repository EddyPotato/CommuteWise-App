import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Real Supabase Client

// --- Admin Pages & Layouts ---
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import RouteManager from './pages/RouteManager';
import FeedbackManager from './pages/FeedbackManager';
import AdminManagement from './pages/AdminManagement';
import Login from './pages/Login';

// --- Embedded Activity Tracker Logic (Production Ready) ---
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const ActivityTracker = () => {
    const timeoutRef = useRef(null);
    const navigate = useNavigate();

    // Function to handle logout and redirection
    const handleInactivityTimeout = async () => {
        console.log("Session timed out due to inactivity.");
        // Use real Supabase sign out
        await supabase.auth.signOut();
        // Redirect to login page
        navigate('/login', { replace: true });
    };

    // Function to reset the timer
    const resetTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // Set new timeout to fire after 5 minutes
        timeoutRef.current = setTimeout(handleInactivityTimeout, INACTIVITY_TIMEOUT_MS);
    };

    // Setup: Runs once to start the timer and attach event listeners
    useEffect(() => {
        // Start the timer when the component mounts
        resetTimer();

        // Define activity events (mouse, keyboard, touch, visibility change)
        const activityEvents = [
            'mousemove', 'mousedown', 'keydown', 
            'touchstart', 'scroll', 'visibilitychange'
        ];

        // Attach listeners to reset the timer on activity
        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup: Clear timeout and remove listeners when component unmounts
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, []); 

    // This component renders nothing but manages global state/timers
    return null;
};

// --- Component to Protect Routes and Manage Session ---
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Effect to check initial authentication state and subscribe to changes
  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (handles login/logout)
    // NOTE: We don't need 'onAuthStateChange' inside ProtectedRoute for redirect anymore,
    // as the session check runs constantly, but keeping it for completeness of Supabase state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    // Show a minimal loading screen while checking the session token
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontFamily: 'sans-serif'}}>
        <Loader2 className="animate-spin" size={24} style={{marginRight: '8px'}} /> Checking session...
      </div>
    );
  }
  
  if (!session) {
    // If no session exists, redirect unauthorized users to the login page
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render children and enable the ActivityTracker
  return (
    <>
      {/* ActivityTracker is active ONLY when a user is logged in. */}
      <ActivityTracker /> 
      {children}
    </>
  );
};

// --- Main Application Router ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Admin Routes: All routes nested under '/' are protected */}
        <Route path="/" element={
          <ProtectedRoute>
            {/* AdminLayout provides the persistent sidebar and main content area */}
            <AdminLayout />
          </ProtectedRoute>
        }>
          {/* Nested Routes inside AdminLayout */}
          <Route index element={<Dashboard />} />
          <Route path="routes" element={<RouteManager />} />
          <Route path="feedbacks" element={<FeedbackManager />} />
          <Route path="admin-management" element={<AdminManagement />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Simple Loader2 component import for the loading screen (as Lucide is used throughout)
const Loader2 = ({ className, size, style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
);

export default App;
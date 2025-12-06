import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Inactivity timeout duration (5 minutes)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; 

const ActivityTracker = () => {
    const timeoutRef = useRef(null);
    const navigate = useNavigate();

    // Function to handle logout and redirection
    const handleInactivityTimeout = async () => {
        console.log("Session timed out due to inactivity.");
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

        // Define activity events
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

export default ActivityTracker;
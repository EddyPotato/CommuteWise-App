// CommuteWise - Login.jsx
// Version: Production 1.6 (Session Timeout Notification)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check for session timeout flag on mount
  useEffect(() => {
    const didTimeout = sessionStorage.getItem('didSessionTimeout');
    if (didTimeout) {
      setError("Session expired due to inactivity. Please log in again.");
      sessionStorage.removeItem('didSessionTimeout'); // Clear flag
    }
  }, []);

  // If already logged in, go to Dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const credentials = { email, password }; 

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;
      
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.message); 
      setPassword(''); 
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES ---
  const pageStyle = {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8fafc',
    fontFamily: '"Inter", sans-serif',
    zIndex: 9999,
  };

  const cardStyle = {
    width: '100%', maxWidth: '400px', backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    padding: '40px',
    display: 'flex', flexDirection: 'column', gap: '24px',
    margin: '20px', border: '1px solid #e2e8f0'
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px 12px 44px',
    borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '1rem', color: '#1e293b', outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s', boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px',
    transition: 'background-color 0.2s ease', opacity: loading ? 0.7 : 1
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Admin Portal</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Secure access only.</p>
          </div>
        </div>

        {/* Error/Info Notification */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #fecaca' }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={inputStyle} 
                placeholder="admin@commutewise.com"
                autoComplete="off" 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#94a3b8' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{...inputStyle, paddingRight: '40px'}} 
                placeholder="••••••••" 
                autoComplete="off" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? <><Loader2 className="animate-spin" size={20} /><span>Verifying...</span></> : <><span>Sign In</span><ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
          CommuteWise v1.0 &bull; Authorized Personnel Only
        </div>

      </div>
    </div>
  );
}
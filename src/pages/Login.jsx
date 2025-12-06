import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Imports the client we just created

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // AUTHENTICATION LOGIC:
      // This sends the credentials to your Supabase project.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      // If successful, Supabase sets a session in local storage.
      // We then redirect to the dashboard.
      navigate('/'); 
    } catch (err) {
      setError(err.message); // Displays "Invalid login credentials" or similar
    } finally {
      setLoading(false);
    }
  };

  // --- Professional UI Styles ---
  const pageStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    zIndex: 9999,
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    margin: '20px',
    border: '1px solid #f1f5f9'
  };

  const headerStyle = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  };

  const logoContainerStyle = {
    width: '56px', 
    height: '56px', 
    backgroundColor: '#eff6ff', 
    color: '#2563eb', 
    borderRadius: '12px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: '8px'
  };

  const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const labelStyle = {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#334155'
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    color: '#1e293b',
    outline: 'none',
    backgroundColor: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box'
  };

  const iconStyle = {
    position: 'absolute',
    left: '14px',
    color: '#94a3b8',
    pointerEvents: 'none'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
    transition: 'background-color 0.2s ease',
    opacity: loading ? 0.7 : 1
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={logoContainerStyle}>
            <ShieldCheck size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>Welcome Back</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '6px 0 0 0' }}>Sign in to the Admin Portal</p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', color: '#b91c1c', 
            padding: '12px 16px', borderRadius: '8px', fontSize: '0.875rem', 
            display: 'flex', alignItems: 'center', gap: '12px', 
            border: '1px solid #fecaca' 
          }}>
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={inputGroupStyle}>
            <label style={labelStyle}>Email Address</label>
            <div style={inputWrapperStyle}>
              <Mail size={18} style={iconStyle} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="admin@commutewise.com"
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapperStyle}>
              <Lock size={18} style={iconStyle} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={buttonStyle}
            onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#2563eb')}
          >
            {loading ? (
                <>
                    <Loader2 className="animate-spin" size={20} /> 
                    <span>Authenticating...</span>
                </>
            ) : (
              <>
                <span>Sign In</span> 
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
            CommuteWise Admin Panel &bull; v1.0
          </p>
        </div>

      </div>
    </div>
  );
}
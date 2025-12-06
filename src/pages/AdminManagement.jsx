// CommuteWise - AdminManagement.jsx
// Version: Production 2.1 (Fixed Input Colors & Layout)

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  UserPlus, Activity, Shield, Loader2, Clock, CheckCircle, AlertCircle, X, Search, Mail, Lock, User
} from 'lucide-react';
import { logAction } from '../utils/logger';

// --- STYLES ---
const styles = `
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(209, 213, 219, 0.4); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.6); }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;

const CONTAINER_STYLE = { 
  padding: '40px', 
  fontFamily: 'Inter, sans-serif', 
  backgroundColor: '#f8fafc', 
  minHeight: '100vh', 
  color: '#1e293b' 
};

const CARD_STYLE = { 
  background: 'white', 
  borderRadius: '16px', 
  border: '1px solid #e2e8f0', 
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
  overflow: 'hidden' 
};

// FIXED: Added Explicit Background Color
const INPUT_STYLE = { 
  width: '100%', 
  padding: '10px 12px 10px 40px', 
  borderRadius: '8px', 
  border: '1px solid #d1d5db', 
  fontSize: '0.95rem', 
  outline: 'none', 
  color: '#1e293b', // Dark Slate Text
  backgroundColor: '#ffffff', // White Background
  boxSizing: 'border-box' 
};

const LABEL_STYLE = { 
  display: 'block', 
  marginBottom: '8px', 
  fontWeight: '600', 
  color: '#374151', 
  fontSize: '0.9rem' 
};

export default function AdminManagement() {
  const [logs, setLogs] = useState([]);
  const [activeAdmins, setActiveAdmins] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Create Admin Form
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-dismiss notification
  useEffect(() => { 
    if (notification) { 
        const timer = setTimeout(() => setNotification(null), 4000); 
        return () => clearTimeout(timer); 
    } 
  }, [notification]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Logs (Real Data)
      const { data: logData, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(logData || []);

      // Derive "Active Admins" from logs (Who has performed actions recently?)
      const uniqueAdmins = {};
      (logData || []).forEach(log => {
          if (!uniqueAdmins[log.admin_email]) {
              uniqueAdmins[log.admin_email] = {
                  email: log.admin_email,
                  lastActive: log.created_at,
                  actionCount: 0
              };
          }
          uniqueAdmins[log.admin_email].actionCount++;
      });
      setActiveAdmins(Object.values(uniqueAdmins));

    } catch (err) {
      console.error("Error fetching data:", err);
      showNotification("Failed to load admin logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      await logAction('Created Admin', `Invited/Created new admin account: ${formData.email}`);
      showNotification(`Invitation sent to ${formData.email}`, "success");
      setFormData({ email: '', password: '' });
      fetchData(); // Refresh logs
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={CONTAINER_STYLE}>
      <style>{styles}</style>

      {/* NOTIFICATION TOAST */}
      {notification && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7', border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#22c55e'}`, color: notification.type === 'error' ? '#b91c1c' : '#15803d', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideIn 0.3s ease-out', pointerEvents: 'auto', minWidth: '300px' }}>
            {notification.type === 'error' ? <AlertCircle size={24}/> : <CheckCircle size={24}/>} 
            <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>{notification.type === 'error' ? 'Error' : 'Success'}</span>
                <span style={{ fontSize: '0.9rem' }}>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}><X size={18}/></button>
          </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={32} color="#4f46e5" /> Admin Management
        </h1>
        <p style={{ color: '#64748b', margin: 0, paddingLeft: '44px' }}>Manage system access and monitor security logs.</p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* LEFT COLUMN: Actions & Active Users */}
        <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* 1. Create Admin Card */}
            <div style={CARD_STYLE}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={20} color="#4f46e5" /> Register New Admin
                    </h3>
                </div>
                <div style={{ padding: '24px' }}>
                    <form onSubmit={handleCreateAdmin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LABEL_STYLE}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="email" required placeholder="admin@commutewise.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={INPUT_STYLE} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={LABEL_STYLE}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="password" required placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={INPUT_STYLE} />
                            </div>
                        </div>
                        <button type="submit" disabled={createLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: createLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: createLoading ? 0.7 : 1 }}>
                            {createLoading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                        </button>
                    </form>
                </div>
            </div>

            {/* 2. Recently Active Admins (Derived Real Data) */}
            <div style={CARD_STYLE}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={20} color="#059669" /> Recently Active
                    </h3>
                </div>
                <div style={{ padding: '0' }}>
                    {loading ? (
                         <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="animate-spin" style={{margin:'0 auto'}} /></div>
                    ) : activeAdmins.length === 0 ? (
                        <div style={{ padding: '20px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No recent activity found.</div>
                    ) : (
                        <div>
                            {activeAdmins.map((admin, idx) => (
                                <div key={idx} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {admin.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>{admin.email}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin.actionCount} recent actions</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> {new Date(admin.lastActive).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* RIGHT COLUMN: Audit Logs Table */}
        <div style={{ flex: '2', minWidth: '400px' }}>
            <div style={CARD_STYLE}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} color="#d97706" /> System Audit Logs
                    </h3>
                    <button onClick={fetchData} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                        Refresh
                    </button>
                </div>
                
                <div className="custom-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {loading ? (
                         <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                            <Loader2 size={32} className="animate-spin" style={{margin:'0 auto 10px'}} />
                            Loading audit logs...
                         </div>
                    ) : logs.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No logs recorded yet.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#f8fafc', color: '#64748b', fontWeight: '600', position: 'sticky', top: 0 }}>
                                <tr>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Details</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Admin</th>
                                    <th style={{ padding: '12px 20px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 20px', fontWeight: '600', color: '#334155' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.8rem' }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#475569' }}>{log.details}</td>
                                        <td style={{ padding: '16px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.admin_email}</td>
                                        <td style={{ padding: '16px 20px', color: '#94a3b8', textAlign: 'right', fontSize: '0.85rem' }}>
                                            {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
// CommuteWise - Dashboard.jsx
// Version: Production 1.0 (Optimized & Real Data)

import React, { useEffect, useState } from 'react';
import { Map, MapPin, CheckCircle, MessageSquare, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// --- STYLES ---
const styles = `
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(209, 213, 219, 0.4); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.6); }
`;

// --- COMPONENT: STAT CARD ---
const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <div style={{ 
    background: 'white', padding: '24px', borderRadius: '16px', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1, display: 'flex', 
    alignItems: 'center', gap: '20px', minWidth: '240px',
    border: '1px solid #e2e8f0', transition: 'transform 0.2s', cursor: 'default'
  }}
  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ background: `${color}15`, color: color, padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <div>
      <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>
        {loading ? <div style={{ height: '28px', width: '40px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div> : value}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate(); // For redirecting to detail pages
  const [stats, setStats] = useState({
    routes: 0, terminals: 0, feedbacks: 0, resolved: 0 
  });
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // OPTIMIZATION: Fetch all counts in parallel for faster load time
      const [routesRes, stopsRes, feedbackRes, resolvedRes, recentRes] = await Promise.all([
        supabase.from('routes').select('*', { count: 'exact', head: true }),
        supabase.from('stops').select('*', { count: 'exact', head: true }),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('status', 'Resolved'),
        supabase.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      // Check for errors (optional detailed logging)
      if (routesRes.error) console.error("Routes error", routesRes.error);

      setStats({
        routes: routesRes.count || 0,
        terminals: stopsRes.count || 0,
        feedbacks: feedbackRes.count || 0,
        resolved: resolvedRes.count || 0 // REAL DATA: Replaced 'Active Users' with 'Resolved Issues'
      });
      setRecentFeedbacks(recentRes.data || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- STYLES ---
  const statusBadgeStyle = (status) => ({
    display: 'inline-block',
    padding: '4px 10px', 
    borderRadius: '9999px', 
    fontSize: '0.75rem', 
    fontWeight: '700',
    background: status === 'Resolved' ? '#dcfce7' : '#fef9c3',
    color: status === 'Resolved' ? '#166534' : '#854d0e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  });

  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b' }}>
      <style>{styles}</style>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>Dashboard Overview</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b' }}>Welcome back, Admin. Here is what's happening today.</p>
        </div>
        <button 
            onClick={fetchDashboardData} 
            disabled={loading}
            style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
                backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', color: '#475569',
                transition: 'all 0.2s'
            }}
        >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh Data
        </button>
      </div>

      {/* STAT CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <StatCard title="Active Routes" value={stats.routes} icon={Map} color="#10b981" loading={loading} />
        <StatCard title="Total Stops" value={stats.terminals} icon={MapPin} color="#3b82f6" loading={loading} />
        <StatCard title="Total Feedbacks" value={stats.feedbacks} icon={MessageSquare} color="#f59e0b" loading={loading} />
        <StatCard title="Resolved Issues" value={stats.resolved} icon={CheckCircle} color="#8b5cf6" loading={loading} />
      </div>

      {/* RECENT FEEDBACKS SECTION */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Recent User Feedback</h3>
            <button onClick={() => navigate('/feedback-manager')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                View All <ArrowRight size={16} />
            </button>
        </div>
        
        {loading ? (
           <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', gap: '10px' }}>
               <Loader2 className="animate-spin" /> Loading data...
           </div>
        ) : recentFeedbacks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No feedbacks received yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>User / Message</th>
                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedbacks.map((fb, index) => (
                <tr key={fb.id} style={{ borderBottom: index !== recentFeedbacks.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{fb.user_name || 'Anonymous'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{fb.message}</div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '0.9rem' }}>
                    {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={statusBadgeStyle(fb.status || 'Pending')}>
                        {fb.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
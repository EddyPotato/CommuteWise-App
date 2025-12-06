import React, { useEffect, useState } from 'react';
import { Map, MapPin, Users, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Reusable Stat Card (Original Clean Design)
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ 
    background: 'white', padding: '20px', borderRadius: '12px', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flex: 1, display: 'flex', 
    alignItems: 'center', gap: '15px', minWidth: '200px',
    border: '1px solid #e2e8f0'
  }}>
    <div style={{ background: color + '20', color: color, padding: '15px', borderRadius: '50%' }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
        {value}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    routes: 0, terminals: 0, feedbacks: 0, users: 0 
  });
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { count: routeCount } = await supabase.from('routes').select('*', { count: 'exact', head: true });
      const { count: stopCount } = await supabase.from('stops').select('*', { count: 'exact', head: true }); 
      const { count: feedbackCount } = await supabase.from('feedbacks').select('*', { count: 'exact', head: true });
      
      const { data: feedbackData } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        routes: routeCount || 0,
        terminals: stopCount || 0,
        feedbacks: feedbackCount || 0,
        users: 0 
      });
      setRecentFeedbacks(feedbackData || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 30, color: '#1e293b' }}>Loading Dashboard...</div>;

  return (
    <div style={{ padding: '30px', color: '#1e293b', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '25px', fontSize: '1.8rem', fontWeight: 'bold' }}>Dashboard Overview</h1>

      {/* STAT CARDS ROW */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <StatCard title="Total Routes" value={stats.routes} icon={Map} color="#0fa958" />
        <StatCard title="Total Stops" value={stats.terminals} icon={MapPin} color="#3b82f6" />
        <StatCard title="Active Users" value={stats.users} icon={Users} color="#8b5cf6" />
        <StatCard title="Feedbacks" value={stats.feedbacks} icon={MessageSquare} color="#f59e0b" />
      </div>

      {/* RECENT FEEDBACKS SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#334155', fontWeight: '600' }}>Recent Feedbacks</h3>
            <button onClick={fetchDashboardData} style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: '#0fa958', fontWeight: '600' }}>Refresh</button>
        </div>
        
        {recentFeedbacks.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>No feedbacks received yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                <th style={{ padding: '12px 10px', fontSize: '0.9rem' }}>Message</th>
                <th style={{ padding: '12px 10px', fontSize: '0.9rem' }}>Date</th>
                <th style={{ padding: '12px 10px', fontSize: '0.9rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedbacks.map(fb => (
                <tr key={fb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px 10px', color: '#334155' }}>{fb.message}</td>
                  <td style={{ padding: '15px 10px', color: '#64748b', fontSize: '0.9rem' }}>
                    {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '15px 10px' }}>
                    <span style={{ 
                        background: fb.status === 'Resolved' ? '#dcfce7' : '#fef9c3', 
                        color: fb.status === 'Resolved' ? '#166534' : '#854d0e', 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                        textTransform: 'capitalize'
                    }}>
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
// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Map, MapPin, Users, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Make sure path is correct

// Reusable Stat Card
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ 
    background: 'white', padding: '20px', borderRadius: '12px', 
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flex: 1, display: 'flex', 
    alignItems: 'center', gap: '15px', minWidth: '200px' 
  }}>
    <div style={{ background: color + '20', color: color, padding: '15px', borderRadius: '50%' }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
        {value}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    routes: 0,
    terminals: 0,
    feedbacks: 0,
    users: 0 // Placeholder until you have a 'users' table
  });
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. COUNT ROUTES
      const { count: routeCount } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true });

      // 2. COUNT STOPS (Terminals)
      // If you distinguish terminals, use .eq('is_terminal', true)
      const { count: stopCount } = await supabase
        .from('stops')
        .select('*', { count: 'exact', head: true }); 

      // 3. COUNT FEEDBACKS
      const { count: feedbackCount } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true });

      // 4. FETCH LATEST 5 FEEDBACKS
      const { data: feedbackData } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        routes: routeCount || 0,
        terminals: stopCount || 0,
        feedbacks: feedbackCount || 0,
        users: 0 // Keep 0 for now
      });

      setRecentFeedbacks(feedbackData || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 30 }}>Loading Dashboard...</div>;

  return (
    <div style={{ padding: '30px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '25px' }}>Dashboard Overview</h1>

      {/* STAT CARDS ROW */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <StatCard title="Total Routes" value={stats.routes} icon={Map} color="#0fa958" />
        <StatCard title="Total Stops" value={stats.terminals} icon={MapPin} color="#3b82f6" />
        <StatCard title="Active Users" value={stats.users} icon={Users} color="#8b5cf6" />
        <StatCard title="Feedbacks" value={stats.feedbacks} icon={MessageSquare} color="#f59e0b" />
      </div>

      {/* RECENT FEEDBACKS SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#334155' }}>Recent Feedbacks</h3>
            <button onClick={fetchDashboardData} style={{ cursor: 'pointer', border: 'none', background: 'transparent', color: '#0fa958' }}>Refresh</button>
        </div>
        
        {recentFeedbacks.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No feedbacks received yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                <th style={{ padding: '10px' }}>Message</th>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentFeedbacks.map(fb => (
                <tr key={fb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px 10px' }}>{fb.message}</td>
                  <td style={{ padding: '15px 10px', color: '#64748b', fontSize: '0.9rem' }}>
                    {new Date(fb.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px 10px' }}>
                    <span style={{ 
                        background: fb.status === 'resolved' ? '#dcfce7' : '#fef9c3', 
                        color: fb.status === 'resolved' ? '#166534' : '#854d0e', 
                        padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem' 
                    }}>
                        {fb.status}
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
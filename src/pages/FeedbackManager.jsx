// CommuteWise - FeedbackManager.jsx
// Version: Production 1.1 (Performance Optimized)

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  MessageSquare, 
  Loader2, 
  Search,
  AlertCircle,
  RefreshCw 
} from 'lucide-react';

export default function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    // 1. Snapshot previous state for rollback
    const previousFeedbacks = [...feedbacks];

    // 2. Optimistic Update (Instant UI feedback)
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));

    try {
      const { error } = await supabase.from('feedbacks').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      // 3. Rollback only on error (No refetch needed)
      setFeedbacks(previousFeedbacks); 
      alert("Failed to update status. Changes reverted.");
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    // 1. Snapshot
    const previousFeedbacks = [...feedbacks];

    // 2. Optimistic Update
    setFeedbacks(prev => prev.filter(f => f.id !== id));

    try {
      const { error } = await supabase.from('feedbacks').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      // 3. Rollback
      setFeedbacks(previousFeedbacks);
      alert("Failed to delete. Item restored.");
    }
  };

  // --- FILTERING (Memoization Optional but Good for Large Lists) ---
  // If list grows >1000 items, wrapping this in useMemo() would be the next optimization step.
  // For standard usage, standard filter is perfectly fine.
  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (item.message || '').toLowerCase().includes(searchLower) ||
      (item.user_name || '').toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // --- STYLES ---
  const containerStyle = { padding: '30px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', background: '#f8fafc', color: '#1e293b' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' };
  const titleStyle = { color: '#1e293b', fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' };
  const searchInputStyle = { padding: '10px 15px 10px 35px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '250px', color: '#334155', background: 'white', fontSize: '0.9rem' };
  
  const getButtonStyle = (isActive, activeColor, activeBg) => ({
    padding: '8px 16px', borderRadius: '8px', border: isActive ? `1px solid ${activeColor}` : '1px solid #e2e8f0',
    background: isActive ? activeBg : 'white', color: isActive ? activeColor : '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', marginLeft: '8px', transition: 'all 0.2s'
  });

  const cardContainerStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' };
  const itemStyle = { padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'flex-start', transition: 'background-color 0.2s' };
  
  const statusBadgeStyle = (status) => ({
    display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
    background: status === 'Resolved' ? '#ecfdf5' : '#fffbeb', color: status === 'Resolved' ? '#047857' : '#b45309', border: `1px solid ${status === 'Resolved' ? '#a7f3d0' : '#fde68a'}`, textTransform: 'uppercase', letterSpacing: '0.025em'
  });

  const actionButtonStyle = (bgColor, textColor) => ({
    border: 'none', background: bgColor, color: textColor, padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', transition: 'background 0.2s'
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}><MessageSquare size={28} color="#4f46e5" /> User Feedback</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '0.9rem' }}>Manage and respond to commuter reports.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={fetchFeedbacks} title="Refresh" style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={18} color="#475569" className={loading ? "animate-spin" : ""} />
          </button>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={searchInputStyle} />
          </div>
          <div>
            <button onClick={() => setFilter('all')} style={getButtonStyle(filter === 'all', '#4f46e5', '#eef2ff')}>All</button>
            <button onClick={() => setFilter('Pending')} style={getButtonStyle(filter === 'Pending', '#b45309', '#fffbeb')}>Pending</button>
            <button onClick={() => setFilter('Resolved')} style={getButtonStyle(filter === 'Resolved', '#047857', '#ecfdf5')}>Resolved</button>
          </div>
        </div>
      </div>

      <div style={cardContainerStyle}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 15px', display: 'block', color: '#cbd5e1' }} /><span style={{fontWeight: 500}}>Loading feedback...</span></div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}><MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '15px' }} /><p style={{fontWeight: 500}}>No feedbacks found matching your criteria.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredFeedbacks.map((item) => (
              <div key={item.id} style={itemStyle} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  {item.status === 'Resolved' ? <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '50%', color: '#059669' }}><CheckCircle size={20} /></div> : <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '50%', color: '#d97706' }}><AlertCircle size={20} /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>{item.user_name || 'Anonymous User'}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</span>
                  </div>
                  <p style={{ margin: '0 0 12px', color: '#475569', lineHeight: '1.6', fontSize: '0.95rem' }}>{item.message}</p>
                  <span style={statusBadgeStyle(item.status || 'Pending')}>{item.status || 'Pending'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '10px' }}>
                  {item.status !== 'Resolved' && <button onClick={() => updateStatus(item.id, 'Resolved')} style={actionButtonStyle('#ecfdf5', '#047857')}><CheckCircle size={14} /> Resolve</button>}
                  {item.status === 'Resolved' && <button onClick={() => updateStatus(item.id, 'Pending')} style={actionButtonStyle('#fffbeb', '#b45309')}><XCircle size={14} /> Reopen</button>}
                  <button onClick={() => deleteFeedback(item.id)} style={actionButtonStyle('transparent', '#ef4444')}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
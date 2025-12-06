import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  MessageSquare, 
  Loader2, 
  Search,
  AlertCircle
} from 'lucide-react';

export default function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'Pending', 'Resolved'
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // --- ACTIONS ---

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
    // Optimistic Update
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));

    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      fetchFeedbacks(); // Revert on error
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    // Optimistic Update
    setFeedbacks(prev => prev.filter(f => f.id !== id));

    try {
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      fetchFeedbacks(); // Revert
    }
  };

  // --- FILTERING LOGIC ---

  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (item.message || '').toLowerCase().includes(searchLower) ||
      (item.user_name || '').toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  // --- STYLES (Inline to match Dashboard.jsx) ---

  const containerStyle = { 
    padding: '30px', 
    fontFamily: 'sans-serif', 
    minHeight: '100vh', 
    background: '#f8fafc',
    color: '#1e293b' 
  };
  
  const headerStyle = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '25px', 
    flexWrap: 'wrap', 
    gap: '15px' 
  };
  
  const titleStyle = { 
    color: '#1e293b', 
    fontSize: '1.5rem', 
    fontWeight: 'bold', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px' 
  };
  
  const searchInputStyle = {
    padding: '10px 15px 10px 35px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    width: '250px',
    color: '#334155',
    background: 'white'
  };

  const getButtonStyle = (isActive, activeColor, activeBg) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: isActive ? activeBg : 'white',
    color: isActive ? activeColor : '#64748b',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    marginLeft: '5px'
  });

  const cardContainerStyle = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  };

  const itemStyle = {
    padding: '20px', 
    borderBottom: '1px solid #f1f5f9', 
    display: 'flex', 
    gap: '15px',
    alignItems: 'flex-start'
  };

  const statusBadgeStyle = (status) => ({
    display: 'inline-block',
    padding: '4px 10px', 
    borderRadius: '12px', 
    fontSize: '0.75rem', 
    fontWeight: '600',
    background: status === 'Resolved' ? '#ecfdf5' : '#fffbeb',
    color: status === 'Resolved' ? '#047857' : '#b45309',
    border: `1px solid ${status === 'Resolved' ? '#a7f3d0' : '#fde68a'}`
  });

  const actionButtonStyle = (bgColor, textColor) => ({
    border: 'none', 
    background: bgColor, 
    color: textColor, 
    padding: '6px 12px', 
    borderRadius: '6px', 
    fontSize: '0.8rem', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '6px', 
    fontWeight: '500' 
  });

  // --- RENDER ---

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            <MessageSquare size={24} color="#4f46e5" />
            User Feedback
          </h1>
          <p style={{ color: '#64748b', marginTop: '5px', fontSize: '0.95rem' }}>Manage and respond to commuter reports.</p>
        </div>
        
        {/* Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          
          <div>
            <button 
              onClick={() => setFilter('all')} 
              style={getButtonStyle(filter === 'all', '#4f46e5', '#eef2ff')}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('Pending')} 
              style={getButtonStyle(filter === 'Pending', '#b45309', '#fffbeb')}
            >
              Pending
            </button>
            <button 
              onClick={() => setFilter('Resolved')} 
              style={getButtonStyle(filter === 'Resolved', '#047857', '#ecfdf5')}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={cardContainerStyle}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
            <Loader2 className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
            Loading feedback...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
            <p>No feedback found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredFeedbacks.map((item) => (
              <div key={item.id} style={itemStyle}>
                
                {/* Icon Status */}
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  {item.status === 'Resolved' ? (
                    <div style={{ background: '#d1fae5', padding: '8px', borderRadius: '50%', color: '#059669' }}>
                      <CheckCircle size={20} />
                    </div>
                  ) : (
                    <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '50%', color: '#d97706' }}>
                      <AlertCircle size={20} />
                    </div>
                  )}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>
                      {item.user_name || 'Anonymous User'}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px', color: '#475569', lineHeight: '1.5', fontSize: '0.9rem' }}>
                    {item.message}
                  </p>
                  
                  <span style={statusBadgeStyle(item.status || 'Pending')}>
                    {item.status || 'Pending'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '10px' }}>
                  {item.status !== 'Resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'Resolved')}
                      style={actionButtonStyle('#ecfdf5', '#047857')}
                    >
                      <CheckCircle size={14} /> Resolve
                    </button>
                  )}
                  {item.status === 'Resolved' && (
                    <button
                      onClick={() => updateStatus(item.id, 'Pending')}
                      style={actionButtonStyle('#fffbeb', '#b45309')}
                    >
                      <XCircle size={14} /> Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteFeedback(item.id)}
                    style={actionButtonStyle('transparent', '#ef4444')}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
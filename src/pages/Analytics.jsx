// CommuteWise - Analytics.jsx
// Version: Production 2.1 (Responsive Layout)

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
    BarChart3, Search, MapPin, MessageSquare, 
    TrendingUp, Clock, AlertCircle, Loader2, Calendar
} from 'lucide-react';

// --- STYLES ---
const styles = `
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(209, 213, 219, 0.4); border-radius: 10px; }
  .analytics-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .bar-fill { transition: width 1s ease-in-out; }

  /* Mobile Responsive Adjustments */
  @media (max-width: 640px) {
    .analytics-container { padding: 20px !important; }
    .analytics-header h1 { fontSize: 1.5rem !important; }
    .analytics-card { padding: 20px !important; }
    /* Ensure charts stack on small screens */
    .chart-grid { grid-template-columns: 1fr !important; } 
  }
`;

const CONTAINER_STYLE = { padding: '40px', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1e293b' };

// --- COMPONENTS ---

const KPICard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="analytics-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ background: `${color}15`, color: color, padding: '16px', borderRadius: '12px' }}>
            <Icon size={28} />
        </div>
        <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>{title}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>{value}</div>
            {subtext && <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>{subtext}</div>}
        </div>
    </div>
);

const HorizontalBarChart = ({ data, color }) => {
    if (!data || data.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontStyle: 'italic' }}>No search data recorded yet.</div>;
    
    const maxCount = Math.max(...data.map(d => d.count));
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.map((item, idx) => (
                <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600', color: '#475569' }}>
                        <span>{item.label}</span>
                        <span>{item.count}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div className="bar-fill" style={{ width: `${(item.count / maxCount) * 100}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Heatmap24H = ({ hours }) => {
    // hours is an array of 24 integers representing activity count per hour
    const max = Math.max(...hours, 1);
    
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', gap: '4px', paddingTop: '20px' }}>
            {hours.map((count, h) => (
                <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div 
                        className="bar-fill" 
                        style={{ 
                            width: '100%', 
                            height: `${(count / max) * 100}%`, 
                            backgroundColor: count > 0 ? `rgba(59, 130, 246, ${0.3 + (count/max)*0.7})` : '#f1f5f9', 
                            borderRadius: '2px',
                            minHeight: count > 0 ? '4px' : '0'
                        }} 
                        title={`${h}:00 - ${count} activities`}
                    ></div>
                    {h % 4 === 0 && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{h}</span>}
                </div>
            ))}
        </div>
    );
};

const CategoryDonut = ({ data }) => {
    // data: { label, count, color }
    if (!data || data.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontStyle: 'italic' }}>No feedback categorized yet.</div>;

    const total = data.reduce((acc, curr) => acc + curr.count, 0);
    let cumulative = 0;
    
    // Create conic-gradient string
    const gradient = data.map(item => {
        const start = (cumulative / total) * 100;
        cumulative += item.count;
        const end = (cumulative / total) * 100;
        return `${item.color} ${start}% ${end}%`;
    }).join(', ');

    return (
        // Added flexWrap to handle mobile stacking
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ 
                width: '140px', height: '140px', borderRadius: '50%', 
                background: `conic-gradient(${gradient})`, 
                position: 'relative',
                flexShrink: 0 
            }}>
                <div style={{ position: 'absolute', inset: '25px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#1e293b' }}>{total}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Reports</span>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                {data.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: item.color }}></div>
                        <span style={{ flex: 1, color: '#475569' }}>{item.label}</span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>{Math.round((item.count / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalSearches: 0,
        topSearches: [],
        activeBarangay: 'N/A',
        feedbackCategories: [],
        peakHours: Array(24).fill(0),
        topComplaint: 'None'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch User Logs (Searches & Activity)
            const { data: logs, error: logError } = await supabase
                .from('user_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2000); // Analyze last 2000 interactions

            // 2. Fetch Feedbacks
            const { data: feedbacks, error: fbError } = await supabase
                .from('feedbacks')
                .select('category');

            if (logError || fbError) throw new Error("Data fetch failed");

            // --- PROCESS SEARCH DATA ---
            const searchCounts = {};
            const barangayActivity = {};
            const hours = Array(24).fill(0);

            (logs || []).forEach(log => {
                // Count Searches
                if (log.event_type === 'search_route' && log.details) {
                    const term = log.details.replace('Search: ', '').trim();
                    searchCounts[term] = (searchCounts[term] || 0) + 1;
                }

                // Count Barangay Activity
                if (log.barangay) {
                    barangayActivity[log.barangay] = (barangayActivity[log.barangay] || 0) + 1;
                }

                // Peak Hours
                const hour = new Date(log.created_at).getHours();
                hours[hour]++;
            });

            // Sort Searches
            const sortedSearches = Object.entries(searchCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([label, count]) => ({ label, count }));

            // Find Top Barangay
            const topBarangay = Object.entries(barangayActivity)
                .sort(([, a], [, b]) => b - a)[0];

            // --- PROCESS FEEDBACK DATA ---
            const catCounts = {};
            (feedbacks || []).forEach(fb => {
                const cat = fb.category || 'General';
                catCounts[cat] = (catCounts[cat] || 0) + 1;
            });

            // Define colors for feedback categories
            const catColors = { 'Driver Behavior': '#ef4444', 'Timing': '#f59e0b', 'App Issue': '#3b82f6', 'Route': '#8b5cf6', 'General': '#64748b' };
            
            const formattedCategories = Object.entries(catCounts).map(([label, count]) => ({
                label,
                count,
                color: catColors[label] || '#cbd5e1'
            })).sort((a, b) => b.count - a.count);

            setData({
                totalSearches: logs.filter(l => l.event_type === 'search_route').length,
                topSearches: sortedSearches,
                activeBarangay: topBarangay ? topBarangay[0] : 'No Data',
                feedbackCategories: formattedCategories,
                peakHours: hours,
                topComplaint: formattedCategories.length > 0 ? formattedCategories[0].label : 'None'
            });

        } catch (error) {
            console.error("Analytics Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="analytics-container" style={{ ...CONTAINER_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" />
                <p style={{ marginTop: '10px', color: '#64748b' }}>Analyzing commuter data...</p>
            </div>
        );
    }

    return (
        <div className="analytics-container" style={CONTAINER_STYLE}>
            <style>{styles}</style>

            {/* HEADER */}
            <div className="analytics-header" style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <TrendingUp size={32} color="#4f46e5" /> Commuter Analytics
                </h1>
                <p style={{ color: '#64748b', margin: 0, paddingLeft: '44px' }}>Insights into user demand, search behavior, and feedback trends.</p>
            </div>

            {/* ROW 1: KPI CARDS (Responsive Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                <KPICard 
                    title="Total Searches" 
                    value={data.totalSearches} 
                    icon={Search} 
                    color="#3b82f6" 
                    subtext="User route queries (All time)"
                />
                <KPICard 
                    title="Most Active Barangay" 
                    value={data.activeBarangay} 
                    icon={MapPin} 
                    color="#10b981" 
                    subtext="Highest user engagement area"
                />
                <KPICard 
                    title="Top Feedback Topic" 
                    value={data.topComplaint} 
                    icon={MessageSquare} 
                    color="#f59e0b" 
                    subtext="Most common report category"
                />
            </div>

            {/* ROW 2: CHARTS (Responsive Grid) */}
            {/* Changed minmax to 300px to allow side-by-side on desktop but full-width stacking on mobile */}
            <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                
                {/* 1. Most Searched Locations */}
                <div className="analytics-card">
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Search size={20} color="#4f46e5" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Top 5 Searched Destinations</h3>
                    </div>
                    <HorizontalBarChart data={data.topSearches} color="#4f46e5" />
                    <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <AlertCircle size={16} /> Use this data to identify potential new routes.
                    </div>
                </div>

                {/* 2. Feedback Categories */}
                <div className="analytics-card">
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MessageSquare size={20} color="#f59e0b" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Feedback Classification</h3>
                    </div>
                    <CategoryDonut data={data.feedbackCategories} />
                </div>
            </div>

            {/* ROW 3: PEAK HOURS */}
            <div className="analytics-card" style={{ marginTop: '30px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} color="#ef4444" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>Peak Usage Hours (24H)</h3>
                </div>
                <Heatmap24H hours={data.peakHours} />
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px' }}>
                    Time of day (00:00 - 23:00) based on user activity logs.
                </div>
            </div>

        </div>
    );
}
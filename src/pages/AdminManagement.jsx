import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Activity, Shield, Loader2, Clock } from 'lucide-react';
import { logAction } from '../utils/logger';

export default function AdminManagement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Admin Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setLogs(data);
    setLoading(false);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setMsg(null);

    try {
      // Create new user (Sign Up)
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (error) throw error;

      // Log this action!
      await logAction('Created Admin', `Created new account for ${newEmail}`);
      
      setMsg({ type: 'success', text: `Invite sent to ${newEmail} (or account created if confirmation disabled)` });
      setNewEmail('');
      setNewPassword('');
      fetchLogs(); // Refresh logs to see the "Created Admin" entry
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-slate-50 min-h-screen font-sans text-slate-900">
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
          <Shield className="text-indigo-600" /> Admin Management
        </h1>
        <p className="text-slate-500 mt-1 ml-9">Manage access and audit system activity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Create Admin */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-500" /> Add New Admin
            </h2>
            
            {msg && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="colleague@commutewise.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Min 6 characters"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={createLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
              >
                {createLoading ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Activity Logs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" /> Recent Activity Logs
              </h2>
              <button onClick={fetchLogs} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Refresh</button>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No activity recorded yet.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-medium">Action</th>
                      <th className="px-6 py-3 font-medium">Details</th>
                      <th className="px-6 py-3 font-medium">Admin</th>
                      <th className="px-6 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-800">{log.action}</td>
                        <td className="px-6 py-3 text-slate-600">{log.details}</td>
                        <td className="px-6 py-3 text-slate-500 text-xs font-mono">{log.admin_email}</td>
                        <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
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
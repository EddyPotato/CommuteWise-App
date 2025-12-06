// CommuteWise - RouteManager.jsx
// Version: December 6, 2025 - 17.0 (FIXED: Seamless Search Highlighting)

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { logAction } from '../utils/logger'; 
import { 
  Trash2, Network, X, Search, Edit2, 
  ChevronDown, ChevronRight, Map as MapIcon, 
  List, LayoutGrid, Ticket, Plus, 
  MapPin, GripVertical, AlertCircle, CheckCircle, AlertTriangle, MousePointer2, PlusCircle, Crosshair, Clock, Ruler, Info, Save, Ban, LogOut
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- ICONS CONFIG ---
const StopIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });

// --- CSS STYLES ---
const styles = `
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(209, 213, 219, 0.4); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.6); }
  .scrollbar-stable { scrollbar-gutter: stable; }
  
  /* Force Checkbox Visibility & Light Mode */
  input[type="checkbox"] { 
    accent-color: #3b82f6; 
    cursor: pointer; 
    width: 16px; 
    height: 16px;
    background-color: white; 
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }

  @keyframes shrink { from { width: 100%; } to { width: 0%; } }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;

// --- GLOBAL CONSTANTS ---
const COMMON_INPUT_STYLE = {
  width: '100%', padding: '10px 12px', marginBottom: '20px', borderRadius: '8px', 
  border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box', 
  color: '#111827', backgroundColor: '#ffffff', outline: 'none'
};

const LABEL_STYLE = {
  display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem'
};

// --- UTILS: HIGHLIGHTING (FIXED: Seamless merging) ---
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const HighlightText = ({ text, highlight }) => {
    if (!highlight || !text) return <>{text}</>;
    const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
    const parts = text.toString().split(regex);
    return (
        <>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    // Removed borderRadius to prevents gaps between adjacent matches like "bagbag"
                    <span key={i} style={{ backgroundColor: '#fef08a', color: 'inherit', padding: 0, margin: 0 }}>{part}</span>
                ) : ( part )
            )}
        </>
    );
};

// --- HELPER: MAP CONTROLLER ---
const MapController = ({ focusLocation }) => {
    const map = useMap();
    useEffect(() => {
        if (focusLocation) {
            map.flyTo([focusLocation.lat, focusLocation.lng], 16, { duration: 1.5 });
        }
    }, [focusLocation, map]);
    return null;
};

// --- HELPER: GENERATE ICONS ---
const getIcon = (stop) => {
  const type = stop.type?.toLowerCase();
  const vehicles = stop.allowed_vehicles || [];
  
  let color = '#3b82f6';
  let innerHTML = '';
  
  if (type === 'terminal') {
      if (vehicles.length > 1) color = '#eab308'; 
      else if (vehicles.includes('tricycle')) color = '#16a34a'; 
      else if (vehicles.includes('jeep')) color = '#7c3aed'; 
      else if (vehicles.includes('bus')) color = '#1e40af'; 
      else color = '#10b981'; 
  } else {
      switch (type) {
        case 'school': color = '#f97316'; innerHTML = '🎓'; break;
        case 'hospital': color = '#ef4444'; innerHTML = '🏥'; break;
        case 'mall': color = '#8b5cf6'; innerHTML = '🛍️'; break;
        case 'restaurant': color = '#eab308'; innerHTML = '🍴'; break;
        default: color = '#3b82f6';
      }
  }

  if (type === 'stop_point') {
    return L.divIcon({
        className: 'custom-stop-point',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
    });
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; color: white; font-size: 16px;">${innerHTML}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14]
  });
};

const getTerminalColor = (str) => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
    let hash = 0;
    if (!str) return colors[0];
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash % colors.length)];
};

const getRouteColor = (mode) => {
  switch (mode?.toLowerCase()) {
    case 'bus': return '#2563eb';
    case 'jeep': return '#7c3aed';
    default: return '#16a34a';
  }
};

// --- SHARED COMPONENTS ---
const SuggestionInput = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()) && opt.toLowerCase() !== value.toLowerCase());

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }} ref={wrapperRef}>
      <label style={LABEL_STYLE}>{label}</label>
      <input type="text" value={value} onFocus={() => setIsOpen(true)} onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        style={COMMON_INPUT_STYLE} placeholder={placeholder} />
      {isOpen && filteredOptions.length > 0 && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: 'calc(100% - 15px)', left: 0, width: '100%', maxHeight: '150px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.map((opt, index) => (
            <div key={index} onClick={() => { onChange(opt); setIsOpen(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1f2937' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) { const selected = options.find(o => o.id === parseInt(value)); if (selected) setQuery(selected.name); } else { setQuery(''); }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={wrapperRef}>
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <input type="text" value={query} onFocus={() => setIsOpen(true)} placeholder={placeholder} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem', outline: 'none', color: '#000', backgroundColor: '#fff', boxSizing: 'border-box' }} />
        <Search size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
        {value && <button onClick={() => { onChange(''); setQuery(''); }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>}
      </div>
      {isOpen && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1f2937' }}>
                <div style={{fontWeight: '500'}}>{opt.name}</div>
                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>{opt.type === 'terminal' ? 'Terminal' : 'Stop Point'} • {opt.barangay}</div>
            </div>
          )) : <div style={{ padding: '10px', color: '#9ca3af' }}>No matches found</div>}
        </div>
      )}
    </div>
  );
};

const CollapsibleSection = ({ title, children, defaultOpen = false, level = 1, icon: Icon, rightLabel = null }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const bg = level === 1 ? '#ffffff' : '#f9fafb';
    const border = '1px solid #e5e7eb';
    
    return (
        <div style={{ border: border, borderRadius: '8px', marginBottom: level === 1 ? '20px' : '10px', backgroundColor: bg, overflow: 'hidden' }}>
            <div onClick={() => setIsOpen(!isOpen)} style={{ padding: level === 1 ? '16px' : '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: level === 1 ? 'bold' : '500', color: '#1f2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{Icon && <Icon size={18} color="#6b7280"/>}{title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{rightLabel && <span style={{fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal'}}>{rightLabel}</span>}{isOpen ? <ChevronDown size={20} color="#9ca3af"/> : <ChevronRight size={20} color="#9ca3af"/>}</div>
            </div>
            {isOpen && <div style={{ padding: level === 1 ? '0 16px 16px 16px' : '0 12px 12px 12px', borderTop: isOpen ? '1px solid #f3f4f6' : 'none' }}>{children}</div>}
        </div>
    );
};

// --- INLINE ROUTE EDITOR ---
const RouteCard = ({ route, stops, onDelete, onMapSelect, onUpdate, highlightTerm }) => {
    const [localStops, setLocalStops] = useState(route.waypoints || []);
    const [isModified, setIsModified] = useState(false);
    const dragItem = useRef();
    const dragOverItem = useRef();

    useEffect(() => { setLocalStops(route.waypoints || []); setIsModified(false); }, [route]);

    const handleStopChange = (index, value) => {
        const newStops = [...localStops];
        newStops[index] = value;
        setLocalStops(newStops);
        setIsModified(true);
    };

    const addStopSlot = () => {
        const newStops = [...localStops];
        if (newStops.length >= 2) newStops.splice(newStops.length - 1, 0, '');
        else newStops.push('');
        setLocalStops(newStops);
        setIsModified(true);
    };

    const removeStopSlot = (index) => {
        if (localStops.length <= 2) return;
        const newStops = localStops.filter((_, i) => i !== index);
        setLocalStops(newStops);
        setIsModified(true);
    };

    const dragStart = (e, position) => { dragItem.current = position; e.dataTransfer.effectAllowed = "move"; };
    const dragEnter = (e, position) => { dragOverItem.current = position; e.preventDefault(); };
    const drop = (e) => {
        const copyListItems = [...localStops];
        const dragItemContent = copyListItems[dragItem.current];
        copyListItems.splice(dragItem.current, 1);
        copyListItems.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setLocalStops(copyListItems);
        setIsModified(true);
    };

    const handleSave = async () => {
        const validStops = localStops.filter(id => id !== '' && id !== null);
        if (validStops.length < 2) return alert("Route needs at least 2 stops.");
        
        const { error } = await supabase.from('routes').update({ 
            waypoints: validStops,
            source: validStops[0],
            target: validStops[validStops.length - 1]
        }).eq('id', route.id);

        if (error) console.error("Error saving:", error);
        else {
            setIsModified(false);
            onUpdate(); 
        }
    };

    return (
        <div style={{ border: `1px solid ${getRouteColor(route.mode)}`, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getRouteColor(route.mode) }}></div>
                        <HighlightText text={route.route_name || 'Unnamed Route'} highlight={highlightTerm} />
                        {route.strict_stops && <span style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>STRICT</span>}
                    </div>
                    <button onClick={() => onDelete(route.id, route.route_name)} style={{ padding: '4px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18}/></button>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14}/> {route.source_stop?.name} <ChevronRight size={14}/> {route.target_stop?.name}
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.85rem' }}>
                <div style={{display:'flex', flexDirection:'column'}}><span style={{fontSize:'0.75rem', color:'#94a3b8'}}>ETA</span><span style={{fontWeight:'600', color:'#334155'}}><Clock size={12} style={{marginRight:'4px', verticalAlign:'middle'}}/>{route.eta_minutes}m</span></div>
                <div style={{display:'flex', flexDirection:'column'}}><span style={{fontSize:'0.75rem', color:'#94a3b8'}}>Distance</span><span style={{fontWeight:'600', color:'#334155'}}><Ruler size={12} style={{marginRight:'4px', verticalAlign:'middle'}}/>{(route.distance_meters / 1000).toFixed(2)}km</span></div>
                <div style={{display:'flex', flexDirection:'column'}}><span style={{fontSize:'0.75rem', color:'#94a3b8'}}>Fare</span><span style={{fontWeight:'600', color: route.fare === 0 ? '#16a34a' : '#334155'}}>{route.fare === 0 ? 'FREE' : `₱${route.fare}`}</span></div>
                <div style={{display:'flex', flexDirection:'column'}}><span style={{fontSize:'0.75rem', color:'#94a3b8'}}>Discount</span><span style={{fontWeight:'600', color: route.discounted_fare === 0 ? '#16a34a' : '#334155'}}>{route.discounted_fare === 0 ? 'FREE' : `₱${route.discounted_fare}`}</span></div>
            </div>

            {/* INLINE STOP EDITOR */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{...LABEL_STYLE, marginBottom: 0}}>Route Stops</label>
                    <button onClick={addStopSlot} style={{ fontSize: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> Add Waypoint</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {localStops.map((stopId, index) => {
                        const isFirst = index === 0; const isLast = index === localStops.length - 1;
                        return (
                            <div key={index} draggable onDragStart={(e) => dragStart(e, index)} onDragEnter={(e) => dragEnter(e, index)} onDragEnd={drop} onDragOver={(e) => e.preventDefault()} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'move' }}>
                                <GripVertical size={20} style={{ color: '#9ca3af' }} />
                                <div style={{ width: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {isFirst ? <div style={{width: 12, height: 12, borderRadius: '50%', background: '#16a34a'}}></div> : isLast ? <MapPin size={18} color="#ef4444" /> : <div style={{width: 10, height: 10, borderRadius: '50%', background: '#9ca3af'}}></div>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <SearchableSelect placeholder={`Select ${isFirst ? 'Origin' : isLast ? 'Destination' : 'Waypoint'}...`} options={stops} value={stopId} onChange={(id) => handleStopChange(index, id)} />
                                </div>
                                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                    <button onClick={() => onMapSelect(route.id, index)} style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}><MapIcon size={16} /></button>
                                    {!isFirst && !isLast && <button onClick={() => removeStopSlot(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}><Trash2 size={18} /></button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {isModified && (
                    <button onClick={handleSave} style={{ marginTop: '16px', width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} /> Save Changes
                    </button>
                )}
            </div>
        </div>
    );
};

// --- TIMEOUT MODAL (HIGH Z-INDEX) ---
const SessionTimeoutModal = ({ onClose }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <LogOut size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '10px' }}>Session Expired</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>You have been logged out due to inactivity. Please log in again to continue.</p>
            <button onClick={onClose} style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>Return to Login</button>
        </div>
    </div>
);

export default function RouteManager() {
  const [activeView, setActiveView] = useState('map'); 
  const [previousView, setPreviousView] = useState(null); 
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [selectionMode, setSelectionMode] = useState(null); 
  const [editingId, setEditingId] = useState(null); 
  const [tempPoint, setTempPoint] = useState(null); 
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [mapInstruction, setMapInstruction] = useState(null); 
  const [hoveredRouteId, setHoveredRouteId] = useState(null); 
  const [deleteTimer, setDeleteTimer] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null); 
  const [isSessionTimeout, setIsSessionTimeout] = useState(false); 
  const [inlineEditTarget, setInlineEditTarget] = useState(null);

  // --- REAL ACTIVITY TRACKER ---
  const lastActivityRef = useRef(Date.now());
  const dragItem = useRef();
  const dragOverItem = useRef();
  const [pendingRouteData, setPendingRouteData] = useState(null);
  const [pendingSlotIndex, setPendingSlotIndex] = useState(null); 
  const [pendingNodeData, setPendingNodeData] = useState(null);
  const [isRelocating, setIsRelocating] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'stop_point', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false },
    routeName: '', transportMode: 'tricycle', routeStops: [], 
    eta: '15', fare: '15', discountedFare: '12', barangay: '', isFreeRide: false
  });

  // Track User Events to Reset Timer
  useEffect(() => {
    const handleUserActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    
    const INACTIVITY_LIMIT_MS = 3 * 60 * 1000; // 3 mins
    const WARNING_BEFORE_MS = 10000; // 10s

    const interval = setInterval(() => {
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime >= INACTIVITY_LIMIT_MS) {
            setIsSessionTimeout(true);
            setNotification(null); // Clear warning when modal shows
        } else if (idleTime >= (INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS)) {
            if (!isSessionTimeout) {
                const remaining = Math.ceil((INACTIVITY_LIMIT_MS - idleTime) / 1000);
                // Persistent Sticky Notification
                setNotification({ message: `Session expiring in ${remaining}s due to inactivity. Move mouse to cancel.`, type: 'warning', sticky: true });
            }
        } else {
             // Clear warning if user becomes active again
             setNotification(prev => (prev?.type === 'warning' ? null : prev));
        }
    }, 1000);

    return () => {
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity);
        clearInterval(interval);
    };
  }, [isSessionTimeout]);

  // General Fetching
  useEffect(() => { fetchData(); }, []);
  
  // Notification Auto-Dismiss (Skip if sticky)
  useEffect(() => { 
      if (notification && !notification.sticky) { 
          const timer = setTimeout(() => setNotification(null), 3000); 
          return () => clearTimeout(timer); 
      } 
  }, [notification]);

  // FORCE LOGOUT HANDLER
  const handleForceLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/'; // Hard redirect to Login
  };

  const fetchData = async () => {
    const { data: sData } = await supabase.from('stops').select('*, lat, lng');
    setStops(sData || []);
    const { data: rData } = await supabase.from('routes').select(`*, source_stop:stops!routes_source_fkey(name), target_stop:stops!routes_target_fkey(name)`);
    const processedRoutes = (rData || []).map(r => ({ ...r, parsedPolyline: r.polyline ? JSON.parse(r.polyline) : null }));
    setRoutes(processedRoutes);
  };

  const handleRouteUpdate = () => { fetchData(); showNotification("Route updated successfully!", "success"); };
  const showNotification = (message, type = 'info', sticky = false) => { setNotification({ message, type, sticky }); };

  const getGroupedTerminals = () => {
      const query = searchTerm.toLowerCase();
      const terminals = stops.filter(s => {
          if (s.type !== 'terminal') return false;
          // Deep Search: Check Terminal Name OR Barangay OR Associated Routes
          const nameMatch = s.name?.toLowerCase().includes(query);
          const barangayMatch = s.barangay?.toLowerCase().includes(query);
          
          // Check if ANY route in this terminal matches the search
          const terminalRoutes = routes.filter(r => r.source === s.id || r.target === s.id);
          const routeMatch = terminalRoutes.some(r => r.route_name?.toLowerCase().includes(query));

          return query === '' || nameMatch || barangayMatch || routeMatch;
      });
      const grouped = {};
      terminals.forEach(t => { const bg = t.barangay || 'Unassigned'; if (!grouped[bg]) grouped[bg] = []; grouped[bg].push(t); });
      return grouped;
  };

  const getRoutesForTerminal = (terminalId) => {
      return routes.filter(r => r.source === terminalId || r.target === terminalId || (r.waypoints && r.waypoints.includes(terminalId)));
  };

  const getUniqueBarangays = () => {
      const existing = stops.map(s => s.barangay).filter(b => b && b !== 'Unassigned');
      return ['Unassigned', ...[...new Set(existing)].sort()];
  };

  // --- MAP INTERACTION ---
  const MapClicker = () => {
    useMapEvents({
      click: (e) => {
        if (!isModalOpen) {
          setTempPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          if (mapInstruction && !isRelocating) setMapInstruction(null);
          if (isRelocating) { setIsRelocating(false); setMapInstruction(null); openModal('ADD_NODE', null, true); } 
          else { openModal('ADD_NODE'); }
        }
      }
    });
    return null;
  };

  const openModal = (mode, data = null, isResumeRelocation = false, prefillTerminal = null) => {
    setModalMode(mode);
    let targetId = data ? data.id : (editingId || null);

    if (mode === 'ADD_NODE') {
      if (isResumeRelocation && pendingNodeData) { setFormData(pendingNodeData); setPendingNodeData(null); } 
      else if (data) {
        const isTri = data.allowed_vehicles?.includes('tricycle') || false;
        const isJeep = data.allowed_vehicles?.includes('jeep') || false;
        const isBus = data.allowed_vehicles?.includes('bus') || false;
        const isEbus = data.allowed_vehicles?.includes('ebus') || false;
        setFormData({ 
          name: data.name, type: data.type || 'stop_point', barangay: data.barangay || 'Unassigned',
          vehicles: { tricycle: isTri, jeep: isJeep, bus: isBus, ebus: isEbus },
          routeName: '', transportMode: 'tricycle', routeStops: [], eta: '15', fare: '15', discountedFare: '12', isFreeRide: false, isStrictStops: false
        });
        setTempPoint({ lat: data.lat, lng: data.lng });
        setFocusLocation({ lat: data.lat, lng: data.lng });
      } else {
        setFormData({ name: '', type: 'stop_point', barangay: 'Unassigned', vehicles: { tricycle: true, jeep: false, bus: false, ebus: false }, routeName: '', transportMode: 'tricycle', routeStops: [], eta: '15', fare: '15', discountedFare: '12', isFreeRide: false, isStrictStops: false });
      }
    } else if (mode === 'ADD_ROUTE') {
      if (data) {
        let stopsToLoad = data.waypoints; 
        if (!stopsToLoad || stopsToLoad.length === 0) stopsToLoad = [data.source, data.target];
        const isFree = parseFloat(data.fare) === 0 && data.mode === 'bus';
        setFormData({ 
            routeName: data.route_name, transportMode: data.mode, routeStops: stopsToLoad, 
            eta: data.eta_minutes || '', fare: data.fare || '', discountedFare: data.discounted_fare || '',
            name: '', type: 'stop_point', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false }, isFreeRide: isFree, isStrictStops: data.strict_stops || false
        });
      } else {
        if (pendingRouteData) { const { _preservedId, ...rest } = pendingRouteData; setFormData(rest); if (_preservedId) targetId = _preservedId; setPendingRouteData(null); setPendingSlotIndex(null); } 
        else { 
            const initialStops = prefillTerminal ? [prefillTerminal.id, ''] : ['', ''];
            setFormData({ routeName: '', transportMode: 'tricycle', routeStops: initialStops, eta: '15', fare: '15', discountedFare: '12', name: '', type: 'stop_point', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false }, isFreeRide: false, isStrictStops: false }); 
        }
      }
    }
    setEditingId(targetId);
    setIsModalOpen(true);
  };

  const handleCreateStopFromRoute = (targetIndex) => {
      setPendingRouteData({ ...formData, _preservedId: editingId });
      setPendingSlotIndex(targetIndex);
      setSelectionMode(null);
      setIsModalOpen(false);
      if (activeView !== 'map') setPreviousView(activeView);
      setActiveView('map'); 
      setMapInstruction("Click on the map to place the new Stop Point");
  };

  const handleRelocateClick = () => {
      setPendingNodeData(formData);
      setIsRelocating(true);
      setIsModalOpen(false);
      if (activeView !== 'map') setPreviousView(activeView);
      setActiveView('map');
      if (tempPoint) setFocusLocation({ lat: tempPoint.lat, lng: tempPoint.lng });
      setMapInstruction("Click new location on the map for this stop");
  };

  const handleNodeSaved = (newNodeId) => {
      if (pendingRouteData) {
          if (pendingSlotIndex !== null && newNodeId) {
             const newStops = [...pendingRouteData.routeStops];
             newStops[pendingSlotIndex] = newNodeId;
             pendingRouteData.routeStops = newStops;
          }
          openModal('ADD_ROUTE');
      }
  };

  const handleCancelInstruction = () => {
      setMapInstruction(null); 
      const wasSelecting = selectionMode !== null;
      setSelectionMode(null); setPendingSlotIndex(null); setIsRelocating(false); setPendingNodeData(null); setInlineEditTarget(null);

      if (pendingRouteData || wasSelecting) { openModal('ADD_ROUTE'); } 
      else if (editingId && !pendingRouteData) { const originalStop = stops.find(s => s.id === editingId); if (originalStop) openModal('ADD_NODE', originalStop); } 
      else { if (previousView) { setActiveView(previousView); setPreviousView(null); } }
  };

  const handleFareChange = (e) => {
      const val = e.target.value;
      setFormData(prev => {
          const numericFare = parseFloat(val);
          const autoDiscount = isNaN(numericFare) ? '' : Math.round(numericFare * 0.80);
          return { ...prev, fare: val, discountedFare: val === '' ? '' : autoDiscount };
      });
  };

  const toggleFreeRide = () => {
    setFormData(prev => {
        const isNowFree = !prev.isFreeRide;
        return { ...prev, isFreeRide: isNowFree, fare: isNowFree ? 0 : (prev.fare || '15'), discountedFare: isNowFree ? 0 : (prev.discountedFare || '12'), transportMode: isNowFree ? 'bus' : prev.transportMode };
    });
  };

  const toggleStrictStops = () => {
      setFormData(prev => ({ ...prev, isStrictStops: !prev.isStrictStops }));
  };

  const handleRouteStopChange = (index, value) => { const newStops = [...formData.routeStops]; newStops[index] = value; setFormData({ ...formData, routeStops: newStops }); };
  const addRouteStopSlot = () => { const newStops = [...formData.routeStops]; if (newStops.length >= 2) { newStops.splice(newStops.length - 1, 0, ''); } else { newStops.push(''); } setFormData({ ...formData, routeStops: newStops }); };
  const removeRouteStopSlot = (index) => { if (formData.routeStops.length <= 2) return; const newStops = formData.routeStops.filter((_, i) => i !== index); setFormData({ ...formData, routeStops: newStops }); };

  const dragStart = (e, position) => { dragItem.current = position; e.dataTransfer.effectAllowed = "move"; };
  const dragEnter = (e, position) => { dragOverItem.current = position; e.preventDefault(); };
  const drop = (e) => { const copyListItems = [...formData.routeStops]; const dragItemContent = copyListItems[dragItem.current]; copyListItems.splice(dragItem.current, 1); copyListItems.splice(dragOverItem.current, 0, dragItemContent); dragItem.current = null; dragOverItem.current = null; setFormData({ ...formData, routeStops: copyListItems }); };

  const handlePinClick = (stop) => { 
      if (selectionMode !== null && !inlineEditTarget) { handleRouteStopChange(selectionMode, stop.id); setSelectionMode(null); setMapInstruction(null); openModal('ADD_ROUTE'); }
      else if (inlineEditTarget) {
          const { routeId, stopIndex } = inlineEditTarget;
          const targetRoute = routes.find(r => r.id === routeId);
          if (targetRoute) {
              const newWaypoints = [...(targetRoute.waypoints || [])];
              newWaypoints[stopIndex] = stop.id;
              supabase.from('routes').update({ waypoints: newWaypoints, source: newWaypoints[0], target: newWaypoints[newWaypoints.length - 1] }).eq('id', routeId).then(() => {
                  fetchData(); setInlineEditTarget(null); setActiveView('terminals'); setMapInstruction(null);
              });
          }
      }
  };
  
  const initiateSelectionMode = (index) => { setSelectionMode(index); if (activeView !== 'map') setPreviousView(activeView); setActiveView('map'); setIsModalOpen(false); setMapInstruction(`Select Stop #${index + 1} from map`); };
  const handleInlineMapSelect = (routeId, stopIndex) => { setInlineEditTarget({ routeId, stopIndex }); setPreviousView('terminals'); setActiveView('map'); setMapInstruction("Select a stop from the map for this route."); };

  const saveNode = async () => {
    if (!formData.name) return showNotification("Location Name is required", "error");
    const vehicleArray = Object.keys(formData.vehicles).filter(k => formData.vehicles[k]);
    const finalBarangay = formData.barangay && formData.barangay.trim() !== '' ? formData.barangay : 'Unassigned';
    const payload = { name: formData.name, type: formData.type, barangay: finalBarangay, allowed_vehicles: ['terminal'].includes(formData.type) ? vehicleArray : [] };

    let error, savedId;
    if (editingId) {
      const { error: err } = await supabase.from('stops').update(payload).eq('id', editingId);
      if (tempPoint) { await supabase.from('stops').update({ location: `POINT(${tempPoint.lng} ${tempPoint.lat})`, lat: tempPoint.lat, lng: tempPoint.lng }).eq('id', editingId); }
      error = err; savedId = editingId;
    } else {
      const { data, error: err } = await supabase.from('stops').insert({ ...payload, location: `POINT(${tempPoint.lng} ${tempPoint.lat})` }).select();
      error = err; if (data && data.length > 0) savedId = data[0].id;
    }

    if (error) { showNotification(error.message, "error"); } 
    else { await logAction(editingId ? 'Updated Node' : 'Created Node', `Name: ${formData.name}`); showNotification("Location saved!", "success"); closeModal(); await fetchData(); handleNodeSaved(savedId); }
  };

  const saveRoute = async () => {
    const validStops = formData.routeStops.filter(id => id !== '' && id !== null);
    if (validStops.length < 2) return showNotification("Route requires at least an Origin and Destination.", "error");
    const startId = validStops[0]; const endId = validStops[validStops.length - 1];
    const stopObjects = validStops.map(id => stops.find(s => s.id === parseInt(id))).filter(Boolean);
    const coordString = stopObjects.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    
    try {
      const res = await fetch(url); const data = await res.json();
      const route = data.routes ? data.routes[0] : null;
      const startName = stops.find(s => s.id === parseInt(startId))?.name;
      const endName = stops.find(s => s.id === parseInt(endId))?.name;

      const payload = {
        route_name: formData.routeName || `${startName} - ${endName}`, source: startId, target: endId, mode: formData.transportMode,
        polyline: route ? JSON.stringify(route.geometry) : null, distance_meters: route ? route.distance : 0, cost: route ? route.duration : 0,
        eta_minutes: formData.eta ? parseInt(formData.eta) : 15, fare: formData.fare ? parseFloat(formData.fare) : 15,
        discounted_fare: formData.discountedFare ? parseFloat(formData.discountedFare) : 12, waypoints: validStops, strict_stops: formData.isStrictStops
      };

      let error;
      if (editingId) { const { error: err } = await supabase.from('routes').update(payload).eq('id', editingId); error = err; } 
      else { const { error: err } = await supabase.from('routes').insert(payload); error = err; }
      
      if (error) {
          if (error.code === '42703' || error.message?.includes('waypoints')) { 
              delete payload.waypoints;
              const { error: retryError } = editingId ? await supabase.from('routes').update(payload).eq('id', editingId) : await supabase.from('routes').insert(payload);
              if (retryError) showNotification(retryError.message, "error");
              else { await logAction(editingId ? 'Updated Route' : 'Created Route', `Name: ${formData.routeName}`); showNotification("Route saved! (Waypoints ignored due to DB)", "success"); closeModal(); fetchData(); }
          } else { showNotification(error.message, "error"); }
      } else { await logAction(editingId ? 'Updated Route' : 'Created Route', `Name: ${formData.routeName}`); showNotification("Route saved successfully!", "success"); closeModal(); fetchData(); }
    } catch (err) { console.error(err); showNotification("Routing API failed", "error"); }
  };

  const deleteItemWithConfirmation = (table, id, name) => {
    setDeleteTimer(5);
    setConfirmDialog({
        message: `Are you sure you want to permanently delete '${name}'?`,
        onConfirm: async () => {
            await supabase.from(table).delete().eq('id', id); await logAction('Deleted Item', `Table: ${table}, ID: ${id}, Name: ${name}`);
            fetchData(); showNotification(`'${name}' deleted.`, "success"); setDeleteTimer(null);
        },
        onCancel: () => { setDeleteTimer(null); }
    });
  };

  useEffect(() => {
    if (deleteTimer === null) return;
    if (deleteTimer > 0) { const timeout = setTimeout(() => { setDeleteTimer(prev => prev - 1); }, 1000); return () => clearTimeout(timeout); }
  }, [deleteTimer]);

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setTempPoint(null); setSelectionMode(null); setIsRelocating(false); setPendingNodeData(null); setDeleteTimer(null); setInlineEditTarget(null); if (previousView) { setActiveView(previousView); setPreviousView(null); } };

  // SECURE RENDER: If Timeout, HIDE Dashboard content entirely
  if (isSessionTimeout) {
      return <SessionTimeoutModal onForceLogout={handleForceLogout} />;
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{styles}</style>
      
      {/* NOTIFICATION (BOTTOM RIGHT) */}
      {notification && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, backgroundColor: notification.type === 'error' ? '#fee2e2' : notification.type === 'warning' ? '#fffbeb' : '#dcfce7', border: `1px solid ${notification.type === 'error' ? '#ef4444' : notification.type === 'warning' ? '#f59e0b' : '#22c55e'}`, color: notification.type === 'error' ? '#b91c1c' : notification.type === 'warning' ? '#b45309' : '#15803d', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideIn 0.3s ease-out', pointerEvents: 'auto', minWidth: '300px' }}>
            {notification.type === 'error' ? <AlertCircle size={24}/> : notification.type === 'warning' ? <AlertTriangle size={24} /> : <CheckCircle size={24}/>} 
            <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>{notification.type === 'error' ? 'Error' : notification.type === 'warning' ? 'Warning' : 'Success'}</span>
                <HighlightText text={notification.message} highlight={null} />
            </div>
            <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', opacity: 0.6 }}><X size={18}/></button>
          </div>
      )}

      {confirmDialog && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: deleteTimer !== null && deleteTimer > 0 ? '#f97316' : '#ef4444' }}>
                      <AlertTriangle size={24} /> <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Confirm Deletion</h3>
                  </div>
                  <p style={{ color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>{confirmDialog.message}</p>
                  {deleteTimer !== null && deleteTimer > 0 && <div style={{ width: '100%', height: '4px', backgroundColor: '#fed7aa', marginBottom: '20px', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', backgroundColor: '#f97316', width: `${(deleteTimer/5)*100}%`, transition: 'width 1s linear' }}></div></div>}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { confirmDialog.onCancel(); setConfirmDialog(null); }} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>Cancel</button>
                      <button onClick={() => { if (deleteTimer === 0) { confirmDialog.onConfirm(); setConfirmDialog(null); } }} disabled={deleteTimer > 0} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: deleteTimer > 0 ? '#fca5a5' : '#ef4444', color: 'white', cursor: deleteTimer > 0 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>{deleteTimer > 0 ? `Wait ${deleteTimer}s` : 'Confirm Delete'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* SIDEBAR */}
      <div style={{ width: '320px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 20px 0' }}>Route Manager</h2>
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <button onClick={() => setActiveView('map')} style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'map' ? '#fff' : 'transparent', color: activeView === 'map' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><MapIcon size={14} /> Map</button>
            <button onClick={() => setActiveView('terminals')} style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'terminals' ? '#fff' : 'transparent', color: activeView === 'terminals' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'terminals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><List size={14} /> List</button>
          </div>
          {activeView === 'map' && <button onClick={() => openModal('ADD_ROUTE')} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Network size={18}/> New Route</button>}
        </div>
        {activeView === 'map' ? (
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {routes.map(r => (
                    <div key={r.id} onMouseEnter={() => setHoveredRouteId(r.id)} onMouseLeave={() => setHoveredRouteId(null)} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: hoveredRouteId === r.id ? '#eff6ff' : '#f9fafb', borderLeft: `4px solid ${getRouteColor(r.mode)}`, cursor: 'default', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1f2937' }}>{r.route_name || 'Unnamed'}</span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => openModal('ADD_ROUTE', r)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                        <button onClick={() => deleteItemWithConfirmation('routes', r.id, r.route_name)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{r.source_stop?.name} → {r.target_stop?.name}</div>
                    </div>
                ))}
            </div>
        ) : ( <div style={{ padding: '24px', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}><LayoutGrid size={48} style={{ marginBottom: '10px', opacity: 0.2 }} /><p>Manage Terminal hierarchies here.</p></div> )}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
          {activeView === 'map' && (
             <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <MapContainer center={[14.6, 121.0]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClicker />
                    <MapController focusLocation={focusLocation} />
                    {!isRelocating && routes.map(r => r.parsedPolyline && <GeoJSON key={`route-${r.id}-${hoveredRouteId === r.id ? 'focused' : 'dimmed'}`} data={r.parsedPolyline} style={() => ({ color: getRouteColor(r.mode), weight: hoveredRouteId === r.id ? 8 : 5, opacity: hoveredRouteId ? (hoveredRouteId === r.id ? 1 : 0.1) : 0.8 })} />)}
                    {!isRelocating && stops.map(s => (
                        <Marker key={s.id} position={[s.lat, s.lng]} icon={getIcon(s)} eventHandlers={{ click: () => handlePinClick(s) }}>
                        {selectionMode === null && <Popup><strong>{s.name}</strong><br/><span style={{fontSize:'0.8rem', color: '#666', textTransform:'capitalize'}}>{s.type.replace('_', ' ')}</span><div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}><button onClick={() => openModal('ADD_NODE', s)} style={{ flex:1, color: 'white', background: '#3b82f6', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Edit</button><button onClick={() => deleteItemWithConfirmation('stops', s.id, s.name)} style={{ flex:1, color: 'white', background: '#ef4444', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Delete</button></div></Popup>}
                        </Marker>
                    ))}
                    {isRelocating && tempPoint && <Marker position={[tempPoint.lat, tempPoint.lng]} icon={getIcon({ type: formData.type, allowed_vehicles: Object.keys(formData.vehicles).filter(k => formData.vehicles[k]) })} zIndexOffset={1000} />}
                </MapContainer>
                {mapInstruction && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px 8px 16px', borderRadius: '50px', fontWeight: '500', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(4px)' }}><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MousePointer2 size={16} color="#3b82f6" /> {mapInstruction}</span><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><button onClick={handleCancelInstruction} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', fontWeight: '600' }}>Cancel</button>{selectionMode !== null && <button onClick={() => handleCreateStopFromRoute(selectionMode)} style={{ background: '#10b981', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><PlusCircle size={14} /> Create Stop</button>}</div></div>}
             </div>
          )}

          {activeView === 'terminals' && (
              <div className="custom-scrollbar" style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '40px', backgroundColor: '#f9fafb' }}>
                 <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'start' }}><Info size={20} color="#3b82f6" style={{ marginTop: '2px' }} /><div><h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#1e40af', fontWeight: 'bold' }}>Managing Routes</h4><p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a' }}>Use the "New Route" button to build new paths. You can drag and drop stops within the route cards to reorder them efficiently.</p></div></div>
                    <div style={{ marginBottom: '30px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h2 style={{ fontSize: '1.5rem', color: '#111827', margin: 0 }}>Terminals & Routes</h2></div><div style={{ position: 'relative' }}><Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 10 }} /><input type="text" placeholder="Search terminal name or barangay..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '1rem', color: '#1f2937', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', boxSizing: 'border-box' }} /></div></div>
                    {Object.keys(getGroupedTerminals()).length > 0 ? (
                        Object.entries(getGroupedTerminals()).map(([barangayName, terminals]) => (
                            <CollapsibleSection key={barangayName} title={<HighlightText text={barangayName} highlight={searchTerm} />} level={1} defaultOpen={true} rightLabel={`${terminals.length} Terminals`}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                                    {terminals.map(terminal => {
                                        const terminalColor = getTerminalColor(terminal.name);
                                        const routesInTerminal = getRoutesForTerminal(terminal.id);
                                        return (
                                            <div key={terminal.id} style={{ padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', borderLeft: `6px solid ${terminalColor}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f3f4f6', paddingBottom: '15px' }}>
                                                    <div><h3 style={{ margin: '0 0 6px 0', fontWeight: '800', fontSize: '1.25rem', color: '#1f2937' }}><HighlightText text={terminal.name} highlight={searchTerm} /></h3><div style={{ display: 'flex', gap: '8px' }}>{terminal.allowed_vehicles?.map(v => <span key={v} style={{ background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' }}>{v}</span>)}</div></div>
                                                    <div style={{ display: 'flex', gap: '8px' }}><button onClick={() => { setPreviousView('terminals'); setActiveView('map'); openModal('ADD_ROUTE', null, false, terminal); }} style={{ padding: '8px', color: '#10b981', background: '#ecfdf5', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}><PlusCircle size={16} /> New Route</button><button onClick={() => { setPreviousView('terminals'); setActiveView('map'); openModal('ADD_NODE', terminal); }} style={{ padding: '8px', color: '#3b82f6', background: '#eff6ff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Edit2 size={18}/></button><button onClick={() => deleteItemWithConfirmation('stops', terminal.id, terminal.name)} style={{ padding: '8px', color: '#ef4444', background: '#fef2f2', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Trash2 size={18}/></button></div>
                                                </div>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Routes ({routesInTerminal.length})</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {routesInTerminal.length > 0 ? routesInTerminal.map(r => <RouteCard key={r.id} route={r} stops={stops} onDelete={deleteItemWithConfirmation} onMapSelect={handleInlineMapSelect} onUpdate={handleRouteUpdate} highlightTerm={searchTerm} />) : <div style={{ fontStyle: 'italic', color: '#9ca3af', padding: '10px' }}>No routes configured.</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CollapsibleSection>
                        ))
                    ) : ( <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #e5e7eb' }}><Search size={48} style={{ opacity: 0.2, marginBottom: '16px' }} /><h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No matches found</h3><p style={{ margin: 0, fontSize: '0.9rem' }}>We couldn't find any terminals matching "{searchTerm}"</p></div> )}
                 </div>
              </div>
          )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: (selectionMode !== null || mapInstruction) ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: (selectionMode !== null || mapInstruction) ? 'none' : 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, pointerEvents: (selectionMode !== null || mapInstruction) ? 'none' : 'auto', animation: 'modalFadeIn 0.2s ease-out' }}>
          <div className="custom-scrollbar scrollbar-stable" style={{ display: (selectionMode !== null || mapInstruction) ? 'none' : 'block', backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '500px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{modalMode === 'ADD_NODE' ? 'Location Details' : 'Route Builder'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>
            {modalMode === 'ADD_NODE' ? (
                <>
                    <label style={LABEL_STYLE}>Location Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Central Market" />
                    <SuggestionInput label="Barangay" value={formData.barangay} onChange={(val) => setFormData({...formData, barangay: val})} options={getUniqueBarangays()} placeholder="e.g. Pasong Tamo" />
                    <label style={LABEL_STYLE}>Location Type</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}><option value="stop_point">Stop Point</option><option value="terminal">Terminal</option><option disabled>── Establishments ──</option><option value="school">School / University</option><option value="hospital">Hospital / Clinic</option><option value="mall">Mall / Market</option><option value="restaurant">Restaurant / Food</option></select>
                    {formData.type === 'terminal' && (
                        <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                            <label style={{...LABEL_STYLE, marginBottom: '12px'}}>Terminal Vehicles</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '0.9rem' }}><input type="checkbox" checked={formData.vehicles.tricycle} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, tricycle: e.target.checked}})} /> Tricycle</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '0.9rem' }}><input type="checkbox" checked={formData.vehicles.jeep} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, jeep: e.target.checked}})} /> Jeep</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '0.9rem' }}><input type="checkbox" checked={formData.vehicles.bus} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, bus: e.target.checked}})} /> Bus</label>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        {editingId && <button onClick={handleRelocateClick} title="Move pin" style={{ flex: 0.5, padding: '12px', background: '#e0f2fe', color: '#0ea5e9', borderRadius: '8px', border: '1px solid #bae6fd', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Crosshair size={20} /></button>}
                        <button onClick={closeModal} style={{ flex: 1, padding: '12px', background: '#f9fafb', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                        <button onClick={saveNode} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update' : 'Save Location'}</button>
                    </div>
                </>
            ) : (
                <>
                    <label style={LABEL_STYLE}>Route Name</label><input type="text" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Blue Line" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                        <div><label style={LABEL_STYLE}>ETA (min)</label><input type="number" value={formData.eta} onChange={e => setFormData({...formData, eta: e.target.value})} style={{...COMMON_INPUT_STYLE, marginBottom: '20px'}} placeholder="15" /></div>
                        <div><label style={LABEL_STYLE}>Fare (₱)</label><input type="text" disabled={formData.isFreeRide} value={formData.isFreeRide ? '' : formData.fare} onChange={handleFareChange} style={{...COMMON_INPUT_STYLE, marginBottom: '20px', backgroundColor: formData.isFreeRide ? '#f3f4f6' : 'white'}} placeholder={formData.isFreeRide ? "FREE" : "15"} /></div>
                        <div><label style={LABEL_STYLE}>Disc. (₱)</label><input type="text" disabled={formData.isFreeRide} value={formData.isFreeRide ? '' : formData.discountedFare} onChange={e => setFormData({...formData, discountedFare: e.target.value})} style={{...COMMON_INPUT_STYLE, marginBottom: '20px', backgroundColor: formData.isFreeRide ? '#f3f4f6' : 'white'}} placeholder={formData.isFreeRide ? "FREE" : "12"} /></div>
                        <div style={{ marginBottom: '20px', display:'flex', flexDirection:'column', gap:'8px' }}>
                            <button onClick={toggleFreeRide} style={{ width: '100%', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: formData.isFreeRide ? '#10b981' : 'transparent', color: formData.isFreeRide ? 'white' : '#6b7280', border: formData.isFreeRide ? 'none' : '1px solid #d1d5db' }}><Ticket size={16} /> Free</button>
                            <button onClick={toggleStrictStops} style={{ width: '100%', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: formData.isStrictStops ? '#ef4444' : 'transparent', color: formData.isStrictStops ? 'white' : '#ef4444', border: formData.isStrictStops ? 'none' : '1px solid #fecaca' }}><Ban size={16} /> Strict Stops</button>
                        </div>
                    </div>
                    <label style={LABEL_STYLE}>Transport Mode</label><select value={formData.transportMode} onChange={e => setFormData({...formData, transportMode: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}><option value="tricycle">🟢 Tricycle</option><option value="jeep">🟣 Jeepney</option><option value="bus">🔵 Bus</option></select>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><label style={{...LABEL_STYLE, marginBottom: 0}}>Route Stops</label><button onClick={addRouteStopSlot} style={{ fontSize: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> Add Waypoint</button></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {formData.routeStops.map((stopId, index) => {
                                const isFirst = index === 0; const isLast = index === formData.routeStops.length - 1;
                                return (
                                    <div key={index} draggable onDragStart={(e) => dragStart(e, index)} onDragEnter={(e) => dragEnter(e, index)} onDragEnd={drop} onDragOver={(e) => e.preventDefault()} style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'move' }}>
                                        <GripVertical size={20} style={{ color: '#99f6e4' }} />
                                        <div style={{ width: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{isFirst ? <div style={{width: 12, height: 12, borderRadius: '50%', background: '#16a34a'}}></div> : isLast ? <MapPin size={18} color="#ef4444" /> : <div style={{width: 10, height: 10, borderRadius: '50%', background: '#9ca3af'}}></div>}</div>
                                        <div style={{ flex: 1 }}><SearchableSelect placeholder={`Select ${isFirst ? 'Origin' : isLast ? 'Destination' : 'Waypoint'}...`} options={stops} value={stopId} onChange={(id) => handleRouteStopChange(index, id)} /></div>
                                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                            <button onClick={() => handleCreateStopFromRoute(index)} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}><Plus size={16} /></button>
                                            <button onClick={() => initiateSelectionMode(index)} style={{ background: selectionMode === index ? '#3b82f6' : '#f3f4f6', color: selectionMode === index ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer' }}><MapIcon size={16} /></button>
                                            {!isFirst && !isLast && <button onClick={() => removeRouteStopSlot(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}><Trash2 size={18} /></button>}
                                            {(isFirst || isLast) && <div style={{width: 34}}></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <button onClick={closeModal} style={{ flex: 1, padding: '12px', background: '#f9fafb', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                        <button onClick={saveRoute} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update Route' : 'Create Route'}</button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
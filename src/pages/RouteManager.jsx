import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { 
  Trash2, Network, X, Search, UploadCloud, Edit2, 
  ChevronDown, ChevronRight, Clock, Banknote, Map as MapIcon, 
  List, LayoutGrid, Tag, Info, CornerDownRight
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- ICONS CONFIG ---
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const StopIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });

// --- HELPER: GENERATE CUSTOM MARKER ICONS ---
// Updated to accept the full stop object to access allowed_vehicles
const getIcon = (stop) => {
  const type = stop.type?.toLowerCase();
  const vehicles = stop.allowed_vehicles || [];
  
  let color = '#3b82f6';
  let innerHTML = '';
  
  if (type === 'terminal') {
      if (vehicles.length > 1) {
          color = '#eab308'; // Yellow (Mixed)
      } else if (vehicles.length === 1) {
          const v = vehicles[0];
          if (v === 'tricycle') color = '#16a34a'; // Green
          else if (v === 'jeep') color = '#7c3aed'; // Violet
          else if (v === 'bus') color = '#1e40af'; // Dark Blue
          else if (v === 'ebus') color = '#0ea5e9'; // Light Blue
          else color = '#10b981'; // Default
      } else {
          color = '#10b981'; // Default Terminal Green
      }
  } else {
      // Standard Colors for other types
      switch (type) {
        case 'school': color = '#f97316'; innerHTML = '🎓'; break;
        case 'hospital': color = '#ef4444'; innerHTML = '🏥'; break;
        case 'mall': color = '#8b5cf6'; innerHTML = '🛍️'; break;
        case 'restaurant': color = '#eab308'; innerHTML = '🍴'; break;
        case 'bus_stop': color = '#2563eb'; innerHTML = '🚌'; break;
        case 'jeep_stop': color = '#7c3aed'; innerHTML = '🚙'; break;
        case 'tricycle_stop': color = '#16a34a'; innerHTML = '🏍️'; break;
        default: color = '#3b82f6';
      }
  }

  if (type === 'stop') {
    return L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color}; 
      width: 24px; height: 24px; 
      border-radius: 50%; 
      border: 2px solid white; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex; justify-content: center; align-items: center;
      color: white; font-size: 14px;
    ">${innerHTML}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// --- GLOBAL STYLES ---
const COMMON_INPUT_STYLE = {
  width: '100%', padding: '10px 12px', marginBottom: '20px', borderRadius: '8px', 
  border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box', 
  color: '#000000', backgroundColor: '#ffffff', outline: 'none'
};

const LABEL_STYLE = {
  display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '0.9rem'
};

const getTerminalLabel = (vehicles) => {
    if (!vehicles) return 'Terminal';
    const types = [];
    if (vehicles.tricycle) types.push('Tricycle');
    if (vehicles.jeep) types.push('Jeep');
    if (vehicles.bus) types.push('Bus');
    if (vehicles.ebus) types.push('E-Bus'); // Added E-Bus label support
    
    if (types.length === 0) return 'Terminal';
    if (types.length === 1) return `${types[0]} Terminal`;
    return `Multi Terminal (${types.join(', ')})`;
};

// --- COMPONENT: SUGGESTION INPUT (For Barangay) ---
const SuggestionInput = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value.toLowerCase()) && opt.toLowerCase() !== value.toLowerCase()
  );

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }} ref={wrapperRef}>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="text"
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        style={COMMON_INPUT_STYLE}
        placeholder={placeholder}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% - 15px)', left: 0, width: '100%', maxHeight: '150px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.map((opt, index) => (
            <div 
              key={index} 
              onClick={() => { onChange(opt); setIsOpen(false); }} 
              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1f2937', fontSize: '0.95rem', backgroundColor: 'white' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- SEARCH COMPONENT (For ID selection) ---
const SearchableSelect = ({ label, options, value, onChange, placeholder }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value) {
      const selected = options.find(o => o.id === parseInt(value));
      if (selected) setQuery(selected.name);
    } else { setQuery(''); }
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }} ref={wrapperRef}>
      <label style={LABEL_STYLE}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text" value={query} onFocus={() => setIsOpen(true)} placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
          style={{ 
            ...COMMON_INPUT_STYLE, 
            marginBottom: 0, 
            paddingLeft: '35px', 
            paddingRight: '35px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}
        />
        <Search size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        {value && (
          <button 
            onClick={() => { onChange(''); setQuery(''); }} 
            style={{ 
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1f2937', fontSize: '0.95rem', backgroundColor: 'white' }}>{opt.name}</div>
          )) : <div style={{ padding: '10px', color: '#9ca3af' }}>No matches found</div>}
        </div>
      )}
    </div>
  );
};

const getRouteColor = (mode) => {
  switch (mode?.toLowerCase()) {
    case 'bus': return '#2563eb';
    case 'jeep': return '#7c3aed';
    default: return '#16a34a';
  }
};

// --- COLLAPSIBLE COMPONENT ---
const CollapsibleSection = ({ title, children, defaultOpen = false, level = 1, icon: Icon, rightLabel = null }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    // Styling based on nesting level
    const bg = level === 1 ? '#ffffff' : '#f9fafb';
    const border = level === 1 ? '1px solid #e5e7eb' : '1px solid #e5e7eb';
    const padding = level === 1 ? '16px' : '12px';
    const margin = level === 1 ? '20px 0' : '0 0 10px 0'; 
    
    return (
        <div style={{ border: border, borderRadius: '8px', marginBottom: margin, backgroundColor: bg, overflow: 'hidden' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                style={{ 
                    padding: padding, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    fontWeight: level === 1 ? 'bold' : '500',
                    color: '#1f2937'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {Icon && <Icon size={18} color="#6b7280"/>}
                    {title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {rightLabel && <span style={{fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal'}}>{rightLabel}</span>}
                   {isOpen ? <ChevronDown size={20} color="#9ca3af"/> : <ChevronRight size={20} color="#9ca3af"/>}
                </div>
            </div>
            {isOpen && (
                <div style={{ padding: level === 1 ? '0 16px 16px 16px' : '0 12px 12px 12px', borderTop: isOpen ? '1px solid #f3f4f6' : 'none' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default function RouteManager() {
  const [activeView, setActiveView] = useState('map'); 
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [selectionMode, setSelectionMode] = useState(null); 
  const [editingId, setEditingId] = useState(null); 
  const [tempPoint, setTempPoint] = useState(null); 
  const fileInputRef = useRef(null); 

  const [formData, setFormData] = useState({
    name: '', type: 'stop', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false }, // Added ebus
    startNode: '', endNode: '', routeName: '', transportMode: 'tricycle',
    barangay: '', eta: '', fare: '', discountedFare: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: sData } = await supabase.from('stops').select('*, lat, lng');
    setStops(sData || []);
    const { data: rData } = await supabase.from('routes').select(`*, source_stop:stops!routes_source_fkey(name), target_stop:stops!routes_target_fkey(name)`);
    setRoutes(rData || []);
  };

  const getGroupedTerminals = () => {
      const terminals = stops.filter(s => s.type === 'terminal');
      const grouped = {};
      
      terminals.forEach(t => {
          const bg = t.barangay || 'Unassigned';
          if (!grouped[bg]) grouped[bg] = [];
          grouped[bg].push(t);
      });
      return grouped;
  };

  const getRoutesForTerminal = (terminalId) => {
      return routes.filter(r => r.source === terminalId);
  };

  // --- HELPER: GET UNIQUE BARANGAYS FOR SUGGESTIONS ---
  const getUniqueBarangays = () => {
      const existing = stops.map(s => s.barangay).filter(b => b && b !== 'Unassigned');
      const unique = [...new Set(existing)].sort();
      return ['Unassigned', ...unique];
  };

  const MapClicker = () => {
    useMapEvents({
      click: (e) => {
        if (!isModalOpen) {
          setTempPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          openModal('ADD_NODE');
        } else if (selectionMode) {
            alert(`Please select a Pin on the map.`);
        }
      }
    });
    return null;
  };

  const openModal = (mode, data = null) => {
    setModalMode(mode);
    setEditingId(data ? data.id : null);
    
    if (mode === 'ADD_NODE') {
      if (data) {
        const isTri = data.allowed_vehicles?.includes('tricycle') || false;
        const isJeep = data.allowed_vehicles?.includes('jeep') || false;
        const isBus = data.allowed_vehicles?.includes('bus') || false;
        const isEbus = data.allowed_vehicles?.includes('ebus') || false; // Check for ebus
        setFormData({ 
          name: data.name, type: data.type || 'stop', 
          barangay: data.barangay || 'Unassigned',
          vehicles: { tricycle: isTri, jeep: isJeep, bus: isBus, ebus: isEbus },
          startNode: '', endNode: '', routeName: '', transportMode: 'tricycle', eta: '', fare: '', discountedFare: ''
        });
        setTempPoint({ lat: data.lat, lng: data.lng });
      } else {
        setFormData({ name: '', type: 'stop', barangay: 'Unassigned', vehicles: { tricycle: true, jeep: false, bus: false, ebus: false }, startNode: '', endNode: '', routeName: '', transportMode: 'tricycle', eta: '', fare: '', discountedFare: '' });
      }
    } else if (mode === 'ADD_ROUTE') {
      if (data) {
        setFormData({ 
            startNode: data.source, endNode: data.target, routeName: data.route_name, transportMode: data.mode,
            eta: data.eta_minutes || '', 
            fare: data.fare || '',
            discountedFare: data.discounted_fare || '',
            name: '', type: 'stop', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false }
        });
      } else {
        setFormData({ startNode: '', endNode: '', routeName: '', transportMode: 'tricycle', eta: '', fare: '', discountedFare: '', name: '', type: 'stop', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false } });
      }
    }
    setIsModalOpen(true);
  };

  const handleFareChange = (e) => {
      const val = e.target.value;
      setFormData(prev => {
          const numericFare = parseFloat(val);
          const autoDiscount = isNaN(numericFare) ? '' : Math.round(numericFare * 0.80);
          return { ...prev, fare: val, discountedFare: autoDiscount };
      });
  };

  const handlePinClick = (stop) => {
    if (isModalOpen && modalMode === 'ADD_ROUTE' && selectionMode) {
        if (selectionMode === 'origin') {
            setFormData({ ...formData, startNode: stop.id });
        } else if (selectionMode === 'destination') {
            setFormData({ ...formData, endNode: stop.id });
        }
        setSelectionMode(null); 
    }
  };

  const saveNode = async () => {
    if (!formData.name) return alert("Location Name is required");
    const vehicleArray = Object.keys(formData.vehicles).filter(k => formData.vehicles[k]);
    
    const finalBarangay = formData.barangay && formData.barangay.trim() !== '' ? formData.barangay : 'Unassigned';

    const payload = {
      name: formData.name, type: formData.type,
      barangay: finalBarangay,
      allowed_vehicles: formData.type === 'terminal' ? vehicleArray : []
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('stops').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('stops').insert({
        ...payload,
        location: `POINT(${tempPoint.lng} ${tempPoint.lat})`
      });
      error = err;
    }
    if (error) alert(error.message); else { closeModal(); fetchData(); }
  };

  const saveRoute = async () => {
    if (!formData.startNode || !formData.endNode) return alert("Please select start and end points.");
    const start = stops.find(s => s.id === parseInt(formData.startNode));
    const end = stops.find(s => s.id === parseInt(formData.endNode));
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      const route = data.routes ? data.routes[0] : null;
      
      const payload = {
        route_name: formData.routeName || `${start.name} - ${end.name}`,
        source: start.id, target: end.id, mode: formData.transportMode,
        polyline: route ? JSON.stringify(route.geometry) : null,
        distance_meters: route ? route.distance : 0, cost: route ? route.duration : 0,
        eta_minutes: formData.eta ? parseInt(formData.eta) : 0,
        fare: formData.fare ? parseFloat(formData.fare) : 0,
        discounted_fare: formData.discountedFare ? parseFloat(formData.discountedFare) : 0
      };

      let error;
      if (editingId) {
        const { error: err } = await supabase.from('routes').update(payload).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('routes').insert(payload);
        error = err;
      }
      if (error) alert(error.message); else { closeModal(); fetchData(); }
    } catch (err) { console.error(err); alert("Routing API failed"); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm("Import data from OSM?")) return;
    alert("Import logic reserved."); 
  };

  const deleteItem = async (table, id) => {
    if(window.confirm("Delete this item?")) {
      await supabase.from(table).delete().eq('id', id); fetchData();
    }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setTempPoint(null); setSelectionMode(null); };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* === SIDEBAR (White) === */}
      <div style={{ width: '320px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        
        {/* HEADER & VIEW SWITCHER */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 20px 0' }}>Route Manager</h2>
          
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <button 
                onClick={() => setActiveView('map')}
                style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'map' ? '#fff' : 'transparent', color: activeView === 'map' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
                <MapIcon size={14} /> Map
            </button>
            <button 
                onClick={() => setActiveView('terminals')}
                style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'terminals' ? '#fff' : 'transparent', color: activeView === 'terminals' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'terminals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
                <List size={14} /> List
            </button>
          </div>

          {activeView === 'map' && (
             <button onClick={() => openModal('ADD_ROUTE')} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Network size={18}/> New Route
             </button>
          )}
        </div>

        {/* SIDEBAR CONTENT: ROUTE LIST (Only for Map View) */}
        {activeView === 'map' ? (
            <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {routes.map(r => (
                        <div key={r.id} style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderLeft: `4px solid ${getRouteColor(r.mode)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1f2937' }}>{r.route_name || 'Unnamed'}</span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => openModal('ADD_ROUTE', r)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                            <button onClick={() => deleteItem('routes', r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{r.source_stop?.name} → {r.target_stop?.name}</div>
                        </div>
                    ))}
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <input type="file" accept=".json, .geojson" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current.click()} style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <UploadCloud size={18}/> Import OSM Data
                    </button>
                </div>
            </>
        ) : (
            <div style={{ padding: '24px', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}>
                <LayoutGrid size={48} style={{ marginBottom: '10px', opacity: 0.2 }} />
                <p>Use the panel on the right to manage Terminal hierarchies and detailed route assignments.</p>
            </div>
        )}
      </div>

      {/* === CONTENT AREA (Right Side) === */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
          
          {/* 1. MAP VIEW */}
          {activeView === 'map' && (
             <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <MapContainer center={[14.6, 121.0]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClicker />
                    {routes.map(r => r.polyline && <GeoJSON key={r.id} data={JSON.parse(r.polyline)} style={{ color: getRouteColor(r.mode), weight: 5, opacity: 0.8 }} />)}
                    
                    {stops.map(s => (
                        <Marker key={s.id} position={[s.lat, s.lng]} icon={getIcon(s)} eventHandlers={{ click: () => handlePinClick(s) }}>
                        {!selectionMode && (
                            <Popup>
                            <strong>{s.name}</strong> <br/>
                            <span style={{fontSize:'0.8rem', color: '#666', textTransform:'capitalize'}}>{s.type}</span>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => openModal('ADD_NODE', s)} style={{ flex:1, color: 'white', background: '#3b82f6', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => deleteItem('stops', s.id)} style={{ flex:1, color: 'white', background: '#ef4444', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Delete</button>
                            </div>
                            </Popup>
                        )}
                        </Marker>
                    ))}
                </MapContainer>
                {selectionMode && (
                    <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px 20px', borderRadius: '20px', fontWeight: '600', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                        Select {selectionMode} stop from the map
                    </div>
                )}
             </div>
          )}

          {/* 2. TERMINALS LIST VIEW */}
          {activeView === 'terminals' && (
             <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '40px 40px 120px 40px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '20px', color: '#111827' }}>Terminals & Routes</h2>
                    
                    {Object.entries(getGroupedTerminals()).length > 0 ? Object.entries(getGroupedTerminals()).map(([barangayName, terminals]) => (
                        <CollapsibleSection key={barangayName} title={barangayName} level={1}>
                            {terminals.map(terminal => {
                                const terminalRoutes = getRoutesForTerminal(terminal.id);
                                return (
                                    <CollapsibleSection 
                                        key={terminal.id} 
                                        level={2} 
                                        rightLabel={`${terminalRoutes.length} Route(s)`}
                                        title={
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '600', fontSize: '1rem' }}>{terminal.name}</span>
                                                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>
                                                    {getTerminalLabel(terminal.allowed_vehicles)}
                                                </span>
                                            </div>
                                        }
                                    >
                                        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={14}/> Terminal Details</h4>
                                            <div style={{ fontSize: '0.9rem', color: '#374151', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div><strong>ID:</strong> {terminal.id}</div>
                                                <div><strong>Type:</strong> {terminal.type}</div>
                                                <div style={{ gridColumn: '1 / -1' }}><strong>Barangay:</strong> {terminal.barangay || 'N/A'}</div>
                                            </div>
                                            <button onClick={() => openModal('ADD_NODE', terminal)} style={{ marginTop: '12px', fontSize: '0.85rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}><Edit2 size={14}/> Edit Terminal Details</button>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e5e7eb' }}></div>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><CornerDownRight size={14}/> Routes from here</h4>
                                            <div style={{ height: '1px', flex: 1, backgroundColor: '#e5e7eb' }}></div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {terminalRoutes.length > 0 ? terminalRoutes.map(route => (
                                                <div key={route.id} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderLeft: `4px solid ${getRouteColor(route.mode)}`, borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: '#111827' }}>{route.route_name}</div>
                                                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{route.source_stop?.name} → {route.target_stop?.name}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                                             <span>{(route.distance_meters / 1000).toFixed(1)} km</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <Clock size={14} /> <span>{route.eta_minutes ? `${route.eta_minutes} mins` : '-'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                                            <Banknote size={14} color="#10b981"/> 
                                                            <span style={{color: '#10b981', fontWeight:'600'}}>{route.fare ? `₱${route.fare}` : '-'}</span>
                                                            {route.discounted_fare > 0 && (
                                                                <span style={{ fontSize: '0.75rem', color: '#f97316', marginLeft: '5px', fontWeight:'500' }}>
                                                                    (₱{route.discounted_fare} SP)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ marginLeft: '16px', display: 'flex', gap: '5px' }}>
                                                        <button onClick={() => openModal('ADD_ROUTE', route)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                                                    </div>
                                                </div>
                                            )) : <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px', color: '#9ca3af', fontSize: '0.9rem', border: '1px dashed #e5e7eb' }}>No routes assigned yet.</div>}
                                        </div>
                                    </CollapsibleSection>
                                );
                            })}
                        </CollapsibleSection>
                    )) : <div style={{ textAlign: 'center', marginTop: '50px', color: '#6b7280' }}>No terminals data available.</div>}
                    
                    <div style={{ height: '150px' }}></div>
                </div>
             </div>
          )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: selectionMode ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: selectionMode ? 'none' : 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, pointerEvents: selectionMode ? 'none' : 'auto' }}>
          
          <div style={{ display: selectionMode ? 'none' : 'block', backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontFamily: 'Inter, sans-serif', color: '#111827', pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{editingId ? 'Edit' : 'Add New'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>

            {modalMode === 'ADD_NODE' && (
              <>
                <label style={LABEL_STYLE}>Location Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Central Market" />
                
                {/* USE SUGGESTION INPUT FOR BARANGAY */}
                <SuggestionInput 
                    label="Barangay"
                    value={formData.barangay}
                    onChange={(val) => setFormData({...formData, barangay: val})}
                    options={getUniqueBarangays()}
                    placeholder="e.g. Pasong Tamo"
                />

                <label style={LABEL_STYLE}>Location Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}>
                  <option value="stop">Regular Stop</option>
                  <option value="terminal">Main Terminal</option>
                  <option disabled>── Establishments ──</option>
                  <option value="school">School / University</option>
                  <option value="hospital">Hospital / Clinic</option>
                  <option value="mall">Mall / Market</option>
                  <option value="restaurant">Restaurant / Food</option>
                  <option disabled>── Transport ──</option>
                  <option value="bus_stop">Bus Stop</option>
                  <option value="jeep_stop">Jeepney Stop</option>
                  <option value="tricycle_stop">Tricycle Stop</option>
                </select>

                {['terminal', 'bus_stop', 'jeep_stop', 'tricycle_stop'].includes(formData.type) && (
                  <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <label style={{...LABEL_STYLE, marginBottom: '12px'}}>Allowed Vehicles</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.tricycle} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, tricycle: e.target.checked}})} /> Tricycle</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.jeep} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, jeep: e.target.checked}})} /> Jeep</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.bus} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, bus: e.target.checked}})} /> Bus</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.ebus} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, ebus: e.target.checked}})} /> E-Bus</label>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveNode} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{editingId ? 'Update' : 'Save'}</button>
                </div>
              </>
            )}

            {modalMode === 'ADD_ROUTE' && (
              <>
                 <label style={LABEL_STYLE}>Route Name</label>
                 <input type="text" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Blue Line" />
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                        <label style={LABEL_STYLE}>Est. ETA (mins)</label>
                        <input type="number" value={formData.eta} onChange={e => setFormData({...formData, eta: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="15" />
                    </div>
                    <div>
                        <label style={LABEL_STYLE}>Fare (₱)</label>
                        <input type="number" value={formData.fare} onChange={handleFareChange} style={COMMON_INPUT_STYLE} placeholder="20" />
                    </div>
                    <div>
                        <label style={LABEL_STYLE}>Disc. Fare (₱)</label>
                        <input type="number" value={formData.discountedFare} onChange={e => setFormData({...formData, discountedFare: e.target.value})} style={{...COMMON_INPUT_STYLE, borderColor: '#10b981'}} placeholder="16" />
                    </div>
                 </div>

                 <label style={LABEL_STYLE}>Transport Mode</label>
                 <select value={formData.transportMode} onChange={e => setFormData({...formData, transportMode: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}>
                    <option value="tricycle">🟢 Tricycle</option>
                    <option value="jeep">🟣 Jeepney</option>
                    <option value="bus">🔵 Bus</option>
                 </select>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    <div>
                        <SearchableSelect label="Origin Terminal" placeholder="Search Terminal..." options={stops} value={formData.startNode} onChange={(id) => setFormData({...formData, startNode: id})} />
                        <button onClick={() => setSelectionMode('origin')} style={{width: '100%', marginTop: '8px', padding: '8px', background: selectionMode === 'origin' ? '#3b82f6' : '#e5e7eb', color: selectionMode === 'origin' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Select from Map</button>
                    </div>
                    <div>
                        <SearchableSelect label="Destination" placeholder="Search..." options={stops} value={formData.endNode} onChange={(id) => setFormData({...formData, endNode: id})} />
                        <button onClick={() => setSelectionMode('destination')} style={{width: '100%', marginTop: '8px', padding: '8px', background: selectionMode === 'destination' ? '#3b82f6' : '#e5e7eb', color: selectionMode === 'destination' ? 'white' : '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer'}}>Select from Map</button>
                    </div>
                 </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveRoute} style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{editingId ? 'Update Route' : 'Create Route'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { Trash2, Network, MapPin, X, Search, ArrowRight, UploadCloud, Edit2, Save } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- ICONS CONFIG ---
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const StopIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
const TerminalIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #0fa958; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// 1. HELPER: GENERATE CUSTOM MARKER ICONS (Same as previous turn)
const getIcon = (type) => {
  let color = '#3b82f6';
  let innerHTML = '';
  
  switch (type?.toLowerCase()) {
    case 'terminal': color = '#10b981'; break;
    case 'school': color = '#f97316'; innerHTML = '🎓'; break;
    case 'hospital': color = '#ef4444'; innerHTML = '🏥'; break;
    case 'mall': color = '#8b5cf6'; innerHTML = '🛍️'; break;
    case 'restaurant': color = '#eab308'; innerHTML = '🍴'; break;
    case 'bus_stop': color = '#2563eb'; innerHTML = '🚌'; break;
    case 'jeep_stop': color = '#7c3aed'; innerHTML = '🚙'; break;
    case 'tricycle_stop': color = '#16a34a'; innerHTML = '🏍️'; break;
    default: color = '#3b82f6';
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

// --- SEARCH COMPONENT (Helper Component) ---
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

  // FIX: This ensures 'options' is used and not a global variable.
  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }} ref={wrapperRef}>
      <label style={LABEL_STYLE}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text" value={query} onFocus={() => setIsOpen(true)} placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
          style={{ ...COMMON_INPUT_STYLE, marginBottom: 0, paddingLeft: '35px' }}
        />
        <Search size={18} style={{ position: 'absolute', left: 10, top: 12, color: '#9ca3af' }} />
        {value && <button onClick={() => { onChange(''); setQuery(''); }} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>}
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

export default function RouteManager() {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [editingId, setEditingId] = useState(null); 
  const [tempPoint, setTempPoint] = useState(null); 
  const fileInputRef = useRef(null); // Ref for file input

  const [formData, setFormData] = useState({
    name: '', type: 'stop', vehicles: { tricycle: false, jeep: false, bus: false },
    startNode: '', endNode: '', routeName: '', transportMode: 'tricycle'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: sData } = await supabase.from('stops').select('*, lat, lng');
    setStops(sData || []);
    const { data: rData } = await supabase.from('routes').select(`*, source_stop:stops!routes_source_fkey(name), target_stop:stops!routes_target_fkey(name)`);
    setRoutes(rData || []);
  };

  const MapClicker = () => {
    useMapEvents({
      click: (e) => {
        if (!isModalOpen) {
          setTempPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          openModal('ADD_NODE');
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
        setFormData({ 
          name: data.name, type: data.type || 'stop', 
          vehicles: { tricycle: isTri, jeep: isJeep, bus: isBus } 
        });
        setTempPoint({ lat: data.lat, lng: data.lng });
      } else {
        setFormData({ name: '', type: 'stop', vehicles: { tricycle: true, jeep: false, bus: false } });
      }
    } else if (mode === 'ADD_ROUTE') {
      if (data) {
        setFormData({ startNode: data.source, endNode: data.target, routeName: data.route_name, transportMode: data.mode });
      } else {
        setFormData({ startNode: '', endNode: '', routeName: '', transportMode: 'tricycle' });
      }
    }
    setIsModalOpen(true);
  };

  const handlePinClick = (stop) => {
    if (isModalOpen && modalMode === 'ADD_ROUTE') {
      if (!formData.startNode) setFormData({ ...formData, startNode: stop.id });
      else if (!formData.endNode && formData.startNode !== stop.id) setFormData({ ...formData, endNode: stop.id });
    }
  };

  const saveNode = async () => {
    if (!formData.name) return alert("Location Name is required");
    const vehicleArray = Object.keys(formData.vehicles).filter(k => formData.vehicles[k]);
    
    const payload = {
      name: formData.name, type: formData.type,
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
        distance_meters: route ? route.distance : 0, cost: route ? route.duration : 0
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const features = json.features || [];
        let successCount = 0;

        for (const feature of features) {
          const props = feature.properties;
          const name = props.name || props.official_name || "Unnamed Location";
          const lng = feature.geometry.coordinates[0];
          const lat = feature.geometry.coordinates[1];
          
          let detectedType = 'stop'; 
          
          if (props.amenity === 'school' || props.amenity === 'university' || props.amenity === 'college') detectedType = 'school';
          else if (props.amenity === 'hospital' || props.amenity === 'clinic') detectedType = 'hospital';
          else if (props.shop === 'mall' || props.shop === 'supermarket' || props.amenity === 'marketplace') detectedType = 'mall';
          else if (props.amenity === 'restaurant' || props.amenity === 'fast_food') detectedType = 'restaurant';
          else if (props.amenity === 'bus_station' || props.amenity === 'taxi') detectedType = 'terminal';
          else if (props.highway === 'bus_stop') detectedType = 'bus_stop';

          const { error } = await supabase.from('stops').insert({
            name: name,
            type: detectedType, 
            location: `POINT(${lng} ${lat})`
          });
          if (!error) successCount++;
        }
        alert(`Successfully imported ${successCount} locations!`);
        fetchData();
      } catch (err) { alert("Invalid GeoJSON file."); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const deleteItem = async (table, id) => {
    if(window.confirm("Delete this item?")) {
      await supabase.from(table).delete().eq('id', id); fetchData();
    }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setTempPoint(null); };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* SIDEBAR */}
      <div style={{ width: '320px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Routes</h2>
          <button onClick={() => openModal('ADD_ROUTE')} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Network size={18}/> New Route
          </button>
        </div>

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

        {/* RESTORED IMPORT SECTION */}
        <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <input type="file" accept=".json, .geojson" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current.click()} style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', color: '#374151', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <UploadCloud size={18}/> Import OSM Data
          </button>
        </div>
      </div>

      {/* MAP */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={[14.6, 121.0]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClicker />
          {routes.map(r => r.polyline && <GeoJSON key={r.id} data={JSON.parse(r.polyline)} style={{ color: getRouteColor(r.mode), weight: 5, opacity: 0.8 }} />)}
          
          {/* RENDER STOPS WITH DYNAMIC ICONS */}
          {stops.map(s => (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={getIcon(s.type)} eventHandlers={{ click: () => handlePinClick(s) }}>
              <Popup>
                <strong>{s.name}</strong> <br/>
                <span style={{fontSize:'0.8rem', color: '#666', textTransform:'capitalize'}}>{s.type}</span>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => openModal('ADD_NODE', s)} style={{ flex:1, color: 'white', background: '#3b82f6', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteItem('stops', s.id)} style={{ flex:1, color: 'white', background: '#ef4444', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Delete</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '450px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontFamily: 'Inter, sans-serif', color: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{editingId ? 'Edit' : 'Add New'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>

            {modalMode === 'ADD_NODE' && (
              <>
                <label style={LABEL_STYLE}>Location Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Central Market" />
                
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

                {/* SHOW CHECKBOXES ONLY IF TERMINAL OR TRANSPORT STOP */}
                {['terminal', 'bus_stop', 'jeep_stop', 'tricycle_stop'].includes(formData.type) && (
                  <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <label style={{...LABEL_STYLE, marginBottom: '12px'}}>Allowed Vehicles</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.tricycle} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, tricycle: e.target.checked}})} /> Tricycle</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.jeep} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, jeep: e.target.checked}})} /> Jeep</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={formData.vehicles.bus} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, bus: e.target.checked}})} /> Bus</label>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveNode} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{editingId ? 'Update' : 'Save'}</button>
                </div>
              </>
            )}

            {modalMode === 'ADD_ROUTE' && (
              <>
                 <label style={LABEL_STYLE}>Route Name</label>
                 <input type="text" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Blue Line" />
                 <label style={LABEL_STYLE}>Transport Mode</label>
                 <select value={formData.transportMode} onChange={e => setFormData({...formData, transportMode: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}>
                    <option value="tricycle">🟢 Tricycle</option>
                    <option value="jeep">🟣 Jeepney</option>
                    <option value="bus">🔵 Bus</option>
                 </select>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <SearchableSelect label="Origin" placeholder="Search..." options={stops} value={formData.startNode} onChange={(id) => setFormData({...formData, startNode: id})} />
                    <ArrowRight size={20} color="#9ca3af" style={{ marginTop: 35 }} />
                    <SearchableSelect label="Destination" placeholder="Search..." options={stops} value={formData.endNode} onChange={(id) => setFormData({...formData, endNode: id})} />
                 </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px', background: '#f3f4f6', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}>Cancel</button>
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
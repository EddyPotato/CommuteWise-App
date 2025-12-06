// CommuteWise - RouteManager.jsx
// Version: December 6, 2025 - 2.0 (List View Details & UI Fixes)
// Change Log:
// - UI: "List Mode" now shows full details (Vehicles) and Action buttons (Edit/Delete).
// - UX: Barangay sections in List Mode are now expanded by default.
// - PERF: Maintained previous optimizations.

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMapEvents } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { 
  Trash2, Network, X, Search, Edit2, 
  ChevronDown, ChevronRight, Map as MapIcon, 
  List, LayoutGrid, Ticket, Plus, 
  MapPin, GripVertical, AlertCircle, CheckCircle, AlertTriangle, MousePointer2, PlusCircle, Crosshair
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- ICONS CONFIG ---
const StopIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });

// --- CSS STYLES FOR SCROLLBARS & UTILS ---
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(209, 213, 219, 0.4);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.6);
  }
  .scrollbar-stable {
    scrollbar-gutter: stable;
  }
`;

// --- HELPER: GENERATE CUSTOM MARKER ICONS ---
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
          if (v === 'tricycle') color = '#16a34a'; 
          else if (v === 'jeep') color = '#7c3aed'; 
          else if (v === 'bus') color = '#1e40af'; 
          else if (v === 'ebus') color = '#0ea5e9'; 
          else color = '#10b981'; 
      } else {
          color = '#10b981'; 
      }
  } else {
      switch (type) {
        case 'school': color = '#f97316'; innerHTML = '🎓'; break;
        case 'hospital': color = '#ef4444'; innerHTML = '🏥'; break;
        case 'mall': color = '#8b5cf6'; innerHTML = '🛍️'; break;
        case 'restaurant': color = '#eab308'; innerHTML = '🍴'; break;
        case 'stop_point': color = '#2563eb'; innerHTML = ''; break; 
        default: color = '#3b82f6';
      }
  }

  if (type === 'stop_point') {
    return L.divIcon({
        className: 'custom-stop-point',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color}; 
      width: 28px; height: 28px; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex; justify-content: center; align-items: center;
      color: white; font-size: 16px;
    ">${innerHTML}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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

// --- COMPONENT: SUGGESTION INPUT ---
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

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      onChange(filteredOptions[0]);
      setIsOpen(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px', position: 'relative' }} ref={wrapperRef}>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type="text"
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        style={COMMON_INPUT_STYLE}
        placeholder={placeholder}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: 'calc(100% - 15px)', left: 0, width: '100%', maxHeight: '150px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
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

// --- SEARCH COMPONENT ---
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

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      onChange(filteredOptions[0].id);
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={wrapperRef}>
      {label && <label style={LABEL_STYLE}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
            <input
            type="text" value={query} onFocus={() => setIsOpen(true)} placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
            onKeyDown={handleKeyDown}
            style={{ 
                ...COMMON_INPUT_STYLE, 
                marginBottom: 0, 
                paddingLeft: query ? '12px' : '36px', 
                paddingRight: '40px', 
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}
            />
            {!query && (
              <Search size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            )}
            
            {value && (
            <button 
                onClick={() => { onChange(''); setQuery(''); }} 
                style={{ 
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px', borderRadius: '50%',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
                <X size={18} />
            </button>
            )}
        </div>
      </div>
      
      {isOpen && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {filteredOptions.length > 0 ? filteredOptions.map(opt => (
            <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#1f2937', fontSize: '0.95rem', backgroundColor: 'white' }}>
                <div style={{fontWeight: '500'}}>{opt.name}</div>
                <div style={{fontSize: '0.75rem', color: '#6b7280'}}>{opt.type === 'terminal' ? 'Terminal' : 'Stop Point'} • {opt.barangay}</div>
            </div>
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
  
  // UX States
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [mapInstruction, setMapInstruction] = useState(null); 
  const [hoveredRouteId, setHoveredRouteId] = useState(null); // New state for hover

  // Drag and Drop References
  const dragItem = useRef();
  const dragOverItem = useRef();

  // Store Route Progress when creating a new stop mid-route
  const [pendingRouteData, setPendingRouteData] = useState(null);
  const [pendingSlotIndex, setPendingSlotIndex] = useState(null); 
  
  // Store Node Data when Relocating a Pin
  const [pendingNodeData, setPendingNodeData] = useState(null);
  const [isRelocating, setIsRelocating] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'stop_point', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false },
    // Route Specific Fields
    routeName: '', transportMode: 'tricycle',
    routeStops: [], 
    eta: '15', fare: '15', discountedFare: '12', barangay: '',
    isFreeRide: false
  });

  useEffect(() => { fetchData(); }, []);
  
  // Auto-dismiss notification
  useEffect(() => {
      if (notification) {
          const timer = setTimeout(() => setNotification(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  const fetchData = async () => {
    const { data: sData } = await supabase.from('stops').select('*, lat, lng');
    setStops(sData || []);
    const { data: rData } = await supabase.from('routes').select(`*, source_stop:stops!routes_source_fkey(name), target_stop:stops!routes_target_fkey(name)`);
    
    // PERF: Pre-parse polylines so we don't do it on every render cycle
    const processedRoutes = (rData || []).map(r => ({
        ...r,
        parsedPolyline: r.polyline ? JSON.parse(r.polyline) : null
    }));
    setRoutes(processedRoutes);
  };

  const showNotification = (message, type = 'info') => {
      setNotification({ message, type });
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

  const getUniqueBarangays = () => {
      const existing = stops.map(s => s.barangay).filter(b => b && b !== 'Unassigned');
      const unique = [...new Set(existing)].sort();
      return ['Unassigned', ...unique];
  };

  const MapClicker = () => {
    useMapEvents({
      click: (e) => {
        if (!isModalOpen) {
          // Normal click to add node
          setTempPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
          if (mapInstruction && !isRelocating) setMapInstruction(null);
          
          if (isRelocating) {
              // Finish relocation logic
              setIsRelocating(false);
              setMapInstruction(null);
              // Re-open modal in ADD_NODE mode, preventing data reset logic in openModal
              openModal('ADD_NODE', null, true); 
          } else {
              openModal('ADD_NODE');
          }
        }
      }
    });
    return null;
  };

  const openModal = (mode, data = null, isResumeRelocation = false) => {
    setModalMode(mode);
    let targetId = data ? data.id : (editingId || null);

    if (mode === 'ADD_NODE') {
      if (isResumeRelocation && pendingNodeData) {
          // Restoring state after relocation click
          setFormData(pendingNodeData);
          setPendingNodeData(null);
          // targetId is already set via editingId
      } else if (data) {
        // Edit existing stop
        const isTri = data.allowed_vehicles?.includes('tricycle') || false;
        const isJeep = data.allowed_vehicles?.includes('jeep') || false;
        const isBus = data.allowed_vehicles?.includes('bus') || false;
        const isEbus = data.allowed_vehicles?.includes('ebus') || false;
        setFormData({ 
          name: data.name, 
          type: data.type || 'stop_point', 
          barangay: data.barangay || 'Unassigned',
          vehicles: { tricycle: isTri, jeep: isJeep, bus: isBus, ebus: isEbus },
          routeName: '', transportMode: 'tricycle', routeStops: [], eta: '15', fare: '15', discountedFare: '12', isFreeRide: false
        });
        setTempPoint({ lat: data.lat, lng: data.lng });
      } else {
        // New stop
        setFormData({ 
            name: '', type: 'stop_point', barangay: 'Unassigned', 
            vehicles: { tricycle: true, jeep: false, bus: false, ebus: false }, 
            routeName: '', transportMode: 'tricycle', routeStops: [], eta: '15', fare: '15', discountedFare: '12', isFreeRide: false 
        });
      }
    } else if (mode === 'ADD_ROUTE') {
      if (data) {
        // Edit Existing Route
        let stopsToLoad = [data.source, data.target];
        if (data.waypoints && Array.isArray(data.waypoints) && data.waypoints.length > 0) {
            stopsToLoad = data.waypoints;
        }

        const isFree = parseFloat(data.fare) === 0 && data.mode === 'bus';

        setFormData({ 
            routeName: data.route_name, transportMode: data.mode,
            routeStops: stopsToLoad, 
            eta: data.eta_minutes || '', 
            fare: data.fare || '',
            discountedFare: data.discounted_fare || '',
            name: '', type: 'stop_point', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false },
            isFreeRide: isFree
        });
      } else {
        // New Route - check if we have pending data from a context switch
        if (pendingRouteData) {
            // Restore formData AND preserved ID if it existed
            const { _preservedId, ...rest } = pendingRouteData;
            setFormData(rest);
            if (_preservedId) targetId = _preservedId;

            setPendingRouteData(null); 
            setPendingSlotIndex(null);
        } else {
            // New Route Defaults
            setFormData({ 
                routeName: '', transportMode: 'tricycle', routeStops: ['', ''], 
                eta: '15', fare: '15', discountedFare: '12', 
                name: '', type: 'stop_point', barangay: '', vehicles: { tricycle: false, jeep: false, bus: false, ebus: false },
                isFreeRide: false
            });
        }
      }
    }
    
    setEditingId(targetId);
    setIsModalOpen(true);
  };

  const handleCreateStopFromRoute = (targetIndex) => {
      // 1. Save current Route Form state AND the editing ID
      setPendingRouteData({ ...formData, _preservedId: editingId });
      setPendingSlotIndex(targetIndex);
      
      // 2. Switch to Map Mode for clicking
      setSelectionMode(null);
      setIsModalOpen(false);
      setMapInstruction("Click on the map to place the new Stop Point");
  };

  const handleRelocateClick = () => {
      setPendingNodeData(formData);
      setIsRelocating(true);
      setIsModalOpen(false);
      setMapInstruction("Click new location on the map for this stop");
  };

  const handleNodeSaved = (newNodeId) => {
      if (pendingRouteData) {
          if (pendingSlotIndex !== null && newNodeId) {
             const newStops = [...pendingRouteData.routeStops];
             newStops[pendingSlotIndex] = newNodeId;
             pendingRouteData.routeStops = newStops;
             // Note: formData update happens inside openModal due to pending logic
          }
          openModal('ADD_ROUTE');
      }
  };

  const handleCancelInstruction = () => {
      setMapInstruction(null);
      setSelectionMode(null);
      setPendingSlotIndex(null);
      setIsRelocating(false);
      setPendingNodeData(null);

      // If we were adding a stop from a route, go back to route
      if (pendingRouteData) {
          openModal('ADD_ROUTE');
      } 
      // If we were relocating, go back to edit modal
      else if (editingId && !pendingRouteData) {
          // Need to fetch original data again essentially, or just reopen if we preserved it
          // Simpler to just re-open edit for the editingId
          const originalStop = stops.find(s => s.id === editingId);
          if (originalStop) openModal('ADD_NODE', originalStop);
      }
  };

  const handleFareChange = (e) => {
      const val = e.target.value;
      setFormData(prev => {
          const numericFare = parseFloat(val);
          // 20% Discount Logic:
          // 1. If Fare is empty/invalid, Disc is empty.
          // 2. Otherwise, 80% of Fare (20% off), rounded to nearest integer.
          const autoDiscount = isNaN(numericFare) ? '' : Math.round(numericFare * 0.80);
          
          return { 
              ...prev, 
              fare: val, 
              // Update discounted fare automatically whenever Fare changes
              discountedFare: val === '' ? '' : autoDiscount 
          };
      });
  };

  const toggleFreeRide = () => {
    setFormData(prev => {
        const isNowFree = !prev.isFreeRide;
        return {
            ...prev,
            isFreeRide: isNowFree,
            fare: isNowFree ? 0 : (prev.fare || '15'),
            discountedFare: isNowFree ? 0 : (prev.discountedFare || '12'),
            transportMode: isNowFree ? 'bus' : prev.transportMode
        };
    });
  };

  // --- ROUTE STOP MANAGEMENT ---
  const handleRouteStopChange = (index, value) => {
      const newStops = [...formData.routeStops];
      newStops[index] = value;
      setFormData({ ...formData, routeStops: newStops });
  };

  const addRouteStopSlot = () => {
      const newStops = [...formData.routeStops];
      if (newStops.length >= 2) {
          newStops.splice(newStops.length - 1, 0, '');
      } else {
          newStops.push('');
      }
      setFormData({ ...formData, routeStops: newStops });
  };

  const removeRouteStopSlot = (index) => {
      if (formData.routeStops.length <= 2) return; 
      const newStops = formData.routeStops.filter((_, i) => i !== index);
      setFormData({ ...formData, routeStops: newStops });
  };

  // --- DRAG AND DROP HANDLERS ---
  const dragStart = (e, position) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
  };

  const dragEnter = (e, position) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const drop = (e) => {
    const copyListItems = [...formData.routeStops];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setFormData({ ...formData, routeStops: copyListItems });
  };

  const handlePinClick = (stop) => {
    if (isModalOpen && modalMode === 'ADD_ROUTE' && selectionMode !== null) {
        handleRouteStopChange(selectionMode, stop.id);
        setSelectionMode(null);
        setMapInstruction(null); 
    }
  };

  const initiateSelectionMode = (index) => {
      setSelectionMode(index);
      setMapInstruction(`Select Stop #${index + 1} from map`);
  };

  const saveNode = async () => {
    if (!formData.name) return showNotification("Location Name is required", "error");
    const vehicleArray = Object.keys(formData.vehicles).filter(k => formData.vehicles[k]);
    const finalBarangay = formData.barangay && formData.barangay.trim() !== '' ? formData.barangay : 'Unassigned';

    const payload = {
      name: formData.name, 
      type: formData.type,
      barangay: finalBarangay,
      allowed_vehicles: ['terminal'].includes(formData.type) ? vehicleArray : [] 
    };

    let error, savedId;
    if (editingId) {
      const { error: err } = await supabase.from('stops').update(payload).eq('id', editingId);
      // If we relocated, we also need to update location
      if (tempPoint) {
          await supabase.from('stops').update({ location: `POINT(${tempPoint.lng} ${tempPoint.lat})`, lat: tempPoint.lat, lng: tempPoint.lng }).eq('id', editingId);
      }
      error = err;
      savedId = editingId;
    } else {
      const { data, error: err } = await supabase.from('stops').insert({
        ...payload,
        location: `POINT(${tempPoint.lng} ${tempPoint.lat})`
      }).select();
      error = err;
      if (data && data.length > 0) savedId = data[0].id;
    }

    if (error) {
        showNotification(error.message, "error");
    } else { 
        showNotification("Location saved successfully!", "success");
        closeModal(); 
        await fetchData(); 
        handleNodeSaved(savedId); 
    }
  };

  const saveRoute = async () => {
    const validStops = formData.routeStops.filter(id => id !== '' && id !== null);
    if (validStops.length < 2) return showNotification("Route requires at least an Origin and Destination.", "error");

    const startId = validStops[0];
    const endId = validStops[validStops.length - 1];
    
    // Fetch objects to get coords
    const stopObjects = validStops.map(id => stops.find(s => s.id === parseInt(id))).filter(Boolean);
    
    const coordString = stopObjects.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      const route = data.routes ? data.routes[0] : null;
      
      const startName = stops.find(s => s.id === parseInt(startId))?.name;
      const endName = stops.find(s => s.id === parseInt(endId))?.name;

      const payload = {
        route_name: formData.routeName || `${startName} - ${endName}`,
        source: startId, 
        target: endId, 
        mode: formData.transportMode,
        polyline: route ? JSON.stringify(route.geometry) : null,
        distance_meters: route ? route.distance : 0, 
        cost: route ? route.duration : 0,
        eta_minutes: formData.eta ? parseInt(formData.eta) : 15,
        fare: formData.fare ? parseFloat(formData.fare) : 15,
        discounted_fare: formData.discountedFare ? parseFloat(formData.discountedFare) : 12,
        waypoints: validStops // NOTE: Requires 'waypoints' column in Supabase (int[] or jsonb)
      };

      let error;
      if (editingId) {
        const { error: err } = await supabase.from('routes').update(payload).eq('id', editingId);
        error = err;
      } else {
        const { error: err } = await supabase.from('routes').insert(payload);
        error = err;
      }
      
      if (error) {
          // Fallback if 'waypoints' column is missing: retry without it to prevent 400 error
          if (error.code === '42703' || error.message?.includes('waypoints')) { // undefined column error code
              delete payload.waypoints;
              const { error: retryError } = editingId 
                 ? await supabase.from('routes').update(payload).eq('id', editingId)
                 : await supabase.from('routes').insert(payload);
              
              if (retryError) showNotification(retryError.message, "error");
              else {
                  showNotification("Route saved! (Note: Waypoints not persisted due to missing DB column)", "success");
                  closeModal(); 
                  fetchData();
              }
          } else {
              showNotification(error.message, "error");
          }
      } else { 
          showNotification("Route saved successfully!", "success"); 
          closeModal(); 
          fetchData(); 
      }
    } catch (err) { console.error(err); showNotification("Routing API failed", "error"); }
  };

  const deleteItem = async (table, id) => {
    setConfirmDialog({
        message: "Are you sure you want to delete this item? This action cannot be undone.",
        onConfirm: async () => {
            await supabase.from(table).delete().eq('id', id); 
            fetchData();
            showNotification("Item deleted.", "success");
        }
    });
  };

  const closeModal = () => { 
      setIsModalOpen(false); 
      setEditingId(null); 
      setTempPoint(null); 
      setSelectionMode(null);
      setIsRelocating(false);
      setPendingNodeData(null);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{styles}</style>
      
      {/* === NOTIFICATION TOAST === */}
      {notification && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, backgroundColor: notification.type === 'error' ? '#fee2e2' : '#dcfce7', border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#22c55e'}`, color: notification.type === 'error' ? '#b91c1c' : '#15803d', padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s ease-in-out', pointerEvents: 'none' }}>
            {notification.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span style={{ fontWeight: 500 }}>{notification.message}</span>
          </div>
      )}

      {/* === CONFIRMATION MODAL === */}
      {confirmDialog && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#ef4444' }}>
                      <AlertTriangle size={24} />
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Confirm Action</h3>
                  </div>
                  <p style={{ color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>{confirmDialog.message}</p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setConfirmDialog(null)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>Cancel</button>
                      <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 500 }}>Confirm</button>
                  </div>
              </div>
          </div>
      )}

      {/* === SIDEBAR === */}
      <div className="custom-scrollbar" style={{ width: '320px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: '0 0 20px 0' }}>Route Manager</h2>
          <div style={{ display: 'flex', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <button onClick={() => setActiveView('map')} style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'map' ? '#fff' : 'transparent', color: activeView === 'map' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><MapIcon size={14} /> Map</button>
            <button onClick={() => setActiveView('terminals')} style={{ flex: 1, padding: '8px', border: 'none', background: activeView === 'terminals' ? '#fff' : 'transparent', color: activeView === 'terminals' ? '#111827' : '#6b7280', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', boxShadow: activeView === 'terminals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><List size={14} /> List</button>
          </div>
          {activeView === 'map' && (
             <button onClick={() => openModal('ADD_ROUTE')} style={{ width: '100%', marginTop: '20px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Network size={18}/> New Route
             </button>
          )}
        </div>

        {activeView === 'map' ? (
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {routes.map(r => (
                    <div 
                      key={r.id} 
                      onMouseEnter={() => setHoveredRouteId(r.id)}
                      onMouseLeave={() => setHoveredRouteId(null)}
                      style={{ 
                        padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', 
                        backgroundColor: hoveredRouteId === r.id ? '#eff6ff' : '#f9fafb', // Highlight card on hover
                        borderLeft: `4px solid ${getRouteColor(r.mode)}`,
                        transition: 'background-color 0.2s',
                        cursor: 'default'
                      }}
                    >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#1f2937' }}>{r.route_name || 'Unnamed'}</span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => openModal('ADD_ROUTE', r)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                        <button onClick={() => deleteItem('routes', r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                        <span>{r.source_stop?.name} → {r.target_stop?.name}</span>
                        {parseFloat(r.fare) === 0 && <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>FREE RIDE</span>}
                    </div>
                    </div>
                ))}
            </div>
        ) : (
            <div style={{ padding: '24px', color: '#6b7280', fontSize: '0.9rem', textAlign: 'center' }}><LayoutGrid size={48} style={{ marginBottom: '10px', opacity: 0.2 }} /><p>Manage Terminal hierarchies here.</p></div>
        )}
      </div>

      {/* === MAP CONTENT === */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f9fafb' }}>
          {activeView === 'map' && (
             <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <MapContainer center={[14.6, 121.0]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClicker />
                    
                    {/* OPTIMIZED GEOJSON RENDERING */}
                    {/* We only render routes that are already parsed. The KEY is crucial for updates. */}
                    {/* We use style function to handle hover state cheaply without remounting components if possible, 
                        though modifying key is safest way to force style update in React-Leaflet */}
                    {routes.map(r => r.parsedPolyline && (
                        <GeoJSON 
                            key={`route-${r.id}-${hoveredRouteId === r.id ? 'focused' : 'dimmed'}`} 
                            data={r.parsedPolyline} 
                            style={() => ({
                                color: getRouteColor(r.mode),
                                weight: hoveredRouteId === r.id ? 8 : 5,
                                opacity: hoveredRouteId ? (hoveredRouteId === r.id ? 1 : 0.1) : 0.8
                            })} 
                        />
                    ))}
                    
                    {stops.map(s => (
                        <Marker key={s.id} position={[s.lat, s.lng]} icon={getIcon(s)} eventHandlers={{ click: () => handlePinClick(s) }}>
                        {selectionMode === null && (
                            <Popup>
                            <strong>{s.name}</strong> <br/>
                            <span style={{fontSize:'0.8rem', color: '#666', textTransform:'capitalize'}}>{s.type.replace('_', ' ')}</span>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button onClick={() => openModal('ADD_NODE', s)} style={{ flex:1, color: 'white', background: '#3b82f6', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => deleteItem('stops', s.id)} style={{ flex:1, color: 'white', background: '#ef4444', border: 'none', borderRadius:'4px', padding:'6px', cursor: 'pointer' }}>Delete</button>
                            </div>
                            </Popup>
                        )}
                        </Marker>
                    ))}
                </MapContainer>
                
                {/* --- FLOATING INSTRUCTION PILL --- */}
                {mapInstruction && (
                    <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.85)', color: 'white', padding: '8px 12px 8px 16px', borderRadius: '50px', fontWeight: '500', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(4px)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MousePointer2 size={16} color="#3b82f6" /> 
                            {mapInstruction}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <button 
                                onClick={handleCancelInstruction}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', fontWeight: '600', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                             >
                                Cancel
                             </button>
                            
                            {/* Create New Stop Button inside Instruction Pill */}
                            {selectionMode !== null && (
                                <button
                                    onClick={() => handleCreateStopFromRoute(selectionMode)}
                                    style={{ background: '#10b981', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(16, 185, 129, 0.4)' }}
                                >
                                    <PlusCircle size={14} /> Create Stop Point
                                </button>
                            )}
                        </div>
                    </div>
                )}
             </div>
          )}
          {activeView === 'terminals' && (
              <div className="custom-scrollbar" style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '40px' }}>
                 <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '20px', color: '#111827' }}>Terminals & Routes</h2>
                    {Object.entries(getGroupedTerminals()).map(([barangayName, terminals]) => (
                        <CollapsibleSection key={barangayName} title={barangayName} level={1} defaultOpen={true}>
                            {terminals.map(terminal => (
                                <div key={terminal.id} style={{ padding: '16px', borderBottom: '1px solid #eee', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{terminal.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                            {terminal.allowed_vehicles && terminal.allowed_vehicles.length > 0 ? (
                                                terminal.allowed_vehicles.map(v => (
                                                    <span key={v} style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize', fontSize: '0.75rem', fontWeight: '500' }}>
                                                        {v}
                                                    </span>
                                                ))
                                            ) : (
                                                <span>No specific vehicles assigned</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openModal('ADD_NODE', terminal)} style={{ padding: '6px', color: '#3b82f6', background: '#eff6ff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Edit2 size={16}/></button>
                                        <button onClick={() => deleteItem('stops', terminal.id)} style={{ padding: '6px', color: '#ef4444', background: '#fef2f2', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </CollapsibleSection>
                    ))}
                 </div>
              </div>
          )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: (selectionMode !== null || mapInstruction) ? 'transparent' : 'rgba(0,0,0,0.6)', backdropFilter: (selectionMode !== null || mapInstruction) ? 'none' : 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, pointerEvents: (selectionMode !== null || mapInstruction) ? 'none' : 'auto', animation: 'modalFadeIn 0.2s ease-out' }}>
          
          <div className="custom-scrollbar scrollbar-stable" style={{ display: (selectionMode !== null || mapInstruction) ? 'none' : 'block', backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '500px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', fontFamily: 'Inter, sans-serif', color: '#111827', pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{modalMode === 'ADD_NODE' ? 'Location Details' : 'Route Builder'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>

            {modalMode === 'ADD_NODE' && (
              <>
                <label style={LABEL_STYLE}>Location Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Central Market" />
                
                <SuggestionInput label="Barangay" value={formData.barangay} onChange={(val) => setFormData({...formData, barangay: val})} options={getUniqueBarangays()} placeholder="e.g. Pasong Tamo" />

                <label style={LABEL_STYLE}>Location Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}>
                  <option value="stop_point">Stop Point</option>
                  <option value="terminal">Terminal</option>
                  <option disabled>── Establishments ──</option>
                  <option value="school">School / University</option>
                  <option value="hospital">Hospital / Clinic</option>
                  <option value="mall">Mall / Market</option>
                  <option value="restaurant">Restaurant / Food</option>
                </select>

                {formData.type === 'terminal' && (
                  <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                    <label style={{...LABEL_STYLE, marginBottom: '12px'}}>Terminal Vehicles</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.vehicles.tricycle} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, tricycle: e.target.checked}})} /> Tricycle</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.vehicles.jeep} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, jeep: e.target.checked}})} /> Jeep</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input type="checkbox" checked={formData.vehicles.bus} onChange={e => setFormData({...formData, vehicles: {...formData.vehicles, bus: e.target.checked}})} /> Bus</label>
                    </div>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  {editingId && (
                      <button 
                        onClick={handleRelocateClick}
                        title="Move pin location"
                        style={{ flex: 0.5, padding: '12px', background: '#e0f2fe', color: '#0ea5e9', borderRadius: '8px', border: '1px solid #bae6fd', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                          <Crosshair size={20} />
                      </button>
                  )}
                  <button onClick={closeModal} style={{ flex: 1, padding: '12px', background: '#f9fafb', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button onClick={saveNode} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>{editingId ? 'Update' : 'Save Location'}</button>
                </div>
              </>
            )}

            {modalMode === 'ADD_ROUTE' && (
              <>
                 <label style={LABEL_STYLE}>Route Name</label>
                 <input type="text" value={formData.routeName} onChange={e => setFormData({...formData, routeName: e.target.value})} style={COMMON_INPUT_STYLE} placeholder="e.g. Blue Line" />
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                    <div>
                        <label style={LABEL_STYLE}>ETA (mins)</label>
                        <input type="number" value={formData.eta} onChange={e => setFormData({...formData, eta: e.target.value})} style={{...COMMON_INPUT_STYLE, marginBottom: '20px'}} placeholder="15" />
                    </div>
                    <div>
                        <label style={LABEL_STYLE}>Fare (₱)</label>
                        <input 
                            type="text" 
                            disabled={formData.isFreeRide}
                            value={formData.isFreeRide ? '' : formData.fare} 
                            onChange={handleFareChange} 
                            style={{...COMMON_INPUT_STYLE, marginBottom: '20px', backgroundColor: formData.isFreeRide ? '#f3f4f6' : 'white', cursor: formData.isFreeRide ? 'not-allowed' : 'text' }} 
                            placeholder={formData.isFreeRide ? "FREE" : "15"} 
                        />
                    </div>
                    <div>
                        {/* UPDATED LABEL */}
                        <label style={LABEL_STYLE}>Disc. 20% (₱)</label>
                        <input 
                            type="text" 
                            disabled={formData.isFreeRide}
                            value={formData.isFreeRide ? '' : formData.discountedFare} 
                            onChange={e => setFormData({...formData, discountedFare: e.target.value})} 
                            style={{...COMMON_INPUT_STYLE, marginBottom: '20px', borderColor: formData.isFreeRide ? '#d1d5db' : '#10b981', backgroundColor: formData.isFreeRide ? '#f3f4f6' : 'white', cursor: formData.isFreeRide ? 'not-allowed' : 'text'}} 
                            placeholder={formData.isFreeRide ? "FREE" : "12"} 
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <button 
                            onClick={toggleFreeRide}
                            title="Toggle Free Ride"
                            style={{ 
                                width: '100%', height: '42px', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: formData.isFreeRide ? '#10b981' : 'transparent',
                                color: formData.isFreeRide ? 'white' : '#6b7280',
                                border: formData.isFreeRide ? 'none' : '1px solid #d1d5db'
                            }}
                        >
                            <Ticket size={16} /> {formData.isFreeRide ? 'FREE RIDE' : 'Free Ride'}
                        </button>
                    </div>
                 </div>

                 <label style={LABEL_STYLE}>Transport Mode</label>
                 <select value={formData.transportMode} onChange={e => setFormData({...formData, transportMode: e.target.value})} style={{ ...COMMON_INPUT_STYLE, cursor: 'pointer' }}>
                    <option value="tricycle">🟢 Tricycle</option>
                    <option value="jeep">🟣 Jeepney</option>
                    <option value="bus">🔵 Bus</option>
                 </select>

                 <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={{...LABEL_STYLE, marginBottom: 0}}>Route Stops</label>
                         <button 
                            onClick={addRouteStopSlot} 
                            style={{ 
                                fontSize: '0.8rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                                borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontWeight: '600',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <Plus size={14} /> Add Waypoint
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {formData.routeStops.map((stopId, index) => {
                            const isFirst = index === 0;
                            const isLast = index === formData.routeStops.length - 1;
                            let label = `Waypoint ${index}`;
                            if (isFirst) label = "Origin";
                            else if (isLast) label = "Destination";

                            return (
                                <div 
                                    key={index} 
                                    draggable
                                    onDragStart={(e) => dragStart(e, index)}
                                    onDragEnter={(e) => dragEnter(e, index)}
                                    onDragEnd={drop}
                                    onDragOver={(e) => e.preventDefault()}
                                    style={{ 
                                        display: 'flex', gap: '10px', alignItems: 'center', 
                                        backgroundColor: '#fff', padding: '12px', borderRadius: '8px', 
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        cursor: 'move'
                                    }}
                                >
                                    <div 
                                        style={{ color: '#9ca3af', cursor: 'grab', display: 'flex', alignItems: 'center' }}
                                        title="Drag to reorder"
                                    >
                                        <GripVertical size={20} />
                                    </div>

                                    <div style={{ width: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {isFirst ? <div style={{width: 12, height: 12, borderRadius: '50%', background: '#16a34a', border: '2px solid #bbf7d0'}}></div> : 
                                         isLast ? <MapPin size={18} color="#ef4444" fill="#fee2e2" /> : 
                                         <div style={{width: 10, height: 10, borderRadius: '50%', background: '#9ca3af', border: '2px solid #e5e7eb'}}></div>}
                                    </div>
                                    
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect 
                                            placeholder={`Select ${label}...`} 
                                            options={stops} 
                                            value={stopId} 
                                            onChange={(id) => handleRouteStopChange(index, id)}
                                        />
                                    </div>
                                    
                                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                        {/* Create New Stop Button (Green Plus) */}
                                        <button 
                                            onClick={() => handleCreateStopFromRoute(index)}
                                            title="Create new stop here"
                                            style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Plus size={16} />
                                        </button>

                                        {/* Select Existing Map Button */}
                                        <button 
                                            onClick={() => initiateSelectionMode(index)} 
                                            title="Select existing from Map"
                                            style={{ background: selectionMode === index ? '#3b82f6' : '#f3f4f6', color: selectionMode === index ? 'white' : '#6b7280', border: 'none', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <MapIcon size={16} />
                                        </button>

                                        {!isFirst && !isLast && (
                                            <button onClick={() => removeRouteStopSlot(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        
                                        {(isFirst || isLast) && <div style={{width: 34}}></div>} 
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '12px', background: '#f9fafb', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button onClick={saveRoute} style={{ flex: 1, padding: '12px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}>{editingId ? 'Update Route' : 'Create Route'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
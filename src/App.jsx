// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import RouteManager from './pages/RouteManager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Layout Shell wraps everything */}
        <Route path="/" element={<AdminLayout />}>
          
          {/* Default Page (Dashboard) */}
          <Route index element={<Dashboard />} />
          
          {/* Route Manager Page */}
          <Route path="routes" element={<RouteManager />} />
          
          {/* Placeholder for future Feedbacks page */}
          <Route path="feedbacks" element={<div style={{padding: 20}}>Feedback Page Coming Soon</div>} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
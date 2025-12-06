// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import RouteManager from './pages/RouteManager';
// 1. Import the new component
import FeedbackManager from './pages/FeedbackManager'; 

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
          
          {/* 2. Replace the placeholder div with the component */}
          <Route path="feedbacks" element={<FeedbackManager />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import Conductor from './components/Conductor';
import GovernmentDashboard from './components/GovernmentDashboard';
import AccessPortal from './components/AccessPortal';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AccessPortal initialPortal="passenger" initialPassengerMode="login" />} />
        <Route path="/login" element={<AccessPortal initialPortal="passenger" initialPassengerMode="login" />} />
        <Route path="/register" element={<AccessPortal initialPortal="passenger" initialPassengerMode="register" />} />
        <Route path="/conductor-login" element={<AccessPortal initialPortal="conductor" initialPassengerMode="login" />} />
        <Route path="/government-login" element={<AccessPortal initialPortal="government" initialPassengerMode="login" />} />
        <Route path="/conductor" element={<Conductor />} />
        <Route path="/government" element={<GovernmentDashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;

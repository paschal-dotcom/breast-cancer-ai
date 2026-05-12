import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ScanUpload from './pages/ScanUpload';
import ScanHistory from './pages/ScanHistory';
import ScanResult from './pages/ScanResult';
import ScanCompare from './pages/ScanCompare';
import AdminPanel from './pages/AdminPanel';
import ModelEvaluation from './pages/ModelEvaluation';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function ProtectedRoute({ children, adminOnly }) {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login"    element={!token ? <Login />    : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard"       element={<Dashboard />} />
        <Route path="scan/upload"     element={<ScanUpload />} />
        <Route path="scan/history"    element={<ScanHistory />} />
        <Route path="scan/result/:id" element={<ScanResult />} />
        <Route path="scan/compare"    element={<ScanCompare />} />
        <Route path="evaluation"      element={<ModelEvaluation />} />
        <Route path="admin"           element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
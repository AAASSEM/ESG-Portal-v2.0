import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import TopNavbar from './components/TopNavbar';
import Onboard from './components/Onboard';
import Rame from './components/Rame';
import List from './components/List';
import Meter from './components/Meter';
import Data from './components/Data';
import Dashboard from './components/Dashboardv1';
// import DashboardNew from './components/DashboardNew';
// import DashboardTest from './components/DashboardTest';
// import UnifiedDashboard from './components/UnifiedDashboard';
import UserManagement from './components/UserManagement';
import SiteManagement from './components/SiteManagement';
import TaskAssignment from './components/TaskAssignment';
import ResetPassword from './components/ResetPassword';
import ChangePassword from './components/ChangePassword';
// import DashboardSimple from './components/DashboardSimple'; // Unused
import './App.css';

console.log('App.js loaded');

function App() {
  console.log('App component rendering');
  
  return (
    <Router>
      <AuthProvider>
        <div className="App min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Password reset route (semi-public, requires authentication but no navbar) */}
            <Route path="/reset-password" element={
              <ProtectedRoute>
                <ResetPassword />
              </ProtectedRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Onboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/onboard" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Onboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/rame" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Rame />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/list" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <List />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/meter" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Meter />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/data" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Data />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <TopNavbar />
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-test" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <DashboardTest />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/dashboard-old" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <Dashboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/unified-dashboard" element={
              <ProtectedRoute>
                <TopNavbar />
                <UnifiedDashboard />
              </ProtectedRoute>
            } />
            <Route path="/team" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <UserManagement />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/sites" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <SiteManagement />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <TaskAssignment />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="container mx-auto p-8">
                  <ChangePassword />
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}


export default App;

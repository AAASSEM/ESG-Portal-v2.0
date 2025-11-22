import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Signup from './components/Signup';
import TopNavbar from './components/TopNavbar';
import Home from './components/Home';
import DashboardHome from './components/DashboardHome';
import Onboard from './components/Onboard';
import Rame from './components/Rame';
import List from './components/List';
import Meter from './components/Meter';
import Data from './components/Data';
import ElementAssignments from './components/ElementAssignments';
import Dashboard from './components/Dashboardv1';
import DashboardNew from './components/DashboardNew';
import DashboardTest from './components/DashboardTest';
import UnifiedDashboard from './components/UnifiedDashboard';
import UserManagement from './components/UserManagement';
import SiteManagement from './components/SiteManagement';
import TaskAssignment from './components/TaskAssignment';
import ResetPassword from './components/ResetPassword';
import SetupAccount from './components/SetupAccount';
import ChangePassword from './components/ChangePassword';
import EmailVerification from './components/EmailVerification';
import DeveloperAdminSimple from './components/DeveloperAdminSimple';
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
            <Route path="/verify-email/:token" element={<EmailVerification />} />
            
            {/* Password reset route (semi-public, requires authentication but no navbar) */}
            <Route path="/reset-password" element={
              <ProtectedRoute>
                <ResetPassword />
              </ProtectedRoute>
            } />
            
            {/* Setup account route (for magic link users) */}
            <Route path="/setup-account" element={
              <ProtectedRoute>
                <SetupAccount />
              </ProtectedRoute>
            } />
            
            {/* Public home page */}
            <Route path="/" element={<Home />} />
            
            {/* Protected routes */}
            <Route path="/home" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <DashboardHome />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/onboard" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <Onboard />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/rame" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <Rame />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/list" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <List />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/meter" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <Meter />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/data" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <Data />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/element-assignments" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <ElementAssignments />
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
                <div className="w-full px-4 py-8">
                  <DashboardTest />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/dashboard-old" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
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
                <div className="w-full px-4 py-8">
                  <UserManagement />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/sites" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <SiteManagement />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <TaskAssignment />
                </div>
              </ProtectedRoute>
            } />
            <Route path="/change-password" element={
              <ProtectedRoute>
                <TopNavbar />
                <div className="w-full px-4 py-8">
                  <ChangePassword />
                </div>
              </ProtectedRoute>
            } />

            {/* Developer Admin Panel - Full screen without TopNavbar (public route with its own auth) */}
            <Route path="/developer-admin" element={<DeveloperAdminSimple />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
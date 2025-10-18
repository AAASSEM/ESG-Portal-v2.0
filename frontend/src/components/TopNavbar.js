import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// Role Switcher Dropdown Component for Testing (keeping the existing functionality)
const RoleSwitcherDropdown = ({ currentRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const { user, checkAuthStatus } = useAuth();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const portalDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsidePortal = portalDropdownRef.current && !portalDropdownRef.current.contains(event.target);
      
      if (isOutsideDropdown && isOutsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  const availableRoles = [
    { value: 'super_user', label: 'Super User', color: 'bg-red-100 text-red-700' },
    { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    { value: 'site_manager', label: 'Site Manager', color: 'bg-green-100 text-green-700' },
    { value: 'uploader', label: 'Uploader', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'viewer', label: 'Viewer', color: 'bg-purple-100 text-purple-700' },
    { value: 'meter_manager', label: 'Meter Manager', color: 'bg-orange-100 text-orange-700' }
  ];

  const currentRoleInfo = availableRoles.find(role => role.value === currentRole);

  const handleRoleSwitch = async (newRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/auth/switch-role/`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await checkAuthStatus();
        console.log(`✅ Role switched to: ${newRole}`);
        window.location.reload();
      } else {
        console.error('❌ Role switch failed');
        alert('Failed to switch role. This is a test feature.');
      }
    } catch (error) {
      console.error('Role switch error:', error);
      alert('This is a test feature - role switching would need backend implementation');
    } finally {
      setIsChanging(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        disabled={isChanging}
        className={`text-xs px-2 py-0.5 rounded-full capitalize transition-all duration-200 flex items-center space-x-1 ${
          isChanging 
            ? 'bg-gray-100 text-gray-500 cursor-wait'
            : currentRoleInfo?.color || 'bg-purple-100 text-purple-700'
        } hover:shadow-sm`}
      >
        <span className="text-xs">{isChanging ? 'Switching...' : (currentRoleInfo?.label || currentRole?.replace('_', ' '))}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs`}></i>
      </button>

      {isOpen && createPortal(
        <div 
          ref={portalDropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[999999] min-w-[160px]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Test Role Switch
            </div>
            {availableRoles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSwitch(role.value)}
                disabled={isChanging}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center space-x-2 ${
                  role.value === currentRole ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`px-2 py-0.5 rounded-full ${role.color}`}>
                  {role.label}
                </span>
                {role.value === currentRole && (
                  <i className="fas fa-check text-blue-600 text-xs"></i>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const TopNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, selectedCompany, companies, userSites, selectedSite, switchSite, hasPermission } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Function to get role colors
  const getRoleColor = (role) => {
    const roleColors = {
      'super_user': 'bg-red-100 text-red-700',
      'admin': 'bg-blue-100 text-blue-700',
      'site_manager': 'bg-green-100 text-green-700',
      'uploader': 'bg-yellow-100 text-yellow-700',
      'viewer': 'bg-purple-100 text-purple-700',
      'meter_manager': 'bg-orange-100 text-orange-700'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-700';
  };

  // Navigation items based on your current modules
  const getNavigationItems = () => {
    const baseNavItems = [
      { path: '/onboard', label: 'Company Info', icon: 'fa-solid fa-building' },
      { path: '/rame', label: 'Frameworks', icon: 'fa-solid fa-clipboard-list' },
      { path: '/list', label: 'Checklist', icon: 'fa-solid fa-list-check' },
      { path: '/meter', label: 'Meters', icon: 'fa-solid fa-tachometer-alt' },
      { path: '/data', label: 'Data Collection', icon: 'fa-solid fa-chart-line' },
      { path: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie' },
      { path: '/team', label: 'Team', icon: 'fa-solid fa-users' }
    ];

    // Show all navigation items for all users - individual pages handle access control
    return baseNavItems;
  };

  const navItems = getNavigationItems();

  const isActive = (path) => location.pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 shadow-2xl relative"
         style={{ zIndex: 1000 }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36"></div>
      
      <header className="relative z-20 px-4 md:px-6 lg:px-20 py-4 md:py-6">
        <nav className="flex items-center justify-between gap-2 md:gap-4 lg:gap-6">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <i className="fas fa-leaf text-purple-600 text-lg"></i>
            </div>
            <span className="text-white font-bold text-lg md:text-xl">ESG Portal</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-4 bg-white/10 px-2 py-1 rounded-xl backdrop-blur-sm">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive(item.path) 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
                  }`}
                >
                  <i className={`${item.icon} ${isActive(item.path) ? 'text-white' : ''}`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Site Selector */}
            {userSites && userSites.length > 1 && (
              <select
                value={selectedSite?.id || ''}
                onChange={(e) => {
                  const site = userSites.find(s => s.id === parseInt(e.target.value));
                  if (site) switchSite(site);
                }}
                className="text-sm bg-white/10 border border-white/20 rounded-md px-3 py-1 text-white backdrop-blur-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="" className="text-gray-800">All Sites</option>
                {userSites.map(site => (
                  <option key={site.id} value={site.id} className="text-gray-800">
                    {site.name}
                  </option>
                ))}
              </select>
            )}

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full ring-2 ring-purple-300 bg-purple-500 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex flex-col max-w-48">
                <span className="text-white text-sm font-medium truncate">
                  {user?.name || user?.username || 'User'}
                </span>
                {user?.role && (
                  <>
                    <span className="text-xs text-white leading-tight">
                      <span className="font-medium">
                        {/* <span className={`px-1.5 py-0.5 rounded font-medium ${getRoleColor(user.role)}`}> */}
                        {user.role.replace('_', ' ')}
                        {/* </span> */}
                      </span>
                      <span> of</span>
                    </span>
                    <span className="text-xs text-white break-words leading-tight">
                      {selectedCompany?.name || 'ESG Portal'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="text-gray-300 hover:text-white transition-colors ml-2 p-2"
              title="Logout"
            >
              <i className="fa-solid fa-sign-out-alt"></i>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden text-white p-3 rounded-lg hover:bg-white/10 transition-colors relative z-50"
            aria-label="Toggle mobile menu"
            type="button"
          >
            <i className={`fa-solid ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-purple-700/95 backdrop-blur-md border-t border-white/10 shadow-lg"
               style={{ 
                 zIndex: 9999
               }}>
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    closeMobileMenu();
                  }}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium w-full text-left transition-colors ${
                    isActive(item.path) 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-purple-600/20'
                  }`}
                >
                  <i className={`${item.icon} ${isActive(item.path) ? 'text-white' : ''}`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
              
              {/* Mobile Site Selector */}
              {userSites && userSites.length > 1 && (
                <div className="border-t border-white/10 pt-4 mt-4">
                  <label className="text-gray-300 text-sm mb-2 block">Site Selection</label>
                  <select
                    value={selectedSite?.id || ''}
                    onChange={(e) => {
                      const site = userSites.find(s => s.id === parseInt(e.target.value));
                      if (site) switchSite(site);
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white backdrop-blur-sm"
                  >
                    <option value="" className="text-gray-800">All Sites</option>
                    {userSites.map(site => (
                      <option key={site.id} value={site.id} className="text-gray-800">
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Mobile User Section */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-4 py-2">
                  <div className="w-8 h-8 rounded-full ring-2 ring-purple-300 bg-purple-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">
                      {user?.name || user?.username || 'User'}
                    </span>
                    {user?.role && (
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                        {/* <RoleSwitcherDropdown currentRole={user.role} /> */}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/10 transition-colors font-medium w-full"
                >
                  <i className="fa-solid fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

    </div>
  );
};

export default TopNavbar;
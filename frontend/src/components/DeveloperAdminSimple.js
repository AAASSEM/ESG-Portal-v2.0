import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// User Management Section Component
const UserManagementSection = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmUser, setConfirmUser] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading users...');

      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/users/list/`;
      console.log(`Fetching URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Users loaded:', data.users?.length || 0);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUserAction = async (userId, action, confirmation = '') => {
    try {
      setActionLoading(true);
      setError(null);

      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/users/${userId}/action/`;
      console.log(`Performing user action at: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          confirmation: confirmation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Action completed:', data);

      // Refresh users list
      await loadUsers();

      // Show success message
      alert(data.message);
    } catch (error) {
      console.error('Error performing user action:', error);
      setError(error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  const showConfirmation = (user, action, message) => {
    setConfirmUser(user);
    setConfirmAction(action);
    setConfirmMessage(message);
    setShowConfirmDialog(true);
  };

  const confirmActionHandler = () => {
    if (confirmAction && confirmUser) {
      handleUserAction(confirmUser.id, confirmAction.action, confirmAction.confirmation);
      setShowConfirmDialog(false);
      setConfirmUser(null);
      setConfirmAction(null);
      setConfirmMessage('');
    }
  };

  const cancelAction = () => {
    setShowConfirmDialog(false);
    setConfirmUser(null);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (user) => {
    if (!user.is_active) {
      return <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">Inactive</span>;
    }
    if (user.email_verified) {
      return <span className="px-2 py-1 text-xs rounded bg-green-600 text-white">Verified</span>;
    }
    return <span className="px-2 py-1 text-xs rounded bg-yellow-600 text-white">Unverified</span>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      'super_user': 'bg-purple-600 text-white',
      'admin': 'bg-blue-600 text-white',
      'site_manager': 'bg-green-600 text-white',
      'meter_manager': 'bg-orange-600 text-white',
      'uploader': 'bg-cyan-600 text-white',
      'viewer': 'bg-gray-600 text-white'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[role] || 'bg-gray-600 text-white'}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">User Management</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-600 text-white rounded-lg">
          Error: {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div className="text-white text-sm font-medium">
              Total Users: {filteredUsers.length} {searchTerm && `(filtered from ${users.length})`}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Companies</div>
            <div className="col-span-2">Meters</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>

        <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 hover:bg-gray-700">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-2">
                    <div className="text-white font-medium">{user.username}</div>
                    <div className="text-gray-400 text-sm">{user.email}</div>
                  </div>
                  <div className="col-span-2">
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(user)}
                  </div>
                  <div className="col-span-2">
                    <div className="text-white">{user.company_count}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-white">{user.meter_count}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex gap-2">
                      {user.is_active ? (
                        <button
                          onClick={() => showConfirmation(
                            user,
                            { action: 'deactivate', confirmation: 'DEACTIVATE_CONFIRMED' },
                            `Are you sure you want to deactivate ${user.username}?`
                          )}
                          className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user.id, 'activate')}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => showConfirmation(
                          user,
                          { action: 'reset_password', confirmation: '' },
                          `Are you sure you want to force password reset for ${user.username}?`
                        )}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => showConfirmation(
                          user,
                          { action: 'delete', confirmation: 'DELETE_CONFIRMED' },
                          `⚠️ This will PERMANENTLY delete ${user.username} and all their data. Type 'DELETE_CONFIRMED' to proceed.`
                        )}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {actionLoading && (
        <div className="fixed top-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg z-50">
          Processing user action...
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Action</h3>
            <p className="text-gray-300 mb-6">{confirmMessage}</p>

            {confirmAction?.action === 'delete' && (
              <input
                type="text"
                placeholder="Type DELETE_CONFIRMED to proceed"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
                onChange={(e) => {
                  if (e.target.value === 'DELETE_CONFIRMED') {
                    setConfirmAction({ ...confirmAction, userConfirmed: true });
                  } else {
                    setConfirmAction({ ...confirmAction, userConfirmed: false });
                  }
                }}
              />
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelAction}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmActionHandler}
                disabled={confirmAction?.action === 'delete' && !confirmAction?.userConfirmed}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DeveloperAdminSimple = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [showLogin, setShowLogin] = useState(true);

  // Simple developer login
  const handleDevLogin = (e) => {
    e.preventDefault();

    // Simple developer password - change this in production
    const DEVELOPER_PASSWORD = 'devadmin123!';

    if (devPassword === DEVELOPER_PASSWORD) {
      setIsAuthenticated(true);
      setShowLogin(false);
      loadSystemHealth();
      loadFeatureFlags();
      localStorage.setItem('devAuth', 'true');
    } else {
      setError('Incorrect developer password');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Check if already authenticated
  useEffect(() => {
    const savedAuth = localStorage.getItem('devAuth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      setShowLogin(false);
      loadSystemHealth();
      loadFeatureFlags();
    }
  }, []);

  const loadSystemHealth = async () => {
    try {
      setLoading(true);
      console.log('Loading system health...');
      console.log('API_BASE_URL:', API_BASE_URL);

      // Construct URL based on API_BASE_URL
      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/system/health/`;
      console.log(`Fetching URL: ${url}`);

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('System health data loaded:', data);
        setSystemHealth(data);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
      setError('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureFlags = async () => {
    try {
      console.log('Loading feature flags...');
      console.log('API_BASE_URL:', API_BASE_URL);

      // Construct URL based on API_BASE_URL
      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/feature-flags/`;
      console.log(`Fetching URL: ${url}`);

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Feature flags data loaded:', data);
        setFeatureFlags(data.flags);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      setError('Failed to load feature flags');
    }
  };

  const toggleFeatureFlag = async (flagId, currentValue) => {
    try {
      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/feature-flags/${flagId}/`;
      console.log(`Toggling feature flag at: ${url}`);

      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flag: {
            value: !currentValue
          }
        })
      });

      if (response.ok) {
        console.log('Feature flag updated successfully');
        await loadFeatureFlags(); // Reload flags
      } else {
        const errorText = await response.text();
        console.error('Failed to update feature flag:', errorText);
        setError('Failed to update feature flag');
      }
    } catch (error) {
      setError('Error updating feature flag');
      console.error('Error toggling flag:', error);
    }
  };

  // Helper function to get CSRF token
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const runManagementCommand = async (command) => {
    if (!window.confirm(`Are you sure you want to run "${command}"? This could affect system state.`)) {
      return;
    }

    try {
      setLoading(true);
      const baseUrl = API_BASE_URL || '';
      const url = `${baseUrl}/api/admin/tools/command/`;
      console.log(`Running management command at: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Command executed successfully!\n\nOutput:\n${data.output}`);
      } else {
        const errorText = await response.text();
        console.error('Failed to run management command:', errorText);
        setError('Failed to run management command');
      }
    } catch (error) {
      setError('Error running command');
      console.error('Error running command:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show developer login screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-3xl font-bold text-white mb-2">Developer Access</h2>
            <p className="text-gray-400">ESG Portal Control Panel</p>
          </div>

          <form onSubmit={handleDevLogin} className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Developer Password
              </label>
              <input
                type="password"
                value={devPassword}
                onChange={(e) => setDevPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                placeholder="Enter developer password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-50 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Access Developer Panel
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              <strong>Developer Password:</strong> <span className="text-blue-400">devadmin123!</span>
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.href = '/'}
              className="text-gray-400 hover:text-gray-300 text-sm"
            >
              ← Back to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 min-h-screen p-4">
        <div className="text-white mb-8">
          <h1 className="text-xl font-bold flex items-center gap-2">
            ⚙️ Developer Control Panel
          </h1>
          <p className="text-gray-400 text-sm">ESG Portal - Developer Access</p>
          <div className="mt-4 p-2 bg-green-900 rounded">
            <p className="text-green-400 text-xs">✓ Authenticated</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeSection === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveSection('feature-flags')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeSection === 'feature-flags'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            🎚️ Feature Flags
          </button>
          <button
            onClick={() => setActiveSection('system-monitor')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeSection === 'system-monitor'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            🖥️ System Monitor
          </button>
          <button
            onClick={() => setActiveSection('database-tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeSection === 'database-tools'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            💾 Database Tools
          </button>
          <button
            onClick={() => setActiveSection('user-management')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeSection === 'user-management'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            👥 User Management
          </button>
        </nav>

        {systemHealth && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <div className="text-green-400 text-sm font-medium mb-2">System Status</div>
            <div className="text-white text-xs space-y-1">
              <div>CPU: {systemHealth.system.cpu_percent}%</div>
              <div>RAM: {systemHealth.system.memory.percent}%</div>
              <div>Users: {systemHealth.application.active_users}</div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => {
              localStorage.removeItem('devAuth');
              setIsAuthenticated(false);
              setShowLogin(true);
            }}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Logout Developer
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50">
            Loading...
          </div>
        )}

        {activeSection === 'dashboard' && (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-8">System Dashboard</h2>

            {systemHealth && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">System Resources</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>CPU Usage</span>
                        <span>{systemHealth.system.cpu_percent}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            systemHealth.system.cpu_percent > 80 ? 'bg-red-500' :
                            systemHealth.system.cpu_percent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemHealth.system.cpu_percent}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>Memory Usage</span>
                        <span>{systemHealth.system.memory.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            systemHealth.system.memory.percent > 80 ? 'bg-red-500' :
                            systemHealth.system.memory.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemHealth.system.memory.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => runManagementCommand('collectstatic')}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Collect Static Files
                    </button>
                    <button
                      onClick={() => runManagementCommand('clearsessions')}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                    >
                      Clear Sessions
                    </button>
                    <button
                      onClick={loadSystemHealth}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Refresh Health Data
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Active Users</span>
                      <span className="text-blue-400">{systemHealth.application.active_users}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total Companies</span>
                      <span className="text-purple-400">{systemHealth.application.total_companies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Data Submissions</span>
                      <span className="text-green-400">{systemHealth.application.total_submissions}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'feature-flags' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Feature Flags</h2>
              <button
                onClick={loadFeatureFlags}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Action</div>
                </div>
              </div>

              <div className="divide-y divide-gray-700">
                {featureFlags.map(flag => (
                  <div key={flag.id} className="px-6 py-4 hover:bg-gray-700 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="text-white font-medium">{flag.name}</div>
                        <div className="text-gray-400 text-xs">{flag.key}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded">
                          {flag.category}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <div className="text-gray-300 text-sm">{flag.description}</div>
                      </div>
                      <div className="col-span-2">
                        {flag.flag_type === 'boolean' && (
                          <button
                            onClick={() => toggleFeatureFlag(flag.id, flag.value)}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              flag.value ? 'bg-green-600' : 'bg-red-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              flag.value ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        )}
                        {flag.flag_type !== 'boolean' && (
                          <span className="text-gray-400">{String(flag.value)}</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <div className="flex items-center gap-2">
                          {flag.is_active ? (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'database-tools' && (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-8">Database Tools</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Management Commands</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => runManagementCommand('populate_initial_data')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-left"
                  >
                    Populate Initial Data
                  </button>
                  <button
                    onClick={() => runManagementCommand('import_comprehensive_esg_framework')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-left"
                  >
                    Import ESG Framework
                  </button>
                  <button
                    onClick={() => runManagementCommand('populate_profiling_questions')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-left"
                  >
                    Populate Profiling Questions
                  </button>
                  <button
                    onClick={() => runManagementCommand('update_company_frameworks')}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-left"
                  >
                    Update Company Frameworks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'user-management' && (
          <UserManagementSection />
        )}
        {activeSection === 'system-monitor' && (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-8">System Monitor</h2>

            {systemHealth && (
              <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Real-time Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-4 rounded">
                      <div className="text-2xl font-bold text-white mb-1">{systemHealth.system.cpu_percent}%</div>
                      <div className="text-gray-400 text-sm">CPU Usage</div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded">
                      <div className="text-2xl font-bold text-white mb-1">{systemHealth.system.memory.percent}%</div>
                      <div className="text-gray-400 text-sm">Memory Usage</div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded">
                      <div className="text-2xl font-bold text-white mb-1">{systemHealth.system.disk.percent.toFixed(1)}%</div>
                      <div className="text-gray-400 text-sm">Disk Usage</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={loadSystemHealth}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Metrics
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperAdminSimple;
import React, { useState, useEffect } from 'react';
import { FaServer, FaCog, FaChartLine, FaFileAlt, FaDatabase, FaUsers, FaEnvelope, FaShieldAlt, FaTools, FaExclamationTriangle } from 'react-icons/fa';

const DeveloperAdmin = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [systemHealth, setSystemHealth] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [userStats, setUserStats] = useState(null);

  // Check admin access on mount
  useEffect(() => {
    checkAdminAccess();
    loadSystemHealth();
    loadFeatureFlags();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/access/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Access denied');
      }

      const data = await response.json();
      console.log('Admin access confirmed:', data);
    } catch (error) {
      setError('Access denied. Super user privileges required.');
      console.error('Admin access error:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system/health/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureFlags = async () => {
    try {
      const response = await fetch('/api/admin/feature-flags/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeatureFlags(data.flags);
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  };

  const toggleFeatureFlag = async (flagId, currentValue) => {
    try {
      const response = await fetch(`/api/admin/feature-flags/${flagId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          flag: {
            value: !currentValue
          }
        })
      });

      if (response.ok) {
        await loadFeatureFlags(); // Reload flags
      } else {
        setError('Failed to update feature flag');
      }
    } catch (error) {
      setError('Error updating feature flag');
      console.error('Error toggling flag:', error);
    }
  };

  const loadSystemLogs = async (level = 'INFO', lines = 100, search = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/system/logs/?level=${level}&lines=${lines}&search=${search}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      setError('Failed to load system logs');
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const runManagementCommand = async (command) => {
    if (!window.confirm(`Are you sure you want to run "${command}"? This could affect system state.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/tools/command/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ command })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Command executed successfully!\n\nOutput:\n${data.output}`);
      } else {
        setError('Failed to run management command');
      }
    } catch (error) {
      setError('Error running command');
      console.error('Error running command:', error);
    } finally {
      setLoading(false);
    }
  };

  const emergencyAction = async (action) => {
    const confirmation = prompt(`This is an EMERGENCY ACTION! Type "EMERGENCY_CONFIRMED" to proceed with: ${action}`);

    if (confirmation !== 'EMERGENCY_CONFIRMED') {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/emergency/controls/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: action,
          confirmation: confirmation
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Emergency action completed!\n\n${data.message}`);
        await loadSystemHealth();
        await loadFeatureFlags();
      } else {
        setError('Failed to execute emergency action');
      }
    } catch (error) {
      setError('Error executing emergency action');
      console.error('Error with emergency action:', error);
    } finally {
      setLoading(false);
    }
  };

  // Move menuItems outside of render function to prevent re-creation
  const menuItems = [
    { id: 'dashboard', icon: FaChartLine, label: 'Dashboard' },
    { id: 'feature-flags', icon: FaCog, label: 'Feature Flags' },
    { id: 'system-monitor', icon: FaServer, label: 'System Monitor' },
    { id: 'logs', icon: FaFileAlt, label: 'Logs' },
    { id: 'database-tools', icon: FaDatabase, label: 'Database Tools' },
    { id: 'users', icon: FaUsers, label: 'Users' },
    { id: 'email-tools', icon: FaEnvelope, label: 'Email Tools' },
    { id: 'emergency', icon: FaExclamationTriangle, label: 'Emergency' },
  ];

  const renderSidebar = () => {

    return (
      <div className="w-64 bg-gray-900 min-h-screen p-4">
        <div className="text-white mb-8">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FaTools className="text-red-500" />
            Developer Admin
          </h1>
          <p className="text-gray-400 text-sm">ESG Portal Control Center</p>
        </div>

        <nav className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
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
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
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
                    <div>
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>Disk Usage</span>
                        <span>{systemHealth.system.disk.percent.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            systemHealth.system.disk.percent > 90 ? 'bg-red-500' :
                            systemHealth.system.disk.percent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemHealth.system.disk.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Application Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Debug Mode</span>
                      <span className={systemHealth.application.debug_mode ? 'text-yellow-400' : 'text-green-400'}>
                        {systemHealth.application.debug_mode ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Database</span>
                      <span className="text-green-400">{systemHealth.application.database}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Cache</span>
                      <span className={systemHealth.application.cache === 'Active' ? 'text-green-400' : 'text-red-400'}>
                        {systemHealth.application.cache}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Email Backend</span>
                      <span className="text-blue-400 text-xs truncate">
                        {systemHealth.application.email_backend.split('.')[-1]}
                      </span>
                    </div>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Uptime</span>
                      <span className="text-orange-400">{Math.floor(systemHealth.uptime / 3600)}h</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    onClick={() => loadSystemHealth()}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Refresh Health Data
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Feature Flag Changes</h3>
                <div className="space-y-2">
                  {featureFlags.slice(0, 5).map(flag => (
                    <div key={flag.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{flag.name}</span>
                      <span className={flag.value ? 'text-green-400' : 'text-red-400'}>
                        {flag.value ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'feature-flags':
        return (
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
        );

      case 'system-monitor':
        return (
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

                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Memory Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Total Memory</div>
                      <div className="text-white">{(systemHealth.system.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Available Memory</div>
                      <div className="text-green-400">{(systemHealth.system.memory.available / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Used Memory</div>
                      <div className="text-yellow-400">{(systemHealth.system.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Total Disk</div>
                      <div className="text-white">{(systemHealth.system.disk.total / 1024 / 1024 / 1024).toFixed(2)} GB</div>
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
        );

      case 'logs':
        return (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">System Logs</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                  onChange={(e) => loadSystemLogs('INFO', 100, e.target.value)}
                />
                <button
                  onClick={() => loadSystemLogs()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <div className="max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs to display</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-2 text-gray-300">
                      <pre className="whitespace-pre-wrap">{log}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'database-tools':
        return (
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

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Cache Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => emergencyAction('clear_all_cache')}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Clear All Cache
                  </button>
                  <button
                    onClick={() => runManagementCommand('clearsessions')}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  >
                    Clear Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-8">User Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-2xl font-bold text-blue-400 mb-2">
                  {systemHealth?.application?.active_users || 0}
                </div>
                <div className="text-gray-400">Active Users</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  {systemHealth?.application?.total_companies || 0}
                </div>
                <div className="text-gray-400">Total Companies</div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Create Test User</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  fetch('/api/admin/users/manage/', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                      action: 'create_test_user',
                      username: formData.get('username'),
                      role: formData.get('role'),
                      email: formData.get('email')
                    })
                  }).then(response => response.json()).then(data => {
                    if (data.success) {
                      alert('Test user created successfully!');
                      e.target.reset();
                    } else {
                      alert('Error creating test user: ' + data.error);
                    }
                  });
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  required
                  className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <select
                  name="role"
                  className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="uploader">Uploader</option>
                  <option value="admin">Admin</option>
                  <option value="super_user">Super User</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Create User
                </button>
              </form>
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-red-500 mb-8">Emergency Controls</h2>

            <div className="bg-red-900 border-2 border-red-600 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold text-white mb-2">⚠️ WARNING</h3>
              <p className="text-gray-300">These actions can affect system availability. Use with extreme caution.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">System Controls</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => emergencyAction('enable_maintenance_mode')}
                    className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                  >
                    🚨 Enable Maintenance Mode
                  </button>
                  <button
                    onClick={() => emergencyAction('disable_all_logins')}
                    className="w-full px-4 py-3 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-medium"
                  >
                    🚫 Disable All Logins
                  </button>
                  <button
                    onClick={() => emergencyAction('clear_all_cache')}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors font-medium"
                  >
                    🗑️ Clear All Cache
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Maintenance Mode</span>
                    <span className="text-red-400">
                      {featureFlags.find(f => f.key === 'maintenance_mode')?.value ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">User Registration</span>
                    <span className={
                      featureFlags.find(f => f.key === 'user_registration')?.value ? 'text-green-400' : 'text-red-400'
                    }>
                      {featureFlags.find(f => f.key === 'user_registration')?.value ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Email Notifications</span>
                    <span className={
                      featureFlags.find(f => f.key === 'email_notifications')?.value ? 'text-green-400' : 'text-red-400'
                    }>
                      {featureFlags.find(f => f.key === 'email_notifications')?.value ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8">
            <h2 className="text-3xl font-bold text-white mb-4">Page Not Found</h2>
            <p className="text-gray-400">The requested section does not exist.</p>
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-red-300 mb-4">Access Denied</h2>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {renderSidebar()}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50">
            Loading...
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default DeveloperAdmin;
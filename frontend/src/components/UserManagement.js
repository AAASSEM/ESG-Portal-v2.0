import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const UserManagement = () => {
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const { user, selectedCompany, hasPermission, userSites } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', title: '', message: '', details: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showRoleFilterModal, setShowRoleFilterModal] = useState(false);
  const [showStatusFilterModal, setShowStatusFilterModal] = useState(false);

  const roleOptions = [
    { value: 'super_user', label: 'Super User', description: 'System-wide administrator with full access' },
    { value: 'admin', label: 'Admin', description: 'Company-level administrator' },
    { value: 'site_manager', label: 'Site Manager', description: 'Site/location manager' },
    { value: 'uploader', label: 'Uploader', description: 'Data entry specialist' },
    { value: 'viewer', label: 'Viewer/Auditor', description: 'Read-only access with reports' },
    { value: 'meter_manager', label: 'Meter Manager', description: 'Meter infrastructure specialist' }
  ];

  const getAvailableRoles = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'super_user':
        return roleOptions;
      case 'admin':
        return roleOptions.filter(r => r.value !== 'super_user');
      case 'site_manager':
        return roleOptions.filter(r => !['super_user', 'admin'].includes(r.value));
      default:
        return [];
    }
  };

  // Role hierarchy validation
  const canManageUser = (targetUserRole) => {
    if (!user) return false;
    
    const manageHierarchy = {
      'super_user': ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
      'admin': ['site_manager', 'uploader', 'viewer', 'meter_manager'],  // Cannot manage other admins or super_user
      'site_manager': ['uploader', 'viewer', 'meter_manager'],  // Cannot manage other site managers
      'uploader': [],
      'viewer': [],
      'meter_manager': []
    };
    
    const allowedRoles = manageHierarchy[user.role] || [];
    return allowedRoles.includes(targetUserRole);
  };

  const canCreateRole = (targetRole) => {
    if (!user) return false;
    
    const createHierarchy = {
      'super_user': ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
      'admin': ['admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],  // Can create other admins
      'site_manager': ['uploader', 'viewer', 'meter_manager'],  // Cannot create site managers or above
      'uploader': [],
      'viewer': [],
      'meter_manager': []
    };
    
    const allowedRoles = createHierarchy[user.role] || [];
    return allowedRoles.includes(targetRole);
  };

  // Check if user has permission to access user management
  const canAccessUserManagement = () => {
    if (!user) return false;
    return ['super_user', 'admin', 'site_manager'].includes(user.role);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = user.role === 'super_user' 
        ? `${API_BASE_URL}/api/users/`
        : `${API_BASE_URL}/api/users/my-team/`;
      
      const response = await makeAuthenticatedRequest(url);
      
      if (response.ok) {
        const data = await response.json();
        const usersData = Array.isArray(data) ? data : data.results || [];
        console.log('🏢 Company Data Structure Debug:');
        console.log('selectedCompany:', selectedCompany);
        console.log('users array:', usersData);
        if (usersData.length > 0) {
          console.log('First user object:', usersData[0]);
          console.log('First user company:', usersData[0].company);
        }
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('userManagement', 'read')) {
      fetchUsers();
    }
  }, [selectedCompany, hasPermission]);

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_user: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      site_manager: 'bg-blue-100 text-blue-800',
      uploader: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
      meter_manager: 'bg-orange-100 text-orange-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleDateString();
  };

  // Show notification modal
  const showNotification = (type, title, message, details = '') => {
    setNotification({ show: true, type, title, message, details });
  };

  const hideNotification = () => {
    setNotification({ show: false, type: '', title: '', message: '', details: '' });
  };

  // Handle user actions
  const handleEditUser = (user) => {
    // Check role hierarchy before allowing edit
    if (!canManageUser(user.role)) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Unable to update user information',
        details: `You cannot manage users with ${user.role} role`
      });
      return;
    }
    
    setUserToEdit(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user) => {
    // Check role hierarchy before allowing delete
    if (!canManageUser(user.role)) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Unable to delete user',
        details: `You cannot manage users with ${user.role} role`
      });
      return;
    }
    
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleResetPassword = async (user) => {
    // Check role hierarchy before allowing password reset
    if (!canManageUser(user.role)) {
      setNotification({
        show: true,
        type: 'error',
        title: 'Password Reset Failed',
        message: 'Unable to reset user password',
        details: `You cannot manage users with ${user.role} role`
      });
      return;
    }
    
    if (!window.confirm(`Reset password for ${user.name} (${user.email})?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/${user.id}/reset-password/`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(
          'success',
          'Password Reset Successful',
          `Password has been reset for ${user.name}`,
          `Temporary password: ${data.temporary_password}\n\nPlease share this with the user securely.`
        );
      } else {
        const error = await response.json();
        showNotification(
          'error',
          'Password Reset Failed',
          'Unable to reset user password',
          error.error || 'Unknown error occurred'
        );
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      showNotification(
        'error',
        'Password Reset Failed',
        'Network error occurred',
        'Please check your connection and try again'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setIsProcessing(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/${userToDelete.id}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification(
          'success',
          'User Deleted Successfully',
          `${userToDelete.name} has been removed from the system`,
          'The user no longer has access to the platform'
        );
        fetchUsers(); // Refresh the list
        setShowDeleteModal(false);
        setUserToDelete(null);
      } else {
        const error = await response.json();
        showNotification(
          'error',
          'Delete Failed',
          'Unable to delete user',
          error.error || 'Unknown error occurred'
        );
      }
    } catch (error) {
      console.error('Delete user failed:', error);
      showNotification(
        'error',
        'Delete Failed',
        'Network error occurred',
        'Please check your connection and try again'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Role Selection Modal
  const RoleSelectionModal = ({ isOpen, onClose, onRoleSelect }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const availableRoles = getAvailableRoles();

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999999]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl relative z-[9999999]">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Select User Role</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRoles.map(role => (
              <button
                key={role.value}
                onClick={() => {
                  setSelectedRole(role);
                  onRoleSelect(role);
                  onClose();
                }}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className={`fas ${getRoleIcon(role.value)} text-purple-600`}></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{role.label}</h4>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // Helper function to get role icons
  const getRoleIcon = (role) => {
    switch(role) {
      case 'super_user': return 'fa-crown';
      case 'admin': return 'fa-user-shield';
      case 'site_manager': return 'fa-building';
      case 'uploader': return 'fa-upload';
      case 'viewer': return 'fa-eye';
      case 'meter_manager': return 'fa-tachometer-alt';
      default: return 'fa-user';
    }
  };

  // Role Filter Modal
  const RoleFilterModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleRoleSelect = (roleValue) => {
      setRoleFilter(roleValue);
      onClose();
    };

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999999]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-lg p-4 w-full max-w-sm mx-4">
          <h3 className="text-base font-medium text-gray-900 mb-3">Filter by Role</h3>
          
          <div className="space-y-2">
            <button
              onClick={() => handleRoleSelect('all')}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                roleFilter === 'all'
                  ? 'border-purple-300 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-gray-600"></i>
                </div>
                <span className="font-medium text-gray-900">All Roles</span>
              </div>
            </button>
            
            {roleOptions.map(role => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  roleFilter === role.value
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getRoleBadgeColor(role.value)}`}>
                    <i className={`fas ${getRoleIcon(role.value)} text-sm`}></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{role.label}</p>
                    <p className="text-xs text-gray-500">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // Status Filter Modal
  const StatusFilterModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleStatusSelect = (statusValue) => {
      setStatusFilter(statusValue);
      onClose();
    };

    const statusOptions = [
      { value: 'all', label: 'All Status', icon: 'fa-users', color: 'bg-gray-100 text-gray-600' },
      { value: 'active', label: 'Active', icon: 'fa-check-circle', color: 'bg-green-100 text-green-600' },
      { value: 'inactive', label: 'Inactive', icon: 'fa-times-circle', color: 'bg-red-100 text-red-600' }
    ];

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999999]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-lg p-4 w-full max-w-sm mx-4">
          <h3 className="text-base font-medium text-gray-900 mb-3">Filter by Status</h3>
          
          <div className="space-y-2">
            {statusOptions.map(status => (
              <button
                key={status.value}
                onClick={() => handleStatusSelect(status.value)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  statusFilter === status.value
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.color}`}>
                    <i className={`fas ${status.icon} text-sm`}></i>
                  </div>
                  <span className="font-medium text-gray-900">{status.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  const AddUserModal = ({ isOpen, onClose, onSuccess, selectedRole }) => {
    const [formData, setFormData] = useState({
      email: '',
      name: '',
      role: selectedRole?.value || '',
      sites: [],
      sendWelcomeEmail: true
    });
    const [submitting, setSubmitting] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    // Update role when selectedRole changes
    useEffect(() => {
      if (selectedRole) {
        setFormData(prev => ({ ...prev, role: selectedRole.value }));
      }
    }, [selectedRole]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/`, {
          method: 'POST',
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const data = await response.json();
          showNotification(
            'success',
            'User Created Successfully',
            `${formData.name} has been added to the system`,
            'A welcome email has been sent with login credentials'
          );
          onSuccess();
          setFormData({ email: '', name: '', role: '', sites: [], sendWelcomeEmail: true });
        } else {
          const error = await response.json();
          showNotification(
            'error',
            'User Creation Failed',
            'Unable to create new user',
            error.error || 'Unknown error occurred'
          );
        }
      } catch (error) {
        console.error('Failed to create user:', error);
        showNotification(
          'error',
          'User Creation Failed',
          'Network error occurred',
          'Please check your connection and try again'
        );
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen) return null;

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000000]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
            setShowRoleSelection(true);
          }
        }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl relative z-[10000001]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New {selectedRole?.label}</h3>
            <button
              type="button"
              onClick={() => {
                onClose();
                setShowRoleSelection(true);
              }}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              Change Role
            </button>
          </div>
          
          {/* Selected Role Display */}
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className={`fas ${getRoleIcon(selectedRole?.value)} text-purple-600 text-sm`}></i>
              </div>
              <div>
                <p className="font-medium text-purple-900">{selectedRole?.label}</p>
                <p className="text-xs text-purple-700">{selectedRole?.description}</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {['site_manager', 'uploader', 'meter_manager'].includes(formData.role) && userSites.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Sites</label>
                <div className="mt-1 space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {userSites.map(site => (
                    <label key={site.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.sites.includes(site.id)}
                        onChange={(e) => {
                          const sites = e.target.checked
                            ? [...formData.sites, site.id]
                            : formData.sites.filter(id => id !== site.id);
                          setFormData({...formData, sites});
                        }}
                      />
                      <span className="text-sm">{site.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => setFormData({...formData, sendWelcomeEmail: e.target.checked})}
              />
              <label className="text-sm text-gray-700">Send welcome email</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  // Edit User Modal
  const EditUserModal = ({ isOpen, onClose, user, onSuccess }) => {
    const [formData, setFormData] = useState({
      email: '',
      name: '',
      role: '',
      sites: [],
      is_active: true
    });
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: 'error' });
    const [showRoleOptions, setShowRoleOptions] = useState(false);

    // Update form data when user changes
    useEffect(() => {
      if (user) {
        setFormData({
          email: user.email || '',
          name: user.name || '',
          role: user.role || '',
          sites: user.sites || [],
          is_active: user.is_active !== false
        });
      }
      // Clear any alerts when modal opens/changes
      setAlert({ show: false, message: '', type: 'error' });
    }, [user, isOpen]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user) return;

      // Validation like in meter modal
      if (!formData.email.trim() || !formData.name.trim() || !formData.role) {
        setAlert({ show: true, message: 'Please fill in required fields (Email, Name, and Role)', type: 'error' });
        return;
      }

      setAlert({ show: false, message: '', type: 'error' });
      setSubmitting(true);

      try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/${user.id}/`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          showNotification(
            'success',
            'User Updated Successfully',
            `${user.name}'s information has been updated`,
            'Changes have been saved to the system'
          );
          onSuccess();
        } else {
          const error = await response.json();
          showNotification(
            'error',
            'Update Failed',
            'Unable to update user information',
            error.error || 'Unknown error occurred'
          );
        }
      } catch (error) {
        console.error('Failed to update user:', error);
        showNotification(
          'error',
          'Update Failed',
          'Network error occurred',
          'Please check your connection and try again'
        );
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen || !user) return null;

    const availableRoles = getAvailableRoles();

    return (
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-[9999999]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
      >
        <div className="bg-white rounded-md p-5 border w-full max-w-md shadow-lg mx-4">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Alert Message */}
            {alert.show && (
              <div className={`p-3 rounded-lg mb-4 ${
                alert.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <i className={`fas ${alert.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
                  <span className="text-sm">{alert.message}</span>
                </div>
              </div>
            )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection - Meter style */}
            {showRoleOptions ? (
              <div>
                <p className="text-gray-600 mb-4">Select the role for this user:</p>
                <div className="space-y-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                      onClick={() => {
                        setFormData({...formData, role: role.value});
                        setShowRoleOptions(false);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <i className={`fas ${getRoleIcon(role.value)} text-gray-600`}></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{role.label}</p>
                          <p className="text-sm text-gray-500">{role.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className={`fas ${getRoleIcon(formData.role)} text-purple-600`}></i>
                    </div>
                    <span className="font-medium text-gray-900">
                      {roleOptions.find(r => r.value === formData.role)?.label || formData.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => setShowRoleOptions(true)}
                  >
                    Change Role
                  </button>
                </div>
              </div>
            )}

            {/* Other form fields - only show when not selecting role */}
            {!showRoleOptions && (
              <>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., john.doe@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {['site_manager', 'uploader', 'meter_manager'].includes(formData.role) && userSites.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Sites</label>
                <div className="mt-1 space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {userSites.map(site => (
                    <label key={site.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.sites.includes(site.id)}
                        onChange={(e) => {
                          const sites = e.target.checked
                            ? [...formData.sites, site.id]
                            : formData.sites.filter(id => id !== site.id);
                          setFormData({...formData, sites});
                        }}
                      />
                      <span className="text-sm">{site.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* User Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_active: true})}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.is_active
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_active: false})}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !formData.is_active
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Inactive
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.is_active ? 'User can log in and access the system' : 'User cannot log in or access the system'}
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
            </>
            )}
          </form>
          </div>
        </div>
      </div>
    );
  };

  // Delete User Modal
  const DeleteUserModal = ({ isOpen, onClose, user, onConfirm, isProcessing }) => {
    if (!isOpen || !user) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-red-900">Delete User</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="mb-6">
            <div className="text-center mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
              <p className="text-gray-700">
                Are you sure you want to delete <strong>{user.name}</strong> ({user.email})?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone. The user will lose access to the system immediately.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Notification Modal
  const NotificationModal = ({ notification, onClose }) => {
    if (!notification.show) return null;

    const getIcon = () => {
      switch (notification.type) {
        case 'success':
          return 'fas fa-check-circle text-green-500';
        case 'error':
          return 'fas fa-exclamation-triangle text-red-500';
        case 'warning':
          return 'fas fa-exclamation-triangle text-yellow-500';
        default:
          return 'fas fa-info-circle text-blue-500';
      }
    };

    const getBgColor = () => {
      switch (notification.type) {
        case 'success':
          return 'bg-green-50 border-green-200';
        case 'error':
          return 'bg-red-50 border-red-200';
        case 'warning':
          return 'bg-yellow-50 border-yellow-200';
        default:
          return 'bg-blue-50 border-blue-200';
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000010]"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0,
          padding: 0
        }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative z-[10000011]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">{notification.title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className={`p-4 rounded-lg border ${getBgColor()} mb-4`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <i className={`${getIcon()} text-2xl`}></i>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                {notification.details && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 whitespace-pre-line">{notification.details}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If no permission, show permission denied message
  if (!canAccessUserManagement()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access user management.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading users...</span>
      </div>
    );
  }

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) || 
                         (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-gray-600">Manage users and their access to the platform</p>
            {selectedCompany && (
              <div className="flex items-center text-sm text-purple-700 bg-purple-50 px-3 py-1 rounded-md border border-purple-200">
                <i className="fas fa-building mr-2 text-purple-600"></i>
                <span className="font-medium">Code:</span>
                <span className="ml-1">{users[0]?.company?.company_code || selectedCompany?.company_code || 'N/A'}</span>
              </div>
            )}
          </div>
        </div>
        {hasPermission('userManagement', 'create') && (
          <button
            onClick={() => setShowRoleSelection(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <button
            onClick={() => setShowRoleFilterModal(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <span>{roleFilter === 'all' ? 'All Roles' : roleOptions.find(r => r.value === roleFilter)?.label}</span>
            <i className="fas fa-chevron-down text-gray-400"></i>
          </button>
          
          {/* Status Filter */}
          <button
            onClick={() => setShowStatusFilterModal(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <span>
              {statusFilter === 'all' ? 'All Status' : 
               statusFilter === 'active' ? 'Active' : 'Inactive'}
            </span>
            <i className="fas fa-chevron-down text-gray-400"></i>
          </button>
          
          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                User
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sites/Access
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-700 font-medium text-sm">
                        {user.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    <span className="hidden sm:inline">{roleOptions.find(r => r.value === user.role)?.label || user.role}</span>
                    <span className="sm:hidden">{(roleOptions.find(r => r.value === user.role)?.label || user.role).substring(0,3)}</span>
                  </span>
                </td>
                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.company?.company_code || selectedCompany?.company_code || 'N/A'}
                  </span>
                </td> */}
                <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.sites?.length || 0} sites
                </td>
                <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatLastLogin(user.last_login)}
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <span className="hidden sm:inline">{user.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="sm:hidden">{user.is_active ? 'A' : 'I'}</span>
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1 sm:space-x-2">
                  {hasPermission('userManagement', 'update') && (
                    <button 
                      className="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                      onClick={() => handleEditUser(user)}
                      disabled={isProcessing}
                      title="Edit User"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  )}
                  {hasPermission('userManagement', 'delete') && (
                    <button 
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      onClick={() => handleDeleteUser(user)}
                      disabled={isProcessing}
                      title="Delete User"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                  {/* Reset Password button temporarily hidden */}
                  {false && (
                    <button 
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      onClick={() => handleResetPassword(user)}
                      disabled={isProcessing}
                      title="Reset Password"
                    >
                      <i className="fas fa-key"></i>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-users text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">No users found. Create your first team member!</p>
          </div>
        )}
        
        {users.length > 0 && filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">No users match your current filters.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <button
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          <i className="fas fa-arrow-left mr-2"></i>Back
        </button>
         <div className="flex items-center">
           <span className="text-sm text-gray-600">
             <i className="fas fa-users mr-2"></i>
             {users.length} user{users.length !== 1 ? 's' : ''} in your team
             {filteredUsers.length !== users.length && (
               <span className="ml-2 text-purple-600">({filteredUsers.length} shown)</span>
             )}
           </span>
         </div>
      </div>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={showRoleSelection}
        onClose={() => setShowRoleSelection(false)}
        onRoleSelect={(role) => {
          // Check if user can create this role
          if (!canCreateRole(role.value)) {
            setNotification({
              show: true,
              type: 'error',
              title: 'Create User Failed',
              message: 'Unable to create user',
              details: `You cannot create users with ${role.value} role`
            });
            setShowRoleSelection(false);
            return;
          }
          
          setSelectedRole(role);
          setShowUserForm(true);
        }}
      />

      {/* Add User Form Modal */}
      <AddUserModal
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setSelectedRole(null);
        }}
        selectedRole={selectedRole}
        onSuccess={() => {
          setShowUserForm(false);
          setSelectedRole(null);
          fetchUsers();
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setUserToEdit(null);
        }}
        user={userToEdit}
        onSuccess={() => {
          setShowEditModal(false);
          setUserToEdit(null);
          fetchUsers();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        user={userToDelete}
        onConfirm={confirmDelete}
        isProcessing={isProcessing}
      />

      {/* Filter Modals */}
      <RoleFilterModal
        isOpen={showRoleFilterModal}
        onClose={() => setShowRoleFilterModal(false)}
      />
      
      <StatusFilterModal
        isOpen={showStatusFilterModal}
        onClose={() => setShowStatusFilterModal(false)}
      />

      {/* Notification Modal */}
      <NotificationModal
        notification={notification}
        onClose={hideNotification}
      />
      
    </div>
  );
};

export default UserManagement;
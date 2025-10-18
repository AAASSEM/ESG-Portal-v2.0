import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Meter = () => {
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [showAddMeter, setShowAddMeter] = useState(false);
  const [showEditMeter, setShowEditMeter] = useState(false);
  const [editingMeter, setEditingMeter] = useState(null);
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showTypeFilterModal, setShowTypeFilterModal] = useState(false);
  const [showStatusFilterModal, setShowStatusFilterModal] = useState(false);
  
  // Modal state
  const [modal, setModal] = useState({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null });

  // Modal helper functions
  const showAlert = (title, message, type = 'info') => {
    setModal({ 
      show: true, 
      type, 
      title, 
      message, 
      onConfirm: () => setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null }), 
      onCancel: null 
    });
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setModal({ 
      show: true, 
      type: 'confirm', 
      title, 
      message, 
      onConfirm: () => {
        setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null });
        onConfirm();
      }, 
      onCancel: onCancel ? () => {
        setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null });
        onCancel();
      } : () => setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null })
    });
  };

  const hideModal = () => {
    setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, onCancel: null });
  };

  // Get required meter types from finalized checklist
  const getRequiredMeterTypes = async () => {
    try {
      // Fetch checklist data from database instead of localStorage
      const response = await fetch(`${API_BASE_URL}/api/checklist/?company=${selectedCompany?.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) return [];
      
      const checklistData = await response.json();
      const checklist = checklistData.results || checklistData;
      const meteredElements = checklist.filter(item => item.is_metered);
      
      // Create unique meter types
      const meterTypes = [...new Set(meteredElements.map(item => item.meter_type))];
      return meterTypes;
    } catch (error) {
      console.error('Error getting required meter types:', error);
      return [];
    }
  };

  // Get company ID (should come from auth context)
  const companyId = selectedCompany?.id;

  // API functions
  const fetchMeters = async () => {
    if (!companyId) {
      console.log('No company selected, skipping meters fetch');
      return;
    }
    
    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/meters/?company_id=${companyId}`);
      const data = await response.json();
      
      // Transform backend data to frontend format
      const transformedMeters = data.results.map(meter => {
        // Detect auto-created meters by name pattern (starts with "Main")
        const isAutoCreated = meter.name && meter.name.trim().toLowerCase().startsWith('main');
        
        return {
          id: meter.id,
          name: meter.name,
          type: meter.type,
          location: meter.location_description || 'To be configured',
          account_number: meter.account_number || '',
          status: meter.status === 'active' ? 'Active' : 'Inactive',
          lastReading: 'No readings yet',
          lastUpdate: new Date(meter.created_at).toLocaleString(),
          dataPoints: ['Primary Measurement'],
          frameworks: ['Auto-assigned'],
          has_data: meter.has_data, // Track if meter has data (prevents deletion)
          isAutoCreated: isAutoCreated // Detect based on name pattern
        };
      });
      
      setMeters(transformedMeters);
    } catch (error) {
      console.error('Error fetching meters:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMeter = async (meterData) => {
    try {
      console.log('🔍 CREATE METER - Starting meter creation');
      console.log('📊 Company ID:', companyId);
      console.log('📊 Original meter data received:', meterData);
      
      const requestBody = {
        company: companyId,
        name: meterData.name,
        type: meterData.type,
        location_description: meterData.location,
        account_number: meterData.account_number,
        status: meterData.status?.toLowerCase() || 'active'
      };
      
      console.log('📤 Request body being sent:', requestBody);
      console.log('🌐 Request URL:', `${API_BASE_URL}/api/meters/?company_id=${companyId}`);
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/meters/?company_id=${companyId}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Meter created successfully:', responseData);
        await fetchMeters(); // Refresh the list
        return true;
      } else {
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('❌ Server error response:', errorData);
        } catch (e) {
          console.error('❌ Could not parse error response');
        }
        console.error('❌ Response status:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('💥 Network error creating meter:', error);
      console.error('💥 Error details:', {
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  };

  const updateMeter = async (meterId, meterData) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/meters/${meterId}/?company_id=${companyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: meterData.name,
          type: meterData.type,
          location_description: meterData.location,
          account_number: meterData.account_number,
          status: meterData.status?.toLowerCase() || 'active'
        }),
      });
      
      if (response.ok) {
        await fetchMeters(); // Refresh the list
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating meter:', error);
      return false;
    }
  };

  const deleteMeter = async (meterId) => {
    // Check if meter has data before attempting deletion
    const meter = meters.find(m => m.id === meterId);
    if (!meter) {
      showAlert('Error', 'Meter not found', 'error');
      return false;
    }
    
    if (meter.has_data) {
      showAlert('Cannot Delete Meter', 'Cannot delete this meter because it has associated data. You can deactivate it instead.', 'warning');
      return false;
    }
    
    // Return promise to handle confirmation asynchronously
    return new Promise((resolve) => {
      showConfirm(
        'Delete Meter', 
        `Are you sure you want to delete the meter "${meter.name}" (${meter.type})?`,
        async () => {
          try {
            const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/meters/${meterId}/?company_id=${companyId}`, {
              method: 'DELETE',
            });
            
            if (response.ok) {
              await fetchMeters(); // Refresh the list
              showAlert('Success', 'Meter deleted successfully', 'success');
              resolve(true);
            } else {
              const errorData = await response.json().catch(() => ({}));
              showAlert('Delete Failed', `Failed to delete meter: ${errorData.error || 'Unknown error'}`, 'error');
              resolve(false);
            }
          } catch (error) {
            console.error('Error deleting meter:', error);
            showAlert('Error', 'Error deleting meter. Please try again.', 'error');
            resolve(false);
          }
        },
        () => resolve(false)
      );
    });
  };

  const deactivateMeter = async (meterId) => {
    const meter = meters.find(m => m.id === meterId);
    if (!meter) return false;
    
    const newStatus = meter.status === 'Active' ? 'Inactive' : 'Active';
    const action = newStatus === 'Inactive' ? 'deactivate' : 'activate';
    
    return new Promise((resolve) => {
      showConfirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Meter`,
        `Are you sure you want to ${action} the meter "${meter.name}" (${meter.type})?`,
        async () => {
          const success = await updateMeter(meterId, {
            ...meter,
            status: newStatus
          });
          
          if (success) {
            showAlert('Success', `Meter ${action}d successfully`, 'success');
          }
          resolve(success);
        },
        () => resolve(false)
      );
    });
  };

  // Load meters on component mount
  useEffect(() => {
    if (companyId) {
      fetchMeters();
    }
  }, [companyId]);

  const meterTypes = [
    {
      id: 'total',
      name: 'Total Meters',
      icon: 'fas fa-gauge',
      color: 'blue',
      count: meters.length,
      description: 'All configured meters'
    },
    {
      id: 'electricity',
      name: 'Electricity Meters',
      icon: 'fas fa-bolt',
      color: 'yellow',
      count: meters.filter(m => m.type === 'Electricity Consumption').length,
      description: 'Electricity consumption monitoring'
    },
    {
      id: 'water',
      name: 'Water Meters',
      icon: 'fas fa-tint',
      color: 'blue',
      count: meters.filter(m => m.type === 'Water Consumption').length,
      description: 'Water consumption and flow monitoring'
    },
    {
      id: 'waste',
      name: 'Waste Trackers',
      icon: 'fas fa-trash-alt',
      color: 'green',
      count: meters.filter(m => m.type === 'Waste to Landfill').length,
      description: 'Waste generation and disposal monitoring'
    },
    {
      id: 'generator',
      name: 'Generator Meters',
      icon: 'fas fa-gas-pump',
      color: 'red',
      count: meters.filter(m => m.type === 'Generator Fuel Consumption').length,
      description: 'Generator fuel consumption tracking'
    },
    {
      id: 'vehicle',
      name: 'Vehicle Trackers',
      icon: 'fas fa-car',
      color: 'purple',
      count: meters.filter(m => m.type === 'Vehicle Fuel Consumption').length,
      description: 'Vehicle fuel consumption monitoring'
    },
    {
      id: 'lpg',
      name: 'LPG Meters',
      icon: 'fas fa-fire',
      color: 'orange',
      count: meters.filter(m => m.type === 'LPG Usage').length,
      description: 'LPG consumption monitoring'
    },
    {
      id: 'renewable',
      name: 'Renewable Energy',
      icon: 'fas fa-solar-panel',
      color: 'teal',
      count: meters.filter(m => m.type === 'Renewable Energy Usage').length,
      description: 'Renewable energy generation tracking'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Warning': return 'text-yellow-600 bg-yellow-100';
      case 'Maintenance': return 'text-red-600 bg-red-100';
      case 'Offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleAddMeter = async (meterData) => {
    const success = await createMeter(meterData);
    if (success) {
      setShowAddMeter(false);
    } else {
      showAlert('Creation Failed', 'Failed to create meter. Please try again.', 'error');
    }
  };

  const handleCopyMeter = (originalMeter) => {
    setEditingMeter({
      ...originalMeter,
      name: `${originalMeter.name} Copy`,
      account_number: '',
      location: originalMeter.location
    });
    setShowEditMeter(true);
  };

  const handleEditMeterClick = (meter) => {
    setEditingMeter({ ...meter });
    setShowEditMeter(true);
  };

  const handleToggleMeterStatus = async (meterId) => {
    const meter = meters.find(m => m.id === meterId);
    if (!meter) return;
    
    // All meters should just toggle active/inactive status
    await deactivateMeter(meterId);
  };

  const handleDeleteMeter = async (meterId) => {
    const meter = meters.find(m => m.id === meterId);
    if (!meter) {
      showAlert('Error', 'Meter not found', 'error');
      return;
    }
    
    // Check if meter has data - prevent deletion if it has data
    if (meter.has_data) {
      showAlert('Cannot Delete', `Cannot delete meter "${meter.name}" because it has data entries. Please remove all data entries first, or deactivate the meter instead.`, 'warning');
      return;
    }
    
    // Confirm deletion
    showConfirm(
      'Delete Meter',
      `Are you sure you want to permanently delete the meter "${meter.name}" (${meter.type})?\n\nThis action cannot be undone.`,
      async () => {
        try {
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/meters/${meterId}/?company_id=${companyId}`, {
            method: 'DELETE',
          });
          
          if (response.ok) {
            await fetchMeters(); // Refresh the list
            showAlert('Success', `Meter "${meter.name}" has been deleted successfully.`, 'success');
          } else {
            const errorData = await response.json().catch(() => ({}));
            showAlert('Delete Failed', `Failed to delete meter: ${errorData.error || errorData.detail || 'Unknown error'}`, 'error');
          }
        } catch (error) {
          console.error('Error deleting meter:', error);
          showAlert('Network Error', 'Network error occurred while deleting meter. Please try again.', 'error');
        }
      }
    );
  };

  const handleSaveEditMeter = async (updatedMeter) => {
    if (typeof updatedMeter.id === 'string' && updatedMeter.id.startsWith('USER-') && !meters.find(m => m.id === updatedMeter.id)) {
      // This is a new meter from copy
      const success = await createMeter(updatedMeter);
      if (!success) {
        showAlert('Creation Failed', 'Failed to create meter. Please try again.', 'error');
        return;
      }
    } else {
      // This is an existing meter being edited
      const success = await updateMeter(updatedMeter.id, updatedMeter);
      if (!success) {
        showAlert('Update Failed', 'Failed to update meter. Please try again.', 'error');
        return;
      }
    }
    setShowEditMeter(false);
    setEditingMeter(null);
  };

  // Filter and search meters
  const filteredMeters = meters.filter(meter => {
    const matchesSearch = meter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meter.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meter.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meter.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'All Types' || meter.type === typeFilter;
    const matchesStatus = statusFilter === 'All Status' || meter.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group meters by category
  const groupedMeters = filteredMeters.reduce((groups, meter) => {
    const category = meter.type;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(meter);
    return groups;
  }, {});

  // Sort categories for consistent display order
  const categoryOrder = [
    'Electricity Consumption',
    'Water Consumption', 
    'Waste to Landfill',
    'Generator Fuel Consumption',
    'Vehicle Fuel Consumption',
    'LPG Usage',
    'Renewable Energy Usage'
  ];

  const sortedCategories = Object.keys(groupedMeters).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Get unique types for filter dropdown
  const uniqueTypes = [...new Set(meters.map(meter => meter.type))];

  const handleContinue = () => {
    navigate('/data');
  };

  // Check if user has permission to access meter management (moved after hooks)
  const canAccessMeterManagement = () => {
    if (!user) return false;
    // Module 4 (Meter Management):
    // ✅ Super User, Admin, Site Manager, Meter Manager: Full CRUD
    // 👁️ Uploader, Viewer: View only
    return ['super_user', 'admin', 'site_manager', 'meter_manager', 'uploader', 'viewer'].includes(user.role);
  };

  // If no permission, show permission denied message
  if (!canAccessMeterManagement()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access meter management.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based functionality controls for Meter Management
  const canEditMeters = ['super_user', 'admin', 'site_manager', 'meter_manager'].includes(user?.role); // Full CRUD
  const isViewOnly = ['uploader', 'viewer'].includes(user?.role); // View only

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading meters...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Auto-Created Notice */}
      {meters.some(m => m.isAutoCreated) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-cog fa-spin text-blue-600"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900">Meters Auto-Created</h3>
              <p className="text-sm sm:text-base text-blue-700">Based on your checklist requirements, we've automatically created default "Main" meters for all metered data elements. You can customize these or add additional meters as needed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Meter Types Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {meterTypes.filter(type => type.count > 0).map((type) => (
          <div key={type.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${type.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`${type.icon} text-${type.color}-600 text-lg`}></i>
              </div>
              <span className={`text-2xl font-bold text-${type.color}-600`}>{type.count}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
            <p className="text-sm text-gray-600">{type.description}</p>
          </div>
        ))}
      </div>

      {/* Meter Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Meter Configuration</h3>
            <div className="flex items-center space-x-3">
              {isViewOnly && (
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  <i className="fas fa-eye mr-2"></i>View Only Mode
                </div>
              )}
              {canEditMeters ? (
                <button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
                  onClick={() => setShowAddMeter(true)}
                >
                  <i className="fas fa-plus mr-2"></i>Add New Meter
                </button>
              ) : (
                <div className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium">
                  <i className="fas fa-lock mr-2"></i>Read Only Access
                </div>
              )}
            </div>
          </div>

          {/* Filter/Search Bar */}
          <div className="flex items-center justify-between mb-6 space-x-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  placeholder="Search meters..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowTypeFilterModal(true)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <i className="fas fa-filter"></i>
                <span>{typeFilter}</span>
                <i className="fas fa-chevron-down ml-1"></i>
              </button>
              <button
                onClick={() => setShowStatusFilterModal(true)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <i className="fas fa-circle"></i>
                <span>{statusFilter}</span>
                <i className="fas fa-chevron-down ml-1"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                  viewMode === 'list' ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setViewMode('list')}
              >
                <i className={`fas fa-list ${viewMode === 'list' ? 'text-blue-600' : 'text-gray-600'}`}></i>
              </button>
              <button 
                className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                  viewMode === 'grid' ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => setViewMode('grid')}
              >
                <i className={`fas fa-th-large ${viewMode === 'grid' ? 'text-blue-600' : 'text-gray-600'}`}></i>
              </button>
            </div>
          </div>

          {/* Meters Display */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCategories.map((category) => (
                <div key={category} className="category-column">
                  {/* Category Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      category === 'Electricity Consumption' ? 'bg-yellow-100' :
                      category === 'Water Consumption' ? 'bg-cyan-100' :
                      category === 'Waste to Landfill' ? 'bg-green-100' :
                      category === 'Generator Fuel Consumption' ? 'bg-red-100' :
                      category === 'Vehicle Fuel Consumption' ? 'bg-purple-100' :
                      category === 'LPG Usage' ? 'bg-orange-100' :
                      category === 'Renewable Energy Usage' ? 'bg-teal-100' :
                      'bg-gray-100'
                    }`}>
                      <i className={`${
                        category === 'Electricity Consumption' ? 'fas fa-bolt text-yellow-600' :
                        category === 'Water Consumption' ? 'fas fa-tint text-cyan-600' :
                        category === 'Waste to Landfill' ? 'fas fa-trash-alt text-green-600' :
                        category === 'Generator Fuel Consumption' ? 'fas fa-gas-pump text-red-600' :
                        category === 'Vehicle Fuel Consumption' ? 'fas fa-car text-purple-600' :
                        category === 'LPG Usage' ? 'fas fa-fire text-orange-600' :
                        category === 'Renewable Energy Usage' ? 'fas fa-solar-panel text-teal-600' :
                        'fas fa-gauge text-gray-600'
                      }`}></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{category}</h4>
                      <p className="text-sm text-gray-500">{groupedMeters[category].length} meter{groupedMeters[category].length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {/* Meters List for this Category */}
                  <div className="space-y-4">
                    {groupedMeters[category].map((meter) => (
                      <div key={meter.id} className="meter-card bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      meter.type === 'Electricity Consumption' ? 'bg-yellow-100' :
                      meter.type === 'Water Consumption' ? 'bg-cyan-100' :
                      meter.type === 'Waste to Landfill' ? 'bg-green-100' :
                      meter.type === 'Generator Fuel Consumption' ? 'bg-red-100' :
                      meter.type === 'Vehicle Fuel Consumption' ? 'bg-purple-100' :
                      meter.type === 'LPG Usage' ? 'bg-orange-100' :
                      meter.type === 'Renewable Energy Usage' ? 'bg-teal-100' :
                      'bg-gray-100'
                    }`}>
                      <i className={`${
                        meter.type === 'Electricity Consumption' ? 'fas fa-bolt text-yellow-600' :
                        meter.type === 'Water Consumption' ? 'fas fa-tint text-cyan-600' :
                        meter.type === 'Waste to Landfill' ? 'fas fa-trash-alt text-green-600' :
                        meter.type === 'Generator Fuel Consumption' ? 'fas fa-gas-pump text-red-600' :
                        meter.type === 'Vehicle Fuel Consumption' ? 'fas fa-car text-purple-600' :
                        meter.type === 'LPG Usage' ? 'fas fa-fire text-orange-600' :
                        meter.type === 'Renewable Energy Usage' ? 'fas fa-solar-panel text-teal-600' :
                        'fas fa-gauge text-gray-600'
                      }`}></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        {meter.name}
                        {meter.isAutoCreated && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Auto
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">{meter.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      meter.status === 'Active' ? 'bg-green-500' :
                      meter.status === 'Inactive' ? 'bg-red-500' :
                      meter.status === 'Warning' ? 'bg-yellow-500' :
                      meter.status === 'Maintenance' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      meter.status === 'Active' ? 'text-green-600' :
                      meter.status === 'Inactive' ? 'text-red-600' :
                      meter.status === 'Warning' ? 'text-yellow-600' :
                      meter.status === 'Maintenance' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {meter.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Account #:</span>
                    <span className="text-gray-900">{meter.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">{meter.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Reading:</span>
                    <span className="text-gray-900">{new Date(meter.lastUpdate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Source:</span>
                    <span className="text-gray-900">{meter.isAutoCreated ? 'System' : 'Manual'}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {canEditMeters ? (
                    <>
                      <button 
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700"
                        onClick={() => handleEditMeterClick(meter)}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      {/* Activate/Deactivate Button */}
                      <button 
                        type="button"
                        className={`py-2 px-3 rounded-lg text-sm ${
                          meter.status === 'Active'
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleMeterStatus(meter.id);
                        }}
                        title={meter.status === 'Active' ? 'Deactivate Meter' : 'Activate Meter'}
                      >
                        <i className={`fas ${meter.status === 'Active' ? 'fa-power-off' : 'fa-play'}`}></i>
                      </button>
                      
                      {/* Delete Button */}
                      <button 
                        type="button"
                        className="py-2 px-3 rounded-lg text-sm bg-red-100 text-red-600 hover:bg-red-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteMeter(meter.id);
                        }}
                        title="Delete Meter"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 bg-gray-100 text-gray-500 py-2 px-3 rounded-lg text-sm font-medium text-center">
                      <i className="fas fa-eye mr-1"></i>View Only
                    </div>
                  )}
                </div>
              </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View - Grouped by Category */
            <div className="space-y-6">
              {sortedCategories.map((category) => (
                <div key={category} className="category-section">
                  {/* Category Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      category === 'Electricity Consumption' ? 'bg-yellow-100' :
                      category === 'Water Consumption' ? 'bg-cyan-100' :
                      category === 'Waste to Landfill' ? 'bg-green-100' :
                      category === 'Generator Fuel Consumption' ? 'bg-red-100' :
                      category === 'Vehicle Fuel Consumption' ? 'bg-purple-100' :
                      category === 'LPG Usage' ? 'bg-orange-100' :
                      category === 'Renewable Energy Usage' ? 'bg-teal-100' :
                      'bg-gray-100'
                    }`}>
                      <i className={`${
                        category === 'Electricity Consumption' ? 'fas fa-bolt text-yellow-600' :
                        category === 'Water Consumption' ? 'fas fa-tint text-cyan-600' :
                        category === 'Waste to Landfill' ? 'fas fa-trash-alt text-green-600' :
                        category === 'Generator Fuel Consumption' ? 'fas fa-gas-pump text-red-600' :
                        category === 'Vehicle Fuel Consumption' ? 'fas fa-car text-purple-600' :
                        category === 'LPG Usage' ? 'fas fa-fire text-orange-600' :
                        category === 'Renewable Energy Usage' ? 'fas fa-solar-panel text-teal-600' :
                        'fas fa-gauge text-gray-600'
                      } text-sm`}></i>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-900">{category}</h4>
                      <p className="text-xs text-gray-500">{groupedMeters[category].length} meter{groupedMeters[category].length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {/* Table for this Category */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedMeters[category].map((meter) => (
                    <tr key={meter.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            meter.type === 'Electricity Consumption' ? 'bg-yellow-100' :
                            meter.type === 'Water Consumption' ? 'bg-cyan-100' :
                            meter.type === 'Waste to Landfill' ? 'bg-green-100' :
                            meter.type === 'Generator Fuel Consumption' ? 'bg-red-100' :
                            meter.type === 'Vehicle Fuel Consumption' ? 'bg-purple-100' :
                            meter.type === 'LPG Usage' ? 'bg-orange-100' :
                            meter.type === 'Renewable Energy Usage' ? 'bg-teal-100' :
                            'bg-gray-100'
                          }`}>
                            <i className={`${
                              meter.type === 'Electricity Consumption' ? 'fas fa-bolt text-yellow-600' :
                              meter.type === 'Water Consumption' ? 'fas fa-tint text-cyan-600' :
                              meter.type === 'Waste to Landfill' ? 'fas fa-trash-alt text-green-600' :
                              meter.type === 'Generator Fuel Consumption' ? 'fas fa-gas-pump text-red-600' :
                              meter.type === 'Vehicle Fuel Consumption' ? 'fas fa-car text-purple-600' :
                              meter.type === 'LPG Usage' ? 'fas fa-fire text-orange-600' :
                              meter.type === 'Renewable Energy Usage' ? 'fas fa-solar-panel text-teal-600' :
                              'fas fa-gauge text-gray-600'
                            } text-sm`}></i>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {meter.name}
                              {meter.isAutoCreated && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{meter.id}</div>
                          </div>
                        </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {meter.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                meter.status === 'Active' ? 'bg-green-500' :
                                meter.status === 'Inactive' ? 'bg-red-500' :
                                meter.status === 'Warning' ? 'bg-yellow-500' :
                                meter.status === 'Maintenance' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className={`text-sm font-medium ${
                                meter.status === 'Active' ? 'text-green-600' :
                                meter.status === 'Inactive' ? 'text-red-600' :
                                meter.status === 'Warning' ? 'text-yellow-600' :
                                meter.status === 'Maintenance' ? 'text-orange-600' :
                                'text-gray-600'
                              }`}>
                                {meter.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {meter.account_number || meter.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              meter.isAutoCreated ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {meter.isAutoCreated ? 'System' : 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button 
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => handleEditMeterClick(meter)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              
                              {/* Activate/Deactivate Button */}
                              <button 
                                type="button"
                                className={`${
                                  meter.status === 'Active'
                                    ? 'text-red-600 hover:text-red-900' 
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleToggleMeterStatus(meter.id);
                                }}
                                title={meter.status === 'Active' ? 'Deactivate Meter' : 'Activate Meter'}
                              >
                                <i className={`fas ${meter.status === 'Active' ? 'fa-power-off' : 'fa-play'}`}></i>
                              </button>
                              
                              {/* Delete Button */}
                              <button 
                                type="button"
                                className="text-red-600 hover:text-red-900"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteMeter(meter.id);
                                }}
                                title="Delete Meter"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {filteredMeters.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meters found</h3>
              <p className="text-gray-600">
                {searchQuery || typeFilter !== 'All Types' || statusFilter !== 'All Status' 
                  ? 'Try adjusting your search or filters'
                  : 'No meters have been configured yet'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Meter Details Modal */}
      {selectedMeter && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-md p-5 border w-96 shadow-lg mx-4">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedMeter.name}</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedMeter(null)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Device ID</label>
                  <p className="text-sm text-gray-900">{selectedMeter.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{selectedMeter.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedMeter.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Source</label>
                  <p className="text-sm text-gray-900">
                    {selectedMeter.isAutoCreated ? 'Auto-created from checklist requirements' : 'Manually added by user'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Data Points</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedMeter.dataPoints.map((point, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  onClick={() => setSelectedMeter(null)}
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Meter Modal */}
      {showAddMeter && <MeterFormModal 
        isOpen={showAddMeter}
        title="Add New Meter"
        meter={null}
        meterTypes={meterTypes}
        onSave={handleAddMeter}
        onClose={() => setShowAddMeter(false)}
      />}

      {/* Edit Meter Modal */}
      {showEditMeter && <MeterFormModal 
        isOpen={showEditMeter}
        title={editingMeter?.name?.includes('Copy') ? "Add Copied Meter" : "Edit Meter"}
        meter={editingMeter}
        meterTypes={meterTypes}
        onSave={handleSaveEditMeter}
        onClose={() => {
          setShowEditMeter(false);
          setEditingMeter(null);
        }}
      />}

      {/* Installation Guide */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-tools text-blue-600"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Installation Guide</h3>
            <p className="text-gray-600">Steps to set up new meters and sensors</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Review Requirements</h4>
            <p className="text-sm text-gray-600">Check auto-created meters match your needs</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Configure Details</h4>
            <p className="text-sm text-gray-600">Add location and account information</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Install Device</h4>
            <p className="text-sm text-gray-600">Follow manufacturer guidelines for installation</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">4</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Test & Monitor</h4>
            <p className="text-sm text-gray-600">Verify readings and establish baselines</p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/list')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        </div>
        <div className="flex space-x-4">
          <button 
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
            onClick={handleContinue}
          >
            Save & Continue
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>

      {/* Type Filter Modal */}
      {showTypeFilterModal && <TypeFilterModal 
        isOpen={showTypeFilterModal}
        currentFilter={typeFilter}
        uniqueTypes={uniqueTypes}
        onApply={(selectedType) => {
          setTypeFilter(selectedType);
          setShowTypeFilterModal(false);
        }}
        onClose={() => setShowTypeFilterModal(false)}
      />}

      {/* Status Filter Modal */}
      {showStatusFilterModal && <StatusFilterModal 
        isOpen={showStatusFilterModal}
        currentFilter={statusFilter}
        onApply={(selectedStatus) => {
          setStatusFilter(selectedStatus);
          setShowStatusFilterModal(false);
        }}
        onClose={() => setShowStatusFilterModal(false)}
      />}

      {/* Alert/Confirm Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-md p-5 border w-96 shadow-lg mx-4">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    modal.type === 'success' ? 'bg-green-100' :
                    modal.type === 'error' ? 'bg-red-100' :
                    modal.type === 'warning' ? 'bg-yellow-100' :
                    modal.type === 'confirm' ? 'bg-blue-100' :
                    'bg-blue-100'
                  }`}>
                    <i className={`fas ${
                      modal.type === 'success' ? 'fa-check text-green-600' :
                      modal.type === 'error' ? 'fa-times text-red-600' :
                      modal.type === 'warning' ? 'fa-exclamation-triangle text-yellow-600' :
                      modal.type === 'confirm' ? 'fa-question text-blue-600' :
                      'fa-info text-blue-600'
                    }`}></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">{modal.title}</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-6 whitespace-pre-line">{modal.message}</p>
              <div className="flex justify-end space-x-3">
                {modal.type === 'confirm' ? (
                  <>
                    <button 
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      onClick={modal.onCancel || hideModal}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      onClick={modal.onConfirm}
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button 
                    className={`px-4 py-2 text-white rounded-md hover:opacity-90 ${
                      modal.type === 'success' ? 'bg-green-600' :
                      modal.type === 'error' ? 'bg-red-600' :
                      modal.type === 'warning' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}
                    onClick={modal.onConfirm || hideModal}
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Meter Form Modal Component
const MeterFormModal = ({ isOpen, title, meter, meterTypes, onSave, onClose }) => {
  const [showTypeSelection, setShowTypeSelection] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    account_number: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', type: 'error' });

  // Initialize form data when meter changes
  React.useEffect(() => {
    if (meter) {
      setFormData({
        name: meter.name || '',
        type: meter.type || '',
        location: meter.location || '',
        account_number: meter.account_number || ''
      });
      setShowTypeSelection(false); // Skip type selection if editing existing meter
    } else {
      setFormData({
        name: '',
        type: '',
        location: '',
        account_number: ''
      });
      setShowTypeSelection(true); // Show type selection for new meters
    }
    // Clear any alerts when modal opens/changes
    setAlert({ show: false, message: '', type: 'error' });
  }, [meter, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.type) {
      setAlert({ show: true, message: 'Please fill in required fields (Name and Type)', type: 'error' });
      return;
    }

    const meterData = {
      ...formData,
      ...(meter && { id: meter.id, isAutoCreated: meter.isAutoCreated })
    };
    
    setAlert({ show: false, message: '', type: 'error' });
    onSave(meterData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear any existing alerts when user starts typing
    if (alert.show) {
      setAlert({ show: false, message: '', type: 'error' });
    }
  };

  const handleTypeSelect = (selectedType) => {
    const typeData = meterTypes.find(t => t.name.replace(' Meters', '').replace(' Trackers', '') === selectedType);
    
    // Map short names to full backend names
    const typeMapping = {
      'Electricity': 'Electricity Consumption',
      'Water': 'Water Consumption', 
      'Waste': 'Waste to Landfill',
      'Generator': 'Generator Fuel Consumption',
      'Vehicle': 'Vehicle Fuel Consumption',
      'LPG': 'LPG Usage',
      'Renewable Energy': 'Renewable Energy Usage'
    };
    
    const fullTypeName = typeMapping[selectedType] || selectedType;
    
    setFormData(prev => ({
      ...prev,
      type: fullTypeName,
      name: meter?.name?.includes('Copy') ? `${selectedType} Copy` : '',
      location: 'To be configured'
    }));
    setShowTypeSelection(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-md p-5 border w-full max-w-md shadow-lg mx-4">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <button 
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={onClose}
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
                <i className={`fas ${alert.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-sm`}></i>
                <span className="text-sm font-medium">{alert.message}</span>
              </div>
            </div>
          )}
          
          {/* Type Selection Screen */}
          {showTypeSelection && (
            <div>
              <p className="text-gray-600 mb-4">Select the type of meter to add:</p>
              <div className="space-y-2">
                {meterTypes.filter(type => type.id !== 'total').map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    onClick={() => handleTypeSelect(type.name.replace(' Meters', '').replace(' Trackers', ''))}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-${type.color}-100 rounded-lg flex items-center justify-center`}>
                        <i className={`${type.icon} text-${type.color}-600`}></i>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{type.name}</span>
                        <p className="text-sm text-gray-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Screen */}
          {!showTypeSelection && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Selected Type Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meter Type
                  </label>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const typeData = meterTypes.find(t => t.name.replace(' Meters', '').replace(' Trackers', '') === formData.type);
                        return (
                          <>
                            <div className={`w-8 h-8 bg-${typeData?.color}-100 rounded-lg flex items-center justify-center`}>
                              <i className={`${typeData?.icon} text-${typeData?.color}-600`}></i>
                            </div>
                            <span className="font-medium text-gray-900">{formData.type}</span>
                          </>
                        );
                      })()}
                    </div>
                    <button 
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => setShowTypeSelection(true)}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Meter Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meter Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Main Building Electric, Kitchen Water"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Description
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Main Building, Kitchen Area, Basement"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account/Meter Number
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ELE-001-2024, WAT-002-2024"
                    value={formData.account_number}
                    onChange={(e) => handleInputChange('account_number', e.target.value)}
                  />
                </div>

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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {meter?.name?.includes('Copy') ? 'Add Meter' : meter ? 'Save Changes' : 'Add Meter'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const TypeFilterModal = ({ isOpen, currentFilter, uniqueTypes, onApply, onClose }) => {
  const [selectedType, setSelectedType] = useState(currentFilter);

  // Initialize selected type when modal opens
  React.useEffect(() => {
    setSelectedType(currentFilter);
  }, [currentFilter, isOpen]);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    onApply(type);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-md p-3 border w-80 shadow-lg mx-4">
        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Select Meter Type</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-2">
            {/* All Types Option */}
            <button
              type="button"
              onClick={() => handleTypeSelect('All Types')}
              className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-th text-blue-600"></i>
                </div>
                <div>
                  <p className="font-medium text-gray-900">All Types</p>
                  <p className="text-sm text-gray-500">Show all meter types</p>
                </div>
              </div>
            </button>

            {/* Individual Type Options */}
            {uniqueTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSelect(type)}
                className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i className={`fas ${
                      type.includes('Electricity') ? 'fa-bolt text-yellow-600' :
                      type.includes('Water') ? 'fa-tint text-blue-600' :
                      type.includes('Waste') ? 'fa-trash text-red-600' :
                      type.includes('Generator') ? 'fa-cog text-orange-600' :
                      type.includes('Vehicle') ? 'fa-car text-green-600' :
                      type.includes('LPG') ? 'fa-fire text-purple-600' :
                      type.includes('Renewable') ? 'fa-leaf text-green-600' :
                      'fa-gauge text-gray-600'
                    }`}></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{type}</p>
                    <p className="text-sm text-gray-500">Filter by {type.toLowerCase()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

const StatusFilterModal = ({ isOpen, currentFilter, onApply, onClose }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentFilter);

  // Initialize selected status when modal opens
  React.useEffect(() => {
    setSelectedStatus(currentFilter);
  }, [currentFilter, isOpen]);

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    onApply(status);
    onClose();
  };

  if (!isOpen) return null;

  const statusOptions = [
    { value: 'All Status', label: 'All Status', description: 'Show all meter statuses', icon: 'fa-th', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'Active', label: 'Active', description: 'Show active meters only', icon: 'fa-check-circle', color: 'text-green-600', bgColor: 'bg-green-100' },
    { value: 'Inactive', label: 'Inactive', description: 'Show inactive meters only', icon: 'fa-times-circle', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { value: 'Warning', label: 'Warning', description: 'Show meters with warnings', icon: 'fa-exclamation-triangle', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { value: 'Maintenance', label: 'Maintenance', description: 'Show meters under maintenance', icon: 'fa-wrench', color: 'text-orange-600', bgColor: 'bg-orange-100' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-md p-3 border w-80 shadow-lg mx-4">
        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Select Status</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-2">
            {statusOptions.map(status => (
              <button
                key={status.value}
                type="button"
                onClick={() => handleStatusSelect(status.value)}
                className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${status.bgColor} rounded-lg flex items-center justify-center`}>
                    <i className={`fas ${status.icon} ${status.color}`}></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{status.label}</p>
                    <p className="text-sm text-gray-500">{status.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meter;
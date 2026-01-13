import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const EventTasks = ({ user, companyId }) => {
  const navigate = useNavigate();

  // State
  const [dataEntries, setDataEntries] = useState([]);
  const [progressData, setProgressData] = useState({ overall: {}, active: {} });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');
  const [groupBy, setGroupBy] = useState('Event Type');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [showViewFilterModal, setShowViewFilterModal] = useState(false);
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [showAssignmentFilterModal, setShowAssignmentFilterModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [entryValues, setEntryValues] = useState({});
  const [entryFiles, setEntryFiles] = useState({});
  const [savingEntries, setSavingEntries] = useState({});
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState({});
  const [assignments, setAssignments] = useState(null);

  // Role-based functionality controls
  const canFullAccess = ['super_user', 'admin'].includes(user?.role);
  const canReviewAndLimitedApproval = ['site_manager'].includes(user?.role);
  const canEditAssignedTasks = ['uploader'].includes(user?.role);
  const isViewOnly = ['viewer'].includes(user?.role);
  const isMeterDataOnly = ['meter_manager'].includes(user?.role);

  // Task Assignment Permissions
  const canAssignToAnyone = ['super_user'].includes(user?.role);
  const canAssignInCompany = ['admin'].includes(user?.role);
  const canAssignToUploadersAtOwnSites = ['site_manager'].includes(user?.role);
  const cannotAssignTasks = ['uploader', 'viewer', 'meter_manager'].includes(user?.role);

  // Fetch event-based tasks
  useEffect(() => {
    const fetchEventTasks = async () => {
      if (!companyId) return;

      setLoading(true);
      try {
        const response = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/data-collection/event_tasks/?company_id=${companyId}`
        );

        if (response.ok) {
          const data = await response.json();

          // Transform the data to match the recurring tasks structure
          const transformedEntries = data.tasks || [];
          setDataEntries(transformedEntries);

          // Set progress data
          setProgressData({
            overall: {
              total_tasks: data.total_tasks || 0,
              completed_tasks: data.completed_tasks || 0,
              overall_progress: data.overall_progress || 0
            },
            active: {
              active_tasks: data.active_tasks || 0,
              active_completed: data.active_completed || 0,
              active_progress: data.active_progress || 0
            }
          });
        } else {
          console.error('Failed to fetch event tasks:', response.status);
        }
      } catch (error) {
        console.error('Error fetching event tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventTasks();
  }, [companyId, user?.role]);

  // Fetch assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!companyId) return;

      try {
        const response = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/companies/${companyId}/assignments/`
        );

        if (response.ok) {
          const data = await response.json();
          setAssignments(data);
        } else {
          // If endpoint doesn't exist, just set empty assignments
          setAssignments({ category_assignments: {}, element_assignments: {} });
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
        // Set empty assignments on error
        setAssignments({ category_assignments: {}, element_assignments: {} });
      }
    };

    if (canFullAccess || canReviewAndLimitedApproval) {
      fetchAssignments();
    }
  }, [companyId, user?.role]);

  // Fetch available users for assignment
  const fetchAvailableUsers = async () => {
    if (!companyId || !user) return;

    setLoadingUsers(true);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/`);

      if (response.ok) {
        const users = await response.json();

        let filteredUsers = users.filter(u => u.role !== 'viewer');

        if (canAssignToAnyone) {
          filteredUsers = filteredUsers.filter(u =>
            ['super_user', 'admin', 'site_manager', 'uploader', 'meter_manager'].includes(u.role)
          );
        } else if (canAssignInCompany) {
          filteredUsers = filteredUsers.filter(u =>
            ['site_manager', 'uploader', 'meter_manager'].includes(u.role)
          );
        } else if (canAssignToUploadersAtOwnSites) {
          filteredUsers = filteredUsers.filter(u =>
            ['uploader', 'meter_manager'].includes(u.role)
          );
        }

        setAvailableUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter and search
  const applyFiltersAndSearch = (entries) => {
    let filtered = [...entries];

    if (searchTerm.trim()) {
      filtered = filtered.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.event_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (viewFilter === 'Missing') {
      filtered = filtered.filter(entry => entry.status === 'missing');
    } else if (viewFilter === 'Partial') {
      filtered = filtered.filter(entry => entry.status === 'partial');
    } else if (viewFilter === 'Complete') {
      filtered = filtered.filter(entry => entry.status === 'complete');
    }

    return filtered;
  };

  // Optimized filtering
  const filteredEntries = useMemo(() => {
    let filtered = applyFiltersAndSearch(dataEntries);

    // Apply assignment filter for meter managers and uploaders
    if (['meter_manager', 'uploader'].includes(user?.role) && assignments && Object.keys(assignments).length > 0) {
      const userAssignedTasks = [];

      Object.entries(assignments.category_assignments || {}).forEach(([category, assignedUserObj]) => {
        if (assignedUserObj?.user_id === user.id) {
          const categoryTasks = filtered.filter(task => {
            return task.element_category === category;
          });
          userAssignedTasks.push(...categoryTasks);
        }
      });

      Object.entries(assignments.element_assignments || {}).forEach(([elementId, assignedUserObj]) => {
        if (assignedUserObj?.user_id === user.id) {
          const elementTasks = filtered.filter(task => {
            return task.element_id == elementId;
          });

          elementTasks.forEach(task => {
            if (!userAssignedTasks.some(existing => existing.id === task.id)) {
              userAssignedTasks.push(task);
            }
          });
        }
      });

      filtered = userAssignedTasks;
    }

    if (assignmentFilter === 'assigned') {
      filtered = filtered.filter(entry => entry.assignedTo);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(entry => !entry.assignedTo);
    }

    return filtered;
  }, [searchTerm, viewFilter, groupBy, dataEntries, assignmentFilter, assignments, user?.role, user?.id]);

  // Save data entry
  const saveDataEntry = async (entryId, value, file, elementId) => {
    try {
      const formData = new FormData();
      formData.append('value', value || '');
      formData.append('company_id', companyId);

      if (file) {
        formData.append('evidence_file', file);
      }

      let response;
      if (entryId) {
        // Update existing submission
        response = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/data-collection/${entryId}/`,
          {
            method: 'PATCH',
            body: formData,
          }
        );
      } else {
        // Create new submission - need all required fields
        if (!elementId) {
          console.error('Cannot create submission without element_id');
          return false;
        }

        // Use current year and "Event" as period for event-based tasks
        const currentYear = new Date().getFullYear();
        formData.append('element', elementId);  // element_id IS the primary key
        formData.append('reporting_year', currentYear);
        formData.append('reporting_period', 'Event');  // Special period for event-based tasks

        response = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/data-collection/`,
          {
            method: 'POST',
            body: formData,
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save entry failed:', response.status, errorText);
      }

      return response.ok;
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  };

  // Handle value change with auto-save
  const handleValueChange = (entryElementId, value) => {
    setEntryValues(prev => ({
      ...prev,
      [entryElementId]: value
    }));

    if (autoSaveTimeouts[entryElementId]) {
      clearTimeout(autoSaveTimeouts[entryElementId]);
    }

    const timeoutId = setTimeout(() => {
      // Find the entry to get submission ID and other details
      const entry = dataEntries.find(e => e.element_id === entryElementId);
      handleAutoSave(entry?.id, entryElementId, value, entryFiles[entryElementId]);
    }, 1500);

    setAutoSaveTimeouts(prev => ({
      ...prev,
      [entryElementId]: timeoutId
    }));
  };

  // Handle file change
  const handleFileChange = (entryElementId, file) => {
    setEntryFiles(prev => ({
      ...prev,
      [entryElementId]: file
    }));

    const entry = dataEntries.find(e => e.element_id === entryElementId);
    handleAutoSave(entry?.id, entryElementId, entryValues[entryElementId], file);
  };

  // Handle auto-save
  const handleAutoSave = async (entryId, entryElementId, value, file) => {
    if (savingEntries[entryElementId]) return;

    if (!value && !file) {
      setSavingEntries(prev => ({ ...prev, [entryElementId]: true }));

      try {
        const success = await saveDataEntry(entryId, '', null, entryElementId);
        if (success) {
          setDataEntries(prev =>
            prev.map(entry =>
              entry.element_id === entryElementId
                ? {
                    ...entry,
                    status: 'missing',
                    value: ''
                  }
                : entry
            )
          );
        }
      } catch (error) {
        console.error('Error clearing entry:', error);
      } finally {
        setSavingEntries(prev => ({ ...prev, [entryElementId]: false }));
      }
      return;
    }

    setSavingEntries(prev => ({ ...prev, [entryElementId]: true }));

    try {
      const success = await saveDataEntry(entryId, value, file, entryElementId);
      if (success) {
        if (file || !entryId) {
          // If file was uploaded or new submission was created, fetch the updated data
          const eventTasksResponse = await makeAuthenticatedRequest(
            `${API_BASE_URL}/api/data-collection/event_tasks/?company_id=${companyId}`
          );
          if (eventTasksResponse.ok) {
            const data = await eventTasksResponse.json();
            setDataEntries(data.tasks || []);
          }
        } else {
          // Just update the value and status locally
          setDataEntries(prev =>
            prev.map(entry =>
              entry.element_id === entryElementId
                ? {
                    ...entry,
                    status: value && entry.evidence_file ? 'complete' : 'partial',
                    value: value || entry.value
                  }
                : entry
            )
          );
        }

        setEntryValues(prev => {
          const newValues = { ...prev };
          delete newValues[entryElementId];
          return newValues;
        });
        setEntryFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[entryElementId];
          return newFiles;
        });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryElementId]: false }));
    }
  };

  // Handle clear file
  const handleClearFile = async (entryElementId) => {
    setEntryFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[entryElementId];
      return newFiles;
    });

    setSavingEntries(prev => ({ ...prev, [entryElementId]: true }));

    try {
      // Find the entry to get the submission ID
      const entry = dataEntries.find(e => e.element_id === entryElementId);
      if (!entry || !entry.id) {
        console.error('Cannot clear file for entry without submission');
        setSavingEntries(prev => ({ ...prev, [entryElementId]: false }));
        return;
      }

      const formData = new FormData();
      formData.append('remove_evidence', 'true');

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/${entry.id}/`, {
        method: 'PATCH',
        body: formData,
      });

      if (response.ok) {
        setDataEntries(prev =>
          prev.map(e =>
            e.element_id === entryElementId
              ? {
                  ...e,
                  status: e.value ? 'partial' : 'missing',
                  evidence_file: null
                }
              : e
          )
        );
      }
    } catch (error) {
      console.error('Error clearing file:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryElementId]: false }));
    }
  };

  // Handle clear value
  const handleClearValue = async (entryElementId) => {
    setEntryValues(prev => {
      const newValues = { ...prev };
      delete newValues[entryElementId];
      return newValues;
    });

    setSavingEntries(prev => ({ ...prev, [entryElementId]: true }));

    try {
      // Find the entry to get the submission ID
      const entry = dataEntries.find(e => e.element_id === entryElementId);
      const submissionId = entry?.id;

      const success = await saveDataEntry(submissionId, '', null, entryElementId);
      if (success) {
        setDataEntries(prev =>
          prev.map(e =>
            e.element_id === entryElementId
              ? {
                  ...e,
                  status: 'missing',
                  value: ''
                }
              : e
          )
        );
      }
    } catch (error) {
      console.error('Error clearing value:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryElementId]: false }));
    }
  };

  // Handle task assignment
  const handleOpenAssignModal = (entry) => {
    setSelectedTaskForAssignment(entry);
    setShowAssignModal(true);
    fetchAvailableUsers();
  };

  const handleAssignElement = async (userId) => {
    if (!selectedTaskForAssignment) return;

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/data-collection/${selectedTaskForAssignment.element_id}/assign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assigned_to: userId }),
        }
      );

      if (response.ok) {
        // Refresh data
        const eventTasksResponse = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/data-collection/event_tasks/?company_id=${companyId}`
        );

        if (eventTasksResponse.ok) {
          const data = await eventTasksResponse.json();
          setDataEntries(data.tasks || []);
        }

        setShowAssignModal(false);
        setSelectedTaskForAssignment(null);
        alert('Task assigned successfully!');
      } else {
        alert('Failed to assign task. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('An error occurred while assigning. Please try again.');
    }
  };

  // Helper function to get status color
  const getEntryStatusColor = (status) => {
    const colors = {
      complete: 'w-3 h-3 rounded-full bg-green-500',
      partial: 'w-3 h-3 rounded-full bg-orange-500',
      missing: 'w-3 h-3 rounded-full bg-red-500'
    };
    return colors[status] || colors.missing;
  };

  // Group data function
  const groupData = (entries) => {
    if (groupBy === 'Event Type') {
      return entries.reduce((groups, entry) => {
        const eventType = entry.event_type || 'Other';
        if (!groups[eventType]) groups[eventType] = [];
        groups[eventType].push(entry);
        return groups;
      }, {});
    } else if (groupBy === 'Category') {
      return entries.reduce((groups, entry) => {
        const category = entry.category || 'Other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(entry);
        return groups;
      }, {});
    } else if (groupBy === 'Status') {
      return entries.reduce((groups, entry) => {
        const status = entry.status || 'missing';
        const statusLabel = status === 'complete' ? 'Complete' :
                           status === 'partial' ? 'Partial' : 'Missing';
        if (!groups[statusLabel]) groups[statusLabel] = [];
        groups[statusLabel].push(entry);
        return groups;
      }, {});
    }
    return { 'All Items': entries };
  };

  // Get event type icon and color
  const getEventTypeStyle = (eventType) => {
    const styles = {
      'on_installation': { icon: 'fa-tools', color: 'text-blue-600', bg: 'bg-blue-100', label: 'On Installation' },
      'on_purchase': { icon: 'fa-shopping-cart', color: 'text-green-600', bg: 'bg-green-100', label: 'On Purchase' },
      'on_change': { icon: 'fa-exchange-alt', color: 'text-purple-600', bg: 'bg-purple-100', label: 'On Change' },
      'on_menu_change': { icon: 'fa-utensils', color: 'text-orange-600', bg: 'bg-orange-100', label: 'On Menu Change' },
      'on_implementation': { icon: 'fa-rocket', color: 'text-pink-600', bg: 'bg-pink-100', label: 'On Implementation' },
      'daily': { icon: 'fa-calendar-day', color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Daily' }
    };
    return styles[eventType] || { icon: 'fa-tasks', color: 'text-gray-600', bg: 'bg-gray-100', label: eventType };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Progress Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
              <p className="text-sm text-gray-500">All event-based tasks</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fas fa-tasks text-blue-600 text-xl"></i>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion</span>
              <span className="text-sm font-semibold text-gray-900">
                {progressData.overall.completed_tasks || 0} / {progressData.overall.total_tasks || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressData.overall.overall_progress || 0}%` }}
              ></div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(progressData.overall.overall_progress || 0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Active Tasks Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
              <p className="text-sm text-gray-500">Tasks in progress</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <i className="fas fa-clock text-green-600 text-xl"></i>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-semibold text-gray-900">
                {progressData.active.active_completed || 0} / {progressData.active.active_tasks || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressData.active.active_progress || 0}%` }}
              ></div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(progressData.active.active_progress || 0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:flex lg:items-center lg:space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">View by:</label>
              <button
                onClick={() => setShowViewFilterModal(true)}
                className="flex items-center justify-between w-full sm:w-auto space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-filter"></i>
                  <span className="truncate">{viewFilter || 'All Items'}</span>
                </div>
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Group by:</label>
              <button
                onClick={() => setShowGroupByModal(true)}
                className="flex items-center justify-between w-full sm:w-auto space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-layer-group"></i>
                  <span className="truncate">{groupBy}</span>
                </div>
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Assignment:</label>
              <button
                onClick={() => setShowAssignmentFilterModal(true)}
                className="flex items-center justify-between w-full sm:w-auto space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-tasks"></i>
                  <span className="truncate">{assignmentFilter === 'all' ? 'All Tasks' : assignmentFilter === 'assigned' ? 'Assigned' : 'Unassigned'}</span>
                </div>
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
          </div>

          <div className="flex-1 lg:max-w-md">
            <input
              type="text"
              placeholder="Search event tasks..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Task Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-bolt text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No event-based tasks found</h3>
              <p className="text-gray-600">
                {searchTerm || viewFilter !== 'All' || assignmentFilter !== 'all'
                  ? 'Try adjusting your search terms or filters to find tasks.'
                  : 'No event-based tasks are currently required for your company.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const groupedData = groupData(filteredEntries);
                return Object.entries(groupedData).map(([groupName, entries]) => (
                  <div key={groupName}>
                    {Object.keys(groupedData).length > 1 && (
                      <div className="flex items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-800 mr-3">{groupName}</h4>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="ml-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {entries.length} {entries.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    )}
                    <div className="space-y-4">
                      {entries.map((entry, index) => {
                        const eventTypeStyle = getEventTypeStyle(entry.event_type);
                        // Use entry.id if available, otherwise fall back to element_id or index
                        const entryKey = entry.id || entry.element_id || `entry-${index}`;
                        return (
                          <div key={entryKey} className={`rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${
                            entry.status === 'complete' ? 'bg-green-50 border border-green-200' :
                            entry.status === 'partial' ? 'bg-orange-50 border border-orange-200' :
                            entry.status === 'missing' ? 'bg-red-50 border border-red-200' :
                            'bg-gray-50 border border-gray-200'
                          }`}>
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-100">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                                <div className="flex items-center space-x-3">
                                  <div className={getEntryStatusColor(entry.status)}></div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">{entry.name}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${eventTypeStyle.bg} ${eventTypeStyle.color}`}>
                                        <i className={`fas ${eventTypeStyle.icon} mr-1`}></i>
                                        {eventTypeStyle.label}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                        {entry.category}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Assignment and Status Section */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                  {(canAssignToAnyone || canAssignInCompany || canAssignToUploadersAtOwnSites) && (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <span className="text-xs text-gray-500">
                                        {entry.assignedTo ? `Assigned: ${entry.assignedTo}` : 'Unassigned'}
                                      </span>
                                      <button
                                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 self-start sm:self-auto"
                                        onClick={() => handleOpenAssignModal(entry)}
                                      >
                                        <i className="fas fa-user-plus mr-1"></i>
                                        {entry.assignedTo ? 'Reassign' : 'Assign'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Status Indicator */}
                                  <div className="flex items-center">
                                    {savingEntries[entry.element_id] ? (
                                      <div className="flex items-center text-sm text-blue-600">
                                        <i className="fas fa-spinner fa-spin mr-2"></i>
                                        <span className="text-xs">Auto-saving...</span>
                                      </div>
                                    ) : entry.status === 'complete' ? (
                                      <div className="flex items-center text-sm text-green-600">
                                        <i className="fas fa-check mr-1"></i>
                                        <span className="text-xs">Complete</span>
                                      </div>
                                    ) : entry.status === 'partial' ? (
                                      <div className="flex items-center text-sm text-orange-600">
                                        <i className="fas fa-clock mr-1"></i>
                                        <span className="text-xs">Partial</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center text-sm text-gray-500">
                                        <i className="fas fa-circle mr-1"></i>
                                        <span className="text-xs">Missing</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="flex flex-col md:flex-row">
                              {/* Left Side: Data Input */}
                              <div className="flex-1 p-4 md:pr-2">
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <i className="fas fa-chart-line text-blue-500 text-sm"></i>
                                    <span className="text-sm font-medium text-gray-700">Data Entry</span>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="relative flex-1">
                                      {(canFullAccess || canEditAssignedTasks || canReviewAndLimitedApproval) && !isViewOnly && !isMeterDataOnly ? (
                                        <input
                                          type="number"
                                          value={entryValues[entry.element_id] !== undefined ? entryValues[entry.element_id] : entry.value || ''}
                                          onChange={(e) => handleValueChange(entry.element_id, e.target.value)}
                                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                          placeholder="0"
                                        />
                                      ) : (
                                        <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium text-gray-500">
                                          {entryValues[entry.element_id] !== undefined ? entryValues[entry.element_id] : entry.value || '0'}
                                        </div>
                                      )}
                                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-500 bg-white px-2 rounded">
                                        {entry.unit}
                                      </div>
                                      {(isViewOnly || isMeterDataOnly) && (
                                        <div className="absolute -top-1 -right-1">
                                          <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                                            <i className="fas fa-eye"></i>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Divider */}
                              <div className="h-px bg-gray-200 md:hidden my-2 mx-4"></div>
                              {/* Desktop Divider */}
                              <div className="hidden md:block w-px bg-gray-200"></div>
                              {/* Right Side: Evidence Upload */}
                              <div className="flex-1 p-4 md:pl-2">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <i className="fas fa-paperclip text-purple-500 text-sm"></i>
                                      <span className="text-sm font-medium text-gray-700">Evidence</span>
                                    </div>
                                    {entry.evidence_file && (
                                      <button
                                        onClick={() => handleClearFile(entry.element_id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded text-xs"
                                        title="Remove file"
                                      >
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    )}
                                  </div>
                                  <div className="relative">
                                    {(canFullAccess || canEditAssignedTasks || canReviewAndLimitedApproval) && !isViewOnly && !isMeterDataOnly ? (
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 cursor-pointer">
                                        <input
                                          type="file"
                                          onChange={(e) => handleFileChange(entry.element_id, e.target.files[0])}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                        />
                                        {entry.evidence_file ? (
                                          <div className="space-y-2">
                                            <i className="fas fa-file-alt text-green-500 text-lg"></i>
                                            <div className="text-xs text-gray-600 truncate">
                                              {entry.evidence_file.split('/').pop()}
                                            </div>
                                            <div className="text-xs text-green-600 font-medium">
                                              File uploaded
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <i className="fas fa-upload text-gray-400 text-lg"></i>
                                            <div className="text-xs text-gray-500">
                                              Drop file or click
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="border-2 border-gray-200 rounded-lg p-3 text-center bg-gray-50">
                                        {entry.evidence_file ? (
                                          <div className="space-y-2">
                                            <i className="fas fa-file-alt text-gray-400 text-lg"></i>
                                            <div className="text-xs text-gray-500 truncate">
                                              {entry.evidence_file.split('/').pop()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              View only
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <i className="fas fa-file text-gray-400 text-lg"></i>
                                            <div className="text-xs text-gray-500">
                                              No evidence uploaded
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Task Assignment Modal */}
      {showAssignModal && selectedTaskForAssignment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Assign Element</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTaskForAssignment(null);
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-1">{selectedTaskForAssignment.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{selectedTaskForAssignment.description || ''}</p>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-md">
                <i className="fas fa-info-circle mr-2"></i>
                Assigning this element will assign this event-based task to the selected user.
              </div>
              {selectedTaskForAssignment.unit && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Unit: {selectedTaskForAssignment.unit}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User to Assign Element:
              </label>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading users...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  No users available for assignment
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableUsers.map(availableUser => (
                    <div
                      key={availableUser.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAssignElement(availableUser.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-blue-600 text-sm"></i>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {availableUser.first_name} {availableUser.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {availableUser.role} • {availableUser.email}
                          </div>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {canAssignToAnyone && 'System-wide assignment'}
                {canAssignInCompany && 'Company-wide assignment'}
                {canAssignToUploadersAtOwnSites && 'Site-level assignment'}
              </div>
              <button
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTaskForAssignment(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modals */}
      {showViewFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
            <div className="mt-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">View Filter</h3>
                <button type="button" onClick={() => setShowViewFilterModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'All', label: 'All Items', description: 'Show all items', icon: 'fa-th', color: 'text-blue-600', bgColor: 'bg-blue-100' },
                  { value: 'Missing', label: 'Missing', description: 'Show missing items only', icon: 'fa-circle', color: 'text-red-600', bgColor: 'bg-red-100' },
                  { value: 'Partial', label: 'Partial', description: 'Show partial items only', icon: 'fa-clock', color: 'text-orange-600', bgColor: 'bg-orange-100' },
                  { value: 'Complete', label: 'Complete', description: 'Show complete items only', icon: 'fa-check', color: 'text-green-600', bgColor: 'bg-green-100' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setViewFilter(option.value);
                      setShowViewFilterModal(false);
                    }}
                    className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${option.bgColor} rounded-lg flex items-center justify-center`}>
                        <i className={`fas ${option.icon} ${option.color}`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupByModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
            <div className="mt-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Group By</h3>
                <button type="button" onClick={() => setShowGroupByModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'Event Type', label: 'Event Type', description: 'Group by event type', icon: 'fa-bolt', color: 'text-purple-600', bgColor: 'bg-purple-100' },
                  { value: 'Category', label: 'Category', description: 'Group by data categories', icon: 'fa-folder', color: 'text-blue-600', bgColor: 'bg-blue-100' },
                  { value: 'Status', label: 'Status', description: 'Group by completion status', icon: 'fa-check-circle', color: 'text-green-600', bgColor: 'bg-green-100' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGroupBy(option.value);
                      setShowGroupByModal(false);
                    }}
                    className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${option.bgColor} rounded-lg flex items-center justify-center`}>
                        <i className={`fas ${option.icon} ${option.color}`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignmentFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
            <div className="mt-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Assignment Filter</h3>
                <button type="button" onClick={() => setShowAssignmentFilterModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Tasks', description: 'Show all tasks', icon: 'fa-list', color: 'text-blue-600', bgColor: 'bg-blue-100' },
                  { value: 'assigned', label: 'Assigned', description: 'Show assigned tasks only', icon: 'fa-user-check', color: 'text-green-600', bgColor: 'bg-green-100' },
                  { value: 'unassigned', label: 'Unassigned', description: 'Show unassigned tasks only', icon: 'fa-user-times', color: 'text-red-600', bgColor: 'bg-red-100' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAssignmentFilter(option.value);
                      setShowAssignmentFilterModal(false);
                    }}
                    className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${option.bgColor} rounded-lg flex items-center justify-center`}>
                        <i className={`fas ${option.icon} ${option.color}`}></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{option.label}</p>
                        <p className="text-sm text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventTasks;

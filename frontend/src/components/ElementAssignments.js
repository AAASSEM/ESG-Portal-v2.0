import React, { useState, useEffect } from 'react';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Layout from './Layout';
import Modal from './Modal';

const ElementAssignments = () => {
  const { user, selectedCompany, hasPermission } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [assignmentDetails, setAssignmentDetails] = useState({
    priority: 0,
    notes: '',
    due_date: ''
  });
  const [filter, setFilter] = useState('all');
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  });

  const companyId = selectedCompany?.id;

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId, filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch assignments
      const assignmentsUrl = hasPermission('elementAssignment', 'view_all')
        ? `${API_BASE_URL}/api/element-assignments/company_assignments/?company_id=${companyId}`
        : `${API_BASE_URL}/api/element-assignments/my_assignments/`;
      
      const assignmentsResponse = await makeAuthenticatedRequest(assignmentsUrl);
      if (assignmentsResponse.ok) {
        const data = await assignmentsResponse.json();
        if (hasPermission('elementAssignment', 'view_all')) {
          setAssignments(data.assignments || []);
          setStatistics(data.statistics || statistics);
        } else {
          setAssignments(data);
        }
      }

      // Fetch checklist items if user can assign
      if (hasPermission('elementAssignment', 'create')) {
        const checklistResponse = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/checklist/?company_id=${companyId}`
        );
        if (checklistResponse.ok) {
          const checklistData = await checklistResponse.json();
          setChecklistItems(checklistData.results || []);
        }

        // Fetch available users
        const usersResponse = await makeAuthenticatedRequest(
          `${API_BASE_URL}/api/element-assignments/available_users/?company_id=${companyId}`
        );
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || selectedItems.length === 0) {
      alert('Please select items and a user to assign');
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/bulk_assign/`,
        {
          method: 'POST',
          body: JSON.stringify({
            checklist_item_ids: selectedItems,
            assigned_to_id: selectedUser,
            priority: assignmentDetails.priority,
            notes: assignmentDetails.notes,
            due_date: assignmentDetails.due_date || null
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully assigned ${result.total_created} items`);
        setShowAssignModal(false);
        setSelectedItems([]);
        setSelectedUser('');
        setAssignmentDetails({ priority: 0, notes: '', due_date: '' });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create assignments');
      }
    } catch (error) {
      console.error('Error creating assignments:', error);
      alert('Failed to create assignments');
    }
  };

  const handleStatusUpdate = async (assignmentId, newStatus) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/${assignmentId}/update_status/`,
        {
          method: 'POST',
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 2: return { text: 'High', color: 'red' };
      case 1: return { text: 'Medium', color: 'yellow' };
      default: return { text: 'Low', color: 'gray' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading assignments...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Element Assignments</h1>
              <p className="text-gray-600 mt-2">
                Manage and track data element assignments to team members
              </p>
            </div>
            {hasPermission('elementAssignment', 'create') && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <i className="fas fa-plus mr-2"></i>Assign Elements
              </button>
            )}
          </div>

          {/* Statistics */}
          {hasPermission('elementAssignment', 'view_all') && (
            <div className="grid grid-cols-5 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{statistics.in_progress}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{statistics.overdue}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {['all', 'pending', 'in_progress', 'completed', 'overdue'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-6 py-3 font-medium capitalize ${
                  filter === status
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500">No assignments found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAssignments.map(assignment => {
                const priority = getPriorityLabel(assignment.priority);
                const statusColor = getStatusColor(assignment.status);
                
                return (
                  <div key={assignment.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.element_name}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {assignment.element_description}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="text-sm text-gray-500">
                            <i className="fas fa-user mr-1"></i>
                            {assignment.assigned_to_username}
                          </span>
                          {assignment.due_date && (
                            <span className={`text-sm ${assignment.is_overdue ? 'text-red-600' : 'text-gray-500'}`}>
                              <i className="fas fa-calendar mr-1"></i>
                              Due: {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className={`text-sm px-2 py-1 rounded bg-${priority.color}-100 text-${priority.color}-700`}>
                            {priority.text} Priority
                          </span>
                        </div>

                        {assignment.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
                            <i className="fas fa-sticky-note mr-2"></i>
                            {assignment.notes}
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-700`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                        
                        {(assignment.assigned_to === user.id || hasPermission('elementAssignment', 'update')) && (
                          <select
                            value={assignment.status}
                            onChange={(e) => handleStatusUpdate(assignment.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Elements to User</h2>
              
              {/* Select User */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email}) - {user.role} - {user.assignment_count} active
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Elements */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Elements ({selectedItems.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {checklistItems.map(item => (
                    <label key={item.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">{item.element_name}</div>
                        <div className="text-sm text-gray-500">{item.element_description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={assignmentDetails.priority}
                  onChange={(e) => setAssignmentDetails({...assignmentDetails, priority: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={0}>Low</option>
                  <option value={1}>Medium</option>
                  <option value={2}>High</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={assignmentDetails.due_date}
                  onChange={(e) => setAssignmentDetails({...assignmentDetails, due_date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={assignmentDetails.notes}
                  onChange={(e) => setAssignmentDetails({...assignmentDetails, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add any instructions or notes for the assignee"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedItems([]);
                    setSelectedUser('');
                    setAssignmentDetails({ priority: 0, notes: '', due_date: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUser || selectedItems.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Elements
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ElementAssignments;
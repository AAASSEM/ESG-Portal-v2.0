import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const SiteManagement = () => {
  const { user, selectedCompany, hasPermission } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSite, setShowAddSite] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);

  const emiratesOptions = [
    'Abu Dhabi',
    'Dubai',
    'Sharjah',
    'Ajman',
    'Umm Al Quwain',
    'Ras Al Khaimah',
    'Fujairah'
  ];

  useEffect(() => {
    if (selectedCompany && hasPermission('siteManagement', 'read')) {
      fetchSites();
    }
  }, [selectedCompany]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/companies/${selectedCompany.id}/sites/`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSites(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/sites/${siteId}/`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setSites(sites.filter(site => site.id !== siteId));
      }
    } catch (error) {
      console.error('Failed to delete site:', error);
    }
  };

  const AddSiteModal = ({ isOpen, onClose, onSuccess, editSite = null }) => {
    const [formData, setFormData] = useState({
      name: '',
      emirate: '',
      address: '',
      description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (editSite) {
        setFormData({
          name: editSite.name || '',
          emirate: editSite.emirate || '',
          address: editSite.address || '',
          description: editSite.description || ''
        });
      } else {
        setFormData({ name: '', emirate: '', address: '', description: '' });
      }
    }, [editSite]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);

      try {
        const url = editSite
          ? `${API_BASE_URL}/api/sites/${editSite.id}/`
          : `${API_BASE_URL}/api/companies/${selectedCompany.id}/sites/`;
        
        const method = editSite ? 'PUT' : 'POST';
        
        const response = await makeAuthenticatedRequest(url, {
          method,
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          onSuccess();
          setFormData({ name: '', emirate: '', address: '', description: '' });
        }
      } catch (error) {
        console.error('Failed to save site:', error);
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen) return null;

    const modalContent = (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      >
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editSite ? 'Edit Site' : 'Add New Site'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Site Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Dubai Main Hotel"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Emirate</label>
              <select
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                value={formData.emirate}
                onChange={(e) => setFormData({...formData, emirate: e.target.value})}
              >
                <option value="">Select Emirate</option>
                {emiratesOptions.map(emirate => (
                  <option key={emirate} value={emirate}>{emirate}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Full address of the site"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <textarea
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Additional details about this site"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
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
                {submitting ? (editSite ? 'Updating...' : 'Creating...') : (editSite ? 'Update Site' : 'Create Site')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  };

  if (!hasPermission('siteManagement', 'read')) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <i className="fas fa-lock text-4xl mb-4"></i>
          <p>You don't have permission to access site management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading sites...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
          <p className="text-gray-600">
            Manage locations and sites for {selectedCompany?.name}
          </p>
        </div>
        {hasPermission('siteManagement', 'create') && (
          <button
            onClick={() => setShowAddSite(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Site
          </button>
        )}
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <div key={site.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                <p className="text-sm text-purple-600 font-medium">{site.emirate}</p>
              </div>
              <div className="flex space-x-2">
                {hasPermission('siteManagement', 'update') && (
                  <button
                    onClick={() => {
                      setSelectedSite(site);
                      setShowAddSite(true);
                    }}
                    className="text-gray-500 hover:text-purple-600"
                    title="Edit Site"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
                {hasPermission('siteManagement', 'delete') && (
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="text-gray-500 hover:text-red-600"
                    title="Delete Site"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
            </div>

            {site.address && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  {site.address}
                </p>
              </div>
            )}

            {site.description && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">{site.description}</p>
              </div>
            )}

            {/* Site Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{site.users_count || 0}</div>
                <div className="text-xs text-gray-500">Assigned Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{site.meters_count || 0}</div>
                <div className="text-xs text-gray-500">Active Meters</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
              <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center">
                <i className="fas fa-users mr-1"></i>
                Manage Users
              </button>
              <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center">
                <i className="fas fa-chart-bar mr-1"></i>
                View Data
              </button>
            </div>
          </div>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="fas fa-building text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sites configured</h3>
          <p className="text-gray-600 mb-6">
            Create your first site to start collecting ESG data across multiple locations.
          </p>
          {hasPermission('siteManagement', 'create') && (
            <button
              onClick={() => setShowAddSite(true)}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Create First Site
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Site Modal */}
      <AddSiteModal
        isOpen={showAddSite}
        onClose={() => {
          setShowAddSite(false);
          setSelectedSite(null);
        }}
        onSuccess={() => {
          setShowAddSite(false);
          setSelectedSite(null);
          fetchSites();
        }}
        editSite={selectedSite}
      />
    </div>
  );
};

export default SiteManagement;
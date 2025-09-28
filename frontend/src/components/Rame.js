import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Rame = () => {
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();
  const [selectedVoluntaryFrameworks, setSelectedVoluntaryFrameworks] = useState([]);
  const [mandatoryFrameworks, setMandatoryFrameworks] = useState([]);
  const [loadingFrameworks, setLoadingFrameworks] = useState(true);
  const [savingFramework, setSavingFramework] = useState(false);
  const companyId = selectedCompany?.id;

  // Fetch existing voluntary frameworks from database
  useEffect(() => {
    if (!companyId) {
      console.log('⏸️ No company selected, skipping voluntary framework fetch');
      return;
    }
    
    const fetchExistingVoluntaryFrameworks = async () => {
      try {
        console.log('🔍 Fetching existing voluntary frameworks for company:', companyId);
        
        // Get all company frameworks
        const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/frameworks/`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const frameworks = await response.json();
          
          // Filter for voluntary frameworks (type === 'voluntary')
          const voluntaryIds = frameworks
            .filter(fw => fw.type === 'voluntary')
            .map(fw => fw.framework_id);
          
          console.log('📋 Existing voluntary frameworks from DB:', voluntaryIds);
          setSelectedVoluntaryFrameworks(voluntaryIds);
        }
      } catch (error) {
        console.error('❌ Error fetching voluntary frameworks:', error);
      } finally {
        setLoadingFrameworks(false);
      }
    };
    
    fetchExistingVoluntaryFrameworks();
  }, [companyId]);

  // Fetch company's assigned mandatory frameworks
  useEffect(() => {
    if (!companyId) {
      console.log('⏸️ No company selected, skipping framework fetch');
      return;
    }
    
    const fetchMandatoryFrameworks = async () => {
      try {
        console.log('🔍 Fetching mandatory frameworks for company:', companyId);

        // Get company data to check emirate
        const companyResponse = await fetch(`${API_BASE_URL}/api/companies/${companyId}/`, {
          credentials: 'include'
        });

        let companyEmirate = 'dubai'; // default
        if (companyResponse.ok) {
          const company = await companyResponse.json();
          companyEmirate = company.emirate;
          console.log('📋 Company emirate:', companyEmirate);
        }

        // Framework definitions
        const frameworkDefinitions = {
          esg: {
            id: 'esg',
            name: 'ESG Framework',
            description: 'Core Environmental, Social, and Governance reporting framework',
            icon: 'fas fa-chart-line',
            color: 'blue',
            coverage: 'Environmental, Social, Governance',
            reason: 'Core framework for all businesses'
          },
          dst: {
            id: 'dst',
            name: 'Dubai Sustainable Tourism (DST)',
            description: 'Dubai Department of Economy and Tourism sustainability requirements for all hotels in Dubai',
            icon: 'fas fa-building',
            color: 'green',
            coverage: 'Energy, Water, Waste, Community',
            reason: 'Mandatory for Dubai hospitality entities'
          }
        };

        // Determine which frameworks to show based on emirate
        const frameworksToShow = ['esg']; // All companies get ESG
        if (companyEmirate === 'dubai') {
          frameworksToShow.push('dst'); // Only Dubai companies get DST
        }

        const mappedFrameworks = frameworksToShow.map(id => frameworkDefinitions[id]);

        console.log('✅ Company emirate:', companyEmirate);
        console.log('✅ Frameworks to show:', frameworksToShow);
        console.log('✅ Mapped frameworks:', mappedFrameworks);
        setMandatoryFrameworks(mappedFrameworks);
        setLoadingFrameworks(false);
      } catch (error) {
        console.error('Error fetching mandatory frameworks:', error);
        // Fallback to minimum ESG framework only
        setMandatoryFrameworks([
          {
            id: 'esg',
            name: 'ESG Framework',
            description: 'Core Environmental, Social, and Governance reporting framework',
            icon: 'fas fa-chart-line',
            color: 'blue',
            coverage: 'Environmental, Social, Governance',
            reason: 'Core framework for all businesses'
          }
        ]);
      } finally {
        setLoadingFrameworks(false);
      }
    };

    fetchMandatoryFrameworks();
  }, [companyId]);

  const voluntaryFrameworks = [
    {
      id: 'GREEN_KEY',
      name: 'Green Key Certification',
      description: 'Eco-label for tourism establishments with comprehensive sustainability criteria',
      icon: 'fas fa-key',
      color: 'green',
      features: ['13 criteria areas', 'Water & energy efficiency', 'Guest engagement programs'],
      bestFor: 'Hotels seeking eco-certification'
    },
    {
      id: 'GRI',
      name: 'GRI Standards',
      description: 'Global Reporting Initiative - Comprehensive sustainability reporting standards',
      icon: 'fas fa-globe',
      color: 'blue',
      features: ['Universal standards', 'Stakeholder engagement', 'Detailed disclosures'],
      bestFor: 'Comprehensive sustainability reporting'
    },
    {
      id: 'SASB',
      name: 'SASB Standards',
      description: 'Sustainability Accounting Standards Board - Industry-specific sustainability metrics',
      icon: 'fas fa-chart-bar',
      color: 'purple',
      features: ['Industry-specific metrics', 'Investor-focused reporting', 'Materiality assessment'],
      bestFor: 'Public companies, Investor relations'
    },
    {
      id: 'TCFD',
      name: 'TCFD',
      description: 'Task Force on Climate-related Financial Disclosures - Climate risk reporting',
      icon: 'fas fa-thermometer-half',
      color: 'orange',
      features: ['Climate risk assessment', 'Scenario planning', 'Financial impact disclosure'],
      bestFor: 'Climate-focused reporting'
    },
    {
      id: 'CDP',
      name: 'CDP',
      description: 'Carbon Disclosure Project - Environmental disclosure system for companies',
      icon: 'fas fa-cloud',
      color: 'teal',
      features: ['Environmental disclosure', 'Climate scoring', 'Water & forest reporting'],
      bestFor: 'Environmental transparency'
    }
  ];

  const toggleVoluntaryFramework = async (frameworkId) => {
    const isCurrentlySelected = selectedVoluntaryFrameworks.includes(frameworkId);
    setSavingFramework(true);
    
    try {
      if (isCurrentlySelected) {
        // Remove framework
        const response = await fetch(`${API_BASE_URL}/api/frameworks/remove_voluntary/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            company_id: companyId,
            framework_id: frameworkId
          })
        });
        
        if (response.ok) {
          console.log('✅ Framework removed successfully:', frameworkId);
          setSelectedVoluntaryFrameworks(prev => prev.filter(id => id !== frameworkId));
        } else {
          console.error('❌ Failed to remove framework:', response.status);
        }
      } else {
        // Add framework
        const response = await fetch(`${API_BASE_URL}/api/frameworks/assign_voluntary/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            company_id: companyId,
            framework_id: frameworkId
          })
        });
        
        if (response.ok) {
          console.log('✅ Framework assigned successfully:', frameworkId);
          setSelectedVoluntaryFrameworks(prev => [...prev, frameworkId]);
        } else {
          console.error('❌ Failed to assign framework:', response.status);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling framework:', error);
    } finally {
      setSavingFramework(false);
    }
  };

  const handleContinue = () => {
    navigate('/list');
  };

  // Check if user has permission to access framework selection (moved after hooks)
  const canAccessFrameworks = () => {
    if (!user) return false;
    // Module 1-2 (Company Setup & Frameworks): CORRECTED
    // ✅ Super User, Admin: Full edit access
    // 👁️ Site Manager, Viewer: View-only access  
    // ❌ Uploader, Meter Manager: NO ACCESS (completely blocked)
    return ['super_user', 'admin', 'site_manager', 'viewer'].includes(user.role);
  };

  // If no permission, show permission denied message
  if (!canAccessFrameworks()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access framework selection.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based functionality controls for Framework Selection
  const canEditFrameworks = ['super_user', 'admin'].includes(user?.role); // Full edit access
  const isViewOnly = ['site_manager', 'viewer'].includes(user?.role); // View only

  if (loadingFrameworks) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading frameworks...</span>
      </div>
    );
  }

  return (
     <div className="max-w-6xl mx-auto">

      {/* Mandatory Frameworks Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-lock text-red-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Mandatory Frameworks</h2>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Required</div>
          </div>
          {isViewOnly && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <i className="fas fa-eye mr-2"></i>View Only Mode
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mandatoryFrameworks.map((framework) => (
            <div key={framework.id} className="bg-white rounded-xl p-6 shadow-sm border-2 border-red-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 bg-${framework.color}-100 rounded-xl flex items-center justify-center`}>
                  <i className={`${framework.icon} text-${framework.color}-600 text-2xl`}></i>
                </div>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Mandatory</div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{framework.name}</h3>
              <p className="text-gray-600 mb-4">{framework.description}</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-info-circle text-yellow-600 text-sm"></i>
                  <span className="text-yellow-800 text-sm font-medium">Auto-assigned: {framework.reason}</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Coverage:</span> {framework.coverage}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voluntary Frameworks Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-hand-pointer text-blue-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Voluntary Frameworks</h2>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Optional</div>
          </div>
          {isViewOnly && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <i className="fas fa-eye mr-2"></i>View Selected Frameworks
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {voluntaryFrameworks.map((framework) => {
            const isSelected = selectedVoluntaryFrameworks.includes(framework.id);
            return (
              <div 
                key={framework.id} 
                className={`bg-white rounded-xl p-6 shadow-sm border transition-all relative ${
                  isSelected ? 'border-blue-300 shadow-md' : 'border-gray-200'
                } ${canEditFrameworks ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : 'cursor-default'}`}
                onClick={canEditFrameworks ? () => toggleVoluntaryFramework(framework.id) : undefined}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-${framework.color}-100 rounded-xl flex items-center justify-center ${!canEditFrameworks ? 'opacity-60' : ''}`}>
                    <i className={`${framework.icon} text-${framework.color}-600 text-2xl`}></i>
                  </div>
                  <label className={`relative inline-flex items-center ${canEditFrameworks ? 'cursor-pointer' : 'cursor-default'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={!canEditFrameworks}
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${isSelected ? 'peer-checked:bg-blue-600' : ''} ${!canEditFrameworks ? 'opacity-60' : ''}`}></div>
                  </label>
                </div>
                {isViewOnly && (
                  <div className="absolute -top-1 -right-1">
                    <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      <i className="fas fa-eye"></i>
                    </div>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{framework.name}</h3>
                <p className="text-gray-600 mb-4">{framework.description}</p>
                <div className="space-y-2 mb-4">
                  {framework.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <i className="fas fa-check text-green-500 text-sm"></i>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Best for:</span> {framework.bestFor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Framework Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Frameworks Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="font-medium text-gray-900">Mandatory Frameworks</span>
            <span className="text-sm text-red-600 font-medium">{mandatoryFrameworks.length} Required</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="font-medium text-gray-900">Voluntary Frameworks</span>
            <span className="text-sm text-blue-600 font-medium">{selectedVoluntaryFrameworks.length} Selected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="font-medium text-gray-900">Total Frameworks</span>
            <span className="text-sm text-green-600 font-medium">{mandatoryFrameworks.length + selectedVoluntaryFrameworks.length} Active</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/onboard')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          {isViewOnly && (
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <i className="fas fa-eye mr-1"></i>View Only Access
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          {canEditFrameworks ? (
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
            >
              Save & Continue
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          ) : (
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
            >
              Continue
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rame;
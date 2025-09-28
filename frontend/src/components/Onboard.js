import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Onboard = () => {
  console.log('🚀 Onboard component loaded/re-rendered at', new Date().toLocaleTimeString());
  
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '',
    emirate: '',
    primarySector: '',
    activities: [],
    customActivity: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const companyId = selectedCompany?.id || null;
  const isInitialLoad = useRef(true);
  const lastSavedData = useRef(null);
  
  console.log('📊 Current formData state:', formData);
  console.log('⏱️ Component states - Loading:', loading, 'Saving:', saving, 'InitialLoad:', isInitialLoad.current);
  
  // Log the selected activities details
  if (formData.activities && formData.activities.length > 0) {
    const predefinedActivityNames = [
      'Hotel Operations', 'Food & Beverage', 'Spa & Wellness', 'Event Management', 
      'Retail Operations', 'Recreation Facilities', 'Conference & Meeting Rooms',
      'Housekeeping Services', 'Laundry Services', 'Transportation Services'
    ];
    
    console.log('🎯 Selected activities details:', formData.activities.map(act => ({
      name: act,
      isFromPredefined: predefinedActivityNames.includes(act)
    })));
  }

  // Fetch existing company data and activities on component mount
  useEffect(() => {
    console.log('🔄 useEffect for data fetching triggered');
    if (!companyId) {
      console.log('⏸️ No company selected, skipping data fetch');
      setLoading(false);
      return;
    }
    
    const fetchCompanyData = async () => {
      try {
        console.log('📡 Fetching company data for ID:', companyId);
        
        // Fetch company basic info
        const companyResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/`);
        console.log('Company API Response status:', companyResponse.status);
        
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          console.log('Loaded company data from API:', companyData);
          
          // Fetch company activities separately
          const activitiesResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/activities/`);
          let activityNames = [];
          
          if (activitiesResponse.ok) {
            const activitiesData = await activitiesResponse.json();
            console.log('Loaded activities data:', activitiesData);
            // Deduplicate activities by name
            activityNames = [...new Set(activitiesData.map(a => a.name))];
          } else {
            console.log('No activities found for company or API error:', activitiesResponse.status);
          }
          
          // Convert backend values to frontend format
          const emirateMap = {
            'dubai': 'Dubai',
            'abu_dhabi': 'Abu Dhabi',
            'sharjah': 'Sharjah',
            'ajman': 'Ajman',
            'umm_al_quwain': 'Umm Al Quwain',
            'ras_al_khaimah': 'Ras Al Khaimah',
            'fujairah': 'Fujairah'
          };

          const sectorMap = {
            'hospitality': 'Hospitality & Tourism',
            'real_estate': 'Real Estate',
            'financial_services': 'Financial Services',
            'manufacturing': 'Manufacturing',
            'technology': 'Technology',
            'healthcare': 'Healthcare',
            'education': 'Education',
            'retail': 'Retail'
          };

          const finalFormData = {
            companyName: companyData.name || '',
            emirate: emirateMap[companyData.emirate] || companyData.emirate || '',
            primarySector: sectorMap[companyData.sector] || companyData.sector || '',
            activities: activityNames,
            customActivity: ''
          };
          
          console.log('Setting form data:', finalFormData);
          setFormData(finalFormData);
          lastSavedData.current = finalFormData;
        } else if (companyResponse.status === 404) {
          console.log('Company not found, starting with empty form');
          // Company doesn't exist yet, start with empty form
          const emptyData = {
            companyName: '',
            emirate: '',
            primarySector: '',
            activities: [],
            customActivity: ''
          };
          setFormData(emptyData);
          lastSavedData.current = emptyData;
        } else {
          console.error('API error, using empty form');
          const emptyData = {
            companyName: '',
            emirate: '',
            primarySector: '',
            activities: [],
            customActivity: ''
          };
          setFormData(emptyData);
          lastSavedData.current = emptyData;
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        // Use empty form on error
        const emptyData = {
          companyName: '',
          emirate: '',
          primarySector: '',
          activities: [],
          customActivity: ''
        };
        setFormData(emptyData);
        lastSavedData.current = emptyData;
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };

    fetchCompanyData();
  }, [companyId]);

  // Auto-save when form data changes (debounced) - TEMPORARILY DISABLED
  useEffect(() => {
    return; // Disable auto-save for now
    console.log('🔄 Auto-save useEffect triggered');
    console.log('💾 Auto-save conditions - Loading:', loading, 'Saving:', saving, 'InitialLoad:', isInitialLoad.current);
    
    if (loading || saving || isInitialLoad.current) {
      console.log('⏸️ Auto-save skipped due to conditions');
      return;
    }
    
    // Check if data actually changed
    const currentData = {
      companyName: formData.companyName,
      emirate: formData.emirate,
      primarySector: formData.primarySector,
      activities: formData.activities
    };
    
    const lastData = {
      companyName: lastSavedData.current?.companyName || '',
      emirate: lastSavedData.current?.emirate || '',
      primarySector: lastSavedData.current?.primarySector || '',
      activities: lastSavedData.current?.activities || []
    };
    
    console.log('📄 Current data:', currentData);
    console.log('📄 Last saved data:', lastData);
    
    const hasDataChanged = JSON.stringify(currentData) !== JSON.stringify(lastData);
    
    console.log('🔄 Data changed?', hasDataChanged);
    
    if (!hasDataChanged) {
      console.log('⏸️ No changes detected, skipping auto-save');
      return;
    }
    
    console.log('⏰ Setting auto-save timeout (3 seconds)...');
    const timeoutId = setTimeout(() => {
      // Only auto-save if we have meaningful data
      const hasMeaningfulData = formData.companyName.trim() || formData.activities.length > 0 || formData.emirate || formData.primarySector;
      console.log('💾 Auto-save timeout triggered - Has meaningful data?', hasMeaningfulData);
      console.log('💾 Company name:', formData.companyName, 'Activities count:', formData.activities.length, 'Emirate:', formData.emirate, 'Sector:', formData.primarySector);
      
      if (hasMeaningfulData) {
        console.log('✅ Auto-saving due to form change...');
        saveData(false);
      } else {
        console.log('❌ Skipping auto-save - no meaningful data');
      }
    }, 3000); // 3 second debounce

    return () => clearTimeout(timeoutId);
  }, [formData, loading, saving]);

  // Comprehensive hospitality activity icon mapping
  const getActivityIcon = (activityName) => {
    const activity = activityName.toLowerCase();
    
    // Accommodation & Lodging
    if (activity.includes('hotel') || activity.includes('accommodation') || activity.includes('lodging') || activity.includes('room')) {
      return { icon: 'fas fa-bed', color: 'blue' };
    }
    if (activity.includes('resort') || activity.includes('villa') || activity.includes('suite')) {
      return { icon: 'fas fa-hotel', color: 'indigo' };
    }
    if (activity.includes('hostel') || activity.includes('budget') || activity.includes('backpack')) {
      return { icon: 'fas fa-building', color: 'gray' };
    }
    
    // Food & Beverage
    if (activity.includes('restaurant') || activity.includes('dining') || activity.includes('food') || activity.includes('kitchen')) {
      return { icon: 'fas fa-utensils', color: 'green' };
    }
    if (activity.includes('bar') || activity.includes('lounge') || activity.includes('pub') || activity.includes('beverage')) {
      return { icon: 'fas fa-cocktail', color: 'amber' };
    }
    if (activity.includes('coffee') || activity.includes('cafe') || activity.includes('espresso')) {
      return { icon: 'fas fa-coffee', color: 'yellow' };
    }
    if (activity.includes('bakery') || activity.includes('pastry') || activity.includes('dessert')) {
      return { icon: 'fas fa-birthday-cake', color: 'pink' };
    }
    if (activity.includes('catering') || activity.includes('banquet') || activity.includes('buffet')) {
      return { icon: 'fas fa-concierge-bell', color: 'emerald' };
    }
    
    // Wellness & Recreation
    if (activity.includes('spa') || activity.includes('massage') || activity.includes('wellness') || activity.includes('beauty')) {
      return { icon: 'fas fa-spa', color: 'orange' };
    }
    if (activity.includes('gym') || activity.includes('fitness') || activity.includes('workout')) {
      return { icon: 'fas fa-dumbbell', color: 'red' };
    }
    if (activity.includes('pool') || activity.includes('swimming') || activity.includes('aquatic')) {
      return { icon: 'fas fa-swimmer', color: 'cyan' };
    }
    if (activity.includes('sauna') || activity.includes('steam') || activity.includes('jacuzzi')) {
      return { icon: 'fas fa-hot-tub', color: 'orange' };
    }
    
    // Entertainment & Events
    if (activity.includes('event') || activity.includes('conference') || activity.includes('meeting')) {
      return { icon: 'fas fa-calendar-alt', color: 'purple' };
    }
    if (activity.includes('wedding') || activity.includes('celebration') || activity.includes('ceremony')) {
      return { icon: 'fas fa-heart', color: 'rose' };
    }
    if (activity.includes('show') || activity.includes('entertainment') || activity.includes('performance')) {
      return { icon: 'fas fa-theater-masks', color: 'violet' };
    }
    if (activity.includes('casino') || activity.includes('gaming') || activity.includes('slot')) {
      return { icon: 'fas fa-dice', color: 'red' };
    }
    if (activity.includes('nightclub') || activity.includes('disco') || activity.includes('dance')) {
      return { icon: 'fas fa-music', color: 'purple' };
    }
    
    // Retail & Shopping
    if (activity.includes('retail') || activity.includes('shop') || activity.includes('store') || activity.includes('boutique')) {
      return { icon: 'fas fa-shopping-bag', color: 'red' };
    }
    if (activity.includes('gift') || activity.includes('souvenir') || activity.includes('merchandise')) {
      return { icon: 'fas fa-gift', color: 'green' };
    }
    if (activity.includes('market') || activity.includes('bazaar') || activity.includes('vendor')) {
      return { icon: 'fas fa-store', color: 'orange' };
    }
    
    // Sports & Activities
    if (activity.includes('golf') || activity.includes('course')) {
      return { icon: 'fas fa-golf-ball', color: 'green' };
    }
    if (activity.includes('tennis') || activity.includes('court')) {
      return { icon: 'fas fa-table-tennis', color: 'blue' };
    }
    if (activity.includes('ski') || activity.includes('snow') || activity.includes('winter')) {
      return { icon: 'fas fa-skiing', color: 'cyan' };
    }
    if (activity.includes('beach') || activity.includes('seaside') || activity.includes('coastal')) {
      return { icon: 'fas fa-umbrella-beach', color: 'yellow' };
    }
    if (activity.includes('water sports') || activity.includes('diving') || activity.includes('sailing')) {
      return { icon: 'fas fa-anchor', color: 'blue' };
    }
    
    // Business & Services
    if (activity.includes('business') || activity.includes('corporate') || activity.includes('office')) {
      return { icon: 'fas fa-briefcase', color: 'slate' };
    }
    if (activity.includes('concierge') || activity.includes('reception') || activity.includes('guest services')) {
      return { icon: 'fas fa-user-tie', color: 'blue' };
    }
    if (activity.includes('valet') || activity.includes('parking') || activity.includes('transport')) {
      return { icon: 'fas fa-car', color: 'gray' };
    }
    if (activity.includes('laundry') || activity.includes('cleaning') || activity.includes('housekeeping')) {
      return { icon: 'fas fa-tshirt', color: 'blue' };
    }
    
    // Tourism & Travel
    if (activity.includes('tour') || activity.includes('excursion') || activity.includes('sightseeing')) {
      return { icon: 'fas fa-map-marked-alt', color: 'green' };
    }
    if (activity.includes('travel') || activity.includes('booking') || activity.includes('reservation')) {
      return { icon: 'fas fa-plane', color: 'blue' };
    }
    if (activity.includes('cruise') || activity.includes('yacht') || activity.includes('boat')) {
      return { icon: 'fas fa-ship', color: 'blue' };
    }
    
    // Specialized Services
    if (activity.includes('medical') || activity.includes('clinic') || activity.includes('health')) {
      return { icon: 'fas fa-medkit', color: 'red' };
    }
    if (activity.includes('pet') || activity.includes('animal') || activity.includes('dog')) {
      return { icon: 'fas fa-paw', color: 'brown' };
    }
    if (activity.includes('child') || activity.includes('kids') || activity.includes('family')) {
      return { icon: 'fas fa-child', color: 'yellow' };
    }
    
    // Default for unmatched activities
    return { icon: 'fas fa-building-user', color: 'purple' };
  };

  const businessActivities = [
    { id: 'hotel', name: 'Hotel Operations', icon: 'fas fa-bed', color: 'blue' },
    { id: 'food', name: 'Food & Beverage', icon: 'fas fa-utensils', color: 'green' },
    { id: 'spa', name: 'Spa & Wellness', icon: 'fas fa-spa', color: 'orange' },
    { id: 'events', name: 'Event Management', icon: 'fas fa-calendar-alt', color: 'purple' },
    { id: 'retail', name: 'Retail Operations', icon: 'fas fa-shopping-bag', color: 'red' },
    { id: 'recreation', name: 'Recreation Facilities', icon: 'fas fa-tree', color: 'teal' },
    { id: 'conference', name: 'Conference & Meeting Rooms', icon: 'fas fa-users', color: 'indigo' },
    { id: 'housekeeping', name: 'Housekeeping Services', icon: 'fas fa-broom', color: 'cyan' },
    { id: 'laundry', name: 'Laundry Services', icon: 'fas fa-tshirt', color: 'blue' },
    { id: 'transport', name: 'Transportation Services', icon: 'fas fa-car', color: 'gray' }
  ];

  const handleActivityToggle = (activityName) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activityName)
        ? prev.activities.filter(a => a !== activityName)
        : [...prev.activities, activityName]
    }));
  };

  const handleAddCustomActivity = async () => {
    const customActivityName = formData.customActivity.trim();
    if (customActivityName && !formData.activities.includes(customActivityName)) {
      // First add to local state using trimmed name
      setFormData(prev => ({
        ...prev,
        activities: [...prev.activities, customActivityName],
        customActivity: ''
      }));
      
      // Then add to backend (will be saved with next auto-save)
      try {
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/activities/add_custom/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customActivityName,
            company_id: companyId
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Custom activity added:', data);
        } else {
          console.error('Failed to add custom activity to backend');
        }
      } catch (error) {
        console.error('Error adding custom activity:', error);
      }
    }
  };

  // Auto-save function
  const saveData = async (showMessage = false) => {
    console.log('💾 saveData function called with showMessage:', showMessage);
    console.log('💾 Current saving state:', saving);
    
    if (saving) {
      console.log('❌ saveData aborted - already saving');
      return; // Prevent concurrent saves
    }
    
    console.log('💾 saveData called, formData:', formData);
    
    setSaving(true);
    console.log('💾 Set saving state to true');
    console.log('💾 Starting to save company data:', formData);
    
    try {
      // Step 1: Save/Update company basic info
      let response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/`);
      let isUpdate = response.ok;
      
      // Convert frontend values to backend format
      const emirateReverseMap = {
        'Dubai': 'dubai',
        'Abu Dhabi': 'abu_dhabi',
        'Sharjah': 'sharjah',
        'Ajman': 'ajman',
        'Umm Al Quwain': 'umm_al_quwain',
        'Ras Al Khaimah': 'ras_al_khaimah',
        'Fujairah': 'fujairah'
      };

      const sectorReverseMap = {
        'Hospitality & Tourism': 'hospitality',
        'Real Estate': 'real_estate',
        'Financial Services': 'financial_services',
        'Manufacturing': 'manufacturing',
        'Technology': 'technology',
        'Healthcare': 'healthcare',
        'Education': 'education',
        'Retail': 'retail'
      };

      const companyData = {
        name: formData.companyName || 'Unnamed Company',
        emirate: emirateReverseMap[formData.emirate] || 'dubai',
        sector: sectorReverseMap[formData.primarySector] || 'hospitality'
      };
      
      console.log('Company data to send:', companyData);
      
      if (isUpdate) {
        // Update existing company using fixed CSRF-exempt authentication
        console.log('Updating existing company...');
        response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/`, {
          method: 'PUT',
          body: JSON.stringify(companyData)
        });
      } else {
        // Create new company
        console.log('Creating new company...');
        response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/`, {
          method: 'POST',
          body: JSON.stringify(companyData)
        });
      }

      if (response.ok) {
        const companyResult = await response.json();
        console.log('Company data saved successfully:', companyResult);
        
        // Step 2: Ensure all custom activities exist in the database
        const customActivities = formData.activities.filter(
          activity => !businessActivities.some(ba => ba.name === activity)
        );
        
        for (const customActivity of customActivities) {
          try {
            await makeAuthenticatedRequest(`${API_BASE_URL}/api/activities/add_custom/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: customActivity,
                company_id: companyId
              })
            });
          } catch (error) {
            console.error(`Error creating custom activity "${customActivity}":`, error);
          }
        }
        
        // Step 3: Get all activities to map names to IDs
        const activitiesResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/activities/`);
        if (activitiesResponse.ok) {
          const allActivitiesData = await activitiesResponse.json();
          const allActivities = allActivitiesData.results || allActivitiesData;
          
          console.log('All available activities:', allActivities);
          console.log('Selected activity names:', formData.activities);
          console.log('Database activity names:', allActivities.map(a => `"${a.name}"`));
          console.log('Frontend activity names:', formData.activities.map(name => `"${name}"`));
          
          const activityIds = [];
          
          formData.activities.forEach(activityName => {
            // Try exact match first
            let found = allActivities.find(a => a.name === activityName);
            
            // If no exact match, try case-insensitive match
            if (!found) {
              found = allActivities.find(a => a.name.toLowerCase() === activityName.toLowerCase());
            }
            
            // If still no match, try partial match
            if (!found) {
              found = allActivities.find(a => 
                a.name.toLowerCase().includes(activityName.toLowerCase()) ||
                activityName.toLowerCase().includes(a.name.toLowerCase())
              );
            }
            
            if (found) {
              console.log(`✓ Found "${activityName}" matched with "${found.name}" (ID: ${found.id})`);
              activityIds.push(found.id);
            } else {
              console.warn(`✗ Could not find activity "${activityName}" in database`);
              console.log('Available activities:', allActivities.map(a => a.name));
              
              // Create custom activity if no match found
              console.log(`Creating custom activity: "${activityName}"`);
              // Note: Custom activity creation logic could be added here
            }
          });
          
          console.log('Final activity IDs to save:', activityIds);
          
          // Save activities
          const saveActivitiesResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/save_activities/`, {
            method: 'POST',
            body: JSON.stringify({
              activity_ids: activityIds
            })
          });

          if (saveActivitiesResponse.ok) {
            const activitiesResult = await saveActivitiesResponse.json();
            console.log('Activities saved successfully:', activitiesResult);
            
            // Update last saved data
            lastSavedData.current = {
              companyName: formData.companyName,
              emirate: formData.emirate,
              primarySector: formData.primarySector,
              activities: formData.activities
            };
            
            // Removed alert message - data saves silently
          } else {
            console.error('Failed to save activities');
            const errorText = await saveActivitiesResponse.text();
            console.error('Activities save error:', errorText);
          }
        }
        
      } else {
        console.error('Failed to save company data. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error saving company data:', error);
    } finally {
      setSaving(false);
    }
  };

  // Main continue function
  const handleContinue = async () => {
    await saveData(true);
    navigate('/rame');
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading company information...</span>
      </div>
    );
  }

  // Check if user has permission to access company onboarding (moved after hooks)
  const canAccessOnboarding = () => {
    console.log('🔍 Checking onboarding access:', { user, role: user?.role, selectedCompany });
    if (!user) {
      console.log('❌ No user found');
      return false;
    }
    // Module 1-2 (Company Setup & Frameworks): CORRECTED
    // ✅ Super User, Admin: Full edit access
    // 👁️ Site Manager, Viewer: View-only access
    // ❌ Uploader, Meter Manager: NO ACCESS (completely blocked)
    const hasAccess = ['super_user', 'admin', 'site_manager', 'viewer'].includes(user.role);
    console.log('✅ Access check result:', hasAccess, 'for role:', user.role);
    return hasAccess;
  };

  // If no permission, show permission denied message
  if (!canAccessOnboarding()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access company onboarding.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based functionality controls for Company Onboarding
  const canEditCompanyInfo = ['super_user', 'admin'].includes(user?.role); // Full edit access
  const isViewOnly = ['site_manager', 'viewer'].includes(user?.role); // View only

  return (
     <div className="max-w-6xl mx-auto">

      {/* Company Information Form */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-building text-blue-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
              <p className="text-gray-600">
                {canEditCompanyInfo ? 'Enter your basic company details' : 'View company information'}
              </p>
            </div>
          </div>
          {isViewOnly && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <i className="fas fa-eye mr-2"></i>View Only Mode
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <div className="relative">
              {canEditCompanyInfo ? (
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter company name" 
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                />
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                  {formData.companyName || 'Not specified'}
                </div>
              )}
              {formData.companyName && canEditCompanyInfo && (
                <div className="absolute right-3 top-3 text-green-500">
                  <i className="fas fa-check-circle"></i>
                </div>
              )}
              {isViewOnly && (
                <div className="absolute -top-1 -right-1">
                  <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    <i className="fas fa-eye"></i>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Emirate *</label>
            <div className="relative">
              {canEditCompanyInfo ? (
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.emirate}
                  onChange={async (e) => {
                    const newEmirate = e.target.value;
                    setFormData(prev => ({ ...prev, emirate: newEmirate }));
                    console.log('🌍 Emirate changed to:', newEmirate, '- Triggering immediate save...');

                    // Immediate save with specific emirate value
                    try {
                      // Convert to backend format
                      const emirateReverseMap = {
                        'Dubai': 'dubai',
                        'Abu Dhabi': 'abu_dhabi',
                        'Sharjah': 'sharjah',
                        'Ajman': 'ajman',
                        'Umm Al Quwain': 'umm_al_quwain',
                        'Ras Al Khaimah': 'ras_al_khaimah',
                        'Fujairah': 'fujairah'
                      };

                      const backendEmirate = emirateReverseMap[newEmirate] || 'dubai';
                      console.log('🌍 Saving emirate as backend format:', backendEmirate);

                      // Get all current company data and update just the emirate
                      const sectorReverseMap = {
                        'Hospitality & Tourism': 'hospitality',
                        'Real Estate': 'real_estate',
                        'Financial Services': 'financial_services',
                        'Manufacturing': 'manufacturing',
                        'Technology': 'technology',
                        'Healthcare': 'healthcare',
                        'Education': 'education',
                        'Retail': 'retail'
                      };

                      const companyData = {
                        name: formData.companyName || 'Unnamed Company',
                        emirate: backendEmirate,
                        sector: sectorReverseMap[formData.primarySector] || 'hospitality'
                      };

                      console.log('🌍 Sending complete company data:', companyData);

                      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/`, {
                        method: 'PUT',
                        body: JSON.stringify(companyData)
                      });

                      if (response.ok) {
                        console.log('✅ Emirate saved successfully');
                      } else {
                        console.error('❌ Failed to save emirate:', response.status);
                      }
                    } catch (error) {
                      console.error('❌ Error saving emirate:', error);
                    }
                  }}
                >
                  <option value="">Select Emirate</option>
                  <option value="Dubai">Dubai</option>
                  <option value="Abu Dhabi">Abu Dhabi</option>
                  <option value="Sharjah">Sharjah</option>
                  <option value="Ajman">Ajman</option>
                  <option value="Umm Al Quwain">Umm Al Quwain</option>
                  <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                  <option value="Fujairah">Fujairah</option>
                </select>
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                  {formData.emirate || 'Not specified'}
                </div>
              )}
              {isViewOnly && (
                <div className="absolute -top-1 -right-1">
                  <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    <i className="fas fa-eye"></i>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Sector *</label>
            <div className="relative">
              {canEditCompanyInfo ? (
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.primarySector}
                  onChange={(e) => {
                    const newSector = e.target.value;
                    setFormData(prev => ({ ...prev, primarySector: newSector }));
                    console.log('🏭 Sector changed to:', newSector, '- Triggering immediate save...');
                    // Trigger immediate save after state update
                    setTimeout(() => saveData(true), 100);
                  }}
                >
                  <option value="">Select Primary Sector</option>
                  <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Retail">Retail</option>
                </select>
              ) : (
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                  {formData.primarySector || 'Not specified'}
                </div>
              )}
              {isViewOnly && (
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

      {/* Business Activities Selection */}
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-list-check text-purple-600"></i>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Business Activities</h2>
              <p className="text-gray-600">
                {canEditCompanyInfo ? 'Select all activities your company engages in' : 'View selected business activities'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {canEditCompanyInfo ? (
              <>
                <button 
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium"
                  onClick={() => setFormData(prev => ({ ...prev, activities: businessActivities.map(a => a.name) }))}
                >
                  <i className="fas fa-check-double mr-2"></i>Select All
                </button>
                <button 
                  className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium"
                  onClick={() => setFormData(prev => ({ ...prev, activities: [] }))}
                >
                  <i className="fas fa-times mr-2"></i>Deselect All
                </button>
              </>
            ) : (
              <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                <i className="fas fa-eye mr-2"></i>View Only
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {businessActivities.map((activity) => {
            const isSelected = formData.activities.includes(activity.name);
            return (
              <div 
                key={activity.id}
                className={`activity-card rounded-lg p-4 transition-all relative ${
                  isSelected 
                    ? 'border-2 border-green-200 bg-green-50' 
                    : canEditCompanyInfo 
                      ? 'border border-gray-200 bg-white hover:border-green-200 hover:bg-green-50 cursor-pointer'
                      : 'border border-gray-200 bg-gray-50'
                }`}
                onClick={canEditCompanyInfo ? () => handleActivityToggle(activity.name) : undefined}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => {}}
                    className="w-5 h-5 text-green-600 rounded"
                    disabled={!canEditCompanyInfo}
                  />
                  <div className={`w-8 h-8 bg-${activity.color}-100 rounded-lg flex items-center justify-center ${!canEditCompanyInfo ? 'opacity-60' : ''}`}>
                    <i className={`${activity.icon} text-${activity.color}-600`}></i>
                  </div>
                  <span className={`font-medium ${canEditCompanyInfo ? 'text-gray-900' : 'text-gray-600'}`}>
                    {activity.name}
                  </span>
                </div>
                {isViewOnly && (
                  <div className="absolute -top-1 -right-1">
                    <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      <i className="fas fa-eye"></i>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Custom Activities */}
          {formData.activities.filter(activity => !businessActivities.some(ba => ba.name === activity)).map((customActivity, index) => {
            const activityIcon = getActivityIcon(customActivity);
            return (
              <div 
                key={`custom-${index}`}
                className={`activity-card rounded-lg p-4 transition-all relative ${
                  canEditCompanyInfo 
                    ? 'cursor-pointer border-2 border-green-200 bg-green-50'
                    : 'border-2 border-green-200 bg-green-50 opacity-75'
                }`}
                onClick={canEditCompanyInfo ? () => handleActivityToggle(customActivity) : undefined}
              >
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={true} 
                    onChange={() => {}}
                    className="w-5 h-5 text-green-600 rounded"
                    disabled={!canEditCompanyInfo}
                  />
                  <div className={`w-8 h-8 bg-${activityIcon.color}-100 rounded-lg flex items-center justify-center ${!canEditCompanyInfo ? 'opacity-60' : ''}`}>
                    <i className={`${activityIcon.icon} text-${activityIcon.color}-600`}></i>
                  </div>
                  <span className={`font-medium ${canEditCompanyInfo ? 'text-gray-900' : 'text-gray-600'}`}>{customActivity}</span>
                </div>
                {isViewOnly && (
                  <div className="absolute -top-1 -right-1">
                    <div className="px-1 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      <i className="fas fa-eye"></i>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Activity Addition */}
        {canEditCompanyInfo && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Custom Activity</h3>
            <div className="flex space-x-3">
              <input 
                type="text" 
                placeholder="Enter custom business activity" 
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.customActivity}
                onChange={(e) => setFormData(prev => ({ ...prev, customActivity: e.target.value }))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomActivity();
                  }
                }}
              />
              <button 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                onClick={handleAddCustomActivity}
              >
                <i className="fas fa-plus mr-2"></i>Add Activity
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <i className="fas fa-info-circle mr-2"></i>
            {canEditCompanyInfo 
              ? (saving ? 'Saving...' : 'Progress will be automatically saved')
              : 'Viewing company information in read-only mode'
            }
          </div>
          {isViewOnly && (
            <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <i className="fas fa-eye mr-1"></i>View Only Access
            </div>
          )}
        </div>
        <div className="flex space-x-4">
          {canEditCompanyInfo ? (
            <button 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Continue'}
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-arrow-right'} ml-2`}></i>
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

export default Onboard;
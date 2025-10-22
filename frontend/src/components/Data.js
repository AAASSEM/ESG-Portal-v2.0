import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Data = () => {
  // ALL HOOKS DECLARED AT THE TOP
  const navigate = useNavigate();
  const location = useLocation();
  const { user, selectedCompany } = useAuth();
  const [selectedYear, setSelectedYear] = useState(2025); // Use 2025 to match backend data
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Dynamic current month
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState('All');
  const [groupBy, setGroupBy] = useState('Category');
  const [entryValues, setEntryValues] = useState({});
  const [entryFiles, setEntryFiles] = useState({});
  const [savingEntries, setSavingEntries] = useState({});
  const [autoSaveTimeouts, setAutoSaveTimeouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);
  const [dataEntries, setDataEntries] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [assignments, setAssignments] = useState({ category_assignments: {}, element_assignments: {} });
  const [showViewFilterModal, setShowViewFilterModal] = useState(false);
  const [monthSwitchLoading, setMonthSwitchLoading] = useState(false);
  const [showGroupByModal, setShowGroupByModal] = useState(false);
  const [showAssignmentFilterModal, setShowAssignmentFilterModal] = useState(false);
  const [progressData, setProgressData] = useState({
    annual: { 
      data_progress: 0, 
      evidence_progress: 0, 
      overall_progress: 0,
      total_points: 0, 
      completed_points: 0,
      data_complete: 0,
      evidence_complete: 0
    },
    monthly: { 
      data_progress: 0, 
      evidence_progress: 0, 
      overall_progress: 0,
      items_remaining: 0,
      completed_points: 0,
      total_points: 0
    }
  });

  // Get current company ID from auth context
  const companyId = selectedCompany?.id;

  // Format number with thousand separators
  const formatNumber = (value) => {
    if (!value) return value;
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // File matching logic - match files to data entries based on filename
  const matchFileToEntry = (filename, entries) => {
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try to match by keywords in filename
    const matches = entries.filter(entry => {
      const entryName = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const meterType = entry.meter_type ? entry.meter_type.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
      
      // Check if filename contains entry name keywords
      const nameWords = entryName.split(/\s+/).filter(word => word.length > 2);
      const typeWords = meterType.split(/\s+/).filter(word => word.length > 2);
      
      const matchesName = nameWords.some(word => cleanFilename.includes(word));
      const matchesType = typeWords.some(word => cleanFilename.includes(word));
      
      return matchesName || matchesType;
    });
    
    // Return best match (first match for now)
    return matches.length > 0 ? matches[0] : null;
  };

  // Handle multiple file upload
  const handleMultipleFileUpload = async (files) => {
    setIsUploading(true);
    const results = {
      successful: [],
      failed: [],
      unmatched: []
    };
    
    try {
      for (let file of files) {
        const matchedEntry = matchFileToEntry(file.name, dataEntries);
        
        if (matchedEntry) {
          try {
            const success = await saveDataEntry(matchedEntry.id, null, file);
            if (success) {
              results.successful.push({
                filename: file.name,
                entryName: matchedEntry.name,
                entryId: matchedEntry.id
              });
              
              // Update the entry in state
              setDataEntries(prev => 
                prev.map(entry => 
                  entry.id === matchedEntry.id 
                    ? { 
                        ...entry, 
                        status: entry.value ? 'complete' : 'partial',
                        evidence_file: URL.createObjectURL(file) // Temporary URL for display
                      } 
                    : entry
                )
              );
            } else {
              results.failed.push({
                filename: file.name,
                reason: 'Upload failed'
              });
            }
          } catch (error) {
            results.failed.push({
              filename: file.name,
              reason: error.message
            });
          }
        } else {
          results.unmatched.push(file.name);
        }
      }
      
      // Refresh progress after all uploads
      await refreshProgressData();
      setUploadResults(results);
      
    } catch (error) {
      console.error('Bulk upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // API functions
  const fetchAvailableMonths = async (year) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/available_months/?year=${year}`);
      const data = await response.json();
      return data.months || [];
    } catch (error) {
      console.error('Error fetching available months:', error);
      return [];
    }
  };

  const fetchDataEntries = async (year, month) => {
    try {
      let url = `${API_BASE_URL}/api/data-collection/tasks/?company_id=${companyId}&year=${year}&month=${month}`;
      const response = await makeAuthenticatedRequest(url);
      const data = await response.json();
      // console.log('🔍 fetchDataEntries raw API response:', {
      //   user_role: user?.role,
      //   data_count: data?.length || 0,
      //   sample_entry: data?.[0],
      //   all_entries: data
      // });
      return data || [];
    } catch (error) {
      console.error('Error fetching data entries:', error);
      return [];
    }
  };

  const fetchProgress = async (year, month = null) => {
    try {
      // Build URL for progress data
      let url = `${API_BASE_URL}/api/data-collection/progress/?company_id=${companyId}&year=${year}`;

      if (month) {
        url += `&month=${month}`;
      }

      const response = await makeAuthenticatedRequest(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching progress:', error);
      return { data_progress: 0, evidence_progress: 0 };
    }
  };

  const saveDataEntry = async (submissionId, value, file = null) => {
    try {
      const formData = new FormData();
      if (value) formData.append('value', value);
      if (file) formData.append('evidence_file', file);

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/${submissionId}/`, {
        method: 'PATCH',
        body: formData, // Use FormData for file uploads
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving data entry:', error);
      return false;
    }
  };

  // Generate months based on current date and available data - NO API CALLS!
  const generateMonthsData = (availableMonths, currentYear, currentMonth, selectedMonth) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate month status without API calls - much faster!
    const monthsWithStatus = monthNames.map((name, index) => {
      const monthNum = index + 1;
      let status = 'upcoming';

      if (monthNum === selectedMonth) {
        status = 'selected';
      } else if (monthNum < currentMonth) {
        // For past months, assume incomplete until user clicks them
        if (availableMonths.includes(monthNum)) {
          status = 'incomplete';  // Default status, will be updated when clicked
        } else {
          status = 'upcoming';
        }
      } else if (monthNum === currentMonth) {
        status = 'current';
      } else if (monthNum > 12) { // Future months beyond December (shouldn't happen)
        status = 'disabled';
      }

      return {
        id: monthNum,
        name,
        status,
        available: availableMonths.includes(monthNum)
      };
    });

    return monthsWithStatus;
  };

  const getMonthButtonStyle = (month) => {
    switch (month.status) {
      case 'complete':
        return 'bg-green-100 border border-green-300 text-green-700';
      case 'selected':
        return 'bg-blue-100 border-2 border-blue-500 text-blue-700';
      case 'current':
        return 'bg-blue-50 border border-blue-300 text-blue-600';
      case 'incomplete':
        return 'bg-orange-100 border border-orange-300 text-orange-700';
      case 'upcoming':
        return 'bg-gray-100 border border-gray-300 text-gray-700';
      case 'disabled':
        return 'bg-gray-200 border border-gray-400 text-gray-500 opacity-50 cursor-not-allowed';
      default:
        return 'bg-gray-100 border border-gray-300 text-gray-700';
    }
  };

  const getEntryStatusColor = (status) => {
    switch (status) {
      case 'complete':
        return 'w-3 h-3 bg-green-500 rounded-full';
      case 'partial':
        return 'w-3 h-3 bg-orange-500 rounded-full';
      case 'missing':
        return 'w-3 h-3 bg-red-500 rounded-full';
      default:
        return 'w-3 h-3 bg-gray-500 rounded-full';
    }
  };


  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!companyId) return; // Don't load if no company selected

      // Only show loading spinner for initial load, not month switches
      if (!dataEntries || dataEntries.length === 0) {
        setLoading(true);
      } else {
        // Show subtle loading for month switches only
        setMonthSwitchLoading(true);
      }
      console.log('🚀 Starting optimized data load - current month only!');
      const startTime = performance.now();

      try {
        // Load all API calls in PARALLEL for maximum speed! 🚀
        console.log('🚀 Loading API calls in PARALLEL for maximum speed!');
        const apiStart = performance.now();

        // Fire all API calls at once using Promise.all()
        const [
          availableMonths,
          entries,
          annualProgress,
          monthlyProgress
        ] = await Promise.all([
          fetchAvailableMonths(selectedYear),
          fetchDataEntries(selectedYear, selectedMonth),
          fetchProgress(selectedYear),
          fetchProgress(selectedYear, selectedMonth)
        ]);

        const parallelTime = (performance.now() - apiStart).toFixed(0);
        console.log(`⚡ All PARALLEL API calls completed in: ${parallelTime}ms`);

        const totalTime = (performance.now() - startTime).toFixed(0);
        console.log('✅ All data loaded!', {
          availableMonths: availableMonths.length,
          entriesCount: entries?.length || 0,
          totalTime: `${totalTime}ms`
        });

        // Generate months data (no async needed anymore!)
        const currentDate = new Date();
        const monthsData = generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, selectedMonth);
        setMonths(monthsData);
        
        setProgressData({
          annual: { 
            data_progress: annualProgress.data_progress || 0,
            evidence_progress: annualProgress.evidence_progress || 0,
            overall_progress: annualProgress.overall_progress || 0,
            total_points: annualProgress.total_points || 0,
            completed_points: annualProgress.completed_points || 0,
            data_complete: annualProgress.data_complete || 0,
            evidence_complete: annualProgress.evidence_complete || 0
          },
          monthly: { 
            data_progress: monthlyProgress.data_progress || 0,
            evidence_progress: monthlyProgress.evidence_progress || 0,
            overall_progress: monthlyProgress.overall_progress || 0,
            items_remaining: monthlyProgress.items_remaining || 0,
            completed_points: monthlyProgress.completed_points || 0,
            total_points: monthlyProgress.total_points || 0
          }
        });

        // Process entries data (already fetched in parallel)
        // console.log('Raw entries from API:', entries);
        let transformedEntries = [];

        // Transform entries data
        transformedEntries = entries.map(entry => ({
          id: entry.submission.id,
          name: entry.element_name,
          meter: entry.meter ? `${entry.meter.name} (${entry.meter.type})` : 'N/A',
          meter_id: entry.meter ? entry.meter.id : null,
          meter_type: entry.meter ? entry.meter.type : null,
          meter_location: entry.meter ? entry.meter.location : null,
          frequency: entry.cadence,
          value: entry.submission.value || '',
          unit: entry.element_unit || '',
          status: entry.submission.status || 'missing',
          category: entry.type,
          description: entry.element_description || '',
          evidence_file: entry.submission.evidence_file || null,
          assignedTo: entry.submission.assigned_to ?
            `${entry.submission.assigned_to.first_name || ''} ${entry.submission.assigned_to.last_name || ''}`.trim() || entry.submission.assigned_to.username || entry.submission.assigned_to.email
            : null,
          assignedUserId: entry.submission.assigned_to ? entry.submission.assigned_to.id : null,
          assignedAt: entry.submission.assigned_at || null,
          element_category: entry.element_category || 'Environmental',
          element_id: entry.element_id
        }));
        
        // console.log('Transformed entries:', transformedEntries);
        setDataEntries(transformedEntries);

      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
        setMonthSwitchLoading(false);
      }
    };

    loadInitialData();
  }, [selectedYear, selectedMonth, companyId]);

  // Fetch assignments for meter managers and uploaders
  useEffect(() => {
    if (companyId && ['meter_manager', 'uploader'].includes(user?.role)) {
      console.log('🔧 Data.js - Fetching assignments for meter manager/uploader');
      fetchAssignments();
    }
  }, [companyId, user?.role]);

  // Role-based functionality controls - moved before functions to avoid hoisting issues
  const canFullAccess = ['super_user', 'admin'].includes(user?.role); // Full access + approval rights
  const canReviewAndLimitedApproval = ['site_manager'].includes(user?.role); // Review + limited approval
  const canEditAssignedTasks = ['uploader'].includes(user?.role); // Edit assigned tasks only
  const isViewOnly = ['viewer'].includes(user?.role); // View only
  const isMeterDataOnly = ['meter_manager'].includes(user?.role); // Limited access to view meter-related data only

  // Filter and search function - moved before useMemo to avoid hoisting issues
  const applyFiltersAndSearch = (entries) => {
    let filtered = [...entries];

    // Apply role-based filtering first - meter managers only see metered tasks
    if (isMeterDataOnly) {
      filtered = filtered.filter(entry => entry.meter_id !== null);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(entry =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.meter.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply view filter
    if (viewFilter === 'Metered') {
      filtered = filtered.filter(entry => entry.meter_id !== null);
    } else if (viewFilter === 'Non-metered') {
      filtered = filtered.filter(entry => entry.meter_id === null);
    } else if (viewFilter === 'Missing') {
      filtered = filtered.filter(entry => entry.status === 'missing');
    } else if (viewFilter === 'Partial') {
      filtered = filtered.filter(entry => entry.status === 'partial');
    } else if (viewFilter === 'Complete') {
      filtered = filtered.filter(entry => entry.status === 'complete');
    }
    // 'All' shows everything

    return filtered;
  };

  // Optimized filtering with useMemo for better performance
  const filteredEntries = useMemo(() => {
    let filtered = applyFiltersAndSearch(dataEntries);

    // Role-based assignment filtering for meter managers and uploaders
    if (['meter_manager', 'uploader'].includes(user?.role) && assignments && Object.keys(assignments).length > 0) {
      const userAssignedTasks = [];

      // Step 1: Check category assignments
      Object.entries(assignments.category_assignments || {}).forEach(([category, assignedUserObj]) => {
        if (assignedUserObj?.user_id === user.id) {
          // Add ALL tasks from this assigned category
          const categoryTasks = filtered.filter(task => {
            return task.element_category === category;
          });
          userAssignedTasks.push(...categoryTasks);
        }
      });

      // Step 2: Check individual element assignments
      Object.entries(assignments.element_assignments || {}).forEach(([elementId, assignedUserObj]) => {
        if (assignedUserObj?.user_id === user.id) {
          // Add this specific assigned element's tasks
          const elementTasks = filtered.filter(task => {
            return task.element_id == elementId;
          });

          // Avoid duplicates from category assignments
          elementTasks.forEach(task => {
            if (!userAssignedTasks.some(existing => existing.id === task.id)) {
              userAssignedTasks.push(task);
            }
          });
        }
      });

      filtered = userAssignedTasks;
    }

    // Filter by assignment status
    if (assignmentFilter === 'assigned') {
      filtered = filtered.filter(entry => entry.assignedTo);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(entry => !entry.assignedTo);
    }

    return filtered;
  }, [searchTerm, viewFilter, groupBy, dataEntries, assignmentFilter, assignments, user?.role, user?.id]);

  // Removed excessive window focus refresh to improve performance

  // Removed excessive navigation-based refresh to improve performance

  // Removed periodic refresh to improve performance - users can use manual refresh button if needed

  // Helper function to refresh data entries and progress
  const refreshDataEntries = async () => {
    if (!companyId) return;
    
    // console.log('🔄 REFRESH START - Company:', companyId, 'Year:', selectedYear, 'Month:', selectedMonth);
    try {
      // Refresh both data entries and progress simultaneously
      const [entries, annualProgress, monthlyProgress] = await Promise.all([
        fetchDataEntries(selectedYear, selectedMonth),
        fetchProgress(selectedYear),
        fetchProgress(selectedYear, selectedMonth)
      ]);

      // console.log('📊 Raw API responses:');
      // console.log('- Data entries count:', entries.length);
      // console.log('- Annual progress:', annualProgress);
      // console.log('- Monthly progress:', monthlyProgress);

      // For meter managers, calculate progress based only on metered tasks
      let finalAnnualProgress = annualProgress;
      let finalMonthlyProgress = monthlyProgress;
      
      if (isMeterDataOnly) {
        // Calculate meter-specific progress from the entries
        const meterProgress = calculateMeterManagerProgress(entries);
        
        finalAnnualProgress = {
          ...annualProgress,
          ...meterProgress
        };
        
        finalMonthlyProgress = {
          ...monthlyProgress,
          ...meterProgress,
          items_remaining: Math.max(0, meterProgress.total_points - meterProgress.completed_points)
        };
        
        // console.log('🔧 Meter Manager Progress Override:', {
        //   original: monthlyProgress,
        //   meter_override: finalMonthlyProgress
        // });
      }

      // Update progress data
      setProgressData({
        annual: finalAnnualProgress,
        monthly: finalMonthlyProgress
      });

      // console.log('🔄 Transforming entries:', {
      //   user_role: user?.role,
      //   entries_count: entries.length,
      //   entries_with_values: entries.filter(e => e.submission?.value).length,
      //   entries_with_meters: entries.filter(e => e.meter_id || e.meter).length
      // });

      const transformedEntries = entries.map(entry => {
        const assignedUser = entry.submission.assigned_to;
        let assignedToName = null;
        
        if (assignedUser) {
          const firstName = assignedUser.first_name || '';
          const lastName = assignedUser.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          assignedToName = fullName || assignedUser.username || assignedUser.email;
        }
        
        return {
          id: entry.submission.id,
          name: entry.element_name,
          meter: entry.meter ? `${entry.meter.name} (${entry.meter.type})` : 'N/A',
          meter_id: entry.meter ? entry.meter.id : null,
          meter_type: entry.meter ? entry.meter.type : null,
          meter_location: entry.meter ? entry.meter.location : null,
          frequency: entry.cadence,
          value: entry.submission.value || '',
          unit: entry.element_unit || '',
          status: entry.submission.status || 'missing',
          category: entry.type,
          description: entry.element_description || '',
          evidence_file: entry.submission.evidence_file || null,
          assignedTo: assignedToName,
          assignedUserId: assignedUser ? assignedUser.id : null,
          assignedAt: entry.submission.assigned_at || null,
          element_category: entry.element_category || 'Environmental',
          element_id: entry.element_id
        };
      });
      setDataEntries(transformedEntries);
      // console.log('✅ REFRESH COMPLETE - Found', transformedEntries.length, 'tasks');
      // console.log('- Raw entries breakdown with assignments:');
      // entries.forEach((entry, i) => {
      //   const submission = entry.submission;
      //   console.log(`  ${i + 1}. ${entry.element_name} - Meter: ${entry.meter ? entry.meter.name + ' (' + entry.meter.type + ')' : 'N/A'} - Status: ${submission?.status || 'missing'}`);
      //   if (submission.assigned_to) {
      //     console.log(`    ✅ Assignment: ${JSON.stringify(submission.assigned_to)}`);
      //   } else {
      //     console.log(`    ❌ No assignment data`);
      //   }
      //   
      //   // Check if submission has all expected fields
      //   console.log(`    Submission keys: ${Object.keys(submission)}`);
      //   if (submission.assigned_to === null || submission.assigned_to === undefined) {
      //     console.log(`    Assignment is explicitly null/undefined`);
      //   }
      // });
      // console.log('- Expected total points (entries * 2):', transformedEntries.length * 2);
      // console.log('- Actual total points from API:', monthlyProgress.total_points);
      // console.log('- Completed points:', monthlyProgress.completed_points);
      // console.log('- Items remaining:', monthlyProgress.items_remaining);
      // console.log('- Progress calculations:');
      // console.log('  - Data progress:', monthlyProgress.data_progress);
      // console.log('  - Evidence progress:', monthlyProgress.evidence_progress);
      // console.log('  - Overall progress:', monthlyProgress.overall_progress);
    } catch (error) {
      console.error('❌ Error refreshing data entries:', error);
    }
  };


  const handleValueChange = (entryId, value) => {
    setEntryValues(prev => ({
      ...prev,
      [entryId]: value
    }));
    
    // Clear existing timeout for this entry
    if (autoSaveTimeouts[entryId]) {
      clearTimeout(autoSaveTimeouts[entryId]);
    }
    
    // Set new timeout for auto-save (debounced)
    const timeoutId = setTimeout(() => {
      handleAutoSave(entryId, value, entryFiles[entryId]);
    }, 1500); // 1.5 second delay
    
    setAutoSaveTimeouts(prev => ({
      ...prev,
      [entryId]: timeoutId
    }));
  };

  const handleFileChange = (entryId, file) => {
    setEntryFiles(prev => ({
      ...prev,
      [entryId]: file
    }));
    
    // Auto-save immediately when file is uploaded
    handleAutoSave(entryId, entryValues[entryId], file);
  };

  const handleClearValue = async (entryId) => {
    // Clear from temporary state
    setEntryValues(prev => {
      const newValues = { ...prev };
      delete newValues[entryId];
      return newValues;
    });

    // Clear from backend by saving empty value
    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, '', null);
      if (success) {
        // Update the entry status and clear value
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: 'missing',
                  value: ''
                } 
              : entry
          )
        );
        
        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Error clearing value:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleClearFile = async (entryId) => {
    // Clear from temporary state
    setEntryFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[entryId];
      return newFiles;
    });

    // Clear from backend by saving without file
    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      // Send request to remove file (send null/empty for evidence_file)
      const formData = new FormData();
      formData.append('remove_evidence', 'true'); // Signal to remove file
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/${entryId}/`, {
        method: 'PATCH',
        body: formData,
      });
      
      if (response.ok) {
        // Update the entry status
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: entry.value ? 'partial' : 'missing',
                  evidence_file: null
                } 
              : entry
          )
        );
        
        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Error clearing file:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleAutoSave = async (entryId, value, file) => {
    // Skip if already saving this entry
    if (savingEntries[entryId]) return;

    // Handle clearing data (empty value and no file)
    if (!value && !file) {
      setSavingEntries(prev => ({ ...prev, [entryId]: true }));

      try {
        const success = await saveDataEntry(entryId, '', null);
        if (success) {
          // Update the entry status to missing and clear value
          setDataEntries(prev =>
            prev.map(entry =>
              entry.id === entryId
                ? {
                    ...entry,
                    status: 'missing',
                    value: ''
                  }
                : entry
            )
          );

          // Refresh progress data
          await refreshProgressData();
        }
      } catch (error) {
        console.error('Error clearing entry:', error);
      } finally {
        setSavingEntries(prev => ({ ...prev, [entryId]: false }));
      }
      return;
    }

    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, value, file);
      if (success) {
        // If file was uploaded, we need to get the updated entry data to get the actual file URL
        if (file) {
          // Fetch the updated entry data from backend to get the actual evidence_file URL
          const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/data-collection/${entryId}/`);
          if (response.ok) {
            const updatedSubmission = await response.json();
            
            // Update the entry with both value and evidence file from backend
            setDataEntries(prev => 
              prev.map(entry => 
                entry.id === entryId 
                  ? { 
                      ...entry, 
                      status: (value || entry.value) && updatedSubmission.evidence_file ? 'complete' : 'partial',
                      value: value || entry.value,
                      evidence_file: updatedSubmission.evidence_file
                    } 
                  : entry
              )
            );
          }
        } else {
          // If no file, just update value and status
          setDataEntries(prev => 
            prev.map(entry => 
              entry.id === entryId 
                ? { 
                    ...entry, 
                    status: value && entry.evidence_file ? 'complete' : 'partial',
                    value: value || entry.value 
                  } 
                : entry
            )
          );
        }
        
        // Clear the temporary values
        setEntryValues(prev => {
          const newValues = { ...prev };
          delete newValues[entryId];
          return newValues;
        });
        setEntryFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[entryId];
          return newFiles;
        });

        // Refresh progress data
        await refreshProgressData();
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  // Calculate progress for meter managers (only metered tasks)
  const calculateMeterManagerProgress = (entries) => {
    // console.log('🔧 Calculating meter manager progress:', {
    //   total_entries: entries.length,
    //   isMeterDataOnly: isMeterDataOnly,
    //   user_role: user?.role
    // });
    
    const meteredEntries = entries.filter(entry => entry.meter_id !== null);
    const totalMeteredTasks = meteredEntries.length;
    
    // console.log('📊 Metered entries found:', {
    //   metered_count: totalMeteredTasks,
    //   total_points_should_be: totalMeteredTasks * 2,
    //   metered_entries: meteredEntries.map(e => ({
    //     name: e.name,
    //     meter_id: e.meter_id,
    //     has_value: e.value !== null && e.value !== '',
    //     has_evidence: !!e.evidence_file
    //   }))
    // });
    
    if (totalMeteredTasks === 0) {
      return {
        data_progress: 0,
        evidence_progress: 0,
        overall_progress: 0,
        completed_points: 0,
        total_points: 0,
        data_complete: 0,
        evidence_complete: 0
      };
    }

    const dataCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
    const evidenceCompleted = meteredEntries.filter(entry => entry.evidence_file).length;
    
    const dataProgress = (dataCompleted / totalMeteredTasks) * 100;
    const evidenceProgress = (evidenceCompleted / totalMeteredTasks) * 100;
    const overallProgress = ((dataCompleted + evidenceCompleted) / (totalMeteredTasks * 2)) * 100;
    
    const result = {
      data_progress: dataProgress,
      evidence_progress: evidenceProgress,
      overall_progress: overallProgress,
      completed_points: dataCompleted + evidenceCompleted,
      total_points: totalMeteredTasks * 2,
      data_complete: dataCompleted,
      evidence_complete: evidenceCompleted
    };
    
    // console.log('✅ Meter manager progress calculated:', result);
    return result;
  };


  // Group data function
  const groupData = (entries) => {
    if (groupBy === 'Category') {
      return entries.reduce((groups, entry) => {
        const category = entry.category || 'Other';
        if (!groups[category]) groups[category] = [];
        groups[category].push(entry);
        return groups;
      }, {});
    } else if (groupBy === 'Frequency') {
      return entries.reduce((groups, entry) => {
        const frequency = entry.frequency || 'Unknown';
        if (!groups[frequency]) groups[frequency] = [];
        groups[frequency].push(entry);
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

  const refreshProgressData = async () => {
    try {
      const annualProgress = await fetchProgress(selectedYear);
      const monthlyProgress = await fetchProgress(selectedYear, selectedMonth);
      
      // For meter managers, calculate progress based only on metered tasks
      let finalAnnualProgress = {
        data_progress: annualProgress.data_progress || 0,
        evidence_progress: annualProgress.evidence_progress || 0,
        overall_progress: annualProgress.overall_progress || 0,
        total_points: annualProgress.total_points || 0,
        completed_points: annualProgress.completed_points || 0,
        data_complete: annualProgress.data_complete || 0,
        evidence_complete: annualProgress.evidence_complete || 0
      };
      
      let finalMonthlyProgress = {
        data_progress: monthlyProgress.data_progress || 0,
        evidence_progress: monthlyProgress.evidence_progress || 0,
        overall_progress: monthlyProgress.overall_progress || 0,
        items_remaining: monthlyProgress.items_remaining || 0,
        completed_points: monthlyProgress.completed_points || 0,
        total_points: monthlyProgress.total_points || 0
      };
      
      if (isMeterDataOnly && filteredEntries.length > 0) {
        // Calculate meter-specific progress from current entries
        const meterProgress = calculateMeterManagerProgress(filteredEntries);
        
        finalAnnualProgress = {
          ...finalAnnualProgress,
          ...meterProgress
        };
        
        finalMonthlyProgress = {
          ...finalMonthlyProgress,
          ...meterProgress,
          items_remaining: Math.max(0, meterProgress.total_points - meterProgress.completed_points)
        };
        
        // console.log('🔧 Meter Manager Progress Refresh:', {
        //   entries_count: filteredEntries.length,
        //   metered_count: filteredEntries.filter(e => e.meter_id !== null).length,
        //   progress: meterProgress
        // });
      }
      
      setProgressData({
        annual: finalAnnualProgress,
        monthly: finalMonthlyProgress
      });

      // Update month statuses when progress changes
      const availableMonths = await fetchAvailableMonths(selectedYear);
      const currentDate = new Date();
      const monthsData = generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, selectedMonth);
      setMonths(monthsData);
    } catch (error) {
      console.error('Error refreshing progress data:', error);
    }
  };

  const handleSaveEntry = async (entryId) => {
    const value = entryValues[entryId];
    const file = entryFiles[entryId];
    
    if (!value && !file) {
      alert('Please enter a value or upload a file before saving.');
      return;
    }

    setSavingEntries(prev => ({ ...prev, [entryId]: true }));
    
    try {
      const success = await saveDataEntry(entryId, value, file);
      if (success) {
        // Update the entry status and value
        setDataEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { 
                  ...entry, 
                  status: (value && file) ? 'complete' : 'partial',
                  value: value || entry.value 
                } 
              : entry
          )
        );
        
        // Clear the temporary values
        setEntryValues(prev => {
          const newValues = { ...prev };
          delete newValues[entryId];
          return newValues;
        });
        setEntryFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[entryId];
          return newFiles;
        });

        // Refresh progress data
        await refreshProgressData();
        
        alert('Data saved successfully!');
      } else {
        alert('Failed to save data. Please try again.');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setSavingEntries(prev => ({ ...prev, [entryId]: false }));
    }
  };

  const handleMonthSelect = async (monthId) => {
    if (monthId !== selectedMonth) {
      setLoading(true);
      console.log(`📅 Month selection: Switching from ${selectedMonth} to ${monthId}`);
      
      try {
        // Update months with new selected month
        const availableMonths = await fetchAvailableMonths(selectedYear);
        const currentDate = new Date();
        const monthsData = generateMonthsData(availableMonths, selectedYear, currentDate.getMonth() + 1, monthId);
        setMonths(monthsData);

        // Reload data entries for new month
        const entries = await fetchDataEntries(selectedYear, monthId);

        let transformedEntries = [];

        // Process entries data
        transformedEntries = entries.map(entry => ({
          id: entry.submission.id,
          name: entry.element_name,
          meter: entry.meter ? `${entry.meter.name} (${entry.meter.type})` : 'N/A',
          meter_id: entry.meter ? entry.meter.id : null,
          meter_type: entry.meter ? entry.meter.type : null,
          meter_location: entry.meter ? entry.meter.location : null,
          frequency: entry.cadence,
          value: entry.submission.value || '',
          unit: entry.element_unit || '',
          status: entry.submission.status || 'missing',
          category: entry.type,
          description: entry.element_description || '',
          evidence_file: entry.submission.evidence_file || null,
          assignedTo: entry.submission.assigned_to ?
            `${entry.submission.assigned_to.first_name || ''} ${entry.submission.assigned_to.last_name || ''}`.trim() || entry.submission.assigned_to.username || entry.submission.assigned_to.email
            : null,
          assignedUserId: entry.submission.assigned_to ? entry.submission.assigned_to.id : null,
          assignedAt: entry.submission.assigned_at || null,
          element_category: entry.element_category || 'Environmental',
          element_id: entry.element_id
        }));

        setDataEntries(transformedEntries);

        // Update monthly progress
        const monthlyProgress = await fetchProgress(selectedYear, monthId);
        setProgressData(prev => ({
          ...prev,
          monthly: { 
            data_progress: monthlyProgress.data_progress || 0,
            evidence_progress: monthlyProgress.evidence_progress || 0,
            overall_progress: monthlyProgress.overall_progress || 0,
            items_remaining: monthlyProgress.items_remaining || 0,
            completed_points: monthlyProgress.completed_points || 0,
            total_points: monthlyProgress.total_points || 0
          }
        }));
        
        // Update selectedMonth only after all data is loaded to prevent race conditions
        setSelectedMonth(monthId);
        console.log(`✅ Month selection complete: Now showing data for month ${monthId}`);
      } catch (error) {
        console.error('Error loading month data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  // Check if user has permission to access data collection (moved after hooks)
  const canAccessDataCollection = () => {
    if (!user) return false;
    // Module 5 (Data Collection): CORRECTED
    // ✅ Super User, Admin: Full access + approval rights
    // ⚠️ Site Manager: Review + limited approval
    // ⚠️ Uploader: Edit assigned tasks only
    // 👁️ Viewer: View only
    // ⚠️ Meter Manager: Limited access to view meter-related data only
    return ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'].includes(user.role);
  };

  // If no permission, show permission denied message
  if (!canAccessDataCollection()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access data collection.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based functionality controls for Data Collection - CORRECTED
  // Task Assignment Permissions (same as List.js):
  const canAssignToAnyone = ['super_user'].includes(user?.role); // System-wide assignment
  const canAssignInCompany = ['admin'].includes(user?.role); // Company-wide, all sites
  const canAssignToUploadersAtOwnSites = ['site_manager'].includes(user?.role); // Limited to own sites, Uploaders only
  const cannotAssignTasks = ['uploader', 'viewer', 'meter_manager'].includes(user?.role); // No assignment rights

  // Function to fetch available users for assignment based on role permissions
  const fetchAvailableUsers = async () => {
    if (!companyId || !user) return;
    
    setLoadingUsers(true);
    try {
      // Use the standard users endpoint - backend handles permissions automatically
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/users/`);
      
      if (response.ok) {
        const users = await response.json();
        
        // Filter users based on assignment permissions and role hierarchy
        let filteredUsers = users.filter(u => u.role !== 'viewer'); // Viewers can't be assigned tasks
        
        // Apply role hierarchy - users cannot assign to higher or equal level roles
        if (canAssignToAnyone) {
          // Super User: Can assign to ALL roles including other Super Users (but not Viewers)
          filteredUsers = filteredUsers.filter(u =>
            ['super_user', 'admin', 'site_manager', 'uploader', 'meter_manager'].includes(u.role)
          );
        } else if (canAssignInCompany) {
          // Admin: Can assign to most roles (but not Super User or other Admins)
          filteredUsers = filteredUsers.filter(u =>
            ['site_manager', 'uploader', 'meter_manager'].includes(u.role)
          );
        } else if (canAssignToUploadersAtOwnSites) {
          // Site Manager: Can assign to Uploaders and Meter Managers
          filteredUsers = filteredUsers.filter(u =>
            ['uploader', 'meter_manager'].includes(u.role)
          );
        } else {
          // For any other case (including users who normally can't assign),
          // show all assignable users to avoid empty lists
          console.log('⚠️ Data.js - Showing all assignable users for role:', user?.role);
          filteredUsers = filteredUsers.filter(u =>
            ['super_user', 'admin', 'site_manager', 'uploader', 'meter_manager'].includes(u.role)
          );
        }

        console.log('🔍 Data.js - User assignment filtering:', {
          currentUser: user?.role,
          canAssignToAnyone,
          canAssignInCompany,
          canAssignToUploadersAtOwnSites,
          cannotAssignTasks,
          allUsers: users.length,
          filteredUsers: filteredUsers.length,
          users: filteredUsers.map(u => ({ id: u.id, role: u.role, name: u.username }))
        });
        setAvailableUsers(filteredUsers);
      } else {
        console.error('Failed to fetch available users, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch assignments for filtering (used by meter managers and uploaders)
  const fetchAssignments = async () => {
    if (!companyId) return;

    try {
      let url = `${API_BASE_URL}/api/element-assignments/get_assignments/?company_id=${companyId}`;

      const response = await makeAuthenticatedRequest(url);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
        console.log('🔍 Data.js - Fetched assignments:', data);
      } else {
        console.error('Failed to fetch assignments, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Handle opening assignment modal
  const handleOpenAssignModal = (task) => {
    setSelectedTaskForAssignment(task);
    setShowAssignModal(true);
    fetchAvailableUsers();
  };

  // Handle element assignment - assigns element and all its related tasks
  const handleAssignElement = async (userId) => {
    try {
      const checklistItemId = selectedTaskForAssignment.checklist_item_id;

      if (!checklistItemId) {
        console.error('No checklist item ID found for assignment');
        return;
      }

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/element-assignments/assign_element/`, {
        method: 'POST',
        body: JSON.stringify({
          checklist_item_id: checklistItemId,
          user_id: userId
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Element assignment response:', responseData);

        setShowAssignModal(false);
        setSelectedTaskForAssignment(null);
        console.log('Element assigned successfully - all related tasks will be assigned');

        // Refresh data to get updated assignment info from server
        refreshDataEntries();
      } else {
        console.error('Failed to assign element, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error assigning element:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading data entries...</span>
      </div>
    );
  }

  return (
     <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Month Switch Loading Indicator - Subtle */}
      {monthSwitchLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-700 text-sm">Loading month data...</span>
        </div>
      )}

      {/* Reporting Period Selector */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Reporting Period</h3>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select 
              className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-32"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {months.map((month) => (
                <button 
                  key={month.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${getMonthButtonStyle(month)}`}
                  onClick={() => month.status !== 'disabled' && handleMonthSelect(month.id)}
                  disabled={month.status === 'disabled'}
                >
                  {month.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Annual Progress ({selectedYear})</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Data Entry Progress</span>
                <span className="text-sm font-bold text-blue-600">
                  {isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const actualDataCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      // Use backend API values for annual progress
                      const annualDataProgress = progressData.annual?.data_progress || 0;
                      return Math.round(annualDataProgress);
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      // Use backend API values for annual progress
                      const annualDataProgress = progressData.annual?.data_progress || 0;
                      return Math.round(annualDataProgress);
                    })()
                  )}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ 
                  width: `${isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const actualDataCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      // Use backend API values for annual progress
                      return progressData.annual?.data_progress || 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      // Use backend API values for annual progress
                      return progressData.annual?.data_progress || 0;
                    })()
                  )}%` 
                }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Evidence Upload</span>
                <span className="text-sm font-bold text-green-600">
                  {isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const actualEvidenceCompleted = meteredEntries.filter(entry => entry.evidence_file).length;
                      const monthlyTotal = meteredEntries.length;
                      const annualTotal = progressData.annual?.total_points || 0;
                      const annualEvidenceProgress = annualTotal > 0 ? (actualEvidenceCompleted / annualTotal) * 100 : 0;
                      return Math.round(annualEvidenceProgress);
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                      const monthlyTotal = userVisibleEntries.length;
                      const annualTotal = progressData.annual?.total_points || 0;
                      // Use backend API values for annual evidence progress
                      return Math.round(progressData.annual?.evidence_progress || 0);
                    })()
                  )}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ 
                  width: `${isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const actualEvidenceCompleted = meteredEntries.filter(entry => entry.evidence_file).length;
                      const monthlyTotal = meteredEntries.length;
                      const annualTotal = progressData.annual?.total_points || 0;
                      return annualTotal > 0 ? (actualEvidenceCompleted / annualTotal) * 100 : 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                      const monthlyTotal = userVisibleEntries.length;
                      const annualTotal = progressData.annual?.total_points || 0;
                      // Use backend API values for annual evidence progress
                      return progressData.annual?.evidence_progress || 0;
                    })()
                  )}%` 
                }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isMeterDataOnly ? (
                  // For meter managers: show cumulative completed across all months, with annual total
                  (() => {
                    // Use backend API values for both completed and total (cumulative across all months)
                    const actualCompleted = (progressData.annual?.data_complete || 0) + (progressData.annual?.evidence_complete || 0);
                    const annualTotal = progressData.annual?.total_points || 0;
                    return `${actualCompleted} / ${annualTotal}`;
                  })()
                ) : (
                  // For other users: show cumulative completed across all months, with annual total
                  (() => {
                    // Use backend API values for both completed and total (cumulative across all months)
                    const totalCompleted = (progressData.annual?.data_complete || 0) + (progressData.annual?.evidence_complete || 0);
                    const annualTotal = progressData.annual?.total_points || 0;
                    return `${totalCompleted} / ${annualTotal}`;
                  })()
                )}
              </div>
              <div className="text-sm text-gray-500">
                Tasks Completed (Data + Evidence)
                {isMeterDataOnly && <span className="text-purple-600 ml-2">📊 Metered Only</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {isMeterDataOnly ? (
                  (() => {
                    const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                    const actualDataComplete = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                    const actualEvidenceComplete = meteredEntries.filter(entry => entry.evidence_file).length;
                    return `Data Entries: ${actualDataComplete} | Evidence Files: ${actualEvidenceComplete}`;
                  })()
                ) : (
                  `Data Entries: ${progressData.annual.data_complete || 0} | Evidence Files: ${progressData.annual.evidence_complete || 0}`
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {months.find(m => m.id === selectedMonth)?.name} {selectedYear} Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Data Entry Progress</span>
                <span className="text-sm font-bold text-orange-600">
                  {isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const dataCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      return meteredEntries.length > 0 ? Math.round((dataCompleted / meteredEntries.length) * 100) : 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      return userVisibleEntries.length > 0 ? Math.round((dataCompleted / userVisibleEntries.length) * 100) : 0;
                    })()
                  )}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-orange-500 h-3 rounded-full" style={{ 
                  width: `${Math.min(100, Math.max(0, isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const dataCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      return meteredEntries.length > 0 ? (dataCompleted / meteredEntries.length) * 100 : 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                      return userVisibleEntries.length > 0 ? (dataCompleted / userVisibleEntries.length) * 100 : 0;
                    })()
                  )))}%` 
                }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Evidence Upload</span>
                <span className="text-sm font-bold text-purple-600">
                  {isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const evidenceCompleted = meteredEntries.filter(entry => entry.evidence_file).length;
                      return meteredEntries.length > 0 ? Math.round((evidenceCompleted / meteredEntries.length) * 100) : 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                      return userVisibleEntries.length > 0 ? Math.round((evidenceCompleted / userVisibleEntries.length) * 100) : 0;
                    })()
                  )}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-purple-500 h-3 rounded-full" style={{ 
                  width: `${Math.min(100, Math.max(0, isMeterDataOnly ? (
                    (() => {
                      const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                      const evidenceCompleted = meteredEntries.filter(entry => entry.evidence_file).length;
                      return meteredEntries.length > 0 ? (evidenceCompleted / meteredEntries.length) * 100 : 0;
                    })()
                  ) : (
                    (() => {
                      const userVisibleEntries = filteredEntries;
                      const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                      return userVisibleEntries.length > 0 ? (evidenceCompleted / userVisibleEntries.length) * 100 : 0;
                    })()
                  )))}%` 
                }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isMeterDataOnly ? (
                  // For meter managers: only count metered tasks
                  (() => {
                    const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                    const meteredCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length + 
                                            meteredEntries.filter(entry => entry.evidence_file).length;
                    // Use backend API values for monthly total
                    const monthlyTotal = progressData.monthly?.total_points || 0;
                    return `${meteredCompleted} / ${monthlyTotal}`;
                  })()
                ) : (
                  // For other users: show filtered tasks
                  (() => {
                    const userVisibleEntries = filteredEntries;
                    const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                    const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                    const totalCompleted = dataCompleted + evidenceCompleted;
                    // Use backend API values for monthly total
                    const monthlyTotal = progressData.monthly?.total_points || 0;
                    return `${totalCompleted} / ${monthlyTotal}`;
                  })()
                )}
              </div>
              <div className="text-sm text-gray-500">
                Tasks Completed This Month
                {isMeterDataOnly && <span className="text-purple-600 ml-2">📊 Metered Only</span>}
              </div>
              <div className="text-xs text-red-500 mt-1">
                {isMeterDataOnly ? (
                  (() => {
                    const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                    const meteredCompleted = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length + 
                                            meteredEntries.filter(entry => entry.evidence_file).length;
                    // Use backend API values for monthly total
                    const monthlyTotal = progressData.monthly?.total_points || 0;
                    return `${monthlyTotal - meteredCompleted} Tasks Remaining`;
                  })()
                ) : (
                  (() => {
                    const userVisibleEntries = filteredEntries;
                    const dataCompleted = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                    const evidenceCompleted = userVisibleEntries.filter(entry => entry.evidence_file).length;
                    const totalCompleted = dataCompleted + evidenceCompleted;
                    // Use backend API values for monthly total
                    const monthlyTotal = progressData.monthly?.total_points || 0;
                    const remaining = Math.max(0, monthlyTotal - totalCompleted);
                    return `${remaining} Tasks Remaining`;
                  })()
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {isMeterDataOnly ? (
                  (() => {
                    const meteredEntries = filteredEntries.filter(entry => entry.meter_id !== null);
                    const dataComplete = meteredEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                    const evidenceComplete = meteredEntries.filter(entry => entry.evidence_file).length;
                    return `Data Entries: ${dataComplete} | Evidence Files: ${evidenceComplete}`;
                  })()
                ) : (
                  (() => {
                    const userVisibleEntries = filteredEntries;
                    const dataComplete = userVisibleEntries.filter(entry => entry.value !== null && entry.value !== '').length;
                    const evidenceComplete = userVisibleEntries.filter(entry => entry.evidence_file).length;
                    return `Data Entries: ${dataComplete} | Evidence Files: ${evidenceComplete}`;
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Entry Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center md:space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">Data Entry Interface</h3>
              <div className="flex flex-wrap gap-2">
                {isViewOnly && (
                  <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                    <i className="fas fa-eye mr-1"></i>View Only
                  </div>
                )}
                {canEditAssignedTasks && (
                  <div className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium">
                    <i className="fas fa-tasks mr-1"></i>Assigned Tasks Only
                  </div>
                )}
                {canReviewAndLimitedApproval && (
                  <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">
                    <i className="fas fa-clipboard-check mr-1"></i>Review Mode
                  </div>
                )}
                {isMeterDataOnly && (
                  <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                    <i className="fas fa-gauge mr-1"></i>Meter Data Only
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="bg-orange-100 text-orange-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-200"
                onClick={refreshDataEntries}
                title="Refresh data to check for new meters or tasks"
              >
                <i className="fas fa-sync-alt mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </button>
              {(canFullAccess || canEditAssignedTasks) && (
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => handleMultipleFileUpload(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="multiple-file-upload"
                  />
                  <button
                    className={`bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isUploading}
                  >
                    <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-1 sm:mr-2`}></i>
                    <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload Multiple Files'}</span>
                    <span className="sm:hidden">{isUploading ? 'Uploading...' : 'Upload'}</span>
                  </button>
                </div>
              )}
              {(isViewOnly || canReviewAndLimitedApproval || isMeterDataOnly) && (
                <button
                  className="bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200"
                  onClick={() => {/* Handle export functionality */}}
                >
                  <i className="fas fa-download mr-1 sm:mr-2"></i>
                  <span className="hidden sm:inline">Export Data</span>
                  <span className="sm:hidden">Export</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:space-x-4">
            {/* Filter Controls */}
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

            {/* Search Bar */}
            <div className="flex-1 lg:max-w-md">
              <input
                type="text"
                placeholder="Search data elements..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-gauge text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data entries found</h3>
              <p className="text-gray-600 mb-4">
                Data entries are generated based on your configured meters and checklist requirements.
              </p>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => navigate('/meter')}
              >
                <i className="fas fa-cog mr-2"></i>Configure Meters
              </button>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching entries found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search terms or filters to find data entries.
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
                      {entries.map((entry) => (
                        <div key={entry.id} className={`rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${
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
                                    {entry.meter_id && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                        <i className="fas fa-gauge mr-1"></i>
                                        {entry.meter.split(' (')[0]} ({entry.meter_type})
                                      </span>
                                    )}
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                      {entry.frequency}
                                    </span>
                                    {entry.meter_location && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                        {entry.meter_location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Assignment and Status Section */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                {/* Task Assignment Section */}
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
                                  {savingEntries[entry.id] ? (
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
                                        value={entryValues[entry.id] !== undefined ? entryValues[entry.id] : entry.value || ''}
                                        onChange={(e) => handleValueChange(entry.id, e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                        placeholder="0"
                                      />
                                    ) : (
                                      <div className="w-full bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium text-gray-500">
                                        {entryValues[entry.id] !== undefined ? entryValues[entry.id] : entry.value || '0'}
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
                                      onClick={() => handleClearFile(entry.id)}
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
                                        onChange={(e) => handleFileChange(entry.id, e.target.files[0])}
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
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>


      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={() => navigate('/meter')}
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

      {/* Upload Results Modal */}
      {uploadResults && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
              <button 
                onClick={() => setUploadResults(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              {uploadResults.successful.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">
                    ✅ Successfully Uploaded ({uploadResults.successful.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.successful.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                        <div className="font-medium">{item.filename}</div>
                        <div>→ {item.entryName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadResults.unmatched.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">
                    ⚠️ No Match Found ({uploadResults.unmatched.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.unmatched.map((filename, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        {filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadResults.failed.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">
                    ❌ Failed Uploads ({uploadResults.failed.length})
                  </h4>
                  <div className="space-y-1">
                    {uploadResults.failed.map((item, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                        <div className="font-medium">{item.filename}</div>
                        <div>Error: {item.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setUploadResults(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Task Assignment Modal */}
      {showAssignModal && selectedTaskForAssignment && createPortal(
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
              <p className="text-sm text-gray-600 mb-2">{selectedTaskForAssignment.description}</p>
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-md">
                <i className="fas fa-info-circle mr-2"></i>
                Assigning this element will assign ALL related tasks (annual, monthly, metered variants) to the selected user across all time periods.
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>Unit: {selectedTaskForAssignment.unit}</span>
                <span>Frequency: {selectedTaskForAssignment.frequency}</span>
                {selectedTaskForAssignment.meter && (
                  <span>Meter: {selectedTaskForAssignment.meter}</span>
                )}
              </div>
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
                      <div className="flex items-center space-x-2">
                        {availableUser.sites && availableUser.sites.length > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {availableUser.sites.length} site{availableUser.sites.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {canAssignToAnyone && 'System-wide assignment'}
                {canAssignInCompany && 'Company-wide assignment'}
                {canAssignToUploadersAtOwnSites && 'Site-level assignment (Uploaders only)'}
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
        </div>, document.body
      )}

      {/* Filter Modals */}
      {showViewFilterModal && <ViewFilterModal 
        isOpen={showViewFilterModal}
        currentFilter={viewFilter || 'All Items'}
        onApply={(selected) => {
          setViewFilter(selected === 'All Items' ? 'All' : selected);
          setShowViewFilterModal(false);
        }}
        onClose={() => setShowViewFilterModal(false)}
      />}

      {showGroupByModal && <GroupByModal 
        isOpen={showGroupByModal}
        currentFilter={groupBy}
        onApply={(selected) => {
          setGroupBy(selected);
          setShowGroupByModal(false);
        }}
        onClose={() => setShowGroupByModal(false)}
      />}

      {showAssignmentFilterModal && <AssignmentFilterModal 
        isOpen={showAssignmentFilterModal}
        currentFilter={assignmentFilter}
        onApply={(selected) => {
          setAssignmentFilter(selected);
          setShowAssignmentFilterModal(false);
        }}
        onClose={() => setShowAssignmentFilterModal(false)}
      />}
    </div>
  );
};

// Filter Modal Components
const ViewFilterModal = ({ isOpen, currentFilter, onApply, onClose }) => {
  const handleSelect = (option) => {
    onApply(option);
    onClose();
  };

  if (!isOpen) return null;

  const options = [
    { value: 'All Items', label: 'All Items', description: 'Show all data items', icon: 'fa-th', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'Metered', label: 'Metered', description: 'Show metered items only', icon: 'fa-tachometer-alt', color: 'text-green-600', bgColor: 'bg-green-100' },
    { value: 'Non-metered', label: 'Non-metered', description: 'Show non-metered items only', icon: 'fa-file-alt', color: 'text-orange-600', bgColor: 'bg-orange-100' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">View Filter</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-2">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
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
  );
};

const GroupByModal = ({ isOpen, currentFilter, onApply, onClose }) => {
  const handleSelect = (option) => {
    onApply(option);
    onClose();
  };

  if (!isOpen) return null;

  const options = [
    { value: 'Category', label: 'Category', description: 'Group by data categories', icon: 'fa-folder', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { value: 'Frequency', label: 'Frequency', description: 'Group by reporting frequency', icon: 'fa-clock', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'Status', label: 'Status', description: 'Group by completion status', icon: 'fa-check-circle', color: 'text-green-600', bgColor: 'bg-green-100' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Group By</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-2">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
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
  );
};

const AssignmentFilterModal = ({ isOpen, currentFilter, onApply, onClose }) => {
  const handleSelect = (option) => {
    onApply(option);
    onClose();
  };

  if (!isOpen) return null;

  const options = [
    { value: 'all', label: 'All Tasks', description: 'Show all tasks', icon: 'fa-list', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'assigned', label: 'Assigned', description: 'Show assigned tasks only', icon: 'fa-user-check', color: 'text-green-600', bgColor: 'bg-green-100' },
    { value: 'unassigned', label: 'Unassigned', description: 'Show unassigned tasks only', icon: 'fa-user-times', color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100000]">
      <div className="bg-white rounded-lg p-4 sm:p-6 border w-full max-w-sm sm:max-w-md shadow-lg mx-4">
        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Assignment Filter</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-2">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
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
  );
};

export default Data;
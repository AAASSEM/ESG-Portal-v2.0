import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, makeAuthenticatedRequest } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import Layout from './Layout';

const List = () => {
  const navigate = useNavigate();
  const { user, selectedCompany, hasPermission } = useAuth();
  const [answers, setAnswers] = useState({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profilingQuestions, setProfilingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [checklistExists, setChecklistExists] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Assignment states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignments, setAssignments] = useState({ category_assignments: {}, element_assignments: {} });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [backendChecklist, setBackendChecklist] = useState([]);
  
  // Get company ID from auth context
  const companyId = selectedCompany?.id;
  
  // Debug logging
  console.log('List component - selectedCompany:', selectedCompany);
  console.log('List component - companyId:', companyId);
  console.log('List component - user:', user);

  // Modal helper function
  const showModal = (type, title, message) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: 'info',
      title: '',
      message: ''
    });
  };

  // Fetch profiling questions from backend
  const fetchProfilingQuestions = async () => {
      if (!companyId) {
        console.log('No company selected, skipping profiling questions fetch');
        return;
      }
      
      try {
        console.log('Fetching profiling questions for company:', companyId);
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/for_company/?company_id=${companyId}`);
        console.log('Response status:', response.status, 'Response ok:', response.ok);
        
        if (response.ok) {
          const questions = await response.json();
          console.log('Fetched questions from backend:', questions);
          console.log('Questions type:', typeof questions, 'Length:', questions.length);
          
          if (Array.isArray(questions) && questions.length > 0) {
            const transformedQuestions = questions.map(q => ({
              id: q.question_id,
              text: q.text,
              activatesElement: q.activates_element,
              category: 'Basic Operations'
            }));
            console.log('Transformed questions:', transformedQuestions);
            setProfilingQuestions(transformedQuestions);
          } else {
            console.error('Questions array is empty or not an array:', questions);
          }
        } else if (response.status === 403) {
          console.log('Access denied - user does not have permission to access profiling');
          setAccessDenied(true);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch profiling questions. Status:', response.status, 'Error:', errorText);
        }
      } catch (error) {
        console.error('Error fetching profiling questions:', error);
      }
  };

  // Fetch available users for assignment
  const fetchAvailableUsers = async () => {
    if (!companyId) return;
    
    setLoadingUsers(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/available_users/?company_id=${companyId}`
      );
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoadingUsers(false);
  };

  // Fetch existing assignments
  const fetchAssignments = async () => {
    if (!companyId) return;
    
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/get_assignments/?company_id=${companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Handle category assignment
  const handleCategoryAssignment = async (category, userId) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/assign_category/`,
        {
          method: 'POST',
          body: JSON.stringify({
            company_id: companyId,
            category: category,
            user_id: userId
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        showModal('success', 'Success', result.message);
        fetchAssignments(); // Refresh assignments
        setShowUserModal(false);
        setSelectedCategory(null);
      } else {
        const error = await response.json();
        showModal('error', 'Error', error.error || 'Failed to assign category');
      }
    } catch (error) {
      console.error('Error assigning category:', error);
      showModal('error', 'Error', 'Failed to assign category');
    }
  };

  // Handle element assignment
  const handleElementAssignment = async (elementId, userId) => {
    try {
      console.log('Assigning element - elementId:', elementId, 'userId:', userId);
      console.log('Selected element object:', selectedElement);
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/element-assignments/assign_element/`,
        {
          method: 'POST',
          body: JSON.stringify({
            checklist_item_id: elementId,
            user_id: userId
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        showModal('success', 'Success', result.message);
        fetchAssignments(); // Refresh assignments
        setShowUserModal(false);
        setSelectedElement(null);
      } else {
        const error = await response.json();
        showModal('error', 'Error', error.error || 'Failed to assign element');
      }
    } catch (error) {
      console.error('Error assigning element:', error);
      showModal('error', 'Error', 'Failed to assign element');
    }
  };

  // Get assigned user for an element (considering hierarchy)
  const getAssignedUser = (elementId, category) => {
    // Check element-level assignment first (overrides category)
    if (assignments.element_assignments && assignments.element_assignments[elementId]) {
      return assignments.element_assignments[elementId];
    }
    // Fall back to category-level assignment
    if (assignments.category_assignments && assignments.category_assignments[category]) {
      return assignments.category_assignments[category];
    }
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Reset state to ensure clean load (but keep checklistExists to prevent flickering)
      setAnswers({});
      setShowChecklist(false);
      setProfilingQuestions([]);
      // Don't reset checklistExists here to prevent flickering
      
      // Fetch all data in parallel for faster loading
      await Promise.all([
        fetchProfilingQuestions(),
        fetchExistingAnswers(),
        checkChecklistExists(),
        checkWizardCompletion()
      ]);
      setLoading(false);
    };
    
    if (companyId) {
      fetchData();
    }
  }, [companyId]); // Re-run when companyId changes

  // Fetch assignments when checklist is shown
  useEffect(() => {
    if (showChecklist && companyId) {
      fetchAssignments();
    }
  }, [showChecklist, companyId]);

  // Fetch existing answers from database
  const fetchExistingAnswers = async () => {
    if (!companyId) return;
    
    try {
      console.log('Fetching existing profile answers for company:', companyId);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/profile_answers/`);
      
      if (response.ok) {
        const answersData = await response.json();
        console.log('Loaded profile answers from API:', answersData);
        
        // Convert API format to component format
        const answersMap = {};
        answersData.forEach(item => {
          answersMap[item.question] = item.answer;
        });
        
        console.log('Setting answers state to:', answersMap);
        setAnswers(answersMap);
        
        // If we have answers, we should show the checklist
        if (Object.keys(answersMap).length > 0) {
          console.log('Answers found, checking if should show checklist');
        }
      } else {
        console.log('No existing answers found or API error, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching existing answers:', error);
    }
  };

  // Check if checklist exists and fetch it
  const checkChecklistExists = async () => {
    if (!companyId) return false;
    
    try {
      console.log('ðŸ” Checking if checklist exists for company:', companyId);
      // Add timestamp to force cache bypass
      const timestamp = new Date().getTime();
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/checklist/?company_id=${companyId}&t=${timestamp}`);
      if (response.ok) {
        const checklistData = await response.json();
        // Handle both paginated {results: []} and direct array responses
        const checklistItems = checklistData.results || checklistData;
        const exists = Array.isArray(checklistItems) && checklistItems.length > 0;
        console.log('ðŸ” Checklist data:', {
          dataType: typeof checklistData,
          isArray: Array.isArray(checklistData),
          itemsCount: checklistItems ? checklistItems.length : 0,
          exists: exists
        });
        console.log('âœ… Checklist exists check result:', exists);
        setChecklistExists(exists);

        // Store the backend checklist with proper IDs
        if (exists) {
          const transformedChecklist = checklistItems.map(item => ({
            id: item.id,  // This is the actual database ID we need for assignments
            name: item.element_name,
            description: item.element_description,
            unit: item.element_unit,
            cadence: item.cadence,
            frameworks: item.frameworks_list,
            category: item.category || (item.is_metered ? 'Environmental' : 'Social'),
            isMetered: item.is_metered
          }));
          setBackendChecklist(transformedChecklist);
          console.log('âœ… Loaded backend checklist with', transformedChecklist.length, 'items:', transformedChecklist);
        }
        
        return exists;
      } else {
        console.log('âŒ Failed to check checklist:', response.status);
        setChecklistExists(false);
      }
    } catch (error) {
      console.error('âŒ Error checking checklist existence:', error);
      setChecklistExists(false);
    }
    return false;
  };

  // Check if wizard has been completed
  const checkWizardCompletion = async () => {
    if (!companyId) return;
    
    try {
      // Check if company has answered all questions (wizard completed)
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/profile_answers/`);
      if (response.ok) {
        const answersData = await response.json();
        const questionsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/for_company/?company_id=${companyId}`);
        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          
          // If all questions are answered, check if checklist exists
          if (answersData.length > 0 && answersData.length >= questionsData.length) {
            console.log('Profiling wizard completed');
            const checklistExists = await checkChecklistExists();
            if (checklistExists) {
              console.log('Checklist exists, showing checklist view');
              setShowChecklist(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking wizard completion:', error);
    }
  };

  // Must-have data elements (always required)
  const mustHaveElements = [
    { id: 'electricity', name: 'Electricity Consumption', description: 'Total electricity from local providers', unit: 'kWh', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Electricity' },
    { id: 'water', name: 'Water Consumption', description: 'Total water usage', unit: 'mÂ³', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Water' },
    { id: 'waste_landfill', name: 'Waste to Landfill', description: 'Non-recycled waste disposal', unit: 'kg', cadence: 'Monthly', frameworks: ['DST', 'ESG', 'Green Key'], category: 'Environmental', is_metered: true, meter_type: 'Waste' },
    { id: 'sustainability_policy', name: 'Sustainability Policy', description: 'Written sustainability policy', unit: 'Document', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'sustainability_personnel', name: 'Sustainability Personnel', description: 'Certified sustainability staff', unit: 'Count', cadence: 'Annually', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    { id: 'employee_training', name: 'Employee Training Hours', description: 'Sustainability training per employee', unit: 'Hours', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'guest_education', name: 'Guest Education', description: 'Guest sustainability initiatives', unit: 'Count', cadence: 'Quarterly', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    { id: 'community_initiatives', name: 'Community Initiatives', description: 'Local community programs', unit: 'Count, AED', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Social', is_metered: false },
    { id: 'government_compliance', name: 'Government Compliance', description: 'Energy regulation compliance', unit: 'Status', cadence: 'Annually', frameworks: ['DST', 'ESG'], category: 'Governance', is_metered: false },
    { id: 'action_plan', name: 'Action Plan', description: 'Annual sustainability objectives', unit: 'Document', cadence: 'Annually', frameworks: ['DST', 'Green Key', 'ESG'], category: 'Governance', is_metered: false },
    { id: 'carbon_footprint', name: 'Carbon Footprint', description: 'Total GHG emissions', unit: 'tonnes CO2e', cadence: 'Annually', frameworks: ['ESG', 'DST'], category: 'Environmental', is_metered: false },
    { id: 'health_safety', name: 'Health & Safety Incidents', description: 'Workplace incidents', unit: 'Count', cadence: 'Monthly', frameworks: ['ESG'], category: 'Social', is_metered: false },
    { id: 'anti_corruption', name: 'Anti-corruption Policies', description: 'Anti-corruption measures', unit: 'Status', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false },
    { id: 'risk_management', name: 'Risk Management', description: 'ESG risk framework', unit: 'Status', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false }
  ];

  // Conditional data elements (activated by "Yes" answers)
  const conditionalElements = {
    'generator_fuel': { id: 'generator_fuel', name: 'Generator Fuel', description: 'Fuel for backup generators', unit: 'liters', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Generator' },
    'vehicle_fuel': { id: 'vehicle_fuel', name: 'Vehicle Fuel', description: 'Company vehicle fuel', unit: 'liters', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Vehicle' },
    'lpg_consumption': { id: 'lpg_consumption', name: 'LPG Usage', description: 'Liquid petroleum gas consumption', unit: 'kg', cadence: 'Monthly', frameworks: ['DST', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'LPG' },
    'green_events': { id: 'green_events', name: 'Green Events', description: 'Sustainable event services', unit: 'Count', cadence: 'Quarterly', frameworks: ['DST', 'Green Key'], category: 'Social', is_metered: false },
    'food_sourcing': { id: 'food_sourcing', name: 'Food Sourcing', description: 'Local/organic food purchases', unit: '%', cadence: 'Quarterly', frameworks: ['Green Key', 'ESG'], category: 'Environmental', is_metered: false },
    'green_spaces': { id: 'green_spaces', name: 'Green Spaces', description: 'Sustainable landscaping', unit: 'mÂ²', cadence: 'Annually', frameworks: ['Green Key'], category: 'Environmental', is_metered: false },
    'renewable_energy_usage': { id: 'renewable_energy_usage', name: 'Renewable Energy', description: 'Energy from renewable sources', unit: '%', cadence: 'Quarterly', frameworks: ['Green Key', 'ESG'], category: 'Environmental', is_metered: true, meter_type: 'Renewable Energy' },
    'environmental_management_system': { id: 'environmental_management_system', name: 'Environmental Management System', description: 'EMS certification', unit: 'Status', cadence: 'Annually', frameworks: ['Green Key', 'ESG'], category: 'Governance', is_metered: false },
    'board_composition': { id: 'board_composition', name: 'Board Composition', description: 'Board diversity metrics', unit: '%', cadence: 'Annually', frameworks: ['ESG'], category: 'Governance', is_metered: false }
  };

  const handleAnswerChange = async (questionId, answer) => {
    // Check if user has edit permission
    if (!hasPermission('frameworkSelection', 'update')) {
      showModal('warning', 'Permission Denied', 'You do not have permission to edit profiling answers. This is view-only mode.');
      return;
    }

    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(newAnswers);
    
    // Save to database
    try {
      console.log('Saving profiling answer to database:', questionId, answer);
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/save_profile_answer/`, {
        method: 'POST',
        body: JSON.stringify({
          question: questionId,
          answer: answer
        })
      });

      if (response.ok) {
        const savedAnswer = await response.json();
        console.log('Answer saved successfully:', savedAnswer);
      } else {
        console.error('Failed to save answer. Status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // If it's a 403 error, show permission denied message
        if (response.status === 403) {
          showModal('error', 'Permission Denied', 'You can only view profiling answers.');
        }
      }
    } catch (error) {
      console.error('Error saving answer to database:', error);
    }
  };

  const handleAnswerAll = async (answer) => {
    // Check if user has edit permission
    if (!hasPermission('frameworkSelection', 'update')) {
      showModal('warning', 'Permission Denied', 'You do not have permission to edit profiling answers. This is view-only mode.');
      return;
    }

    const allAnswers = {};
    profilingQuestions.forEach(question => {
      allAnswers[question.id] = answer;
    });
    setAnswers(allAnswers);
    
    // Save all answers to database
    try {
      console.log('Saving all profiling answers to database:', answer);
      const promises = profilingQuestions.map(question => 
        makeAuthenticatedRequest(`${API_BASE_URL}/api/companies/${companyId}/save_profile_answer/`, {
          method: 'POST',
          body: JSON.stringify({
            question: question.id,
            answer: answer
          })
        })
      );
      
      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);
      
      if (allSuccessful) {
        console.log('All answers saved successfully');
      } else {
        console.error('Some answers failed to save');
        // Check for 403 errors
        const hasForbidden = responses.some(r => r.status === 403);
        if (hasForbidden) {
          showModal('error', 'Permission Denied', 'You can only view profiling answers.');
        }
      }
    } catch (error) {
      console.error('Error saving all answers to database:', error);
    }
  };

  const allQuestionsAnswered = profilingQuestions.length > 0 && profilingQuestions.every(question => 
    answers.hasOwnProperty(question.id)
  );
  
  // Debug logging
  console.log('ðŸ” Component render state:', {
    companyId,
    answersCount: Object.keys(answers).length,
    questionsCount: profilingQuestions.length,
    allQuestionsAnswered: allQuestionsAnswered,
    showChecklist: showChecklist,
    checklistExists: checklistExists,
    hasEditPermission: hasPermission('frameworkSelection', 'update'),
    userRole: user?.role,
    loading: loading
  });


  // API function to save answers and generate checklist
  const saveAnswersAndGenerateChecklist = async () => {
    if (!allQuestionsAnswered) return false;
    
    setIsGenerating(true);
    try {
      // Transform answers to backend format
      const backendAnswers = profilingQuestions.map(question => ({
        question_id: question.id,
        answer: answers[question.id] === true
      }));
      
      console.log('Sending answers to backend:', backendAnswers);

      // Save answers to backend
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/profiling-questions/save_answers/`, {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          answers: backendAnswers
        }),
      });

      if (response.ok) {
        // Fetch the generated checklist
        const checklistResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/checklist/?company_id=${companyId}`);
        if (checklistResponse.ok) {
          const checklistData = await checklistResponse.json();
          console.log('ðŸ” API Response type:', typeof checklistData, 'Is Array:', Array.isArray(checklistData));
          console.log('ðŸ” API Response keys:', checklistData.results ? 'Has results property' : 'Direct array/object');
          console.log('ðŸ” API Response length/count:', Array.isArray(checklistData) ? checklistData.length : Object.keys(checklistData).length);

          // Transform backend checklist to frontend format for display
          // Handle both paginated {results: []} and direct array responses
          const checklistItems = checklistData.results || checklistData;
          console.log('ðŸ” ChecklistItems type:', typeof checklistItems, 'Is Array:', Array.isArray(checklistItems));

          if (!Array.isArray(checklistItems)) {
            console.error('âŒ ChecklistItems is not an array:', checklistItems);
            throw new Error('Invalid checklist data format');
          }

          const transformedChecklist = checklistItems.map(item => ({
            id: item.id,  // This is the actual database ID we need for assignments
            name: item.element_name,
            description: item.element_description,
            unit: item.element_unit,
            cadence: item.cadence,
            frameworks: item.frameworks_list,
            category: item.category || (item.is_metered ? 'Environmental' : 'Social'),
            isMetered: item.is_metered
          }));
          
          // Store in state for use in assignments
          setBackendChecklist(transformedChecklist);
          
          // Checklist is now stored in database, no need for localStorage
          return transformedChecklist;
        }
      }
      
      throw new Error('Failed to save answers or generate checklist');
    } catch (error) {
      console.error('Error saving answers and generating checklist:', error);
      showModal('error', 'Generation Failed', 'Failed to generate checklist. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateChecklist = () => {
    if (!allQuestionsAnswered) return [];
    
    // Start with must-have elements
    const checklist = [...mustHaveElements];
    
    // Add conditional elements based on "Yes" answers
    profilingQuestions.forEach(question => {
      if (answers[question.id] === true && conditionalElements[question.activatesElement]) {
        checklist.push(conditionalElements[question.activatesElement]);
      }
    });
    
    // Sort by category
    return checklist.sort((a, b) => a.category.localeCompare(b.category));
  };

  // IMPORTANT: Use backend checklist if available for proper IDs
  // Only use generateChecklist() for display when backend data isn't loaded yet
  const localChecklist = generateChecklist() || [];
  const finalChecklist = backendChecklist.length > 0 ? backendChecklist : localChecklist;
  const canAssign = backendChecklist.length > 0; // Only allow assignment when backend data is loaded
  
  // Debug logging
  console.log('ðŸ“Š Checklist Status:', {
    backendChecklistCount: backendChecklist.length,
    localChecklistCount: localChecklist.length,
    finalChecklistCount: finalChecklist.length,
    usingBackend: backendChecklist.length > 0
  });
  
  const getCategoryStats = () => {
    if (!finalChecklist) return { environmental: 0, social: 0, governance: 0 };
    
    return finalChecklist.reduce((stats, item) => {
      const category = item.category.toLowerCase();
      stats[category] = (stats[category] || 0) + 1;
      return stats;
    }, { environmental: 0, social: 0, governance: 0 });
  };

  const categoryStats = getCategoryStats();

  const handleContinue = () => {
    // Wizard completion is now tracked by database (all questions answered)
    console.log('Profiling wizard completed, continuing to meters');
    navigate('/meter');
  };

  if (showChecklist && allQuestionsAnswered) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        {/* Checklist Header */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-600"></i>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Personalized Data Checklist</h2>
              <p className="text-sm sm:text-base text-gray-600">Your customized data requirements based on your responses</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{finalChecklist.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Elements</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{categoryStats.environmental}</div>
              <div className="text-xs sm:text-sm text-gray-600">Environmental</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{categoryStats.social}</div>
              <div className="text-xs sm:text-sm text-gray-600">Social</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{categoryStats.governance}</div>
              <div className="text-xs sm:text-sm text-gray-600">Governance</div>
            </div>
          </div>
        </div>

        {/* Checklist Items Grouped by Category */}
        {['Environmental', 'Social', 'Governance'].map(category => {
          const categoryItems = finalChecklist.filter(item => item.category === category);
          const categoryAssignment = assignments.category_assignments?.[category];
          
          if (categoryItems.length === 0) return null;
          
          return (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
              <div className={`p-4 sm:p-6 border-b border-gray-200 ${
                category === 'Environmental' ? 'bg-green-50' :
                category === 'Social' ? 'bg-purple-50' :
                'bg-orange-50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{category} Elements</h3>
                    <p className="text-sm sm:text-base text-gray-600">{categoryItems.length} elements in this category</p>
                    {categoryAssignment && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        <i className="fas fa-user mr-1"></i>
                        Default assignee: <span className="font-medium">{categoryAssignment.username}</span>
                      </p>
                    )}
                  </div>
                  {hasPermission('elementAssignment', 'create') && canAssign && (
                    <button
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedElement(null);
                        fetchAvailableUsers();
                        setShowUserModal(true);
                      }}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-white font-medium text-xs sm:text-sm ${
                        category === 'Environmental' ? 'bg-green-600 hover:bg-green-700' :
                        category === 'Social' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      <i className="fas fa-users mr-1 sm:mr-2"></i>
                      Assign Category
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {categoryItems.map((item, index) => {
                  const assignedUser = getAssignedUser(item.id, category);
                  
                  return (
                    <div key={item.id} className="p-4 sm:p-6 hover:bg-blue-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                            <span className="text-xs sm:text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                            <h4 className="font-bold text-gray-900 text-base sm:text-lg">{item.name}</h4>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                              item.category === 'Environmental' ? 'bg-green-200 text-green-900' :
                              item.category === 'Social' ? 'bg-purple-200 text-purple-900' :
                              'bg-orange-200 text-orange-900'
                            }`}>
                              {item.category}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 text-sm sm:text-base mb-4 font-medium">{item.description}</p>
                          
                          {/* Make the info badges stack on mobile */}
                          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-ruler text-gray-600"></i>
                              <span>Unit: <span className="font-bold text-gray-900">{item.unit}</span></span>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-clock text-gray-600"></i>
                              <span>Frequency: <span className="font-bold text-gray-900">{item.cadence}</span></span>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-100 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                              <i className="fas fa-tags text-gray-600"></i>
                              <span>Frameworks:</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {item.frameworks.map((framework, idx) => (
                                  <span key={idx} className={`px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold ${
                                    framework === 'DST' ? 'bg-blue-200 text-blue-900' :
                                    framework === 'ESG' ? 'bg-green-200 text-green-900' :
                                    framework === 'Green Key' ? 'bg-teal-200 text-teal-900' :
                                    framework === 'TCFD' ? 'bg-orange-200 text-orange-900' :
                                    framework === 'SASB' ? 'bg-purple-200 text-purple-900' :
                                    'bg-gray-200 text-gray-900'
                                  }`}>
                                    {framework}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Assignment Section - moves below on mobile */}
                        <div className="mt-4 lg:mt-0 lg:ml-6 text-left lg:text-right">
                          {assignedUser ? (
                            <div className="mb-2">
                              <p className="text-xs sm:text-sm text-gray-500">Assigned to:</p>
                              <p className="font-medium text-sm sm:text-base text-gray-900">{assignedUser.username}</p>
                              <p className="text-xs text-gray-500">{assignedUser.email}</p>
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-400 mb-2">Unassigned</p>
                          )}
                          
                          {hasPermission('elementAssignment', 'create') && canAssign && (
                            <button
                              onClick={() => {
                                console.log('Assigning item:', item);
                                setSelectedElement(item);
                                setSelectedCategory(null);
                                fetchAvailableUsers();
                                setShowUserModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700 whitespace-nowrap"
                            >
                              <i className="fas fa-user-edit mr-1"></i>
                              {assignedUser ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 gap-3">
          <button 
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            onClick={async () => {
              setShowChecklist(false);
              await checkChecklistExists();
            }}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Questions
          </button>
          <button 
            className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg font-medium"
            onClick={handleContinue}
          >
            Save & Continue
            <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
        
        {/* User Selection Modal */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                {selectedCategory ? `Assign ${selectedCategory} Category` : `Assign ${selectedElement?.name}`}
              </h3>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                  <p className="text-sm sm:text-base text-gray-500 mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm sm:text-base text-gray-500">No users available</p>
                  ) : (
                    availableUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (selectedCategory) {
                            handleCategoryAssignment(selectedCategory, user.id);
                          } else if (selectedElement) {
                            handleElementAssignment(selectedElement.id, user.id);
                          }
                        }}
                        className="w-full text-left p-2 sm:p-3 hover:bg-gray-50 rounded-lg mb-2 border border-gray-200"
                      >
                        <div className="font-medium text-sm sm:text-base text-gray-900">{user.full_name}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Role: {user.role} | Active assignments: {user.assignment_count}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedCategory(null);
                    setSelectedElement(null);
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">No Company Selected</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Please select a company from the navigation bar to continue with profiling.
          </p>
        </div>
      </div>
    );
  }

  // Show access denied message if backend returns 403
  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-lock text-red-600 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access profiling.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator if you need access to this feature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Access control check for framework selection functionality
  const canAccessFrameworkSelection = hasPermission('frameworkSelection', 'read');
  console.log('List.js - Framework selection access:', canAccessFrameworkSelection, 'User role:', user?.role);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm sm:text-base text-gray-600">Loading profiling questions...</span>
        </div>
      </div>
    );
  }

  if (profilingQuestions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">No Questions Available</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            No profiling questions found. Please contact support or check your backend configuration.
          </p>
          <div className="text-xs sm:text-sm text-gray-500">
            Debug info: Company ID: {companyId}, Questions loaded: {profilingQuestions.length}, Loading: {loading.toString()}
          </div>
          <div className="mt-4">
            <button 
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              onClick={() => {
                setLoading(true);
                fetchProfilingQuestions();
              }}
            >
              Retry Loading Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Profiling Wizard Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-question-circle text-blue-600"></i>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profiling Wizard</h2>
            <p className="text-sm sm:text-base text-gray-600">Answer these questions to personalize your data requirements</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            <span className="font-medium">{Object.keys(answers).length}</span> of <span className="font-medium">{profilingQuestions.length}</span> questions answered
            {!hasPermission('frameworkSelection', 'update') && (
              <span className="ml-2 sm:ml-4 px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                <i className="fas fa-eye mr-1"></i>View Only
              </span>
            )}
          </div>
          {hasPermission('frameworkSelection', 'update') && (
            <div className="flex space-x-2 sm:space-x-3">
              <button 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs sm:text-sm font-medium"
                onClick={() => handleAnswerAll(false)}
              >
                <i className="fas fa-times mr-1 sm:mr-2"></i>Answer All No
              </button>
              <button 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs sm:text-sm font-medium"
                onClick={() => handleAnswerAll(true)}
              >
                <i className="fas fa-check mr-1 sm:mr-2"></i>Answer All Yes
              </button>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(Object.keys(answers).length / profilingQuestions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Questions by Category */}
      {['Basic Operations'].map(category => (
        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{category}</h3>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {profilingQuestions.filter(q => q.category === category).map((question) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base text-gray-900 mb-2">{question.text}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      This will activate: <span className="font-medium">{conditionalElements[question.activatesElement]?.name || question.activatesElement}</span>
                    </p>
                  </div>
                  <div className="flex space-x-2 sm:space-x-3">
                    <button
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                        answers[question.id] === false
                          ? 'bg-red-100 text-red-700 border-2 border-red-300'
                          : !hasPermission('frameworkSelection', 'update')
                          ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, false)}
                      disabled={!hasPermission('frameworkSelection', 'update')}
                    >
                      No
                    </button>
                    <button
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                        answers[question.id] === true
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : !hasPermission('frameworkSelection', 'update')
                          ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-green-50'
                      }`}
                      onClick={() => handleAnswerChange(question.id, true)}
                      disabled={!hasPermission('frameworkSelection', 'update')}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Generate/View Checklist Button */}
      {allQuestionsAnswered && hasPermission('frameworkSelection', 'update') && !checklistExists && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-green-900">All Questions Answered!</h3>
              <p className="text-sm sm:text-base text-green-700">Click below to generate your personalized data checklist</p>
            </div>
            <button
              className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              onClick={async () => {
                const checklist = await saveAnswersAndGenerateChecklist();
                if (checklist) {
                  console.log('Profiling wizard completed, showing checklist');
                  setChecklistExists(true);
                  setShowChecklist(true);
                }
              }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-list mr-2"></i>Generate Checklist
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* View Only Message with Checklist Access for Read-Only Users */}
      {!hasPermission('frameworkSelection', 'update') && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-eye text-blue-600"></i>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">Profiling (View Only)</h3>
                <p className="text-sm sm:text-base text-blue-700">
                  {checklistExists 
                    ? "You can view the generated checklist." 
                    : "Questions have been answered by an admin. Checklist will be available once generated."
                  }
                </p>
              </div>
            </div>
            {checklistExists && (
              <button
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                onClick={() => setShowChecklist(true)}
              >
                <i className="fas fa-eye mr-2"></i>View Checklist
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checklist Ready Button */}
      {allQuestionsAnswered && checklistExists && !showChecklist && hasPermission('frameworkSelection', 'update') && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-green-900">âœ… Checklist Ready!</h3>
              <p className="text-sm sm:text-base text-green-700">Your personalized data checklist has been created and is ready to view.</p>
            </div>
            <button
              className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm sm:text-base"
              onClick={() => setShowChecklist(true)}
            >
              <i className="fas fa-eye mr-2"></i>View Checklist
            </button>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 gap-3">
        {canAccessFrameworkSelection && (
          <button
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
            onClick={() => navigate('/rame')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
        )}
        {!canAccessFrameworkSelection && (
          <button
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm sm:text-base"
            onClick={() => navigate('/dashboard')}
          >
            <i className="fas fa-arrow-left mr-2"></i>Back to Dashboard
          </button>
        )}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            {!allQuestionsAnswered 
              ? `Answer ${profilingQuestions.length - Object.keys(answers).length} more questions to continue`
              : checklistExists 
                ? 'Your checklist is ready for review' 
                : hasPermission('frameworkSelection', 'update') 
                  ? 'Generate your checklist to continue' 
                  : 'Waiting for checklist generation'
            }
          </p>
        </div>
      </div>

      {/* Modal for messages */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </div>
  );
};

export default List;
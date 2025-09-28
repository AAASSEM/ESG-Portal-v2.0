import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// Simple chart components
const EnergyChart = ({ chartData, meterType }) => {
  if (!chartData || !chartData.labels || !chartData.data || chartData.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No chart data available</p>
      </div>
    );
  }

  const hasRealData = chartData.data.some(val => val > 0);
  const maxValue = Math.max(...chartData.data.filter(val => val > 0)) || 100;
  const unit = meterType?.includes('Electricity') ? 'kWh' : 
               meterType?.includes('Fuel') ? 'L' : 
               meterType?.includes('Water') ? 'L' : 'units';

  // Show no data message if all values are zero
  if (!hasRealData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <i className="fas fa-chart-line text-gray-300 text-3xl mb-2"></i>
          <p className="text-gray-500">No data submitted for this meter</p>
          <p className="text-gray-400 text-sm">Submit data to see chart visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex items-end space-x-1 pb-4 min-h-[180px]">
        {chartData.data.map((value, index) => {
          const height = value > 0 ? Math.max((value / maxValue) * 80, 10) : 0;
          const isRealData = value > 0;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative w-full flex items-end" style={{ height: '180px' }}>
                {value > 0 ? (
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isRealData ? 'bg-green-600' : 'bg-blue-400'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${chartData.labels[index]}: ${value.toLocaleString()} ${unit} (Real Data)`}
                  ></div>
                ) : (
                  <div className="w-full h-1 bg-gray-200 rounded-full opacity-50" title={`${chartData.labels[index]}: No data`}></div>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-700 font-medium">
                {chartData.labels[index]}
              </div>
              <div className={`text-xs ${value > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                {value > 0 ? value.toLocaleString() : '0'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
        Unit: {unit} | <span className="text-green-600">●</span> Submitted data | <span className="text-gray-400">─</span> No data
      </div>
    </div>
  );
};

const EmissionsChart = ({ emissionsData, selectedScope }) => {
  if (!emissionsData || Object.keys(emissionsData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No emissions data available</p>
      </div>
    );
  }

  const totalEmissions = Object.values(emissionsData).reduce((sum, scope) => sum + scope.value, 0);
  const scopes = Object.entries(emissionsData);

  return (
    <div className="h-full flex">
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-40 h-40">
          <div className="w-full h-full rounded-full relative overflow-hidden">
            {scopes.map(([scopeName, scope], index) => {
              const percentage = totalEmissions > 0 ? (scope.value / totalEmissions) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const rotation = scopes.slice(0, index).reduce((sum, [, s]) => 
                sum + ((s.value / totalEmissions) * 360), 0);
              
              return (
                <div
                  key={scopeName}
                  className={`absolute inset-0 ${selectedScope === scopeName ? 'opacity-100' : 'opacity-70'}`}
                  style={{
                    background: `conic-gradient(from ${rotation}deg, ${scope.color} 0deg, ${scope.color} ${angle}deg, transparent ${angle}deg)`,
                    transform: selectedScope === scopeName ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(totalEmissions)}
                </div>
                <div className="text-xs text-gray-600">tCO2e</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-40 pl-3 flex flex-col justify-center">
        {scopes.map(([scopeName, scope]) => {
          const percentage = totalEmissions > 0 ? (scope.value / totalEmissions) * 100 : 0;
          const isSelected = selectedScope === scopeName;
          
          if (!isSelected) return null;
          
          return (
            <div 
              key={scopeName} 
              className="p-3 rounded-lg border border-blue-300 bg-blue-50 transition-all"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: scope.color }}
                ></div>
                <span className="font-medium text-sm text-gray-900">{scopeName}</span>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {Math.round(scope.value)} tCO2e
              </div>
              <div className="text-xs text-gray-600 mb-2">
                {percentage.toFixed(1)}% of total
              </div>
              
              {scope.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Sources:</h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {scope.items.map((item, index) => (
                      <div 
                        key={index} 
                        className="text-xs text-gray-600 bg-white px-2 py-1 rounded"
                        title={item}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {scope.items.length === 0 && (
                <div className="text-xs text-gray-500 italic">
                  No data sources
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Modal Component
const ExportModal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className={`p-6 border-b ${data.type === 'warning' ? 'bg-yellow-50' : 'bg-green-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {data.type === 'warning' ? (
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
                </div>
              ) : (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900">{data.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {data.type === 'warning' ? (
            <>
              <p className="text-gray-700 mb-4">{data.message}</p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Missing Data:</h3>
                <ul className="space-y-1">
                  {data.missingItems?.map((item, index) => (
                    <li key={index} className="text-red-700 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
              
              {data.missingMeters && data.missingMeters.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Meters Without Data:</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.missingMeters.map((meter, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                        {meter}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-gray-600 text-sm">
                Do you want to continue generating the report with incomplete data?
              </p>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">File Name:</span>
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{data.filename}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Report Period:</span>
                  <span className="font-semibold">{data.period}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Completeness:</span>
                  <span className={`font-semibold ${data.completeness === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                    {data.completeness}%
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Report Includes:</h4>
                <ul className="space-y-1">
                  {data.includes?.map((item, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-center">
                      <i className="fas fa-check text-green-500 mr-2"></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              {data.completeness < 100 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <i className="fas fa-info-circle mr-2"></i>
                    Report contains incomplete data ({data.completeness}% complete)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
          {data.type === 'warning' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel & Complete Data
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Export Anyway
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Deadline Modal Component
const DeadlineModal = ({ isOpen, onClose, onSelectType }) => {
  if (!isOpen) return null;
  
  const deadlineTypes = [
    {
      id: 'data',
      icon: 'fas fa-database',
      title: 'Data Collection Deadline',
      description: 'Add monthly submission deadline for meter readings and ESG data',
      color: 'blue'
    },
    {
      id: 'framework',
      icon: 'fas fa-file-alt',
      title: 'Framework Compliance Deadline',
      description: 'Add reporting deadline for ESG frameworks (DST, Green Key, etc.)',
      color: 'green'
    },
    {
      id: 'checklist',
      icon: 'fas fa-tasks',
      title: 'ESG Action Item Deadline',
      description: 'Add deadline for checklist items and sustainability initiatives',
      color: 'purple'
    }
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-plus text-blue-600"></i>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Deadline</h2>
                <p className="text-gray-600">Choose the type of deadline you want to add</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <i className="fas fa-times text-gray-500"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {deadlineTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className={`w-full p-6 rounded-xl border-2 border-gray-200 hover:border-${type.color}-300 hover:shadow-md transition-all duration-200 text-left group`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-${type.color}-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-${type.color}-200 transition-colors`}>
                    <i className={`${type.icon} text-${type.color}-600 text-lg`}></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {type.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {type.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <i className="fas fa-arrow-right text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-500">
            <i className="fas fa-info-circle mr-2"></i>
            You'll be taken to the relevant page to set up your deadline
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, selectedCompany } = useAuth();
  
  // Dynamic month name
  const getCurrentMonthName = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    return monthNames[currentDate.getMonth()];
  };
  
  const [selectedTimeRange, setSelectedTimeRange] = useState(`${getCurrentMonthName()} 2025`);

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(0);
  const [selectedEmissionScope, setSelectedEmissionScope] = useState('Scope 2');
  const [modalData, setModalData] = useState({ isOpen: false, type: '', data: {} });
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  
  const companyId = selectedCompany?.id;

  const fetchDashboardData = async () => {
    if (!companyId) {
      console.log('No company selected, skipping dashboard data fetch');
      return null;
    }
    
    try {
      const dashboardUrl = `${API_BASE_URL}/api/dashboard/?company_id=${companyId}`;
      const frameworksUrl = `${API_BASE_URL}/api/companies/${companyId}/frameworks/`;
      const progressUrl = `${API_BASE_URL}/api/companies/${companyId}/progress/`;

      const [dashboardResponse, progressResponse, frameworksResponse] = await Promise.all([
        fetch(dashboardUrl, { credentials: 'include' }),
        fetch(progressUrl, { credentials: 'include' }),
        fetch(frameworksUrl, { credentials: 'include' })
      ]);
      
      const dashboard = await dashboardResponse.json();
      const progress = await progressResponse.json();
      const frameworks = await frameworksResponse.json();
      
      return {
        ...dashboard,
        progress,
        frameworks: Array.isArray(frameworks) ? frameworks : (frameworks.results || [])
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return null;
    }
  };

  const fetchChartData = async () => {
    if (!companyId) {
      console.log('No company selected, skipping chart data fetch');
      return { meters: [], dataEntries: [] };
    }
    
    try {
      // Determine months to fetch based on selected time range
      const now = new Date();
      let targetMonths = [];

      if (selectedTimeRange === 'Last Quarter') {
        // Get the last 3 months including current month (to match chart labels)
        const currentMonth = now.getMonth() + 1; // 1-based
        for (let i = 2; i >= 0; i--) {
          let month = currentMonth - i;
          let year = now.getFullYear();
          if (month <= 0) {
            month += 12;
            year -= 1;
          }
          targetMonths.push({ year, month });
        }
      } else if (selectedTimeRange === 'Last Year') {
        // Get all 12 months from the current year (2025)
        const currentYear = now.getFullYear();
        for (let month = 1; month <= 12; month++) {
          targetMonths.push({ year: currentYear, month });
        }
      } else if (selectedTimeRange.includes('2025') && !selectedTimeRange.includes('Quarter') && !selectedTimeRange.includes('Last')) {
        // Handle month-specific selections like "Sep 2025", etc.
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const selectedMonth = selectedTimeRange.split(' ')[0]; // Extract month name
        const monthIndex = monthNames.indexOf(selectedMonth);
        if (monthIndex !== -1) {
          targetMonths.push({ year: 2025, month: monthIndex + 1 });
        }
      } else {
        // Default to current month for 'Last 7 Days' or other ranges
        targetMonths.push({ year: now.getFullYear(), month: now.getMonth() + 1 });
      }

      console.log(`📅 Fetching data for time range: ${selectedTimeRange}`);
      console.log(`🗓️ Target months:`, targetMonths.map(tm => `${tm.year}-${tm.month.toString().padStart(2, '0')}`));
      // Fetch meters once
      const metersUrl = `${API_BASE_URL}/api/meters/?company_id=${companyId}`;

      // Fetch data for all target months
      const dataPromises = targetMonths.map(({ year, month }) => {
        const dataUrl = `${API_BASE_URL}/api/data-collection/tasks/?company_id=${companyId}&year=${year}&month=${month}`;
        console.log(`🔗 Fetching: ${dataUrl}`);
        return fetch(dataUrl, { credentials: 'include' });
      });

      const [metersResponse, ...dataResponses] = await Promise.all([
        fetch(metersUrl, { credentials: 'include' }),
        ...dataPromises
      ]);

      const meters = await metersResponse.json();

      // Combine all data from different months
      const allDataEntries = [];

      for (let i = 0; i < dataResponses.length; i++) {
        const dataResponse = dataResponses[i];
        const monthDataEntries = await dataResponse.json();

        if (Array.isArray(monthDataEntries)) {
          // Data is flat array of tasks
          allDataEntries.push(...monthDataEntries);
        }
      }

      const dataEntries = allDataEntries;

      console.log(`📊 Combined data from ${targetMonths.length} months`);
      console.log(`📊 Data entries after combination:`, dataEntries?.length || 0);
      
      console.log(`📊 RAW API RESPONSE - Meters:`, meters);
      console.log(`📊 RAW API RESPONSE - Data Entries:`, dataEntries);
      console.log(`📊 Data entries count:`, dataEntries?.length || 0);
      if (dataEntries && dataEntries.length > 0) {
        console.log(`📊 FULL STRUCTURE - First data entry:`, JSON.stringify(dataEntries[0], null, 2));
        console.log(`📊 Available keys in first entry:`, Object.keys(dataEntries[0] || {}));
        console.log(`📊 Value field check:`, dataEntries[0]?.value, typeof dataEntries[0]?.value);
        console.log(`📊 Meter field check:`, dataEntries[0]?.meter, typeof dataEntries[0]?.meter);
      }
      
      return {
        meters: meters.results || meters,
        dataEntries: dataEntries || []
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { meters: [], dataEntries: [] };
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [data, charts] = await Promise.all([
          fetchDashboardData(),
          fetchChartData()
        ]);
        setDashboardData(data);
        setChartData(charts);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setDashboardData(null);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [companyId, selectedTimeRange]);

  // Helper function to get available meters
  const getAvailableMeters = useCallback(() => {
    if (!chartData?.dataEntries) return [];

    const availableMeters = [];

    // Data is a flat array of tasks
    const meterTypes = new Set();
    chartData.dataEntries.forEach(task => {
      if (task.meter && task.submission && task.submission.value && parseFloat(task.submission.value) > 0) {
        meterTypes.add(task.meter.type);
      }
    });

    Array.from(meterTypes).forEach(type => {
      availableMeters.push({
        key: type,
        type: type,
        displayName: type
      });
    });

    return availableMeters;
  }, [chartData]);

  const handleMeterNavigation = useCallback((direction) => {
    const availableMeters = getAvailableMeters();
    if (availableMeters.length <= 1) return;

    if (direction === 'next') {
      setSelectedMeter((prev) => (prev + 1) % availableMeters.length);
    } else {
      setSelectedMeter((prev) => (prev - 1 + availableMeters.length) % availableMeters.length);
    }
  }, [getAvailableMeters]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!chartData || !chartData.dataEntries) return;

      // Check if there are multiple meters available
      const availableMeters = getAvailableMeters();
      if (availableMeters.length <= 1) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleMeterNavigation('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleMeterNavigation('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chartData, handleMeterNavigation]);

  const kpiCards = (() => {
    let periodLabel = '';
    let dataPointsCount = dashboardData?.total_data_elements || 0;
    let changePercent = 0;

    switch(selectedTimeRange) {
      case 'Last 7 Days':
        periodLabel = '7d';
        dataPointsCount = chartData?.dataEntries?.filter(e => e.submission?.value).length || 0;
        changePercent = 15.2;
        break;
      default:
        if (selectedTimeRange.includes('2025') && !selectedTimeRange.includes('Quarter')) {
          // Current month case (e.g., "Sep 2025")
          periodLabel = '30d';
          dataPointsCount = dashboardData?.total_data_elements || 0;
          changePercent = 8.5;
        }
        break;
      case 'Last Quarter':
        periodLabel = 'Q3';
        dataPointsCount = dashboardData?.total_data_elements || 0;
        changePercent = -2.1;
        break;
      case 'Last Year':
        periodLabel = '12m';
        dataPointsCount = dashboardData?.total_data_elements || 0;
        changePercent = 24.7;
        break;
    }

    return [
      {
        title: `Data Points (${periodLabel})`,
        value: dataPointsCount,
        unit: 'items',
        change: changePercent,
        trend: changePercent >= 0 ? 'up' : 'down',
        color: 'blue',
        icon: 'fas fa-database'
      },
      {
        title: 'Active Meters',
        value: dashboardData?.active_meters || '0',
        unit: 'units',
        change: 0,
        trend: 'up',
        color: 'green',
        icon: 'fas fa-gauge'
      },
      {
        title: 'Frameworks',
        value: dashboardData?.total_frameworks || '0',
        unit: 'active',
        change: 0,
        trend: 'up',
        color: 'purple',
        icon: 'fas fa-list-check'
      },
      {
        title: `Completeness (${periodLabel})`,
        value: Math.round(dashboardData?.data_completeness_percentage || 0),
        unit: '%',
        change: selectedTimeRange === 'Last 7 Days' ? 5.2 :
                (selectedTimeRange.includes('2025') && !selectedTimeRange.includes('Quarter')) ? 3.1 :
                selectedTimeRange === 'Last Quarter' ? -1.5 : 11.0,
        trend: selectedTimeRange === 'Last Quarter' ? 'down' : 'up',
        color: 'yellow',
        icon: 'fas fa-chart-pie'
      }
    ];
  })();

  const frameworkStatus = (() => {
    const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
    
    if (dashboardData?.frameworks && Array.isArray(dashboardData.frameworks)) {
      return dashboardData.frameworks.map(framework => ({
        name: framework.name || framework.framework_id || 'Unknown Framework',
        progress: dataCompleteness,
        color: dataCompleteness < 30 ? 'red' : dataCompleteness < 70 ? 'orange' : 'green',
        status: dataCompleteness < 30 ? 'Just Started' : dataCompleteness < 70 ? 'In Progress' : 'On Track',
        type: framework.type || (framework.framework_id === 'DST' ? 'mandatory_conditional' : 'mandatory'),
        framework_id: framework.framework_id
      }));
    }
    
    return [];
  })();

  const recentActivities = dashboardData?.recent_activities || (() => {
    const activities = [];
    let activityId = 1;

    if (chartData?.dataEntries) {
      // Data is a flat array of tasks
      chartData.dataEntries.forEach(task => {
        if (task.submission && task.submission.value && parseFloat(task.submission.value) > 0) {
          const submissionDate = new Date(task.submission.updated_at || task.submission.created_at);
          const hoursAgo = Math.floor((new Date() - submissionDate) / (1000 * 60 * 60));
          const timeAgo = hoursAgo < 1 ? 'Just now' :
                         hoursAgo < 24 ? `${hoursAgo} hours ago` :
                         `${Math.floor(hoursAgo / 24)} days ago`;

          activities.push({
            id: activityId++,
            action: `${task.meter?.type || task.element_name} data submitted`,
            description: `Value: ${parseFloat(task.submission.value).toLocaleString()} ${task.element_unit}`,
            time: timeAgo,
            submissionDate: submissionDate,
            type: 'data',
            icon: 'fas fa-chart-line',
            color: 'green'
          });
        }
      });
    }
    
    if (dashboardData?.progress) {
      const progress = dashboardData.progress;
      
      if (progress.module_5_complete) {
        activities.push({
          id: activityId++,
          action: 'Data collection completed',
          description: `${Math.round(dashboardData.data_completeness_percentage || 0)}% data completeness achieved`,
          time: '2 hours ago',
          type: 'milestone',
          icon: 'fas fa-trophy',
          color: 'yellow'
        });
      }
      
      if (progress.module_4_complete) {
        activities.push({
          id: activityId++,
          action: 'Smart meters activated',
          description: `${dashboardData.active_meters || 0} meters configured and monitoring`,
          time: '1 day ago',
          type: 'system',
          icon: 'fas fa-gauge',
          color: 'blue'
        });
      }
      
      if (progress.module_3_complete) {
        activities.push({
          id: activityId++,
          action: 'ESG profiling completed',
          description: 'Company sustainability profile generated',
          time: '2 days ago',
          type: 'completion',
          icon: 'fas fa-user-check',
          color: 'purple'
        });
      }
      
      if (progress.module_2_complete) {
        activities.push({
          id: activityId++,
          action: 'Frameworks configured',
          description: `${dashboardData.total_frameworks || 0} ESG frameworks activated`,
          time: '3 days ago',
          type: 'setup',
          icon: 'fas fa-list-check',
          color: 'indigo'
        });
      }
    }
    
    return activities
      .sort((a, b) => {
        // Sort by submission date descending (newest first)
        if (a.submissionDate && b.submissionDate) {
          return b.submissionDate - a.submissionDate;
        }
        // Fallback to original logic for non-data activities
        if (a.type === 'data' && b.type !== 'data') return -1;
        if (b.type === 'data' && a.type !== 'data') return 1;
        return a.time.includes('hour') ? -1 : 1;
      })
      .slice(0, 4);
  })();

  const upcomingDeadlines = dashboardData?.upcoming_deadlines || [];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleQuickAction = (action) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.action === 'export') {
      handleExportData();
    }
  };

  const performExport = async () => {
    try {
      const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
      const evidenceCompleteness = Math.round(dashboardData?.evidence_completeness_percentage || 0);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const timeRangeLabel = selectedTimeRange;
      
      const csvData = [
        ['ESG Dashboard Report - Generated on', new Date().toLocaleDateString()],
        ['Company', 'Emirates Hotels Group'],
        ['Report Period', timeRangeLabel],
        [''],
        [`=== OVERVIEW METRICS (${timeRangeLabel}) ===`],
        ['Metric', 'Value', 'Unit'],
        ['Total Data Elements', dashboardData?.total_data_elements || '0', 'items'],
        ['Active Meters', dashboardData?.active_meters || '0', 'units'],
        ['Total Frameworks', dashboardData?.total_frameworks || '0', 'active'],
        ['Data Completeness', `${dataCompleteness}%`, dataCompleteness < 100 ? '⚠️ INCOMPLETE' : '✓ Complete'],
        ['Evidence Completeness', `${evidenceCompleteness}%`, evidenceCompleteness < 100 ? '⚠️ INCOMPLETE' : '✓ Complete'],
        [''],
        ['=== FRAMEWORK PROGRESS ==='],
        ['Framework', 'Progress (%)', 'Status', 'Type']
      ];

      if (dashboardData?.frameworks) {
        frameworkStatus.forEach(framework => {
          const fw = dashboardData.frameworks.find(f => f.name === framework.name);
          csvData.push([
            framework.name, 
            framework.progress, 
            framework.status,
            fw?.type || 'N/A'
          ]);
        });
      }

      if (chartData?.meters) {
        let periodDescription = '';
        switch(selectedTimeRange) {
          case 'Last 7 Days':
            periodDescription = 'PAST 7 DAYS';
            break;
          case 'Last Quarter':
            {
              const currentMonth = new Date().getMonth(); // 0-based (Sep = 8)
              const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
              const month1 = monthNames[(currentMonth - 2 + 12) % 12];
              const month2 = monthNames[(currentMonth - 1 + 12) % 12];
              const month3 = monthNames[currentMonth];
              const quarter = Math.ceil((currentMonth + 1) / 3);
              periodDescription = `Q${quarter} 2025 (${month1}-${month3})`;
            }
            break;
          case 'Last Year':
            periodDescription = 'YEAR 2025';
            break;
          default:
            if (selectedTimeRange.includes('2025') && !selectedTimeRange.includes('Quarter')) {
              periodDescription = `${selectedTimeRange.toUpperCase()}`;
            } else {
              periodDescription = 'AUGUST 2025';
            }
            break;
        }
        
        csvData.push([''], [`=== METER DATA (${periodDescription}) ===`], ['Meter', 'Type', 'Value', 'Status', 'Completeness']);
        
        chartData.meters.forEach(meter => {
          const meterData = chartData.dataEntries.find(entry => 
            entry.meter && entry.meter.id === meter.id
          );
          const value = meterData?.submission?.value || '0';
          const status = meterData?.submission?.status || 'missing';
          const completeness = value && value !== '0' ? '✓' : '⚠️ MISSING';
          csvData.push([meter.name, meter.type, value, status, completeness]);
        });
        
        const totalMeters = chartData.meters.length;
        const completedMeters = chartData.meters.filter(meter => {
          let hasData = false;
          chartData.dataEntries.forEach(entry => {
            if (entry.tasks && Array.isArray(entry.tasks)) {
              entry.tasks.forEach(task => {
                if (task.meter && task.meter.id === meter.id && 
                    task.submission && task.submission.value && task.submission.value !== '0') {
                  hasData = true;
                }
              });
            }
          });
          return hasData;
        }).length;
        
        csvData.push([''], ['METER SUMMARY', `${completedMeters} of ${totalMeters} meters have data`, '', `${Math.round((completedMeters/totalMeters)*100)}% complete`]);
      }

      csvData.push([''], ['=== UPCOMING DEADLINES ==='], ['Deadline', 'Date', 'Days Left', 'Priority']);
      upcomingDeadlines.forEach(deadline => {
        csvData.push([deadline.name, deadline.date, deadline.daysLeft, deadline.priority]);
      });

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      const timeRangeSuffix = selectedTimeRange.toLowerCase().replace(/ /g, '-');
      const filename = `esg-report-${timeRangeSuffix}-${timestamp}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setModalData({
        isOpen: true,
        type: 'success',
        data: {
          type: 'success',
          title: 'Export Successful',
          filename: filename,
          period: timeRangeLabel,
          completeness: dataCompleteness,
          includes: [
            `Overview metrics for ${timeRangeLabel}`,
            `Framework progress (${frameworkStatus.length} frameworks)`,
            `Meter data (${chartData?.meters?.length || 0} meters)`,
            'Upcoming deadlines'
          ]
        }
      });
    } catch (error) {
      console.error('Export failed:', error);
      setModalData({
        isOpen: true,
        type: 'error',
        data: {
          type: 'error',
          title: 'Export Failed',
          message: 'The export failed. Please try again or contact support.'
        }
      });
    }
  };

  const handleExportData = async () => {
    const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
    const evidenceCompleteness = Math.round(dashboardData?.evidence_completeness_percentage || 0);
    
    if (dataCompleteness < 100 || evidenceCompleteness < 100) {
      const missingItems = [];
      if (dataCompleteness < 100) {
        missingItems.push(`Data completeness: ${dataCompleteness}% (${100 - dataCompleteness}% missing)`);
      }
      if (evidenceCompleteness < 100) {
        missingItems.push(`Evidence completeness: ${evidenceCompleteness}% (${100 - evidenceCompleteness}% missing)`);
      }
      
      const missingMeters = chartData?.meters?.filter(meter => {
        const meterData = chartData.dataEntries.find(entry => 
          entry.meter && entry.meter.id === meter.id
        );
        return !meterData?.submission?.value;
      }) || [];
      
      if (missingMeters.length > 0) {
        missingItems.push(`${missingMeters.length} meters have no data submitted`);
      }
      
      setModalData({
        isOpen: true,
        type: 'warning',
        data: {
          type: 'warning',
          title: 'Incomplete Data Warning',
          message: 'Your ESG data is incomplete. The report will be missing important information.',
          missingItems: missingItems,
          missingMeters: missingMeters.map(m => m.type)
        }
      });
      
      return;
    }
    
    performExport();
  };

  const closeModal = () => {
    setModalData({ isOpen: false, type: '', data: {} });
  };

  const confirmExport = () => {
    closeModal();
    performExport();
  };

  const handleAddDeadline = () => {
    setShowDeadlineModal(true);
  };

  const handleDeadlineModalClose = () => {
    setShowDeadlineModal(false);
  };

  const handleDeadlineTypeSelect = (type) => {
    setShowDeadlineModal(false);
    switch(type) {
      case 'data':
        navigate('/data');
        break;
      case 'framework':
        navigate('/rame');
        break;
      case 'checklist':
        navigate('/list');
        break;
      default:
        break;
    }
  };

  const handleDeadlineClick = (deadline) => {
    switch (deadline.type) {
      case 'framework':
        navigate('/rame');
        break;
      case 'data':
        navigate('/data');
        break;
      case 'quarterly':
      case 'annual':
        navigate('/dashboard');
        break;
      default:
        navigate('/list');
    }
  };

  const generateChartData = () => {
    let months = [];

    switch(selectedTimeRange) {
      case 'Last 7 Days':
        months = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'Last Quarter':
        // Dynamic last quarter based on current month
        {
          const currentMonth = new Date().getMonth(); // 0-based (Sep = 8)
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month1 = monthNames[(currentMonth - 2 + 12) % 12];
          const month2 = monthNames[(currentMonth - 1 + 12) % 12];
          const month3 = monthNames[currentMonth];
          months = [month1, month2, month3];
        }
        break;
      case 'Last Year':
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        if (selectedTimeRange.includes('2025') && !selectedTimeRange.includes('Quarter')) {
          // Show monthly data instead of weeks
          months = ['This Month'];
        } else {
          months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        }
        break;
    }

    if (!chartData || !chartData.dataEntries) {
      return { labels: months, data: months.map(() => 0) };
    }

    // Get available meter combinations using helper function
    const availableMeters = getAvailableMeters();
    if (availableMeters.length === 0) {
      return { labels: months, data: months.map(() => 0) };
    }

    // Use selectedMeter index to pick from available meter combinations
    const selectedMeterInfo = availableMeters[selectedMeter % availableMeters.length];
    console.log(`📊 Selected meter: ${selectedMeterInfo.displayName} (index ${selectedMeter}, available: ${availableMeters.length})`);

    let currentValue = 0;

    // Aggregate data for the selected meter type
    console.log(`📊 Processing data entries: ${chartData.dataEntries.length}`);

    // For historical ranges, we should show data distributed across time periods
    if (selectedTimeRange === 'Last Quarter' || selectedTimeRange === 'Last Year') {
      // For historical ranges, show the latest available data instead of aggregating everything
      let latestValue = 0;
      let latestDate = null;

      chartData.dataEntries.forEach(task => {
        if (task.meter && task.meter.type === selectedMeterInfo.type &&
            task.submission && task.submission.value) {
          const entryValue = parseFloat(task.submission.value);
          const submissionDate = new Date(task.submission.updated_at || task.submission.created_at);

          console.log(`  Found ${task.meter.type}: value="${task.submission.value}", parsed=${entryValue}, date=${submissionDate.toISOString()}`);

          if (entryValue > 0 && (!latestDate || submissionDate > latestDate)) {
            latestValue = entryValue;
            latestDate = submissionDate;
          }
        }
      });

      currentValue = latestValue;
      console.log(`  📅 Using latest value: ${currentValue} from ${latestDate?.toISOString()}`);
    } else {
      // For current month or specific month, aggregate all data
      chartData.dataEntries.forEach(task => {
        if (task.meter && task.meter.type === selectedMeterInfo.type &&
            task.submission && task.submission.value) {
          const entryValue = parseFloat(task.submission.value);
          console.log(`  Found ${task.meter.type}: value="${task.submission.value}", parsed=${entryValue}`);
          if (entryValue > 0) {
            currentValue += entryValue;
          }
        }
      });
    }

    console.log(`📊 Total aggregated value for ${selectedMeterInfo.displayName}: ${currentValue}`);

    // Initialize data array with zeros for each month
    const data = months.map(() => 0);

    // Distribute data across correct month columns instead of aggregating
    if (selectedTimeRange === 'Last Quarter' || selectedTimeRange === 'Last Year') {
      console.log(`📊 Distributing data across month columns for ${selectedTimeRange}`);

      // For historical ranges, distribute data by actual submission month
      const monthMap = {};

      // Distribute by month from flat data
      chartData.dataEntries.forEach(task => {
        if (task.meter && task.meter.type === selectedMeterInfo.type &&
            task.submission && task.submission.value) {
          const entryValue = parseFloat(task.submission.value);
          const reportingPeriod = task.submission.reporting_period; // 'Aug', 'Sep', etc.

          if (entryValue > 0 && reportingPeriod) {
            if (!monthMap[reportingPeriod]) monthMap[reportingPeriod] = 0;
            monthMap[reportingPeriod] += entryValue;
            console.log(`  📅 ${reportingPeriod}: +${entryValue} = ${monthMap[reportingPeriod]}`);
          }
        }
      });

      // Map month names to data array indices
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      if (selectedTimeRange === 'Last Quarter') {
        // Last Quarter shows last 3 months: match the chart labels exactly
        const currentMonth = new Date().getMonth(); // 0-based (Sep = 8)
        const monthNamesAll = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const quarterMonths = [
          monthNamesAll[(currentMonth - 2 + 12) % 12], // Jul
          monthNamesAll[(currentMonth - 1 + 12) % 12], // Aug
          monthNamesAll[currentMonth]                   // Sep
        ];

        console.log(`  📊 Quarter months mapping: ${quarterMonths}`);

        quarterMonths.forEach((monthName, index) => {
          if (monthMap[monthName]) {
            data[index] = monthMap[monthName];
            console.log(`  📊 ${monthName} → data[${index}] = ${monthMap[monthName]}`);
          }
        });
      } else if (selectedTimeRange === 'Last Year') {
        // Last Year shows all 12 months
        monthNames.forEach((monthName, index) => {
          if (monthMap[monthName]) {
            data[index] = monthMap[monthName];
            console.log(`  📊 ${monthName} → data[${index}] = ${monthMap[monthName]}`);
          }
        });
      }
    } else {
      // For single month selections, put data in the last column (current behavior)
      if (currentValue > 0) {
        data[data.length - 1] = currentValue;
      }
    }

    return { labels: months, data: data };
  };

  const generateEmissionsData = () => {
    if (!chartData || !chartData.dataEntries) {
      return {
        'Scope 1': { value: 0, color: '#ef4444', items: [] },
        'Scope 2': { value: 0, color: '#3b82f6', items: [] },
        'Scope 3': { value: 0, color: '#6b7280', items: [] }
      };
    }

    const scopes = {
      'Scope 1': { value: 0, color: '#ef4444', items: [] },
      'Scope 2': { value: 0, color: '#3b82f6', items: [] },
      'Scope 3': { value: 0, color: '#6b7280', items: [] }
    };

    // UAE-specific emission factors from framework JSON files
    const getEmissionFactor = (meterType) => {
      const type = meterType.toLowerCase();

      // Scope 1 - Direct emissions
      if (type.includes('lpg') || type.includes('lpg gas')) {
        return 0.003; // 3 kg CO2e/kg LPG
      }
      if (type.includes('petrol') || type.includes('gasoline')) {
        return 0.00231; // 2.31 kg CO2e/L petrol
      }
      if (type.includes('diesel')) {
        return 0.00268; // 2.68 kg CO2e/L diesel
      }
      if (type.includes('natural gas') || type.includes('gas')) {
        return 0.002; // Estimated natural gas factor
      }
      if (type.includes('refrigerant')) {
        return 1.3; // GWP factor for R134a (varies by refrigerant type)
      }

      // Scope 2 - Energy indirect emissions
      if (type.includes('electricity') || type.includes('energy') || type.includes('renewable')) {
        return 0.00023; // 0.23 kg CO2e/kWh UAE grid average
      }
      if (type.includes('district cooling') || type.includes('cooling')) {
        return 0.00009; // 0.09 kg CO2e/RT-h district cooling
      }

      // Scope 3 - Other indirect emissions
      if (type.includes('water')) {
        return 0.0005; // 0.5 kg CO2e/m³ water treatment
      }
      if (type.includes('waste')) {
        return 0.00006; // 0.06 kg CO2e/kg waste to landfill
      }

      // Default for unknown types
      return 0.0001;
    };

    const getScopeForMeterType = (meterType) => {
      const type = meterType.toLowerCase();

      // Scope 1: Direct emissions from owned/controlled sources
      if (type.includes('lpg') || type.includes('petrol') || type.includes('diesel') ||
          type.includes('natural gas') || type.includes('gas') || type.includes('refrigerant')) {
        return 'Scope 1';
      }

      // Scope 2: Indirect emissions from purchased energy
      if (type.includes('electricity') || type.includes('energy') ||
          type.includes('renewable') || type.includes('district cooling') || type.includes('cooling')) {
        return 'Scope 2';
      }

      // Scope 3: Other indirect emissions
      return 'Scope 3';
    };

    // Handle data for GHG emissions calculation
    chartData.dataEntries.forEach((task) => {
      if (task.meter && task.submission && task.submission.value) {
        const meterType = task.meter.type;
        const value = parseFloat(task.submission.value) || 0;
        const displayName = task.meter.type;
        const scope = getScopeForMeterType(meterType);
        const emissionFactor = getEmissionFactor(meterType);

        scopes[scope].value += value * emissionFactor;
        scopes[scope].items.push(displayName);
      }
    });

    Object.keys(scopes).forEach(scopeName => {
      scopes[scopeName].items = [...new Set(scopes[scopeName].items)];
    });

    return scopes;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            <span className="hidden sm:inline">Back to Main</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ESG Dashboard</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          {['Last 7 Days', `${getCurrentMonthName()} 2025`, 'Last Quarter', 'Last Year'].map((range) => (
            <button
              key={range}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${
                selectedTimeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            onClick={handleExportData}
            className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm font-medium transition-colors"
          >
            <i className="fas fa-download mr-1 sm:mr-2"></i>
            <span>Export</span>
          </button>
          <button 
            onClick={handleExportData}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium transition-colors"
          >
            <i className="fas fa-file-chart-line mr-1 sm:mr-2"></i>
            <span className="hidden sm:inline">Generate Report</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-${kpi.color}-100 rounded-lg flex items-center justify-center`}>
                <i className={`${kpi.icon} text-${kpi.color}-600 text-lg`}></i>
              </div>
              <div className={`flex items-center text-sm font-medium ${
                kpi.trend === 'up' ? 'text-red-600' : 'text-green-600'
              }`}>
                <i className={`fas fa-arrow-${kpi.trend} mr-1`}></i>
                {Math.abs(kpi.change)}%
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{kpi.title}</h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
              <span className="text-sm text-gray-500">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-8">
        <div className="xl:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Framework Compliance</h2>
              <p className="text-sm sm:text-base text-gray-600">Progress across selected ESG frameworks</p>
            </div>
            <button 
              onClick={() => navigate('/rame')}
              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium transition-colors self-start sm:self-auto"
            >
              View Details
            </button>
          </div>
          <div className="space-y-4">
            {frameworkStatus.map((framework, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{framework.name}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      framework.status === 'Complete' ? 'bg-green-100 text-green-800' :
                      framework.status === 'On Track' ? 'bg-blue-100 text-blue-800' :
                      framework.status === 'Needs Attention' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {framework.status}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{framework.progress}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`bg-${framework.color}-500 h-2 rounded-full`}
                    style={{ width: `${framework.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Activity</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Latest system updates</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 bg-${activity.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <i className={`${activity.icon} text-${activity.color}-600 text-xs`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{activity.action}</p>
                  <p className="text-gray-600 text-xs mt-1">{activity.description}</p>
                  <p className="text-gray-400 text-xs mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Meter Data Analytics</h3>
              <div className="h-5">
                <p className="text-gray-600 text-xs sm:text-sm truncate">
                  {(() => {
                    const availableMeters = getAvailableMeters();
                    if (availableMeters.length === 0) return 'No data available';

                    const selectedMeterInfo = availableMeters[selectedMeter % availableMeters.length];
                    return selectedMeterInfo.displayName;
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 self-start sm:self-auto">
              {(() => {
                const availableMeters = getAvailableMeters();
                if (availableMeters.length <= 1) return null;

                return (
                  <span className="text-sm text-gray-500">
                    {(selectedMeter % availableMeters.length) + 1} of {availableMeters.length}
                  </span>
                );
              })()}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {(() => {
                  const availableMeters = getAvailableMeters();
                  if (availableMeters.length === 0) return 'Units';

                  const selectedMeterInfo = availableMeters[selectedMeter % availableMeters.length];
                  const currentMeterType = selectedMeterInfo.type;
                  return currentMeterType?.includes('Electricity') ? 'kWh' :
                         currentMeterType?.includes('Fuel') ? 'Liters' :
                         currentMeterType?.includes('Water') ? 'Liters' : 'Units';
                })()}
              </span>
            </div>
          </div>
          
          <div className="h-48 sm:h-64 bg-gray-50 rounded-lg p-2 sm:p-4 relative group">
            {(() => {
              const availableMeters = getAvailableMeters();
              if (availableMeters.length <= 1) return null;

              return (
                <>
                  <button
                    onClick={() => handleMeterNavigation('prev')}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10
                              p-2 bg-white/90 hover:bg-white rounded-full shadow-lg
                              opacity-0 group-hover:opacity-100 transition-all duration-200
                              hover:scale-110"
                    title="Previous meter type"
                  >
                    <i className="fas fa-chevron-left text-gray-700 text-sm"></i>
                  </button>
                  <button
                    onClick={() => handleMeterNavigation('next')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10
                              p-2 bg-white/90 hover:bg-white rounded-full shadow-lg
                              opacity-0 group-hover:opacity-100 transition-all duration-200
                              hover:scale-110"
                    title="Next meter type"
                  >
                    <i className="fas fa-chevron-right text-gray-700 text-sm"></i>
                  </button>
                </>
              );
            })()}

            {chartData ? (
              <EnergyChart
                chartData={generateChartData()}
                meterType={(() => {
                  const availableMeters = getAvailableMeters();
                  if (availableMeters.length === 0) return null;

                  const selectedMeterInfo = availableMeters[selectedMeter % availableMeters.length];
                  return selectedMeterInfo.type;
                })()}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-gray-600">Loading chart data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">GHG Emissions Breakdown</h3>
              <p className="text-gray-600 text-sm">By source category (tCO2e)</p>
            </div>
            <div className="flex space-x-2">
              {['Scope 1', 'Scope 2', 'Scope 3'].map((scope) => (
                <button 
                  key={scope}
                  onClick={() => setSelectedEmissionScope(scope)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedEmissionScope === scope
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 bg-gray-50 rounded-lg p-4">
            {chartData ? (
              <EmissionsChart 
                emissionsData={generateEmissionsData()} 
                selectedScope={selectedEmissionScope} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
                  <p className="text-gray-600">Loading emissions data...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Upcoming Deadlines</h2>
            <p className="text-gray-600">Important compliance and reporting dates</p>
          </div>
          <button 
            onClick={handleAddDeadline}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <i className="fas fa-calendar-plus mr-2"></i>Add Deadline
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingDeadlines.map((deadline, index) => (
            <div 
              key={index} 
              onClick={() => handleDeadlineClick(deadline)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
              title={`Click to manage ${deadline.type} tasks`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}>
                  {deadline.priority}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{deadline.daysLeft} days</span>
                  <i className="fas fa-external-link-alt text-xs text-gray-400"></i>
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 hover:text-blue-600 transition-colors">{deadline.name}</h4>
              <p className="text-sm text-gray-600">{deadline.date}</p>
              {deadline.type && (
                <p className="text-xs text-gray-500 mt-2 capitalize">{deadline.type} deadline</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Common tasks and shortcuts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: 'fas fa-upload', title: 'Upload Data', color: 'blue', path: '/data', description: 'Enter ESG data entries' },
            { icon: 'fas fa-file-alt', title: 'Generate Report', color: 'green', action: 'export', description: 'Export current data' },
            { icon: 'fas fa-cog', title: 'Configure Meters', color: 'orange', path: '/meter', description: 'Manage meter settings' },
            { icon: 'fas fa-chart-bar', title: 'View Analytics', color: 'purple', path: '/dashboard', description: 'Current page' },
            { icon: 'fas fa-bell', title: 'Profiling', color: 'red', path: '/rame', description: 'Company profiling' },
            { icon: 'fas fa-list', title: 'Checklist', color: 'gray', path: '/list', description: 'ESG checklist' }
          ].map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action)}
              className={`p-4 text-center bg-${action.color}-50 hover:bg-${action.color}-100 rounded-lg transition-colors group`}
              title={action.description}
            >
              <div className={`w-10 h-10 bg-${action.color}-100 group-hover:bg-${action.color}-200 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors`}>
                <i className={`${action.icon} text-${action.color}-600`}></i>
              </div>
              <span className="text-sm font-medium text-gray-900">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      <ExportModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        onConfirm={confirmExport}
        data={modalData.data}
      />

      <DeadlineModal
        isOpen={showDeadlineModal}
        onClose={handleDeadlineModalClose}
        onSelectType={handleDeadlineTypeSelect}
      />
    </div>
  );
};

export default Dashboard;
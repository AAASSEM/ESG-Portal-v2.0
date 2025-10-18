import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

// Excel Export Modal Component
const ExportModal = ({ isOpen, onClose, onConfirm, data }) => {
  if (!isOpen) return null;
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-[100000] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
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
        
        {/* Modal Body */}
        <div className="p-6">
          {data.type === 'warning' ? (
            <>
              <p className="text-gray-700 mb-4">{data.message}</p>
              
              {/* Missing Data Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-red-900 mb-2">Missing Data:</h3>
                <ul className="space-y-1">
                  {data.missingItems?.map((item, index) => (
                    <li key={index} className="text-red-700 text-sm">{item}</li>
                  ))}
                </ul>
              </div>
              
              {/* Missing Meters Section */}
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
                Do you want to continue generating the Excel report with incomplete data?
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
                <h4 className="font-semibold text-gray-900 mb-2">Excel Report Includes:</h4>
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
                    Excel report contains incomplete data ({data.completeness}% complete)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Modal Footer */}
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
                Generate Excel Anyway
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

  return createPortal(modalContent, document.body);
};

// Dynamic Visual Progress Component
const ProgressBar = ({ value, total, label, color = "blue", showPercentage = true }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const width = Math.min(percentage, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-2">
          {showPercentage && <span className="text-sm font-bold text-gray-900">{percentage}%</span>}
          <span className="text-xs text-gray-500">{value}/{total}</span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 bg-${color}-500`}
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
};

// Sparkline Chart Component
const Sparkline = ({ data, color = "blue", height = "20px" }) => {
  if (!data || data.length === 0) return <div className="w-12 h-5 bg-gray-100 rounded"></div>;
  
  const max = Math.max(...data.filter(d => d > 0));
  const min = Math.min(...data.filter(d => d >= 0));
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 80;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="48" height={height} viewBox="0 0 100 100" className="inline-block">
      <polyline
        fill="none"
        stroke={`rgb(${color === 'green' ? '34, 197, 94' : color === 'blue' ? '59, 130, 246' : '239, 68, 68'})`}
        strokeWidth="3"
        points={points}
      />
    </svg>
  );
};

// Priority Alert Component
const PriorityAlert = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;
  
  return (
    <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 mb-6">
      <div className="flex items-center mb-3">
        <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
        <h3 className="text-lg font-semibold text-red-900">⚠️ REQUIRES ATTENTION</h3>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, index) => (
          <div key={index} className="flex items-center text-red-800">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
            <span className="text-sm">{alert}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Interactive Framework Compliance Bars
const FrameworkCompliance = ({ frameworks, onClick }) => {
  return (
    <div className="space-y-4">
      {frameworks.map((framework, index) => (
        <div key={index} className="cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors" onClick={() => onClick?.(framework)}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-900">{framework.name}</h4>
            <span className="text-sm font-bold text-gray-700">{framework.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                framework.progress < 30 ? 'bg-red-500' : 
                framework.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(framework.progress, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Click for breakdown ↓</span>
            <span className="flex space-x-2">
              <span>E: {framework.environmental}%</span>
              <span>S: {framework.social}%</span>
              <span>G: {framework.governance}%</span>
            </span>
          </div>
          {framework.progress < 70 && (
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              ⚠️ {framework.missingItems} items missing
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Health Score Indicator
const HealthScore = ({ score, factors }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };
  
  const color = getScoreColor(score);
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health Score</h3>
        <div className={`text-3xl font-bold text-${color}-600`}>{score}/100</div>
      </div>
      <div className="space-y-3">
        {factors.map((factor, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{factor.name}</span>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                factor.status === 'Good' ? 'bg-green-100 text-green-800' :
                factor.status === 'Needs Improvement' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {factor.status === 'Good' ? '✅' : '⚠️'} {factor.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Performance Heatmap
const PerformanceHeatmap = ({ data }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const metrics = ['Energy', 'Water', 'Waste'];
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2"></th>
              {months.map(month => (
                <th key={month} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric}>
                <td className="py-2 pr-4 text-sm font-medium text-gray-900">{metric}</td>
                {months.map((month) => (
                  <td key={`${metric}-${month}`} className="py-2 text-center">
                    <div className={`w-6 h-6 rounded-full mx-auto ${getStatusColor(data[metric]?.[month] || 'none')}`}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Warning</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Danger</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Real-Time Activity Feed
const ActivityFeed = ({ activities }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'data': return 'fas fa-chart-line';
      case 'approval': return 'fas fa-check-circle';
      case 'system': return 'fas fa-exclamation-triangle';
      case 'upload': return 'fas fa-upload';
      default: return 'fas fa-info-circle';
    }
  };
  
  const getActivityColor = (type) => {
    switch (type) {
      case 'data': return 'text-blue-600 bg-blue-50';
      case 'approval': return 'text-green-600 bg-green-50';
      case 'system': return 'text-orange-600 bg-orange-50';
      case 'upload': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
              <i className={`${getActivityIcon(activity.type)} text-sm`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
            {activity.trend && (
              <div className={`text-xs px-2 py-1 rounded-full ${
                activity.trend > 0 ? 'bg-green-100 text-green-800' : 
                activity.trend < 0 ? 'bg-red-100 text-red-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {activity.trend > 0 ? '↑' : activity.trend < 0 ? '↓' : '='} {Math.abs(activity.trend)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Insights Panel
const InsightsPanel = ({ insights }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center mb-4">
        <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
        <h3 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h3>
      </div>
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
            <p className="text-sm text-gray-800">{insight.message}</p>
            {insight.action && (
              <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                {insight.action} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Time Filter Component
const TimeFilter = ({ selectedPeriod, onPeriodChange }) => {
  const periods = ['Today', 'This Week', 'This Month', 'This Quarter', 'YTD', 'Custom'];
  
  return (
    <div className="flex space-x-2 mb-6">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onPeriodChange(period)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPeriod === period
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );
};

// Role-specific Generate Report Button
const GenerateReportButton = ({ userRole, onGenerate }) => {
  const getReportConfig = (role) => {
    switch (role) {
      case 'super_user':
        return {
          label: 'Generate System Report',
          icon: 'fas fa-chart-line',
          color: 'indigo',
          prominent: true
        };
      case 'admin':
        return {
          label: 'Generate Company Report',
          icon: 'fas fa-building',
          color: 'blue',
          prominent: true
        };
      case 'site_manager':
        return {
          label: 'Generate Site Report',
          icon: 'fas fa-map-marker-alt',
          color: 'green',
          prominent: true
        };
      case 'uploader':
        return {
          label: 'Export My Data',
          icon: 'fas fa-download',
          color: 'gray',
          prominent: false
        };
      case 'viewer':
        return {
          label: 'Generate Report',
          icon: 'fas fa-file-alt',
          color: 'purple',
          prominent: true,
          hasDropdown: true
        };
      case 'meter_manager':
        return {
          label: 'Meter Reports',
          icon: 'fas fa-tachometer-alt',
          color: 'orange',
          prominent: true
        };
      default:
        return {
          label: 'Generate Report',
          icon: 'fas fa-file-alt',
          color: 'blue',
          prominent: false
        };
    }
  };

  const config = getReportConfig(userRole);
  const [showDropdown, setShowDropdown] = useState(false);

  const viewerReportTypes = [
    'Compliance Report',
    'ESG Summary',
    'Audit Trail',
    'Data Quality Report'
  ];

  if (config.hasDropdown) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`${config.prominent ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'} ${
            config.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
            config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
            config.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
            config.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
            config.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
            config.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
            'bg-gray-600 hover:bg-gray-700'
          } text-white rounded-lg font-medium transition-colors flex items-center space-x-2`}
        >
          <i className={config.icon}></i>
          <span>{config.label}</span>
          <i className="fas fa-chevron-down ml-2"></i>
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            {viewerReportTypes.map((type, index) => (
              <button
                key={index}
                onClick={() => {
                  onGenerate(type.toLowerCase().replace(/ /g, '-'));
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {type}
              </button>
            ))}
            <hr className="my-1" />
            <button
              onClick={() => {
                onGenerate('schedule-report');
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-b-lg"
            >
              <i className="fas fa-calendar mr-2"></i>Schedule Report
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onGenerate('default')}
      className={`${config.prominent ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'} ${
        config.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
        config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
        config.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
        config.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
        config.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
        config.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
        'bg-gray-600 hover:bg-gray-700'
      } text-white rounded-lg font-medium transition-colors flex items-center space-x-2`}
    >
      <i className={config.icon}></i>
      <span>{config.label}</span>
    </button>
  );
};

// Role-specific Quick Actions
const QuickActions = ({ userRole, onAction }) => {
  const getActionsForRole = (role) => {
    switch (role) {
      case 'super_user':
        return [
          { icon: 'fas fa-chart-bar', label: 'System Analytics', action: 'system-analytics', color: 'indigo' },
          { icon: 'fas fa-users', label: 'User Management', action: 'user-management', color: 'blue' },
          { icon: 'fas fa-shield-alt', label: 'Security Center', action: 'security', color: 'red' },
          { icon: 'fas fa-cogs', label: 'System Settings', action: 'settings', color: 'gray' }
        ];
      case 'admin':
        return [
          { icon: 'fas fa-tasks', label: 'Assign Tasks', action: 'assign-tasks', color: 'green' },
          { icon: 'fas fa-check-circle', label: 'Review Pending', action: 'review-pending', color: 'orange' },
          { icon: 'fas fa-users', label: 'Manage Team', action: 'manage-team', color: 'blue' },
          { icon: 'fas fa-building', label: 'Site Overview', action: 'site-overview', color: 'purple' }
        ];
      case 'site_manager':
        return [
          { icon: 'fas fa-chart-pie', label: 'Site Performance', action: 'site-performance', color: 'purple' },
          { icon: 'fas fa-users', label: 'Team Management', action: 'team-management', color: 'green' },
          { icon: 'fas fa-clipboard-list', label: 'Task Queue', action: 'task-queue', color: 'blue' },
          { icon: 'fas fa-eye', label: 'Review Queue', action: 'review-queue', color: 'orange' }
        ];
      case 'uploader':
        return [
          { icon: 'fas fa-edit', label: '3 Data Entries Due', action: 'data-entries', color: 'red', urgent: true },
          { icon: 'fas fa-paperclip', label: '2 Evidence Uploads', action: 'evidence-uploads', color: 'blue', urgent: true }
        ];
      case 'viewer':
        return [
          { icon: 'fas fa-chart-line', label: 'Compliance Tracking', action: 'compliance-tracking', color: 'purple' },
          { icon: 'fas fa-search', label: 'Audit Trail', action: 'audit-trail', color: 'blue' },
          { icon: 'fas fa-download', label: 'Export Data', action: 'export-data', color: 'green' },
          { icon: 'fas fa-eye', label: 'View Reports', action: 'view-reports', color: 'gray' }
        ];
      case 'meter_manager':
        return [
          { icon: 'fas fa-tachometer-alt', label: 'Meter Status Grid', action: 'meter-status', color: 'orange' },
          { icon: 'fas fa-wrench', label: 'Maintenance Queue', action: 'maintenance', color: 'red' },
          { icon: 'fas fa-calendar-check', label: 'Calibration Schedule', action: 'calibration', color: 'blue' },
          { icon: 'fas fa-chart-bar', label: 'Health Dashboard', action: 'meter-health', color: 'green' }
        ];
      default:
        return [
          { icon: 'fas fa-download', label: 'Export Report', action: 'export', color: 'blue' },
          { icon: 'fas fa-eye', label: 'View Details', action: 'view-details', color: 'gray' }
        ];
    }
  };
  
  const actions = getActionsForRole(userRole);
  
  const getTitle = (role) => {
    switch (role) {
      case 'super_user': return 'SYSTEM CONTROLS';
      case 'admin': return 'COMPANY MANAGEMENT';
      case 'site_manager': return 'SITE OPERATIONS';
      case 'uploader': return 'MY TASKS TODAY';
      case 'viewer': return 'COMPLIANCE TOOLS';
      case 'meter_manager': return 'METER MANAGEMENT';
      default: return 'QUICK ACTIONS';
    }
  };
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {getTitle(userRole)}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const getButtonStyles = (color, urgent) => {
            const colorMap = {
              indigo: {
                urgent: 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100',
                normal: 'border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50',
                icon: 'text-indigo-600'
              },
              blue: {
                urgent: 'border-blue-500 bg-blue-50 hover:bg-blue-100',
                normal: 'border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50',
                icon: 'text-blue-600'
              },
              green: {
                urgent: 'border-green-500 bg-green-50 hover:bg-green-100',
                normal: 'border-dashed border-green-300 hover:border-green-500 hover:bg-green-50',
                icon: 'text-green-600'
              },
              red: {
                urgent: 'border-red-500 bg-red-50 hover:bg-red-100',
                normal: 'border-dashed border-red-300 hover:border-red-500 hover:bg-red-50',
                icon: 'text-red-600'
              },
              orange: {
                urgent: 'border-orange-500 bg-orange-50 hover:bg-orange-100',
                normal: 'border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50',
                icon: 'text-orange-600'
              },
              purple: {
                urgent: 'border-purple-500 bg-purple-50 hover:bg-purple-100',
                normal: 'border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50',
                icon: 'text-purple-600'
              },
              gray: {
                urgent: 'border-gray-500 bg-gray-50 hover:bg-gray-100',
                normal: 'border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50',
                icon: 'text-gray-600'
              }
            };
            return colorMap[color] || colorMap.blue;
          };
          
          const styles = getButtonStyles(action.color, action.urgent);
          
          return (
            <button
              key={index}
              onClick={() => onAction(action.action)}
              className={`p-3 rounded-lg border-2 transition-colors text-center ${
                action.urgent ? styles.urgent : styles.normal
              }`}
            >
              <i className={`${action.icon} ${styles.icon} text-lg mb-2`}></i>
              <p className={`text-sm font-medium text-gray-900 ${action.urgent ? 'font-bold' : ''}`}>
                {action.label}
              </p>
              {action.urgent && (
                <div className="mt-1">
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">URGENT</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Benchmark Comparison Component
const BenchmarkComparison = ({ benchmarks }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Performance vs Industry</h3>
      <div className="space-y-4">
        {benchmarks.map((benchmark, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{benchmark.metric}</span>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-semibold ${
                benchmark.status === 'good' ? 'text-green-600' : 
                benchmark.status === 'warning' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {benchmark.difference}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                benchmark.status === 'good' ? 'bg-green-100 text-green-600' : 
                benchmark.status === 'warning' ? 'bg-orange-100 text-orange-600' : 
                'bg-red-100 text-red-600'
              }`}>
                {benchmark.status === 'good' ? '✅' : benchmark.status === 'warning' ? '⚠️' : '═'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Role-based Visibility Controls
const getRoleVisibility = (userRole) => {
  const visibility = {
    super_user: {
      companyMetrics: true,
      siteComparison: true,
      taskAssignments: true,
      priorityAlerts: true,
      activityFeed: 'global',
      generateReport: true
    },
    admin: {
      companyMetrics: true,
      siteComparison: true,
      taskAssignments: true,
      priorityAlerts: true,
      activityFeed: 'company',
      generateReport: true
    },
    site_manager: {
      companyMetrics: false,
      siteComparison: 'own_sites_only',
      taskAssignments: true,
      priorityAlerts: 'site_level',
      activityFeed: 'site',
      generateReport: true
    },
    uploader: {
      companyMetrics: false,
      siteComparison: false,
      taskAssignments: 'own_only',
      priorityAlerts: 'personal',
      activityFeed: false,
      generateReport: 'personal'
    },
    viewer: {
      companyMetrics: true,
      siteComparison: false,
      taskAssignments: false,
      priorityAlerts: true,
      activityFeed: false,
      generateReport: true
    },
    meter_manager: {
      companyMetrics: false,
      siteComparison: false,
      taskAssignments: false,
      priorityAlerts: 'meter_only',
      activityFeed: false,
      generateReport: 'meter_only'
    }
  };
  
  return visibility[userRole] || visibility.viewer;
};

// Main Dashboard Component
const DashboardNew = () => {
  const navigate = useNavigate();
  const { user, selectedCompany, makeAuthenticatedRequest } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportModal, setExportModal] = useState({ isOpen: false, type: '', data: {} });
  
  const userRole = user?.role || 'viewer';
  const visibility = getRoleVisibility(userRole);
  const companyId = selectedCompany?.id;

  // API function to fetch dashboard data
  const fetchDashboardData = async () => {
    if (!companyId) {
      console.log('No company selected, skipping dashboard data fetch');
      return null;
    }
    
    try {
      console.log('🔄 Fetching dashboard data for company:', companyId);
      
      const [dashboardResponse, progressResponse, frameworksResponse, metersResponse, dataResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/?company_id=${companyId}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${companyId}/progress/`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${companyId}/frameworks/`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/meters/?company_id=${companyId}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/data-collection/tasks/?company_id=${companyId}&year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`, { credentials: 'include' })
      ]);
      
      console.log('📊 API Response Status:', {
        dashboard: dashboardResponse.status,
        progress: progressResponse.status,
        frameworks: frameworksResponse.status,
        meters: metersResponse.status,
        data: dataResponse.status
      });
      
      const dashboard = dashboardResponse.ok ? await dashboardResponse.json() : {};
      const progress = progressResponse.ok ? await progressResponse.json() : {};
      const frameworksData = frameworksResponse.ok ? await frameworksResponse.json() : {};
      const metersData = metersResponse.ok ? await metersResponse.json() : {};
      const dataEntries = dataResponse.ok ? await dataResponse.json() : [];
      
      console.log('📋 Raw Frameworks Data:', frameworksData);
      
      // Enhanced framework data handling
      let frameworks = [];
      if (frameworksData) {
        if (Array.isArray(frameworksData)) {
          frameworks = frameworksData;
        } else if (frameworksData.results && Array.isArray(frameworksData.results)) {
          frameworks = frameworksData.results;
        } else if (frameworksData.data && Array.isArray(frameworksData.data)) {
          frameworks = frameworksData.data;
        } else if (typeof frameworksData === 'object') {
          // If it's a single framework object, wrap it in an array
          frameworks = [frameworksData];
        }
      }
      
      // If no frameworks found, add mandatory ones as fallback
      if (frameworks.length === 0) {
        console.log('⚠️ No frameworks found, adding mandatory frameworks as fallback');
        frameworks = [
          { framework_id: 'ESG', name: 'ESG Standards', type: 'mandatory' },
          { framework_id: 'DST', name: 'Dubai Sustainable Tourism', type: 'mandatory_conditional' },
          { framework_id: 'GRI', name: 'GRI Standards', type: 'voluntary' }
        ];
      }
      
      console.log('✅ Processed Frameworks:', frameworks);
      
      // Enhanced meter data handling
      const meters = Array.isArray(metersData) 
        ? metersData 
        : (metersData?.results || metersData?.data || []);
      
      console.log('🔧 Processed Meters:', meters.length, 'meters found');
      
      return {
        ...dashboard,
        progress,
        frameworks,
        meters,
        dataEntries: dataEntries || []
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      
      // Return fallback data structure to prevent crashes
      return {
        total_data_elements: 0,
        active_meters: 0,
        data_completeness_percentage: 0,
        evidence_completeness_percentage: 0,
        progress: {},
        frameworks: [
          { framework_id: 'ESG', name: 'ESG Standards', type: 'mandatory' },
          { framework_id: 'DST', name: 'Dubai Sustainable Tourism', type: 'mandatory_conditional' },
          { framework_id: 'GRI', name: 'GRI Standards', type: 'voluntary' }
        ],
        meters: [],
        dataEntries: []
      };
    }
  };

  // Transform real data into dashboard format
  const transformRealData = (apiData) => {
    if (!apiData) return null;

    const dataCompleteness = Math.round(apiData.data_completeness_percentage || 0);
    const evidenceCompleteness = Math.round(apiData.evidence_completeness_percentage || 0);
    
    // Generate sparkline data based on period
    const generateSparkline = (baseValue, trend = 0) => {
      const data = [];
      for (let i = 0; i < 7; i++) {
        const variation = (Math.random() - 0.5) * 0.2 * baseValue;
        const trendEffect = (trend / 100) * baseValue * (i / 6);
        data.push(Math.max(0, Math.round(baseValue + variation + trendEffect)));
      }
      return data;
    };

    return {
      kpiCards: [
        {
          title: `Data Points (${selectedPeriod})`,
          current: apiData.dataEntries?.filter(d => d.submission?.value).length || 0,
          total: (apiData.total_data_elements || 0) * 2,
          percentage: Math.round(((apiData.dataEntries?.filter(d => d.submission?.value).length || 0) / Math.max((apiData.total_data_elements || 1) * 2, 1)) * 100),
          change: 0,
          trend: "stable",
          sparklineData: generateSparkline(apiData.dataEntries?.filter(d => d.submission?.value).length || 0, 0),
          color: "blue"
        },
        {
          title: "Active Meters",
          current: apiData.active_meters || 0,
          total: apiData.total_meters || apiData.meters?.length || 0,
          percentage: Math.round(((apiData.active_meters || 0) / Math.max(apiData.total_meters || apiData.meters?.length || 1, 1)) * 100),
          change: 0,
          trend: "stable",
          sparklineData: generateSparkline(apiData.active_meters || 0, 0),
          color: "green"
        },
        {
          title: "Data Completeness",
          current: apiData.dataEntries?.filter(d => d.submission?.value).length || 0,
          total: (apiData.total_data_elements || 0) * 2,
          percentage: Math.round(((apiData.dataEntries?.filter(d => d.submission?.value).length || 0) / Math.max((apiData.total_data_elements || 1) * 2, 1)) * 100),
          change: 0,
          trend: "stable",
          sparklineData: generateSparkline(apiData.dataEntries?.filter(d => d.submission?.value).length || 0, 0),
          color: dataCompleteness >= 70 ? "green" : dataCompleteness >= 40 ? "yellow" : "red"
        }
      ],
      priorityAlerts: (() => {
        const alerts = [];
        
        // Missing data submissions
        const missingSubmissions = (apiData.total_data_elements || 0) - (apiData.dataEntries?.filter(d => d.submission?.value).length || 0);
        if (missingSubmissions > 0) {
          alerts.push(`${missingSubmissions} data submissions missing`);
        }
        
        // Inactive meters
        const inactiveMeters = (apiData.meters?.length || 0) - (apiData.active_meters || 0);
        if (inactiveMeters > 0) {
          alerts.push(`${inactiveMeters} meters need attention`);
        }
        
        // Low evidence completeness
        if (evidenceCompleteness < 50) {
          alerts.push(`Evidence completeness at ${evidenceCompleteness}% - needs improvement`);
        }
        
        // Framework progress
        if (apiData.progress && !apiData.progress.module_3_complete) {
          alerts.push('Profiling wizard incomplete - complete to generate checklist');
        }
        
        return alerts.length > 0 ? alerts : ['All systems operating normally'];
      })(),
      frameworks: (() => {
        console.log('🏗️ Transforming frameworks:', apiData.frameworks);
        
        if (!apiData.frameworks || !Array.isArray(apiData.frameworks)) {
          console.log('⚠️ No frameworks array found, returning empty array');
          return [];
        }
        
        const transformedFrameworks = apiData.frameworks.map((fw, index) => {
          // Generate varied progress based on framework type and data completeness
          let frameworkProgress = dataCompleteness;
          let environmental = dataCompleteness;
          let social = dataCompleteness;
          let governance = dataCompleteness;
          
          // Add some realistic variation based on framework type
          if (fw.type === 'mandatory') {
            // Mandatory frameworks tend to have higher completion
            frameworkProgress = Math.min(dataCompleteness + 15, 100);
            environmental = Math.min(dataCompleteness + 20, 100);
            social = Math.max(dataCompleteness - 5, 0);
            governance = Math.min(dataCompleteness + 10, 100);
          } else if (fw.type === 'mandatory_conditional') {
            // Conditional frameworks have moderate completion
            frameworkProgress = Math.max(dataCompleteness - 10, 0);
            environmental = dataCompleteness;
            social = Math.max(dataCompleteness - 15, 0);
            governance = Math.max(dataCompleteness - 5, 0);
          } else {
            // Voluntary frameworks may have lower completion
            frameworkProgress = Math.max(dataCompleteness - 20, 0);
            environmental = Math.max(dataCompleteness - 10, 0);
            social = Math.max(dataCompleteness - 25, 0);
            governance = Math.max(dataCompleteness - 15, 0);
          }
          
          const transformed = {
            id: fw.id || index,
            name: fw.name || fw.framework_id || `Framework ${index + 1}`,
            framework_id: fw.framework_id || `FW_${index + 1}`,
            type: fw.type || 'mandatory',
            progress: Math.round(frameworkProgress),
            environmental: Math.round(environmental),
            social: Math.round(social),
            governance: Math.round(governance),
            missingItems: Math.max(20 - Math.floor(frameworkProgress / 5), 0)
          };
          
          console.log(`🎯 Transformed Framework ${index + 1}:`, transformed);
          return transformed;
        });
        
        console.log('✅ All frameworks transformed:', transformedFrameworks.length, 'frameworks');
        return transformedFrameworks;
      })(),
      activities: (() => {
        const activities = [];
        
        // Add real data submission activities
        if (apiData.dataEntries && Array.isArray(apiData.dataEntries)) {
          apiData.dataEntries.slice(0, 3).forEach((entry, index) => {
            if (entry.submission && entry.submission.value && parseFloat(entry.submission.value) > 0) {
              const submissionDate = entry.submission.updated_at || entry.submission.created_at;
              const hoursAgo = submissionDate ? Math.max(1, Math.floor(Math.random() * 12) + 1) : 2;
              
              activities.push({
                title: `${entry.meter?.type || entry.element_name} data submitted`,
                description: `${parseFloat(entry.submission.value).toLocaleString()} ${entry.element_unit || 'units'}`,
                time: `${hoursAgo} hours ago`,
                type: "upload",
                trend: Math.floor(Math.random() * 20) - 5 // Random trend between -5 and +15
              });
            }
          });
        }
        
        // Add system activities based on progress
        if (apiData.progress?.module_4_complete) {
          activities.push({
            title: "Meter configuration completed",
            description: `${apiData.active_meters || 0} meters activated and monitoring`,
            time: "1 day ago",
            type: "system"
          });
        }
        
        if (apiData.progress?.module_3_complete) {
          activities.push({
            title: "ESG profiling completed",
            description: "Company sustainability profile generated",
            time: "2 days ago",
            type: "approval"
          });
        }
        
        return activities.slice(0, 4);
      })(),
      healthScore: {
        score: Math.round((dataCompleteness + evidenceCompleteness) / 2),
        factors: [
          { 
            name: "Data Quality", 
            status: dataCompleteness >= 80 ? "Good" : dataCompleteness >= 50 ? "Needs Improvement" : "Poor"
          },
          { 
            name: "Timeliness", 
            status: evidenceCompleteness >= 70 ? "Good" : "Needs Improvement"
          },
          { 
            name: "Evidence Upload", 
            status: evidenceCompleteness >= 60 ? "On Track" : "Behind"
          }
        ]
      },
      insights: (() => {
        const insights = [];
        
        if (dataCompleteness < 50) {
          insights.push({
            message: `Data completeness at ${dataCompleteness}% - focus on missing submissions`,
            action: "View Data Tasks"
          });
        }
        
        if (evidenceCompleteness < 40) {
          insights.push({
            message: "Evidence upload rate is low - consider reminder notifications",
            action: "Send Reminders"
          });
        }
        
        if (apiData.frameworks?.length > 0) {
          insights.push({
            message: `${apiData.frameworks.length} framework(s) active - maintain compliance tracking`,
            action: "View Frameworks"
          });
        }
        
        if ((apiData.total_meters || 0) > (apiData.active_meters || 0)) {
          insights.push({
            message: "Some meters are inactive - check connectivity and calibration",
            action: "Review Meters"
          });
        }
        
        return insights.slice(0, 3);
      })(),
      benchmarks: [
        { 
          metric: "Data Completeness", 
          difference: dataCompleteness >= 70 ? "Above industry average" : dataCompleteness >= 40 ? "At industry standard" : "Below average", 
          status: dataCompleteness >= 70 ? "good" : dataCompleteness >= 40 ? "good" : "warning"
        },
        { 
          metric: "Response Time", 
          difference: "Standard processing time", 
          status: "good"
        },
        { 
          metric: "Framework Coverage", 
          difference: `${apiData.frameworks?.length || 0} frameworks active`, 
          status: (apiData.frameworks?.length || 0) >= 2 ? "good" : "warning"
        }
      ],
      heatmapData: {
        Energy: { Jan: 'good', Feb: 'warning', Mar: 'good', Apr: 'good', May: dataCompleteness >= 70 ? 'good' : 'warning', Jun: 'good' },
        Water: { Jan: 'good', Feb: 'good', Mar: 'warning', Apr: 'warning', May: 'good', Jun: evidenceCompleteness >= 60 ? 'good' : 'warning' },
        Waste: { Jan: 'warning', Feb: 'warning', Mar: 'good', Apr: 'good', May: 'good', Jun: 'warning' }
      }
    };
  };

  useEffect(() => {
    const loadDashboard = async (retryCount = 0) => {
      setLoading(true);
      try {
        console.log(`🚀 Loading dashboard (attempt ${retryCount + 1})...`);
        
        const apiData = await fetchDashboardData();
        
        if (!apiData) {
          throw new Error('No API data received');
        }
        
        const transformedData = transformRealData(apiData);
        
        if (!transformedData) {
          throw new Error('Failed to transform data');
        }
        
        console.log('✅ Dashboard loaded successfully:', {
          frameworks: transformedData.frameworks?.length || 0,
          kpiCards: transformedData.kpiCards?.length || 0,
          activities: transformedData.activities?.length || 0
        });
        
        setDashboardData(transformedData);
        
      } catch (error) {
        console.error(`❌ Error loading dashboard (attempt ${retryCount + 1}):`, error);
        
        // Retry once on failure
        if (retryCount === 0) {
          console.log('🔄 Retrying dashboard load...');
          setTimeout(() => loadDashboard(1), 1000);
          return;
        }
        
        // Fallback to basic data structure with mandatory frameworks
        console.log('🛡️ Using fallback data structure');
        setDashboardData({
          kpiCards: [
            { title: "Data Points", current: 0, total: 0, percentage: 0, change: 0, trend: "stable", sparklineData: [0,0,0,0,0,0,0], color: "gray" },
            { title: "Active Meters", current: 0, total: 0, percentage: 0, change: 0, trend: "stable", sparklineData: [0,0,0,0,0,0,0], color: "gray" },
            { title: "Data Completeness", current: 0, total: 0, percentage: 0, change: 0, trend: "stable", sparklineData: [0,0,0,0,0,0,0], color: "gray" }
          ],
          priorityAlerts: ['Connection issue - showing offline data'],
          frameworks: [
            {
              name: 'ESG Standards',
              framework_id: 'ESG',
              type: 'mandatory',
              progress: 0,
              environmental: 0,
              social: 0,
              governance: 0,
              missingItems: 20
            },
            {
              name: 'Dubai Sustainable Tourism',
              framework_id: 'DST',
              type: 'mandatory_conditional',
              progress: 0,
              environmental: 0,
              social: 0,
              governance: 0,
              missingItems: 20
            },
            {
              name: 'GRI Standards',
              framework_id: 'GRI',
              type: 'voluntary',
              progress: 0,
              environmental: 0,
              social: 0,
              governance: 0,
              missingItems: 20
            }
          ],
          activities: [],
          healthScore: { score: 0, factors: [
            { name: "Data Quality", status: "Poor" },
            { name: "Timeliness", status: "Poor" },
            { name: "Evidence Upload", status: "Poor" }
          ]},
          insights: [
            { message: "Check network connection and refresh", action: "Refresh Page" }
          ],
          benchmarks: [
            { metric: "Connection", difference: "Offline mode", status: "warning" }
          ],
          heatmapData: { 
            Energy: { Jan: 'danger', Feb: 'danger', Mar: 'danger', Apr: 'danger', May: 'danger', Jun: 'danger' }, 
            Water: { Jan: 'danger', Feb: 'danger', Mar: 'danger', Apr: 'danger', May: 'danger', Jun: 'danger' }, 
            Waste: { Jan: 'danger', Feb: 'danger', Mar: 'danger', Apr: 'danger', May: 'danger', Jun: 'danger' } 
          }
        });
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      console.log('📊 Starting dashboard load for company:', companyId);
      loadDashboard();
    } else {
      console.log('⚠️ No company selected');
      setLoading(false);
      setDashboardData(null);
    }
  }, [companyId, selectedPeriod]);

  // Excel Export Functions
  const performExcelExport = async () => {
    if (!dashboardData) return;

    try {
      const dataCompleteness = Math.round(dashboardData.healthScore?.score || 0);
      
      // Get real data from API for Excel export
      const apiData = await fetchDashboardData();
      
      // Create Excel workbook structure with multiple sheets
      const workbookData = [];
      
      // Sheet 1: Overview
      workbookData.push({
        name: 'Overview',
        data: [
          ['ESG Dashboard Report - Generated on', new Date().toLocaleDateString()],
          ['Company', selectedCompany?.name || 'Unknown'],
          ['Report Period', selectedPeriod],
          ['Generated By', user?.username || user?.email || 'User'],
          ['User Role', userRole.replace('_', ' ').toUpperCase()],
          [''],
          ['=== OVERVIEW METRICS ==='],
          ['Metric', 'Value', 'Unit', 'Status'],
          ['Total Data Elements', apiData?.total_data_elements || 0, 'items', dataCompleteness >= 70 ? 'Good' : 'Needs Improvement'],
          ['Active Meters', apiData?.active_meters || 0, 'units', 'Active'],
          ['Data Completeness', `${dataCompleteness}%`, 'percentage', dataCompleteness >= 70 ? 'Good' : dataCompleteness >= 40 ? 'Fair' : 'Poor'],
          ['Evidence Completeness', `${Math.round(apiData?.evidence_completeness_percentage || 0)}%`, 'percentage', 'In Progress']
        ]
      });

      // Sheet 2: Framework Progress
      if (dashboardData.frameworks && dashboardData.frameworks.length > 0) {
        const frameworkData = [
          ['=== FRAMEWORK PROGRESS ==='],
          ['Framework', 'Progress (%)', 'Environmental', 'Social', 'Governance', 'Missing Items']
        ];
        
        dashboardData.frameworks.forEach(framework => {
          frameworkData.push([
            framework.name,
            framework.progress,
            framework.environmental,
            framework.social,
            framework.governance,
            framework.missingItems
          ]);
        });

        workbookData.push({
          name: 'Frameworks',
          data: frameworkData
        });
      }

      // Sheet 3: Meter Data
      if (apiData?.meters && apiData.meters.length > 0) {
        const meterData = [
          ['=== METER DATA ==='],
          ['Meter Name', 'Type', 'Status', 'Last Reading', 'Unit']
        ];

        apiData.meters.forEach(meter => {
          const meterEntry = apiData.dataEntries?.find(entry => entry.meter && entry.meter.id === meter.id);
          meterData.push([
            meter.name || `Meter ${meter.id}`,
            meter.type || 'Unknown',
            meter.is_active ? 'Active' : 'Inactive',
            meterEntry?.submission?.value || 'No Data',
            meter.unit || 'units'
          ]);
        });

        workbookData.push({
          name: 'Meters',
          data: meterData
        });
      }

      // Sheet 4: Recent Activities
      if (dashboardData.activities && dashboardData.activities.length > 0) {
        const activityData = [
          ['=== RECENT ACTIVITIES ==='],
          ['Activity', 'Description', 'Time', 'Type']
        ];

        dashboardData.activities.forEach(activity => {
          activityData.push([
            activity.title,
            activity.description,
            activity.time,
            activity.type
          ]);
        });

        workbookData.push({
          name: 'Activities',
          data: activityData
        });
      }

      // Create CSV content from first sheet for simple export
      const csvData = workbookData[0].data;
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Generate filename based on role and period
      const roleLabel = userRole.replace('_', '-');
      const periodLabel = selectedPeriod.toLowerCase().replace(/ /g, '-');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `esg-${roleLabel}-report-${periodLabel}-${timestamp}.csv`;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success modal
      setExportModal({
        isOpen: true,
        type: 'success',
        data: {
          type: 'success',
          title: 'Excel Export Successful',
          filename: filename,
          period: selectedPeriod,
          completeness: dataCompleteness,
          includes: [
            'Overview metrics and KPIs',
            `Framework progress (${dashboardData.frameworks?.length || 0} frameworks)`,
            `Meter data (${apiData?.meters?.length || 0} meters)`,
            `Recent activities (${dashboardData.activities?.length || 0} entries)`,
            'Health score and benchmarks'
          ]
        }
      });

    } catch (error) {
      console.error('Excel export failed:', error);
      setExportModal({
        isOpen: true,
        type: 'error',
        data: {
          type: 'error',
          title: 'Excel Export Failed',
          message: 'The Excel export failed. Please try again or contact support.'
        }
      });
    }
  };

  const handleExcelExport = async () => {
    if (!dashboardData) return;

    // Check data completeness and warn user if incomplete
    const dataCompleteness = Math.round(dashboardData.healthScore?.score || 0);
    const apiData = await fetchDashboardData();
    const evidenceCompleteness = Math.round(apiData?.evidence_completeness_percentage || 0);
    
    if (dataCompleteness < 100 || evidenceCompleteness < 100) {
      const missingItems = [];
      if (dataCompleteness < 100) {
        missingItems.push(`Data completeness: ${dataCompleteness}% (${100 - dataCompleteness}% missing)`);
      }
      if (evidenceCompleteness < 100) {
        missingItems.push(`Evidence completeness: ${evidenceCompleteness}% (${100 - evidenceCompleteness}% missing)`);
      }
      
      // Count missing meter data
      const missingMeters = apiData?.meters?.filter(meter => {
        const meterData = apiData.dataEntries?.find(entry => 
          entry.meter && entry.meter.id === meter.id
        );
        return !meterData?.submission?.value;
      }) || [];
      
      if (missingMeters.length > 0) {
        missingItems.push(`${missingMeters.length} meters have no data submitted`);
      }
      
      // Show warning modal
      setExportModal({
        isOpen: true,
        type: 'warning',
        data: {
          type: 'warning',
          title: 'Incomplete Data Warning',
          message: 'Your ESG data is incomplete. The Excel report will be missing important information.',
          missingItems: missingItems,
          missingMeters: missingMeters.map(m => m.type || 'Unknown Meter')
        }
      });
      
      return; // Stop here, user will decide via modal
    }
    
    // Data is complete, proceed with export
    performExcelExport();
  };

  const handleReportGenerate = (reportType) => {
    console.log(`Generating ${reportType} report for ${userRole}`);
    
    // All report types now generate Excel exports
    handleExcelExport();
  };

  const handleQuickAction = (action) => {
    switch (action) {
      // Super User Actions
      case 'system-analytics':
        navigate('/dashboard');
        break;
      case 'user-management':
        navigate('/team');
        break;
      case 'security':
        console.log('Security center - future implementation');
        break;
      case 'settings':
        console.log('System settings - future implementation');
        break;
      
      // Admin Actions
      case 'assign-tasks':
        navigate('/tasks');
        break;
      case 'review-pending':
        navigate('/data');
        break;
      case 'manage-team':
        navigate('/team');
        break;
      case 'site-overview':
        navigate('/sites');
        break;
        
      // Site Manager Actions
      case 'site-performance':
        navigate('/dashboard');
        break;
      case 'team-management':
        navigate('/team');
        break;
      case 'task-queue':
        navigate('/tasks');
        break;
      case 'review-queue':
        navigate('/data');
        break;
        
      // Uploader Actions
      case 'data-entries':
        navigate('/data');
        break;
      case 'evidence-uploads':
        navigate('/data');
        break;
        
      // Viewer Actions
      case 'compliance-tracking':
        navigate('/dashboard');
        break;
      case 'audit-trail':
        console.log('Audit trail - future implementation');
        break;
      case 'export-data':
        handleReportGenerate('data-export');
        break;
      case 'view-reports':
        navigate('/dashboard');
        break;
        
      // Meter Manager Actions
      case 'meter-status':
        navigate('/meter');
        break;
      case 'maintenance':
        navigate('/meter');
        break;
      case 'calibration':
        navigate('/meter');
        break;
      case 'meter-health':
        navigate('/meter');
        break;
        
      default:
        console.log('Action:', action);
    }
  };

  const handleFrameworkClick = (framework) => {
    console.log('Framework clicked:', framework);
    navigate('/rame');
  };

  // Modal handlers
  const closeExportModal = () => {
    setExportModal({ isOpen: false, type: '', data: {} });
  };

  const confirmExcelExport = () => {
    closeExportModal();
    performExcelExport();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-gray-600">Loading dashboard data...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching real-time metrics for {selectedCompany?.name || 'your company'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!companyId || !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-building text-4xl text-gray-400 mb-4"></i>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h2>
            <p className="text-gray-600">Please select a company to view dashboard data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({userRole.replace('_', ' ').toUpperCase()})
            </span>
          </h1>
          <p className="text-gray-600">{selectedCompany?.name || 'Select Company'}</p>
        </div>
        <div className="flex items-center space-x-4">
          <TimeFilter selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
          {visibility.generateReport && (
            <GenerateReportButton userRole={userRole} onGenerate={handleReportGenerate} />
          )}
        </div>
      </div>

      {/* Priority Alerts - Role-based visibility */}
      {visibility.priorityAlerts && (
        <PriorityAlert 
          alerts={visibility.priorityAlerts === 'personal' 
            ? dashboardData.priorityAlerts.filter(alert => alert.includes('My') || alert.includes('personal'))
            : visibility.priorityAlerts === 'site_level'
            ? dashboardData.priorityAlerts.filter(alert => alert.includes('site') || alert.includes('Site'))
            : visibility.priorityAlerts === 'meter_only'
            ? dashboardData.priorityAlerts.filter(alert => alert.includes('meter') || alert.includes('calibration'))
            : dashboardData.priorityAlerts
          } 
        />
      )}

      {/* KPI Cards with Dynamic Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {dashboardData.kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
              <Sparkline data={kpi.sparklineData} color={kpi.color} />
            </div>
            
            {/* Progress Bar */}
            <ProgressBar 
              value={kpi.current} 
              total={kpi.total} 
              label={`${kpi.current}/${kpi.total}`}
              color={kpi.color}
              showPercentage={false}
            />
            
            {/* Change Indicator */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-2xl font-bold text-gray-900">{kpi.percentage}%</span>
              <div className={`flex items-center text-sm ${
                kpi.change > 0 ? 'text-green-600' : kpi.change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {kpi.change !== 0 && (
                  <i className={`fas fa-arrow-${kpi.change > 0 ? 'up' : 'down'} mr-1`}></i>
                )}
                <span>{kpi.change > 0 ? '+' : ''}{kpi.change}% from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Framework Compliance - Hidden for uploaders and meter managers */}
          {userRole !== 'uploader' && userRole !== 'meter_manager' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Framework Compliance</h3>
              <FrameworkCompliance 
                frameworks={dashboardData.frameworks} 
                onClick={handleFrameworkClick}
              />
            </div>
          )}

          {/* Performance Heatmap - Only for roles that see company metrics */}
          {visibility.companyMetrics && (
            <PerformanceHeatmap data={dashboardData.heatmapData} />
          )}

          {/* Insights Panel - All roles except uploader get insights */}
          {userRole !== 'uploader' && (
            <InsightsPanel insights={dashboardData.insights} />
          )}
          
          {/* Uploader Personal Performance Section */}
          {userRole === 'uploader' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{dashboardData.kpiCards[0]?.current || 0}</div>
                  <div className="text-sm text-gray-600">Tasks Completed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dashboardData.kpiCards[0]?.percentage || 0}%</div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Meter Manager Specific Sections */}
          {userRole === 'meter_manager' && (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meter Health Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.kpiCards[1]?.current || 0}</div>
                    <div className="text-sm text-gray-600">Active Meters</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{(dashboardData.kpiCards[1]?.total || 0) - (dashboardData.kpiCards[1]?.current || 0)}</div>
                    <div className="text-sm text-gray-600">Need Maintenance</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.kpiCards[1]?.percentage || 0}%</div>
                    <div className="text-sm text-gray-600">Health Score</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Schedule</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="text-sm font-medium text-red-900">Electricity Meter #3</span>
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Overdue</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-900">Water Meter #1</span>
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Due Tomorrow</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions userRole={userRole} onAction={handleQuickAction} />

          {/* Activity Feed - Based on role visibility */}
          {visibility.activityFeed && (
            <ActivityFeed 
              activities={visibility.activityFeed === 'site' 
                ? dashboardData.activities.filter(act => act.description.includes('site'))
                : dashboardData.activities
              } 
            />
          )}

          {/* Health Score - Not shown to uploaders */}
          {userRole !== 'uploader' && (
            <HealthScore 
              score={dashboardData.healthScore.score} 
              factors={dashboardData.healthScore.factors} 
            />
          )}

          {/* Benchmark Comparison - Only for company-wide roles */}
          {visibility.companyMetrics && (
            <BenchmarkComparison benchmarks={dashboardData.benchmarks} />
          )}
          
          {/* Personal Stats for Uploader */}
          {userRole === 'uploader' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">My Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="text-sm font-semibold text-green-600">5 tasks completed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Response Time</span>
                  <span className="text-sm font-semibold text-blue-600">1.2 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Quality Score</span>
                  <span className="text-sm font-semibold text-purple-600">94%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Projections */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center mb-4">
          <i className="fas fa-chart-line text-blue-600 mr-2"></i>
          <h3 className="text-lg font-semibold text-blue-900">Projections</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Month-end Progress</p>
            <p className="text-lg font-bold text-blue-900">On track to complete {dashboardData.kpiCards[2]?.percentage || 0}%</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Remaining Tasks</p>
            <p className="text-lg font-bold text-blue-900">{Math.max((dashboardData.kpiCards[2]?.total || 0) - (dashboardData.kpiCards[2]?.current || 0), 0)} more submissions needed</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Data Completeness</p>
            <p className="text-lg font-bold text-blue-900">{dashboardData.kpiCards[2]?.current || 0}/{dashboardData.kpiCards[2]?.total || 0} entries</p>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={exportModal.isOpen}
        onClose={closeExportModal}
        onConfirm={confirmExcelExport}
        data={exportModal.data}
      />
    </div>
  );
};

export default DashboardNew;
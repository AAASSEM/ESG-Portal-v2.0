import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
          const height = value > 0 ? Math.max((value / maxValue) * 80, 10) : 0; // No height for zero values
          const isCurrentMonth = index === chartData.data.length - 1;
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
      {/* Pie Chart Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Simple pie chart using CSS */}
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
      
      {/* Selected Scope Details */}
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
                        title={item} // Show full text on hover
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
  
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-[100000] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
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

  return createPortal(modalContent, document.body);
};

// Role-specific dashboard components
const SuperUserDashboard = ({ user, companies = [] }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">System Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-building text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Total Companies</p>
            <p className="text-2xl font-bold text-gray-800">{companies.length}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-users text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-2xl font-bold text-gray-800">24</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-orange-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Data Points</p>
            <p className="text-2xl font-bold text-gray-800">1,247</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-shield-alt text-purple-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Compliance Rate</p>
            <p className="text-2xl font-bold text-gray-800">94%</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Performance Comparison</h3>
      <div className="text-center text-gray-500 py-8">
        <i className="fas fa-chart-bar text-4xl mb-4"></i>
        <p>Cross-company analytics dashboard coming soon</p>
      </div>
    </div>
  </div>
);

const AdminDashboard = ({ user, selectedCompany, sites = [] }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">
      Company Overview - {selectedCompany?.name || 'Select Company'}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-map-marker-alt text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Active Sites</p>
            <p className="text-2xl font-bold text-gray-800">{sites.length}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-tasks text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Data Completion</p>
            <p className="text-2xl font-bold text-gray-800">78%</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-orange-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-800">12</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Site Comparison</h3>
      <div className="text-center text-gray-500 py-8">
        <i className="fas fa-building text-4xl mb-4"></i>
        <p>Site performance comparison dashboard coming soon</p>
      </div>
    </div>
  </div>
);

const SiteManagerDashboard = ({ user, selectedSite }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">
      Site Metrics - {selectedSite?.name || 'Select Site'}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-users text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Team Members</p>
            <p className="text-2xl font-bold text-gray-800">8</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Site Performance</p>
            <p className="text-2xl font-bold text-gray-800">85%</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-clock text-orange-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Avg Response Time</p>
            <p className="text-2xl font-bold text-gray-800">2.3 days</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Team Performance</h3>
      <div className="text-center text-gray-500 py-8">
        <i className="fas fa-chart-pie text-4xl mb-4"></i>
        <p>Team performance metrics coming soon</p>
      </div>
    </div>
  </div>
);

const UploaderDashboard = ({ user }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">My Tasks</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-circle text-red-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-800">5</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-800">23</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-percentage text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Progress</p>
            <p className="text-2xl font-bold text-gray-800">82%</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Queue</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fas fa-bolt text-red-600 text-sm"></i>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800">Electricity Data - December</p>
              <p className="text-sm text-gray-600">Due: Tomorrow</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Start
          </button>
        </div>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="fas fa-tint text-blue-600 text-sm"></i>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800">Water Usage Data</p>
              <p className="text-sm text-gray-600">Due: In 3 days</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Start
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ViewerDashboard = ({ user }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Compliance Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Compliance Rate</p>
            <p className="text-2xl font-bold text-gray-800">94%</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-file-alt text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Reports Available</p>
            <p className="text-2xl font-bold text-gray-800">12</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-calendar text-orange-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-2xl font-bold text-gray-800">2 days ago</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Shortcuts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center">
            <i className="fas fa-download text-blue-600 text-lg mr-3"></i>
            <div>
              <p className="font-medium text-gray-800">Monthly ESG Report</p>
              <p className="text-sm text-gray-600">December 2024</p>
            </div>
          </div>
        </button>
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
          <div className="flex items-center">
            <i className="fas fa-chart-pie text-green-600 text-lg mr-3"></i>
            <div>
              <p className="font-medium text-gray-800">Compliance Summary</p>
              <p className="text-sm text-gray-600">Q4 2024</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
);

const MeterManagerDashboard = ({ user }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Meter Management</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-tachometer-alt text-green-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Active Meters</p>
            <p className="text-2xl font-bold text-gray-800">15</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Needs Maintenance</p>
            <p className="text-2xl font-bold text-gray-800">3</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-calendar-check text-orange-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Due This Week</p>
            <p className="text-2xl font-bold text-gray-800">2</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-wrench text-blue-600 text-xl"></i>
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-600">Health Score</p>
            <p className="text-2xl font-bold text-gray-800">87%</p>
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Maintenance Schedule</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <i className="fas fa-bolt text-red-600 text-sm"></i>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800">Electricity Meter #3</p>
              <p className="text-sm text-red-600">Overdue - 2 days</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Schedule
          </button>
        </div>
        <div className="flex items-center justify-between p-4 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <i className="fas fa-tint text-orange-600 text-sm"></i>
            </div>
            <div className="ml-3">
              <p className="font-medium text-gray-800">Water Meter #1</p>
              <p className="text-sm text-orange-600">Due tomorrow</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Schedule
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, selectedCompany, userSites, selectedSite, companies } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState('This Month');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(0);
  const [selectedEmissionScope, setSelectedEmissionScope] = useState('Scope 2');
  const [modalData, setModalData] = useState({ isOpen: false, type: '', data: {} });
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  
  // Get company ID from auth context
  const companyId = selectedCompany?.id;

  // API function to fetch dashboard data
  const fetchDashboardData = async () => {
    if (!companyId) {
      console.log('No company selected, skipping dashboard data fetch');
      return null;
    }
    
    try {
      const [dashboardResponse, progressResponse, frameworksResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/?company_id=${companyId}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${companyId}/progress/`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/companies/${companyId}/frameworks/`, { credentials: 'include' })
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

  // Fetch chart data
  const fetchChartData = async () => {
    if (!companyId) {
      console.log('No company selected, skipping chart data fetch');
      return { meters: [], dataEntries: [] };
    }
    
    try {
      const [metersResponse, dataResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/meters/?company_id=${companyId}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/data-collection/tasks/?company_id=${companyId}&year=2025&month=8`, { credentials: 'include' })
      ]);
      
      const meters = await metersResponse.json();
      const dataEntries = await dataResponse.json();
      
      return {
        meters: meters.results || meters,
        dataEntries: dataEntries || []
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return { meters: [], dataEntries: [] };
    }
  };

  // Load dashboard data and refresh when time range changes
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
        // Set default data even if API fails
        setDashboardData(null);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [companyId, selectedTimeRange]); // Reload when time range changes

  // Handle meter navigation
  const handleMeterNavigation = useCallback((direction) => {
    if (!chartData || !chartData.meters) return;
    
    if (direction === 'next') {
      setSelectedMeter((prev) => (prev + 1) % chartData.meters.length);
    } else {
      setSelectedMeter((prev) => (prev - 1 + chartData.meters.length) % chartData.meters.length);
    }
  }, [chartData]);

  // Keyboard navigation for charts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!chartData || !chartData.meters || chartData.meters.length <= 1) return;
      
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

  const kpiCards = dashboardData ? (() => {
    // Calculate time-range specific metrics
    let periodLabel = '';
    let dataPointsCount = dashboardData.total_data_elements || 0;
    let changePercent = 0;
    
    switch(selectedTimeRange) {
      case 'Last 7 Days':
        periodLabel = '7d';
        // Only count recent submissions (simulated - in real app would filter by date)
        dataPointsCount = chartData?.dataEntries?.filter(e => e.submission?.value).length || 0;
        changePercent = 15.2; // Positive trend for recent activity
        break;
      case 'This Month':
        periodLabel = '30d';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = 8.5;
        break;
      case 'Last Quarter':
        periodLabel = 'Q3';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = -2.1; // Slight decrease
        break;
      case 'Last Year':
        periodLabel = '12m';
        dataPointsCount = dashboardData.total_data_elements || 0;
        changePercent = 24.7; // Year over year growth
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
        value: dashboardData.active_meters || '0',
        unit: 'units',
        change: 0,
        trend: 'up',
        color: 'green',
        icon: 'fas fa-gauge'
      },
      {
        title: 'Frameworks',
        value: dashboardData.total_frameworks || '0',
        unit: 'active',
        change: 0,
        trend: 'up',
        color: 'purple',
        icon: 'fas fa-list-check'
      },
      {
        title: `Completeness (${periodLabel})`,
        value: Math.round(dashboardData.data_completeness_percentage || 0),
        unit: '%',
        change: selectedTimeRange === 'Last 7 Days' ? 5.2 : 
                selectedTimeRange === 'This Month' ? 3.1 : 
                selectedTimeRange === 'Last Quarter' ? -1.5 : 11.0,
        trend: selectedTimeRange === 'Last Quarter' ? 'down' : 'up',
        color: 'yellow',
        icon: 'fas fa-chart-pie'
      }
    ];
  })() : [
    {
      title: 'Energy Consumption',
      value: '2,450',
      unit: 'kWh',
      change: -12.5,
      trend: 'down',
      color: 'yellow',
      icon: 'fas fa-bolt'
    },
    {
      title: 'Water Usage',
      value: '1,250',
      unit: 'L/day',
      change: 8.2,
      trend: 'up',
      color: 'blue',
      icon: 'fas fa-tint'
    },
    {
      title: 'GHG Emissions',
      value: '245',
      unit: 'tCO2e',
      change: -15.7,
      trend: 'down',
      color: 'gray',
      icon: 'fas fa-smog'
    },
    {
      title: 'Waste Generated',
      value: '89',
      unit: 'kg/day',
      change: -22.1,
      trend: 'down',
      color: 'green',
      icon: 'fas fa-trash-alt'
    }
  ];

  const frameworkStatus = (() => {
    // Use real framework data from API
    const frameworks = [];
    
    const dataCompleteness = Math.round(dashboardData?.data_completeness_percentage || 0);
    const overallProgress = Math.round(dashboardData?.progress?.overall_percentage || 0);
    
    // Use actual frameworks from API response
    if (dashboardData?.frameworks && Array.isArray(dashboardData.frameworks)) {
      return dashboardData.frameworks.map(framework => ({
        name: framework.name || framework.framework_id || 'Unknown Framework',
        progress: dataCompleteness, // Use actual data completeness for each framework
        color: dataCompleteness < 30 ? 'red' : dataCompleteness < 70 ? 'orange' : 'green',
        status: dataCompleteness < 30 ? 'Just Started' : dataCompleteness < 70 ? 'In Progress' : 'On Track',
        type: framework.type || (framework.framework_id === 'DST' ? 'mandatory_conditional' : 'mandatory'),
        framework_id: framework.framework_id
      }));
    }
    
    // Fallback if no frameworks in API response
    return [];
  })();

  const recentActivities = dashboardData?.recent_activities || (() => {
    const activities = [];
    let activityId = 1;
    
    // Add real data submission activities from chartData
    if (chartData?.dataEntries && Array.isArray(chartData.dataEntries)) {
      chartData.dataEntries.forEach(entry => {
        if (entry.submission && entry.submission.value && parseFloat(entry.submission.value) > 0) {
          const submissionDate = new Date(entry.submission.updated_at || entry.submission.created_at);
          const hoursAgo = Math.floor((new Date() - submissionDate) / (1000 * 60 * 60));
          const timeAgo = hoursAgo < 1 ? 'Just now' : 
                         hoursAgo < 24 ? `${hoursAgo} hours ago` :
                         `${Math.floor(hoursAgo / 24)} days ago`;
          
          activities.push({
            id: activityId++,
            action: `${entry.meter?.type || entry.element_name} data submitted`,
            description: `Value: ${parseFloat(entry.submission.value).toLocaleString()} ${entry.element_unit}`,
            time: timeAgo,
            type: 'data',
            icon: 'fas fa-chart-line',
            color: 'green'
          });
        }
      });
    }
    
    // Add module completion activities from real progress data
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
    
    // Sort by most recent first and limit to 4
    return activities
      .sort((a, b) => {
        // Prioritize data submissions, then by recency
        if (a.type === 'data' && b.type !== 'data') return -1;
        if (b.type === 'data' && a.type !== 'data') return 1;
        return a.time.includes('hour') ? -1 : 1;
      })
      .slice(0, 4);
  })();

  const upcomingDeadlines = dashboardData?.upcoming_deadlines || (() => {
    const deadlines = [];
    const today = new Date();
    
    // Generate deadlines based on framework progress and data completeness
    if (dashboardData?.frameworks) {
      dashboardData.frameworks.forEach(framework => {
        const frameworkData = frameworkStatus.find(f => f.name === framework.name);
        if (frameworkData) {
          // Calculate deadline based on framework type and progress
          let daysFromNow, priority;
          
          if (framework.type === 'mandatory') {
            daysFromNow = 30; // Mandatory frameworks have strict deadlines
            priority = frameworkData.progress < 80 ? 'High' : 'Medium';
          } else if (framework.type === 'mandatory_conditional') {
            daysFromNow = 45;
            priority = frameworkData.progress < 70 ? 'High' : 'Medium';
          } else {
            daysFromNow = 90; // Voluntary frameworks have longer deadlines
            priority = frameworkData.progress < 50 ? 'Medium' : 'Low';
          }
          
          const deadlineDate = new Date(today);
          deadlineDate.setDate(today.getDate() + daysFromNow);
          
          deadlines.push({
            name: `${framework.name} Compliance Report`,
            date: deadlineDate.toISOString().split('T')[0],
            daysLeft: daysFromNow,
            priority: priority,
            type: 'framework'
          });
        }
      });
    }
    
    // Add data collection deadlines based on monthly progress
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // End of month data collection deadline
    const endOfMonth = new Date(currentYear, currentMonth, 0);
    const daysToEndOfMonth = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
    
    if (daysToEndOfMonth > 0 && daysToEndOfMonth <= 31) {
      const dataProgress = dashboardData?.data_completeness_percentage || 0;
      deadlines.push({
        name: `${endOfMonth.toLocaleDateString('en-US', { month: 'long' })} Data Collection`,
        date: endOfMonth.toISOString().split('T')[0],
        daysLeft: daysToEndOfMonth,
        priority: dataProgress < 50 ? 'High' : dataProgress < 80 ? 'Medium' : 'Low',
        type: 'data'
      });
    }
    
    // Quarterly reporting deadline
    const quarterEndMonths = [3, 6, 9, 12];
    const nextQuarterEnd = quarterEndMonths.find(month => month > currentMonth) || 12;
    const quarterEndDate = new Date(currentYear, nextQuarterEnd - 1, 
      new Date(currentYear, nextQuarterEnd, 0).getDate());
    const daysToQuarterEnd = Math.ceil((quarterEndDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysToQuarterEnd > 0 && daysToQuarterEnd <= 120) {
      deadlines.push({
        name: `Q${Math.ceil(nextQuarterEnd / 3)} ESG Quarterly Report`,
        date: quarterEndDate.toISOString().split('T')[0],
        daysLeft: daysToQuarterEnd,
        priority: daysToQuarterEnd <= 30 ? 'High' : daysToQuarterEnd <= 60 ? 'Medium' : 'Low',
        type: 'quarterly'
      });
    }
    
    // Annual compliance audit
    const yearEndDate = new Date(currentYear, 11, 31);
    const daysToYearEnd = Math.ceil((yearEndDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysToYearEnd > 0 && daysToYearEnd <= 365) {
      deadlines.push({
        name: 'Annual ESG Compliance Audit',
        date: yearEndDate.toISOString().split('T')[0],
        daysLeft: daysToYearEnd,
        priority: daysToYearEnd <= 90 ? 'High' : daysToYearEnd <= 180 ? 'Medium' : 'Low',
        type: 'annual'
      });
    }
    
    // Sort by days left and return top 4
    return deadlines
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  })();

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
      
      // Create time-range specific report
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

      // Add meter data filtered by time range
      if (chartData?.meters) {
        let periodDescription = '';
        switch(selectedTimeRange) {
          case 'Last 7 Days':
            periodDescription = 'PAST 7 DAYS';
            break;
          case 'This Month':
            periodDescription = 'PAST 30 DAYS';
            break;
          case 'Last Quarter':
            periodDescription = 'Q3 2025 (JUN-AUG)';
            break;
          case 'Last Year':
            periodDescription = 'YEAR 2025';
            break;
          default:
            periodDescription = 'AUGUST 2025';
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
        
        // Add summary of missing data
        const totalMeters = chartData.meters.length;
        const completedMeters = chartData.meters.filter(meter => {
          const meterData = chartData.dataEntries.find(entry => 
            entry.meter && entry.meter.id === meter.id
          );
          return meterData?.submission?.value && meterData.submission.value !== '0';
        }).length;
        
        csvData.push([''], ['METER SUMMARY', `${completedMeters} of ${totalMeters} meters have data`, '', `${Math.round((completedMeters/totalMeters)*100)}% complete`]);
      }

      // Add upcoming deadlines
      csvData.push([''], ['=== UPCOMING DEADLINES ==='], ['Deadline', 'Date', 'Days Left', 'Priority']);
      upcomingDeadlines.forEach(deadline => {
        csvData.push([deadline.name, deadline.date, deadline.daysLeft, deadline.priority]);
      });

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Create filename with time range
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

      // Show success modal
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
    // Check data completeness and warn user if incomplete
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
      
      // Count missing meter data
      const missingMeters = chartData?.meters?.filter(meter => {
        const meterData = chartData.dataEntries.find(entry => 
          entry.meter && entry.meter.id === meter.id
        );
        return !meterData?.submission?.value;
      }) || [];
      
      if (missingMeters.length > 0) {
        missingItems.push(`${missingMeters.length} meters have no data submitted`);
      }
      
      // Show warning modal
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
      
      return; // Stop here, user will decide via modal
    }
    
    // Data is complete, proceed with export
    performExport();
  };

  // Modal handlers
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
        // No action needed for default case
        break;
    }
  };

  const handleDeadlineClick = (deadline) => {
    // Navigate to relevant page based on deadline type
    switch (deadline.type) {
      case 'framework':
        navigate('/rame'); // Profiling/Framework page
        break;
      case 'data':
        navigate('/data'); // Data collection page
        break;
      case 'quarterly':
      case 'annual':
        navigate('/dashboard'); // Stay on dashboard for reports
        break;
      default:
        navigate('/list'); // Checklist as fallback
    }
  };

  // Generate chart data for selected meter using real data only
  const generateChartData = () => {
    // Determine which months to show based on selected time range
    let months = [];
    const currentMonth = 7; // August (0-indexed)
    const currentYear = 2025;
    
    switch(selectedTimeRange) {
      case 'Last 7 Days':
        // Show daily data for last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        months = days;
        break;
      case 'This Month':
        // Show last 30 days grouped by week
        months = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'];
        break;
      case 'Last Quarter':
        // Show last 3 months
        months = ['Jun', 'Jul', 'Aug'];
        break;
      case 'Last Year':
        // Show all 12 months
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    }
    
    if (!chartData || !chartData.meters || chartData.meters.length === 0) {
      const noData = months.map(() => 0);
      return { labels: months, data: noData };
    }

    const selectedMeterData = chartData.meters[selectedMeter];
    if (!selectedMeterData) {
      const noData = months.map(() => 0);
      return { labels: months, data: noData };
    }

    // Find real data for this meter from dataEntries
    const realData = chartData.dataEntries.find(entry => 
      entry.meter && entry.meter.id === selectedMeterData.id
    );
    
    // Initialize data based on time range
    const data = months.map(() => 0);
    
    // Set real value in the appropriate position based on time range
    if (realData && realData.submission && realData.submission.value) {
      const currentValue = parseFloat(realData.submission.value);
      if (currentValue > 0) {
        // Place value in the last position for most time ranges
        if (selectedTimeRange === 'Last 7 Days') {
          data[data.length - 1] = currentValue; // Today/Sunday
        } else if (selectedTimeRange === 'This Month') {
          data[data.length - 1] = currentValue; // Current week
        } else if (selectedTimeRange === 'Last Quarter') {
          data[2] = currentValue; // August
        } else if (selectedTimeRange === 'Last Year') {
          data[7] = currentValue; // August (index 7)
        } else {
          data[7] = currentValue; // Default August position
        }
      }
    }

    return { labels: months, data };
  };

  // Generate emissions breakdown data
  const generateEmissionsData = () => {
    console.log('=== EMISSIONS DATA GENERATION ===');
    console.log('chartData:', chartData);
    console.log('chartData.dataEntries:', chartData?.dataEntries);
    
    if (!chartData || !chartData.dataEntries) {
      console.log('No chart data or data entries for emissions - returning empty scopes');
      return {
        'Scope 1': { value: 0, color: '#ef4444', items: [] },
        'Scope 2': { value: 0, color: '#3b82f6', items: [] },
        'Scope 3': { value: 0, color: '#6b7280', items: [] }
      };
    }

    // Group emissions data by scope
    const scopes = {
      'Scope 1': { value: 0, color: '#ef4444', items: [] },
      'Scope 2': { value: 0, color: '#3b82f6', items: [] },
      'Scope 3': { value: 0, color: '#6b7280', items: [] }
    };

    if (chartData?.dataEntries && Array.isArray(chartData.dataEntries)) {
      console.log('Processing', chartData.dataEntries.length, 'data entries');
      chartData.dataEntries.forEach((entry, index) => {
      console.log(`Entry ${index}:`, entry);
      
      // Use meter type instead of element_name for proper categorization
      const meterType = entry.meter ? entry.meter.type.toLowerCase() : '';
      const value = parseFloat(entry.submission?.value) || 0;
      
      console.log(`  - Meter type: "${meterType}", Value: ${value}`);
      
      // Get display name from meter type instead of duplicate element_name
      const displayName = entry.meter ? entry.meter.type : entry.element_name;
      console.log(`  - Display name: "${displayName}"`);
      
      if (meterType.includes('fuel') || meterType.includes('gas') || meterType.includes('lpg')) {
        console.log(`  - Adding to Scope 1: ${value} * 2.3 = ${value * 2.3}`);
        scopes['Scope 1'].value += value * 2.3; // Convert to CO2e
        scopes['Scope 1'].items.push(displayName);
      } else if (meterType.includes('electricity') || meterType.includes('energy') || meterType.includes('renewable')) {
        console.log(`  - Adding to Scope 2: ${value} * 0.85 = ${value * 0.85}`);
        scopes['Scope 2'].value += value * 0.85; // Convert to CO2e
        scopes['Scope 2'].items.push(displayName);
      } else {
        console.log(`  - Adding to Scope 3: ${value} * 0.1 = ${value * 0.1}`);
        scopes['Scope 3'].value += value * 0.1; // Estimate CO2e
        scopes['Scope 3'].items.push(displayName);
      }
    });
    }

    // Remove duplicate items
    Object.keys(scopes).forEach(scopeName => {
      scopes[scopeName].items = [...new Set(scopes[scopeName].items)];
      console.log(`Final ${scopeName}:`, scopes[scopeName]);
    });

    console.log('=== FINAL EMISSIONS DATA ===', scopes);
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

  // Role-based dashboard rendering
  const renderRoleBasedDashboard = () => {
    const role = user?.role;
    console.log('Rendering dashboard for role:', role);
    
    switch (role) {
      case 'super_user':
        return <SuperUserDashboard user={user} companies={companies} />;
      case 'admin':
        return <AdminDashboard user={user} selectedCompany={selectedCompany} sites={userSites} />;
      case 'site_manager':
        return <SiteManagerDashboard user={user} selectedSite={selectedSite} />;
      case 'uploader':
        return <UploaderDashboard user={user} />;
      case 'viewer':
        return <ViewerDashboard user={user} />;
      case 'meter_manager':
        return <MeterManagerDashboard user={user} />;
      default:
        return <ViewerDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderRoleBasedDashboard()}
    </div>
  );
};

export default Dashboard;

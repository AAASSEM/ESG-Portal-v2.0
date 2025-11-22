import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  // Keyboard shortcut for developer admin panel
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+Shift+D or Cmd+Shift+D to access developer admin
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        navigate('/developer-admin');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const benefits = [
    {
      title: 'Real-time Monitoring',
      description: 'Track your environmental impact with automated data collection',
      icon: 'fas fa-chart-line',
      color: 'blue'
    },
    {
      title: 'Compliance Management',
      description: 'Stay compliant with DST, Green Key and global ESG standards',
      icon: 'fas fa-shield-check',
      color: 'green'
    },
    {
      title: 'Smart Analytics',
      description: 'Get actionable insights from your sustainability data',
      icon: 'fas fa-brain',
      color: 'purple'
    },
    {
      title: 'Team Collaboration',
      description: 'Work together with role-based access and task assignments',
      icon: 'fas fa-users',
      color: 'orange'
    },
    {
      title: 'Automated Reporting',
      description: 'Generate comprehensive ESG reports with one click',
      icon: 'fas fa-file-alt',
      color: 'teal'
    },
    {
      title: 'Meter Integration',
      description: 'Connect smart meters for seamless data collection',
      icon: 'fas fa-gauge',
      color: 'indigo'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-leaf text-white text-lg"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">ESG Portal</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6">
                <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <i className="fas fa-leaf mr-2"></i>
                  Sustainability Made Simple
                </span>
              </div>
              
              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                Transform Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> ESG Journey</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Streamline your environmental, social, and governance reporting with our comprehensive platform. 
                Track metrics, ensure compliance, and drive sustainable business practices.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Start Free Trial
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </button>
              </div>

              {/* Developer Admin access via floating button and keyboard shortcut */}
              
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <i className="fas fa-check text-green-500 mr-2"></i>
                  No credit card required
                </div>
                <div className="flex items-center">
                  <i className="fas fa-clock text-blue-500 mr-2"></i>
                  Setup in minutes
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="relative">
                <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 shadow-xl">
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                      <i className="fas fa-chart-bar text-3xl text-blue-600 mb-2"></i>
                      <p className="text-sm font-medium text-gray-700 text-center">Real-time Analytics</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                      <i className="fas fa-shield-check text-3xl text-green-600 mb-2"></i>
                      <p className="text-sm font-medium text-gray-700 text-center">Compliance Ready</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                      <i className="fas fa-users text-3xl text-purple-600 mb-2"></i>
                      <p className="text-sm font-medium text-gray-700 text-center">Team Collaboration</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                      <i className="fas fa-gauge text-3xl text-orange-600 mb-2"></i>
                      <p className="text-sm font-medium text-gray-700 text-center">Smart Meters</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for ESG Success
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and insights you need to excel in your sustainability journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-all duration-200">
                <div className={`w-14 h-14 bg-${benefit.color}-100 rounded-xl flex items-center justify-center mb-6`}>
                  <i className={`${benefit.icon} text-2xl text-${benefit.color}-600`}></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Standards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              Compliant with global ESG frameworks and standards
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <i className="fas fa-award text-3xl text-green-600 mb-3"></i>
              <h4 className="font-semibold text-gray-900">Green Key</h4>
              <p className="text-sm text-gray-600">Eco-certification</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <i className="fas fa-certificate text-3xl text-blue-600 mb-3"></i>
              <h4 className="font-semibold text-gray-900">DST</h4>
              <p className="text-sm text-gray-600">Dubai Standards</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <i className="fas fa-globe text-3xl text-purple-600 mb-3"></i>
              <h4 className="font-semibold text-gray-900">GRI</h4>
              <p className="text-sm text-gray-600">Global Reporting</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <i className="fas fa-leaf text-3xl text-orange-600 mb-3"></i>
              <h4 className="font-semibold text-gray-900">SASB</h4>
              <p className="text-sm text-gray-600">Sustainability Standards</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your ESG Reporting?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of companies already using our platform to drive sustainable business practices
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              <i className="fas fa-rocket mr-2"></i>
              Start Your Free Trial
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-leaf text-white text-lg"></i>
                </div>
                <h3 className="text-2xl font-bold">ESG Portal</h3>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Empowering organizations to achieve their sustainability goals through comprehensive ESG management and reporting.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Analytics</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Reporting</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Compliance</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ESG Portal. All rights reserved. Built for sustainable business practices.</p>
          </div>
        </div>
      </footer>

      {/* Floating Developer Admin Access */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => navigate('/developer-admin')}
          className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          title="Developer Admin Panel (Ctrl+Shift+D)"
        >
          <i className="fas fa-cog text-sm"></i>
        </button>
      </div>
    </div>
  );
};

export default Home;
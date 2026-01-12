const getApiUrl = () => {
  const hostname = window.location.hostname;

  // Production/Deployed environments - use same origin
  if (process.env.NODE_ENV === 'production' ||
      hostname.includes('.onrender.com') ||
      hostname.includes('.vercel.app') ||
      hostname.includes('.netlify.app') ||
      hostname.includes('.ngrok-free.app') ||
      hostname.includes('.ngrok.io') ||
      hostname.includes('.ngrok.app')) {
    // In production, backend and frontend are on same domain
    // Use empty string to force relative URLs
    return '';
  }

  // Development: Dynamic port detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port;

    // If React is running on port 3000, assume Django is on 8000
    if (port === '3000') {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '8000';
      return `http://${hostname}:${backendPort}`;
    }
    // If React is running on port 3001, assume Django is on 8080
    if (port === '3001') {
      const backendPort = process.env.REACT_APP_BACKEND_PORT || '8080';
      return `http://${hostname}:${backendPort}`;
    }
    // If accessing Django directly (same port), use same origin
    return window.location.origin;
  }

  // Fallback: use same origin (relative URLs)
  return '';
};

export const API_BASE_URL = getApiUrl();
export default API_BASE_URL;
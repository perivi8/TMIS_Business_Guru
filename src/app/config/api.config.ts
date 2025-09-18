// API Configuration
export const API_CONFIG = {
  // Development URLs (now primary)
  FRONTEND_URL: 'http://localhost:4200',
  BACKEND_URL: 'http://localhost:5000',
  
  // Production URLs (for reference - currently using localhost)
  PROD_FRONTEND_URL: 'https://tmis-business-guru.vercel.app',
  PROD_BACKEND_URL: 'https://tmis-business-guru-backend.onrender.com',
  
  // API Endpoints
  API_BASE: '/api',
  
  // Full API URL (used by environment files)
  getApiUrl: (baseUrl: string) => `${baseUrl}/api`
};

// Export for easy access
export const DEVELOPMENT_API_URL = API_CONFIG.getApiUrl(API_CONFIG.BACKEND_URL);
export const PRODUCTION_API_URL = API_CONFIG.getApiUrl(API_CONFIG.PROD_BACKEND_URL);

// utils/apiService.js

class ApiService {
  constructor() {
    this.baseURL = '/api';
  }

  // Helper method to get auth token
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Helper method to clear auth token
  clearAuthToken() {
    localStorage.removeItem('authToken');
  }

  // Helper method to handle authentication errors
  handleAuthError(errorType, router) {
    // Clear invalid token from localStorage
    this.clearAuthToken();

    // Redirect to login based on error type
    if (errorType === 'JWT_MALFORMED') {
      console.warn('Malformed JWT token detected, clearing token and redirecting to login');
      router.push('/login?error=token_malformed');
    } else if (errorType === 'JWT_EXPIRED') {
      console.warn('JWT token expired, redirecting to login');
      router.push('/login?error=token_expired');
    } else {
      console.warn('Authentication error, redirecting to login');
      router.push('/login?error=auth_failed');
    }
  }

  // Main API request method
  async request(endpoint, options = {}) {
    let url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    // Handle query parameters (axios style)
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Default headers
    const headers = {
      ...options.headers
    };

    // Only set default Content-Type to application/json if it's not FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header if token exists
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      method: 'GET',
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      // Conditionally parse response based on responseType option
      let data;
      if (options.responseType === 'blob') {
        data = await response.blob();
      } else {
        data = await response.json();
      }

      // Handle authentication errors
      if (response.status === 401 && data.errorType) {
        // We need the router instance to redirect
        // This will be handled by the calling component
        throw new AuthError(data.errorType, data.error);
      }

      // Handle permission denied (403) errors
      if (response.status === 403) {
        // Import toast here to avoid circular dependencies
        const { useToast } = await import('primevue/usetoast');
        const toast = useToast();
        
        toast.add({
          severity: 'warn',
          summary: '権限エラー',
          detail: 'この操作を実行する権限がありません。',
          life: 5000
        });
        
        throw new Error('Forbidden: You do not have permission to perform this action.');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      // Re-throw authentication errors to be handled by components
      if (error instanceof AuthError) {
        throw error;
      }

      // Handle other errors
      throw new Error(error.message || 'Network error occurred');
    }
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async put(endpoint, data, options = {}) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Custom error class for authentication errors
class AuthError extends Error {
  constructor(errorType, message) {
    super(message);
    this.name = 'AuthError';
    this.errorType = errorType;
  }
}

// Create singleton instance
const apiService = new ApiService();

export { apiService, AuthError };

// utils/apiService.js
import { useRouter } from 'vue-router';

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
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

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
      const data = await response.json();

      // Handle authentication errors
      if (response.status === 401 && data.errorType) {
        // We need the router instance to redirect
        // This will be handled by the calling component
        throw new AuthError(data.errorType, data.error);
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
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
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

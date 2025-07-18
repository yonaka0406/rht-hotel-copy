// composables/useApi.js
import { ref } from 'vue';
import { apiService, AuthError } from '@/utils/apiService';

// Global router reference that can be set from main.js
let globalRouter = null;

// Function to set global router from main.js
export function setApiDependencies(router) {
  globalRouter = router;
}

export function useApi() {
  const isLoading = ref(false);
  const error = ref(null);

  const clearAuthToken = () => {
    localStorage.removeItem('authToken');
  };

  const handleAuthError = (errorType) => {
    clearAuthToken();

    let message = 'ログインが必要です。';

    if (errorType === 'JWT_MALFORMED') {
      message = 'セッションが無効です。再度ログインしてください。';
    } else if (errorType === 'JWT_EXPIRED') {
      message = 'セッションの有効期限が切れました。再度ログインしてください。';
    }
    
    // Log the message to console
    console.warn(message);
    
    // Use router if available
    if (globalRouter) {
      globalRouter.push('/login');
    } else {
      // Fallback to window.location
      window.location.href = '/login';
    }
  };

  const makeRequest = async (requestFn) => {
    try {
      isLoading.value = true;
      error.value = null;
      return await requestFn();
    } catch (err) {
      if (err instanceof AuthError) {
        handleAuthError(err.errorType);
        return null;
      }
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const get = async (endpoint, options = {}) => {
    return makeRequest(() => apiService.get(endpoint, options));
  };

  const post = async (endpoint, data, options = {}) => {
    return makeRequest(() => apiService.post(endpoint, data, options));
  };

  const put = async (endpoint, data, options = {}) => {
    return makeRequest(() => apiService.put(endpoint, data, options));
  };

  const del = async (endpoint, options = {}) => {
    return makeRequest(() => apiService.delete(endpoint, options));
  };

  return {
    isLoading,
    error,
    get,
    post,
    put,
    del,
    clearAuthToken,
    handleAuthError
  };
}
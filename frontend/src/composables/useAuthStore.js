import { ref, computed } from 'vue';

// This state is shared across all components that use this composable
const token = ref(localStorage.getItem('authToken') || null);
const user = ref(null);

export function useAuthStore() {
  const isAuthenticated = computed(() => !!token.value);

  async function fetchUserProfile() {
    if (!token.value) return;

    try {
      const response = await fetch('/api/user/get', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      user.value = await response.json();
    } catch (error) {
      console.error('Failed to fetch user profile.', error);
      // If profile fetch fails, the token might be bad, so log out
      logout();
    }
  }

  async function login(email, password) {
    // Clear old state first to ensure a clean login
    if (token.value) {
        logout();
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    token.value = data.token;
    localStorage.setItem('authToken', data.token);

    await fetchUserProfile();
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('authToken');
  }

  // On initial load, if a token exists, fetch the user's profile
  if (token.value && !user.value) {
    fetchUserProfile();
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    fetchUserProfile,
  };
}

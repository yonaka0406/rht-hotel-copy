import { ref } from 'vue'
import { useApi } from './useApi'

const savedSearches = ref([])
const error = ref(null)

const API_BASE = '/api/user-saved-search'

export function useSavedSearch() {
  const { isLoading, error: apiError, get, post, put, del } = useApi()

  async function fetchAll() {
    error.value = null
    try {
      const res = await get(API_BASE)
      if (res) savedSearches.value = res
    } catch (e) {
      error.value = e?.message || 'API error'
    }
  }

  async function fetchById(id) {
    error.value = null
    try {
      return await get(`${API_BASE}/${id}`)
    } catch (e) {
      error.value = e?.message || 'API error'
      return null
    }
  }

  async function create(search) {
    error.value = null
    try {
      const created = await post(API_BASE, search)
      if (created) savedSearches.value.push(created)
      return created
    } catch (e) {
      error.value = e?.message || 'API error'
      return null
    }
  }

  async function update(id, search) {
    error.value = null
    try {
      const updated = await put(`${API_BASE}/${id}`, search)
      const idx = savedSearches.value.findIndex(s => s.id === id)
      if (updated && idx !== -1) savedSearches.value[idx] = updated
      return updated
    } catch (e) {
      error.value = e?.message || 'API error'
      return null
    }
  }

  async function remove(id) {
    error.value = null
    try {
      await del(`${API_BASE}/${id}`)
      savedSearches.value = savedSearches.value.filter(s => s.id !== id)
      return true
    } catch (e) {
      error.value = e?.message || 'API error'
      return false
    }
  }

  return {
    savedSearches,
    loading: isLoading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    remove
  }
} 
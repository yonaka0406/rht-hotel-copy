import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useSavedSearch } from './useSavedSearch'

let errorFlag = false

vi.mock('./useApi', () => {
  const state = {
    data: [
      { id: '1', name: 'A', category: '業務', filters: {}, favorite: false },
      { id: '2', name: 'B', category: '個人', filters: {}, favorite: true }
    ],
    error: ref(null)
  }
  return {
    useApi: () => ({
      isLoading: false,
      error: state.error,
      get: vi.fn(async (url) => {
        if (errorFlag) throw new Error('API error')
        if (url.endsWith('/1')) return state.data[0]
        if (url.endsWith('/2')) return state.data[1]
        return state.data
      }),
      post: vi.fn(async (url, body) => {
        if (errorFlag) throw new Error('API error')
        const created = { ...body, id: '3' }
        state.data.push(created)
        return created
      }),
      put: vi.fn(async (url, body) => {
        if (errorFlag) throw new Error('API error')
        const id = url.split('/').pop()
        const idx = state.data.findIndex(s => s.id === id)
        if (idx !== -1) state.data[idx] = { ...state.data[idx], ...body }
        return state.data[idx]
      }),
      del: vi.fn(async (url) => {
        if (errorFlag) throw new Error('API error')
        const id = url.split('/').pop()
        state.data = state.data.filter(s => s.id !== id)
        return true
      })
    })
  }
})

describe('useSavedSearch', () => {
  let composable
  beforeEach(() => {
    composable = useSavedSearch()
    composable.savedSearches.value = []
    errorFlag = false
  })

  it('fetches all saved searches', async () => {
    await composable.fetchAll()
    expect(composable.savedSearches.value.length).toBeGreaterThan(0)
    expect(composable.savedSearches.value[0].name).toBe('A')
  })

  it('fetches by id', async () => {
    const result = await composable.fetchById('1')
    expect(result).toBeTruthy()
    expect(result.id).toBe('1')
  })

  it('creates a saved search', async () => {
    const newSearch = { name: 'C', category: '高額', filters: {}, favorite: false }
    const created = await composable.create(newSearch)
    expect(created).toBeTruthy()
    expect(created.id).toBe('3')
    expect(composable.savedSearches.value.some(s => s.name === 'C')).toBe(true)
  })

  it('updates a saved search', async () => {
    await composable.fetchAll()
    const updated = await composable.update('1', { name: 'A-updated', category: '業務', filters: {}, favorite: false })
    expect(updated).toBeTruthy()
    expect(updated.name).toBe('A-updated')
    expect(composable.savedSearches.value.find(s => s.id === '1').name).toBe('A-updated')
  })

  it('removes a saved search', async () => {
    await composable.fetchAll()
    const result = await composable.remove('2')
    expect(result).toBe(true)
    expect(composable.savedSearches.value.some(s => s.id === '2')).toBe(false)
  })

  it('handles API errors', async () => {
    errorFlag = true
    await composable.fetchAll()
    expect(composable.error.value).toBeTruthy()
  })
}) 
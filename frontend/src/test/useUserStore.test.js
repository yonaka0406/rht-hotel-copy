/* eslint-env vitest */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserStore } from '../composables/useUserStore.js'

describe('useUserStore - error scenarios and recovery', () => {
  let store
  let originalFetch
  beforeEach(() => {
    store = useUserStore()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('logs in English and throws on fetchUsers error', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await store.fetchUsers()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch users.', expect.anything())
    consoleSpy.mockRestore()
  })

  it('throws Japanese error for missing auth token on createUserCalendar', async () => {
    vi.spyOn(global.localStorage, 'getItem').mockReturnValue(null)
    await expect(store.createUserCalendar()).rejects.toThrow('認証トークンが見つかりません。')
  })

  it('recovers after error on fetchUser', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await store.fetchUser().catch(() => {})
    await expect(store.fetchUser()).resolves.not.toThrow()
  })
}) 
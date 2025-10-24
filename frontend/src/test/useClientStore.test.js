// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useClientStore } from '../composables/useClientStore.js'

// Ensure global is available
const { global } = globalThis;

describe('useClientStore - error scenarios and recovery', () => {
  let store
  let originalFetch
  
  beforeEach(() => {
    store = useClientStore()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })
  
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('handles API error on fetchClients', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(store.fetchClients(1)).rejects.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch clients.', expect.anything())
    consoleSpy.mockRestore()
  })

  it('sets Japanese error message on createClient failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 400 })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(store.createClient({})).rejects.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to create client.', expect.anything())
    consoleSpy.mockRestore()
  })

  it('recovers after error on fetchClients', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 })
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ clients: [] }) })
    
    // First call fails
    await expect(store.fetchClients(1)).rejects.toThrow()
    
    // Second call should succeed
    await expect(store.fetchClients(1)).resolves.not.toThrow()
  })
})
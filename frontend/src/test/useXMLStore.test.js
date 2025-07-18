import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useXMLStore } from '../composables/useXMLStore.js'

describe('useXMLStore - error scenarios and recovery', () => {
  let store
  let originalFetch
  beforeEach(() => {
    store = useXMLStore()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('logs in English and throws on fetchXMLTemplate error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, text: async () => '' })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await store.fetchXMLTemplate('hotelid', 'name')
    expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve data.', expect.anything())
    consoleSpy.mockRestore()
  })

  it('throws Japanese error for failed insertXMLResponse', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 400, text: async () => '' })
    await expect(store.insertXMLResponse('hotelid', 'name', '<xml/>')).rejects.toThrow('データの送信に失敗しました。')
  })

  it('recovers after error on fetchXMLRecentResponses', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await store.fetchXMLRecentResponses().catch(() => {})
    await expect(store.fetchXMLRecentResponses()).resolves.not.toThrow()
  })
}) 
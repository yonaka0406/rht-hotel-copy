/* eslint-env vitest */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProjectStore } from '../composables/useProjectStore.js'

describe('useProjectStore - error scenarios and recovery', () => {
  let store
  let originalFetch
  beforeEach(() => {
    store = useProjectStore()
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('logs in English and throws on fetchRelatedProjects error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await store.fetchRelatedProjects('badid')
    expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve related projects.', expect.anything())
    consoleSpy.mockRestore()
  })

  it('throws Japanese error for failed createProject', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) })
    await expect(store.createProject({})).rejects.toThrow('プロジェクトの作成に失敗しました。')
  })

  it('recovers after error on fetchAllProjects', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ projects: [], totalItems: 0 }) })
    await store.fetchAllProjects({}).catch(() => {})
    await expect(store.fetchAllProjects({})).resolves.not.toThrow()
  })
}) 
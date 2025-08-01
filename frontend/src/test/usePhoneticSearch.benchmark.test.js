import { describe, it, expect, bench } from 'vitest'
import { usePhoneticSearch } from '../composables/usePhoneticSearch'

describe('usePhoneticSearch performance', () => {
  const { phoneticMatch, generateSearchVariants } = usePhoneticSearch()

  it('should generate variants quickly for 1000 names', () => {
    const names = Array.from({ length: 1000 }, (_, i) => `田中太郎${i}`)
    const t0 = performance.now()
    for (const name of names) {
      generateSearchVariants(name)
    }
    const t1 = performance.now()
    expect(t1 - t0).toBeLessThan(500) // Should complete in <500ms
  })

  bench('phoneticMatch 1000x', () => {
    const names = Array.from({ length: 1000 }, (_, i) => `田中太郎${i}`)
    for (const name of names) {
      phoneticMatch('たなかたろう', name)
    }
  })
})
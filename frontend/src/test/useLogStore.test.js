import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLogStore } from '../composables/useLogStore';

// Helper to mock fetch
function mockFetch(data, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => data,
  });
}

describe('useLogStore', () => {
  let store;
  beforeEach(() => {
    store = useLogStore();
    store.reservationLog.value = [];
    store.clientLog.value = [];
    vi.resetAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  it('fetchReservationHistory sets reservationLog on success', async () => {
    const data = [{ id: 1, action: 'created' }];
    mockFetch(data);
    await store.fetchReservationHistory(123);
    expect(store.reservationLog.value).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/log/reservation/123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('fetchClientHistory sets clientLog on success', async () => {
    const data = [{ id: 2, action: 'updated' }];
    mockFetch(data);
    await store.fetchClientHistory(456);
    expect(store.clientLog.value).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/log/client/456',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('handles fetchReservationHistory error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchReservationHistory(999);
    expect(store.reservationLog.value).toEqual([]);
  });

  it('handles fetchClientHistory error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchClientHistory(999);
    expect(store.clientLog.value).toEqual([]);
  });
}); 
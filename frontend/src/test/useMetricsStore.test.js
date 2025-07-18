import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMetricsStore } from '../composables/useMetricsStore';

function mockFetch(data, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => data,
  });
}

describe('useMetricsStore', () => {
  let store;
  beforeEach(() => {
    store = useMetricsStore();
    store.reservationsToday.value = 0;
    store.averageBookingLeadTime.value = 0;
    store.averageArrivalLeadTime.value = 0;
    store.waitlistEntriesToday.value = 0;
    vi.resetAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  it('fetchReservationsToday sets reservationsToday on success', async () => {
    mockFetch(5);
    await store.fetchReservationsToday(1, '2024-01-01');
    expect(store.reservationsToday.value).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/reservations-today/1/2024-01-01',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('fetchBookingLeadTime sets averageBookingLeadTime on success', async () => {
    mockFetch(2.5);
    await store.fetchBookingLeadTime(1, 7, '2024-01-01');
    expect(store.averageBookingLeadTime.value).toBe(2.5);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/average-lead-time/booking/1/7/2024-01-01',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('fetchArrivalLeadTime sets averageArrivalLeadTime on success', async () => {
    mockFetch(3.2);
    await store.fetchArrivalLeadTime(1, 7, '2024-01-01');
    expect(store.averageArrivalLeadTime.value).toBe(3.2);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/average-lead-time/arrival/1/7/2024-01-01',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('fetchWaitlistEntriesToday sets waitlistEntriesToday on success', async () => {
    mockFetch(8);
    await store.fetchWaitlistEntriesToday(1, '2024-01-01');
    expect(store.waitlistEntriesToday.value).toBe(8);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/waitlist-entries-today/1/2024-01-01',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('handles fetchReservationsToday error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchReservationsToday(1, '2024-01-01');
    expect(store.reservationsToday.value).toBe(0);
  });

  it('handles fetchBookingLeadTime error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchBookingLeadTime(1, 7, '2024-01-01');
    expect(store.averageBookingLeadTime.value).toBe(0);
  });

  it('handles fetchArrivalLeadTime error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchArrivalLeadTime(1, 7, '2024-01-01');
    expect(store.averageArrivalLeadTime.value).toBe(0);
  });

  it('handles fetchWaitlistEntriesToday error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await store.fetchWaitlistEntriesToday(1, '2024-01-01');
    expect(store.waitlistEntriesToday.value).toBe(0);
  });
}); 
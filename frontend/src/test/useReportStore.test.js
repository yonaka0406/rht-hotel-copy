import { describe, it, expect } from 'vitest';
import { useReportStore } from '../composables/useReportStore';

describe('useReportStore - search and saved search methods', () => {
  let reportStore;
  beforeEach(() => {
    reportStore = useReportStore();
  });

  it('has searchReservations method', () => {
    expect(typeof reportStore.searchReservations).toBe('function');
  });

  it('has getSearchSuggestions method', () => {
    expect(typeof reportStore.getSearchSuggestions).toBe('function');
  });

  it('has getSavedSearches method', () => {
    expect(typeof reportStore.getSavedSearches).toBe('function');
  });

  it('has manageSavedSearches method', () => {
    expect(typeof reportStore.manageSavedSearches).toBe('function');
  });

  // Optionally, you can add simple invocation tests if these methods do not require arguments or can be called with dummy data.
});
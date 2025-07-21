import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReportStore } from '../composables/useReportStore';

// Create mock API functions
const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPut = vi.fn();
const mockApiDel = vi.fn();

// Mock the useApi module
vi.mock('../composables/useApi', () => {
  return {
    useApi: vi.fn(() => ({
      get: mockApiGet,
      post: mockApiPost,
      put: mockApiPut,
      del: mockApiDel
    })),
    setApiDependencies: vi.fn()
  };
});

// Mock fetch for blob responses
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document methods for export functions
document.createElement = vi.fn(() => ({
  setAttribute: vi.fn(),
  href: '',
  click: vi.fn()
}));
document.body.appendChild = vi.fn();
document.body.removeChild = vi.fn();
window.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('useReportStore', () => {
  let reportStore;
  
  beforeEach(async () => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Reset mock API responses
    mockApiGet.mockReset().mockResolvedValue({});
    mockApiPost.mockReset().mockResolvedValue({});
    mockApiPut.mockReset().mockResolvedValue({});
    mockApiDel.mockReset().mockResolvedValue({});
    
    // Create a fresh instance of the store
    reportStore = useReportStore();
    
    // Force API initialization by calling a method that uses it
    await reportStore.fetchCountReservation(1, '2023-01-01', '2023-01-31');
    
    // Mock fetch for blob responses
    global.fetch.mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['test data'], { type: 'text/csv' }))
    });
  });
  
  describe('API calls', () => {
    it('should call API with correct parameters for fetchCountReservation', async () => {
      await reportStore.fetchCountReservation(1, '2023-01-01', '2023-01-31');
      expect(mockApiGet).toHaveBeenCalledWith('/report/res/count/1/2023-01-01/2023-01-31');
    });
    
    it('should call API with correct parameters for fetchCountReservationDetails', async () => {
      await reportStore.fetchCountReservationDetails(1, '2023-01-01', '2023-01-31');
      expect(mockApiGet).toHaveBeenCalledWith('/report/res/count/dtl/1/2023-01-01/2023-01-31');
    });
    
    it('should call API with correct parameters for fetchOccupationByPeriod', async () => {
      await reportStore.fetchOccupationByPeriod('month', 1, '2023-01-01');
      expect(mockApiGet).toHaveBeenCalledWith('/report/occ/month/1/2023-01-01');
    });
    
    it('should call API with correct parameters for fetchReservationListView', async () => {
      // Mock response with reservation data
      mockApiGet.mockResolvedValueOnce([{
        id: 1,
        clients_json: JSON.stringify([{ name: 'John Doe' }]),
        payers_json: JSON.stringify([{ name: 'John Doe' }])
      }]);
      
      await reportStore.fetchReservationListView(1, '2023-01-01', '2023-01-31');
      expect(mockApiGet).toHaveBeenCalledWith('/report/res/list/1/2023-01-01/2023-01-31');
    });
    
    it('should call API with correct parameters for fetchForecastData', async () => {
      await reportStore.fetchForecastData(1, '2023-01-01', '2023-01-31');
      expect(mockApiGet).toHaveBeenCalledWith('/report/forecast/1/2023-01-01/2023-01-31');
    });
    
    it('should call API with correct parameters for fetchAccountingData', async () => {
      await reportStore.fetchAccountingData(1, '2023-01-01', '2023-01-31');
      expect(mockApiGet).toHaveBeenCalledWith('/report/accounting/1/2023-01-01/2023-01-31');
    });
  });
  
  describe('export functions', () => {
    it('should handle exportReservationList correctly', async () => {
      const result = await reportStore.exportReservationList(1, '2023-01-01', '2023-01-31');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/report/download/res/list/1/2023-01-01/2023-01-31',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    it('should handle exportReservationDetails correctly', async () => {
      const result = await reportStore.exportReservationDetails(1, '2023-01-01', '2023-01-31');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/report/download/res/dtl/1/2023-01-01/2023-01-31',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    it('should handle exportMealCount correctly', async () => {
      const result = await reportStore.exportMealCount(1, '2023-01-01', '2023-01-31');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/report/download/res/meals/1/2023-01-01/2023-01-31',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
    
    it('should handle no data response in exportMealCount', async () => {
      // Mock 404 response
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await reportStore.exportMealCount(1, '2023-01-01', '2023-01-31');
      expect(result).toBe('no_data');
    });
    
    it('should handle empty blob in exportMealCount', async () => {
      // Mock empty blob
      global.fetch.mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob([], { type: 'text/csv' }))
      });
      
      const result = await reportStore.exportMealCount(1, '2023-01-01', '2023-01-31');
      expect(result).toBe('no_data');
    });
  });
  
  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(reportStore.fetchActiveReservationsChange(1, '2023-01-01'))
        .rejects.toThrow('API Error');
    });
    
    it('should handle network errors in export functions', async () => {
      global.fetch.mockRejectedValue(new Error('Network Error'));
      
      await expect(reportStore.exportReservationList(1, '2023-01-01', '2023-01-31'))
        .rejects.toThrow('Network Error');
    });
    
    it('should handle HTTP errors in export functions', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });
      
      await expect(reportStore.exportReservationList(1, '2023-01-01', '2023-01-31'))
        .rejects.toThrow('Failed to fetch CSV');
    });
    
    it('should handle limited functionality gracefully', async () => {
      // Force limited functionality mode by making API initialization fail
      vi.mock('../composables/useApi', () => {
        return {
          useApi: vi.fn(() => {
            throw new Error('API not available');
          }),
          setApiDependencies: vi.fn()
        };
      });
      
      // Create a new store instance with the mocked API
      const limitedStore = useReportStore();
      
      const result = await limitedStore.fetchCountReservation(1, '2023-01-01', '2023-01-31');
      
      expect(result).toEqual({
        message: 'API not available, report functionality limited',
        data: [],
        count: 0
      });
    });
  });
});
/**
 * OTA Stock Investigation Service
 * Provides API methods for the stock investigation tool
 */

const API_BASE = '/api';

export const otaInvestigationService = {
  /**
   * Run stock investigation for a specific hotel and date
   * @param {number} hotelId - The hotel ID
   * @param {string} date - The target date in YYYY-MM-DD format
   * @returns {Promise<Object>} Investigation results
   */
  async investigateStock(hotelId, date) {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/ota/investigate-stock?hotelId=${hotelId}&date=${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Investigation failed');
    }

    return await response.json();
  },

  /**
   * Get OTA XML data for a specific queue entry
   * @param {number} xmlId - The OTA XML queue ID
   * @returns {Promise<Object>} XML data
   */
  async getOTAXMLData(xmlId) {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/ota/xml-data/${xmlId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch OTA XML data');
    }

    return await response.json();
  }
};

export default otaInvestigationService;
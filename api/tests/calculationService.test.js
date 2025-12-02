const { calculatePriceFromRates, calculateIsAccommodation } = require('../models/reservations/services/calculationService');

describe('Calculation Service - is_accommodation Logic', () => {
  describe('calculateIsAccommodation', () => {
    it('should return TRUE when at least one rate has sales_category = accommodation', () => {
      const rates = [
        { sales_category: 'accommodation', adjustment_type: 'base_rate', adjustment_value: 10000 },
        { sales_category: 'other', adjustment_type: 'flat_fee', adjustment_value: 500 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(true);
    });

    it('should return FALSE when all rates have sales_category = other', () => {
      const rates = [
        { sales_category: 'other', adjustment_type: 'base_rate', adjustment_value: 500 },
        { sales_category: 'other', adjustment_type: 'flat_fee', adjustment_value: 100 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(false);
    });

    it('should return TRUE when sales_category is NULL (backward compatibility)', () => {
      const rates = [
        { sales_category: null, adjustment_type: 'base_rate', adjustment_value: 10000 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(true);
    });

    it('should return TRUE when rates array is empty (backward compatibility)', () => {
      expect(calculateIsAccommodation([])).toBe(true);
    });

    it('should return TRUE when rates is null (backward compatibility)', () => {
      expect(calculateIsAccommodation(null)).toBe(true);
    });

    it('should return FALSE for system blocks regardless of rates', () => {
      const rates = [
        { sales_category: 'accommodation', adjustment_type: 'base_rate', adjustment_value: 10000 }
      ];
      
      expect(calculateIsAccommodation(rates, true)).toBe(false);
    });

    it('should return FALSE for system blocks even with empty rates', () => {
      expect(calculateIsAccommodation([], true)).toBe(false);
    });

    it('should return TRUE when mixed NULL and accommodation rates', () => {
      const rates = [
        { sales_category: null, adjustment_type: 'base_rate', adjustment_value: 5000 },
        { sales_category: 'accommodation', adjustment_type: 'flat_fee', adjustment_value: 500 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(true);
    });

    it('should return TRUE when mixed NULL and other rates', () => {
      const rates = [
        { sales_category: null, adjustment_type: 'base_rate', adjustment_value: 5000 },
        { sales_category: 'other', adjustment_type: 'flat_fee', adjustment_value: 500 }
      ];
      
      // NULL is treated as accommodation, so this should be TRUE
      expect(calculateIsAccommodation(rates)).toBe(true);
    });

    it('should return TRUE for single accommodation rate', () => {
      const rates = [
        { sales_category: 'accommodation', adjustment_type: 'base_rate', adjustment_value: 10000 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(true);
    });

    it('should return FALSE for single other rate', () => {
      const rates = [
        { sales_category: 'other', adjustment_type: 'base_rate', adjustment_value: 500 }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(false);
    });
  });

  describe('calculatePriceFromRates', () => {
    it('should calculate price correctly with accommodation rates', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 10000, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        },
        { 
          adjustment_type: 'flat_fee', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        }
      ];
      
      const price = calculatePriceFromRates(rates);
      expect(price).toBe(10500);
    });

    it('should calculate price correctly with other rates', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'other'
        },
        { 
          adjustment_type: 'flat_fee', 
          adjustment_value: 100, 
          tax_type_id: 2,
          sales_category: 'other'
        }
      ];
      
      const price = calculatePriceFromRates(rates);
      expect(price).toBe(600);
    });

    it('should calculate price correctly with mixed sales categories', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 10000, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        },
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'other'
        }
      ];
      
      const price = calculatePriceFromRates(rates);
      expect(price).toBe(10500);
    });

    it('should return 0 for empty rates array', () => {
      expect(calculatePriceFromRates([])).toBe(0);
    });

    it('should return 0 for null rates', () => {
      expect(calculatePriceFromRates(null)).toBe(0);
    });
  });

  describe('Integration: is_accommodation with price calculation', () => {
    it('should correctly identify accommodation reservation with positive price', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 10000, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        }
      ];
      
      const isAccommodation = calculateIsAccommodation(rates);
      const price = calculatePriceFromRates(rates);
      
      expect(isAccommodation).toBe(true);
      expect(price).toBeGreaterThan(0);
    });

    it('should correctly identify other reservation with positive price', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'other'
        }
      ];
      
      const isAccommodation = calculateIsAccommodation(rates);
      const price = calculatePriceFromRates(rates);
      
      expect(isAccommodation).toBe(false);
      expect(price).toBeGreaterThan(0);
    });

    it('should handle mixed rates correctly', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 6400, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        },
        { 
          adjustment_type: 'flat_fee', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        },
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 100, 
          tax_type_id: 2,
          sales_category: 'other'
        }
      ];
      
      const isAccommodation = calculateIsAccommodation(rates);
      const price = calculatePriceFromRates(rates);
      
      // Should be accommodation because at least one rate is accommodation
      expect(isAccommodation).toBe(true);
      // Price should be sum of all rates
      expect(price).toBe(7000);
    });
  });

  describe('Requirement 2.4: All rates are other', () => {
    it('should set is_accommodation to FALSE when all rates are other', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 100, 
          tax_type_id: 2,
          sales_category: 'other'
        },
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 500, 
          tax_type_id: 1,
          sales_category: 'other'
        }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(false);
    });
  });

  describe('Requirement 2.5: At least one accommodation rate', () => {
    it('should set is_accommodation to TRUE when at least one rate is accommodation', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 6400, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        },
        { 
          adjustment_type: 'flat_fee', 
          adjustment_value: 500, 
          tax_type_id: 2,
          sales_category: 'other'
        }
      ];
      
      expect(calculateIsAccommodation(rates)).toBe(true);
    });
  });

  describe('Requirement 2.2: System blocks', () => {
    it('should set is_accommodation to FALSE for system blocks', () => {
      const rates = [
        { 
          adjustment_type: 'base_rate', 
          adjustment_value: 10000, 
          tax_type_id: 2,
          sales_category: 'accommodation'
        }
      ];
      
      expect(calculateIsAccommodation(rates, true)).toBe(false);
    });
  });
});

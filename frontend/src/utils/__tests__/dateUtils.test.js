import { describe, it, expect } from 'vitest';
import { formatDateMonth, normalizeDate, formatCompactDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDateMonth', () => {
    it('should format a Date object to YYYY-MM', () => {
      const date = new Date(2023, 0, 15); // Jan 15, 2023
      expect(formatDateMonth(date)).toBe('2023-01');
    });

    it('should coerce a valid date string to YYYY-MM', () => {
      expect(formatDateMonth('2023-05-20')).toBe('2023-05');
    });

    it('should return null for null input', () => {
      expect(formatDateMonth(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatDateMonth(undefined)).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(formatDateMonth('invalid-date')).toBeNull();
    });

    it('should return null for invalid Date object', () => {
      expect(formatDateMonth(new Date('invalid'))).toBeNull();
    });
  });

  describe('formatCompactDate', () => {
    it('should format a date to M/D(weekday)', () => {
      const date = new Date(2025, 0, 16); // 2025-01-16 (Thursday)
      // Note: toLocaleDateString might depend on the environment locale,
      // but 'ja-JP' is explicitly used in the function.
      expect(formatCompactDate(date)).toBe('1/16(木)');
    });

    it('should handle string input', () => {
      expect(formatCompactDate('2025-01-16')).toBe('1/16(木)');
    });

    it('should return empty string for invalid input', () => {
      expect(formatCompactDate(null)).toBe('');
      expect(formatCompactDate(undefined)).toBe('');
      expect(formatCompactDate('invalid')).toBe('');
    });
  });

  describe('normalizeDate', () => {
    it('should normalize a Date object (set time to midnight)', () => {
      const date = new Date(2023, 5, 10, 15, 30, 0);
      const normalized = normalizeDate(date);
      expect(normalized.getFullYear()).toBe(2023);
      expect(normalized.getMonth()).toBe(5);
      expect(normalized.getDate()).toBe(10);
      expect(normalized.getHours()).toBe(0);
      expect(normalized.getMinutes()).toBe(0);
      expect(normalized.getSeconds()).toBe(0);
    });

    it('should coerce a valid date string and normalize it', () => {
      const dateString = '2023-12-25T10:00:00';
      const normalized = normalizeDate(dateString);
      expect(normalized.getFullYear()).toBe(2023);
      expect(normalized.getMonth()).toBe(11); // December
      expect(normalized.getDate()).toBe(25);
      expect(normalized.getHours()).toBe(0);
    });

    it('should return null for null input', () => {
      expect(normalizeDate(null)).toBeNull();
    });

    it('should return null for invalid date input', () => {
      expect(normalizeDate('not-a-date')).toBeNull();
    });
  });
});

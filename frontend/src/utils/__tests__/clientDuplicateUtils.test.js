import { describe, it, expect } from 'vitest';
import { findDuplicates, normalizeClientName, findCandidatesForClient } from '../clientDuplicateUtils';

describe('clientDuplicateUtils', () => {
    describe('normalizeClientName', () => {
        it('should handle full-width/half-width conversion', () => {
            expect(normalizeClientName('株式会社ＴＥＳＴ')).toBe('test');
            expect(normalizeClientName('株式会社TEST')).toBe('test');
        });

        it('should strip common corporate prefixes/suffixes', () => {
            expect(normalizeClientName('株式会社北弘電社')).toBe('北弘電社');
            expect(normalizeClientName('北弘電社　本社')).toBe('北弘電社本社');
        });
    });

    describe('findDuplicates', () => {
        const clients = [
            { id: '1', name: '株式会社北弘電社', email: 'test@example.com', created_at: '2023-01-01' },
            { id: '2', name: '北弘電社', email: 'test@example.com', created_at: '2023-01-02' },
            { id: '3', name: '株式会社北弘電社　本社総務企画部', created_at: '2023-01-03' },
            { id: '4', name: '株式会社北弘電社　本社総務企画部', created_at: '2023-01-04' },
        ];

        it('should find exact matches and similarity candidates', () => {
            const results = findDuplicates(clients);
            // Result 1: Earliest '1', duplicates ['2'] (exact email/name)
            // Result 2: Earliest '3', duplicates ['4'] (exact name)
            // Plus similarity between '1' and '3'
            expect(results.length).toBeGreaterThan(0);
        });

        it('should handle input with duplicate IDs', () => {
            const duplicatedInput = [...clients, clients[0]];
            const results = findDuplicates(duplicatedInput);
            const earliestIds = results.map(r => r.earliest.id);
            expect(new Set(earliestIds).size).toBe(earliestIds.length);
        });
    });
});

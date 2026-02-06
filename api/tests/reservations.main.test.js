const reservationsMainModel = require('../models/reservations/details');

// --- Mocking Infrastructure ---
const mockDbClientOrPool = {
    query: jest.fn(),
    release: jest.fn(() => {}),
    connect: jest.fn(async () => mockDbClientOrPool)
};

describe('reservationsMainModel', () => {
    let originalGetPool;

    beforeEach(() => {
        originalGetPool = reservationsMainModel.__getOriginalGetPool();
        reservationsMainModel.__setGetPool(() => mockDbClientOrPool);

        mockDbClientOrPool.query.mockClear();
        mockDbClientOrPool.release.mockClear();
        mockDbClientOrPool.connect.mockClear();
    });

    afterEach(() => {
        reservationsMainModel.__setGetPool(originalGetPool);
    });

    describe('updateReservationDetailStatus', () => {
        it('should calculate cancellation fee correctly based on include_in_cancel_fee', async () => {
            const requestId = 'test-req-id';
            const reservationData = {
                id: 'detail-uuid-1',
                hotel_id: 'hotel1',
                status: 'cancelled',
                updated_by: 'user-uuid-1',
                billable: true,
            };

            mockDbClientOrPool.query.mockImplementation((query, values) => {
                // console.log('TEST QUERY:', query);
                // selectReservationDetailsById
                if (query.includes('SELECT * FROM reservation_details') && query.includes('WHERE id = $1::UUID')) {
                    return Promise.resolve({ rows: [{ reservation_id: 'res-uuid-1' }] });
                }
                // selectReservationById
                if (query.includes('SELECT * FROM reservations') && query.includes('WHERE id = $1::UUID')) {
                    return Promise.resolve({ rows: [{ status: 'confirmed' }] });
                }
                // selectRatesByDetailsId
                if (query.includes('SELECT * FROM reservation_rates')) {
                    return Promise.resolve({
                        rows: [
                            { adjustment_type: 'base_rate', adjustment_value: 5000, include_in_cancel_fee: true, tax_rate: 0.1, price: 5000 },
                            { adjustment_type: 'flat_fee', adjustment_value: 2000, include_in_cancel_fee: false, tax_rate: 0.1, price: 2000 },
                            { adjustment_type: 'percentage', adjustment_value: 10, include_in_cancel_fee: true, tax_rate: 0.1, price: 500 },
                        ]
                    });
                }
                // updateDetailsCancelledStatus
                if (query.includes('UPDATE reservation_details') && query.includes('cancelled = gen_random_uuid()')) {
                    return Promise.resolve({ rows: [{ id: reservationData.id, price: 5500 }] });
                }
                // remainingDetailsQuery
                if (query.includes('MIN(date)') && query.includes('MAX(date)') && query.includes('FROM reservation_details')) {
                    return Promise.resolve({ rows: [{ new_check_in: '2023-01-01', new_check_out: '2023-01-02' }] });
                }
                // Default
                return Promise.resolve({ rows: [], rowCount: 1 });
            });

            const updatedDetail = await reservationsMainModel.updateReservationDetailStatus(
                requestId,
                reservationData
            );

            expect(mockDbClientOrPool.query).toHaveBeenCalledWith('BEGIN');
            expect(mockDbClientOrPool.query).toHaveBeenCalledWith('COMMIT');

            expect(mockDbClientOrPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/UPDATE reservation_details/i),
                expect.arrayContaining([5500])
            );

            expect(updatedDetail.id).toBe(reservationData.id);
        });

        it('should set cancellation fee to 0 if no rates are included in cancel fee', async () => {
            const requestId = 'test-req-id';
            const reservationData = {
                id: 'detail-uuid-2',
                hotel_id: 'hotel1',
                status: 'cancelled',
                updated_by: 'user-uuid-1',
                billable: true,
            };

            mockDbClientOrPool.query.mockImplementation((query, values) => {
                // selectReservationDetailsById
                if (query.includes('SELECT * FROM reservation_details') && query.includes('WHERE id = $1::UUID')) {
                    return Promise.resolve({ rows: [{ reservation_id: 'res-uuid-2' }] });
                }
                // selectReservationById
                if (query.includes('SELECT * FROM reservations') && query.includes('WHERE id = $1::UUID')) {
                    return Promise.resolve({ rows: [{ status: 'confirmed' }] });
                }
                // selectRatesByDetailsId
                if (query.includes('SELECT * FROM reservation_rates')) {
                    return Promise.resolve({
                        rows: [
                            { adjustment_type: 'base_rate', adjustment_value: 5000, include_in_cancel_fee: false, tax_rate: 0.1, price: 5000 },
                            { adjustment_type: 'flat_fee', adjustment_value: 2000, include_in_cancel_fee: false, tax_rate: 0.1, price: 2000 },
                        ]
                    });
                }
                // updateDetailsCancelledStatus
                if (query.includes('UPDATE reservation_details') && query.includes('cancelled = gen_random_uuid()')) {
                    return Promise.resolve({ rows: [{ id: reservationData.id, price: 0 }] });
                }
                // remainingDetailsQuery
                if (query.includes('MIN(date)') && query.includes('MAX(date)') && query.includes('FROM reservation_details')) {
                    return Promise.resolve({ rows: [{ new_check_in: '2023-01-01', new_check_out: '2023-01-02' }] });
                }
                // Default
                return Promise.resolve({ rows: [], rowCount: 1 });
            });

            const updatedDetail = await reservationsMainModel.updateReservationDetailStatus(
                requestId,
                reservationData
            );

            expect(mockDbClientOrPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/UPDATE reservation_details/i),
                expect.arrayContaining([0])
            );

            expect(updatedDetail.id).toBe(reservationData.id);
        });
    });
});

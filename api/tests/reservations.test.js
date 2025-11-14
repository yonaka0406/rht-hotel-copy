const assert = require('assert');
const sinon = require('sinon');
const reservationsWriteModel = require('../models/reservations/write');
const pool = require('../config/database');

// Mock the database pool and client
let mockClient = {
    query: sinon.stub(),
    release: sinon.stub(),
};

let getPoolStub;

describe('reservationsWriteModel', () => {
    beforeEach(() => {
        // Reset the stub before each test
        mockClient.query.reset();
        mockClient.release.reset();

        // Stub pool.get to return our mock client
        getPoolStub = sinon.stub(pool, 'get').returns({
            connect: sinon.stub().resolves(mockClient),
        });
    });

    afterEach(() => {
        // Restore the original pool.get function
        getPoolStub.restore();
    });

    describe('updateReservationDetailStatus', () => {
        it('should calculate cancellation fee correctly based on include_in_cancel_fee', async () => {
            const requestId = 'test-req-id';
            const hotelId = 'hotel1';
            const reservationDetailId = 'detail-uuid-1';
            const cancelledById = 'user-uuid-1';

            // Mock data for updatedDetailResult
            mockClient.query.withArgs(
                sinon.match(/UPDATE reservation_details SET cancelled = \$1/),
                sinon.match.array
            ).resolves({
                rows: [{ id: reservationDetailId, price: 10000 }] // Initial price
            });

            // Mock data for ratesResult
            mockClient.query.withArgs(
                sinon.match(/SELECT adjustment_type, adjustment_value, include_in_cancel_fee, tax_rate, price FROM reservation_rates/),
                sinon.match.array
            ).resolves({
                rows: [
                    { adjustment_type: 'base_rate', adjustment_value: 5000, include_in_cancel_fee: true, tax_rate: 0.1, price: 5000 },
                    { adjustment_type: 'flat_fee', adjustment_value: 2000, include_in_cancel_fee: false, tax_rate: 0.1, price: 2000 }, // Should be excluded
                    { adjustment_type: 'percentage', adjustment_value: 0.1, include_in_cancel_fee: true, tax_rate: 0.1, price: 1000 }, // Should be included
                ]
            });

            // Mock data for final price update
            mockClient.query.withArgs(
                sinon.match(/UPDATE reservation_details SET price = \$1/),
                sinon.match.array
            ).resolves({
                rows: [{ id: reservationDetailId, price: 6000 }] // Expected final price
            });

            const updatedDetail = await reservationsWriteModel.updateReservationDetailStatus(
                requestId,
                hotelId,
                reservationDetailId,
                cancelledById
            );

            // Verify that BEGIN and COMMIT were called
            assert(mockClient.query.calledWith('BEGIN'), 'BEGIN not called');
            assert(mockClient.query.calledWith('COMMIT'), 'COMMIT not called');

            // Verify the final price update query was called with the correct calculated fee
            // Expected calculation: 5000 (base_rate) + 1000 (percentage) = 6000
            assert(mockClient.query.calledWith(
                sinon.match(/UPDATE reservation_details SET price = \$1/),
                [6000, cancelledById, reservationDetailId, hotelId]
            ), 'Final price update query not called with correct cancellation fee');

            assert.strictEqual(updatedDetail.id, reservationDetailId, 'Updated detail ID should match');
        });

        it('should set cancellation fee to 0 if no rates are included in cancel fee', async () => {
            const requestId = 'test-req-id';
            const hotelId = 'hotel1';
            const reservationDetailId = 'detail-uuid-2';
            const cancelledById = 'user-uuid-1';

            // Mock data for updatedDetailResult
            mockClient.query.withArgs(
                sinon.match(/UPDATE reservation_details SET cancelled = \$1/),
                sinon.match.array
            ).resolves({
                rows: [{ id: reservationDetailId, price: 8000 }] // Initial price
            });

            // Mock data for ratesResult - all rates excluded
            mockClient.query.withArgs(
                sinon.match(/SELECT adjustment_type, adjustment_value, include_in_cancel_fee, tax_rate, price FROM reservation_rates/),
                sinon.match.array
            ).resolves({
                rows: [
                    { adjustment_type: 'base_rate', adjustment_value: 5000, include_in_cancel_fee: false, tax_rate: 0.1, price: 5000 },
                    { adjustment_type: 'flat_fee', adjustment_value: 2000, include_in_cancel_fee: false, tax_rate: 0.1, price: 2000 },
                ]
            });

            // Mock data for final price update
            mockClient.query.withArgs(
                sinon.match(/UPDATE reservation_details SET price = \$1/),
                sinon.match.array
            ).resolves({
                rows: [{ id: reservationDetailId, price: 0 }] // Expected final price
            });

            const updatedDetail = await reservationsWriteModel.updateReservationDetailStatus(
                requestId,
                hotelId,
                reservationDetailId,
                cancelledById
            );

            // Verify the final price update query was called with 0
            assert(mockClient.query.calledWith(
                sinon.match(/UPDATE reservation_details SET price = \$1/),
                [0, cancelledById, reservationDetailId, hotelId]
            ), 'Final price update query not called with 0 cancellation fee');

            assert.strictEqual(updatedDetail.id, reservationDetailId, 'Updated detail ID should match');
        });
    });
});

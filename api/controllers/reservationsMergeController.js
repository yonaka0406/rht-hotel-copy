const reservations = require('../models/reservations');
const { validateNumericParam } = require('../utils/validationUtils');

/**
 * GET /api/reservations/:reservationId/mergeable
 * Finds reservations that can be merged with the specified reservation.
 */
exports.getMergeableReservations = async (req, res) => {
    const requestId = req.requestId;
    const { reservationId } = req.params;
    const { hotelId } = req.query; // Assuming hotelId is passed as a query parameter

    // Validate input parameters
    const errors = [
        ...validateNumericParam(reservationId, 'reservationId'),
        ...validateNumericParam(hotelId, 'hotelId'),
    ];

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    try {
        const mergeableReservations = await reservations.findMergeableReservations(
            requestId,
            parseInt(hotelId, 10),
            parseInt(reservationId, 10)
        );
        res.status(200).json(mergeableReservations);
    } catch (error) {
        console.error('Error fetching mergeable reservations:', error);
        res.status(500).json({ message: 'Error fetching mergeable reservations', error: error.message });
    }
};

/**
 * POST /api/reservations/:mainReservationId/merge
 * Merges multiple reservations into a single main reservation.
 */
exports.mergeReservations = async (req, res) => {
    const requestId = req.requestId;
    const { mainReservationId } = req.params;
    const { hotelId, reservationIdsToMerge } = req.body;
    const userId = req.user.id;

    // Validate input parameters
    const errors = [
        ...validateNumericParam(mainReservationId, 'mainReservationId'),
        ...validateNumericParam(hotelId, 'hotelId'),
    ];

    if (!Array.isArray(reservationIdsToMerge) || reservationIdsToMerge.length === 0) {
        errors.push({ field: 'reservationIdsToMerge', message: 'reservationIdsToMerge must be a non-empty array.' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    try {
        const updatedMainReservation = await reservations.mergeReservations(
            requestId,
            parseInt(hotelId, 10),
            parseInt(mainReservationId, 10),
            reservationIdsToMerge.map(id => parseInt(id, 10)),
            userId
        );
        res.status(200).json({ message: 'Reservations merged successfully.', reservation: updatedMainReservation });
    } catch (error) {
        console.error('Error merging reservations:', error);
        res.status(500).json({ message: 'Error merging reservations', error: error.message });
    }
};

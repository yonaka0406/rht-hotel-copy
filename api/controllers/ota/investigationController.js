const { 
    getCurrentStateSnapshot,
    getPMSEvents,
    getOTAEvents,
    getReservationLifecycle,
    mergeTimeline,
    generateSummary,
    getOTAXMLData
} = require('../../models/ota/investigation');

/**
 * OTA Stock Investigation Controller
 * Provides diagnostic tools to investigate "Silent Skip" issues where OTA inventory 
 * updates are allegedly not sent to TL-Lincoln despite local PMS changes.
 */

/**
 * Investigate stock discrepancies for a specific hotel and date
 * GET /api/ota/investigate-stock
 */
const investigateStock = async (req, res) => {
    try {
        const { hotelId, date } = req.query;
        
        if (!hotelId || !date) {
            return res.status(400).json({
                error: 'Missing required parameters: hotelId and date'
            });
        }

        // Validate date format
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid date format'
            });
        }

        const investigation = {
            hotelId: parseInt(hotelId),
            targetDate: date,
            currentState: {},
            eventTimeline: [],
            summary: {}
        };

        // 1. Get current state snapshot
        investigation.currentState = await getCurrentStateSnapshot(hotelId, date);

        // 2. Get PMS events (reservations and maintenance affecting the target date)
        const pmsEvents = await getPMSEvents(hotelId, date);

        // 3. Get OTA XML queue events
        const otaEvents = await getOTAEvents(hotelId, date);

        // 4. Get reservation lifecycle summary
        const reservationLifecycle = await getReservationLifecycle(hotelId, date);

        // 5. Merge and sort timeline
        investigation.eventTimeline = mergeTimeline(pmsEvents, otaEvents);

        // 6. Generate summary and gap analysis
        investigation.summary = generateSummary(pmsEvents, otaEvents, investigation.eventTimeline);

        // 7. Add lifecycle data
        investigation.reservationLifecycle = reservationLifecycle;

        res.json(investigation);

    } catch (error) {
        console.error('Error in investigateStock:', error);
        res.status(500).json({
            error: 'Internal server error during stock investigation',
            details: error.message
        });
    }
};

/**
 * Get OTA XML data for a specific queue entry
 * GET /api/ota/xml-data/:id
 */
const getXMLData = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                error: 'Missing required parameter: id'
            });
        }

        const xmlData = await getOTAXMLData(id);
        
        if (!xmlData) {
            return res.status(404).json({
                error: 'OTA XML data not found'
            });
        }

        res.json(xmlData);

    } catch (error) {
        console.error('Error in getXMLData:', error);
        res.status(500).json({
            error: 'Internal server error while fetching OTA XML data',
            details: error.message
        });
    }
};

module.exports = {
    investigateStock,
    getXMLData
};
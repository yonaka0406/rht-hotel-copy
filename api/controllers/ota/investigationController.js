const { 
    getCurrentStateSnapshot,
    getPMSEvents,
    getOTAEvents,
    getReservationLifecycle,
    mergeTimeline,
    generateSummary,
    getOTAXMLData
} = require('../../models/ota/investigation');
const { checkMissingOTATriggers } = require('../../ota_trigger_monitor');
const { defaultMonitor: otaTriggerMonitor } = require('../../jobs/otaTriggerMonitorJob');

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

        // 6. Generate summary and gap analysis using CASCADE DELETE aware data
        investigation.summary = generateSummary(pmsEvents, otaEvents, investigation.eventTimeline, reservationLifecycle);

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

/**
 * Get OTA trigger monitoring status
 * GET /api/ota/trigger-monitor/status
 */
const getTriggerMonitorStatus = async (req, res) => {
    try {
        const status = otaTriggerMonitor.getStatus();
        
        res.json({
            success: true,
            status: {
                isRunning: status.isRunning,
                lastCheck: status.lastCheck,
                options: status.options,
                uptime: status.isRunning ? new Date() - (status.lastCheck?.timestamp || new Date()) : null
            }
        });

    } catch (error) {
        console.error('Error in getTriggerMonitorStatus:', error);
        res.status(500).json({
            error: 'Internal server error while getting trigger monitor status',
            details: error.message
        });
    }
};

/**
 * Run manual OTA trigger monitoring check
 * POST /api/ota/trigger-monitor/check
 */
const runTriggerMonitorCheck = async (req, res) => {
    try {
        const { hoursBack = 1, autoRemediate = false } = req.body;
        
        // Validate input
        if (hoursBack < 0.1 || hoursBack > 24) {
            return res.status(400).json({
                error: 'Invalid hoursBack parameter. Must be between 0.1 and 24.'
            });
        }
        
        // Run the check with optional auto-remediation
        const result = await checkMissingOTATriggers(hoursBack, {
            autoRemediate,
            baseUrl: req.envConfig?.backendUrl || 'http://localhost:5000'
        });
        
        res.json({
            success: true,
            result,
            timestamp: new Date().toISOString(),
            hoursBack,
            autoRemediate
        });

    } catch (error) {
        console.error('Error in runTriggerMonitorCheck:', error);
        res.status(500).json({
            error: 'Internal server error while running trigger monitor check',
            details: error.message
        });
    }
};

module.exports = {
    investigateStock,
    getXMLData,
    getTriggerMonitorStatus,
    runTriggerMonitorCheck
};
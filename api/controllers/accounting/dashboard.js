const accountingModel = require('../../models/accounting');
const validationUtils = require('../../utils/validationUtils');
const logger = require('../../config/logger');

const getDashboardMetrics = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { startDate, endDate, hotelIds } = req.query;

        logger.debug(`[Accounting] getDashboardMetrics requested. Start: ${startDate}, End: ${endDate}, Hotels: ${hotelIds}`);

        // 1. Resolve Hotel IDs (Default to all if empty or undefined)
        let targetHotelIds = [];
        if (hotelIds && hotelIds !== 'null' && hotelIds !== 'undefined') {
            if (Array.isArray(hotelIds)) {
                targetHotelIds = hotelIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else {
                if (typeof hotelIds === 'string' && hotelIds.includes(',')) {
                    targetHotelIds = hotelIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                } else {
                    targetHotelIds = [parseInt(hotelIds)].filter(id => !isNaN(id));
                }
            }
        }

        if (targetHotelIds.length === 0) {
            const hotelModel = require('../../models/hotel/read');
            const allHotels = await hotelModel.getAllHotels(requestId);
            targetHotelIds = allHotels.map(h => h.id);
            logger.debug(`[Accounting] Defaulting to all hotels: ${targetHotelIds}`);
        }

        // 2. Resolve Dates (Default to Last Month relative to today if missing)
        let queryStart = startDate;
        let queryEnd = endDate;

        if (!queryStart || !queryEnd) {
            const today = new Date(); // Jan 13, 2026
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

            const formatYMD = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            queryStart = formatYMD(lastMonthStart);
            queryEnd = formatYMD(lastMonthEnd);
            logger.debug(`[Accounting] Dates missing, defaulted to last month: ${queryStart} to ${queryEnd}`);
        }

        // 3. Fetch Metrics
        const metrics = await accountingModel.accountingRead.getDashboardMetrics(requestId, queryStart, queryEnd, targetHotelIds);

        logger.debug(`[Accounting] Dashboard metrics fetched successfully for ${queryStart} to ${queryEnd}`);
        res.json(metrics);
    } catch (err) {
        logger.error(`[Accounting] Error in getDashboardMetrics controller: ${err.message}`);
        next(err);
    }
};

const getReconciliationOverview = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { startDate, endDate, hotelIds } = req.query;

        // Same hotel ID resolution as metrics
        let targetHotelIds = [];
        if (hotelIds && hotelIds !== 'null' && hotelIds !== 'undefined') {
            if (Array.isArray(hotelIds)) {
                targetHotelIds = hotelIds.map(id => parseInt(id)).filter(id => !isNaN(id));
            } else {
                if (typeof hotelIds === 'string' && hotelIds.includes(',')) {
                    targetHotelIds = hotelIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                } else {
                    targetHotelIds = [parseInt(hotelIds)].filter(id => !isNaN(id));
                }
            }
        }

        if (targetHotelIds.length === 0) {
            const hotelModel = require('../../models/hotel/read');
            const allHotels = await hotelModel.getAllHotels(requestId);
            targetHotelIds = allHotels.map(h => h.id);
        }

        const data = await accountingModel.accountingRead.getReconciliationOverview(requestId, startDate, endDate, targetHotelIds);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

const getReconciliationHotelDetails = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { hotelId } = req.params;
        const { startDate, endDate } = req.query;

        validationUtils.validateNumericParam(hotelId, 'hotelId');

        const data = await accountingModel.accountingRead.getReconciliationHotelDetails(requestId, parseInt(hotelId), startDate, endDate);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

const getReconciliationClientDetails = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { hotelId, clientId } = req.params;
        const { startDate, endDate } = req.query;

        validationUtils.validateNumericParam(hotelId, 'hotelId');
        validationUtils.validateUuidParam(clientId, 'clientId');

        const data = await accountingModel.accountingRead.getReconciliationClientDetails(requestId, parseInt(hotelId), clientId, startDate, endDate);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardMetrics,
    getReconciliationOverview,
    getReconciliationHotelDetails,
    getReconciliationClientDetails
};

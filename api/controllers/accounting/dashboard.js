const accountingModel = require('../../models/accounting');
const validationUtils = require('../../utils/validationUtils');
const logger = require('../../config/logger');

const getDashboardMetrics = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { startDate, endDate, hotelIds } = req.query;

        // Basic validation
        if (!startDate || !endDate) {
            const error = new Error('Start date and end date are required');
            error.statusCode = 400;
            throw error;
        }

        // Validate hotelIds
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

        // Check if hotelIds are provided, otherwise throw error or return empty?
        // Usually, dashboard fetches data for accessible hotels. 
        // If frontend sends no hotelIds, we should probably fail or handle it.
        // But for now, let's assume valid request.

        const metrics = await accountingModel.getDashboardMetrics(requestId, startDate, endDate, targetHotelIds);
        res.json(metrics);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardMetrics
};

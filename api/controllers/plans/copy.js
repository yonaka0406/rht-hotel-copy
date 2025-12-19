const planModels = require('../../models/plan');
const logger = require('../../config/logger');

// Plan Copy Between Hotels
const copyPlanToHotel = async (req, res) => {
    const { sourcePlanId, sourceHotelId, targetHotelId, options } = req.body;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!sourcePlanId || !sourceHotelId || !targetHotelId) {
        return res.status(400).json({ error: 'Missing required fields: sourcePlanId, sourceHotelId, and targetHotelId are required.' });
    }

    const userId = req.user.id;

    logger.debug('copyPlanToHotel called', {
        requestId: req.requestId,
        sourcePlanId,
        sourceHotelId,
        targetHotelId,
        options,
        userId
    });

    try {
        logger.debug('Calling planModels.copyPlanToHotel', { requestId: req.requestId });
        const newPlan = await planModels.copyPlanToHotel(req.requestId, sourcePlanId, sourceHotelId, targetHotelId, { ...options, userId });

        logger.debug('Plan copied successfully', {
            requestId: req.requestId,
            newPlanId: newPlan?.id,
            newPlan
        });

        res.status(201).json(newPlan);
    } catch (error) {
        logger.error('Error copying plan to hotel', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            sourcePlanId,
            sourceHotelId,
            targetHotelId
        });
        res.status(500).json({ error: 'Failed to copy plan to hotel' });
    }
};

const bulkCopyPlansToHotel = async (req, res) => {
    const { sourcePlanIds, sourceHotelId, targetHotelId, options } = req.body;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(sourcePlanIds) || sourcePlanIds.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty sourcePlanIds' });
    }

    if (!sourceHotelId || !targetHotelId) {
        return res.status(400).json({ error: 'Missing required fields: sourceHotelId and targetHotelId are required.' });
    }

    const userId = req.user.id;

    logger.debug('bulkCopyPlansToHotel called', {
        requestId: req.requestId,
        sourcePlanIds,
        sourceHotelId,
        targetHotelId,
        options,
        userId,
        planCount: sourcePlanIds?.length
    });

    try {
        logger.debug('Calling planModels.bulkCopyPlansToHotel', { requestId: req.requestId });
        const copiedPlans = await planModels.bulkCopyPlansToHotel(req.requestId, sourcePlanIds, sourceHotelId, targetHotelId, { ...options, userId });

        logger.debug('Plans bulk copied successfully', {
            requestId: req.requestId,
            copiedCount: copiedPlans?.length,
            copiedPlans
        });

        res.status(201).json(copiedPlans);
    } catch (error) {
        logger.error('Error bulk copying plans to hotel', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack,
            sourcePlanIds,
            sourceHotelId,
            targetHotelId
        });
        res.status(500).json({ error: 'Failed to bulk copy plans to hotel' });
    }
};

module.exports = {
    copyPlanToHotel,
    bulkCopyPlansToHotel,
};
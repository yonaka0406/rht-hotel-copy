const planModels = require('../../models/plan');

// Plan Copy Between Hotels
const copyPlanToHotel = async (req, res) => {
    const { sourcePlanId, sourceHotelId, targetHotelId, options } = req.body;
    const userId = req.user.id;

    try {
        const newPlan = await planModels.copyPlanToHotel(req.requestId, sourcePlanId, sourceHotelId, targetHotelId, { ...options, userId });
        res.status(201).json(newPlan);
    } catch (error) {
        console.error('Error copying plan to hotel:', error);
        res.status(500).json({ error: 'Failed to copy plan to hotel' });
    }
};

const bulkCopyPlansToHotel = async (req, res) => {
    const { sourcePlanIds, sourceHotelId, targetHotelId, options } = req.body;
    const userId = req.user.id;

    try {
        const copiedPlans = await planModels.bulkCopyPlansToHotel(req.requestId, sourcePlanIds, sourceHotelId, targetHotelId, { ...options, userId });
        res.status(201).json(copiedPlans);
    } catch (error) {
        console.error('Error bulk copying plans to hotel:', error);
        res.status(500).json({ error: 'Failed to bulk copy plans to hotel' });
    }
};

module.exports = {
    copyPlanToHotel,
    bulkCopyPlansToHotel,
};

const express = require('express');
const router = express.Router();
const { getGlobalPlans, getHotelsPlans, getHotelPlans, fetchAllHotelPlans, 
    createGlobalPlan, createHotelPlan, editGlobalPlan, editHotelPlan, getGlobalPatterns, getHotelPatterns, fetchAllHotelPatterns, createPlanPattern, editPlanPattern } = require('../controllers/plansController');
const { getPlanRates, getPlanRate, getPlanRateByDay, getPlanRatesByDay, createNewPlanRate, updateExistingPlanRate, deletePlanRate } = require('../controllers/plansRateController');
const { getPlanAddons, getPlanAddon, createNewPlanAddon, updateExistingPlanAddon, deleteExistingPlanAddon } = require('../controllers/plansAddonController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// Global Plans routes
router.get('/plans/global', authMiddleware, getGlobalPlans);
router.post('/plans/global', authMiddleware_manageDB, createGlobalPlan);
router.put('/plans/global/:id', authMiddleware_manageDB, editGlobalPlan);

// Hotel-specific Plans routes
router.get('/plans/hotel', authMiddleware, getHotelsPlans);
router.get('/plans/hotel/:hotel_id', authMiddleware, getHotelPlans);
router.post('/plans/hotel', authMiddleware_manageDB, createHotelPlan);
router.put('/plans/hotel/:id', authMiddleware_manageDB, editHotelPlan);

// Available Plans routes
router.get('/plans/all/:hotel_id', authMiddleware, fetchAllHotelPlans);

// Plan Rates routes
router.get('/plans/:gid/:hid/:hotel_id/rates', authMiddleware, getPlanRates);
router.get('/plans/rates/:id', authMiddleware, getPlanRate);
router.get('/plan/rate/:gid/:hid/:hotel_id/:date', authMiddleware, getPlanRateByDay);
router.get('/plan/rate-detail/:gid/:hid/:hotel_id/:date', authMiddleware, getPlanRatesByDay);
router.post('/plans/:planId/rates', authMiddleware_manageDB, createNewPlanRate);
router.put('/plans/rates/:id', authMiddleware_manageDB, updateExistingPlanRate);
//router.delete('/plans/rates/:id', authMiddleware_manageDB, deletePlanRate);

// Plan Addons routes
router.get('/plans/:gid/:hid/:hotel_id/addons', authMiddleware, getPlanAddons);
router.get('/plans/addons/:id', authMiddleware, getPlanAddon);
router.post('/plans/addons', authMiddleware_manageDB, createNewPlanAddon);
router.put('/plans/addons/:id', authMiddleware_manageDB, updateExistingPlanAddon);
//router.delete('/plans/addons/:id', authMiddleware_manageDB, deleteExistingPlanAddon);

// Global Plans routes
router.get('/plans/patterns/global', authMiddleware, getGlobalPatterns);
router.get('/plans/patterns/hotel', authMiddleware, getHotelPatterns);
router.get('/plans/patterns/all/:hotel_id', authMiddleware, fetchAllHotelPatterns);
router.post('/plans/patterns', authMiddleware_manageDB, createPlanPattern);
router.put('/plans/patterns/:id', authMiddleware_manageDB, editPlanPattern);


module.exports = router;
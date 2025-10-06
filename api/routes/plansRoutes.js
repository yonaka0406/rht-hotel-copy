const express = require('express');
const router = express.Router();
const plansController = require('../controllers/plans');
const plansRateController = require('../controllers/plansRate');
const plansAddonController = require('../controllers/plansAddon');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// Global Plans routes
router.get('/plans/global', authMiddleware, plansController.getGlobalPlans);
router.post('/plans/global', authMiddleware_manageDB, plansController.createGlobalPlan);
router.put('/plans/global/:id', authMiddleware_manageDB, plansController.editGlobalPlan);

// Hotel-specific Plans routes
router.get('/plans/hotel', authMiddleware, plansController.getHotelsPlans);
router.get('/plans/hotel/:hotel_id', authMiddleware, plansController.getHotelPlans);
router.post('/plans/hotel', authMiddleware_manageDB, plansController.createHotelPlan);
router.put('/plans/hotel/:id', authMiddleware_manageDB, plansController.editHotelPlan);

// Available Plans
router.get('/plans/all/:hotel_id', authMiddleware, plansController.fetchAllHotelPlans);

// Global Plans routes
router.get('/plans/patterns/global', authMiddleware, plansController.getGlobalPatterns);
router.get('/plans/patterns/hotel', authMiddleware, plansController.getHotelPatterns);
router.get('/plans/patterns/all/:hotel_id', authMiddleware, plansController.fetchAllHotelPatterns);
router.post('/plans/patterns', authMiddleware_manageDB, plansController.createPlanPattern);
router.put('/plans/patterns/:id', authMiddleware_manageDB, plansController.editPlanPattern);

// Plan Rates routes
router.get('/plans/:gid/:hid/:hotel_id/rates', authMiddleware, plansRateController.getPlanRates);
router.get('/plans/rates/:id', authMiddleware, plansRateController.getPlanRate);
router.get('/plan/rate/:gid/:hid/:hotel_id/:date', authMiddleware, plansRateController.getPlanRateByDay);
router.get('/plan/rate-detail/:gid/:hid/:hotel_id/:date', authMiddleware, plansRateController.getPlanRatesByDay);
router.post('/plans/:planId/rates', authMiddleware_manageDB, plansRateController.createNewPlanRate);
router.put('/plans/rates/:id', authMiddleware_manageDB, plansRateController.updateExistingPlanRate);
router.delete('/plans/rates/:id', authMiddleware_manageDB, plansRateController.deletePlanRate);

// Plan Addons routes
router.get('/plans/:gid/:hid/:hotel_id/addons', authMiddleware, plansAddonController.getPlanAddons);
router.get('/plans/addons/:id', authMiddleware, plansAddonController.getPlanAddon);
router.post('/plans/addons', authMiddleware_manageDB, plansAddonController.createNewPlanAddon);
router.put('/plans/addons/:id', authMiddleware_manageDB, plansAddonController.updateExistingPlanAddon);
router.delete('/plans/addons/:id', authMiddleware_manageDB, plansAddonController.deleteExistingPlanAddon);

module.exports = router;
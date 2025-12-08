const express = require('express');
const router = express.Router();
const plansControllers = require('../controllers/plans');
const plansRateController = require('../controllers/plansRateController');
const plansAddonController = require('../controllers/plansAddonController');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// Hotel-specific Plans routes
router.get('/plans/hotel', authMiddleware, plansControllers.getHotelsPlans);
router.get('/plans/hotel/:hotel_id', authMiddleware, plansControllers.getHotelPlans);
router.post('/plans/hotel', authMiddleware_manageDB, plansControllers.createHotelPlan);
router.put('/plans/hotel/:id', authMiddleware_manageDB, plansControllers.editHotelPlan);
router.put('/plans/reorder/hotel/:hotel_id', authMiddleware_manageDB, plansControllers.updatePlanDisplayOrder);

// Available Plans routes
router.get('/plans/all/:hotel_id', authMiddleware, plansControllers.fetchAllHotelPlans);

// Plan Rates routes
router.get('/plans/:hid/:hotel_id/rates', authMiddleware, plansRateController.getPlanRates);
router.get('/plans/rates/:id', authMiddleware, plansRateController.getPlanRate);
router.get('/plan/rate/:hid/:hotel_id/:date', authMiddleware, plansRateController.getPlanRateByDay);
router.get('/plan/rate-detail/:hid/:hotel_id/:date', authMiddleware, plansRateController.getPlanRatesByDay);
router.post('/plans/:planId/rates', authMiddleware_manageDB, plansRateController.createNewPlanRate);
router.put('/plans/rates/:id', authMiddleware_manageDB, plansRateController.updateExistingPlanRate);
//router.delete('/plans/rates/:id', authMiddleware_manageDB, plansRateController.deletePlanRate);

// Plan Addons routes
router.get('/plans/:hid/:hotel_id/addons', authMiddleware, plansAddonController.getPlanAddons);
router.get('/plans/addons/:id', authMiddleware, plansAddonController.getPlanAddon);
router.post('/plans/addons', authMiddleware_manageDB, plansAddonController.createNewPlanAddon);
router.put('/plans/addons/:id', authMiddleware_manageDB, plansAddonController.updateExistingPlanAddon);
//router.delete('/plans/addons/:id', authMiddleware_manageDB, plansAddonController.deleteExistingPlanAddon);

// Plan Patterns routes
router.get('/plans/patterns/hotel', authMiddleware, plansControllers.getHotelPatterns);
router.get('/plans/patterns/all/:hotel_id', authMiddleware, plansControllers.fetchAllHotelPatterns);
router.post('/plans/patterns', authMiddleware_manageDB, plansControllers.createPlanPattern);
router.put('/plans/patterns/:id', authMiddleware_manageDB, plansControllers.editPlanPattern);

// Plan Category routes
router.get('/plans/categories/type', authMiddleware, plansControllers.getTypeCategories);
router.post('/plans/categories/type', authMiddleware_manageDB, plansControllers.createTypeCategory);
router.put('/plans/categories/type/:id', authMiddleware_manageDB, plansControllers.updateTypeCategory);
router.get('/plans/categories/package', authMiddleware, plansControllers.getPackageCategories);
router.post('/plans/categories/package', authMiddleware_manageDB, plansControllers.createPackageCategory);
router.put('/plans/categories/package/:id', authMiddleware_manageDB, plansControllers.updatePackageCategory);

// Plan Copy Between Hotels
router.post('/plans/copy', authMiddleware_manageDB, plansControllers.copyPlanToHotel);
router.post('/plans/bulk-copy', authMiddleware_manageDB, plansControllers.bulkCopyPlansToHotel);

module.exports = router;
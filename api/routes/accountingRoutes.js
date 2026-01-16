const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting');
const { authMiddleware_accounting } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Settings Routes (Account Codes, Mappings, Groups, Tax Classes)
router.get('/accounting/settings', authMiddleware_accounting, accountingController.getSettings);
router.post('/accounting/settings/codes', authMiddleware_accounting, accountingController.upsertCode);
router.delete('/accounting/settings/codes/:id', authMiddleware_accounting, accountingController.deleteCode);
router.post('/accounting/settings/groups', authMiddleware_accounting, accountingController.upsertManagementGroup);
router.delete('/accounting/settings/groups/:id', authMiddleware_accounting, accountingController.deleteManagementGroup);
router.post('/accounting/settings/tax-classes', authMiddleware_accounting, accountingController.upsertTaxClass);
router.delete('/accounting/settings/tax-classes/:id', authMiddleware_accounting, accountingController.deleteTaxClass);
router.post('/accounting/settings/mappings', authMiddleware_accounting, accountingController.upsertMapping);
router.delete('/accounting/settings/mappings/:id', authMiddleware_accounting, accountingController.deleteMapping);
router.post('/accounting/settings/departments', authMiddleware_accounting, accountingController.upsertDepartment);
router.delete('/accounting/settings/departments/:id', authMiddleware_accounting, accountingController.deleteDepartment);

// Import
router.post('/accounting/import/preview', authMiddleware_accounting, upload.single('file'), accountingController.previewImport);
router.post('/accounting/import/execute', authMiddleware_accounting, upload.single('file'), accountingController.executeImport);

// Dashboard
router.get('/accounting/dashboard/metrics', authMiddleware_accounting, accountingController.getDashboardMetrics);
router.get('/accounting/dashboard/reconciliation', authMiddleware_accounting, accountingController.getReconciliationOverview);
router.get('/accounting/dashboard/reconciliation/hotel/:hotelId', authMiddleware_accounting, accountingController.getReconciliationHotelDetails);
router.get('/accounting/dashboard/reconciliation/hotel/:hotelId/client/:clientId', authMiddleware_accounting, accountingController.getReconciliationClientDetails);

// Export
router.get('/accounting/export/options', authMiddleware_accounting, accountingController.getExportOptions);
router.post('/accounting/export/preview', authMiddleware_accounting, accountingController.getLedgerPreview);
router.post('/accounting/export/download', authMiddleware_accounting, accountingController.exportLedger);

// Profit & Loss
router.post('/accounting/profit-loss', authMiddleware_accounting, accountingController.getProfitLoss);
router.post('/accounting/profit-loss/summary', authMiddleware_accounting, accountingController.getProfitLossSummary);
router.get('/accounting/profit-loss/months', authMiddleware_accounting, accountingController.getAvailableMonths);
router.get('/accounting/profit-loss/departments', authMiddleware_accounting, accountingController.getAvailableDepartments);

module.exports = router;

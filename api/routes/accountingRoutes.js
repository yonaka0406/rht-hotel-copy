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
router.post('/accounting/settings/department-groups', authMiddleware_accounting, accountingController.upsertDepartmentGroup);
router.delete('/accounting/settings/department-groups/:id', authMiddleware_accounting, accountingController.deleteDepartmentGroup);
router.post('/accounting/settings/sub-accounts', authMiddleware_accounting, accountingController.upsertSubAccount);
router.delete('/accounting/settings/sub-accounts/:id', authMiddleware_accounting, accountingController.deleteSubAccount);

// Import
router.post('/accounting/import/preview', authMiddleware_accounting, upload.single('file'), accountingController.previewImport);
router.post('/accounting/import/execute', authMiddleware_accounting, upload.single('file'), accountingController.executeImport);

// Dashboard
router.get('/accounting/dashboard/metrics', authMiddleware_accounting, accountingController.getDashboardMetrics);
router.get('/accounting/dashboard/budget-actual', authMiddleware_accounting, accountingController.getBudgetActualComparison);
router.get('/accounting/dashboard/reconciliation', authMiddleware_accounting, accountingController.getReconciliationOverview);
router.get('/accounting/dashboard/reconciliation/hotel/:hotelId', authMiddleware_accounting, accountingController.getReconciliationHotelDetails);
router.get('/accounting/dashboard/reconciliation/hotel/:hotelId/client/:clientId', authMiddleware_accounting, accountingController.getReconciliationClientDetails);

// Export
router.get('/accounting/export/options', authMiddleware_accounting, accountingController.getExportOptions);
router.post('/accounting/export/preview', authMiddleware_accounting, accountingController.getLedgerPreview);
router.post('/accounting/export/download', authMiddleware_accounting, accountingController.exportLedger);
router.post('/accounting/export/compare-pms-yayoi', authMiddleware_accounting, accountingController.comparePmsVsYayoi);
router.get('/accounting/export/monthly-comparison', authMiddleware_accounting, accountingController.getMonthlySalesComparison);
router.get('/accounting/export/available-yayoi-years', authMiddleware_accounting, accountingController.getAvailableYayoiYears);
router.get('/accounting/export/available-yayoi-months', authMiddleware_accounting, accountingController.getAvailableYayoiMonths);
router.post('/accounting/export/raw-data-integrity-analysis', authMiddleware_accounting, accountingController.getRawDataForIntegrityAnalysis);
router.post('/accounting/export/plan-reservation-details', authMiddleware_accounting, accountingController.getPlanReservationDetails);

// Profit & Loss
router.post('/accounting/profit-loss', authMiddleware_accounting, accountingController.getProfitLoss);
router.post('/accounting/profit-loss/detailed', authMiddleware_accounting, accountingController.getProfitLossDetailed);
router.post('/accounting/profit-loss/summary', authMiddleware_accounting, accountingController.getProfitLossSummary);
router.get('/accounting/profit-loss/months', authMiddleware_accounting, accountingController.getAvailableMonths);
router.get('/accounting/profit-loss/departments', authMiddleware_accounting, accountingController.getAvailableDepartments);

// Analytics
router.get('/accounting/analytics/cost-breakdown', authMiddleware_accounting, accountingController.getCostBreakdown);

// Receivables
router.get('/accounting/receivables/balances', authMiddleware_accounting, accountingController.getBalances);
router.get('/accounting/receivables/history', authMiddleware_accounting, accountingController.getHistory);
router.get('/accounting/receivables/search-clients', authMiddleware_accounting, accountingController.searchClients);

module.exports = router;

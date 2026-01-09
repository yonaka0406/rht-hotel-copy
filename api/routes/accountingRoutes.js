const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting');
const { authMiddleware_accounting } = require('../middleware/authMiddleware');

// Settings Routes (Account Codes, Mappings)
router.get('/accounting/settings', authMiddleware_accounting, accountingController.getSettings);
router.post('/accounting/settings/codes', authMiddleware_accounting, accountingController.upsertCode);
router.post('/accounting/settings/mappings', authMiddleware_accounting, accountingController.upsertMapping);
router.delete('/accounting/settings/mappings/:id', authMiddleware_accounting, accountingController.deleteMapping);

// Export Routes
router.get('/accounting/export/options', authMiddleware_accounting, accountingController.getExportOptions);
router.post('/accounting/export/preview', authMiddleware_accounting, accountingController.getLedgerPreview);
router.post('/accounting/export/download', authMiddleware_accounting, accountingController.exportLedger);

module.exports = router;

const { getPool } = require('../../config/database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pgFormat = require('pg-format');
const logger = require('../../config/logger');

/**
 * Parses a Yayoi CSV/TXT file (Shift-JIS)
 * @param {Buffer} buffer 
 * @returns {Array} Array of parsed rows
 */
const parseYayoiFile = (buffer) => {
    const decoder = new TextDecoder('shift-jis');
    const text = decoder.decode(buffer);
    const lines = text.split(/\r?\n/);

    const rows = [];
    for (let line of lines) {
        if (!line.trim()) continue;

        // Simple CSV parser for quoted values
        const row = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());

        if (row.length >= 4) { // Basic validation: at least 4 columns (up to transaction date)
            rows.push(row);
        }
    }
    return rows;
};

/**
 * Helper to convert YYYY/MM/DD to YYYY-MM-DD
 * @param {string} dateStr 
 * @returns {string|null}
 */
const toIsoDate = (dateStr) => {
    if (!dateStr) return null;
    // Replace slashes with dashes
    const iso = dateStr.replace(/\//g, '-');
    // Basic validation YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        return iso;
    }
    return null;
};

/**
 * Preview Yayoi Import
 */
const previewImport = async (req, res) => {
    const { requestId } = req;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const rows = parseYayoiFile(req.file.buffer);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'No valid data found in file' });
        }

        // Get master data for validation
        const accountingModel = require('../../models/accounting');
        const [codes, departmentsMaster] = await Promise.all([
            accountingModel.accountingRead.getAccountCodes(requestId),
            accountingModel.accountingRead.getDepartments(requestId)
        ]);

        const validAccountNames = new Set(codes.map(c => c.name));
        const validDeptNames = new Set(departmentsMaster.map(d => d.name).filter(Boolean));

        let minDate = null;
        let maxDate = null;
        const departmentsInFile = new Set();
        const unknownAccounts = new Set();
        const unmappedDepartments = new Set();

        for (const row of rows) {
            const dateStr = toIsoDate(row[3]); // Column D: 取引日付
            if (dateStr) {
                if (!minDate || dateStr < minDate) minDate = dateStr;
                if (!maxDate || dateStr > maxDate) maxDate = dateStr;
            }

            const debitAccount = row[4];
            const creditAccount = row[10];
            const debitDept = row[6];
            const creditDept = row[12];

            if (debitAccount && !validAccountNames.has(debitAccount)) unknownAccounts.add(debitAccount);
            if (creditAccount && !validAccountNames.has(creditAccount)) unknownAccounts.add(creditAccount);

            if (debitDept) {
                departmentsInFile.add(debitDept);
                if (!validDeptNames.has(debitDept)) unmappedDepartments.add(debitDept);
            }
            if (creditDept) {
                departmentsInFile.add(creditDept);
                if (!validDeptNames.has(creditDept)) unmappedDepartments.add(creditDept);
            }
        }

        res.json({
            rowCount: rows.length,
            minDate: minDate,
            maxDate: maxDate,
            departments: Array.from(departmentsInFile),
            unknownAccounts: Array.from(unknownAccounts),
            unmappedDepartments: Array.from(unmappedDepartments),
            fileName: req.file.originalname
        });
    } catch (error) {
        logger.error('Error previewing Yayoi import:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
};

/**
 * Execute Yayoi Import
 */
const executeImport = async (req, res) => {
    const requestId = req.requestId;
    const pool = getPool(requestId);
    const client = await pool.connect();
    const userId = req.session.userId || 1; // Fallback to 1 for now

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const rows = parseYayoiFile(req.file.buffer);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'No valid data found in file' });
        }

        let minDate = null;
        let maxDate = null;

        for (const row of rows) {
            const dateStr = toIsoDate(row[3]);
            if (dateStr) {
                if (!minDate || dateStr < minDate) minDate = dateStr;
                if (!maxDate || dateStr > maxDate) maxDate = dateStr;
            }
        }

        if (!minDate || !maxDate) {
            return res.status(400).json({ error: 'Could not determine date range from file' });
        }

        await client.query('BEGIN');

        // 1. Delete existing entries in date range
        // Note: The user said "delete all entries in this interval"
        await client.query(
            `DELETE FROM acc_yayoi_data WHERE transaction_date BETWEEN $1 AND $2`,
            [minDate, maxDate]
        );

        // 2. Map departments to hotel_ids
        const deptResult = await client.query(`SELECT hotel_id, name FROM acc_departments`);
        const deptMap = {};
        deptResult.rows.forEach(d => {
            deptMap[d.name] = d.hotel_id;
        });

        // 3. Prepare bulk insert
        const importBatchId = uuidv4();
        const insertData = rows.map(row => {
            const transactionDate = toIsoDate(row[3]);

            return [
                importBatchId,
                row[0], // identification_flag
                row[1], // slip_number
                row[2], // settlement_type
                transactionDate, // transaction_date
                row[4], // debit_account_code
                row[5], // debit_sub_account
                row[6], // debit_department
                row[7], // debit_tax_class
                row[8] || 0, // debit_amount
                row[9] || 0, // debit_tax_amount
                row[10], // credit_account_code
                row[11], // credit_sub_account
                row[12], // credit_department
                row[13], // credit_tax_class
                row[14] || 0, // credit_amount
                row[15] || 0, // credit_tax_amount
                row[16], // summary
                row[17], // journal_number
                toIsoDate(row[18]), // due_date (also convert to iso date)
                row[19], // ledger_type
                row[20], // source_name
                row[21], // journal_memo
                row[22], // sticky_note1
                row[23], // sticky_note2
                row[24], // adjustment_flag
                userId,
                new Date() // created_at
            ];
        });

        const query = pgFormat(
            `INSERT INTO acc_yayoi_data (
                batch_id, 
                identification_flag, slip_number, settlement_type, transaction_date,
                debit_account_code, debit_sub_account, debit_department, debit_tax_class, debit_amount, debit_tax_amount,
                credit_account_code, credit_sub_account, credit_department, credit_tax_class, credit_amount, credit_tax_amount,
                summary, journal_number, due_date, ledger_type, source_name, journal_memo,
                sticky_note1, sticky_note2, adjustment_flag,
                created_by, created_at
            ) VALUES %L`,
            insertData
        );

        await client.query(query);

        await client.query('COMMIT');

        res.json({
            success: true,
            rowCount: rows.length,
            minDate: minDate,
            maxDate: maxDate,
            importBatchId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error executing Yayoi import:', error);
        res.status(500).json({ error: 'Import failed: ' + error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    previewImport,
    executeImport
};

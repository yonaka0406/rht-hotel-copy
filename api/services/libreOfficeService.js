const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Converts an Excel file to PDF using LibreOffice.
 * @param {string} inputFilePath - The full path to the input Excel file.
 * @param {string} outputDir - The directory where the PDF should be saved.
 * @returns {Promise<string>} - The path to the generated PDF file.
 */
const convertExcelToPdf = (inputFilePath, outputDir) => {
    return new Promise((resolve, reject) => {
        // --headless: Run in headless mode (no GUI)
        // --convert-to pdf: Output format
        // --outdir: Output directory
        const command = `libreoffice --headless --convert-to pdf "${inputFilePath}" --outdir "${outputDir}"`;

        logger.info(`[LibreOffice] Executing command: ${command}`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error(`[LibreOffice] Conversion error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                // LibreOffice often prints warnings to stderr even on success, so we just log it.
                logger.warn(`[LibreOffice] Stderr: ${stderr}`);
            }
            
            logger.info(`[LibreOffice] Stdout: ${stdout}`);

            // Construct the expected output file path
            // LibreOffice typically keeps the same filename but changes extension to .pdf
            const inputFileName = path.basename(inputFilePath, path.extname(inputFilePath));
            const outputFilePath = path.join(outputDir, `${inputFileName}.pdf`);

            if (fs.existsSync(outputFilePath)) {
                resolve(outputFilePath);
            } else {
                reject(new Error('PDF file was not created successfully.'));
            }
        });
    });
};

module.exports = {
    convertExcelToPdf
};

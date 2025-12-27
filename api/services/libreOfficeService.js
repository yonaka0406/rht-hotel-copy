const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// Simple queue to limit concurrent LibreOffice conversions
const conversionQueue = [];
let isProcessing = false;

const processQueue = async () => {
    if (isProcessing || conversionQueue.length === 0) return;

    isProcessing = true;
    const { inputFilePath, outputDir, resolve, reject } = conversionQueue.shift();

    try {
        // --headless: Run in headless mode (no GUI)
        // --convert-to pdf: Output format
        // --outdir: Output directory
        const command = `libreoffice --headless --convert-to pdf "${inputFilePath}" --outdir "${outputDir}"`;

        logger.info(`[LibreOffice] Executing command: ${command}`);

        await new Promise((execResolve, execReject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`[LibreOffice] Conversion error: ${error.message}`);
                    return execReject(error);
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
                    execResolve(outputFilePath);
                } else {
                    execReject(new Error('PDF file was not created successfully.'));
                }
            });
        });
        
        resolve(path.join(outputDir, `${path.basename(inputFilePath, path.extname(inputFilePath))}.pdf`));

    } catch (error) {
        reject(error);
    } finally {
        isProcessing = false;
        // Add a small delay to allow system resources to recover
        setTimeout(processQueue, 100);
    }
};

/**
 * Converts an Excel file to PDF using LibreOffice.
 * @param {string} inputFilePath - The full path to the input Excel file.
 * @param {string} outputDir - The directory where the PDF should be saved.
 * @returns {Promise<string>} - The path to the generated PDF file.
 */
const convertExcelToPdf = (inputFilePath, outputDir) => {
    return new Promise((resolve, reject) => {
        conversionQueue.push({ inputFilePath, outputDir, resolve, reject });
        processQueue();
    });
};

module.exports = {
    convertExcelToPdf
};

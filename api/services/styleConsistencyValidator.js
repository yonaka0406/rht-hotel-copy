const logger = require('../config/logger');

/**
 * Style Consistency Validator Service
 * 
 * This service provides automated validation of chart styling consistency
 * between web and PDF outputs. It validates chart configurations, compares
 * styling properties, and ensures canvas content is properly rendered.
 */

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {ValidationError[]} errors - Critical validation errors
 * @property {ValidationWarning[]} warnings - Non-critical validation warnings
 * @property {ValidationMetrics} metrics - Validation metrics and statistics
 */

/**
 * Validation error structure
 * @typedef {Object} ValidationError
 * @property {string} code - Error code for categorization
 * @property {string} message - Human-readable error message
 * @property {string} field - Field or property that failed validation
 * @property {any} expected - Expected value
 * @property {any} actual - Actual value
 */

/**
 * Validation warning structure
 * @typedef {Object} ValidationWarning
 * @property {string} code - Warning code for categorization
 * @property {string} message - Human-readable warning message
 * @property {string} field - Field or property that triggered warning
 * @property {any} value - Value that triggered warning
 */

/**
 * Validation metrics structure
 * @typedef {Object} ValidationMetrics
 * @property {number} totalChecks - Total number of validation checks performed
 * @property {number} passedChecks - Number of checks that passed
 * @property {number} failedChecks - Number of checks that failed
 * @property {number} warningChecks - Number of checks that generated warnings
 * @property {number} validationTime - Time taken for validation in milliseconds
 * @property {Object} chartMetrics - Chart-specific metrics
 */

/**
 * Canvas validation result structure
 * @typedef {Object} CanvasValidationResult
 * @property {boolean} hasCanvas - Whether canvas elements are present
 * @property {number} canvasCount - Number of canvas elements found
 * @property {boolean} hasContent - Whether canvas has actual rendered content
 * @property {Object} dimensions - Canvas dimensions
 * @property {boolean} isValid - Overall canvas validation result
 */

class StyleConsistencyValidator {
    constructor() {
        this.validationRules = {
            // Required chart properties that must be present
            requiredProperties: ['series'],
            
            // Color validation rules
            colorProperties: ['color', 'backgroundColor'],
            
            // Typography properties to validate
            typographyProperties: ['fontFamily', 'fontSize', 'fontWeight'],
            
            // Layout properties to validate
            layoutProperties: ['grid', 'title', 'legend', 'tooltip'],
            
            // Series properties that must be consistent
            seriesProperties: ['type', 'name', 'data', 'itemStyle']
        };
    }

    /**
     * Validate a chart configuration for completeness and correctness
     * @param {Object} config - Chart configuration object
     * @param {string} chartType - Type of chart being validated
     * @param {string} requestId - Request ID for logging
     * @returns {ValidationResult} Validation result
     */
    validateChartConfig(config, chartType = 'unknown', requestId = 'unknown') {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        let totalChecks = 0;
        let passedChecks = 0;

        logger.debug('Starting chart configuration validation', {
            requestId,
            chartType,
            hasConfig: !!config
        });

        try {
            // Check if config exists
            totalChecks++;
            if (!config || typeof config !== 'object') {
                errors.push({
                    code: 'CONFIG_MISSING',
                    message: 'Chart configuration is missing or invalid',
                    field: 'config',
                    expected: 'object',
                    actual: typeof config
                });
            } else {
                passedChecks++;
            }

            if (config) {
                // Validate required properties
                this.validationRules.requiredProperties.forEach(prop => {
                    totalChecks++;
                    if (!config[prop]) {
                        errors.push({
                            code: 'REQUIRED_PROPERTY_MISSING',
                            message: `Required property '${prop}' is missing`,
                            field: prop,
                            expected: 'defined',
                            actual: 'undefined'
                        });
                    } else {
                        passedChecks++;
                    }
                });

                // Validate series configuration
                if (config.series) {
                    totalChecks++;
                    if (!Array.isArray(config.series)) {
                        errors.push({
                            code: 'SERIES_INVALID_TYPE',
                            message: 'Series must be an array',
                            field: 'series',
                            expected: 'array',
                            actual: typeof config.series
                        });
                    } else {
                        passedChecks++;
                        
                        // Validate each series
                        config.series.forEach((series, index) => {
                            totalChecks++;
                            if (!series.type) {
                                warnings.push({
                                    code: 'SERIES_TYPE_MISSING',
                                    message: `Series ${index} is missing type property`,
                                    field: `series[${index}].type`,
                                    value: series
                                });
                            } else {
                                passedChecks++;
                            }

                            totalChecks++;
                            if (!series.data || !Array.isArray(series.data)) {
                                warnings.push({
                                    code: 'SERIES_DATA_INVALID',
                                    message: `Series ${index} has invalid or missing data`,
                                    field: `series[${index}].data`,
                                    value: series.data
                                });
                            } else {
                                passedChecks++;
                            }
                        });
                    }
                }

                // Validate color configuration
                if (config.color) {
                    totalChecks++;
                    if (!Array.isArray(config.color)) {
                        warnings.push({
                            code: 'COLOR_INVALID_TYPE',
                            message: 'Color property should be an array',
                            field: 'color',
                            value: config.color
                        });
                    } else {
                        passedChecks++;
                        
                        // Validate color values
                        config.color.forEach((color, index) => {
                            totalChecks++;
                            if (typeof color !== 'string' || !this.isValidColor(color)) {
                                warnings.push({
                                    code: 'COLOR_INVALID_VALUE',
                                    message: `Invalid color value at index ${index}`,
                                    field: `color[${index}]`,
                                    value: color
                                });
                            } else {
                                passedChecks++;
                            }
                        });
                    }
                }

                // Validate grid configuration
                if (config.grid) {
                    totalChecks++;
                    if (typeof config.grid !== 'object') {
                        warnings.push({
                            code: 'GRID_INVALID_TYPE',
                            message: 'Grid property should be an object',
                            field: 'grid',
                            value: config.grid
                        });
                    } else {
                        passedChecks++;
                    }
                }

                // Validate tooltip configuration
                if (config.tooltip) {
                    totalChecks++;
                    if (typeof config.tooltip !== 'object') {
                        warnings.push({
                            code: 'TOOLTIP_INVALID_TYPE',
                            message: 'Tooltip property should be an object',
                            field: 'tooltip',
                            value: config.tooltip
                        });
                    } else {
                        passedChecks++;
                    }
                }
            }

            const validationTime = Date.now() - startTime;
            const failedChecks = totalChecks - passedChecks;
            const warningChecks = warnings.length;

            const result = {
                isValid: errors.length === 0,
                errors,
                warnings,
                metrics: {
                    totalChecks,
                    passedChecks,
                    failedChecks,
                    warningChecks,
                    validationTime,
                    chartMetrics: {
                        chartType,
                        hasRequiredProperties: config && this.validationRules.requiredProperties.every(prop => config[prop]),
                        seriesCount: config && config.series ? config.series.length : 0,
                        colorCount: config && config.color ? config.color.length : 0
                    }
                }
            };

            logger.debug('Chart configuration validation completed', {
                requestId,
                chartType,
                isValid: result.isValid,
                errorCount: errors.length,
                warningCount: warnings.length,
                validationTime
            });

            return result;

        } catch (error) {
            logger.error('Error during chart configuration validation', {
                requestId,
                chartType,
                error: error.message,
                stack: error.stack
            });

            return {
                isValid: false,
                errors: [{
                    code: 'VALIDATION_ERROR',
                    message: `Validation failed: ${error.message}`,
                    field: 'validation',
                    expected: 'successful validation',
                    actual: 'validation error'
                }],
                warnings: [],
                metrics: {
                    totalChecks: 1,
                    passedChecks: 0,
                    failedChecks: 1,
                    warningChecks: 0,
                    validationTime: Date.now() - startTime,
                    chartMetrics: {
                        chartType,
                        hasRequiredProperties: false,
                        seriesCount: 0,
                        colorCount: 0
                    }
                }
            };
        }
    }

    /**
     * Compare two chart configurations for consistency
     * @param {Object} webConfig - Chart configuration from web component
     * @param {Object} pdfConfig - Chart configuration for PDF generation
     * @param {string} chartType - Type of chart being compared
     * @param {string} requestId - Request ID for logging
     * @returns {Object} Comparison result
     */
    compareConfigs(webConfig, pdfConfig, chartType = 'unknown', requestId = 'unknown') {
        const startTime = Date.now();
        const differences = [];
        const similarities = [];
        let totalComparisons = 0;

        logger.debug('Starting chart configuration comparison', {
            requestId,
            chartType,
            hasWebConfig: !!webConfig,
            hasPdfConfig: !!pdfConfig
        });

        try {
            // Compare basic structure
            totalComparisons++;
            if (typeof webConfig !== typeof pdfConfig) {
                differences.push({
                    property: 'type',
                    webValue: typeof webConfig,
                    pdfValue: typeof pdfConfig,
                    severity: 'critical'
                });
            } else {
                similarities.push('type');
            }

            if (webConfig && pdfConfig) {
                // Compare color arrays
                totalComparisons++;
                if (this.compareArrays(webConfig.color, pdfConfig.color)) {
                    similarities.push('color');
                } else {
                    differences.push({
                        property: 'color',
                        webValue: webConfig.color,
                        pdfValue: pdfConfig.color,
                        severity: 'high'
                    });
                }

                // Compare series configurations
                totalComparisons++;
                if (webConfig.series && pdfConfig.series) {
                    if (webConfig.series.length !== pdfConfig.series.length) {
                        differences.push({
                            property: 'series.length',
                            webValue: webConfig.series.length,
                            pdfValue: pdfConfig.series.length,
                            severity: 'critical'
                        });
                    } else {
                        similarities.push('series.length');
                        
                        // Compare each series
                        webConfig.series.forEach((webSeries, index) => {
                            const pdfSeries = pdfConfig.series[index];
                            totalComparisons++;
                            
                            if (webSeries.type !== pdfSeries.type) {
                                differences.push({
                                    property: `series[${index}].type`,
                                    webValue: webSeries.type,
                                    pdfValue: pdfSeries.type,
                                    severity: 'high'
                                });
                            } else {
                                similarities.push(`series[${index}].type`);
                            }
                        });
                    }
                } else if (webConfig.series || pdfConfig.series) {
                    // One has series, the other doesn't
                    differences.push({
                        property: 'series',
                        webValue: webConfig.series ? 'present' : 'missing',
                        pdfValue: pdfConfig.series ? 'present' : 'missing',
                        severity: 'critical'
                    });
                } else {
                    similarities.push('series');
                }

                // Compare grid configuration
                totalComparisons++;
                if (this.compareObjects(webConfig.grid, pdfConfig.grid)) {
                    similarities.push('grid');
                } else {
                    differences.push({
                        property: 'grid',
                        webValue: webConfig.grid,
                        pdfValue: pdfConfig.grid,
                        severity: 'medium'
                    });
                }

                // Compare tooltip configuration
                totalComparisons++;
                if (this.compareObjects(webConfig.tooltip, pdfConfig.tooltip)) {
                    similarities.push('tooltip');
                } else {
                    differences.push({
                        property: 'tooltip',
                        webValue: webConfig.tooltip,
                        pdfValue: pdfConfig.tooltip,
                        severity: 'low'
                    });
                }
            }

            const comparisonTime = Date.now() - startTime;
            const consistencyScore = similarities.length / totalComparisons;
            const criticalDifferences = differences.filter(d => d.severity === 'critical').length;
            const highDifferences = differences.filter(d => d.severity === 'high').length;

            const result = {
                isConsistent: criticalDifferences === 0 && highDifferences === 0,
                consistencyScore,
                differences,
                similarities,
                metrics: {
                    totalComparisons,
                    differenceCount: differences.length,
                    similarityCount: similarities.length,
                    comparisonTime,
                    criticalDifferences: differences.filter(d => d.severity === 'critical').length,
                    highDifferences: differences.filter(d => d.severity === 'high').length,
                    mediumDifferences: differences.filter(d => d.severity === 'medium').length,
                    lowDifferences: differences.filter(d => d.severity === 'low').length
                }
            };

            logger.debug('Chart configuration comparison completed', {
                requestId,
                chartType,
                isConsistent: result.isConsistent,
                consistencyScore,
                differenceCount: differences.length,
                comparisonTime
            });

            return result;

        } catch (error) {
            logger.error('Error during chart configuration comparison', {
                requestId,
                chartType,
                error: error.message,
                stack: error.stack
            });

            return {
                isConsistent: false,
                consistencyScore: 0,
                differences: [{
                    property: 'comparison',
                    webValue: 'comparison failed',
                    pdfValue: 'comparison failed',
                    severity: 'critical',
                    error: error.message
                }],
                similarities: [],
                metrics: {
                    totalComparisons: 1,
                    differenceCount: 1,
                    similarityCount: 0,
                    comparisonTime: Date.now() - startTime,
                    criticalDifferences: 1,
                    highDifferences: 0,
                    mediumDifferences: 0,
                    lowDifferences: 0
                }
            };
        }
    }

    /**
     * Validate canvas content in a chart container
     * @param {Object} containerInfo - Information about the chart container
     * @param {string} chartType - Type of chart being validated
     * @param {string} requestId - Request ID for logging
     * @returns {CanvasValidationResult} Canvas validation result
     */
    validateCanvasContent(containerInfo, chartType = 'unknown', requestId = 'unknown') {
        logger.debug('Starting canvas content validation', {
            requestId,
            chartType,
            containerInfo
        });

        try {
            const result = {
                hasCanvas: containerInfo.canvasCount > 0,
                canvasCount: containerInfo.canvasCount || 0,
                hasContent: containerInfo.hasValidCanvas || false,
                dimensions: containerInfo.dimensions || { width: 0, height: 0 },
                isValid: false
            };

            // Determine if canvas is valid
            result.isValid = result.hasCanvas && 
                            result.hasContent && 
                            result.dimensions.width > 0 && 
                            result.dimensions.height > 0;

            logger.debug('Canvas content validation completed', {
                requestId,
                chartType,
                isValid: result.isValid,
                hasCanvas: result.hasCanvas,
                canvasCount: result.canvasCount,
                hasContent: result.hasContent
            });

            return result;

        } catch (error) {
            logger.error('Error during canvas content validation', {
                requestId,
                chartType,
                error: error.message,
                stack: error.stack
            });

            return {
                hasCanvas: false,
                canvasCount: 0,
                hasContent: false,
                dimensions: { width: 0, height: 0 },
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * Validate multiple chart configurations and generate summary report
     * @param {Object} chartConfigs - Object containing multiple chart configurations
     * @param {string} requestId - Request ID for logging
     * @returns {Object} Summary validation result
     */
    validateMultipleCharts(chartConfigs, requestId = 'unknown') {
        const startTime = Date.now();
        const results = {};
        const summary = {
            totalCharts: 0,
            validCharts: 0,
            invalidCharts: 0,
            totalErrors: 0,
            totalWarnings: 0
        };

        logger.debug('Starting multiple chart validation', {
            requestId,
            chartCount: Object.keys(chartConfigs || {}).length
        });

        try {
            if (!chartConfigs || typeof chartConfigs !== 'object') {
                throw new Error('Chart configurations must be an object');
            }

            Object.entries(chartConfigs).forEach(([chartType, config]) => {
                summary.totalCharts++;
                const validation = this.validateChartConfig(config, chartType, requestId);
                results[chartType] = validation;

                if (validation.isValid) {
                    summary.validCharts++;
                } else {
                    summary.invalidCharts++;
                }

                summary.totalErrors += validation.errors.length;
                summary.totalWarnings += validation.warnings.length;
            });

            const validationTime = Date.now() - startTime;

            logger.debug('Multiple chart validation completed', {
                requestId,
                totalCharts: summary.totalCharts,
                validCharts: summary.validCharts,
                invalidCharts: summary.invalidCharts,
                validationTime
            });

            return {
                results,
                summary: {
                    ...summary,
                    validationTime,
                    overallValid: summary.invalidCharts === 0
                }
            };

        } catch (error) {
            logger.error('Error during multiple chart validation', {
                requestId,
                error: error.message,
                stack: error.stack
            });

            return {
                results: {},
                summary: {
                    totalCharts: 0,
                    validCharts: 0,
                    invalidCharts: 1,
                    totalErrors: 1,
                    totalWarnings: 0,
                    validationTime: Date.now() - startTime,
                    overallValid: false,
                    error: error.message
                }
            };
        }
    }

    /**
     * Helper method to validate color values
     * @param {string} color - Color value to validate
     * @returns {boolean} Whether the color is valid
     */
    isValidColor(color) {
        if (typeof color !== 'string') return false;
        
        // Check for hex colors
        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return true;
        
        // Check for rgb/rgba colors
        if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) return true;
        
        // Check for named colors (basic set)
        const namedColors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
        if (namedColors.includes(color.toLowerCase())) return true;
        
        return false;
    }

    /**
     * Helper method to compare arrays for equality
     * @param {Array} arr1 - First array
     * @param {Array} arr2 - Second array
     * @returns {boolean} Whether arrays are equal
     */
    compareArrays(arr1, arr2) {
        if (!Array.isArray(arr1) && !Array.isArray(arr2)) return true;
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        if (arr1.length !== arr2.length) return false;
        
        return arr1.every((item, index) => {
            if (typeof item === 'object' && item !== null) {
                return this.compareObjects(item, arr2[index]);
            }
            return item === arr2[index];
        });
    }

    /**
     * Helper method to compare objects for equality
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {boolean} Whether objects are equal
     */
    compareObjects(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (!obj1 && !obj2) return true;
        if (!obj1 || !obj2) return false;
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => {
            if (typeof obj1[key] === 'object' && obj1[key] !== null) {
                return this.compareObjects(obj1[key], obj2[key]);
            }
            return obj1[key] === obj2[key];
        });
    }
}

module.exports = StyleConsistencyValidator;
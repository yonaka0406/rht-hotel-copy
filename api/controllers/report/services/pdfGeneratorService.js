const { chromium } = require('playwright');
const logger = require('../../../config/logger');
const StyleConsistencyValidator = require('../../../services/styleConsistencyValidator');
const fs = require('fs');
const path = require('path');

// Queue for PDF generation to limit concurrency
const pdfQueue = [];
let isPdfProcessing = false;

const processPdfQueue = async () => {
    if (isPdfProcessing || pdfQueue.length === 0) return;

    isPdfProcessing = true;
    const { reportType, reqBody, requestId, resolve, reject } = pdfQueue.shift();

    try {
        const result = await generatePdfReportInternal(reportType, reqBody, requestId);
        resolve(result);
    } catch (error) {
        reject(error);
    } finally {
        isPdfProcessing = false;
        // Small delay to allow browser cleanup and resource recovery
        setTimeout(processPdfQueue, 1000);
    }
};

/**
 * Enhanced PDF Generator Service
 * 
 * This service generates PDF reports using serialized chart configurations from the frontend.
 * It ensures visual consistency between web and PDF outputs by using the same chart configurations.
 * Includes style validation and enhanced error handling with fallback content.
 */

// Initialize style consistency validator
const styleValidator = new StyleConsistencyValidator();

// Load ECharts library content
let echartsLibraryContent = null;
const loadEChartsLibrary = () => {
    if (echartsLibraryContent === null) {
        try {
            const echartsPath = path.join(__dirname, '../../../node_modules/echarts/dist/echarts.min.js');
            echartsLibraryContent = fs.readFileSync(echartsPath, 'utf8');
            logger.debug('ECharts library loaded successfully', { size: echartsLibraryContent.length });
        } catch (error) {
            logger.error('Failed to load ECharts library from local file', { error: error.message });
            echartsLibraryContent = ''; // Fallback to empty string
        }
    }
    return echartsLibraryContent;
};

/**
 * Deserialize chart configuration from frontend
 * Reconstructs functions and gradients from serialized form
 */
const deserializeChartConfig = (serializedConfig) => {
    if (!serializedConfig || serializedConfig.type !== 'chart-config') {
        throw new Error('Invalid serialized configuration type');
    }

    const deserializeObject = (obj, functions, gradients) => {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'object' && obj.__function) {
            const func = functions.find(f => f.id === obj.__function);
            if (func) {
                try {
                    // Safely reconstruct function from source
                    return new Function('return ' + func.source)();
                } catch (error) {
                    logger.warn('Failed to reconstruct function, using fallback', { error: error.message });
                    return () => 'N/A'; // Fallback function
                }
            }
            return null;
        }

        if (typeof obj === 'object' && obj.__gradient) {
            const gradient = gradients.find(g => g.id === obj.__gradient);
            if (gradient && gradient.type === 'LinearGradient') {
                // Return gradient object that ECharts can understand
                return {
                    type: 'linear',
                    x: gradient.x,
                    y: gradient.y,
                    x2: gradient.x2,
                    y2: gradient.y2,
                    colorStops: gradient.colorStops
                };
            }
            return null;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => deserializeObject(item, functions, gradients));
        }

        if (typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = deserializeObject(value, functions, gradients);
            }
            return result;
        }

        return obj;
    };

    return deserializeObject(serializedConfig.options, serializedConfig.functions, serializedConfig.gradients);
};

/**
 * Validate chart rendering and canvas content
 */
const validateChartRendering = async (page, requestId) => {
    try {
        const validationResult = await page.evaluate(() => {
            const chartContainers = [
                'revenuePlanVsActualContainer',
                'occupancyGaugeContainer',
                'allHotelsRevenueContainer',
                'allHotelsOccupancyContainer'
            ];

            const results = {};
            let totalCanvases = 0;
            let validCanvases = 0;

            chartContainers.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    const canvases = container.querySelectorAll('canvas');
                    const hasValidCanvas = canvases.length > 0 &&
                        Array.from(canvases).some(canvas => {
                            // Check if canvas has actual content (not just empty)
                            const ctx = canvas.getContext('2d');
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            return imageData.data.some(pixel => pixel !== 0);
                        });

                    results[containerId] = {
                        exists: true,
                        canvasCount: canvases.length,
                        hasValidCanvas: hasValidCanvas,
                        dimensions: {
                            width: container.offsetWidth,
                            height: container.offsetHeight
                        }
                    };

                    totalCanvases += canvases.length;
                    if (hasValidCanvas) validCanvases++;
                } else {
                    results[containerId] = {
                        exists: false,
                        canvasCount: 0,
                        hasValidCanvas: false
                    };
                }
            });

            return {
                containers: results,
                summary: {
                    totalCanvases,
                    validCanvases,
                    renderingSuccess: validCanvases > 0
                }
            };
        });

        logger.debug('Chart validation completed', {
            requestId,
            validation: validationResult
        });

        return validationResult;
    } catch (error) {
        logger.error('Chart validation failed', {
            requestId,
            error: error.message
        });
        return {
            containers: {},
            summary: {
                totalCanvases: 0,
                validCanvases: 0,
                renderingSuccess: false
            }
        };
    }
};

/**
 * Generate fallback content for failed chart rendering
 */
const generateFallbackContent = (chartType, error) => {
    const fallbackMessages = {
        'revenuePlanVsActual': '収益チャートの生成に失敗しました',
        'occupancyGauge': '稼働率チャートの生成に失敗しました',
        'allHotelsRevenue': '施設別収益チャートの生成に失敗しました',
        'allHotelsOccupancy': '施設別稼働率チャートの生成に失敗しました'
    };

    return `
        <div style="
            width: 100%; 
            height: 300px; 
            border: 2px dashed #ccc; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background-color: #f8f9fa;
            color: #666;
            font-size: 14px;
            text-align: center;
        ">
            <div>
                <p>${fallbackMessages[chartType] || 'チャートの生成に失敗しました'}</p>
                <p style="font-size: 12px; margin-top: 10px;">エラー: ${error}</p>
            </div>
        </div>
    `;
};

const generatePdfReportInternal = async (reportType, reqBody, requestId) => {
    const startTime = Date.now();
    logger.debug('PDF generation started', {
        requestId,
        reportType,
        selectedView: reqBody.selectedView,
        hasKpiData: !!reqBody.kpiData,
        hasChartData: !!reqBody.chartData,
        hasSerializedChartConfigs: !!reqBody.serializedChartConfigs
    });

    const {
        selectedView,
        periodMaxDate,
        allHotelNames,
        kpiData,
        chartData,
        serializedChartConfigs,
        // Legacy support for old format
        allHotelsRevenueChartOptions
    } = reqBody;

    // Create a redacted summary of the request body for logging
    const redactedReqBody = { ...reqBody };
    const sensitiveKeys = ['kpiData', 'chartData', 'serializedChartConfigs', 'allHotelNames', 'allHotelsRevenueChartOptions'];
    sensitiveKeys.forEach(key => {
        if (redactedReqBody[key]) {
            if (Array.isArray(redactedReqBody[key])) {
                redactedReqBody[key] = `[Array(${redactedReqBody[key].length})]`;
            } else if (typeof redactedReqBody[key] === 'object' && redactedReqBody[key] !== null) {
                redactedReqBody[key] = `[Object keys: ${Object.keys(redactedReqBody[key]).join(', ')}]`;
            } else {
                redactedReqBody[key] = '[Redacted]';
            }
        }
    });

    // Debug: Log the actual received data (redacted)
    logger.debug('Received request body data', {
        requestId,
        selectedView,
        periodMaxDate,
        fullReqBodyKeys: Object.keys(reqBody),
        reqBodySummary: redactedReqBody
    });
    let browser;
    let page = null;

    let reportTitle = '月次サマリーレポート';
    switch (reportType) {
        case 'singleMonthSingleHotel':
            reportTitle = '単月 - 単一ホテルサマリーレポート';
            break;
        case 'singleMonthMultipleHotels':
            reportTitle = '単月 - 複数ホテルサマリーレポート';
            break;
        case 'cumulativeSingleHotel':
            reportTitle = '累計 - 単一ホテルサマリーレポート';
            break;
        case 'cumulativeMultipleHotels':
            reportTitle = '累計 - 複数ホテルサマリーレポート';
            break;
    }

    logger.debug('Report configuration determined', {
        requestId,
        reportTitle,
        selectedView
    });

    try {
        let htmlContent;

        if (selectedView === 'graph') {
            logger.debug('Generating graph view PDF', { requestId });
            const isCumulative = reportType.startsWith('cumulative');
            logger.debug('Chart configuration', { requestId, isCumulative });

            // Debug the incoming data
            logger.debug('Incoming request data', {
                requestId,
                hasKpiData: !!kpiData,
                hasChartData: !!chartData,
                hasSerializedChartConfigs: !!serializedChartConfigs,
                kpiDataKeys: kpiData ? Object.keys(kpiData) : null,
                chartDataKeys: chartData ? Object.keys(chartData) : null,
                serializedConfigKeys: serializedChartConfigs ? Object.keys(serializedChartConfigs) : null,
                selectedView,
                periodMaxDate,
                allHotelNames
            });

            logger.debug('Building enhanced chart generation script', { requestId });

            // Validate and deserialize chart configurations
            let deserializedConfigs = {};
            try {
                if (serializedChartConfigs) {
                    Object.keys(serializedChartConfigs).forEach(chartType => {
                        try {
                            deserializedConfigs[chartType] = deserializeChartConfig(serializedChartConfigs[chartType]);
                            logger.debug(`Successfully deserialized ${chartType} config`, { requestId });

                            // Validate the deserialized configuration
                            const validation = styleValidator.validateChartConfig(
                                deserializedConfigs[chartType],
                                chartType,
                                requestId
                            );

                            if (!validation.isValid) {
                                logger.warn(`Chart configuration validation failed for ${chartType}`, {
                                    requestId,
                                    errors: validation.errors,
                                    warnings: validation.warnings
                                });
                            } else {
                                logger.debug(`Chart configuration validation passed for ${chartType}`, {
                                    requestId,
                                    metrics: validation.metrics
                                });
                            }
                        } catch (error) {
                            logger.error(`Failed to deserialize ${chartType} config`, {
                                requestId,
                                error: error.message
                            });
                            deserializedConfigs[chartType] = null;
                        }
                    });
                }

                // Validate data serialization for injection into HTML
                const testKpiData = JSON.stringify(kpiData || {});
                const testChartData = JSON.stringify(chartData || {});
                const testDeserializedConfigs = JSON.stringify(deserializedConfigs);

                logger.debug('Data serialization test passed', {
                    requestId,
                    kpiDataLength: testKpiData.length,
                    chartDataLength: testChartData.length,
                    deserializedConfigsLength: testDeserializedConfigs.length,
                    availableChartTypes: Object.keys(deserializedConfigs)
                });
            } catch (error) {
                logger.error('Data serialization failed', { requestId, error: error.message });
                throw new Error('Failed to serialize chart data: ' + error.message);
            }

            const chartGenerationScript = `
                // Wait for both DOM and all scripts to load
                window.addEventListener('load', async function () {
                    console.log('[${requestId}] Window loaded, waiting for scripts to initialize...');
                    
                    // Give additional time for scripts to initialize
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    console.log('[${requestId}] Starting enhanced chart generation');
                    
                    // Enhanced timeout with partial content support
                    const timeoutId = setTimeout(() => {
                        console.log('[${requestId}] Chart generation timeout, proceeding with partial content');
                        document.body.setAttribute('data-charts-rendered', 'true');
                        document.body.setAttribute('data-charts-timeout', 'true');
                    }, 30000);

                    try {
                        console.log('[${requestId}] Starting data parsing');
                        const kpiData = ${JSON.stringify(kpiData || {}, null, 2)};
                        const chartData = ${JSON.stringify(chartData || {}, null, 2)};
                        const chartConfigs = ${JSON.stringify(deserializedConfigs, null, 2)};
                        const isCumulative = ${isCumulative};
                        
                        console.log('[${requestId}] Data parsed successfully', { 
                            hasKpiData: !!kpiData, 
                            hasChartData: !!chartData,
                            hasChartConfigs: !!chartConfigs,
                            availableConfigs: chartConfigs ? Object.keys(chartConfigs) : null,
                            chartDataKeys: chartData ? Object.keys(chartData) : null,
                            hasAggregateData: !!(chartData && chartData.aggregateData),
                            hasAllHotelsRevenueData: !!(chartData && chartData.allHotelsRevenueData),
                            hasAllHotelsOccupancyData: !!(chartData && chartData.allHotelsOccupancyData)
                        });

                        // Define utility functions for chart formatting (since they're not available in this context)
                        const formatPercentage = (value) => {
                            console.log('[${requestId}] FORMATTING: formatPercentage called with:', value, 'type:', typeof value);
                            if (value === null || value === undefined) return '-';
                            const num = Number(value);
                            if (!Number.isFinite(num)) return '-';
                            const result = (num * 100).toFixed(2) + '%';
                            console.log('[${requestId}] FORMATTING: formatPercentage result:', result);
                            return result;
                        };
                        
                        const formatYenInTenThousands = (value) => {
                            if (value === null || value === undefined) return '-';
                            const num = Number(value);
                            if (!Number.isFinite(num)) return '-';
                            return (num / 10000).toFixed(1) + '万円';
                        };
                        
                        const formatYenInTenThousandsNoDecimal = (value) => {
                            if (value === null || value === undefined) return '-';
                            const num = Number(value);
                            if (!Number.isFinite(num)) return '-';
                            return (num / 10000).toFixed(0) + '万円';
                        };

                        // Define fallback content generator function
                        const generateFallbackContent = (chartType, error) => {
                            const fallbackMessages = {
                                'revenuePlanVsActual': '収益チャートの生成に失敗しました',
                                'occupancyGauge': '稼働率チャートの生成に失敗しました', 
                                'allHotelsRevenue': '施設別収益チャートの生成に失敗しました',
                                'allHotelsOccupancy': '施設別稼働率チャートの生成に失敗しました',
                                'echarts': 'EChartsライブラリの読み込みに失敗しました'
                            };

                            return '<div style="' +
                                'width: 100%; ' +
                                'height: 300px; ' +
                                'border: 2px dashed #ccc; ' +
                                'display: flex; ' +
                                'align-items: center; ' +
                                'justify-content: center; ' +
                                'background-color: #f8f9fa; ' +
                                'color: #666; ' +
                                'font-size: 14px; ' +
                                'text-align: center;' +
                                '">' +
                                '<div>' +
                                '<p>' + (fallbackMessages[chartType] || 'チャートの生成に失敗しました') + '</p>' +
                                '<p style="font-size: 12px; margin-top: 10px;">エラー: ' + error + '</p>' +
                                '</div>' +
                                '</div>';
                        };

                        // Verify ECharts is available (should be immediate since it's embedded)
                        // Check ECharts availability (reduced logging)
                        
                        if (typeof echarts === 'undefined') {
                            console.error('[${requestId}] ECharts is undefined');
                            console.error('[${requestId}] Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('chart')));
                            const errorMessage = generateFallbackContent('echarts', 'ECharts is undefined');
                            document.body.innerHTML += errorMessage;
                            clearTimeout(timeoutId);
                            document.body.setAttribute('data-charts-rendered', 'true');
                            document.body.setAttribute('data-charts-error', 'echarts-undefined');
                            return;
                        }
                        
                        if (!echarts.init) {
                            console.error('[${requestId}] ECharts.init method not available');
                            console.error('[${requestId}] ECharts methods:', Object.keys(echarts));
                            const errorMessage = generateFallbackContent('echarts', 'ECharts.init method not available');
                            document.body.innerHTML += errorMessage;
                            clearTimeout(timeoutId);
                            document.body.setAttribute('data-charts-rendered', 'true');
                            document.body.setAttribute('data-charts-error', 'echarts-no-init');
                            return;
                        }
                        
                        console.log('[${requestId}] ECharts library ready');

                        // Chart initialization functions using serialized configurations
                        const initRevenuePlanVsActualChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing RevenuePlanVsActual chart');
                            const chartContainer = document.getElementById('revenuePlanVsActualContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] RevenuePlanVsActual chart container not found');
                                resolve();
                                return;
                            }
                            
                            try {
                                const chart = echarts.init(chartContainer);
                                
                                // Use serialized configuration if available, otherwise fallback to basic chart
                                let options = chartConfigs.revenuePlanVsActual;
                                
                                if (!options) {
                                    // Fallback basic chart
                                    options = {
                                        animation: false,
                                        title: { text: '売上 (計画 vs 実績・予約)', left: 'center' },
                                        series: [{
                                            type: 'bar',
                                            data: [100, 50, 80],
                                            itemStyle: { color: '#3498db' }
                                        }],
                                        xAxis: { type: 'category', data: ['計画売上', '分散', '売上'] },
                                        yAxis: { type: 'value' }
                                    };
                                }
                                
                                // Ensure animation is disabled for PDF
                                options.animation = false;
                                
                                // Fix formatters for revenue chart
                                if (options.series && Array.isArray(options.series)) {
                                    console.log('[${requestId}] FORMATTING: Fixing revenue chart formatters');
                                    options.series.forEach((series, index) => {
                                        if (series.label && series.label.formatter) {
                                            console.log('[${requestId}] FORMATTING: Fixing revenue label formatter for series', index);
                                            series.label.formatter = function(params) {
                                                const formatted = formatYenInTenThousandsNoDecimal(params.value);
                                                console.log('[${requestId}] FORMATTING: Revenue label - input:', params.value, 'output:', formatted);
                                                return formatted;
                                            };
                                        }
                                        
                                        // Add label formatter if it doesn't exist
                                        if (!series.label) {
                                            series.label = {
                                                show: true,
                                                position: 'top',
                                                formatter: function(params) {
                                                    const formatted = formatYenInTenThousandsNoDecimal(params.value);
                                                    console.log('[${requestId}] FORMATTING: Added revenue label - input:', params.value, 'output:', formatted);
                                                    return formatted;
                                                }
                                            };
                                        }
                                    });
                                }
                                
                                // Fix yAxis formatter
                                if (options.yAxis && options.yAxis.axisLabel) {
                                    console.log('[${requestId}] FORMATTING: Fixing revenue yAxis formatter');
                                    options.yAxis.axisLabel.formatter = function(value) {
                                        const formatted = formatYenInTenThousands(value);
                                        console.log('[${requestId}] FORMATTING: Revenue YAxis - input:', value, 'output:', formatted);
                                        return formatted;
                                    };
                                } else if (options.yAxis) {
                                    options.yAxis.axisLabel = {
                                        formatter: function(value) {
                                            return formatYenInTenThousands(value);
                                        }
                                    };
                                }
                                
                                // Fix tooltip formatter
                                if (options.tooltip && options.tooltip.formatter) {
                                    console.log('[${requestId}] FORMATTING: Fixing revenue tooltip formatter');
                                    options.tooltip.formatter = function(params) {
                                        if (Array.isArray(params)) {
                                            let tooltip = params[0].name + '<br/>';
                                            params.forEach(param => {
                                                const formattedValue = formatYenInTenThousands(param.value);
                                                tooltip += param.marker + ' ' + param.seriesName + ': ' + formattedValue + '<br/>';
                                            });
                                            return tooltip;
                                        } else {
                                            return params.name + '<br/>' + params.marker + ' ' + params.seriesName + ': ' + formatYenInTenThousands(params.value);
                                        }
                                    };
                                }
                                
                                console.log('[${requestId}] FORMATTING: Setting revenue chart options');
                                
                                chart.setOption(options);
                                chart.resize();
                            
                            const chartTimeout = setTimeout(() => {
                                console.warn('[${requestId}] RevenuePlanVsActual chart rendering timeout - checking canvas content');
                                

                                
                                try {
                                    chart.dispose();
                                } catch (disposeError) {
                                    console.error('[${requestId}] Error disposing timed-out chart:', disposeError);
                                }
                                
                                resolve();
                            }, 5000);
                                
                                chart.on('finished', () => {
                                    clearTimeout(chartTimeout);
                                    console.log('[${requestId}] RevenuePlanVsActual chart finished rendering');
                                    

                                    
                                    setTimeout(resolve, 100);
                                });
                                
                                chart.on('error', (error) => {
                                    clearTimeout(chartTimeout);
                                    console.error('[${requestId}] RevenuePlanVsActual chart rendering error:', error);
                                    chartContainer.innerHTML = generateFallbackContent('revenuePlanVsActual', 'Chart rendering error: ' + error.message);
                                    resolve();
                                });
                                
                            } catch (error) {
                                console.error('[${requestId}] Error initializing RevenuePlanVsActual chart:', error);
                                chartContainer.innerHTML = generateFallbackContent('revenuePlanVsActual', 'Chart initialization error: ' + error.message);
                                resolve();
                            }
                        });

                        const initOccupancyGaugeChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing OccupancyGauge chart');
                            const chartContainer = document.getElementById('occupancyGaugeContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] OccupancyGauge chart container not found');
                                resolve();
                                return;
                            }
                            
                            try {
                                const chart = echarts.init(chartContainer);
                                
                                // Use serialized configuration if available, otherwise fallback to basic chart
                                let options = chartConfigs.occupancyGauge;
                                
                                console.log('[${requestId}] FORMATTING: OccupancyGauge config available:', !!options);
                                if (options && options.series && options.series[0] && options.series[0].data) {
                                    console.log('[${requestId}] FORMATTING: Serialized occupancy data:', options.series[0].data[0]);
                                }
                                
                                if (!options) {
                                    console.warn('[${requestId}] No serialized config for OccupancyGauge, using fallback');
                                    // Fallback basic gauge chart
                                    const data = chartData.aggregateData || {};
                                    const occupancyRate = data.total_available_rooms > 0 ? 
                                        (data.total_sold_rooms / data.total_available_rooms * 100) : 0;
                                    
                                    options = {
                                        animation: false,
                                        series: [{
                                            name: '稼働率',
                                            type: 'gauge',
                                            detail: { formatter: '{value}%' },
                                            data: [{ value: occupancyRate.toFixed(1), name: '稼働率' }],
                                            max: 100,
                                            axisLine: {
                                                lineStyle: {
                                                    width: 20,
                                                    color: [
                                                        [0.3, '#ff4757'],
                                                        [0.7, '#ffa502'],
                                                        [1, '#2ed573']
                                                    ]
                                                }
                                            }
                                        }]
                                    };
                                }
                                
                                // Ensure animation is disabled for PDF
                                options.animation = false;
                                
                                // Fix formatter functions that might not work after deserialization
                                if (options.series && options.series[0]) {
                                    const series = options.series[0];
                                    
                                    // Log original data value for debugging formatting
                                    if (series.data && series.data[0]) {
                                        console.log('[${requestId}] FORMATTING: Original occupancy value:', series.data[0].value);
                                    }
                                    
                                    // Fix detail formatter for occupancy gauge
                                    if (series.detail) {
                                        console.log('[${requestId}] FORMATTING: Replacing detail formatter');
                                        series.detail.formatter = function (value) {
                                            const formatted = formatPercentage(value);
                                            console.log('[${requestId}] FORMATTING: Detail formatter - input:', value, 'output:', formatted);
                                            return formatted;
                                        };
                                    }
                                    
                                    // Fix axisLabel formatter
                                    if (series.axisLabel) {
                                        console.log('[${requestId}] FORMATTING: Replacing axisLabel formatter');
                                        series.axisLabel.formatter = function (value) {
                                            const formatted = (value * 100).toFixed(0) + '%';
                                            console.log('[${requestId}] FORMATTING: AxisLabel formatter - input:', value, 'output:', formatted);
                                            return formatted;
                                        };
                                    }
                                }
                                
                                console.log('[${requestId}] FORMATTING: Setting occupancy gauge options with data:', 
                                    options.series[0].data[0] ? options.series[0].data[0].value : 'no data');
                                
                                chart.setOption(options);
                                chart.resize();
                                
                                const chartTimeout = setTimeout(() => {
                                console.warn('[${requestId}] OccupancyGauge chart rendering timeout - proceeding with fallback');
                                try {
                                    chart.dispose();
                                } catch (disposeError) {
                                    console.error('[${requestId}] Error disposing timed-out chart:', disposeError);
                                }
                                
                                chartContainer.innerHTML = generateFallbackContent('occupancyGauge', 'Chart rendering timeout');
                                resolve();
                            }, 5000);
                            
                            chart.on('finished', () => {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] OccupancyGauge chart finished rendering');
                                setTimeout(resolve, 100);
                            });
                            
                            chart.on('error', (error) => {
                                clearTimeout(chartTimeout);
                                console.error('[${requestId}] OccupancyGauge chart rendering error:', error);
                                chartContainer.innerHTML = generateFallbackContent('occupancyGauge', 'Chart rendering error: ' + error.message);
                                resolve();
                            });
                            
                            } catch (error) {
                                console.error('[${requestId}] Error initializing OccupancyGauge chart:', error);
                                chartContainer.innerHTML = generateFallbackContent('occupancyGauge', 'Chart initialization error: ' + error.message);
                                resolve();
                            }
                        });

                        const initAllHotelsRevenueChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing AllHotelsRevenue chart');
                            const chartContainer = document.getElementById('allHotelsRevenueContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] AllHotelsRevenue chart container not found');
                                resolve();
                                return;
                            }
                            
                            try {
                                const chart = echarts.init(chartContainer);
                                
                                // Use serialized configuration if available, otherwise fallback to legacy options
                                let options = chartConfigs.allHotelsRevenue || allHotelsRevenueChartOptions;
                                
                                if (!options) {
                                    console.warn('[${requestId}] No config for AllHotelsRevenue, using basic fallback');
                                    options = {
                                        animation: false,
                                        title: { text: '施設別収益', left: 'center' },
                                        series: [{
                                            type: 'bar',
                                            data: [],
                                            itemStyle: { color: '#3498db' }
                                        }],
                                        xAxis: { type: 'value' },
                                        yAxis: { type: 'category', data: [] }
                                    };
                                }
                                
                                // Ensure animation is disabled for PDF
                                options.animation = false;
                                
                                chart.setOption(options);
                                chart.resize();
                                
                                console.log('[${requestId}] AllHotelsRevenue chart options set successfully');
                                
                                const chartTimeout = setTimeout(() => {
                                    console.log('[${requestId}] AllHotelsRevenue chart rendering timeout');
                                    resolve();
                                }, 5000);
                                
                                chart.on('finished', () => {
                                    clearTimeout(chartTimeout);
                                    console.log('[${requestId}] AllHotelsRevenue chart finished rendering');
                                    setTimeout(resolve, 100);
                                });
                                
                                chart.on('error', (error) => {
                                    clearTimeout(chartTimeout);
                                    console.error('[${requestId}] AllHotelsRevenue chart rendering error:', error);
                                    chartContainer.innerHTML = generateFallbackContent('allHotelsRevenue', 'Chart rendering error: ' + error.message);
                                    resolve();
                                });
                                
                            } catch (error) {
                                console.error('[${requestId}] Error initializing AllHotelsRevenue chart:', error);
                                chartContainer.innerHTML = generateFallbackContent('allHotelsRevenue', 'Chart initialization error: ' + error.message);
                                resolve();
                            }
                        });

                        const initAllHotelsOccupancyChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing AllHotelsOccupancy chart');
                            const chartContainer = document.getElementById('allHotelsOccupancyContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] AllHotelsOccupancy chart container not found');
                                resolve();
                                return;
                            }
                            
                            try {
                                const chart = echarts.init(chartContainer);
                                
                                // Use serialized configuration if available, otherwise fallback to basic chart
                                let options = chartConfigs.allHotelsOccupancy;
                                
                                if (!options) {
                                    console.warn('[${requestId}] No serialized config for AllHotelsOccupancy, using fallback');
                                    // Fallback basic chart
                                    const occupancyData = chartData.allHotelsOccupancyData || [];
                                    const hotels = [...new Set(occupancyData.map(d => d.hotel_name))].sort();
                                    
                                    options = {
                                        animation: false,
                                        title: { text: '施設別稼働率', left: 'center' },
                                        tooltip: {
                                            trigger: 'axis',
                                            axisPointer: { type: 'cross' }
                                        },
                                        legend: { 
                                            data: ['計画稼働率', '稼働率'], 
                                            top: 'bottom' 
                                        },
                                        grid: { containLabel: true, left: '3%', right: '4%', bottom: '15%' },
                                        xAxis: { type: 'value' },
                                        yAxis: { type: 'category', data: hotels, inverse: true },
                                        series: [
                                            {
                                                name: '計画稼働率',
                                                type: 'bar',
                                                data: hotels.map(h => {
                                                    const item = occupancyData.find(d => d.hotel_name === h);
                                                    return item?.fc_occ ? parseFloat(item.fc_occ.toFixed(2)) : 0;
                                                }),
                                                itemStyle: { color: '#3498db' }
                                            },
                                            {
                                                name: '稼働率',
                                                type: 'bar',
                                                data: hotels.map(h => {
                                                    const item = occupancyData.find(d => d.hotel_name === h);
                                                    return item?.occ ? parseFloat(item.occ.toFixed(2)) : 0;
                                                }),
                                                itemStyle: { color: '#2ecc71' }
                                            }
                                        ]
                                    };
                                }
                                
                                // Ensure animation is disabled for PDF
                                options.animation = false;
                                
                                // Fix percentage formatting for occupancy chart
                                if (options.series && Array.isArray(options.series)) {
                                    console.log('[${requestId}] FORMATTING: Fixing AllHotelsOccupancy percentage formatting');
                                    options.series.forEach((series, index) => {
                                        if (series.label && series.label.formatter) {
                                            console.log('[${requestId}] FORMATTING: Fixing occupancy label formatter for series', index);
                                            series.label.formatter = function(params) {
                                                const formatted = (params.value / 100).toFixed(2) + '%';
                                                console.log('[${requestId}] FORMATTING: Occupancy label - input:', params.value, 'output:', formatted);
                                                return formatted;
                                            };
                                        }
                                        
                                        // Add label formatter if it doesn't exist
                                        if (!series.label) {
                                            series.label = {
                                                show: true,
                                                position: 'right',
                                                formatter: function(params) {
                                                    const formatted = (params.value / 100).toFixed(2) + '%';
                                                    console.log('[${requestId}] FORMATTING: Added occupancy label - input:', params.value, 'output:', formatted);
                                                    return formatted;
                                                }
                                            };
                                        }
                                    });
                                }
                                
                                // Fix tooltip formatter for percentages
                                if (options.tooltip && options.tooltip.formatter) {
                                    console.log('[${requestId}] FORMATTING: Fixing occupancy tooltip formatter');
                                    options.tooltip.formatter = function(params) {
                                        if (Array.isArray(params)) {
                                            let tooltip = params[0].name + '<br/>';
                                            params.forEach(param => {
                                                const formattedValue = (param.value / 100).toFixed(2) + '%';
                                                tooltip += param.marker + ' ' + param.seriesName + ': ' + formattedValue + '<br/>';
                                            });
                                            return tooltip;
                                        } else {
                                            const formattedValue = (params.value / 100).toFixed(2) + '%';
                                            return params.name + '<br/>' + params.marker + ' ' + params.seriesName + ': ' + formattedValue;
                                        }
                                    };
                                }
                                
                                // Fix xAxis formatter for percentages
                                if (options.xAxis && options.xAxis.axisLabel) {
                                    options.xAxis.axisLabel.formatter = function(value) {
                                        return (value / 100).toFixed(0) + '%';
                                    };
                                }
                                
                                console.log('[${requestId}] FORMATTING: Setting AllHotelsOccupancy options with series count:', options.series ? options.series.length : 0);
                                
                                chart.setOption(options);
                                chart.resize();
                                
                                const chartTimeout = setTimeout(() => {
                                    console.warn('[${requestId}] AllHotelsOccupancy chart rendering timeout - proceeding with fallback');
                                    try {
                                        chart.dispose();
                                    } catch (disposeError) {
                                        console.error('[${requestId}] Error disposing timed-out chart:', disposeError);
                                    }
                                    
                                    chartContainer.innerHTML = generateFallbackContent('allHotelsOccupancy', 'Chart rendering timeout');
                                    resolve();
                                }, 5000);
                                
                                chart.on('finished', () => {
                                    clearTimeout(chartTimeout);
                                    console.log('[${requestId}] AllHotelsOccupancy chart finished rendering');
                                    setTimeout(resolve, 100);
                                });
                                
                                chart.on('error', (error) => {
                                    clearTimeout(chartTimeout);
                                    console.error('[${requestId}] AllHotelsOccupancy chart rendering error:', error);
                                    chartContainer.innerHTML = generateFallbackContent('allHotelsOccupancy', 'Chart rendering error: ' + error.message);
                                    resolve();
                                });
                                
                            } catch (error) {
                                console.error('[${requestId}] Error initializing AllHotelsOccupancy chart:', error);
                                chartContainer.innerHTML = generateFallbackContent('allHotelsOccupancy', 'Chart initialization error: ' + error.message);
                                resolve();
                            }
                        });





                        const promises = [];
                        console.log('[${requestId}] Checking chart data for generation', {
                            hasChartData: !!chartData,
                            hasAggregateData: !!(chartData && chartData.aggregateData),
                            hasAllHotelsRevenueData: !!(chartData && chartData.allHotelsRevenueData),
                            hasAllHotelsOccupancyData: !!(chartData && chartData.allHotelsOccupancyData),
                            chartDataKeys: chartData ? Object.keys(chartData) : null,
                            aggregateDataContent: chartData && chartData.aggregateData ? JSON.stringify(chartData.aggregateData) : null,
                            allHotelsRevenueDataLength: chartData && chartData.allHotelsRevenueData ? chartData.allHotelsRevenueData.length : 0,
                            allHotelsOccupancyDataLength: chartData && chartData.allHotelsOccupancyData ? chartData.allHotelsOccupancyData.length : 0
                        });
                        
                        if (chartData && chartData.aggregateData) {
                            console.log('[${requestId}] Adding RevenuePlanVsActual chart to promises');
                            promises.push(initRevenuePlanVsActualChart());
                            console.log('[${requestId}] Adding OccupancyGauge chart to promises');
                            promises.push(initOccupancyGaugeChart());
                        } else {
                            console.log('[${requestId}] Skipping aggregate charts - no aggregateData');
                        }
                        if (chartData && chartData.allHotelsRevenueData && chartData.allHotelsRevenueData.length > 0) {
                            console.log('[${requestId}] FACILITY CHARTS: Adding AllHotelsRevenue chart - data count:', chartData.allHotelsRevenueData.length);
                            console.log('[${requestId}] FACILITY CHARTS: Revenue data sample:', chartData.allHotelsRevenueData[0]);
                            promises.push(initAllHotelsRevenueChart());
                        } else {
                            console.log('[${requestId}] FACILITY CHARTS: Skipping AllHotelsRevenue - no data. Available keys:', chartData ? Object.keys(chartData) : 'no chartData');
                        }
                        if (chartData && chartData.allHotelsOccupancyData && chartData.allHotelsOccupancyData.length > 0) {
                            console.log('[${requestId}] FACILITY CHARTS: Adding AllHotelsOccupancy chart - data count:', chartData.allHotelsOccupancyData.length);
                            console.log('[${requestId}] FACILITY CHARTS: Occupancy data sample:', chartData.allHotelsOccupancyData[0]);
                            promises.push(initAllHotelsOccupancyChart());
                        } else {
                            console.log('[${requestId}] FACILITY CHARTS: Skipping AllHotelsOccupancy - no data. Available keys:', chartData ? Object.keys(chartData) : 'no chartData');
                        }

                        console.log('[${requestId}] Total promises to wait for:', promises.length);
                        
                        // Debug: Log all elements with IDs
                        const allElements = document.querySelectorAll('[id]');
                        console.log('[${requestId}] All elements with IDs:', Array.from(allElements).map(el => el.id));
                        
                        if (promises.length > 0) {
                            Promise.all(promises).then(() => {
                                console.log('[${requestId}] All charts rendered successfully');
                                clearTimeout(timeoutId);
                                document.body.setAttribute('data-charts-rendered', 'true');
                            }).catch((error) => {
                                console.error('[${requestId}] Error rendering charts:', error);
                                clearTimeout(timeoutId);
                                document.body.setAttribute('data-charts-rendered', 'true');
                            });
                        } else {
                            console.log('[${requestId}] No charts to render');
                            clearTimeout(timeoutId);
                            document.body.setAttribute('data-charts-rendered', 'true');
                        }
                    } catch (error) {
                        console.error('[${requestId}] Error in chart generation script:', error);
                        clearTimeout(timeoutId);
                        document.body.setAttribute('data-charts-rendered', 'true');
                    }
                });
            `;

            logger.debug('Building HTML content for graph view', {
                requestId,
                hasKpiData: !!kpiData,
                hasChartData: !!chartData,
                hasAllHotelsRevenueOptions: !!allHotelsRevenueChartOptions,
                chartDataStructure: chartData ? {
                    hasAggregateData: !!chartData.aggregateData,
                    hasAllHotelsRevenueData: !!(chartData.allHotelsRevenueData && chartData.allHotelsRevenueData.length > 0),
                    hasAllHotelsOccupancyData: !!(chartData.allHotelsOccupancyData && chartData.allHotelsOccupancyData.length > 0),
                    aggregateDataKeys: chartData.aggregateData ? Object.keys(chartData.aggregateData) : null,
                    allHotelsRevenueDataLength: chartData.allHotelsRevenueData ? chartData.allHotelsRevenueData.length : 0,
                    allHotelsOccupancyDataLength: chartData.allHotelsOccupancyData ? chartData.allHotelsOccupancyData.length : 0
                } : null
            });

            htmlContent = `
                <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: 'Noto Sans JP', sans-serif; margin: 20mm; }
                        h1 { color: #333; margin-bottom: 20px; }
                        h2 { color: #333; font-size: 1.3em; margin: 30px 0 15px 0; border-bottom: 2px solid #eee; padding-bottom: 5px; }
                        h3 { color: #555; font-size: 1.1em; margin: 15px 0 10px 0; }
                        
                        .kpi-section { margin: 20px 0; }
                        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                        .kpi-card { 
                            background: #f8f9fa; 
                            padding: 15px; 
                            border-radius: 8px; 
                            text-align: center; 
                            border: 1px solid #e9ecef;
                        }
                        .kpi-card h3 { 
                            font-size: 0.9em; 
                            color: #666; 
                            margin: 0 0 10px 0; 
                            font-weight: 500;
                        }
                        .kpi-value { 
                            font-size: 1.4em; 
                            font-weight: bold; 
                            color: #333; 
                            margin: 0;
                        }
                        
                        .charts-section, .all-hotels-section { margin: 30px 0; }
                        .chart-row { display: flex; gap: 20px; margin: 20px 0; }
                        .chart-half { flex: 1; text-align: center; }
                        .chart-half h3 { margin-bottom: 15px; }
                    </style>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
                    <script>
                        // ECharts library embedded directly
                        ${loadEChartsLibrary()}
                    </script>
                    <script>
                        console.log('ECharts embedded successfully, version:', echarts ? echarts.version : 'not available');
                    </script>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <p><strong>レポート期間:</strong> ${periodMaxDate}</p>
                    <p><strong>対象施設:</strong> ${allHotelNames}</p>




                    <div class="charts-section">
                        <h2>月次サマリー</h2>
                        <div class="chart-row">
                            <!-- Left Column: Revenue Chart (Tall) -->
                            <div class="chart-half">
                                <div id="revenuePlanVsActualContainer" style="width: 400px; height: 500px; margin: 0 auto;"></div>
                            </div>
                            <!-- Right Column: Gauge + KPIs -->
                            <div class="chart-half" style="display: flex; flex-direction: column; gap: 20px;">
                                <!-- Gauge Chart -->
                                <div>
                                    <div id="occupancyGaugeContainer" style="width: 400px; height: 250px; margin: 0 auto;"></div>
                                </div>
                                <!-- KPI Cards -->
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef;">
                                        <h4 style="font-size: 0.9em; color: #666; margin: 0 0 10px 0; font-weight: 500;">ADR</h4>
                                        <p style="font-size: 1.4em; font-weight: bold; color: #333; margin: 0;">${kpiData.actualADR ? kpiData.actualADR.toLocaleString('ja-JP') : 'N/A'}円</p>
                                        <p style="font-size: 0.8em; color: #666; margin: 5px 0 0 0;">(計画: ${kpiData.forecastADR ? kpiData.forecastADR.toLocaleString('ja-JP') : 'N/A'}円)</p>
                                        ${(() => {
                    if (kpiData.actualADR && kpiData.forecastADR) {
                        const diff = kpiData.actualADR - kpiData.forecastADR;
                        const color = diff >= 0 ? '#10b981' : '#ef4444'; // green or red
                        const sign = diff >= 0 ? '+' : '';
                        return `<p style="font-size: 0.8em; color: ${color}; margin: 5px 0 0 0; font-weight: bold;">${sign}${diff.toLocaleString('ja-JP')}円</p>`;
                    }
                    return '';
                })()}
                                    </div>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef;">
                                        <h4 style="font-size: 0.9em; color: #666; margin: 0 0 10px 0; font-weight: 500;">RevPAR</h4>
                                        <p style="font-size: 1.4em; font-weight: bold; color: #333; margin: 0;">${kpiData.actualRevPAR ? kpiData.actualRevPAR.toLocaleString('ja-JP') : 'N/A'}円</p>
                                        <p style="font-size: 0.8em; color: #666; margin: 5px 0 0 0;">(計画: ${kpiData.forecastRevPAR ? kpiData.forecastRevPAR.toLocaleString('ja-JP') : 'N/A'}円)</p>
                                        ${(() => {
                    if (kpiData.actualRevPAR && kpiData.forecastRevPAR) {
                        const diff = kpiData.actualRevPAR - kpiData.forecastRevPAR;
                        const color = diff >= 0 ? '#10b981' : '#ef4444'; // green or red
                        const sign = diff >= 0 ? '+' : '';
                        return `<p style="font-size: 0.8em; color: ${color}; margin: 5px 0 0 0; font-weight: bold;">${sign}${diff.toLocaleString('ja-JP')}円</p>`;
                    }
                    return '';
                })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="all-hotels-section">
                        <h2 style="page-break-before: always;">全施設 収益＆稼働率 概要</h2>
                        <div class="chart-row">
                            <div class="chart-half">
                                <h3>施設別 売上合計（計画 vs 実績・予約）</h3>
                                <div id="allHotelsRevenueContainer" style="width: 400px; height: 1200px; margin: 0 auto;"></div>
                            </div>
                            <div class="chart-half">
                                <h3>施設別 稼働率（計画 vs 実績・予約）</h3>
                                <div id="allHotelsOccupancyContainer" style="width: 400px; height: 1200px; margin: 0 auto;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <script>${chartGenerationScript}</script>
                </body>
                </html>`;
        } else {
            // Table view - no charts needed
            console.log(`[${requestId}] Generating table view PDF`);
            htmlContent = `
                <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: 'Noto Sans JP', sans-serif; margin: 20mm; }
                        h1 { color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .section-title { margin-top: 30px; font-size: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    </style>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <p><strong>レポート期間:</strong> ${periodMaxDate}</p>
                    <p><strong>対象施設:</strong> ${allHotelNames}</p>
                    <p><strong>表示モード:</strong> ${selectedView === 'graph' ? 'グラフ' : 'テーブル'}</p>
            `;

            const revenueData = chartData?.allHotelsRevenueData || [];
            const occupancyData = chartData?.allHotelsOccupancyData || [];

            if (revenueData && revenueData.length > 0) {
                htmlContent += `<div class="section-title">収益データ</div>`;
                htmlContent += `<table><thead><tr><th>ホテル名</th><th>月度</th><th>計画売上</th><th>売上</th></tr></thead><tbody>`;
                revenueData.forEach(item => {
                    const forecastRev = typeof item.forecast_revenue === 'number' ? item.forecast_revenue.toLocaleString() : 'N/A';
                    const accommodationRev = typeof item.accommodation_revenue === 'number' ? item.accommodation_revenue.toLocaleString() : 'N/A';
                    htmlContent += `<tr><td>${item.hotel_name}</td><td>${item.month}</td><td>${forecastRev}</td><td>${accommodationRev}</td></tr>`;
                });
                htmlContent += `</tbody></table>`;
            } else {
                htmlContent += `<p>収益データはありません。</p>`;
            }

            if (occupancyData && occupancyData.length > 0) {
                htmlContent += `<div class="section-title">稼働データ</div>`;
                htmlContent += `<table><thead><tr><th>ホテル名</th><th>月度</th><th>販売室数</th><th>稼働率 (%)</th></tr></thead><tbody>`;
                occupancyData.forEach(item => {
                    htmlContent += `<tr><td>${item.hotel_name}</td><td>${item.month}</td><td>${item.sold_rooms}</td><td>${item.occ?.toFixed(2) || 'N/A'}</td></tr>`;
                });
                htmlContent += `</tbody></table>`;
            } else {
                htmlContent += `<p>稼働データはありません。</p>`;
            }

            htmlContent += `</body></html>`;
        }

        logger.debug('Launching browser with enhanced configuration', { requestId });

        // Enhanced browser launch with resource management
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--memory-pressure-off',
                '--max_old_space_size=4096'
            ]
        });

        page = await browser.newPage();

        // Set page resource limits
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.setDefaultTimeout(30000);

        // Monitor page errors and resource usage
        page.on('error', (error) => {
            logger.error('Page error detected', {
                requestId,
                error: error.message,
                stack: error.stack
            });
        });

        page.on('pageerror', (error) => {
            logger.error('Page JavaScript error', {
                requestId,
                error: error.message,
                stack: error.stack
            });
        });

        logger.debug('Browser and page created with enhanced monitoring', { requestId });

        logger.debug('Setting page content', {
            requestId,
            htmlContentLength: htmlContent.length,
            selectedView,
            htmlPreview: htmlContent.substring(0, 500)
        });
        await page.setContent(htmlContent, { waitUntil: 'load' });
        logger.debug('Page content set, network idle reached', { requestId });

        if (selectedView === 'graph') {
            logger.debug('Waiting for charts to render', { requestId });

            // Listen to console messages from the page
            page.on('console', msg => {
                logger.debug(`Browser console [${msg.type()}]:`, { requestId, message: msg.text() });
            });

            try {
                // Enhanced timeout handling with partial content support
                await page.waitForSelector('body[data-charts-rendered="true"]', { timeout: 30000 });
                logger.debug('Charts rendered successfully', { requestId });

                // Perform comprehensive chart validation using StyleConsistencyValidator
                const validationResult = await validateChartRendering(page, requestId);

                // Validate each chart container using StyleConsistencyValidator
                const chartContainers = ['revenuePlanVsActualContainer', 'occupancyGaugeContainer', 'allHotelsRevenueContainer', 'allHotelsOccupancyContainer'];
                const canvasValidations = {};

                for (const containerId of chartContainers) {
                    if (validationResult.containers[containerId]) {
                        const canvasValidation = styleValidator.validateCanvasContent(
                            validationResult.containers[containerId],
                            containerId.replace('Container', ''),
                            requestId
                        );
                        canvasValidations[containerId] = canvasValidation;

                        if (!canvasValidation.isValid) {
                            logger.warn(`Canvas validation failed for ${containerId}`, {
                                requestId,
                                validation: canvasValidation
                            });
                        }
                    }
                }

                // Log overall validation summary
                const validCanvasCount = Object.values(canvasValidations).filter(v => v.isValid).length;
                const totalExpectedCharts = chartContainers.length;

                logger.info('Chart rendering validation summary', {
                    requestId,
                    validCanvases: validCanvasCount,
                    totalExpected: totalExpectedCharts,
                    renderingSuccess: validationResult.summary.renderingSuccess,
                    canvasValidations
                });

                // Give a small delay to ensure charts are fully processed
                await page.waitForTimeout(2000);
                logger.debug('Additional delay completed', { requestId });

            } catch (error) {
                logger.warn('Chart rendering timeout, proceeding with partial content', {
                    requestId,
                    error: error.message,
                    timeoutDuration: 30000
                });

                // Check if we have any partial chart content
                try {
                    const partialValidation = await validateChartRendering(page, requestId);
                    const partialCanvasCount = partialValidation.summary.validCanvases;

                    logger.info('Partial chart content detected', {
                        requestId,
                        partialCanvases: partialCanvasCount,
                        totalExpected: 4
                    });

                    if (partialCanvasCount > 0) {
                        logger.info('Proceeding with partial chart content', {
                            requestId,
                            availableCharts: partialCanvasCount
                        });
                    } else {
                        logger.warn('No chart content available, generating PDF with placeholders', {
                            requestId
                        });
                    }
                } catch (validationError) {
                    logger.error('Failed to validate partial chart content', {
                        requestId,
                        error: validationError.message
                    });
                }

                // Continue with PDF generation even if charts timeout
            }
        }

        logger.debug('Generating PDF', { requestId });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });

        // Collect final metrics
        const generationTime = Date.now() - startTime;

        logger.info('PDF generated successfully', {
            requestId,
            pdfSize: pdf.length,
            generationTime,
            selectedView,
            reportType,
            hasSerializedConfigs: !!serializedChartConfigs,
            configCount: serializedChartConfigs ? Object.keys(serializedChartConfigs).length : 0
        });

        return pdf;

    } catch (error) {
        logger.error('Error generating PDF report', {
            requestId,
            error: error.message,
            stack: error.stack,
            selectedView,
            reportType,
            browserActive: !!browser
        });

        // Enhanced error handling with fallback content
        if (error.message.includes('timeout') || error.message.includes('TimeoutError')) {
            logger.warn('PDF generation timeout detected, attempting partial content return', {
                requestId,
                selectedView,
                reportType
            });

            // Try to generate a simplified PDF with available content
            try {
                if (browser && page) {
                    const partialPdf = await page.pdf({
                        format: 'A4',
                        printBackground: true,
                        margin: {
                            top: '20mm',
                            right: '20mm',
                            bottom: '20mm',
                            left: '20mm'
                        }
                    });

                    logger.info('Partial PDF generated successfully after timeout', {
                        requestId,
                        pdfSize: partialPdf.length
                    });

                    return partialPdf;
                }
            } catch (partialError) {
                logger.error('Failed to generate partial PDF', {
                    requestId,
                    error: partialError.message
                });
            }
        }

        // Circuit breaker pattern for resource exhaustion
        if (error.message.includes('memory') || error.message.includes('resource')) {
            logger.error('Resource exhaustion detected, implementing circuit breaker', {
                requestId,
                error: error.message
            });

            // Force cleanup and throw specific error
            if (browser) {
                try {
                    await browser.close();
                } catch (cleanupError) {
                    logger.error('Failed to cleanup browser after resource exhaustion', {
                        requestId,
                        cleanupError: cleanupError.message
                    });
                }
            }

            throw new Error('PDF generation temporarily unavailable due to resource constraints');
        }

        console.error(`[${requestId}] Error generating PDF report:`, error);
        throw new Error('Failed to generate PDF report: ' + error.message);
    } finally {
        // Enhanced cleanup with proper error handling
        if (browser) {
            try {
                logger.debug('Starting browser cleanup', { requestId });

                // Close browser with timeout - Playwright handles page/context cleanup automatically
                const closePromise = browser.close();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Browser close timeout')), 10000);
                });

                await Promise.race([closePromise, timeoutPromise]);
                logger.debug('Browser closed successfully', { requestId });

            } catch (cleanupError) {
                logger.error('Error during browser cleanup', {
                    requestId,
                    error: cleanupError.message,
                    stack: cleanupError.stack
                });

                // Force close if normal close fails
                try {
                    if (browser && typeof browser.close === 'function') {
                        await browser.close();
                    }
                } catch (forceCloseError) {
                    logger.warn('Force close also failed, Playwright will handle process cleanup', {
                        requestId,
                        error: forceCloseError.message
                    });
                }
            } finally {
                browser = null;
                logger.debug('Browser cleanup completed', { requestId });
            }
        }

        // Log final resource cleanup metrics
        const finalTime = Date.now();

        logger.info('PDF generation process completed', {
            requestId,
            totalTime: finalTime - startTime,
            browserCleaned: !browser,
            selectedView,
            reportType
        });
    }
};

/**
 * Wrapper for PDF generation to enforce concurrency limits
 */
const generatePdfReport = (reportType, reqBody, requestId) => {
    return new Promise((resolve, reject) => {
        pdfQueue.push({ reportType, reqBody, requestId, resolve, reject });
        processPdfQueue();
    });
};

module.exports = {
    generatePdfReport,
};
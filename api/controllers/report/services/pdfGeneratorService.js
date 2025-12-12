const { chromium } = require('playwright');
const logger = require('../../../config/logger');

const generatePdfReport = async (reportType, reqBody, requestId) => {
    logger.debug('PDF generation started', {
        requestId,
        reportType,
        selectedView: reqBody.selectedView,
        hasKpiData: !!reqBody.kpiData,
        hasChartData: !!reqBody.chartData,
        hasAllHotelsRevenueOptions: !!reqBody.allHotelsRevenueChartOptions
    });

    const { selectedView, periodMaxDate, allHotelNames, kpiData, chartData, allHotelsRevenueChartOptions } = reqBody;
    
    // Debug: Log the actual received data
    logger.debug('Received request body data', {
        requestId,
        selectedView,
        periodMaxDate,
        allHotelNames,
        kpiData: kpiData ? JSON.stringify(kpiData, null, 2) : null,
        chartData: chartData ? JSON.stringify(chartData, null, 2) : null,
        allHotelsRevenueChartOptions: allHotelsRevenueChartOptions ? 'present' : null,
        fullReqBodyKeys: Object.keys(reqBody),
        fullReqBody: JSON.stringify(reqBody, null, 2)
    });
    let browser;

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
                kpiDataKeys: kpiData ? Object.keys(kpiData) : null,
                chartDataKeys: chartData ? Object.keys(chartData) : null,
                selectedView,
                periodMaxDate,
                allHotelNames
            });

            logger.debug('Building chart generation script', { requestId });
            
            // Validate data before JSON.stringify
            try {
                const testKpiData = JSON.stringify(kpiData || {});
                const testChartData = JSON.stringify(chartData || {});
                const testAllHotelsRevenueChartOptions = JSON.stringify(allHotelsRevenueChartOptions || {});
                logger.debug('Data serialization test passed', { 
                    requestId,
                    kpiDataLength: testKpiData.length,
                    chartDataLength: testChartData.length,
                    allHotelsRevenueChartOptionsLength: testAllHotelsRevenueChartOptions.length
                });
            } catch (error) {
                logger.error('Data serialization failed', { requestId, error: error.message });
                throw new Error('Failed to serialize chart data: ' + error.message);
            }

            const chartGenerationScript = `
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[${requestId}] DOM loaded, starting chart generation');
                    
                    // Set a timeout to ensure we don't wait forever
                    const timeoutId = setTimeout(() => {
                        console.log('[${requestId}] Chart generation timeout, setting fallback attribute');
                        document.body.setAttribute('data-charts-rendered', 'true');
                    }, 15000);

                    try {
                        console.log('[${requestId}] Starting data parsing');
                        const kpiData = ${JSON.stringify(kpiData || {}, null, 2)};
                        const chartData = ${JSON.stringify(chartData || {}, null, 2)};
                        const allHotelsRevenueChartOptions = ${JSON.stringify(allHotelsRevenueChartOptions || {}, null, 2)};
                        const isCumulative = ${isCumulative};
                        console.log('[${requestId}] Data parsed successfully', { 
                            hasKpiData: !!kpiData, 
                            hasChartData: !!chartData,
                            chartDataKeys: chartData ? Object.keys(chartData) : null,
                            hasAggregateData: !!(chartData && chartData.aggregateData),
                            hasAllHotelsRevenueData: !!(chartData && chartData.allHotelsRevenueData),
                            hasAllHotelsOccupancyData: !!(chartData && chartData.allHotelsOccupancyData)
                        });

                        // Check if ECharts is available
                        if (typeof echarts === 'undefined') {
                            console.error('[${requestId}] ECharts library not loaded');
                            clearTimeout(timeoutId);
                            document.body.setAttribute('data-charts-rendered', 'true');
                            return;
                        }
                        console.log('[${requestId}] ECharts library loaded successfully');
                        console.log('[${requestId}] ECharts version:', echarts.version || 'unknown');

                        // Chart initialization functions
                        const initRevenuePlanVsActualChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing RevenuePlanVsActual chart');
                            const chartContainer = document.getElementById('revenuePlanVsActualContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] RevenuePlanVsActual chart container not found');
                                resolve();
                                return;
                            }
                            const chart = echarts.init(chartContainer);
                            
                            const data = chartData.aggregateData;
                            const { total_forecast_revenue, total_period_accommodation_revenue } = data;
                            const varianceAmount = total_period_accommodation_revenue - total_forecast_revenue;

                            let displayVariancePercent;
                            if (total_forecast_revenue === 0 || total_forecast_revenue === null) {
                                displayVariancePercent = (total_period_accommodation_revenue === 0 || total_period_accommodation_revenue === null) ? "0.00%" : "N/A";
                            } else {
                                const percent = (varianceAmount / total_forecast_revenue) * 100;
                                displayVariancePercent = percent.toFixed(2) + "%";
                            }

                            const variancePositiveColor = '#4CAF50';
                            const varianceNegativeColor = '#F44336';
                            const forecastColor = '#3498db';
                            const actualColor = '#2ecc71';

                            const options = {
                                animation: false,
                                tooltip: {
                                    trigger: 'axis',
                                    axisPointer: { type: 'shadow' },
                                    formatter: (params) => {
                                        const valueParam = params.find(p => p.seriesName === '売上');
                                        if (!valueParam) return '';

                                        let tooltipText = valueParam.name + '<br/>';
                                        if (valueParam.name === '分散') {
                                            tooltipText += valueParam.marker + ' 金額: ' + (varianceAmount / 10000).toLocaleString('ja-JP') + '万円<br/>';
                                            tooltipText += '率: ' + displayVariancePercent;
                                        } else {
                                            tooltipText += valueParam.marker + ' 金額: ' + (valueParam.value / 10000).toLocaleString('ja-JP') + '万円';
                                        }
                                        return tooltipText;
                                    }
                                },
                                grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
                                xAxis: [{
                                    type: 'category',
                                    data: ['計画売上', '分散', '実績売上'],
                                    splitLine: { show: false },
                                    axisLabel: { interval: 0 }
                                }],
                                yAxis: [{
                                    type: 'value',
                                    name: '金額 (万円)',
                                    axisLabel: { formatter: (value) => (value / 10000).toLocaleString('ja-JP') },
                                    splitLine: { show: true }
                                }],
                                series: [
                                    {
                                        name: 'PlaceholderBase',
                                        type: 'bar',
                                        stack: 'total',
                                        barWidth: '60%',
                                        itemStyle: { borderColor: 'transparent', color: 'transparent' },
                                        emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
                                        data: [
                                            0,
                                            varianceAmount >= 0 ? total_forecast_revenue : total_period_accommodation_revenue,
                                            0
                                        ]
                                    },
                                    {
                                        name: '売上',
                                        type: 'bar',
                                        stack: 'total',
                                        barWidth: '60%',
                                        label: {
                                            show: true,
                                            formatter: (params) => {
                                                if (params.name === '分散') {
                                                    return displayVariancePercent;
                                                }
                                                return (params.value / 10000).toLocaleString('ja-JP') + '万円';
                                            }
                                        },
                                        data: [
                                            {
                                                value: total_forecast_revenue,
                                                itemStyle: { color: forecastColor },
                                                label: { position: 'top' }
                                            },
                                            {
                                                value: Math.abs(varianceAmount),
                                                itemStyle: { color: varianceAmount >= 0 ? variancePositiveColor : varianceNegativeColor },
                                                label: { position: 'top' }
                                            },
                                            {
                                                value: total_period_accommodation_revenue,
                                                itemStyle: { color: actualColor },
                                                label: { position: 'top' }
                                            }
                                        ]
                                    }
                                ]
                            };

                            chart.setOption(options);
                            chart.resize();
                            
                            const chartTimeout = setTimeout(() => {
                                console.log('[${requestId}] RevenuePlanVsActual chart rendering timeout');
                                resolve();
                            }, 5000);
                            
                            chart.on('finished', () => {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] RevenuePlanVsActual chart finished rendering');
                                setTimeout(resolve, 100);
                            });
                        });

                        const initOccupancyGaugeChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing OccupancyGauge chart');
                            const chartContainer = document.getElementById('occupancyGaugeContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] OccupancyGauge chart container not found');
                                resolve();
                                return;
                            }
                            const chart = echarts.init(chartContainer);
                            
                            const data = chartData.aggregateData;
                            const occupancyRate = data.total_available_rooms > 0 ? 
                                (data.total_sold_rooms / data.total_available_rooms * 100) : 0;
                            
                            const options = {
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

                            chart.setOption(options);
                            chart.resize();
                            
                            const chartTimeout = setTimeout(() => {
                                console.log('[${requestId}] OccupancyGauge chart rendering timeout');
                                resolve();
                            }, 5000);
                            
                            chart.on('finished', () => {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] OccupancyGauge chart finished rendering');
                                setTimeout(resolve, 100);
                            });
                        });

                        const initAllHotelsRevenueChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing AllHotelsRevenue chart');
                            const chartContainer = document.getElementById('allHotelsRevenueContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] AllHotelsRevenue chart container not found');
                                resolve();
                                return;
                            }
                            const chart = echarts.init(chartContainer);
                            
                            // Use the options passed from frontend
                            const options = allHotelsRevenueChartOptions;
                            
                            chart.setOption(options);
                            chart.resize();
                            
                            const chartTimeout = setTimeout(() => {
                                console.log('[${requestId}] AllHotelsRevenue chart rendering timeout');
                                resolve();
                            }, 5000);
                            
                            chart.on('finished', () => {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] AllHotelsRevenue chart finished rendering');
                                setTimeout(resolve, 100);
                            });
                        });

                        const initAllHotelsOccupancyChart = () => new Promise((resolve) => {
                            console.log('[${requestId}] Initializing AllHotelsOccupancy chart');
                            const chartContainer = document.getElementById('allHotelsOccupancyContainer');
                            if (!chartContainer) {
                                console.log('[${requestId}] AllHotelsOccupancy chart container not found');
                                resolve();
                                return;
                            }
                            const chart = echarts.init(chartContainer);
                            
                            const occupancyData = chartData.allHotelsOccupancyData;
                            const hotels = [...new Set(occupancyData.map(d => d.hotel_name))].sort();
                            
                            const options = {
                                animation: false,
                                tooltip: {
                                    trigger: 'axis',
                                    axisPointer: { type: 'cross' }
                                },
                                legend: { 
                                    data: ['計画販売室数', '実績販売室数', '計画稼働率 (%)', '実績稼働率 (%)'], 
                                    top: 'bottom' 
                                },
                                grid: { containLabel: true, left: '3%', right: '4%', bottom: '15%' },
                                xAxis: { type: 'category', data: hotels, boundaryGap: true },
                                yAxis: [
                                    { type: 'value', name: '販売室数', position: 'left' },
                                    { type: 'value', name: '稼働率', position: 'right', max: 100 }
                                ],
                                series: [
                                    {
                                        name: '計画販売室数',
                                        type: 'bar',
                                        yAxisIndex: 0,
                                        data: hotels.map(h => occupancyData.find(d => d.hotel_name === h)?.fc_sold_rooms || 0),
                                        itemStyle: { color: '#3498db' }
                                    },
                                    {
                                        name: '実績販売室数',
                                        type: 'bar',
                                        yAxisIndex: 0,
                                        data: hotels.map(h => occupancyData.find(d => d.hotel_name === h)?.sold_rooms || 0),
                                        itemStyle: { color: '#2ecc71' }
                                    },
                                    {
                                        name: '計画稼働率 (%)',
                                        type: 'line',
                                        yAxisIndex: 1,
                                        data: hotels.map(h => {
                                            const item = occupancyData.find(d => d.hotel_name === h);
                                            return item?.fc_occ ? parseFloat(item.fc_occ.toFixed(2)) : 0;
                                        }),
                                        itemStyle: { color: '#f39c12' }
                                    },
                                    {
                                        name: '実績稼働率 (%)',
                                        type: 'line',
                                        yAxisIndex: 1,
                                        data: hotels.map(h => {
                                            const item = occupancyData.find(d => d.hotel_name === h);
                                            return item?.occ ? parseFloat(item.occ.toFixed(2)) : 0;
                                        }),
                                        itemStyle: { color: '#e74c3c' }
                                    }
                                ]
                            };
                            
                            chart.setOption(options);
                            chart.resize();
                            
                            const chartTimeout = setTimeout(() => {
                                console.log('[${requestId}] AllHotelsOccupancy chart rendering timeout');
                                resolve();
                            }, 5000);
                            
                            chart.on('finished', () => {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] AllHotelsOccupancy chart finished rendering');
                                setTimeout(resolve, 100);
                            });
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
                            console.log('[${requestId}] Adding AllHotelsRevenue chart to promises');
                            promises.push(initAllHotelsRevenueChart());
                        } else {
                            console.log('[${requestId}] Skipping AllHotelsRevenue chart - no data or empty array');
                        }
                        if (chartData && chartData.allHotelsOccupancyData && chartData.allHotelsOccupancyData.length > 0) {
                            console.log('[${requestId}] Adding AllHotelsOccupancy chart to promises');
                            promises.push(initAllHotelsOccupancyChart());
                        } else {
                            console.log('[${requestId}] Skipping AllHotelsOccupancy chart - no data or empty array');
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
                    <script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3/dist/echarts.min.js"></script>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <p><strong>レポート期間:</strong> ${periodMaxDate}</p>
                    <p><strong>対象施設:</strong> ${allHotelNames}</p>
                    <p><strong>表示モード:</strong> ${selectedView === 'graph' ? 'グラフ' : 'テーブル'}</p>

                    <!-- Debug: Test element -->
                    <div id="test-element" style="background: red; height: 50px; width: 100px;">TEST</div>

                    ${kpiData ? `
                        <div class="kpi-section">
                            <h2>主要KPI（全施設合計）</h2>
                            <div class="kpi-grid">
                                <div class="kpi-card">
                                    <h3>実績 ADR</h3>
                                    <p class="kpi-value">${isNaN(kpiData.actualADR) ? 'N/A' : kpiData.actualADR.toLocaleString('ja-JP')}円</p>
                                </div>
                                <div class="kpi-card">
                                    <h3>計画 ADR</h3>
                                    <p class="kpi-value">${isNaN(kpiData.forecastADR) ? 'N/A' : kpiData.forecastADR.toLocaleString('ja-JP')}円</p>
                                </div>
                                <div class="kpi-card">
                                    <h3>実績 RevPAR</h3>
                                    <p class="kpi-value">${isNaN(kpiData.actualRevPAR) ? 'N/A' : kpiData.actualRevPAR.toLocaleString('ja-JP')}円</p>
                                </div>
                                <div class="kpi-card">
                                    <h3>計画 RevPAR</h3>
                                    <p class="kpi-value">${isNaN(kpiData.forecastRevPAR) ? 'N/A' : kpiData.forecastRevPAR.toLocaleString('ja-JP')}円</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="charts-section">
                        <h2>収益（計画×実績）</h2>
                        <div class="chart-row">
                            <div class="chart-half">
                                <h3>収益 計画 vs 実績</h3>
                                <div id="revenuePlanVsActualContainer" style="width: 400px; height: 300px; margin: 0 auto;"></div>
                            </div>
                            <div class="chart-half">
                                <h3>稼働率</h3>
                                <div id="occupancyGaugeContainer" style="width: 400px; height: 300px; margin: 0 auto;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="all-hotels-section">
                        <h2>全施設 収益＆稼働率 概要</h2>
                        <div class="chart-row">
                            <div class="chart-half">
                                <h3>施設別 売上合計（計画 vs 実績）</h3>
                                <div id="allHotelsRevenueContainer" style="width: 400px; height: 450px; margin: 0 auto;"></div>
                            </div>
                            <div class="chart-half">
                                <h3>施設別 稼働率（計画 vs 実績）</h3>
                                <div id="allHotelsOccupancyContainer" style="width: 400px; height: 450px; margin: 0 auto;"></div>
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

            if (revenueData && revenueData.length > 0) {
                htmlContent += `<div class="section-title">収益データ</div>`;
                htmlContent += `<table><thead><tr><th>ホテル名</th><th>月度</th><th>計画売上</th><th>実績売上</th></tr></thead><tbody>`;
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

        logger.debug('Launching browser', { requestId });
        browser = await chromium.launch();
        const page = await browser.newPage();
        logger.debug('Browser and page created', { requestId });

        logger.debug('Setting page content', { 
            requestId, 
            htmlContentLength: htmlContent.length,
            selectedView,
            htmlPreview: htmlContent.substring(0, 500)
        });
        await page.setContent(htmlContent, { waitUntil: 'networkidle' });
        logger.debug('Page content set, network idle reached', { requestId });

        if (selectedView === 'graph') {
            logger.debug('Waiting for charts to render', { requestId });
            
            // Listen to console messages from the page
            page.on('console', msg => {
                logger.debug(`Browser console [${msg.type()}]:`, { requestId, message: msg.text() });
            });
            
            // Listen to page errors
            page.on('pageerror', error => {
                logger.error('Page error:', { requestId, error: error.message, stack: error.stack });
            });
            
            try {
                await page.waitForSelector('body[data-charts-rendered="true"]', { timeout: 30000 });
                logger.debug('Charts rendered successfully', { requestId });
                
                // Debug: Check if images are actually loaded
                const chartInfo = await page.evaluate(() => {
                    const revenueContainer = document.getElementById('revenuePlanVsActualContainer');
                    const occupancyContainer = document.getElementById('occupancyGaugeContainer');
                    const allHotelsRevenueContainer = document.getElementById('allHotelsRevenueContainer');
                    const allHotelsOccupancyContainer = document.getElementById('allHotelsOccupancyContainer');
                    
                    // Get all elements with IDs for debugging
                    const allElementsWithIds = Array.from(document.querySelectorAll('[id]')).map(el => ({
                        id: el.id,
                        tagName: el.tagName,
                        className: el.className,
                        hasChildren: el.children.length > 0
                    }));
                    
                    // Get body content for debugging
                    const bodyHTML = document.body.innerHTML.substring(0, 1000);
                    
                    return {
                        revenueContainerExists: !!revenueContainer,
                        revenueContainerHasContent: revenueContainer ? revenueContainer.children.length > 0 : false,
                        revenueContainerInnerHTML: revenueContainer ? revenueContainer.innerHTML.substring(0, 200) : null,
                        occupancyContainerExists: !!occupancyContainer,
                        occupancyContainerHasContent: occupancyContainer ? occupancyContainer.children.length > 0 : false,
                        occupancyContainerInnerHTML: occupancyContainer ? occupancyContainer.innerHTML.substring(0, 200) : null,
                        allHotelsRevenueExists: !!allHotelsRevenueContainer,
                        allHotelsOccupancyExists: !!allHotelsOccupancyContainer,
                        allElementsWithIds: allElementsWithIds,
                        bodyHTMLPreview: bodyHTML
                    };
                });
                logger.debug('Chart status before PDF generation', { requestId, chartInfo });
                
                // Give a small delay to ensure charts are fully processed
                await page.waitForTimeout(2000);
                logger.debug('Additional delay completed', { requestId });
                
                // Final check of chart content
                const finalChartInfo = await page.evaluate(() => {
                    const revenueContainer = document.getElementById('revenuePlanVsActualContainer');
                    const occupancyContainer = document.getElementById('occupancyGaugeContainer');
                    const allHotelsRevenueContainer = document.getElementById('allHotelsRevenueContainer');
                    const allHotelsOccupancyContainer = document.getElementById('allHotelsOccupancyContainer');
                    return {
                        revenueHasCanvas: revenueContainer ? !!revenueContainer.querySelector('canvas') : false,
                        revenueCanvasCount: revenueContainer ? revenueContainer.querySelectorAll('canvas').length : 0,
                        occupancyHasCanvas: occupancyContainer ? !!occupancyContainer.querySelector('canvas') : false,
                        occupancyCanvasCount: occupancyContainer ? occupancyContainer.querySelectorAll('canvas').length : 0,
                        allHotelsRevenueHasCanvas: allHotelsRevenueContainer ? !!allHotelsRevenueContainer.querySelector('canvas') : false,
                        allHotelsOccupancyHasCanvas: allHotelsOccupancyContainer ? !!allHotelsOccupancyContainer.querySelector('canvas') : false,
                        bodyDataAttribute: document.body.getAttribute('data-charts-rendered')
                    };
                });
                logger.debug('Final chart canvas check', { requestId, finalChartInfo });
                
            } catch (error) {
                logger.debug('Chart rendering timeout, proceeding anyway', { 
                    requestId, 
                    error: error.message 
                });
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

        logger.debug('PDF generated successfully', { 
            requestId, 
            pdfSize: pdf.length 
        });
        return pdf;

    } catch (error) {
        logger.error('Error generating PDF report', {
            requestId,
            error: error.message,
            stack: error.stack,
            selectedView,
            reportType
        });
        console.error(`[${requestId}] Error generating PDF report:`, error);
        throw new Error('Failed to generate PDF report: ' + error.message);
    } finally {
        if (browser) {
            logger.debug('Closing browser', { requestId });
            await browser.close();
            logger.debug('Browser closed', { requestId });
        }
    }
};

module.exports = {
    generatePdfReport,
};
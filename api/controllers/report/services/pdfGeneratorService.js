const { chromium } = require('playwright');
const logger = require('../../../config/logger');

const generatePdfReport = async (reportType, reqBody, requestId) => {
    logger.debug('PDF generation started', {
        requestId,
        reportType,
        selectedView: reqBody.selectedView,
        hasRevenueData: !!(reqBody.revenueData && reqBody.revenueData.length > 0),
        hasOccupancyData: !!(reqBody.occupancyData && reqBody.occupancyData.length > 0),
        revenueDataLength: reqBody.revenueData?.length || 0,
        occupancyDataLength: reqBody.occupancyData?.length || 0
    });

    const { selectedView, revenueData, occupancyData, periodMaxDate, allHotelNames } = reqBody;
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

            logger.debug('Building chart generation script', { requestId });

            const chartGenerationScript = `
                document.addEventListener('DOMContentLoaded', function () {
                    console.log('[${requestId}] DOM loaded, starting chart generation');
                    
                    // Set a timeout to ensure we don't wait forever
                    const timeoutId = setTimeout(() => {
                        console.log('[${requestId}] Chart generation timeout, setting fallback attribute');
                        document.body.setAttribute('data-charts-rendered', 'true');
                    }, 15000);

                    try {
                        const revenueData = ${JSON.stringify(revenueData || [])};
                        const occupancyData = ${JSON.stringify(occupancyData || [])};
                        const isCumulative = ${isCumulative};

                        // Check if ECharts is available
                        if (typeof echarts === 'undefined') {
                            console.error('[${requestId}] ECharts library not loaded');
                            clearTimeout(timeoutId);
                            document.body.setAttribute('data-charts-rendered', 'true');
                            return;
                        }
                        console.log('[${requestId}] ECharts library loaded successfully');

                        const baseChartOptions = {
                            animation: false,
                            tooltip: { trigger: 'axis' },
                            legend: { data: [], top: 'bottom', type: 'scroll' },
                            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
                            xAxis: { type: 'category', boundaryGap: !isCumulative, data: [] },
                        };

                    const initRevenueChart = () => new Promise((resolve) => {
                        console.log('[${requestId}] Initializing revenue chart');
                        const chartContainer = document.getElementById('revenueChartContainer');
                        if (!chartContainer) {
                            console.log('[${requestId}] Revenue chart container not found');
                            resolve();
                            return;
                        }
                        const chart = echarts.init(chartContainer);
                        console.log('[${requestId}] Revenue chart initialized');

                        const options = JSON.parse(JSON.stringify(baseChartOptions));
                        options.yAxis = { type: 'value', axisLabel: { formatter: '{value} 円' } };

                        if (isCumulative) {
                            const months = [...new Set(revenueData.map(d => d.month))].sort();
                            options.xAxis.data = months;
                            const hotels = [...new Set(revenueData.map(d => d.hotel_name))];
                            const series = [];
                            hotels.forEach(hotel => {
                                series.push({
                                    name: \`\${hotel} - 計画売上\`,
                                    type: 'line',
                                    data: months.map(m => revenueData.find(d => d.month === m && d.hotel_name === hotel)?.forecast_revenue || 0)
                                }, {
                                    name: \`\${hotel} - 実績売上\`,
                                    type: 'line',
                                    data: months.map(m => revenueData.find(d => d.month === m && d.hotel_name === hotel)?.accommodation_revenue || 0)
                                });
                            });
                            options.series = series;
                            options.legend.data = series.map(s => s.name);
                        } else {
                            const hotels = [...new Set(revenueData.map(d => d.hotel_name))].sort();
                            options.xAxis.data = hotels;
                            options.series = [{
                                name: '計画売上', type: 'bar',
                                data: hotels.map(h => revenueData.find(d => d.hotel_name === h)?.forecast_revenue || 0)
                            }, {
                                name: '実績売上', type: 'bar',
                                data: hotels.map(h => revenueData.find(d => d.hotel_name === h)?.accommodation_revenue || 0)
                            }];
                            options.legend.data = ['計画売上', '実績売上'];
                        }
                        console.log('[${requestId}] Setting revenue chart options');
                        chart.setOption(options);
                        console.log('[${requestId}] Revenue chart options set, waiting for finished event');
                        
                        // Add timeout for chart rendering
                        const chartTimeout = setTimeout(() => {
                            console.log('[${requestId}] Revenue chart rendering timeout');
                            chart.dispose();
                            resolve();
                        }, 10000);
                        
                        chart.on('finished', () => {
                            try {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] Revenue chart finished rendering');
                                // Don't dispose the chart - keep it in the DOM for PDF
                                setTimeout(resolve, 100);
                            } catch (error) {
                                console.error('[${requestId}] Error in revenue chart finished handler:', error);
                                clearTimeout(chartTimeout);
                                resolve();
                            }
                        });
                    });

                    const initOccupancyChart = () => new Promise((resolve) => {
                        console.log('[${requestId}] Initializing occupancy chart');
                        const chartContainer = document.getElementById('occupancyChartContainer');
                        if (!chartContainer) {
                            console.log('[${requestId}] Occupancy chart container not found');
                            resolve();
                            return;
                        }
                        const chart = echarts.init(chartContainer);
                        console.log('[${requestId}] Occupancy chart initialized');

                        const options = JSON.parse(JSON.stringify(baseChartOptions));
                        options.yAxis = [
                            { type: 'value', name: '販売室数', axisLabel: { formatter: '{value} 室' } },
                            { type: 'value', name: '稼働率', max: 100, axisLabel: { formatter: '{value} %' } }
                        ];

                        if (isCumulative) {
                            const months = [...new Set(occupancyData.map(d => d.month))].sort();
                            options.xAxis.data = months;
                            const hotels = [...new Set(occupancyData.map(d => d.hotel_name))];
                            const series = [];
                            hotels.forEach(hotel => {
                                series.push({
                                    name: \`\${hotel} - 販売室数\`, type: 'bar', yAxisIndex: 0,
                                    data: months.map(m => occupancyData.find(d => d.month === m && d.hotel_name === hotel)?.sold_rooms || 0)
                                }, {
                                    name: \`\${hotel} - 稼働率 (%)\`, type: 'line', yAxisIndex: 1,
                                    data: months.map(m => occupancyData.find(d => d.month === m && d.hotel_name === hotel)?.occ?.toFixed(2) || 0)
                                });
                            });
                            options.series = series;
                            options.legend.data = series.map(s => s.name);
                        } else {
                            const hotels = [...new Set(occupancyData.map(d => d.hotel_name))].sort();
                            options.xAxis.data = hotels;
                            options.series = [{
                                name: '販売室数', type: 'bar', yAxisIndex: 0,
                                data: hotels.map(h => occupancyData.find(d => d.hotel_name === h)?.sold_rooms || 0)
                            }, {
                                name: '稼働率 (%)', type: 'line', yAxisIndex: 1,
                                data: hotels.map(h => occupancyData.find(d => d.hotel_name === h)?.occ?.toFixed(2) || 0)
                            }];
                            options.legend.data = ['販売室数', '稼働率 (%)'];
                        }
                        console.log('[${requestId}] Setting occupancy chart options');
                        chart.setOption(options);
                        console.log('[${requestId}] Occupancy chart options set, waiting for finished event');
                        
                        // Add timeout for chart rendering
                        const chartTimeout = setTimeout(() => {
                            console.log('[${requestId}] Occupancy chart rendering timeout');
                            chart.dispose();
                            resolve();
                        }, 10000);
                        
                        chart.on('finished', () => {
                            try {
                                clearTimeout(chartTimeout);
                                console.log('[${requestId}] Occupancy chart finished rendering');
                                // Don't dispose the chart - keep it in the DOM for PDF
                                setTimeout(resolve, 100);
                            } catch (error) {
                                console.error('[${requestId}] Error in occupancy chart finished handler:', error);
                                clearTimeout(chartTimeout);
                                resolve();
                            }
                        });
                    });

                        const promises = [];
                        console.log('[${requestId}] Checking data for chart generation', {
                            hasRevenueData: !!(revenueData && revenueData.length > 0),
                            hasOccupancyData: !!(occupancyData && occupancyData.length > 0),
                            revenueDataLength: revenueData?.length || 0,
                            occupancyDataLength: occupancyData?.length || 0
                        });
                        
                        if (revenueData && revenueData.length > 0) {
                            console.log('[${requestId}] Adding revenue chart to promises');
                            promises.push(initRevenueChart());
                        }
                        if (occupancyData && occupancyData.length > 0) {
                            console.log('[${requestId}] Adding occupancy chart to promises');
                            promises.push(initOccupancyChart());
                        }

                        console.log('[${requestId}] Total promises to wait for:', promises.length);
                        
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

            logger.debug('Building HTML content for graph view', { requestId });

            htmlContent = `
                <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: 'Noto Sans JP', sans-serif; margin: 20mm; }
                        h1 { color: #333; }
                        .section-title { margin-top: 30px; font-size: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
                        .chart-image { width: 100%; height: auto; margin-bottom: 20px; }
                    </style>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
                    <script src="https://cdn.jsdelivr.net/npm/echarts@5.3.3/dist/echarts.min.js"></script>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <p><strong>レポート期間:</strong> ${periodMaxDate}</p>
                    <p><strong>対象施設:</strong> ${allHotelNames}</p>
                    <p><strong>表示モード:</strong> ${selectedView === 'graph' ? 'グラフ' : 'テーブル'}</p>

                    ${revenueData && revenueData.length > 0 ? `
                        <div class="section-title">収益データ</div>
                        <div id="revenueChartContainer" style="width: 900px; height: 450px; margin: 0 auto;"></div>
                    ` : '<p>収益データはありません。</p>'}

                    ${occupancyData && occupancyData.length > 0 ? `
                        <div class="section-title">稼働データ</div>
                        <div id="occupancyChartContainer" style="width: 900px; height: 450px; margin: 0 auto;"></div>
                    ` : '<p>稼働データはありません。</p>'}
                    
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
            selectedView 
        });
        await page.setContent(htmlContent, { waitUntil: 'networkidle' });
        logger.debug('Page content set, network idle reached', { requestId });

        if (selectedView === 'graph') {
            logger.debug('Waiting for charts to render', { requestId });
            try {
                await page.waitForSelector('body[data-charts-rendered="true"]', { timeout: 30000 });
                logger.debug('Charts rendered successfully', { requestId });
                
                // Debug: Check if images are actually loaded
                const chartInfo = await page.evaluate(() => {
                    const revenueContainer = document.getElementById('revenueChartContainer');
                    const occupancyContainer = document.getElementById('occupancyChartContainer');
                    return {
                        revenueContainerExists: !!revenueContainer,
                        revenueContainerHasContent: revenueContainer ? revenueContainer.children.length > 0 : false,
                        revenueContainerInnerHTML: revenueContainer ? revenueContainer.innerHTML.substring(0, 200) : null,
                        occupancyContainerExists: !!occupancyContainer,
                        occupancyContainerHasContent: occupancyContainer ? occupancyContainer.children.length > 0 : false,
                        occupancyContainerInnerHTML: occupancyContainer ? occupancyContainer.innerHTML.substring(0, 200) : null
                    };
                });
                logger.debug('Chart status before PDF generation', { requestId, chartInfo });
                
                // Give a small delay to ensure images are fully processed
                await page.waitForTimeout(1000);
                logger.debug('Additional delay completed', { requestId });
                
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
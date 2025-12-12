const { chromium } = require('playwright');

const generatePdfReport = async (reportType, reqBody, requestId) => {
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

    try {
        let htmlContent = `
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

        browser = await chromium.launch();
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle' });

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

        return pdf;

    } catch (error) {
        console.error(`[${requestId}] Error generating PDF report:`, error);
        throw new Error('Failed to generate PDF report: ' + error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = {
    generatePdfReport,
};
const { generatePdfReport } = require('../controllers/report/services/pdfGeneratorService');

describe('PDF Generator Resource Management', () => {
    let mockBrowser;
    let mockPage;

    beforeEach(() => {
        // Mock browser and page objects
        mockPage = {
            setContent: jest.fn().mockResolvedValue(),
            setViewportSize: jest.fn().mockResolvedValue(),
            setDefaultTimeout: jest.fn().mockResolvedValue(),
            on: jest.fn(),
            waitForSelector: jest.fn().mockResolvedValue(),
            waitForTimeout: jest.fn().mockResolvedValue(),
            evaluate: jest.fn().mockResolvedValue({}),
            pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
            close: jest.fn().mockResolvedValue(),
            isClosed: jest.fn().mockReturnValue(false)
        };

        mockBrowser = {
            newPage: jest.fn().mockResolvedValue(mockPage),
            pages: jest.fn().mockResolvedValue([mockPage]),
            close: jest.fn().mockResolvedValue(),
            process: jest.fn().mockReturnValue({
                kill: jest.fn()
            })
        };

        // Mock chromium launch
        jest.doMock('playwright', () => ({
            chromium: {
                launch: jest.fn().mockResolvedValue(mockBrowser)
            }
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe('Browser Lifecycle Management', () => {
        it('should properly cleanup browser resources on success', async () => {
            const requestData = {
                selectedView: 'table',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123');

            expect(mockBrowser.close).toHaveBeenCalled();
            expect(mockPage.close).toHaveBeenCalled();
        });

        it('should cleanup browser resources even when PDF generation fails', async () => {
            mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

            const requestData = {
                selectedView: 'table',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await expect(
                generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123')
            ).rejects.toThrow('Failed to generate PDF report');

            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle browser close timeout gracefully', async () => {
            // Mock browser.close to timeout
            mockBrowser.close.mockImplementation(() => 
                new Promise((resolve) => setTimeout(resolve, 15000))
            );

            const requestData = {
                selectedView: 'table',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123');

            // Should attempt to force kill if close times out
            expect(mockBrowser.process().kill).toHaveBeenCalledWith('SIGKILL');
        });
    });

    describe('Timeout Handling', () => {
        it('should handle chart rendering timeout and return partial content', async () => {
            mockPage.waitForSelector.mockRejectedValue(new Error('TimeoutError: Timeout exceeded'));
            mockPage.evaluate.mockResolvedValue({
                containers: {
                    revenuePlanVsActualContainer: { canvasCount: 1, hasValidCanvas: true },
                    occupancyGaugeContainer: { canvasCount: 0, hasValidCanvas: false }
                },
                summary: { validCanvases: 1, renderingSuccess: true }
            });

            const requestData = {
                selectedView: 'graph',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: { actualADR: 10000 },
                chartData: { aggregateData: { total_forecast_revenue: 100000 } }
            };

            const result = await generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123');

            expect(result).toBeInstanceOf(Buffer);
            expect(mockPage.pdf).toHaveBeenCalled();
        });

        it('should return partial PDF on timeout during PDF generation', async () => {
            mockPage.pdf.mockRejectedValueOnce(new Error('TimeoutError: PDF generation timeout'));
            mockPage.pdf.mockResolvedValueOnce(Buffer.from('partial-pdf'));

            const requestData = {
                selectedView: 'graph',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            const result = await generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123');

            expect(result).toEqual(Buffer.from('partial-pdf'));
            expect(mockPage.pdf).toHaveBeenCalledTimes(2);
        });
    });

    describe('Resource Exhaustion Handling', () => {
        it('should implement circuit breaker on memory errors', async () => {
            mockPage.pdf.mockRejectedValue(new Error('Out of memory'));

            const requestData = {
                selectedView: 'graph',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await expect(
                generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123')
            ).rejects.toThrow('PDF generation temporarily unavailable due to resource constraints');

            expect(mockBrowser.close).toHaveBeenCalled();
        });

        it('should handle resource errors during browser launch', async () => {
            const { chromium } = require('playwright');
            chromium.launch.mockRejectedValue(new Error('Failed to launch browser: insufficient resources'));

            const requestData = {
                selectedView: 'table',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await expect(
                generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123')
            ).rejects.toThrow('Failed to generate PDF report');
        });
    });

    describe('Page Error Monitoring', () => {
        it('should set up error monitoring for pages', async () => {
            const requestData = {
                selectedView: 'table',
                periodMaxDate: '2024-01',
                allHotelNames: 'Test Hotel',
                kpiData: {},
                chartData: {}
            };

            await generatePdfReport('singleMonthSingleHotel', requestData, 'test-request-123');

            expect(mockPage.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
            expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1200, height: 800 });
            expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
        });
    });
});
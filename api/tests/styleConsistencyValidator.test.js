const StyleConsistencyValidator = require('../services/styleConsistencyValidator');

describe('StyleConsistencyValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new StyleConsistencyValidator();
    });

    describe('validateChartConfig', () => {
        it('should validate a valid chart configuration', () => {
            const validConfig = {
                series: [
                    {
                        type: 'bar',
                        name: 'Test Series',
                        data: [1, 2, 3, 4, 5]
                    }
                ],
                color: ['#3498db', '#2ecc71'],
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                tooltip: {
                    trigger: 'axis'
                }
            };

            const result = validator.validateChartConfig(validConfig, 'bar', 'test-request');

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.metrics.totalChecks).toBeGreaterThan(0);
            expect(result.metrics.passedChecks).toBeGreaterThan(0);
        });

        it('should detect missing required properties', () => {
            const invalidConfig = {
                color: ['#3498db']
                // Missing series
            };

            const result = validator.validateChartConfig(invalidConfig, 'bar', 'test-request');

            expect(result.isValid).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        code: 'REQUIRED_PROPERTY_MISSING',
                        field: 'series'
                    })
                ])
            );
        });

        it('should handle null or undefined config', () => {
            const result = validator.validateChartConfig(null, 'bar', 'test-request');

            expect(result.isValid).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        code: 'CONFIG_MISSING'
                    })
                ])
            );
        });

        it('should validate series configuration', () => {
            const configWithInvalidSeries = {
                series: 'not-an-array'
            };

            const result = validator.validateChartConfig(configWithInvalidSeries, 'bar', 'test-request');

            expect(result.isValid).toBe(false);
            expect(result.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        code: 'SERIES_INVALID_TYPE'
                    })
                ])
            );
        });

        it('should validate color configuration', () => {
            const configWithValidColors = {
                series: [{ type: 'bar', data: [1, 2, 3] }],
                color: ['#ff0000', '#00ff00', 'rgb(0, 0, 255)', 'red']
            };

            const result = validator.validateChartConfig(configWithValidColors, 'bar', 'test-request');

            expect(result.isValid).toBe(true);
            expect(result.warnings.filter(w => w.code === 'COLOR_INVALID_VALUE')).toHaveLength(0);
        });

        it('should detect invalid color values', () => {
            const configWithInvalidColors = {
                series: [{ type: 'bar', data: [1, 2, 3] }],
                color: ['#ff0000', 'invalid-color', 123]
            };

            const result = validator.validateChartConfig(configWithInvalidColors, 'bar', 'test-request');

            expect(result.warnings.filter(w => w.code === 'COLOR_INVALID_VALUE')).toHaveLength(2);
        });
    });

    describe('compareConfigs', () => {
        it('should detect identical configurations', () => {
            const config1 = {
                series: [{ type: 'bar', data: [1, 2, 3] }],
                color: ['#ff0000', '#00ff00'],
                grid: { left: '3%' }
            };
            const config2 = {
                series: [{ type: 'bar', data: [1, 2, 3] }],
                color: ['#ff0000', '#00ff00'],
                grid: { left: '3%' }
            };

            const result = validator.compareConfigs(config1, config2, 'bar', 'test-request');

            expect(result.isConsistent).toBe(true);
            expect(result.consistencyScore).toBe(1);
            expect(result.differences).toHaveLength(0);
        });

        it('should detect differences in configurations', () => {
            const webConfig = {
                series: [{ type: 'bar', data: [1, 2, 3] }],
                color: ['#ff0000', '#00ff00']
            };
            const pdfConfig = {
                series: [{ type: 'line', data: [1, 2, 3] }],
                color: ['#ff0000', '#0000ff']
            };

            const result = validator.compareConfigs(webConfig, pdfConfig, 'bar', 'test-request');

            expect(result.isConsistent).toBe(false);
            expect(result.differences.length).toBeGreaterThan(0);
            expect(result.consistencyScore).toBeLessThan(1);
        });

        it('should handle null configurations', () => {
            const result = validator.compareConfigs(null, null, 'bar', 'test-request');

            expect(result.isConsistent).toBe(true);
            expect(result.similarities).toContain('type');
        });
    });

    describe('validateCanvasContent', () => {
        it('should validate valid canvas content', () => {
            const validContainerInfo = {
                exists: true,
                canvasCount: 2,
                hasValidCanvas: true,
                dimensions: {
                    width: 400,
                    height: 300
                }
            };

            const result = validator.validateCanvasContent(validContainerInfo, 'bar', 'test-request');

            expect(result.isValid).toBe(true);
            expect(result.hasCanvas).toBe(true);
            expect(result.hasContent).toBe(true);
            expect(result.canvasCount).toBe(2);
        });

        it('should detect missing canvas content', () => {
            const invalidContainerInfo = {
                exists: true,
                canvasCount: 0,
                hasValidCanvas: false,
                dimensions: {
                    width: 0,
                    height: 0
                }
            };

            const result = validator.validateCanvasContent(invalidContainerInfo, 'bar', 'test-request');

            expect(result.isValid).toBe(false);
            expect(result.hasCanvas).toBe(false);
            expect(result.hasContent).toBe(false);
        });
    });

    describe('validateMultipleCharts', () => {
        it('should validate multiple chart configurations', () => {
            const chartConfigs = {
                revenuePlanVsActual: {
                    series: [{ type: 'bar', data: [1, 2, 3] }]
                },
                occupancyGauge: {
                    series: [{ type: 'gauge', data: [{ value: 75 }] }]
                }
            };

            const result = validator.validateMultipleCharts(chartConfigs, 'test-request');

            expect(result.summary.totalCharts).toBe(2);
            expect(result.summary.validCharts).toBe(2);
            expect(result.summary.invalidCharts).toBe(0);
            expect(result.summary.overallValid).toBe(true);
        });

        it('should handle invalid chart configurations', () => {
            const chartConfigs = {
                validChart: {
                    series: [{ type: 'bar', data: [1, 2, 3] }]
                },
                invalidChart: {
                    // Missing series
                }
            };

            const result = validator.validateMultipleCharts(chartConfigs, 'test-request');

            expect(result.summary.totalCharts).toBe(2);
            expect(result.summary.validCharts).toBe(1);
            expect(result.summary.invalidCharts).toBe(1);
            expect(result.summary.overallValid).toBe(false);
        });
    });

    describe('helper methods', () => {
        describe('isValidColor', () => {
            it('should validate hex colors', () => {
                expect(validator.isValidColor('#ff0000')).toBe(true);
                expect(validator.isValidColor('#f00')).toBe(true);
                expect(validator.isValidColor('#gg0000')).toBe(false);
            });

            it('should validate rgb/rgba colors', () => {
                expect(validator.isValidColor('rgb(255, 0, 0)')).toBe(true);
                expect(validator.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
                expect(validator.isValidColor('rgb(300, 0, 0)')).toBe(true); // Still valid format
            });

            it('should validate named colors', () => {
                expect(validator.isValidColor('red')).toBe(true);
                expect(validator.isValidColor('blue')).toBe(true);
                expect(validator.isValidColor('invalidcolor')).toBe(false);
            });
        });

        describe('compareArrays', () => {
            it('should compare arrays correctly', () => {
                expect(validator.compareArrays([1, 2, 3], [1, 2, 3])).toBe(true);
                expect(validator.compareArrays([1, 2, 3], [1, 2, 4])).toBe(false);
                expect(validator.compareArrays([], [])).toBe(true);
                expect(validator.compareArrays(null, null)).toBe(true);
            });
        });

        describe('compareObjects', () => {
            it('should compare objects correctly', () => {
                const obj1 = { a: 1, b: { c: 2 } };
                const obj2 = { a: 1, b: { c: 2 } };
                const obj3 = { a: 1, b: { c: 3 } };

                expect(validator.compareObjects(obj1, obj2)).toBe(true);
                expect(validator.compareObjects(obj1, obj3)).toBe(false);
                expect(validator.compareObjects(null, null)).toBe(true);
            });
        });
    });
});
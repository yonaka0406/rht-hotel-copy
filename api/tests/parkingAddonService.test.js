const ParkingAddonService = require('../services/parkingAddonService');
const parkingModel = require('../models/parking');

// Mock the parking model
jest.mock('../models/parking');

describe('ParkingAddonService', () => {
    let service;
    const mockRequestId = 'test-request-id';

    beforeEach(() => {
        service = new ParkingAddonService(mockRequestId);
        jest.clearAllMocks();
    });

    describe('calculateCapacityUnits', () => {
        it('should return capacity units for valid vehicle category', async () => {
            const mockCategories = [
                { id: 1, name: '普通乗用車', capacity_units_required: 100 },
                { id: 2, name: '軽自動車', capacity_units_required: 60 }
            ];
            parkingModel.getVehicleCategories.mockResolvedValue(mockCategories);

            const result = await service.calculateCapacityUnits(1);
            expect(result).toBe(100);
            expect(parkingModel.getVehicleCategories).toHaveBeenCalledWith(mockRequestId);
        });

        it('should throw error for invalid vehicle category', async () => {
            const mockCategories = [
                { id: 1, name: '普通乗用車', capacity_units_required: 100 }
            ];
            parkingModel.getVehicleCategories.mockResolvedValue(mockCategories);

            await expect(service.calculateCapacityUnits(999)).rejects.toThrow('Failed to calculate capacity units: Vehicle category not found');
        });
    });

    describe('checkParkingVacancies', () => {
        it('should return available spots count for valid parameters', async () => {
            parkingModel.checkParkingVacancies.mockResolvedValue(5);

            const result = await service.checkParkingVacancies(1, ['2024-01-01', '2024-01-02'], 1);
            expect(result).toBe(5);
            expect(parkingModel.checkParkingVacancies).toHaveBeenCalledWith(
                mockRequestId, 1, '2024-01-01', '2024-01-03', 1
            );
        });

        it('should throw error for empty date range', async () => {
            await expect(service.checkParkingVacancies(1, [], 1)).rejects.toThrow('Failed to check parking vacancies: Date range is required');
        });
    });

    describe('getCompatibleSpots', () => {
        it('should return spots that meet capacity requirements', async () => {
            const mockSpots = [
                { id: 1, capacity_units: 100, is_active: true },
                { id: 2, capacity_units: 60, is_active: true },
                { id: 3, capacity_units: 120, is_active: false }
            ];
            parkingModel.getAllParkingSpotsByHotel.mockResolvedValue(mockSpots);

            const result = await service.getCompatibleSpots(1, 80);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('validateSpotCapacity', () => {
        it('should return true for compatible spot', async () => {
            const mockSpots = [
                { id: 1, capacity_units: 100 },
                { id: 2, capacity_units: 60 }
            ];
            parkingModel.getAllParkingSpotsByHotel.mockResolvedValue(mockSpots);

            const result = await service.validateSpotCapacity(1, 80);
            expect(result).toBe(true);
        });

        it('should return false for incompatible spot', async () => {
            const mockSpots = [
                { id: 1, capacity_units: 100 },
                { id: 2, capacity_units: 60 }
            ];
            parkingModel.getAllParkingSpotsByHotel.mockResolvedValue(mockSpots);

            const result = await service.validateSpotCapacity(2, 80);
            expect(result).toBe(false);
        });

        it('should throw error for non-existent spot', async () => {
            const mockSpots = [
                { id: 1, capacity_units: 100 }
            ];
            parkingModel.getAllParkingSpotsByHotel.mockResolvedValue(mockSpots);

            await expect(service.validateSpotCapacity(999, 80)).rejects.toThrow('Failed to validate spot capacity: Parking spot not found');
        });
    });

    describe('checkVehicleCategoryCompatibility', () => {
        it('should return compatibility information', async () => {
            const mockCompatibility = {
                capacity_units: 100,
                capacity_units_required: 80,
                is_compatible: true
            };
            parkingModel.validateSpotCapacity.mockResolvedValue(mockCompatibility);

            const result = await service.checkVehicleCategoryCompatibility(1, 1);
            expect(result).toEqual(mockCompatibility);
            expect(parkingModel.validateSpotCapacity).toHaveBeenCalledWith(mockRequestId, 1, 1);
        });
    });

    describe('getVehicleCategories', () => {
        it('should return all vehicle categories', async () => {
            const mockCategories = [
                { id: 1, name: '普通乗用車', capacity_units_required: 100 },
                { id: 2, name: '軽自動車', capacity_units_required: 60 }
            ];
            parkingModel.getVehicleCategories.mockResolvedValue(mockCategories);

            const result = await service.getVehicleCategories();
            expect(result).toEqual(mockCategories);
            expect(parkingModel.getVehicleCategories).toHaveBeenCalledWith(mockRequestId);
        });
    });
});
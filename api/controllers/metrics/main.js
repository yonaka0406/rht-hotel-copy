const metricsModels = require('../models/metrics');

const getReservationsToday = async (req, res) => {
    const { hotelId, date } = req.params;    
    try {
        const metric = await metricsModels.selectReservationsToday(req.requestId, hotelId, date);

        return res.status(200).json(metric);
    } catch (error) {
      console.error('Error getting reservation count:', error);
      res.status(500).json({ error: error.message });
    }
};

const getBookingAverageLeadTime = async (req, res) => {
    const { hotelId, lookback, date } = req.params;       

    try {
        const metric = await metricsModels.selectBookingAverageLeadTime(req.requestId, hotelId, lookback, date);
        return res.status(200).json(metric);
    } catch (error) {
      console.error('Error getting lead time:', error);
      res.status(500).json({ error: error.message });
    }
};
const getArrivalAverageLeadTime = async (req, res) => {
    const { hotelId, lookback, date } = req.params;   

    try {
        const metric = await metricsModels.selectArrivalAverageLeadTime(req.requestId, hotelId, lookback, date);
        return res.status(200).json(metric);
    } catch (error) {
      console.error('Error getting lead time:', error);
      res.status(500).json({ error: error.message });
    }
};

const getWaitlistEntriesToday = async (req, res) => {
    const { hotelId, date } = req.params;   
    try {
        const metric = await metricsModels.selectWaitlistEntriesToday(req.requestId, hotelId, date);
        return res.status(200).json(metric);
    } catch (error) {
      console.error('Error getting waitlist entries count:', error);
      res.status(500).json({ error: error.message });
    }
};

const fetchBookingSourceBreakdown = async (req, res) => {
    const { hotelId, startDate, endDate } = req.query;
    try {
        const data = await metricsModels.getBookingSourceBreakdown(req.requestId, hotelId, startDate, endDate);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchPaymentTimingBreakdown = async (req, res) => {
    const { hotelId, startDate, endDate } = req.query;
    try {
        const data = await metricsModels.getPaymentTimingBreakdown(req.requestId, hotelId, startDate, endDate);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const fetchBookerTypeBreakdown = async (req, res) => {
    const { hotelId, startDate, endDate } = req.query;
    try {
        const data = await metricsModels.getBookerTypeBreakdown(req.requestId, hotelId, startDate, endDate);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getReservationsToday,
    getBookingAverageLeadTime,
    getArrivalAverageLeadTime,
    getWaitlistEntriesToday,
    fetchBookingSourceBreakdown,
    fetchPaymentTimingBreakdown,
    fetchBookerTypeBreakdown, // Export the new controller function
};

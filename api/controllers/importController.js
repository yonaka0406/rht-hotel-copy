const { insertYadomasterClients, insertYadomasterReservations, insertYadomasterDetails, insertYadomasterPayments, insertYadomasterAddons } = require('../models/import');

const addYadomasterClients = async (req, res) => {
    const { data } = req.body;

    try {
        await insertYadomasterClients(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterReservations = async (req, res) => {
    const { data } = req.body;

    try {
        await insertYadomasterReservations(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterDetails = async (req, res) => {
    const { data } = req.body;

    try {
        await insertYadomasterDetails(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterPayments = async (req, res) => {
    const { data } = req.body;

    try {
        await insertYadomasterPayments(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterAddons = async (req, res) => {
    const { data } = req.body;

    try {
        await insertYadomasterAddons(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

module.exports = {
    addYadomasterClients,
    addYadomasterReservations,
    addYadomasterDetails,
    addYadomasterPayments,
    addYadomasterAddons
};
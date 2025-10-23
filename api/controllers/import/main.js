const { insertYadomasterClients, insertYadomasterReservations, insertYadomasterDetails, insertYadomasterPayments, insertYadomasterAddons, insertYadomasterRates, insertForecastData, insertAccountingData, getPrefilledData } = require('../../models/import');
const { getAllHotels } = require('../../models/hotel');
const { getAllGlobalPlans } = require('../../models/plan');
const validationUtils = require('../../utils/validationUtils');
const csvGenerator = require('./services/csvGenerator');
const { format } = require('fast-csv');

async function getPrefilledTemplate(req, res) {
  try {
    const { type, month1, month2 } = req.query;

    // Validate parameters
    const validatedType = validationUtils.validateNonEmptyStringParam(type, 'Template type');
    const allowedTypes = ['forecast', 'accounting'];
    if (!allowedTypes.includes(validatedType)) {
      return res.status(400).json({ message: `Invalid template type specified. Only ${allowedTypes.join(' or ')} are supported.` });
    }

    const validatedMonth1 = validationUtils.validateDateStringParam(month1, 'Month 1');
    if (!validatedMonth1) {
      return res.status(400).json({ message: 'Invalid Month 1 format. Must be YYYY-MM-DD.' });
    }

    const validatedMonth2 = validationUtils.validateDateStringParam(month2, 'Month 2');
    if (!validatedMonth2) {
      return res.status(400).json({ message: 'Invalid Month 2 format. Must be YYYY-MM-DD.' });
    }

    let csvContent;
    let filename;

    // Fetch prefilled data from the database
    const prefilledData = await getPrefilledData(req.requestId, validatedType, validatedMonth1, validatedMonth2);
    const hotels = await getAllHotels(req.requestId);
    const plans = await getAllGlobalPlans(req.requestId);

    if (validatedType === 'forecast') {
      csvContent = await csvGenerator.generateForecastCsv(validatedMonth1, validatedMonth2, prefilledData, hotels, plans);
      filename = `forecast_template_${validatedMonth1}_to_${validatedMonth2}.csv`;
    } else if (validatedType === 'accounting') {
      csvContent = await csvGenerator.generateAccountingCsv(validatedMonth1, validatedMonth2, prefilledData, hotels, plans);
      filename = `accounting_template_${validatedMonth1}_to_${validatedMonth2}.csv`;
    }

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating pre-filled template:', error);
    res.status(500).json({ message: 'Error generating pre-filled template', error: error.message });
  }
}

const addYadomasterClients = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterClients(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterReservations = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterReservations(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterDetails = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterDetails(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterPayments = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterPayments(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterAddons = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterAddons(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addYadomasterRates = async (req, res) => {
    const data = req.body;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        await insertYadomasterRates(req.requestId, data);
        res.json({ message: 'Yadomaster data added.' });
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};

const addForecastData = async (req, res) => {
    const data = req.body;
    const user_id = req.user.id;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const result = await insertForecastData(req.requestId, data, user_id);
        res.json( result );
    } catch (err) {
        console.error('Error adding data:', err);
        res.status(500).json({ error: 'Failed to add imported data' });
    }
};
const addAccountingData = async (req, res) => {
    const data = req.body;
    const user_id = req.user.id;

    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
        const result = await insertAccountingData(req.requestId, data, user_id);
        res.json( result );
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
    addYadomasterAddons,
    addYadomasterRates,
    addForecastData,
    addAccountingData,
    getPrefilledTemplate
};
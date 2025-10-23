const { insertYadomasterClients, insertYadomasterReservations, insertYadomasterDetails, insertYadomasterPayments, insertYadomasterAddons, insertYadomasterRates, insertForecastData, insertAccountingData, getPrefilledData } = require('../models/import');
const validationUtils = require('../utils/validationUtils');
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

    if (validatedType === 'forecast') {
      csvContent = await csvGenerator.generateForecastCsv(validatedMonth1, validatedMonth2);
      filename = `forecast_template_${validatedMonth1}_to_${validatedMonth2}.csv`;
    } else if (validatedType === 'accounting') {
      csvContent = await csvGenerator.generateAccountingCsv(validatedMonth1, validatedMonth2);
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

const generateForecastCsv = async (month1, month2) => {
  const startDate = new Date(month1);
  const endDate = new Date(month2);
  const data = [];

  // Add header row
  data.push(['Date', 'RoomType', 'BookedRooms', 'AvailableRooms', 'Revenue']);

  // Generate dummy data for each day between month1 and month2
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split('T')[0];
    data.push([date, 'Single', Math.floor(Math.random() * 10) + 5, Math.floor(Math.random() * 5) + 10, (Math.random() * 500 + 100).toFixed(2)]);
    data.push([date, 'Double', Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 5) + 12, (Math.random() * 700 + 150).toFixed(2)]);
  }

  return new Promise((resolve, reject) => {
    const csvStream = format({ headers: false });
    let csvString = '';

    csvStream.on('data', chunk => (csvString += chunk.toString()));
    csvStream.on('end', () => resolve(csvString));
    csvStream.on('error', err => reject(err));

    data.forEach(row => csvStream.write(row));
    csvStream.end();
  });
};

const generateAccountingCsv = async (month1, month2) => {
  const startDate = new Date(month1);
  const endDate = new Date(month2);
  const data = [];

  // Add header row
  data.push(['Date', 'Category', 'Description', 'Amount']);

  // Generate dummy data for each day between month1 and month2
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split('T')[0];
    data.push([date, 'Income', 'Room Revenue', (Math.random() * 1000 + 500).toFixed(2)]);
    data.push([date, 'Expense', 'Utilities', (Math.random() * 100 + 50).toFixed(2)]);
    data.push([date, 'Expense', 'Salaries', (Math.random() * 500 + 200).toFixed(2)]);
  }

  return new Promise((resolve, reject) => {
    const csvStream = format({ headers: false });
    let csvString = '';

    csvStream.on('data', chunk => (csvString += chunk.toString()));
    csvStream.on('end', () => resolve(csvString));
    csvStream.on('error', err => reject(err));

    data.forEach(row => csvStream.write(row));
    csvStream.end();
  });
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
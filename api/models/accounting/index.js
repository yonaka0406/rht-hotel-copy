const read = require('./read');
const write = require('./write');
const integrity = require('./integrity');
const receivables = require('./receivables');
const entries = require('./entries');
const tables = require('./tables');
const budgetActual = require('./budgetActual');
const utilityDetails = require('./utilityDetails');

module.exports = {
    accountingRead: read,
    accountingWrite: write,
    integrity,
    receivables: receivables,
    forecastEntries: entries,
    operationalTables: tables,
    budgetActual,
    utilityDetails
};
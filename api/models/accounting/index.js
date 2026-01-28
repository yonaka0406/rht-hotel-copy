const read = require('./read');
const write = require('./write');
const receivables = require('./receivables');
const entries = require('./entries');
const tables = require('./tables');

module.exports = {
    accountingRead: read,
    accountingWrite: write,
    receivables: receivables,
    forecastEntries: entries,
    operationalTables: tables
};
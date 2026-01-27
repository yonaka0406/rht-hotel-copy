const read = require('./read');
const write = require('./write');
const receivables = require('./receivables');
const entries = require('./entries');
const tables = require('./tables');

module.exports = {
    ...read,
    ...write,
    ...receivables,
    ...entries,
    ...tables
};
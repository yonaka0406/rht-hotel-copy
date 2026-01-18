const read = require('./read');
const write = require('./write');
const receivables = require('./receivables');

module.exports = {
    ...read,
    ...write,
    ...receivables
};
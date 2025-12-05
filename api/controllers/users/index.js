const read = require('./read');
const write = require('./write');
const calendar = require('./calendar');

module.exports = {
    ...read,
    ...write,
    ...calendar
};

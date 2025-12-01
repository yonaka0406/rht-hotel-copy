const mainQueries = require('./main');
const receiptsQueries = require('./receipts');


module.exports = {
    ...mainQueries,
    ...receiptsQueries,
};
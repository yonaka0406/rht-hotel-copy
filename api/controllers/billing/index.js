const mainController = require('./main');
const receiptsController = require('./receipts');

module.exports = {
    ...mainController,
    ...receiptsController,
};

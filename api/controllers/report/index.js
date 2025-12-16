const main = require('./main');
const exportController = require('./export');
const batch = require('./batch');

module.exports = {
  ...main,
  ...exportController,
  ...batch,
  ...require('./daily')
}
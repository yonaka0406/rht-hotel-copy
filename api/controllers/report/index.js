const main = require('./main');
const exportController = require('./export');
const batch = require('./batch');
const crm = require('./crm');

module.exports = {
  ...main,
  ...exportController,
  ...batch,
  ...crm,
  ...require('./daily')
}
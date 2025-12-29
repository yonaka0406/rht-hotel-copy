const main = require('./main');
const exportController = require('./export');
const batch = require('./batch');
const crm = require('./crm');
const daily = require('./daily');

module.exports = {
  ...main,
  ...exportController,
  ...batch,
  ...crm,
  ...daily
}
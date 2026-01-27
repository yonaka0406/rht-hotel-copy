const exportController = require('./export');
const profitLoss = require('./profitLoss');
const dashboard = require('./dashboard');
const settings = require('./settings');
const importController = require('./import');
const receivables = require('./receivables');

module.exports = {
    ...exportController,
    ...profitLoss,
    ...dashboard,
    ...settings,
    ...importController,
    ...receivables
};
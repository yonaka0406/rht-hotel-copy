const exportController = require('./export');
const profitLoss = require('./profitLoss');
const dashboard = require('./dashboard');
const settings = require('./settings');
const importController = require('./import');
const receivablesController = require('./receivables');
const analytics = require('./analytics');

module.exports = {
    ...exportController,
    ...profitLoss,
    ...analytics,
    ...dashboard,
    ...settings,
    ...importController,
    ...receivablesController
};
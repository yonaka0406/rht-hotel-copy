const settings = require('./settings');
const exportCtrl = require('./export');
const dashboard = require('./dashboard');
const importCtrl = require('./import');
const profitLoss = require('./profitLoss');
const receivables = require('./receivables');
const analytics = require('./analytics');

module.exports = {
    ...settings,
    ...exportCtrl,
    ...dashboard,
    ...importCtrl,
    ...profitLoss,
    ...receivables,
    ...analytics
};
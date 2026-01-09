const settings = require('./settings');
const exportCtrl = require('./export');

module.exports = {
    ...settings,
    ...exportCtrl
};

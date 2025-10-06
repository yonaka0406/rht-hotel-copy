const main = require('./main');
const roomTypes = require('./roomTypes');
const rooms = require('./rooms');
const calendar = require('./calendar');
const siteController = require('./siteController');
const planExclusions = require('./planExclusions');
const roomAssignment = require('./roomAssignment');

module.exports = {
  ...main,
  ...roomTypes,
  ...rooms,
  ...calendar,
  ...siteController,
  ...planExclusions,
  ...roomAssignment,
};

const main = require('./main');
const vehicle = require('./vehicle');
const parkingLot = require('./parkingLot');
const capacity = require('./capacity');

module.exports = {
  ...main,
  ...vehicle,
  ...parkingLot,
  ...capacity,
};

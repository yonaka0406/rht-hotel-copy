const main = require('./main');
const vehicle = require('./vehicle');
const parkingLot = require('./parkingLot');

module.exports = {
  ...main,
  ...vehicle,
  ...parkingLot,
};

const main = require('./main');
const roomTypes = require('./roomTypes');
const rooms = require('./rooms');
const calendar = require('./calendar');
const planning = require('./planning');

module.exports = {
  ...main,
  ...roomTypes,
  ...rooms,
  ...calendar,
  ...planning
};
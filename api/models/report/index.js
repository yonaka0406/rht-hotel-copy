const main = require('./main');
const exportQueries = require('./export');
const forecastQueries = require('./forecast');
const googleQueries = require('./google');

module.exports = {
  ...main,
  ...exportQueries,
  ...forecastQueries,
  ...googleQueries,
};

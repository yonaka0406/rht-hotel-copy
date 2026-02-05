const main = require('./main');
const exportQueries = require('./export');
const forecastQueries = require('./forecast');
const googleQueries = require('./google');
const occupationQueries = require('./occupation');
const dailyQueries = require('./daily');
const accountingQueries = require('./accounting');

module.exports = {
  ...main,
  ...exportQueries,
  ...forecastQueries,
  ...googleQueries,
  ...occupationQueries,
  ...dailyQueries,
  ...accountingQueries,
};

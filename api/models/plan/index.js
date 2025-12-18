const mainQueries = require('./main');
const categoriesQueries = require('./categories');
const copyQueries = require('./copy');
const patternQueries = require('./pattern');

module.exports = {
  ...mainQueries,
  ...categoriesQueries,
  ...copyQueries,
  ...patternQueries
};
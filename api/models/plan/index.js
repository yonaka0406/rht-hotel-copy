const mainQueries = require('./main');
const categoriesQueries = require('./categories');
const copyQueries = require('./copy');
const globalQueries = require('./global');
const patternQueries = require('./pattern');

module.exports = {
    ...mainQueries,
    ...categoriesQueries,
    ...copyQueries,
    ...globalQueries,
    ...patternQueries
};
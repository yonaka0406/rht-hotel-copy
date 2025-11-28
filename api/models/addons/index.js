const mainModels = require('./main');
const writeModels = require('./write');

module.exports = {
  ...mainModels,
  ...writeModels  
};
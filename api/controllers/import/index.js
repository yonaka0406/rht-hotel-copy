const importController = require('./main');
const financesController = require('./finances');

module.exports = {
  ...importController,
  ...financesController
};
const { selectUserActions, selectAllActions } = require('../models/crm');

const fetchUserActions = async (req, res) => {
  const { id } = req.params;
    
  try{
    const result = await selectUserActions(req.requestId, id);
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting user actions:', error);
    res.status(500).json({ error: error.message });
  }
};
const fetchAllActions = async (req, res) => {
  try{
    const result = await selectAllActions(req.requestId);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting all actions:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { fetchUserActions, fetchAllActions };
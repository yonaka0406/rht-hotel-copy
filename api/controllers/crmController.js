const { selectUserActions, selectClientActions, selectAllActions, insertAction, updateAction, deleteAction } = require('../models/crm');

const fetchUserActions = async (req, res) => {
  const { uid } = req.params;
    
  try{
    const result = await selectUserActions(req.requestId, uid);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error getting user actions:', error);
    res.status(500).json({ error: error.message });
  }
};
const fetchClientActions = async (req, res) => {
  const { cid } = req.params;
    
  try{
    const result = await selectClientActions(req.requestId, cid);    
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

const addAction = async (req, res) => {
  const { actionFields } = req.body;
  const userId = req.user.id;
  try{
    const result = await insertAction(req.requestId, actionFields, userId);    
    res.status(200).json( result );
  } catch (error) {
    console.error('Error adding action:', error);
    res.status(500).json({ error: error.message });
  }
};

const editAction = async (req, res) => {
  const { actionFields } = req.body;
  const { id: actionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await updateAction(req.requestId, actionId, actionFields, userId);
    if (!result) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error editing action:', error);
    res.status(500).json({ error: error.message });
  }
};

const removeAction = async (req, res) => {
  const { id: actionId } = req.params;

  try {
    const result = await deleteAction(req.requestId, actionId);
    if (!result) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error removing action:', error);
    res.status(500).json({ error: error.message });
  }
};



module.exports = { fetchUserActions, fetchClientActions, fetchAllActions, addAction, editAction, removeAction };
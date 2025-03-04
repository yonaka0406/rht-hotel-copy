const { selectPaymentTypes, insertPaymentType } = require('../models/settings');

const getPaymentTypes = async (req, res) => {
  try {
    const data = await selectPaymentTypes();    
    if (!data) {
      return res.status(401).json({ error: 'Data not found' });
    }    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addPaymentType = async (req, res) => {
  const { newData } = req.body;
  const user_id = req.user.id;  
  
  try {
    const user = await insertPaymentType(newData, user_id);
    res.status(201).json({ 
      message: 'Payment type registered successfully',      
     });
  } catch (err) {    
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const setPaymentTypes = async (req, res) => {
  const { id, name, status_id, role_id } = req.body;
  const updated_by = req.user.id;

  // Validate that all required fields are provided
  if (!id || !status_id || !role_id) {
    return res.status(400).json({ error: 'User ID, status ID, and role ID are required' });
  }

  try {
    const user = await updateUserInfo(id, name, status_id, role_id, updated_by);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Successfully updated the user
    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { 
  getPaymentTypes, 
  addPaymentType, 
  setPaymentTypes,   
};
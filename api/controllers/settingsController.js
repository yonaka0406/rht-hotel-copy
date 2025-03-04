const { selectPaymentTypes, insertPaymentType, updatePaymentTypeVisibility, updatePaymentTypeDescription } = require('../models/settings');

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

const changePaymentTypeVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updatePaymentTypeVisibility(id, visible, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePaymentTypeDescription = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updatePaymentTypeDescription(id, description, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { 
  getPaymentTypes, 
  addPaymentType, 
  changePaymentTypeVisibility,
  changePaymentTypeDescription, 
};
const { selectPaymentTypes, insertPaymentType, updatePaymentTypeVisibility, updatePaymentTypeDescription,
  selectTaxTypes, insertTaxType, updateTaxTypeVisibility, updateTaxTypeDescription
 } = require('../models/settings');

const getPaymentTypes = async (req, res) => {
  try {
    const data = await selectPaymentTypes(req.requestId);    
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
    const user = await insertPaymentType(req.requestId, newData, user_id);
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
    const data = await updatePaymentTypeVisibility(req.requestId, id, visible, user_id);
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
    const data = await updatePaymentTypeDescription(req.requestId, id, description, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getTaxTypes = async (req, res) => {
  try {
    const data = await selectTaxTypes(req.requestId);    
    if (!data) {
      return res.status(401).json({ error: 'Data not found' });
    }    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const addTaxType = async (req, res) => {
  const { newData } = req.body;
  const user_id = req.user.id;  
  
  try {
    const user = await insertTaxType(req.requestId, newData, user_id);
    res.status(201).json({ 
      message: 'Tax type registered successfully',      
     });
  } catch (err) {    
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changeTaxTypeVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updateTaxTypeVisibility(req.requestId, id, visible, user_id);
    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }        
    res.status(200).json({ message: 'Data updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const changeTaxTypeDescription = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  const user_id = req.user.id;

  try {
    const data = await updateTaxTypeDescription(req.requestId, id, description, user_id);
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
  getTaxTypes, 
  addTaxType, 
  changeTaxTypeVisibility,
  changeTaxTypeDescription, 
};
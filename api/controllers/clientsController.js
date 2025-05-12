const { processNameString, getAllClients, selectClient, selectGroup, selectCustomerID, selectClientGroups, getTotalClientsCount, addClientByName, addNewClient, addNewAddress, addClientGroup, editClient, editClientFull, editAddress, editClientGroup, editGroup, selectClientReservations, deleteClient, deleteAddress } = require('../models/clients');
const { updateClientInReservation } = require('../models/reservations');

// GET
const getClients = async (req, res) => {
  const { page } = req.params;
  const limit = 5000;
  const offset = (page - 1) * limit;

  try {
    const clients = await getAllClients(req.requestId, limit, offset);
    const totalClients = await getTotalClientsCount(req.requestId);
    res.status(200).json({
      clients,
      total: totalClients,
      page: parseInt(page),
      totalPages: Math.ceil(totalClients / limit),
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: error.message });
  }
};
const getClient = async (req, res) => {
  const { id } = req.params;
    
  try{
    const client = await selectClient(req.requestId, id);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getGroup = async (req, res) => {
  const { id } = req.params;
    
  try{
    const group = await selectGroup(req.requestId, id);
    res.status(200).json( group );
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({ error: error.message });
  }
};

const getConvertedName = async (req, res) => {
  const { name } = req.params;
  if (!name) {
    return res.status(400).json({ error: 'getConvertedName: name is required' });
  }
  try {
    const convertedName = await processNameString(name);
    res.json(convertedName);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: error.message });
  }
};
const getClientReservations = async (req, res) => {
  const { id } = req.params;
    
  try{
    const client = await selectClientReservations(req.requestId, id);
    res.status(200).json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getCustomerID = async (req, res) => {
  const { clientId, customerId } = req.params;
    
  try{
    const client = await selectCustomerID(req.requestId, clientId, customerId);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getClientGroups = async (req, res) => {
      
  try{
    const groups = await selectClientGroups(req.requestId);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST
const createClientBasic = async (req, res) => {
  const { name, name_kana, legal_or_natural_person, gender, email, phone } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  if (legal_or_natural_person === 'legal') {
    gender.value = 'other';
  }

  const client = {
    name,
    name_kana,
    legal_or_natural_person,
    gender,
    email,
    phone,
    created_by,
    updated_by,
  };

  try {
    const newClient = await addClientByName(req.requestId, client); // Call the model function with the client object
    res.json(newClient); // Respond with the created client
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

const createClient = async (req, res) => {
  const clientFields = req.body;
  const user_id = req.user.id;

  try {
    const newClient = await addNewClient(req.requestId, user_id, clientFields);
    res.json(newClient); 
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};
const createAddress = async (req, res) => {
  const addressFields = req.body;
  const user_id = req.user.id;

  try {
    const newAddress = await addNewAddress(req.requestId, user_id, addressFields);
    res.json(newAddress); 
  } catch (err) {
    console.error('Error creating client address:', err);
    res.status(500).json({ error: 'Failed to create client address' });
  }
};
const createClientGroup = async (req, res) => {
  const groupFields = req.body;
  const user_id = req.user.id;

  try {
    const newAddress = await addClientGroup(req.requestId, user_id, groupFields);
    res.json(newAddress); 
  } catch (err) {
    console.error('Error creating client address:', err);
    res.status(500).json({ error: 'Failed to create client address' });
  }
};

// PUT
const updateClient = async (req, res) => {
  const clientId = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    const updatedClient = await editClient(req.requestId, clientId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};
const updateClientFull = async (req, res) => {
  const clientId = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {    
    const updatedClient = await editClientFull(req.requestId, clientId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};
const updateAddress = async (req, res) => {
  const addressId = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    const updatedClient = await editAddress(req.requestId, addressId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating address:', err);
    res.status(500).json({ error: 'Failed to update address' });
  }
};
const updateClientGroup = async (req, res) => {
  const clientId = req.params.id;  
  const groupId = req.params.gid;  
  const user_id = req.user.id;

  try {
    const updatedClient = await editClientGroup(req.requestId, clientId, groupId, user_id) 
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
  
};
const updateGroup = async (req, res) => {   
  const groupId = req.params.gid;
  const data = req.body;
  const user_id = req.user.id;

  try {
    const updatedGroup = await editGroup(req.requestId, groupId, data, user_id) 
    res.json(updatedGroup);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
  
};

const mergeClients = async (req, res) => {
  const newClientId = req.params.nid;
  const oldClientId = req.params.oid;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    await editClientFull(req.requestId, newClientId, updatedFields, user_id);
    await updateClientInReservation(req.requestId, oldClientId, newClientId);
    await deleteClient(req.requestId, oldClientId, user_id);
    res.json({message: 'Success'});
  } catch (err) {
  console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

// DELETE
const removeAddress = async (req, res) => {
  const addressId = req.params.id;  
  const user_id = req.user.id;

  try {
    await deleteAddress(req.requestId, addressId, user_id);
    res.json({message: 'Address deleted.'});
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

module.exports = { 
  getClients, 
  getClient,
  getGroup,
  getConvertedName,
  getClientReservations,
  getCustomerID,
  getClientGroups,
  createClientBasic, 
  createClient, 
  createAddress,
  createClientGroup,
  removeAddress,
  updateClient,
  updateClientFull,
  updateAddress,
  updateClientGroup,
  updateGroup,
  mergeClients,
};
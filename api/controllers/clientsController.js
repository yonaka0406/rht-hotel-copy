const { processNameString, getAllClients, selectClient, getTotalClientsCount, addClientByName, addNewClient, editClient, editClientFull, selectClientReservations, deleteClient } = require('../models/clients');
const { updateClientInReservation } = require('../models/reservations');

// GET
const getClients = async (req, res) => {
  const { page } = req.params;
  const limit = 5000;
  const offset = (page - 1) * limit;

  try {
    const clients = await getAllClients(limit, offset);
    const totalClients = await getTotalClientsCount();
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
    const client = await selectClient(id);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
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
    const client = await selectClientReservations(id);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST
const createClientBasic = async (req, res) => {
  const { name, legal_or_natural_person, gender, email, phone } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  const client = {
    name,
    legal_or_natural_person,
    gender,
    email,
    phone,
    created_by,
    updated_by,
  };

  try {
    const newClient = await addClientByName(client); // Call the model function with the client object
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
    const newClient = await addNewClient(user_id, clientFields);
    res.json(newClient); 
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

// PUT
const updateClient = async (req, res) => {
  const clientId = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    const updatedClient = await editClient(clientId, updatedFields, user_id);
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
    const updatedClient = await editClientFull(clientId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

const mergeClients = async (req, res) => {
  const newClientId = req.params.nid;
  const oldClientId = req.params.oid;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    await editClientFull(newClientId, updatedFields, user_id);
    await updateClientInReservation(oldClientId, newClientId);
    await deleteClient(oldClientId, user_id);
    res.json({message: 'Success'});
  } catch (err) {
  console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
}

module.exports = { 
  getClients, 
  getClient,
  getConvertedName,
  getClientReservations,
  createClientBasic, 
  createClient, 
  updateClient,
  updateClientFull,
  mergeClients,
};
const pool = require('../config/database');
const { processNameString, getAllClients, addClientByName, addNewClient, editClient } = require('../models/clients');

// GET
  const getClients = async (req, res) => {
    try {
      const clients = await getAllClients();
      res.json(clients);
    } catch (error) {
      console.error('Error getting clients:', error);
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
    await editClient(clientId, updatedFields, user_id);
    res.json({ message: 'Client updated successfully' });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

module.exports = { getClients, getConvertedName, createClientBasic, createClient, updateClient };
const pool = require('../config/database');
const { getAllClients, addClientByName } = require('../models/clients');

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

module.exports = { getClients, createClientBasic };
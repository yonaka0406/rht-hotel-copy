const { validatePhoneNumberFormat } = require('../../utils/validationUtils');
const { ValidationError } = require('../../utils/customErrors');
const clientsModel = require('../../models/clients');
const reservationsModel = require('../../models/reservations');
const logger = require('../../config/logger');

// GET
const getClients = async (req, res) => {
  const page = parseInt(req.params.page, 10) || 1; // Default to page 1 if not provided or invalid
  const limit = parseInt(req.query.limit, 10) || 5000;
  const offset = (page - 1) * limit;
  const searchTerm = req.query.search || null;
  const personType = req.query.personType || null;

  try {
    const clients = await clientsModel.getAllClients(req.requestId, limit, offset, searchTerm, personType);
    const totalClients = await clientsModel.getTotalClientsCount(req.requestId, searchTerm, personType);
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

  try {
    const client = await clientsModel.selectClient(req.requestId, id);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const group = await clientsModel.selectGroup(req.requestId, id);
    res.status(200).json(group);
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
    const convertedName = await clientsModel.processNameString(name);
    res.json(convertedName);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: error.message });
  }
};
const getClientReservations = async (req, res) => {
  const { id } = req.params;

  try {
    const client = await clientsModel.selectClientReservations(req.requestId, id);
    res.status(200).json(client);
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getCustomerID = async (req, res) => {
  const { clientId, customerId } = req.params;

  try {
    const client = await clientsModel.selectCustomerID(req.requestId, clientId, customerId);
    res.status(200).json({ client });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ error: error.message });
  }
};
const getClientGroups = async (req, res) => {

  try {
    const groups = await clientsModel.selectClientGroups(req.requestId);
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST
const createClientBasic = async (req, res) => {
  try {
    logger.debug('[CLIENT_CREATE_RAW_BODY] Raw request body:', req.body);
    const { name, name_kana, legal_or_natural_person, gender, email, phone, customer_id } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    if (phone) {
      validatePhoneNumberFormat(phone, 'phone');
    }

    let finalGender = gender; // Initialize with the passed gender
    if (legal_or_natural_person === 'legal') {
      finalGender = 'other'; // Assign plain value
    }

    let processed_customer_id = customer_id;
    if (processed_customer_id === '' || processed_customer_id === undefined) {
      processed_customer_id = null;
    } else if (processed_customer_id !== null) {
      const parsedId = parseInt(processed_customer_id, 10);
      processed_customer_id = isNaN(parsedId) ? null : parsedId;
    } else {
      processed_customer_id = null;
    }

    const client = {
      name,
      name_kana,
      legal_or_natural_person,
      gender: finalGender, // Use finalGender here
      email,
      phone,
      customer_id: processed_customer_id,
      created_by,
      updated_by,
    };

    const newClient = await clientsModel.addClientByName(req.requestId, client);
    res.json(newClient);
  } catch (err) {
    if (err instanceof ValidationError && err.code === 'INVALID_PHONE') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

const createClient = async (req, res) => {
  try {
    const { customer_id, ...clientFields } = req.body;
    const user_id = req.user.id;

    if (customer_id === '' || customer_id === undefined) {
      clientFields.customer_id = null;
    } else if (customer_id !== null) {
      const parsedId = parseInt(customer_id, 10);
      clientFields.customer_id = isNaN(parsedId) ? null : parsedId;
    } else {
      clientFields.customer_id = null;
    }

    if (clientFields.phone) {
      validatePhoneNumberFormat(clientFields.phone, 'phone');
    }

    const newClient = await clientsModel.addNewClient(req.requestId, user_id, clientFields);
    res.json(newClient);
  } catch (err) {
    if (err instanceof ValidationError && err.code === 'INVALID_PHONE') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
};
const createAddress = async (req, res) => {
  const addressFields = req.body;
  const user_id = req.user.id;

  try {
    const newAddress = await clientsModel.addNewAddress(req.requestId, user_id, addressFields);
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
    const newAddress = await clientsModel.addClientGroup(req.requestId, user_id, groupFields);
    res.json(newAddress);
  } catch (err) {
    console.error('Error creating client address:', err);
    res.status(500).json({ error: 'Failed to create client address' });
  }
};

// PUT
const updateClient = async (req, res) => {
  try {
    const clientId = req.params.id;
    const { customer_id, ...updatedFields } = req.body;
    const user_id = req.user.id;

    if (customer_id === '' || customer_id === undefined) {
      updatedFields.customer_id = null;
    } else if (customer_id !== null) {
      const parsedId = parseInt(customer_id, 10);
      updatedFields.customer_id = isNaN(parsedId) ? null : parsedId;
    } else {
      updatedFields.customer_id = null;
    }

    if (updatedFields.phone) {
      validatePhoneNumberFormat(updatedFields.phone, 'phone');
    }

    const updatedClient = await clientsModel.editClient(req.requestId, clientId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    if (err instanceof ValidationError && err.code === 'INVALID_PHONE') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};
const updateClientFull = async (req, res) => {
  try {
    const clientId = req.params.id;
    const updatedFields = req.body;
    const user_id = req.user.id;

    if (updatedFields.phone) {
      validatePhoneNumberFormat(updatedFields.phone, 'phone');
    }

    if (updatedFields.customer_id === '' || updatedFields.customer_id === undefined) {
      updatedFields.customer_id = null;
    } else if (updatedFields.customer_id !== null) {
      const parsedId = parseInt(updatedFields.customer_id, 10);
      updatedFields.customer_id = isNaN(parsedId) ? null : parsedId;
    }

    const updatedClient = await clientsModel.editClientFull(req.requestId, clientId, updatedFields, user_id);
    res.json(updatedClient);
  } catch (err) {
    if (err instanceof ValidationError && err.code === 'INVALID_PHONE') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
};
const updateAddress = async (req, res) => {
  const addressId = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    const updatedClient = await clientsModel.editAddress(req.requestId, addressId, updatedFields, user_id);
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
    const updatedClient = await clientsModel.editClientGroup(req.requestId, clientId, groupId, user_id);
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
    const updatedGroup = await clientsModel.editGroup(req.requestId, groupId, data, user_id);
    res.json(updatedGroup);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }

};

const mergeClients = async (req, res) => {
  const { nid: newClientId, oid: oldClientId } = req.params;
  const { mergedFields, addressIdsToKeep } = req.body;
  const user_id = req.user.id;

  try {
    const result = await clientsModel.mergeClientData(
      req.requestId,
      oldClientId,
      newClientId,
      mergedFields,
      addressIdsToKeep,
      user_id
    );
    res.status(200).json(result);
  } catch (err) {
    console.error('Error merging clients:', err);
    res.status(500).json({ error: 'Failed to merge clients' });
  }
};

// DELETE
const removeAddress = async (req, res) => {
  const addressId = req.params.id;
  const user_id = req.user.id;

  try {
    await clientsModel.deleteAddress(req.requestId, addressId, user_id);
    res.json({ message: 'Address deleted.' });
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

// --- Client Relationship Controller Methods ---
const handleGetRelatedCompanies = async (req, res) => {
  const { clientId } = req.params; // Client ID (UUID string)
  try {
    const relationships = await clientsModel.findRelationshipsByClientId(req.requestId, clientId);
    // The model already shapes the data as needed by the frontend based on SQL aliasing
    // { relationship_id, related_company_id, related_company_name, our_perspective_type, their_perspective_type, comment }
    // Frontend expects: type_from_source_perspective, type_from_target_perspective, comment_from_source
    const mappedRelationships = relationships.map(r => ({
      relationship_id: r.relationship_id,
      related_company_id: r.related_company_id,
      related_company_name: r.related_company_name,
      type_from_source_perspective: r.our_perspective_type,
      type_from_target_perspective: r.their_perspective_type,
      comment_from_source: r.comment, // Assuming the single comment field is from source's view
    }));
    res.status(200).json(mappedRelationships);
  } catch (error) {
    console.error('Error in handleGetRelatedCompanies:', error);
    res.status(500).json({ message: 'Failed to retrieve related companies', error: error.message });
  }
};

const handleAddClientRelationship = async (req, res) => {
  const { clientId: source_client_id } = req.params; // Source Client ID (UUID string)
  const { target_client_id, source_relationship_type, target_relationship_type, comment } = req.body;

  if (!target_client_id || !source_relationship_type || !target_relationship_type) {
    return res.status(400).json({ message: 'Missing required fields: target_client_id, source_relationship_type, target_relationship_type' });
  }
  if (source_client_id === target_client_id) {
    return res.status(400).json({ message: 'Cannot relate a client to itself.' });
  }

  try {
    // Validate legal status of both clients
    const clientStatuses = await clientsModel.getLegalStatusForClientIds(req.requestId, [source_client_id, target_client_id]);

    // Check if both clients were found by checking the length of the result
    if (clientStatuses.length !== 2) {
      // Determine which client was not found or if both were not found for a more specific message
      const foundSource = clientStatuses.some(c => c.id === source_client_id);
      const foundTarget = clientStatuses.some(c => c.id === target_client_id);
      let errorMessage = 'One or both clients not found.';
      if (!foundSource && !foundTarget) errorMessage = 'Source and target clients not found.';
      else if (!foundSource) errorMessage = 'Source client not found.';
      else if (!foundTarget) errorMessage = 'Target client not found.';
      return res.status(404).json({ message: errorMessage }); // 404 for not found
    }

    for (const client of clientStatuses) {
      if (client.legal_or_natural_person !== 'legal') {
        return res.status(400).json({ message: `Client ${client.name || client.id} is not a 'legal' person. Both clients must be 'legal' persons to form a relationship.` });
      }
    }

    const relationshipData = { source_client_id, source_relationship_type, target_client_id, target_relationship_type, comment };
    const newRelationship = await clientsModel.insertRelationship(req.requestId, relationshipData);
    res.status(201).json(newRelationship);
  } catch (error) {
    console.error('Error in handleAddClientRelationship:', error);
    if (error.code === '23505') { // Unique violation for uq_client_relationship (from model or DB)
      return res.status(409).json({ message: 'This client relationship already exists.' });
    }
    res.status(500).json({ message: 'Failed to add client relationship', error: error.message });
  }
};

const handleUpdateClientRelationship = async (req, res) => {
  const { relationshipId } = req.params; // Integer ID of the relationship row
  const dataToUpdate = req.body; // { source_relationship_type, target_relationship_type, comment }

  if (Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }
  // Optional: Add more specific validation for the content of dataToUpdate fields

  try {
    const updatedRelationship = await clientsModel.updateRelationshipById(req.requestId, parseInt(relationshipId), dataToUpdate);
    if (!updatedRelationship) { // Model's updateRelationshipById should return null/undefined if row not found
      return res.status(404).json({ message: 'Relationship not found or no changes made.' });
    }
    res.status(200).json(updatedRelationship);
  } catch (error) {
    console.error('Error in handleUpdateClientRelationship:', error);
    if (error.message.includes("No fields provided for update")) { // Error from model
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update client relationship', error: error.message });
  }
};

const handleDeleteClientRelationship = async (req, res) => {
  const { relationshipId } = req.params; // Integer ID
  try {
    const deletedRelationship = await clientsModel.deleteRelationshipById(req.requestId, parseInt(relationshipId));
    if (!deletedRelationship) { // Model's deleteRelationshipById returns the deleted row or undefined
      return res.status(404).json({ message: 'Relationship not found.' });
    }
    res.status(200).json({ message: 'Relationship deleted successfully.', deletedRelationship });
  } catch (error) {
    console.error('Error in handleDeleteClientRelationship:', error);
    res.status(500).json({ message: 'Failed to delete client relationship', error: error.message });
  }
};

const handleGetCommonRelationshipPairs = async (req, res) => {
  try {
    const pairs = await clientsModel.findAllCommonRelationshipPairs(req.requestId);
    res.status(200).json(pairs);
  } catch (error) {
    console.error('Error in handleGetCommonRelationshipPairs:', error);
    res.status(500).json({ message: 'Failed to retrieve common relationship pairs', error: error.message });
  }
};

// --- Client Impediment Controller Methods ---
const handleCreateImpediment = async (req, res) => {
  const impedimentData = req.body;
  const userId = req.user.id; // Assuming user ID is available from auth middleware

  if (!impedimentData.client_id || !impedimentData.impediment_type || !impedimentData.restriction_level) {
    return res.status(400).json({ error: 'Missing required fields: client_id, impediment_type, restriction_level.' });
  }

  try {
    const newImpediment = await clientsModel.createImpediment(req.requestId, impedimentData, userId);
    res.status(201).json(newImpediment);
  } catch (error) {
    logger.error(`[Controller] Error creating impediment: ${error.message}`);
    res.status(500).json({ error: 'Failed to create client impediment.' });
  }
};
const handleGetImpedimentsByClientId = async (req, res) => {
  const { clientId } = req.params;

  try {
    const impediments = await clientsModel.getImpedimentsByClientId(req.requestId, clientId);
    if (!impediments) {
      return res.status(200).json([]);
    }
    res.status(200).json(impediments);
  } catch (error) {
    logger.error(`[Controller] Error retrieving impediments for client ${clientId}: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve client impediments.' });
  }
};
const handleUpdateImpediment = async (req, res) => {
  const { impedimentId } = req.params;
  const updatedFields = req.body;
  const userId = req.user.id;

  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ error: 'No fields provided for update.' });
  }

  try {
    const updatedImpediment = await clientsModel.updateImpediment(req.requestId, impedimentId, updatedFields, userId);
    res.status(200).json(updatedImpediment);
  } catch (error) {
    logger.error(`[Controller] Error updating impediment ${impedimentId}: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update client impediment.' });
  }
};
const handleDeleteImpediment = async (req, res) => {
  const { impedimentId } = req.params;

  try {
    const deletedImpediment = await clientsModel.deleteImpediment(req.requestId, impedimentId);
    res.status(200).json({ message: 'Impediment deleted successfully.', deletedImpediment });
  } catch (error) {
    logger.error(`[Controller] Error deleting impediment ${impedimentId}: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete client impediment.' });
  }
};

const { exportClientsToFile } = require('./services/exportService');

const exportClients = async (req, res) => {
  let { created_after, ...otherFilters } = req.body; // Destructure other filters

  if (created_after) {
    const parsedDate = Date.parse(created_after);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'Invalid created_after: must be a valid ISO date string' });
    }
    created_after = new Date(parsedDate).toISOString();
  }

  const filtersToPass = { created_after, ...otherFilters }; // Combine all filters

  try {
    const clients = await clientsModel.getAllClientsForExport(req.requestId, filtersToPass); // Pass all filters

    const workbook = await exportClientsToFile(clients);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=clients.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting clients:', error);
    res.status(500).json({ error: error.message });
  }
};

const getExportClientsCount = async (req, res) => {
  let { created_after, ...otherFilters } = req.body; // Destructure other filters

  if (created_after) {
    const parsedDate = Date.parse(created_after);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'Invalid created_after: must be a valid ISO date string' });
    }
    created_after = new Date(parsedDate).toISOString();
  }

  const filtersToPass = { created_after, ...otherFilters }; // Combine all filters

  try {
    const count = await clientsModel.getClientsCountForExport(req.requestId, filtersToPass); // Pass all filters
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting export clients count:', error);
    res.status(500).json({ error: error.message });
  }
};

const getClientStats = async (req, res) => {
  try {
    const stats = await clientsModel.getClientStats(req.requestId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({ error: error.message });
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
  handleGetRelatedCompanies, handleAddClientRelationship, handleUpdateClientRelationship, handleDeleteClientRelationship, handleGetCommonRelationshipPairs,
  handleCreateImpediment,
  handleGetImpedimentsByClientId,
  handleUpdateImpediment,
  handleDeleteImpediment,
  exportClients,
  getExportClientsCount,
  getClientStats,
};
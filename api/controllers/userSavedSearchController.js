const userSavedSearch = require('../models/userSavedSearch');

module.exports = {
  async getAll(req, res) {
    try {
      const userId = req.user.id;
      const searches = await userSavedSearch.getAllByUser(req.requestId, userId);
      res.json(searches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const search = await userSavedSearch.getById(req.requestId, id, userId);
      if (!search) return res.status(404).json({ error: 'Not found' });
      res.json(search);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const userId = req.user.id;
      const { name, category, filters, favorite } = req.body;
      if (!name || !filters) return res.status(400).json({ error: 'Missing required fields' });
      const search = await userSavedSearch.create(req.requestId, userId, { name, category, filters, favorite });
      res.status(201).json(search);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { name, category, filters, favorite } = req.body;
      if (!name || !filters) return res.status(400).json({ error: 'Missing required fields' });
      const search = await userSavedSearch.update(req.requestId, id, userId, { name, category, filters, favorite });
      if (!search) return res.status(404).json({ error: 'Not found' });
      res.json(search);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await userSavedSearch.remove(req.requestId, id, userId);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}; 
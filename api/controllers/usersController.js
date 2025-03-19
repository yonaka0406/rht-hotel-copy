const { getAllUsers, getUsersByID, createUser, updateUserInfo } = require('../models/user');

const users = async (req, res) => {
  try {
    const users = await getAllUsers(req.requestId);    
    if (!users) {
      return res.status(401).json({ error: 'Users not found' });
    }    
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUser = async (req, res) => {
  const user_id = req.user.id;
  try {
      const user = await getUsersByID(req.requestId, user_id);
      res.json(user);
  } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: error.message });
  }
};

const registerUser = async (req, res) => {
  const { email, name, password, role } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;
  
  if (!email || !password || !role || !created_by) {
    return res.status(400).json({ error: 'Email, password, role and id are required' });
  }

  try {
    const user = await createUser(req.requestId, email, name, password, role, created_by, updated_by);    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role_id: user.role_id
      }
     });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  const { id, name, status_id, role_id } = req.body;
  const updated_by = req.user.id;

  // Validate that all required fields are provided
  if (!id || !status_id || !role_id) {
    return res.status(400).json({ error: 'User ID, status ID, and role ID are required' });
  }

  try {
    const user = await updateUserInfo(req.requestId, id, name, status_id, role_id, updated_by);
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
  users, 
  getUser, 
  registerUser, 
  updateUser 
};
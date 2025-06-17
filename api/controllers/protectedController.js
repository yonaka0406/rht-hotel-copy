const getProtectedData = (req, res) => {
    // The user information is already available from the authMiddleware
    // req.user contains the decoded token payload (id and email)
    try {
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        message: 'Protected data', 
        user: {
          id: req.user.id,
          email: req.user.email
        } 
      });
    } catch (err) {
      console.error('Error in getProtectedData:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = { getProtectedData };
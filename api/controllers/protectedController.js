const getProtectedData = (req, res) => {
  console.log('getProtectedData called');
  console.log('req.user:', req.user);
    // The user information is already available from the authMiddleware
    // req.user contains the decoded token payload (id and email)
    try {
      res.setHeader('Content-Type', 'application/json');
      const responseData = { 
        message: 'Protected data', 
        user: {
          id: req.user.id,
          email: req.user.email
        } 
      };
      console.log('About to send response:', responseData);
      res.json(responseData);
      console.log('Response sent successfully');
      /*
      res.json({ 
        message: 'Protected data', 
        user: {
          id: req.user.id,
          email: req.user.email
        } 
      });
      */
    } catch (err) {
      console.error('Error in getProtectedData:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = { getProtectedData };
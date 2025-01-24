const getMessage = (req, res) => {
    // Simulate a delay 
    setTimeout(() => {
      res.json({ message: "Hello from the backend!" });
    }, 3000); // Delay of 3 seconds
  };
  
  module.exports = { getMessage };
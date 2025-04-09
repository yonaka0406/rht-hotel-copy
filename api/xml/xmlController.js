const { selectXMLTemplate, insertXMLResponse } = require('../xml/xmlModel');

// GET
const getXMLTemplate = async (req, res) => {
    const name = req.params.name;
    
    try {
        const template = await selectXMLTemplate(req.requestId, name);
        res.send(template);
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const postXMLResponse = async (req, res) => {
    const { name, xml } = req.params;
    
    try {
        const response = await insertXMLResponse(req.requestId, name, xml);
        res.json({response: 'XML response added successfully', data: response});
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getXMLTemplate,
    postXMLResponse,    
};
require("dotenv").config();
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
        const responseXml = await submitXMLTemplate(req, res, name, xml); // Call submitXMLTemplate
        console.log('XML response added successfully', responseXml);
        res.json({ response: 'XML response added successfully', data: responseXml });
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

// Lincoln
const submitXMLTemplate = async (req, res, name, xml) => {
    console.log('submitXMLTemplate api', req.params, req.body);
    console.log('submitXMLTemplate var', name, xml);
    
    try {        
        const url = `${process.env.XML_REQUEST_URL}${name}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {                
                'Content-Type': 'application/xml',
            },
            body: xml,
        });
        if (!response.ok) {
            console.error('Error submitting XML template:', response.statusText);
            throw new Error('Failed to submit XML template');
        }

        // Save the response using insertXMLResponse
        const responseXml = await response.text();
        console.log('Response XML:', responseXml);
        console.log('Inserting XML response into database...');
        await insertXMLResponse(req.requestId, name, responseXml);
        return responseXml;        
    } catch (error) {    
        console.error('Failed to submit XML template', error);
    } 
};

module.exports = {
    getXMLTemplate,
    postXMLResponse,
    submitXMLTemplate,
};
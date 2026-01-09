const accountingModel = require('../../models/accounting');
const validationUtils = require('../../utils/validationUtils');

const getSettings = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { hotel_id } = req.query;

        // Validate hotel_id if present
        if (hotel_id && hotel_id !== 'undefined' && hotel_id !== 'null') {
             validationUtils.validateNumericParam(hotel_id, 'hotel_id');
        }

        const codes = await accountingModel.getAccountCodes(requestId);
        let mappings = [];
        
        // Always fetch mappings if hotel_id is provided, otherwise just codes?
        // Or maybe just fetch global mappings if no hotel_id?
        // The model function handles hotel_id = null (global) + specific.
        // If we want just global, pass null.
        const targetHotelId = (hotel_id && hotel_id !== 'undefined' && hotel_id !== 'null') ? parseInt(hotel_id) : null;
        
        mappings = await accountingModel.getMappings(requestId, targetHotelId);

        res.json({
            codes,
            mappings
        });
    } catch (err) {
        next(err);
    }
};

const upsertCode = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        // Basic validation
        if (!data.code || !data.name) {
             const error = new Error('Code and Name are required');
             error.statusCode = 400;
             throw error;
        }

        const result = await accountingModel.upsertAccountCode(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertMapping = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        
        // Validate
        if (!data.target_type || !data.target_id || !data.account_code_id) {
             const error = new Error('Target Type, Target ID and Account Code ID are required');
             error.statusCode = 400;
             throw error;
        }

        const result = await accountingModel.upsertMapping(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const deleteMapping = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;

        validationUtils.validateNumericParam(id, 'id');

        const result = await accountingModel.deleteMapping(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSettings,
    upsertCode,
    upsertMapping,
    deleteMapping
};

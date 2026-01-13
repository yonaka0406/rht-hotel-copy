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

        const [codes, groups, taxClasses] = await Promise.all([
            accountingModel.getAccountCodes(requestId),
            accountingModel.getManagementGroups(requestId),
            accountingModel.getTaxClasses(requestId)
        ]);

        const targetHotelId = (hotel_id && hotel_id !== 'undefined' && hotel_id !== 'null') ? parseInt(hotel_id) : null;
        const mappings = await accountingModel.getMappings(requestId, targetHotelId);

        res.json({
            codes,
            groups,
            taxClasses,
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

const deleteCode = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;
        validationUtils.validateNumericParam(id, 'id');
        const result = await accountingModel.deleteAccountCode(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertManagementGroup = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        if (!data.name) {
            const error = new Error('Name is required');
            error.statusCode = 400;
            throw error;
        }
        const result = await accountingModel.upsertManagementGroup(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const deleteManagementGroup = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;
        validationUtils.validateNumericParam(id, 'id');
        const result = await accountingModel.deleteManagementGroup(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertTaxClass = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        if (!data.name || !data.yayoi_name) {
            const error = new Error('Name and Yayoi Name are required');
            error.statusCode = 400;
            throw error;
        }
        const result = await accountingModel.upsertTaxClass(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const deleteTaxClass = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;
        validationUtils.validateNumericParam(id, 'id');
        const result = await accountingModel.deleteTaxClass(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertMapping = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
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
    deleteCode,
    upsertManagementGroup,
    deleteManagementGroup,
    upsertTaxClass,
    deleteTaxClass,
    upsertMapping,
    deleteMapping
};

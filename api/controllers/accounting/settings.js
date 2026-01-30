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

        const [codes, groups, taxClasses, departments, subAccounts] = await Promise.all([
            accountingModel.accountingRead.getAccountCodes(requestId),
            accountingModel.accountingRead.getManagementGroups(requestId),
            accountingModel.accountingRead.getTaxClasses(requestId),
            accountingModel.accountingRead.getDepartments(requestId),
            accountingModel.accountingRead.getSubAccounts(requestId)
        ]);

        const targetHotelId = (hotel_id && hotel_id !== 'undefined' && hotel_id !== 'null') ? parseInt(hotel_id) : null;

        // Fetch additional master data for mappings if hotel_id is provided
        let mappingMasterData = {
            plans: [],
            categories: [],
            addonsGlobal: [],
            addonsHotel: []
        };

        if (targetHotelId) {
            const planModel = require('../../models/plan');
            const addonModel = require('../../models/addons');

            const [plans, categories, packageCategories, addonsGlobal, addonsHotel] = await Promise.all([
                planModel.selectHotelPlans(requestId, targetHotelId),
                planModel.selectAllPlanTypeCategories(requestId),
                planModel.selectAllPlanPackageCategories(requestId),
                addonModel.getAllGlobalAddons(requestId),
                addonModel.getAllHotelAddons(requestId, targetHotelId)
            ]);

            mappingMasterData = {
                plans,
                categories,
                packageCategories,
                addonsGlobal,
                addonsHotel
            };
        } else {
            // Even if no hotel_id, we might want global categories and addons for global mappings
            const planModel = require('../../models/plan');
            const addonModel = require('../../models/addons');

            const [categories, packageCategories, addonsGlobal] = await Promise.all([
                planModel.selectAllPlanTypeCategories(requestId),
                planModel.selectAllPlanPackageCategories(requestId),
                addonModel.getAllGlobalAddons(requestId)
            ]);

            mappingMasterData.categories = categories;
            mappingMasterData.packageCategories = packageCategories;
            mappingMasterData.addonsGlobal = addonsGlobal;
        }

        const mappings = await accountingModel.accountingRead.getMappings(requestId, targetHotelId);

        res.json({
            codes,
            groups,
            taxClasses,
            departments,
            subAccounts,
            mappings,
            mappingMasterData
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

        const result = await accountingModel.accountingWrite.upsertAccountCode(requestId, data, user.id);
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
        const result = await accountingModel.accountingWrite.deleteAccountCode(requestId, id);
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
        const result = await accountingModel.accountingWrite.upsertManagementGroup(requestId, data, user.id);
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
        const result = await accountingModel.accountingWrite.deleteManagementGroup(requestId, id);
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
        const result = await accountingModel.accountingWrite.upsertTaxClass(requestId, data, user.id);
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
        const result = await accountingModel.accountingWrite.deleteTaxClass(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertDepartment = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        if (!data.hotel_id || !data.name) {
            const error = new Error('Hotel ID and Name are required');
            error.statusCode = 400;
            throw error;
        }
        const result = await accountingModel.accountingWrite.upsertDepartment(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;
        validationUtils.validateNumericParam(id, 'id');
        const result = await accountingModel.accountingWrite.deleteDepartment(requestId, id);
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
        const result = await accountingModel.accountingWrite.upsertMapping(requestId, data, user.id);
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
        const result = await accountingModel.accountingWrite.deleteMapping(requestId, id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const upsertSubAccount = async (req, res, next) => {
    try {
        const { requestId, user } = req;
        const data = req.body;
        if (!data.account_code_id || !data.name) {
            const error = new Error('Account Code ID and Name are required');
            error.statusCode = 400;
            throw error;
        }
        const result = await accountingModel.accountingWrite.upsertSubAccount(requestId, data, user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const deleteSubAccount = async (req, res, next) => {
    try {
        const { requestId } = req;
        const { id } = req.params;
        validationUtils.validateNumericParam(id, 'id');
        const result = await accountingModel.accountingWrite.deleteSubAccount(requestId, id);
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
    upsertDepartment,
    deleteDepartment,
    upsertMapping,
    deleteMapping,
    upsertSubAccount,
    deleteSubAccount
};

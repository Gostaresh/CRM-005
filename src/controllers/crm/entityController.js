const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");

const fetchEntity = async (req, res) => {
    const { entity } = req.params;
    const { select, filter } = req.query;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    logger.info(`CRM request credentials: ${credentials.username}`);
    const data = await CrmService.fetchEntity(entity, { select, filter }, credentials);
    res.status(200).json(data);
};

const createEntity = async (req, res) => {
    const { entity } = req.params;
    const data = req.body;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    logger.info(`CRM create credentials: ${credentials.username}`);
    const result = await CrmService.createEntity(entity, data, credentials);
    res.status(201).json(result);
};

module.exports = {
    fetchEntity,
    createEntity
}; 
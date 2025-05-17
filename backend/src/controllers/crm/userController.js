const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");

const fetchSystemUsersForDropdown = async (req, res) => {
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    const query = {
        select: "systemuserid,fullname",
        filter: "",
        top: 500,
    };
    logger.info(`Fetching system users for dropdown: user: ${credentials.username}`);
    const data = await CrmService.fetchEntity("systemusers", query, credentials);
    res.status(200).json(data.value || []);
};

const getCurrentUser = async (req, res) => {
    try {
        const credentials = {
            username: req.session.user.username.split("\\")[1],
            password: decrypt(req.session.encryptedPassword),
        };
        
        const query = {
            select: "systemuserid,fullname,domainname",
            filter: `systemuserid eq '${req.session.user.id}'`
        };
        
        logger.info(`Fetching current user details: ${req.session.user.username}`);
        const data = await CrmService.fetchEntity("systemusers", query, credentials);
        
        if (!data.value || data.value.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.status(200).json(data.value[0]);
    } catch (error) {
        logger.error(`Error fetching current user: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    fetchSystemUsersForDropdown,
    getCurrentUser
}; 
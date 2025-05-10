const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");

const fetchPaginatedAccounts = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const nextLink = req.query.nextLink || null;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    logger.info(
        `Fetching paginated accounts: page ${page}, pageSize ${pageSize}, nextLink ${nextLink || "none"}, user: ${credentials.username}`
    );
    const data = await CrmService.fetchPaginatedAccounts(page, pageSize, nextLink, credentials);
    res.status(200).json({
        value: data.value || [],
        nextLink: data["@odata.nextLink"] || null,
    });
};

const fetchAccountsForDropdown = async (req, res) => {
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    const query = {
        select: "accountid,name",
        filter: "",
        top: 500,
    };
    logger.info(`Fetching accounts for dropdown: user: ${credentials.username}`);
    const data = await CrmService.fetchEntity("accounts", query, credentials);
    res.status(200).json(data.value || []);
};

module.exports = {
    fetchPaginatedAccounts,
    fetchAccountsForDropdown
}; 
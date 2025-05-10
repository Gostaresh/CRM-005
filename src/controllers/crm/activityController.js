const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");

const fetchAllActivities = async (req, res) => {
    try {
        const nextLink = req.query.nextLink || null;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const credentials = {
            username: req.session.user.username.split("\\")[1],
            password: decrypt(req.session.encryptedPassword),
        };
        logger.info(
            `Fetching all activities for user: ${credentials.username}, nextLink: ${nextLink || "none"}`
        );
        const data = await CrmService.fetchActivities(credentials, null, nextLink, pageSize);
        logger.info(`All activities response: ${JSON.stringify(data.value, null, 2)}`);
        logger.info(`Next link for all activities: ${data.nextLink || "none"}`);
        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching all activities: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

const fetchMyActivities = async (req, res) => {
    const nextLink = req.query.nextLink || null;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    const userId = req.session.user.id;
    logger.info(
        `Fetching my activities for user: ${credentials.username}, userId: ${userId}, nextLink: ${nextLink || "none"}`
    );
    const data = await CrmService.fetchActivities(credentials, userId, nextLink, pageSize);
    logger.info(`My activities response: ${JSON.stringify(data)}`);
    logger.info(`Next link for my activities: ${data.nextLink || "none"}`);
    res.status(200).json(data);
};

const fetchActivityDetails = async (req, res) => {
    const { activityId } = req.params;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    logger.info(
        `Fetching activity details for activityId: ${activityId}, user: ${credentials.username}`
    );
    const data = await CrmService.fetchActivityDetails(activityId, credentials);
    res.status(200).json(data);
};

const createActivity = async (req, res) => {
    const {
        subject,
        description,
        scheduledstart,
        scheduledend,
        prioritycode,
        regardingobjectid,
        customworkflowid,
    } = req.body;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };
    const userId = req.session.user.id;

    if (!subject || !scheduledend) {
        return res.status(400).json({ error: "موضوع و تاریخ سررسید الزامی است" });
    }

    const activityData = {
        subject,
        description: description || "",
        scheduledstart: scheduledstart ? new Date(scheduledstart).toISOString() : null,
        scheduledend: new Date(scheduledend).toISOString(),
        prioritycode: parseInt(prioritycode) || 1,
        "ownerid@odata.bind": `/systemusers(${userId})`,
        activitytypecode: "task",
    };

    if (customworkflowid) {
        activityData.customworkflowid = customworkflowid;
    }

    if (regardingobjectid) {
        activityData["regardingobjectid_account@odata.bind"] = `/accounts(${regardingobjectid})`;
    }

    logger.info(
        `Creating task for user: ${credentials.username}, entity: tasks, data: ${JSON.stringify(activityData)}`
    );
    try {
        const result = await CrmService.createEntity("tasks", activityData, credentials);
        res.status(201).json({
            message: "وظیفه با موفقیت ایجاد شد",
            activityId: result.activityid,
        });
    } catch (err) {
        logger.error(`Create task error: ${err.message}`);
        res.status(500).json({ error: `خطا در ایجاد وظیفه: ${err.message}` });
    }
};

const updateTaskDates = async (req, res) => {
    const { activityId } = req.params;
    const { scheduledstart, scheduledend } = req.body;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };

    if (!scheduledend) {
        return res.status(400).json({ error: "تاریخ سررسید الزامی است" });
    }

    const updateData = {
        scheduledstart: scheduledstart || null,
        scheduledend: scheduledend,
    };

    logger.info(
        `Updating task dates for activityId: ${activityId}, user: ${credentials.username}, data: ${JSON.stringify(updateData)}`
    );
    try {
        await CrmService.updateTaskDates(activityId, updateData, credentials);
        res.status(200).json({ message: "زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد" });
    } catch (err) {
        logger.error(`Update task dates error: ${err.message}`);
        throw err;
    }
};

const updateTask = async (req, res) => {
    const { activityId } = req.params;
    const {
        subject,
        description,
        scheduledstart,
        scheduledend,
        prioritycode,
        regardingobjectid,
        statuscode,
        ownerid,
        new_seen,
    } = req.body;
    const credentials = {
        username: req.session.user.username.split("\\")[1],
        password: decrypt(req.session.encryptedPassword),
    };

    const updateData = {
        subject,
        description,
        scheduledstart: scheduledstart ? new Date(scheduledstart).toISOString() : null,
        scheduledend: scheduledend ? new Date(scheduledend).toISOString() : null,
        prioritycode: prioritycode ? parseInt(prioritycode) : undefined,
    };

    if (regardingobjectid) {
        updateData["regardingobjectid_account@odata.bind"] = `/accounts(${regardingobjectid})`;
    }
    if (statuscode !== undefined) {
        updateData.statuscode = parseInt(statuscode);
    }
    if (ownerid) {
        updateData["ownerid@odata.bind"] = `/systemusers(${ownerid})`;
    }
    if (typeof new_seen !== 'undefined') {
        updateData.new_seen = !!new_seen;
    }

    logger.info(
        `Updating task for activityId: ${activityId}, user: ${credentials.username}, data: ${JSON.stringify(updateData)}`
    );
    try {
        await CrmService.updateTask(activityId, updateData, credentials);
        res.status(200).json({ message: "وظیفه با موفقیت به‌روزرسانی شد" });
    } catch (err) {
        logger.error(`Update task error: ${err.message}`);
        res.status(500).json({ error: `خطا در به‌روزرسانی وظیفه: ${err.message}` });
    }
};

const fetchActivitiesByOwners = async (req, res) => {
    try {
        const { owners, nextLink = null, pageSize = 50 } = req.query;
        
        if (!owners && !nextLink) {
            return res.status(400).json({ error: "Owners parameter is required for initial request" });
        }

        const credentials = {
            username: req.session.user.username.split("\\")[1],
            password: decrypt(req.session.encryptedPassword),
        };

        let result;
        if (nextLink) {
            // If we have a nextLink, use it directly
            result = await CrmService.fetchActivities(
                credentials,
                null,
                nextLink,
                parseInt(pageSize)
            );
        } else {
            // For initial request, construct the filter
            const ownerIds = owners.split(',').map(id => id.trim());
            if (ownerIds.length === 0) {
                return res.status(400).json({ error: "At least one owner ID is required" });
            }
            
            logger.info(`Fetching activities for owners: ${ownerIds.join(', ')}`);
            const ownerFilter = ownerIds.map(id => `_ownerid_value eq '${id}'`).join(' or ');
            
            result = await CrmService.fetchActivities(
                credentials,
                null,
                null,
                parseInt(pageSize),
                `(${ownerFilter})`
            );
        }

        res.json(result);
    } catch (error) {
        logger.error(`Error fetching activities by owners: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    fetchAllActivities,
    fetchMyActivities,
    fetchActivityDetails,
    createActivity,
    updateTaskDates,
    updateTask,
    fetchActivitiesByOwners
}; 
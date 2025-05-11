const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");
const { ActivityPointer, SystemUser } = require("../../core/resources");
const DateTimeService = require("../../core/services/DateTimeService");
const moment = require('jalali-moment');
// Helper function to add Jalali date fields to activity data
const convertActivityDates = (activityOrArray) => {
    const dateFields = [
        'scheduledstart',
        'scheduledend',
        'actualstart',
        'actualend',
        'createdon',
        'modifiedon'
    ];
    function addJalaliToOne(activity) {
        if (!activity || typeof activity !== 'object') return activity;
        const result = { ...activity };
        dateFields.forEach(field => {
            if (result[field]) {
                result[`${field}_jalali`] = DateTimeService.toJalali(result[field]);
            }
        });
        return result;
    }
    if (Array.isArray(activityOrArray)) {
        return activityOrArray.map(addJalaliToOne);
    } else {
        return addJalaliToOne(activityOrArray);
    }
};

// Helper: Validate CRM date
function isValidCrmDate(dateStr) {
    if (!dateStr) return false;
    // Accepts YYYY-MM-DD HH:mm:ss or YYYY/MM/DD HH:mm:ss
    const minDate = new Date('1753-01-01T00:00:00Z');
    let d = new Date(dateStr.replace(/\//g, '-'));
    return d instanceof Date && !isNaN(d) && d >= minDate;
}

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
        
        // Convert dates in the response
        if (data.value) {
            data.value = data.value.map(convertActivityDates);
        }
        
        // logger.info(`All activities response: ${JSON.stringify(data.value, null, 2)}`);
        // logger.info(`Next link for all activities: ${data.nextLink || "none"}`);
        logger.info('All activities fetched successfully');

        res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching all activities: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

const fetchMyActivities = async (req, res) => {
    try {
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
    
    // Convert dates in the response
    if (data.value) {
        data.value = data.value.map(convertActivityDates);
    }
    
    // logger.info(`My activities response: ${JSON.stringify(data.value, null, 2)}`);
    // logger.info(`Next link for my activities: ${data.nextLink || "none"}`);
    logger.info('My activities fetched successfully');

    res.status(200).json(data);
    } catch (error) {
        logger.error(`Error fetching my activities: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
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
    
    // Convert dates in the response
    const convertedData = convertActivityDates(data);
    
    res.status(200).json(convertedData);
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

    // Convert Jalali dates to UTC for CRM
    const utcStartDate = scheduledstart ? DateTimeService.toUTC(scheduledstart) : null;
    const utcEndDate = DateTimeService.toUTC(scheduledend);

    if (!utcEndDate) {
        return res.status(400).json({ error: "فرمت تاریخ سررسید نامعتبر است" });
    }

    const activityData = {
        [ActivityPointer.properties.subject]: subject,
        [ActivityPointer.properties.description]: description || "",
        [ActivityPointer.properties.scheduledStart]: utcStartDate ? utcStartDate.toISOString() : null,
        [ActivityPointer.properties.scheduledEnd]: utcEndDate.toISOString(),
        [ActivityPointer.properties.priorityCode]: parseInt(prioritycode) || 1,
        "ownerid@odata.bind": `/${SystemUser.type}(${userId})`,
        [ActivityPointer.properties.activityTypeCode]: "task",
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

    // Convert Jalali dates to UTC for CRM
    const utcStartDate = scheduledstart ? DateTimeService.toUTC(scheduledstart) : null;
    const utcEndDate = DateTimeService.toUTC(scheduledend);

    // Backend validation for CRM date
    if ((utcStartDate && !isValidCrmDate(utcStartDate)) || !isValidCrmDate(utcEndDate)) {
        return res.status(400).json({ error: "تاریخ وارد شده معتبر نیست یا کمتر از حد مجاز است" });
    }

    const updateData = {
        scheduledstart: utcStartDate,
        scheduledend: utcEndDate
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

    // Convert Jalali dates to UTC for CRM
    const utcStartDate = moment.from(scheduledstart, 'fa', 'YYYY/MM/DD HH:mm:ss').format('YYYY-M-D HH:mm:ss');
    const utcEndDate = moment.from(scheduledend, 'fa', 'YYYY/MM/DD HH:mm:ss').format('YYYY-M-D HH:mm:ss');

    // Backend validation for CRM date
    if ((utcStartDate && !isValidCrmDate(utcStartDate)) || !isValidCrmDate(utcEndDate)) {
        return res.status(400).json({ error: "تاریخ وارد شده معتبر نیست یا کمتر از حد مجاز است" });
    }

    if (scheduledend && !utcEndDate) {
        return res.status(400).json({ error: "فرمت تاریخ سررسید نامعتبر است" });
    }

    const updateData = {
        subject,
        description,
        scheduledstart: utcStartDate,
        scheduledend: utcEndDate,
        prioritycode: prioritycode ? parseInt(prioritycode) : undefined,
    };
    logger.info(`updateData: ${JSON.stringify(updateData)}`);
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
            result = await CrmService.fetchActivities(
                credentials,
                null,
                nextLink,
                parseInt(pageSize)
            );
        } else {
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

        // Convert dates in the response
        if (result.value) {
            result.value = result.value.map(convertActivityDates);
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
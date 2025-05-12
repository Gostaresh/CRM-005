const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");
const { ActivityPointer, SystemUser } = require("../../core/resources");

const fetchAllActivities = async (req, res) => {
  try {
    const nextLink = req.query.nextLink || null;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const credentials = {
      username: req.session.user.username.split("\\")[1],
      password: decrypt(req.session.encryptedPassword),
    };
    logger.info(
      `Fetching all activities for user: ${credentials.username}, nextLink: ${
        nextLink || "none"
      }`
    );
    const data = await CrmService.fetchActivities(
      credentials,
      null,
      nextLink,
      pageSize
    );

    // Convert dates in the response
    // if (data.value) {
    //     data.value = data.value.map(convertActivityDates);
    // }

    // logger.info(`All activities response: ${JSON.stringify(data.value, null, 2)}`);
    // logger.info(`Next link for all activities: ${data.nextLink || "none"}`);
    logger.info("All activities fetched successfully");

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
      `Fetching my activities for user: ${
        credentials.username
      }, userId: ${userId}, nextLink: ${nextLink || "none"}`
    );
    const data = await CrmService.fetchActivities(
      credentials,
      userId,
      nextLink,
      pageSize
    );

    // Convert dates in the response
    // if (data.value) {
    //     data.value = data.value.map(convertActivityDates);
    // }

    // logger.info(`My activities response: ${JSON.stringify(data.value, null, 2)}`);
    // logger.info(`Next link for my activities: ${data.nextLink || "none"}`);
    logger.info("My activities fetched successfully");

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
    regardingtype,
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

  const utcStartDate = scheduledstart || null;
  const utcEndDate = scheduledend;

  const activityData = {
    [ActivityPointer.properties.subject]: subject,
    [ActivityPointer.properties.description]: description || "",
    [ActivityPointer.properties.scheduledStart]: utcStartDate,
    [ActivityPointer.properties.scheduledEnd]: utcEndDate,
    [ActivityPointer.properties.priorityCode]: parseInt(prioritycode) || 1,
    "ownerid@odata.bind": `/${SystemUser.type}(${userId})`,
    [ActivityPointer.properties.activityTypeCode]: "task",
  };

  const entityMap = {
    account: "accounts",
    contact: "contacts",
    lead: "leads",
    opportunity: "opportunities",
    incident: "incidents",
    new_proformainvoice: "new_proformainvoices",
    systemuser: "systemusers",
  };

  const type = regardingtype || "account";
  if (regardingobjectid && entityMap[type]) {
    activityData[
      `regardingobjectid_${type}@odata.bind`
    ] = `/${entityMap[type]}(${regardingobjectid})`;
  }

  if (customworkflowid) {
    activityData.customworkflowid = customworkflowid;
  }

  logger.info(
    `Creating task for user: ${
      credentials.username
    }, entity: tasks, data: ${JSON.stringify(activityData)}`
  );
  try {
    const result = await CrmService.createEntity(
      "tasks",
      activityData,
      credentials
    );
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
    scheduledstart,
    scheduledend,
  };

  logger.info(
    `Updating task dates for activityId: ${activityId}, user: ${
      credentials.username
    }, data: ${JSON.stringify(updateData)}`
  );
  try {
    await CrmService.updateTaskDates(activityId, updateData, credentials);
    res
      .status(200)
      .json({ message: "زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد" });
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
    regardingtype,
    statuscode,
    ownerid,
    new_seen,
  } = req.body;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };

  // Convert Persian numerals to Latin for dates
  // const normalizedStart = scheduledstart ? convertPersianDigitsToEnglish(scheduledstart) : null;
  // const normalizedEnd = scheduledend ? convertPersianDigitsToEnglish(scheduledend) : null;
  // logger.info(`Normalized dates: start=${normalizedStart}, end=${normalizedEnd}`);

  // // Validate date format
  // const dateRegex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
  // if ((normalizedStart && !dateRegex.test(normalizedStart)) || (normalizedEnd && !dateRegex.test(normalizedEnd))) {
  //     logger.error(`Invalid date format: scheduledstart=${normalizedStart}, scheduledend=${normalizedEnd}`);
  //     return res.status(400).json({ error: "فرمت تاریخ ورودی نامعتبر است (انتظار: YYYY/MM/DD HH:mm:ss با ارقام لاتین)" });
  // }

  // Convert Gregorian dates to UTC
  // const utcStartDate = normalizedStart ? DateTimeService.toUTC(normalizedStart, 'YYYY/MM/DD HH:mm:ss') : null;
  // const utcEndDate = normalizedEnd ? DateTimeService.toUTC(normalizedEnd, 'YYYY/MM/DD HH:mm:ss') : null;

  // // Check for null dates
  // if (scheduledstart && !utcStartDate) {
  //     logger.error(`Failed to parse scheduledstart: ${normalizedStart}`);
  //     return res.status(400).json({ error: "نمی‌توان تاریخ شروع را解析 کرد. لطفاً تاریخ معتبر وارد کنید" });
  // }
  // if (scheduledend && !utcEndDate) {
  //     logger.error(`Failed to parse scheduledend: ${normalizedEnd}`);
  //     return res.status(400).json({ error: "نمی‌توان تاریخ پایان را解析 کرد. لطفاً تاریخ معتبر وارد کنید" });
  // }

  // // Validate CRM dates
  // if ((utcStartDate && !isValidCrmDate(utcStartDate.toISOString())) || (utcEndDate && !isValidCrmDate(utcEndDate.toISOString()))) {
  //     logger.error(`Invalid CRM date: utcStartDate=${utcStartDate}, utcEndDate=${utcEndDate}`);
  //     return res.status(400).json({ error: "تاریخ وارد شده معتبر نیست یا کمتر از حد مجاز (1753/01/01) است" });
  // }

  const updateData = {
    subject,
    description,
    scheduledstart,
    scheduledend,
    prioritycode: prioritycode ? parseInt(prioritycode) : undefined,
  };
  logger.info(`updateData: ${JSON.stringify(updateData)}`);

  const entityMap = {
    account: "accounts",
    contact: "contacts",
    lead: "leads",
    opportunity: "opportunities",
    incident: "incidents",
    new_proformainvoice: "new_proformainvoices",
    systemuser: "systemusers",
  };

  const type = regardingtype || "account";
  if (regardingobjectid && entityMap[type]) {
    updateData[
      `regardingobjectid_${type}@odata.bind`
    ] = `/${entityMap[type]}(${regardingobjectid})`;
  }

  if (ownerid) {
    updateData["ownerid@odata.bind"] = `/systemusers(${ownerid})`;
  }
  if (typeof new_seen !== "undefined") {
    updateData.new_seen = !!new_seen;
  }

  logger.info(
    `Updating task for activityId: ${activityId}, user: ${
      credentials.username
    }, data: ${JSON.stringify(updateData)}`
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
      return res
        .status(400)
        .json({ error: "Owners parameter is required for initial request" });
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
      const ownerIds = owners.split(",").map((id) => id.trim());
      if (ownerIds.length === 0) {
        return res
          .status(400)
          .json({ error: "At least one owner ID is required" });
      }

      logger.info(`Fetching activities for owners: ${ownerIds.join(", ")}`);
      const ownerFilter = ownerIds
        .map((id) => `_ownerid_value eq '${id}'`)
        .join(" or ");

      result = await CrmService.fetchActivities(
        credentials,
        null,
        null,
        parseInt(pageSize),
        `(${ownerFilter})`
      );
    }

    // Convert dates in the response
    // if (result.value) {
    //     result.value = result.value.map(convertActivityDates);
    // }

    res.json(result);
  } catch (error) {
    logger.error(`Error fetching activities by owners: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

// Fetch regarding options (accounts + contacts)
const getRegardingOptions = async (req, res) => {
  try {
    const credentials = {
      username: req.session.user.username.split("\\")[1],
      password: decrypt(req.session.encryptedPassword),
    };
    const accounts = await CrmService.fetchAccounts(credentials);
    const contacts = await CrmService.fetchContacts(credentials);
    // Merge and sort flat list
    const regardingOptions = [
      ...accounts
        .filter((a) => a.name && a.name.trim() !== "")
        .map((a) => ({ id: a.accountid, name: a.name, type: "account" })),
      ...contacts
        .filter((c) => c.fullname && c.fullname.trim() !== "")
        .map((c) => ({ id: c.contactid, name: c.fullname, type: "contact" })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    // logger.info(regardingOptions);
    res.json({ value: regardingOptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  fetchAllActivities,
  fetchMyActivities,
  fetchActivityDetails,
  createActivity,
  updateTaskDates,
  updateTask,
  fetchActivitiesByOwners,
  getRegardingOptions,
};

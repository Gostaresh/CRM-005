const CrmService = require("../services/crmService");
const logger = require("../utils/logger");
const { decrypt } = require("../utils/crypto");

const fetchEntity = async (req, res) => {
  const { entity } = req.params;
  const { select, filter } = req.query;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };
  logger.info(`CRM request credentials: ${credentials.username}`);
  const data = await CrmService.fetchEntity(
    entity,
    { select, filter },
    credentials
  );
  res.status(200).json(data);
};

const fetchAllActivities = async (req, res) => {
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
  logger.info(
    `All activities response: ${JSON.stringify(data.value, null, 2)}`
  );
  logger.info(
    `Next link for all activities: ${data["@odata.nextLink"] || "none"}`
  );
  res.status(200).json({
    value: data.value || [],
    nextLink: data["@odata.nextLink"] || null,
  });
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
  logger.info(`My activities response: ${JSON.stringify(data)}`);
  logger.info(
    `Next link for my activities: ${data["@odata.nextLink"] || "none"}`
  );
  res.status(200).json({
    value: data.value || [],
    nextLink: data["@odata.nextLink"] || null,
  });
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

const fetchPaginatedAccounts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const nextLink = req.query.nextLink || null;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };
  logger.info(
    `Fetching paginated accounts: page ${page}, pageSize ${pageSize}, nextLink ${
      nextLink || "none"
    }, user: ${credentials.username}`
  );
  const data = await CrmService.fetchPaginatedAccounts(
    page,
    pageSize,
    nextLink,
    credentials
  );
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
    top: 50,
  };
  logger.info(`Fetching accounts for dropdown: user: ${credentials.username}`);
  const data = await CrmService.fetchEntity("accounts", query, credentials);
  res.status(200).json(data.value || []);
};

const createEntity = async (req, res) => {
  const { entity } = req.params;
  const data = req.body;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };
  logger.info(`CRM  CRM create credentials: ${credentials.username}`);
  const result = await CrmService.createEntity(entity, data, credentials);
  res.status(201).json(result);
};

const createActivity = async (req, res) => {
  const {
    subject,
    description,
    scheduledstart,
    scheduledend,
    prioritycode,
    regardingobjectid,
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
    scheduledstart: scheduledstart
      ? new Date(scheduledstart).toISOString()
      : null,
    scheduledend: new Date(scheduledend).toISOString(),
    prioritycode: parseInt(prioritycode) || 1,
    "ownerid@odata.bind": `/systemusers(${userId})`,
    activitytypecode: "task",
  };

  if (regardingobjectid) {
    activityData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
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
    throw err;
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
  } = req.body;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };

  if (!subject || !scheduledend) {
    return res.status(400).json({ error: "موضوع و تاریخ سررسید الزامی است" });
  }

  const updateData = {
    subject,
    description: description || null,
    prioritycode: parseInt(prioritycode) || 1,
  };

  // Only include scheduledstart and scheduledend if they are different from the original values
  if (scheduledstart && scheduledstart !== req.body.originalScheduledstart) {
    const date = new Date(scheduledstart);
    updateData.scheduledstart = date.toISOString();
  }
  if (scheduledend && scheduledend !== req.body.originalScheduledend) {
    const date = new Date(scheduledend);
    updateData.scheduledend = date.toISOString();
  }

  if (regardingobjectid) {
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
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
    throw err;
  }
};

module.exports = {
  fetchEntity,
  fetchAllActivities,
  fetchMyActivities,
  fetchActivityDetails,
  fetchPaginatedAccounts,
  fetchAccountsForDropdown,
  createEntity,
  createActivity,
  updateTaskDates,
  updateTask,
};

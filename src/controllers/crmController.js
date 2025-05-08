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
    top: 500,
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
    scheduledstart: scheduledstart
      ? new Date(scheduledstart).toISOString()
      : null,
    scheduledend: new Date(scheduledend).toISOString(),
    prioritycode: parseInt(prioritycode) || 1,
    "ownerid@odata.bind": `/systemusers(${userId})`,
    activitytypecode: "task",
  };

  if (customworkflowid) {
    activityData.customworkflowid = customworkflowid;
  }

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

const fetchSystemUsersForDropdown = async (req, res) => {
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };

  // 1. Fetch all departments
  const depQuery = {
    select: "new_departmentid,new_name",
    top: 500,
  };
  const depData = await CrmService.fetchEntity(
    "new_departments",
    depQuery,
    credentials
  );
  const departmentMap = {};
  (depData.value || []).forEach((dep) => {
    departmentMap[dep.new_departmentid] = dep.new_name;
  });

  // 2. Fetch all users (with department ref and teams)
  const userQuery = {
    select: "systemuserid,fullname,domainname,_new_department_value",
    top: 500,
  };
  const userData = await CrmService.fetchEntity(
    "systemusers",
    userQuery,
    credentials
  );

  // 3. Add departmentName to each user
  (userData.value || []).forEach((user) => {
    user.departmentName =
      departmentMap[user._new_department_value] || "بدون دپارتمان";
  });

  // 4. Group users by department
  const groupedUsers = {};
  userData.value.forEach((user) => {
    if (!groupedUsers[user.departmentName]) {
      groupedUsers[user.departmentName] = [];
    }
    groupedUsers[user.departmentName].push({
      id: user.systemuserid,
      text: user.fullname,
      department: user.departmentName,
    });
  });

  // Sort users within each department
  Object.keys(groupedUsers).forEach((department) => {
    groupedUsers[department].sort((a, b) => a.text.localeCompare(b.text));
  });

  // 5. Convert to Select2 format with groups and sort departments
  const select2Data = Object.entries(groupedUsers)
    .sort(([deptA], [deptB]) => deptA.localeCompare(deptB))
    .map(([department, users]) => ({
      text: department,
      children: users,
    }));

  res.status(200).json(select2Data);
};

const fetchActivitiesByOwners = async (req, res) => {
  const ownerids = req.query.ownerids ? req.query.ownerids.split(",") : [];
  const nextLink = req.query.nextLink || null;
  const pageSize = parseInt(req.query.pageSize) || 200;
  const credentials = {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };
  let filter = "";
  if (ownerids.length > 0) {
    filter = ownerids.map((id) => `_ownerid_value eq '${id}'`).join(" or ");
  }
  const data = await CrmService.fetchActivities(
    credentials,
    null,
    nextLink,
    pageSize,
    filter
  );
  res.status(200).json({
    value: data.value || [],
    nextLink: data["@odata.nextLink"] || null,
  });
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
  fetchSystemUsersForDropdown,
  fetchActivitiesByOwners,
};

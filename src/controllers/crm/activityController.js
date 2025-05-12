const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");
const { ActivityPointer, SystemUser } = require("../../core/resources");
const DateTimeService = require("../../core/services/DateTimeService");
const moment = require("jalali-moment");
// Helper function to add Jalali date fields to activity data
const convertActivityDates = (activityOrArray) => {
  const dateFields = [
    "scheduledstart",
    "scheduledend",
    "actualstart",
    "actualend",
    "createdon",
    "modifiedon",
  ];
  function addJalaliToOne(activity) {
    if (!activity || typeof activity !== "object") return activity;
    const result = { ...activity };
    dateFields.forEach((field) => {
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
  const normalizedDateStr = dateStr.replace(/\//g, "-");
  const minDate = new Date("1753-01-01T00:00:00Z");
  const d = new Date(normalizedDateStr);
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

  // Convert dates in the response
  // const convertedData = convertActivityDates(data);

  res.status(200).json(date);
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

  // Convert Jalali dates to UTC for CRM
  const utcStartDate = scheduledstart
    ? DateTimeService.toUTC(scheduledstart)
    : null;
  const utcEndDate = DateTimeService.toUTC(scheduledend);

  if (!utcEndDate) {
    return res.status(400).json({ error: "فرمت تاریخ سررسید نامعتبر است" });
  }

  const activityData = {
    [ActivityPointer.properties.subject]: subject,
    [ActivityPointer.properties.description]: description || "",
    [ActivityPointer.properties.scheduledStart]: utcStartDate
      ? utcStartDate.toISOString()
      : null,
    [ActivityPointer.properties.scheduledEnd]: utcEndDate.toISOString(),
    [ActivityPointer.properties.priorityCode]: parseInt(prioritycode) || 1,
    "ownerid@odata.bind": `/${SystemUser.type}(${userId})`,
    [ActivityPointer.properties.activityTypeCode]: "task",
  };

  // Bind regarding entity
  if (regardingobjectid && regardingtype) {
    if (regardingtype === "account") {
      activityData[
        "regardingobjectid_account@odata.bind"
      ] = `/accounts(${regardingobjectid})`;
    } else if (regardingtype === "contact") {
      activityData[
        "regardingobjectid_contact@odata.bind"
      ] = `/contacts(${regardingobjectid})`;
    }
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

  // Convert Jalali dates to UTC for CRM
  // const utcStartDate = scheduledstart ? DateTimeService.toUTC(scheduledstart) : null;
  // const utcEndDate = DateTimeService.toUTC(scheduledend);

  // // Backend validation for CRM date
  // if ((utcStartDate && !isValidCrmDate(utcStartDate)) || !isValidCrmDate(utcEndDate)) {
  //     return res.status(400).json({ error: "تاریخ وارد شده معتبر نیست یا کمتر از حد مجاز است" });
  // }

  // const updateData = {
  //     scheduledstart: utcStartDate,
  //     scheduledend: utcEndDate
  // };

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

// Helper function to convert Persian numerals to Latin
function convertPersianDigitsToEnglish(str) {
  if (!str) return str;
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const english = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  for (let i = 0; i < persian.length; i++) {
    str = str.replace(new RegExp(persian[i], "g"), english[i]);
  }
  return str;
}

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

  if (regardingobjectid && regardingtype) {
    if (regardingtype === "account") {
      updateData[
        "regardingobjectid_account@odata.bind"
      ] = `/accounts(${regardingobjectid})`;
    } else if (regardingtype === "contact") {
      updateData[
        "regardingobjectid_contact@odata.bind"
      ] = `/contacts(${regardingobjectid})`;
    }
  }
  if (regardingobjectid && regardingtype === undefined) {
    // fallback: try account
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === null) {
    // fallback: try account
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "") {
    // fallback: try account
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
  }
  if (regardingobjectid && !regardingtype) {
    // fallback: try account
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "lead") {
    updateData[
      "regardingobjectid_lead@odata.bind"
    ] = `/leads(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "opportunity") {
    updateData[
      "regardingobjectid_opportunity@odata.bind"
    ] = `/opportunities(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "incident") {
    updateData[
      "regardingobjectid_incident@odata.bind"
    ] = `/incidents(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "new_proformainvoice") {
    updateData[
      "regardingobjectid_new_proformainvoice@odata.bind"
    ] = `/new_proformainvoices(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "systemuser") {
    updateData[
      "regardingobjectid_systemuser@odata.bind"
    ] = `/systemusers(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "contact") {
    updateData[
      "regardingobjectid_contact@odata.bind"
    ] = `/contacts(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "account") {
    updateData[
      "regardingobjectid_account@odata.bind"
    ] = `/accounts(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "opportunity") {
    updateData[
      "regardingobjectid_opportunity@odata.bind"
    ] = `/opportunities(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "incident") {
    updateData[
      "regardingobjectid_incident@odata.bind"
    ] = `/incidents(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "lead") {
    updateData[
      "regardingobjectid_lead@odata.bind"
    ] = `/leads(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "new_proformainvoice") {
    updateData[
      "regardingobjectid_new_proformainvoice@odata.bind"
    ] = `/new_proformainvoices(${regardingobjectid})`;
  }
  if (regardingobjectid && regardingtype === "systemuser") {
    updateData[
      "regardingobjectid_systemuser@odata.bind"
    ] = `/systemusers(${regardingobjectid})`;
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
    logger.info(regardingOptions);
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
